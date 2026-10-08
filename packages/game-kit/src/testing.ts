/**
 * Oyunları odaya/sunucuya bağlamadan test etmek için düzenek.
 *
 *   const h = createHarness(myGame, { players: ['ali', 'ayse', 'cem'], settings: { rounds: 3 } });
 *   await h.start();
 *   expect(await h.act('ali', { type: 'vote', target: 'cem' })).toMatchObject({ ok: true });
 *   h.advance(30_000);                    // zamanlayıcıları ilerlet (sahte saat)
 *   expect(h.view('ayse').phase).toBe('reveal');
 *   expect(h.seen('cem')).not.toContain('gizli kelime');   // cem'e giden HİÇBİR veride geçmiyor
 *   expect(h.finished).not.toBeNull();
 */
import type { RoomPlayer } from '@songie/shared';
import { UserFacingError, type AnyServerGame, type GameContext, type GameResult } from './server';

interface Timer {
  id: number;
  at: number;
  fn: () => void;
}

export interface Harness<View = unknown> {
  ctx: GameContext;
  readonly state: unknown;
  /** `finish` çağrıldıysa sonuçlar. */
  readonly finished: GameResult[] | null;
  readonly now: number;
  start(): Promise<void>;
  /** Hamleyi şemadan geçirip uygular. Hata `{ ok: false, error }` döner (oyuncuya gösterilecek metin). */
  act(playerId: string, action: unknown): Promise<{ ok: true; [k: string]: unknown } | { ok: false; error: string }>;
  /** Oyuncuya en son gönderilen görünüm. */
  view<V = View>(playerId: string): V;
  /** Oyuncuya şimdiye kadar gönderilen bütün görünümlerin JSON hali (sızıntı kontrolü için). */
  seen(playerId: string): string;
  /** Sahte saati ilerletir; vadesi gelen zamanlayıcıları sırayla çalıştırır. */
  advance(ms: number): void;
  setConnected(playerId: string, connected: boolean): void;
  join(playerId: string, nick?: string): void;
  leave(playerId: string): void;
  setHost(playerId: string): void;
  /** Oda sahibi oyun sırasında ayar değiştirir (oyun `onSettings` tanımlıysa). */
  changeSettings(patch: Record<string, unknown>): void;
  /** Oda sahibi "Oyunu bitir". */
  end(): void;
}

export function createHarness<View = unknown>(
  game: AnyServerGame,
  opts: { players: string[]; hostId?: string; settings?: Record<string, unknown> },
): Harness<View> {
  let now = 1_000_000;
  let timerSeq = 0;
  let timers: Timer[] = [];
  let state: unknown = null;
  let finished: GameResult[] | null = null;
  let settings = game.settingsSchema.parse({ ...(game.defaultSettings as object), ...opts.settings });
  let hostId = opts.hostId ?? opts.players[0]!;
  const players: RoomPlayer[] = opts.players.map((id) => ({
    id,
    nick: id,
    avatar: { shape: 'circle', color: 'mint' },
    connected: true,
    ready: false,
  }));
  const views = new Map<string, unknown[]>();

  const ctx: GameContext = {
    roomCode: 'TEST',
    players: () => players,
    hostId: () => hostId,
    now: () => now,
    schedule(ms, fn) {
      const t: Timer = { id: ++timerSeq, at: now + ms, fn };
      timers.push(t);
      return () => {
        timers = timers.filter((x) => x !== t);
      };
    },
    pushViews() {
      if (state === null) return;
      for (const p of players) {
        const list = views.get(p.id) ?? [];
        // JSON'dan geçir: gerçek socket'te de böyle gider (Map/Set/undefined farkları görünsün).
        list.push(JSON.parse(JSON.stringify(game.viewFor(state, p.id))));
        views.set(p.id, list);
      }
    },
    finish(results) {
      finished = results;
    },
    log() {},
  };

  const h: Harness<View> = {
    ctx,
    get state() {
      return state;
    },
    get finished() {
      return finished;
    },
    get now() {
      return now;
    },
    async start() {
      const extra = game.validateSettings?.(settings);
      if (extra) throw new UserFacingError(extra);
      state = await game.start(ctx, settings);
      ctx.pushViews();
    },
    async act(playerId, action) {
      const parsed = game.actionSchema.safeParse(action);
      if (!parsed.success) return { ok: false, error: 'Geçersiz hamle.' };
      try {
        const res = await game.onAction(ctx, state, playerId, parsed.data);
        return { ok: true, ...(res && typeof res === 'object' ? res : {}) };
      } catch (err) {
        if (err instanceof UserFacingError) return { ok: false, error: err.message };
        throw err;
      }
    },
    view<V>(playerId: string) {
      if (state !== null) return JSON.parse(JSON.stringify(game.viewFor(state, playerId))) as V;
      throw new Error('Oyun başlamadı');
    },
    seen(playerId) {
      return JSON.stringify(views.get(playerId) ?? []);
    },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.at <= until).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!due) break;
        timers = timers.filter((t) => t !== due);
        now = due.at;
        due.fn();
      }
      now = until;
    },
    setConnected(playerId, connected) {
      const p = players.find((x) => x.id === playerId);
      if (p) p.connected = connected;
      game.onPlayerConnection?.(ctx, state, playerId, connected);
      ctx.pushViews();
    },
    join(playerId, nick = playerId) {
      players.push({ id: playerId, nick, avatar: { shape: 'circle', color: 'sky' }, connected: true, ready: false });
      game.onPlayerJoin?.(ctx, state, playerId);
    },
    leave(playerId) {
      const i = players.findIndex((x) => x.id === playerId);
      if (i >= 0) players.splice(i, 1);
      game.onPlayerLeave?.(ctx, state, playerId);
    },
    setHost(playerId) {
      hostId = playerId;
    },
    changeSettings(patch) {
      settings = game.settingsSchema.parse({ ...(settings as object), ...patch });
      if (!game.onSettings) throw new Error('Bu oyun oyun sırasında ayar değişikliğini desteklemiyor');
      game.onSettings(ctx, state, settings);
    },
    end() {
      if (game.end) game.end(ctx, state);
    },
  };
  return h;
}
