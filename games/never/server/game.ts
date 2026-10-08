import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type Answer,
  type NeverAction,
  type NeverPhase,
  type NeverSettings,
  type NeverView,
  type PlayerInfo,
  type PodiumStats,
  type RoundSummary,
  type Statement,
} from '../shared/index.js';
import type { StatementPool } from './statements.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 16;
export const PODIUM_MS = 12_000;
/** Son tur açıklandıktan sonra sonuç ekranına otomatik geçiş. */
export const FINAL_REVEAL_MS = 10_000;
const HISTORY_IN_VIEW = 30;

export class GameError extends UserFacingError {}

export interface NeverTiming {
  podiumMs: number;
  finalRevealMs: number;
}

interface Participant {
  id: string;
  lives: number | null;
  eliminated: boolean;
  did: number;
  didNot: number;
}

export interface NeverState {
  settings: NeverSettings;
  clock: () => number;
  phase: NeverPhase;
  round: number;
  totalRounds: number | null;
  /** Başta sabitlenir; oyun sırasında değişmez. */
  maxLives: number | null;
  anonymous: boolean;
  participants: Participant[];
  /** Odada olan oyuncular (viewFor ctx görmediği için burada tutulur). */
  present: string[];
  pile: Statement[];
  used: Set<string>;
  /** Kategoriler değişince ya da elle eklenen cümleler gelince havuz yeniden okunur. */
  statement: Statement | null;
  answers: Map<string, Answer>;
  skipVotes: Set<string>;
  endsAt: number;
  durationMs: number;
  reveal: RoundSummary | null;
  history: RoundSummary[];
  final: boolean;
  /** Cümle bitti mesajı için. */
  outOfStatements: boolean;
  cancelTimer: (() => void) | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function createNeverGame(deps: { pool: StatementPool; timing?: Partial<NeverTiming> }): ServerGame<NeverSettings, NeverState, NeverAction> {
  const { pool } = deps;
  const timing: NeverTiming = { podiumMs: PODIUM_MS, finalRevealMs: FINAL_REVEAL_MS, ...deps.timing };

  const find = (state: NeverState, id: string) => state.participants.find((p) => p.id === id);

  /** Bu cümleye cevap verebilecekler: elenmemiş, odada ve bağlı. */
  function activeIds(ctx: GameContext, state: NeverState): string[] {
    const online = new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
    return state.participants.filter((p) => !p.eliminated && online.has(p.id)).map((p) => p.id);
  }

  function skipNeeded(active: number): number {
    return Math.floor(active / 2) + 1;
  }

  function draw(state: NeverState): Statement | null {
    if (!state.pile.length) {
      state.pile = shuffle(pool.statements(state.settings.categories).filter((s) => !state.used.has(s.id)));
    }
    const next = state.pile.shift() ?? null;
    if (next) state.used.add(next.id);
    return next;
  }

  function startTimer(ctx: GameContext, state: NeverState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
    const secs = state.settings.seconds;
    state.durationMs = secs * 1000;
    if (secs > 0) {
      state.endsAt = ctx.now() + secs * 1000;
      const id = state.statement?.id;
      state.cancelTimer = ctx.schedule(secs * 1000, () => {
        if (state.phase === 'question' && state.statement?.id === id) reveal(ctx, state);
      });
    } else {
      state.endsAt = 0;
    }
  }

  /** Yeni cümle (yeni tur ya da atlanan cümlenin yerine). */
  function putStatement(ctx: GameContext, state: NeverState): void {
    const s = draw(state);
    if (!s) {
      state.outOfStatements = true;
      podium(ctx, state);
      return;
    }
    state.statement = s;
    state.answers = new Map();
    state.skipVotes = new Set();
    state.reveal = null;
    state.final = false;
    state.phase = 'question';
    startTimer(ctx, state);
    ctx.pushViews();
  }

  function aliveCount(state: NeverState): number {
    const here = new Set(state.present);
    return state.participants.filter((p) => !p.eliminated && here.has(p.id)).length;
  }

  function isOver(state: NeverState): boolean {
    if (state.totalRounds !== null && state.round >= state.totalRounds) return true;
    if (state.maxLives !== null && aliveCount(state) <= 1) return true;
    return false;
  }

  function reveal(ctx: GameContext, state: NeverState): void {
    if (state.phase !== 'question' || !state.statement) return;
    state.cancelTimer?.();
    state.cancelTimer = null;
    const here = new Set(state.present);
    const eligible = state.participants.filter((p) => !p.eliminated && here.has(p.id));
    const didIds: string[] = [];
    const eliminatedIds: string[] = [];
    let answered = 0;
    for (const p of eligible) {
      const a = state.answers.get(p.id);
      if (!a) continue;
      answered++;
      if (a === 'did') {
        didIds.push(p.id);
        p.did++;
        if (p.lives !== null) {
          p.lives = Math.max(0, p.lives - 1);
          if (p.lives === 0) {
            p.eliminated = true;
            eliminatedIds.push(p.id);
          }
        }
      } else {
        p.didNot++;
      }
    }
    const summary: RoundSummary = {
      round: state.round,
      text: state.statement.text,
      didCount: didIds.length,
      answered,
      total: eligible.length,
      didIds: state.anonymous ? null : didIds,
      eliminatedIds: state.anonymous ? null : eliminatedIds,
    };
    state.reveal = summary;
    state.history.unshift(summary);
    state.phase = 'reveal';
    state.endsAt = 0;
    state.final = isOver(state);
    if (state.final) scheduleFinal(ctx, state);
    ctx.pushViews();
  }

  function scheduleFinal(ctx: GameContext, state: NeverState): void {
    state.cancelTimer?.();
    const round = state.round;
    state.cancelTimer = ctx.schedule(timing.finalRevealMs, () => {
      if (state.phase === 'reveal' && state.round === round && state.final) podium(ctx, state);
    });
  }

  function results(state: NeverState): GameResult[] {
    return state.participants.map((p) => {
      if (state.anonymous) {
        // Kişi başı "yaptım" sayısı sonuç tablosunda herkese görünür; isimsiz modda yalnızca katılım yazılır.
        return { playerId: p.id, score: p.did + p.didNot, meta: { anonymous: true } };
      }
      const score = state.maxLives !== null ? (p.lives ?? 0) : p.didNot;
      return { playerId: p.id, score, meta: { did: p.did, didNot: p.didNot, lives: p.lives, eliminated: p.eliminated } };
    });
  }

  function podium(ctx: GameContext, state: NeverState): void {
    if (state.phase === 'podium') return;
    state.cancelTimer?.();
    state.phase = 'podium';
    state.endsAt = 0;
    state.answers = new Map();
    state.skipVotes = new Set();
    ctx.pushViews();
    state.cancelTimer = ctx.schedule(timing.podiumMs, () => ctx.finish(results(state)));
  }

  function podiumStats(state: NeverState, playerId: string): PodiumStats {
    let hottest: PodiumStats['hottest'] = null;
    for (const r of state.history) {
      if (r.didCount > 0 && (!hottest || r.didCount / Math.max(1, r.total) > hottest.didCount / Math.max(1, hottest.total))) {
        hottest = { text: r.text, didCount: r.didCount, total: r.total };
      }
    }
    const me = find(state, playerId);
    if (state.anonymous) {
      return { rounds: state.history.length, players: null, hottest, winners: null, me: me ? { did: me.did, didNot: me.didNot } : null };
    }
    const here = new Set(state.present);
    return {
      rounds: state.history.length,
      players: state.participants.map((p) => ({ id: p.id, did: p.did, didNot: p.didNot, lives: p.lives, eliminated: p.eliminated })),
      hottest,
      winners: state.maxLives !== null ? state.participants.filter((p) => !p.eliminated && here.has(p.id)).map((p) => p.id) : null,
      me: me ? { did: me.did, didNot: me.didNot } : null,
    };
  }

  function requireHost(ctx: GameContext, playerId: string): void {
    if (ctx.hostId() !== playerId) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
  }

  function maybeRevealAll(ctx: GameContext, state: NeverState): void {
    if (state.phase !== 'question') return;
    const active = activeIds(ctx, state);
    if (active.length > 0 && active.every((id) => state.answers.has(id))) reveal(ctx, state);
    else if (active.length === 0) reveal(ctx, state);
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (settings.anonymous && settings.lives > 0) {
        return 'İsimsiz modda can sistemi kullanılamaz; canlar kimin yaptığını belli eder. Birini kapat.';
      }
      if (!pool.statements(settings.categories).length) return 'Seçili kategorilerde cümle yok. Başka kategori seç.';
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      if (ids.length < MIN_PLAYERS) throw new GameError(`En az ${MIN_PLAYERS} kişi gerekiyor. Arkadaşlarını odaya çağır.`);
      const maxLives = settings.lives > 0 && !settings.anonymous ? settings.lives : null;
      const state: NeverState = {
        settings,
        clock: () => ctx.now(),
        phase: 'question',
        round: 1,
        totalRounds: settings.rounds > 0 ? settings.rounds : null,
        maxLives,
        anonymous: settings.anonymous,
        participants: ids.map((id) => ({ id, lives: maxLives, eliminated: false, did: 0, didNot: 0 })),
        present: ctx.players().map((p) => p.id),
        pile: [],
        used: new Set(),
        statement: null,
        answers: new Map(),
        skipVotes: new Set(),
        endsAt: 0,
        durationMs: 0,
        reveal: null,
        history: [],
        final: false,
        outOfStatements: false,
        cancelTimer: null,
      };
      const first = draw(state);
      if (!first) throw new GameError('Seçili kategorilerde cümle yok. Başka kategori seç.');
      state.statement = first;
      startTimer(ctx, state);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      switch (action.type) {
        case 'answer': {
          if (state.phase !== 'question' || state.statement?.id !== action.statementId) return { ok: true, stale: true };
          const p = find(state, playerId);
          if (!p) throw new GameError('Bu oyuna sonradan katıldın; sıradaki cümlede sen de cevaplayabilirsin.');
          if (p.eliminated) throw new GameError('Canın bitti; oyunu izlemeye devam edebilirsin.');
          state.answers.set(playerId, action.answer);
          ctx.pushViews();
          maybeRevealAll(ctx, state);
          return { ok: true };
        }
        case 'voteSkip': {
          if (state.phase !== 'question' || state.statement?.id !== action.statementId) return { ok: true, stale: true };
          const active = activeIds(ctx, state);
          if (!active.includes(playerId)) throw new GameError('Atlama oyunu yalnızca bu turda cevap verenler kullanabilir.');
          if (state.skipVotes.has(playerId)) state.skipVotes.delete(playerId);
          else state.skipVotes.add(playerId);
          const votes = [...state.skipVotes].filter((id) => active.includes(id)).length;
          if (votes >= skipNeeded(active.length)) putStatement(ctx, state);
          else ctx.pushViews();
          return { ok: true };
        }
        case 'reveal': {
          requireHost(ctx, playerId);
          if (state.phase !== 'question' || state.statement?.id !== action.statementId) return { ok: true, stale: true };
          reveal(ctx, state);
          return { ok: true };
        }
        case 'next': {
          requireHost(ctx, playerId);
          if (state.statement?.id !== action.statementId) return { ok: true, stale: true };
          if (state.phase === 'question') {
            putStatement(ctx, state);
            return { ok: true };
          }
          if (state.phase === 'reveal') {
            if (state.final) {
              podium(ctx, state);
              return { ok: true };
            }
            state.round++;
            putStatement(ctx, state);
            return { ok: true };
          }
          return { ok: true, stale: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!state.present.includes(playerId)) state.present.push(playerId);
      if (!find(state, playerId)) {
        state.participants.push({ id: playerId, lives: state.maxLives, eliminated: false, did: 0, didNot: 0 });
      }
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      state.present = state.present.filter((id) => id !== playerId);
      state.answers.delete(playerId);
      state.skipVotes.delete(playerId);
      if (state.phase === 'question') {
        maybeRevealAll(ctx, state);
        if (state.phase === 'question') {
          const active = activeIds(ctx, state);
          const votes = [...state.skipVotes].filter((id) => active.includes(id)).length;
          if (votes > 0 && votes >= skipNeeded(active.length)) {
            putStatement(ctx, state);
            return;
          }
        }
      }
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      const categoriesChanged = settings.categories.join() !== state.settings.categories.join();
      // Can ve isimsiz mod oyunun başında sabitlenir (ortada değişirse gizlilik bozulur).
      state.settings = { ...settings, lives: state.settings.lives, anonymous: state.settings.anonymous };
      if (categoriesChanged) state.pile = [];
      state.totalRounds = settings.rounds > 0 ? Math.max(settings.rounds, state.round) : null;
      if (state.phase === 'reveal') {
        const over = isOver(state);
        if (over !== state.final) {
          state.final = over;
          if (over) scheduleFinal(ctx, state);
          else {
            state.cancelTimer?.();
            state.cancelTimer = null;
          }
        }
      }
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): NeverView {
      const here = new Set(state.present);
      const me = find(state, playerId);
      const players: PlayerInfo[] = state.participants
        .filter((p) => here.has(p.id))
        .map((p) => ({
          id: p.id,
          lives: state.anonymous ? null : p.lives,
          eliminated: p.eliminated,
          answered: state.phase === 'question' && state.answers.has(p.id),
          active: !p.eliminated,
          didCount: state.anonymous ? null : p.did,
        }));
      const activeHere = state.participants.filter((p) => !p.eliminated && here.has(p.id)).map((p) => p.id);
      return {
        phase: state.phase,
        round: state.round,
        totalRounds: state.totalRounds,
        statement: state.phase === 'podium' ? null : state.statement,
        serverNow: state.clock(),
        endsAt: state.phase === 'question' ? state.endsAt : 0,
        durationMs: state.durationMs,
        anonymous: state.anonymous,
        maxLives: state.maxLives,
        players,
        // Oyuncu yalnızca kendi cevabını görür.
        myAnswer: state.phase === 'podium' ? null : (state.answers.get(playerId) ?? null),
        canAnswer: state.phase === 'question' && !!me && !me.eliminated,
        skip: {
          votes: [...state.skipVotes].filter((id) => activeHere.includes(id)).length,
          needed: skipNeeded(activeHere.length),
          mine: state.skipVotes.has(playerId),
        },
        reveal: state.phase === 'reveal' ? state.reveal : null,
        history: state.history.slice(0, HISTORY_IN_VIEW),
        final: state.final,
        podium: state.phase === 'podium' ? podiumStats(state, playerId) : null,
      };
    },

    dispose(state) {
      state.cancelTimer?.();
    },
  };
}
