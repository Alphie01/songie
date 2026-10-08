import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  DECK_FASCIST,
  DECK_LIBERAL,
  FASCIST_TO_WIN,
  GAME_ID,
  HITLER_ZONE,
  LIBERAL_TO_WIN,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_COUNTS,
  VETO_AT,
  actionSchema,
  defaultSettings,
  fascistTrack,
  hitlerKnowsFascists,
  settingsSchema,
  type LogEntry,
  type Party,
  type Phase,
  type Policy,
  type Power,
  type Role,
  type SecretHitlerAction,
  type SecretHitlerSettings,
  type SecretHitlerView,
  type VoteValue,
  type WinReason,
} from '../shared/index.js';

export class GameError extends UserFacingError {}

export const PODIUM_MS = 45_000;

export interface SecretHitlerTiming {
  /** Oyun bitince rollerin açık kaldığı süre; sonra lobiye dönülür. */
  podiumMs: number;
}

export interface SecretHitlerState {
  settings: SecretHitlerSettings;
  /** Oturma sırası (başkanlık bu sırayla döner). */
  seats: string[];
  roles: Record<string, Role>;
  dead: string[];
  deck: Policy[];
  discard: Policy[];
  liberal: number;
  fascist: number;
  electionTracker: number;
  phase: Phase;
  /** Başkanlık sırasını tutan "normal" başkan (özel seçimde değişmez). */
  anchor: string;
  president: string;
  chancellor: string | null;
  lastElected: { president: string; chancellor: string } | null;
  votes: Record<string, VoteValue>;
  voteRound: number;
  lastVote: SecretHitlerView['lastVote'];
  hand: Policy[];
  session: number;
  vetoRequested: boolean;
  vetoDenied: boolean;
  power: Power | null;
  investigated: string[];
  investigations: Record<string, { target: string; party: Party }[]>;
  log: LogEntry[];
  phaseStartedAt: number;
  winner: Party | null;
  winReason: WinReason | null;
  finishAt: number;
  finished: boolean;
  cancelTimer: (() => void) | null;
}

export const partyOf = (role: Role): Party => (role === 'liberal' ? 'liberal' : 'fascist');

export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function assignRoles(ids: string[], random: () => number = Math.random): Record<string, Role> {
  const counts = ROLE_COUNTS[ids.length];
  if (!counts) throw new GameError(`Secret Hitler ${MIN_PLAYERS}–${MAX_PLAYERS} kişiyle oynanır.`);
  const pool: Role[] = [
    ...Array<Role>(counts.liberal).fill('liberal'),
    ...Array<Role>(counts.fascist).fill('fascist'),
    'hitler',
  ];
  const shuffled = shuffle(pool, random);
  return Object.fromEntries(ids.map((id, i) => [id, shuffled[i]!]));
}

export function newDeck(random: () => number = Math.random): Policy[] {
  return shuffle([...Array<Policy>(DECK_LIBERAL).fill('liberal'), ...Array<Policy>(DECK_FASCIST).fill('fascist')], random);
}

