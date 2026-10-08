import { UserFacingError, type AnyServerGame, type GameContext, type GameResult } from '@songie/game-kit/server';
import {
  MAX_ROOM_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ChatMessage,
  type Profile,
  type RoomPlayer,
  type RoomState,
  type Standing,
} from '@songie/shared';
import { randomCode, randomId } from '../ids.js';

export interface RoomTransport {
  roomState(code: string, state: RoomState): void;
  roomClosed(code: string, playerIds: string[], reason: string): void;
  chat(code: string, msg: ChatMessage): void;
  react(code: string, playerId: string, emoji: string): void;
  gameView(playerId: string, view: unknown): void;
}

export interface ResultSink {
  (gameId: string, roomCode: string, results: (GameResult & { rank: number })[]): void;
}

export interface RoomTimings {
  /** Lobideyken bağlantısı kopan oyuncu bu süre sonra odadan çıkarılır. */
  lobbyGraceMs: number;
  /** Kimse bağlı değilse oda bu süre sonra kapanır. */
  emptyRoomMs: number;
}

const DEFAULT_TIMINGS: RoomTimings = { lobbyGraceMs: 60_000, emptyRoomMs: 5 * 60_000 };
const CHAT_KEEP = 40;

export class RoomError extends UserFacingError {}

interface Member {
  profile: Profile;
  connections: number;
  ready: boolean;
  joinedAt: number;
  graceTimer: NodeJS.Timeout | null;
}

interface RunningGame {
  impl: AnyServerGame;
  state: unknown;
  timers: Set<NodeJS.Timeout>;
  ended: boolean;
}

interface Room {
  code: string;
  hostId: string;
  gameId: string;
  settings: unknown;
  members: Map<string, Member>;
  chat: ChatMessage[];
  lastStandings: Standing[] | null;
  game: RunningGame | null;
  emptyTimer: NodeJS.Timeout | null;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRoom = new Map<string, string>();
  private timings: RoomTimings;

  constructor(
    private games: Map<string, AnyServerGame>,
    private transport: RoomTransport,
    private saveResults: ResultSink,
    timings: Partial<RoomTimings> = {},
    private now: () => number = Date.now,
  ) {
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
  }

  // ---------- sorgular ----------

  roomOf(playerId: string): string | null {
    return this.playerRoom.get(playerId) ?? null;
  }