export function createSecretHitlerGame(deps: {
  timing?: Partial<SecretHitlerTiming>;
  random?: () => number;
} = {}): ServerGame<SecretHitlerSettings, SecretHitlerState, SecretHitlerAction> {
  const timing: SecretHitlerTiming = { podiumMs: PODIUM_MS, ...deps.timing };
  const random = deps.random ?? Math.random;

  const isAlive = (s: SecretHitlerState, id: string) => s.seats.includes(id) && !s.dead.includes(id);
  const alive = (s: SecretHitlerState) => s.seats.filter((id) => !s.dead.includes(id));

  function nextAliveAfter(s: SecretHitlerState, id: string): string {
    const i = s.seats.indexOf(id);
    for (let k = 1; k <= s.seats.length; k++) {
      const cand = s.seats[(i + k) % s.seats.length]!;
      if (!s.dead.includes(cand)) return cand;
    }
    return id;
  }

  function eligible(s: SecretHitlerState): string[] {
    const many = alive(s).length > 5;
    return alive(s).filter(
      (id) =>
        id !== s.president &&
        id !== s.lastElected?.chancellor &&
        !(many && id === s.lastElected?.president),
    );
  }

  function waitingFor(s: SecretHitlerState): string[] {
    switch (s.phase) {
      case 'nominate':
      case 'presidentLegislate':
      case 'power':
        return [s.president];
      case 'vote':
        return alive(s).filter((id) => !s.votes[id]);
      case 'chancellorLegislate':
        return s.vetoRequested ? [s.president] : [s.chancellor!];
      default:
        return [];
    }
  }

  function setPhase(ctx: GameContext, s: SecretHitlerState, phase: Phase): void {
    s.phase = phase;
    s.session++;
    s.phaseStartedAt = ctx.now();
  }

  /** En az 3 kart kalmazsa ıskarta desteye karıştırılır. */
  function ensureDeck(s: SecretHitlerState): void {
    if (s.deck.length >= 3) return;
    s.deck = shuffle([...s.deck, ...s.discard], random);
    s.discard = [];
    s.log.push({ k: 'reshuffle', deck: s.deck.length });
  }

  function gameOver(ctx: GameContext, s: SecretHitlerState, winner: Party | null, reason: WinReason): void {
    if (s.phase === 'over') return;
    s.cancelTimer?.();
    s.winner = winner;
    s.winReason = reason;
    s.hand = [];
    s.power = null;
    s.vetoRequested = false;
    s.log.push({ k: 'over', winner, reason });
    setPhase(ctx, s, 'over');
    s.finishAt = ctx.now() + timing.podiumMs;
    s.cancelTimer = ctx.schedule(timing.podiumMs, () => finish(ctx, s));
    ctx.pushViews();
  }

  function finish(ctx: GameContext, s: SecretHitlerState): void {
    if (s.finished) return;
    s.finished = true;
    s.cancelTimer?.();
    s.cancelTimer = null;
    const results: GameResult[] = s.seats.map((id) => {
      const side = partyOf(s.roles[id]!);
      return {
        playerId: id,
        score: s.winner !== null && side === s.winner ? 1 : 0,
        meta: { role: s.roles[id], side, winner: s.winner, reason: s.winReason },
      };
    });
    ctx.finish(results);
  }

  function startNomination(ctx: GameContext, s: SecretHitlerState, president: string): void {
    s.president = president;
    s.chancellor = null;
    s.votes = {};
    s.hand = [];
    s.vetoRequested = false;
    s.vetoDenied = false;
    s.power = null;
    setPhase(ctx, s, 'nominate');
  }

  /** Sıradaki başkan: özel seçimden sonra da sıra, özel seçimi başlatanın solundan devam eder. */
  function nextPresident(ctx: GameContext, s: SecretHitlerState): void {
    const next = nextAliveAfter(s, s.anchor);
    s.anchor = next;
    startNomination(ctx, s, next);
    ctx.pushViews();
  }

  /** Bir yasa çıkar. Kazanma kontrolü yapar; kazanan yoksa true döner. */
  function enactPolicy(ctx: GameContext, s: SecretHitlerState, policy: Policy, chaos: boolean): boolean {
    if (policy === 'liberal') s.liberal++;
    else s.fascist++;
    s.electionTracker = 0;
    s.log.push({ k: 'enact', policy, chaos });
    if (s.liberal >= LIBERAL_TO_WIN) {
      gameOver(ctx, s, 'liberal', 'liberalPolicies');
      return false;
    }
    if (s.fascist >= FASCIST_TO_WIN) {
      gameOver(ctx, s, 'fascist', 'fascistPolicies');
      return false;
    }
    return true;
  }

  /** Başarısız seçim ya da veto: sayaç ilerler; 3'te destenin üstü otomatik çıkar. */
  function advanceTracker(ctx: GameContext, s: SecretHitlerState): void {
    s.electionTracker++;
    s.log.push({ k: 'tracker', count: s.electionTracker });
    if (s.electionTracker >= 3) {
      ensureDeck(s);
      const top = s.deck.shift()!;
      // Kaos: yetki kullanılmaz, dönem sınırları sıfırlanır.
      s.lastElected = null;
      if (!enactPolicy(ctx, s, top, true)) return;
      ensureDeck(s);
    }
    nextPresident(ctx, s);
  }

  function resolveVote(ctx: GameContext, s: SecretHitlerState): void {
    const living = alive(s);
    const ja = living.filter((id) => s.votes[id] === 'ja');
    const nein = living.filter((id) => s.votes[id] !== 'ja');
    const passed = ja.length > living.length / 2;
    const chancellor = s.chancellor!;
    s.lastVote = { president: s.president, chancellor, votes: { ...s.votes }, passed };
    s.log.push({ k: 'vote', president: s.president, chancellor, ja, nein, passed });
    s.votes = {};
    if (!passed) {
      advanceTracker(ctx, s);
      return;
    }
    s.lastElected = { president: s.president, chancellor };
    if (s.fascist >= HITLER_ZONE) {
      if (s.roles[chancellor] === 'hitler') {
        gameOver(ctx, s, 'fascist', 'hitlerChancellor');
        return;
      }
      s.log.push({ k: 'notHitler', chancellor });
    }
    ensureDeck(s);
    s.hand = s.deck.splice(0, 3);
    setPhase(ctx, s, 'presidentLegislate');
    ctx.pushViews();
  }

  function governmentEnacts(ctx: GameContext, s: SecretHitlerState, policy: Policy): void {
    s.hand = [];
    s.vetoRequested = false;
    if (!enactPolicy(ctx, s, policy, false)) return;
    ensureDeck(s);
    const power = policy === 'fascist' ? (fascistTrack(s.seats.length)[s.fascist - 1] ?? null) : null;
    if (power) {
      s.power = power;
      setPhase(ctx, s, 'power');
      ctx.pushViews();
      return;
    }
    nextPresident(ctx, s);
  }

  function doDiscard(ctx: GameContext, s: SecretHitlerState, index: number): void {
    const [dropped] = s.hand.splice(index, 1);
    s.discard.push(dropped!);
    setPhase(ctx, s, 'chancellorLegislate');
    ctx.pushViews();
  }

  function doEnact(ctx: GameContext, s: SecretHitlerState, index: number): void {
    const policy = s.hand[index]!;
    const other = s.hand[1 - index]!;
    s.discard.push(other);
    governmentEnacts(ctx, s, policy);
  }

  function doVetoAnswer(ctx: GameContext, s: SecretHitlerState, accept: boolean): void {
    if (accept) {
      s.log.push({ k: 'veto', president: s.president, chancellor: s.chancellor! });
      s.discard.push(...s.hand);
      s.hand = [];
      s.vetoRequested = false;
      ensureDeck(s);
      advanceTracker(ctx, s);
      return;
    }
    s.log.push({ k: 'vetoDenied', president: s.president });
    s.vetoRequested = false;
    s.vetoDenied = true;
    s.session++;
    ctx.pushViews();
  }

  function usePower(ctx: GameContext, s: SecretHitlerState, target: string | null): void {
    const power = s.power!;
    const president = s.president;
    s.power = null;
    if (target === null) {
      s.log.push({ k: 'powerSkipped', president, power });
      nextPresident(ctx, s);
      return;
    }
    switch (power) {
      case 'peek':
        s.log.push({ k: 'peek', president });
        nextPresident(ctx, s);
        return;
      case 'investigate': {
        s.investigated.push(target);
        (s.investigations[president] ??= []).push({ target, party: partyOf(s.roles[target]!) });
        s.log.push({ k: 'investigate', president, target });
        nextPresident(ctx, s);
        return;
      }
      case 'specialElection': {
        s.log.push({ k: 'special', president, target });
        // anchor değişmez: özel seçimden sonra sıra başkanın solundan devam eder.
        startNomination(ctx, s, target);
        ctx.pushViews();
        return;
      }
      case 'execution': {
        s.dead.push(target);
        s.log.push({ k: 'execute', president, target });
        if (s.roles[target] === 'hitler') {
          gameOver(ctx, s, 'liberal', 'hitlerExecuted');
          return;
        }
        nextPresident(ctx, s);
        return;
      }
    }
  }

  function powerTargets(s: SecretHitlerState): string[] {
    const others = alive(s).filter((id) => id !== s.president);
    if (s.power === 'investigate') return others.filter((id) => !s.investigated.includes(id));
    if (s.power === 'specialElection' || s.power === 'execution') return others;
    return [];
  }

  function checkSession(s: SecretHitlerState, session: number): boolean {
    return s.session === session;
  }

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(random() * arr.length)]!;
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      if (ids.length < MIN_PLAYERS || ids.length > MAX_PLAYERS) {
        throw new GameError(`Secret Hitler ${MIN_PLAYERS}–${MAX_PLAYERS} kişiyle oynanır. Şu an ${ids.length} kişi bağlı.`);
      }
      const first = ids[Math.floor(random() * ids.length)]!;
      const state: SecretHitlerState = {
        settings,
        seats: ids,
        roles: assignRoles(ids, random),
        dead: [],
        deck: newDeck(random),
        discard: [],
        liberal: 0,
        fascist: 0,
        electionTracker: 0,
        phase: 'nominate',
        anchor: first,
        president: first,
        chancellor: null,
        lastElected: null,
        votes: {},
        voteRound: 0,
        lastVote: null,
        hand: [],
        session: 0,
        vetoRequested: false,
        vetoDenied: false,
        power: null,
        investigated: [],
        investigations: {},
        log: [{ k: 'start', president: first }],
        phaseStartedAt: ctx.now(),
        winner: null,
        winReason: null,
        finishAt: 0,
        finished: false,
        cancelTimer: null,
      };
      return state;
    },

    onAction(ctx, s, playerId, action) {
      const isHost = ctx.hostId() === playerId;

      if (action.type === 'finish') {
        if (!isHost) throw new GameError('Lobiye dönüşü oda sahibi başlatır.');
        if (s.phase !== 'over') throw new GameError('Oyun henüz bitmedi.');
        finish(ctx, s);
        return { ok: true };
      }
      if (s.phase === 'over') return { ok: true, stale: true };

      switch (action.type) {
        case 'nominate': {
          if (s.phase !== 'nominate') return { ok: true, stale: true };
          if (playerId !== s.president) throw new GameError('Şansölye adayını başkan gösterir.');
          if (!eligible(s).includes(action.target)) {
            throw new GameError('Bu oyuncu şansölye adayı olamaz. Listeden işaretli olmayan birini seç.');
          }
          s.chancellor = action.target;
          s.votes = {};
          s.voteRound++;
          s.log.push({ k: 'nominate', president: s.president, chancellor: action.target });
          setPhase(ctx, s, 'vote');
          ctx.pushViews();
          return { ok: true };
        }
        case 'vote': {
          if (s.phase !== 'vote' || action.round !== s.voteRound) return { ok: true, stale: true };
          if (!s.seats.includes(playerId)) throw new GameError('Yalnızca oyuncular oy verebilir.');
          if (!isAlive(s, playerId)) throw new GameError('İdam edilen oyuncular oy veremez.');
          s.votes[playerId] = action.vote;
          if (alive(s).every((id) => s.votes[id])) resolveVote(ctx, s);
          else ctx.pushViews();
          return { ok: true };
        }
        case 'discard': {
          if (s.phase !== 'presidentLegislate' || !checkSession(s, action.session)) return { ok: true, stale: true };
          if (playerId !== s.president) throw new GameError('Kartı başkan atar.');
          doDiscard(ctx, s, action.index);
          return { ok: true };
        }
        case 'enact': {
          if (s.phase !== 'chancellorLegislate' || !checkSession(s, action.session)) return { ok: true, stale: true };
          if (playerId !== s.chancellor) throw new GameError('Yasayı şansölye çıkarır.');
          if (s.vetoRequested) throw new GameError('Başkanın veto cevabını bekle.');
          doEnact(ctx, s, action.index);
          return { ok: true };
        }
        case 'veto': {
          if (s.phase !== 'chancellorLegislate' || !checkSession(s, action.session)) return { ok: true, stale: true };
          if (playerId !== s.chancellor) throw new GameError('Vetoyu şansölye önerir.');
          if (s.fascist < VETO_AT) throw new GameError('Veto 5 faşist yasadan sonra açılır.');
          if (s.vetoDenied) throw new GameError('Başkan vetoyu reddetti; bir yasa seçmelisin.');
          if (s.vetoRequested) return { ok: true, stale: true };
          s.vetoRequested = true;
          s.session++;
          s.log.push({ k: 'vetoAsked', chancellor: s.chancellor! });
          ctx.pushViews();
          return { ok: true };
        }
        case 'vetoAnswer': {
          if (s.phase !== 'chancellorLegislate' || !s.vetoRequested || !checkSession(s, action.session)) {
            return { ok: true, stale: true };
          }
          if (playerId !== s.president) throw new GameError('Veto önerisini başkan cevaplar.');
          doVetoAnswer(ctx, s, action.accept);
          return { ok: true };
        }
        case 'peekDone': {
          if (s.phase !== 'power' || s.power !== 'peek' || !checkSession(s, action.session)) return { ok: true, stale: true };
          if (playerId !== s.president) throw new GameError('Önizlemeyi başkan yapar.');
          usePower(ctx, s, s.president);
          return { ok: true };
        }
        case 'power': {
          if (s.phase !== 'power' || !checkSession(s, action.session)) return { ok: true, stale: true };
          if (playerId !== s.president) throw new GameError('Yetkiyi başkan kullanır.');
          if (s.power === 'peek') throw new GameError('Bu yetkide hedef seçilmez.');
          if (!powerTargets(s).includes(action.target)) {
            throw new GameError(
              s.power === 'investigate'
                ? 'Bu oyuncu sorgulanamaz. Daha önce sorgulanmamış, hayattaki başka birini seç.'
                : 'Bu oyuncu seçilemez. Hayattaki başka bir oyuncuyu seç.',
            );
          }
          usePower(ctx, s, action.target);
          return { ok: true };
        }
        case 'skip': {
          if (!isHost) throw new GameError('Bekleyen oyuncuyu yalnızca oda sahibi atlayabilir.');
          if (!checkSession(s, action.session)) return { ok: true, stale: true };
          const waiting = waitingFor(s);
          const online = new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
          const someoneOffline = waiting.some((id) => !online.has(id));
          const due = ctx.now() >= s.phaseStartedAt + s.settings.skipAfter * 1000;
          if (!someoneOffline && !due) {
            throw new GameError(`Atlamak için ${s.settings.skipAfter} saniye beklemen gerekiyor ya da oyuncunun bağlantısı kopmuş olmalı.`);
          }
          s.log.push({ k: 'skip', who: waiting, phase: s.phase });
          switch (s.phase) {
            case 'nominate': {
              const target = pick(eligible(s));
              s.chancellor = target;
              s.votes = {};
              s.voteRound++;
              s.log.push({ k: 'nominate', president: s.president, chancellor: target });
              setPhase(ctx, s, 'vote');
              ctx.pushViews();
              break;
            }
            case 'vote':
              for (const id of waiting) s.votes[id] = 'nein';
              resolveVote(ctx, s);
              break;
            case 'presidentLegislate':
              doDiscard(ctx, s, Math.floor(random() * s.hand.length));
              break;
            case 'chancellorLegislate':
              if (s.vetoRequested) doVetoAnswer(ctx, s, false);
              else doEnact(ctx, s, Math.floor(random() * 2));
              break;
            case 'power':
              usePower(ctx, s, s.power === 'peek' ? s.president : null);
              break;
          }
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx) {
      ctx.pushViews();
    },

    onPlayerLeave(ctx) {
      // Oyuncu oyundan çıkarılmaz; sırası gelince oda sahibi atlayabilir.
      ctx.pushViews();
    },

    onSettings(ctx, s, settings) {
      s.settings = settings;
      ctx.pushViews();
    },

    end(ctx, s) {
      if (s.phase === 'over') finish(ctx, s);
      else gameOver(ctx, s, null, 'ended');
    },

    viewFor(s, playerId): SecretHitlerView {
      const n = s.seats.length;
      const myRole = s.roles[playerId];
      const over = s.phase === 'over';
      let me: SecretHitlerView['me'] = null;
      if (myRole) {
        let known: { id: string; role: Role }[] = [];
        if (myRole === 'fascist' || (myRole === 'hitler' && hitlerKnowsFascists(n))) {
          known = s.seats.filter((id) => id !== playerId && s.roles[id] !== 'liberal').map((id) => ({ id, role: s.roles[id]! }));
        }
        me = { role: myRole, known, investigations: s.investigations[playerId] ?? [] };
      }
      const holdsCards =
        (s.phase === 'presidentLegislate' && playerId === s.president) ||
        (s.phase === 'chancellorLegislate' && playerId === s.chancellor);
      const peek = s.phase === 'power' && s.power === 'peek' && playerId === s.president ? s.deck.slice(0, 3) : null;
      return {
        phase: s.phase,
        playerCount: n,
        seats: s.seats.map((id) => ({
          id,
          alive: !s.dead.includes(id),
          voted: s.phase === 'vote' && !!s.votes[id],
          investigated: s.investigated.includes(id),
        })),
        me,
        president: s.president,
        chancellor: s.chancellor,
        lastElected: s.lastElected,
        eligible: s.phase === 'nominate' ? eligible(s) : [],
        liberal: s.liberal,
        fascist: s.fascist,
        track: fascistTrack(n),
        electionTracker: s.electionTracker,
        deckCount: s.deck.length,
        discardCount: s.discard.length,
        vetoUnlocked: s.fascist >= VETO_AT,
        session: s.session,
        voteRound: s.voteRound,
        myVote: s.phase === 'vote' ? (s.votes[playerId] ?? null) : null,
        hand: holdsCards ? [...s.hand] : null,
        vetoRequested: s.vetoRequested,
        vetoDenied: s.vetoDenied,
        power: s.phase === 'power' ? s.power : null,
        peek,
        lastVote: s.lastVote,
        log: s.log,
        waitingFor: waitingFor(s),
        skipAt: s.phaseStartedAt + s.settings.skipAfter * 1000,
        serverNow: Date.now(),
        winner: s.winner,
        winReason: s.winReason,
        roles: over ? { ...s.roles } : null,
        finishAt: s.finishAt,
      };
    },

    dispose(s) {
      s.cancelTimer?.();
    },
  };
}