  peek(code: string): { gameId: string; players: number; playing: boolean } | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    return { gameId: room.gameId, players: room.members.size, playing: room.game !== null };
  }

  stateOf(code: string): RoomState | null {
    const room = this.rooms.get(code);
    return room ? this.snapshot(room) : null;
  }

  /** Bağlanan oyuncu bir odadaysa son görünümünü tekrar gönderir. */
  resync(playerId: string): void {
    const room = this.roomFor(playerId);
    if (!room) return;
    this.transport.roomState(room.code, this.snapshot(room));
    if (room.game) this.transport.gameView(playerId, room.game.impl.viewFor(room.game.state, playerId));
  }

  // ---------- bağlantı ----------

  connected(profile: Profile): void {
    const room = this.roomFor(profile.id);
    if (!room) return;
    const m = room.members.get(profile.id)!;
    m.connections++;
    m.profile = profile;
    if (m.graceTimer) clearTimeout(m.graceTimer);
    m.graceTimer = null;
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    room.emptyTimer = null;
    this.broadcast(room);
  }

  disconnected(playerId: string): void {
    const room = this.roomFor(playerId);
    if (!room) return;
    const m = room.members.get(playerId)!;
    m.connections = Math.max(0, m.connections - 1);
    if (m.connections > 0) return;
    if (!room.game) {
      m.graceTimer = setTimeout(() => this.leave(playerId), this.timings.lobbyGraceMs);
    }
    if (room.hostId === playerId) this.handOverHost(room);
    if ([...room.members.values()].every((x) => x.connections === 0)) {
      room.emptyTimer = setTimeout(() => this.close(room, 'Oda boş kaldığı için kapandı.'), this.timings.emptyRoomMs);
    }
    this.broadcast(room);
  }

  // ---------- oda yaşam döngüsü ----------

  create(profile: Profile, gameId: string, settings?: unknown): RoomState {
    const game = this.games.get(gameId);
    if (!game) throw new RoomError('Bu oyun bulunamadı.');
    this.leave(profile.id);
    let code: string;
    do code = randomCode(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
    while (this.rooms.has(code));
    const room: Room = {
      code,
      hostId: profile.id,
      gameId,
      settings: game.defaultSettings,
      members: new Map(),
      chat: [],
      lastStandings: null,
      game: null,
      emptyTimer: null,
    };
    if (settings !== undefined) room.settings = this.parseSettings(game, settings);
    this.rooms.set(code, room);
    this.addMember(room, profile);
    this.broadcast(room);
    return this.snapshot(room);
  }

  join(profile: Profile, code: string): RoomState {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError('Bu kodla açık bir oda yok. Kodu kontrol et ya da yeni oda kur.');
    if (room.members.has(profile.id)) {
      this.connected(profile);
      return this.snapshot(room);
    }
    const max = Math.min(MAX_ROOM_PLAYERS, this.games.get(room.gameId)!.maxPlayers);
    if (room.members.size >= max) throw new RoomError(`Oda dolu. En fazla ${max} kişi oynayabilir.`);
    this.leave(profile.id);
    this.addMember(room, profile);
    if (room.game) room.game.impl.onPlayerJoin?.(this.context(room), room.game.state, profile.id);
    this.broadcast(room);
    this.resync(profile.id);
    return this.snapshot(room);
  }

  leave(playerId: string): void {
    const room = this.roomFor(playerId);
    if (!room) return;
    const m = room.members.get(playerId)!;
    if (m.graceTimer) clearTimeout(m.graceTimer);
    room.members.delete(playerId);
    this.playerRoom.delete(playerId);
    if (room.members.size === 0) {
      this.close(room, 'Oda kapandı.');
      return;
    }
    if (room.game) room.game.impl.onPlayerLeave?.(this.context(room), room.game.state, playerId);
    if (room.hostId === playerId) this.handOverHost(room);
    this.broadcast(room);
  }

  kick(hostId: string, targetId: string): void {
    const room = this.hostRoom(hostId);
    if (targetId === hostId || !room.members.has(targetId)) return;
    this.leave(targetId);
    this.transport.roomClosed(room.code, [targetId], 'Oda sahibi seni odadan çıkardı.');
  }

  updateSettings(hostId: string, settings: unknown): void {
    const room = this.hostRoom(hostId);
    const impl = this.games.get(room.gameId)!;
    const parsed = this.parseSettings(impl, settings);
    if (room.game) {
      // Oyun destekliyorsa ayarlar oyun sürerken de değişir (sıradaki turdan itibaren).
      if (!impl.onSettings || room.game.state === null) throw new RoomError('Ayarlar oyun sırasında değiştirilemez.');
      const extra = impl.validateSettings?.(parsed);
      if (extra) throw new RoomError(extra);
      room.settings = parsed;
      impl.onSettings(this.context(room), room.game.state, parsed);
      this.broadcast(room);
      return;
    }
    room.settings = parsed;
    for (const m of room.members.values()) m.ready = false;
    this.broadcast(room);
  }

  setReady(playerId: string, ready: boolean): void {
    const room = this.roomFor(playerId);
    if (!room || room.game) return;
    room.members.get(playerId)!.ready = ready;
    this.broadcast(room);
  }

  chat(playerId: string, text: string): void {
    const room = this.roomFor(playerId);
    if (!room) return;
    const msg: ChatMessage = { id: randomId(8), playerId, text, at: this.now() };
    room.chat.push(msg);
    if (room.chat.length > CHAT_KEEP) room.chat.splice(0, room.chat.length - CHAT_KEEP);
    this.transport.chat(room.code, msg);
  }

  react(playerId: string, emoji: string): void {
    const room = this.roomFor(playerId);
    if (room) this.transport.react(room.code, playerId, emoji);
  }

  // ---------- oyun ----------

  async start(hostId: string): Promise<void> {
    const room = this.hostRoom(hostId);
    if (room.game) throw new RoomError('Oyun zaten başladı.');
    const impl = this.games.get(room.gameId)!;
    const connected = [...room.members.values()].filter((m) => m.connections > 0);
    if (connected.length < impl.minPlayers) {
      throw new RoomError(`Başlamak için en az ${impl.minPlayers} oyuncu gerekiyor.`);
    }
    const extra = impl.validateSettings?.(room.settings);
    if (extra) throw new RoomError(extra);
    // Bağlı olmayan oyuncular oyuna alınmaz.
    for (const [id, m] of room.members) if (m.connections === 0) this.leave(id);

    const running: RunningGame = { impl, state: null, timers: new Set(), ended: false };
    room.game = running;
    room.lastStandings = null;
    this.broadcast(room);
    try {
      running.state = await impl.start(this.context(room), room.settings);
    } catch (err) {
      this.stopGame(room);
      this.broadcast(room);
      if (err instanceof UserFacingError) throw err;
      console.error(`[room ${room.code}] start failed`, err);
      throw new RoomError('Oyun başlatılamadı. Tekrar dene.');
    }
    if (room.game === running) this.pushViews(room);
  }

  /** Oda sahibi oyunu bitirir. Oyun destekliyorsa skorlar kaydedilerek kapanır, yoksa kesilir. */
  backToLobby(hostId: string): void {
    const room = this.hostRoom(hostId);
    if (!room.game) return;
    const game = room.game;
    if (game.impl.end && game.state !== null) {
      game.impl.end(this.context(room), game.state);
      return;
    }
    this.stopGame(room);
    this.broadcast(room);
    for (const id of room.members.keys()) this.transport.gameView(id, null);
  }

  async action(playerId: string, action: unknown): Promise<unknown> {
    const room = this.roomFor(playerId);
    if (!room?.game || room.game.state === null) throw new RoomError('Şu anda oynanan bir oyun yok.');
    const game = room.game;
    const parsed = game.impl.actionSchema.safeParse(action);
    if (!parsed.success) throw new RoomError('Geçersiz hamle.');
    return game.impl.onAction(this.context(room), game.state, playerId, parsed.data);
  }

  // ---------- iç işler ----------

  private context(room: Room): GameContext {
    const game = room.game!;
    return {
      roomCode: room.code,
      players: () => this.snapshot(room).players,
      hostId: () => room.hostId,
      now: this.now,
      schedule: (ms, fn) => {
        const t = setTimeout(() => {
          game.timers.delete(t);
          if (game.ended) return;
          try {
            fn();
          } catch (err) {
            console.error(`[room ${room.code}] timer error`, err);
          }
        }, ms);
        game.timers.add(t);
        return () => {
          clearTimeout(t);
          game.timers.delete(t);
        };
      },
      pushViews: () => {
        if (!game.ended && room.game === game) this.pushViews(room);
      },
      finish: (results) => {
        if (game.ended || room.game !== game) return;
        this.finishGame(room, results);
      },
      log: (msg, data) => console.log(`[room ${room.code}] ${msg}`, data ?? ''),
    };
  }

  private pushViews(room: Room): void {
    const game = room.game;
    if (!game || game.state === null) return;
    for (const id of room.members.keys()) this.transport.gameView(id, game.impl.viewFor(game.state, id));
  }

  private finishGame(room: Room, results: GameResult[]): void {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const ranked = sorted.map((r) => ({ ...r, rank: 1 + sorted.findIndex((x) => x.score === r.score) }));
    // Son görünümü (podyum) göndermek için oyunu kapatmadan önce bir kez daha it.
    this.pushViews(room);
    this.saveResults(room.gameId, room.code, ranked);
    room.lastStandings = ranked.flatMap((r) => {
      const m = room.members.get(r.playerId);
      return m ? [{ playerId: r.playerId, nick: m.profile.nick, avatar: m.profile.avatar, score: r.score, rank: r.rank }] : [];
    });
    this.stopGame(room, false);
    // Oyunu bitmiş ama görünümü açık bırakılır: client podyumu gösterip "Lobiye dön" der.
    this.broadcast(room);
  }

  private stopGame(room: Room, clearViews = true): void {
    const game = room.game;
    if (!game) return;
    game.ended = true;
    for (const t of game.timers) clearTimeout(t);
    game.timers.clear();
    if (game.state !== null) game.impl.dispose?.(game.state);
    room.game = null;
    for (const [id, m] of room.members) {
      m.ready = false;
      if (m.connections === 0) {
        m.graceTimer = setTimeout(() => this.leave(id), this.timings.lobbyGraceMs);
      }
    }
    if (clearViews) for (const id of room.members.keys()) this.transport.gameView(id, null);
  }

  private parseSettings(game: AnyServerGame, settings: unknown): unknown {
    const parsed = game.settingsSchema.safeParse(settings);
    if (!parsed.success) throw new RoomError('Ayarlar geçersiz: ' + parsed.error.issues[0]?.message);
    return parsed.data;
  }

  private addMember(room: Room, profile: Profile): void {
    room.members.set(profile.id, { profile, connections: 1, ready: false, joinedAt: this.now(), graceTimer: null });
    this.playerRoom.set(profile.id, room.code);
  }

  private handOverHost(room: Room): void {
    const candidates = [...room.members.entries()]
      .filter(([id]) => id !== room.hostId)
      .sort((a, b) => b[1].connections - a[1].connections || a[1].joinedAt - b[1].joinedAt);
    const next = candidates.find(([, m]) => m.connections > 0) ?? candidates[0];
    if (next) room.hostId = next[0];
  }

  private close(room: Room, reason: string): void {
    this.stopGame(room, false);
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    const ids = [...room.members.keys()];
    for (const [id, m] of room.members) {
      if (m.graceTimer) clearTimeout(m.graceTimer);
      this.playerRoom.delete(id);
    }
    room.members.clear();
    this.rooms.delete(room.code);
    if (ids.length) this.transport.roomClosed(room.code, ids, reason);
  }

  private roomFor(playerId: string): Room | null {
    const code = this.playerRoom.get(playerId);
    return code ? (this.rooms.get(code) ?? null) : null;
  }

  private hostRoom(playerId: string): Room {
    const room = this.roomFor(playerId);
    if (!room) throw new RoomError('Bir odada değilsin.');
    if (room.hostId !== playerId) throw new RoomError('Bunu yalnızca oda sahibi yapabilir.');
    return room;
  }

  private snapshot(room: Room): RoomState {
    const players: RoomPlayer[] = [...room.members.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((m) => ({
        id: m.profile.id,
        nick: m.profile.nick,
        avatar: m.profile.avatar,
        connected: m.connections > 0,
        ready: m.ready,
      }));
    return {
      code: room.code,
      hostId: room.hostId,
      gameId: room.gameId,
      settings: room.settings,
      phase: room.game ? 'playing' : 'lobby',
      players,
      chat: room.chat,
      lastStandings: room.lastStandings,
    };
  }

  private broadcast(room: Room): void {
    if (this.rooms.has(room.code)) this.transport.roomState(room.code, this.snapshot(room));
  }

  shutdown(): void {
    for (const room of [...this.rooms.values()]) this.close(room, 'Sunucu yeniden başlatılıyor.');
  }
}
