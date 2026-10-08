import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  VOTES,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type Counts,
  type DivisiveItem,
  type PlayerProfile,
  type RedFlagAction,
  type RedFlagPhase,
  type RedFlagSettings,
  type RedFlagView,
  type Situation,
  type Summary,
  type Vote,
} from '../shared/index.js';
import { CATEGORY_NAMES, type Pool } from './pool.js';

export class GameError extends UserFacingError {}

export interface RedFlagTiming {
  /** Oyun sonu özeti ekranda kalma süresi; sonra `ctx.finish`. */
  podiumMs: number;
  /** Açıklamadan sonra tartışma için "Sonraki"nin kilitli kaldığı süre. */
  revealLockMs: number;
  /** Bağlantısı kopan oyuncuları beklememek için düzenli kontrol aralığı. */
  watchdogMs: number;
}

export const DEFAULT_TIMING: RedFlagTiming = { podiumMs: 25_000, revealLockMs: 3_000, watchdogMs: 2_000 };

interface Round {
  item: Situation;
  /** Tur başında sabitlenir: oyun sırasında ayar değişse de bu turun gizliliği değişmez. */
  anonymous: boolean;
  predict: boolean;
  dealBreaker: boolean;
  seconds: number;
  /** Bu turda oy verebilenler (başta bağlı olanlar + sonradan katılanlar). */
  voters: string[];
  votes: Record<string, Vote>;
  guesses: Record<string, Vote>;
  endsAt: number;
  nextAt: number;
  ready: string[];
  /** Açıklandıysa sonuç. */
  result: { counts: Counts; total: number; majority: Vote[]; correct: string[] } | null;
}

interface Stat {
  green: number;
  red: number;
  never: number;
  minority: number;
}

export interface RedFlagState {
  settings: RedFlagSettings;
  phase: RedFlagPhase;
  /** Açılan durum sayısı. */
  round: number;
  totalRounds: number | null;
  cur: Round | null;
  pile: Situation[];
  used: Set<string>;
  scores: Record<string, number>;
  stats: Record<string, Stat>;
  history: DivisiveItem[];
  /** Oyunun herhangi bir turu isimsiz oynandıysa kişisel profiller başkalarına gösterilmez. */
  everAnonymous: boolean;
  cancelTimer: (() => void) | null;
  cancelWatchdog: (() => void) | null;
  now: () => number;
}

const emptyCounts = (): Counts => ({ green: 0, red: 0, never: 0 });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** En çok oy alan seçenek(ler). Hiç oy yoksa boş. */
export function majorityOf(counts: Counts): Vote[] {
  const max = Math.max(counts.green, counts.red, counts.never);
  if (max <= 0) return [];
  return VOTES.filter((v) => counts[v] === max);
}

function profileOf(id: string, s: Stat): PlayerProfile {
  const total = s.green + s.red + s.never;
  return { playerId: id, ...s, tolerance: total ? Math.round((s.green / total) * 100) : 0 };
}

/** Katılık: red 1, "asla olmaz" 1.5 ağırlıklı. */
const strictness = (p: PlayerProfile) => {
  const total = p.green + p.red + p.never;
  return total ? (p.red + p.never * 1.5) / total : 0;
};

export function createRedFlagGame(deps: { pool: Pool; timing?: Partial<RedFlagTiming> }): ServerGame<RedFlagSettings, RedFlagState, RedFlagAction> {
  const { pool } = deps;
  const timing: RedFlagTiming = { ...DEFAULT_TIMING, ...deps.timing };

  const connected = (ctx: GameContext) => new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  const present = (ctx: GameContext) => new Set(ctx.players().map((p) => p.id));

  function ensurePlayer(state: RedFlagState, id: string): void {
    state.scores[id] ??= 0;
    state.stats[id] ??= { green: 0, red: 0, never: 0, minority: 0 };
  }

  function draw(state: RedFlagState): Situation {
    if (!state.pile.length) {
      const all = pool.items(state.settings.categories);
      let fresh = all.filter((c) => !state.used.has(c.id));
      if (!fresh.length) {
        state.used.clear();
        fresh = all;
      }
      if (!fresh.length) throw new GameError('Seçili kategorilerde durum kalmadı. Ayarlardan başka kategori seç.');
      state.pile = shuffle(fresh);
    }
    const item = state.pile.shift()!;
    state.used.add(item.id);
    return item;
  }

  function clearTimer(state: RedFlagState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
  }

  function beginRound(ctx: GameContext, state: RedFlagState, voters?: string[]): void {
    clearTimer(state);
    const s = state.settings;
    const now = ctx.now();
    const ids = voters ?? ctx.players().filter((p) => p.connected).map((p) => p.id);
    for (const id of ids) ensurePlayer(state, id);
    state.cur = {
      item: draw(state),
      anonymous: s.anonymous,
      predict: s.predict,
      dealBreaker: s.dealBreaker,
      seconds: s.seconds,
      voters: ids,
      votes: {},
      guesses: {},
      endsAt: s.seconds > 0 ? now + s.seconds * 1000 : 0,
      nextAt: 0,
      ready: [],
      result: null,
    };
    if (s.anonymous) state.everAnonymous = true;
    state.phase = 'vote';
    if (s.seconds > 0) state.cancelTimer = ctx.schedule(s.seconds * 1000, () => reveal(ctx, state));
    ctx.pushViews();
  }

  function isDone(r: Round, id: string): boolean {
    return r.votes[id] !== undefined && (!r.predict || r.guesses[id] !== undefined);
  }

  /** Bağlı ve odada olan bütün oy verenler tamamladıysa oyları aç. */
  function checkAllDone(ctx: GameContext, state: RedFlagState): void {
    const r = state.cur;
    if (state.phase !== 'vote' || !r) return;
    const online = connected(ctx);
    const waiting = r.voters.filter((id) => online.has(id));
    if (!waiting.length) return;
    if (waiting.every((id) => isDone(r, id))) reveal(ctx, state);
  }

  function reveal(ctx: GameContext, state: RedFlagState): void {
    const r = state.cur;
    if (state.phase !== 'vote' || !r) return;
    clearTimer(state);
    const counts = emptyCounts();
    for (const v of Object.values(r.votes)) counts[v]++;
    const total = counts.green + counts.red + counts.never;
    const majority = majorityOf(counts);
    const correct = r.predict && total > 0 ? Object.keys(r.guesses).filter((id) => majority.includes(r.guesses[id]!)) : [];
    for (const id of correct) {
      ensurePlayer(state, id);
      state.scores[id]!++;
    }
    const unique = majority.length === 1 ? majority[0]! : null;
    for (const [id, v] of Object.entries(r.votes)) {
      ensurePlayer(state, id);
      const st = state.stats[id]!;
      st[v]++;
      if (unique && v !== unique) st.minority++;
    }
    if (total > 0) state.history.push({ text: r.item.text, counts });
    r.result = { counts, total, majority, correct };
    r.nextAt = ctx.now() + timing.revealLockMs;
    state.round++;
    state.phase = 'reveal';
    ctx.pushViews();
  }

  function advance(ctx: GameContext, state: RedFlagState): void {
    if (state.phase !== 'reveal') return;
    clearTimer(state);
    if (state.totalRounds !== null && state.round >= state.totalRounds) return podium(ctx, state);
    beginRound(ctx, state);
  }

  function checkAllReady(ctx: GameContext, state: RedFlagState): void {
    const r = state.cur;
    if (state.phase !== 'reveal' || !r || state.cancelTimer) return;
    const online = connected(ctx);
    const waiting = r.voters.filter((id) => online.has(id));
    if (!waiting.length || !waiting.every((id) => r.ready.includes(id))) return;
    const wait = r.nextAt - ctx.now();
    if (wait > 0) state.cancelTimer = ctx.schedule(wait, () => advance(ctx, state));
    else advance(ctx, state);
  }

  function watchdog(ctx: GameContext, state: RedFlagState): void {
    state.cancelWatchdog = ctx.schedule(timing.watchdogMs, () => {
      if (state.phase === 'podium') return;
      checkAllDone(ctx, state);
      checkAllReady(ctx, state);
      watchdog(ctx, state);
    });
  }

  function podium(ctx: GameContext, state: RedFlagState): void {
    if (state.phase === 'podium') return;
    clearTimer(state);
    state.cancelWatchdog?.();
    state.cancelWatchdog = null;
    // Açılmamış tur sayılmaz; oy içerikleri de hiçbir yere gitmez.
    if (state.cur && !state.cur.result) state.cur = null;
    state.phase = 'podium';
    ctx.pushViews();
    state.cancelTimer = ctx.schedule(timing.podiumMs, () => {
      ctx.finish(
        Object.keys(state.scores).map((id) => {
          const p = profileOf(id, state.stats[id] ?? { green: 0, red: 0, never: 0, minority: 0 });
          return {
            playerId: id,
            score: state.scores[id] ?? 0,
            meta: { green: p.green, red: p.red, never: p.never, tolerance: p.tolerance },
          };
        }),
      );
    });
  }

  function summaryFor(state: RedFlagState, viewer: string): Summary {
    const all = Object.entries(state.stats)
      .map(([id, s]) => profileOf(id, s))
      .filter((p) => p.green + p.red + p.never > 0);
    const totals = emptyCounts();
    for (const p of all) {
      totals.green += p.green;
      totals.red += p.red;
      totals.never += p.never;
    }
    const divisive = state.history
      .map((h, i) => {
        const total = h.counts.green + h.counts.red + h.counts.never;
        const top = Math.max(h.counts.green, h.counts.red, h.counts.never);
        return { h, i, split: total >= 2 ? (total - top) / total : 0 };
      })
      .filter((x) => x.split > 0)
      .sort((a, b) => b.split - a.split || a.i - b.i)
      .slice(0, 3)
      .map((x) => x.h);
    const named = !state.everAnonymous;
    let mostGreen: string | null = null;
    let strictest: string | null = null;
    let rebel: string | null = null;
    if (named && all.length >= 2) {
      const byGreen = [...all].sort((a, b) => b.tolerance - a.tolerance);
      const byStrict = [...all].sort((a, b) => strictness(b) - strictness(a));
      if (byGreen[0]!.tolerance > byGreen[byGreen.length - 1]!.tolerance) mostGreen = byGreen[0]!.playerId;
      if (strictness(byStrict[0]!) > strictness(byStrict[byStrict.length - 1]!)) strictest = byStrict[0]!.playerId;
      const byMinority = [...all].sort((a, b) => b.minority - a.minority);
      if (byMinority[0]!.minority > 0) rebel = byMinority[0]!.playerId;
    }
    return {
      rounds: state.round,
      profiles: named ? all.sort((a, b) => b.tolerance - a.tolerance) : all.filter((p) => p.playerId === viewer),
      mostGreen,
      strictest,
      rebel,
      divisive,
      totals,
    };
  }

  return {
    id: GAME_ID,
    minPlayers: 2,
    maxPlayers: 16,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (!pool.items(settings.categories).length) return 'Seçili kategorilerde durum yok. Başka kategori seç.';
      return null;
    },

    async start(ctx, settings) {
      const state: RedFlagState = {
        settings,
        phase: 'vote',
        round: 0,
        totalRounds: settings.rounds === 0 ? null : settings.rounds,
        cur: null,
        pile: [],
        used: new Set(),
        scores: {},
        stats: {},
        history: [],
        everAnonymous: false,
        cancelTimer: null,
        cancelWatchdog: null,
        now: () => ctx.now(),
      };
      beginRound(ctx, state);
      watchdog(ctx, state);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      const r = state.cur;

      switch (action.type) {
        case 'vote':
        case 'guess': {
          if (state.phase !== 'vote' || !r || r.item.id !== action.itemId) return { ok: true, stale: true };
          if (!r.voters.includes(playerId)) throw new GameError('Bu turda oy veremezsin. Sıradaki durumu bekle.');
          if (action.vote === 'never' && !r.dealBreaker) throw new GameError('“Asla olmaz” bu oyunda kapalı. Green ya da red seç.');
          if (action.type === 'guess') {
            if (!r.predict) throw new GameError('Tahmin modu kapalı.');
            r.guesses[playerId] = action.vote;
          } else {
            r.votes[playerId] = action.vote;
          }
          ctx.pushViews();
          checkAllDone(ctx, state);
          return { ok: true };
        }
        case 'reveal': {
          if (!isHost) throw new GameError('Oyları yalnızca oda sahibi erkenden açabilir.');
          if (state.phase !== 'vote' || !r || r.item.id !== action.itemId) return { ok: true, stale: true };
          if (!Object.keys(r.votes).length) throw new GameError('Henüz kimse oy vermedi. Durumu atlamak istersen “Durumu atla”ya bas.');
          reveal(ctx, state);
          return { ok: true };
        }
        case 'skip': {
          if (!isHost) throw new GameError('Durumu yalnızca oda sahibi atlayabilir.');
          if (state.phase !== 'vote' || !r || r.item.id !== action.itemId) return { ok: true, stale: true };
          const online = connected(ctx);
          const voters = [...new Set([...r.voters.filter((id) => present(ctx).has(id)), ...online])];
          beginRound(ctx, state, voters);
          return { ok: true };
        }
        case 'ready': {
          if (state.phase !== 'reveal' || !r || action.round !== state.round) return { ok: true, stale: true };
          if (!r.ready.includes(playerId)) r.ready.push(playerId);
          ctx.pushViews();
          checkAllReady(ctx, state);
          return { ok: true };
        }
        case 'next': {
          if (!isHost) throw new GameError('Sıradaki duruma oda sahibi geçer. “Hazırım”a basabilirsin.');
          if (state.phase !== 'reveal' || !r || action.round !== state.round) return { ok: true, stale: true };
          if (ctx.now() < r.nextAt) throw new GameError('Herkes sonucu görsün, birkaç saniye sonra tekrar dene.');
          advance(ctx, state);
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      ensurePlayer(state, playerId);
      if (state.phase === 'vote' && state.cur && !state.cur.voters.includes(playerId)) state.cur.voters.push(playerId);
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      const r = state.cur;
      if (r) {
        // Oy verdiyse oyu sayılır; vermediyse beklenmez.
        if (r.votes[playerId] === undefined) r.voters = r.voters.filter((id) => id !== playerId);
        r.ready = r.ready.filter((id) => id !== playerId);
      }
      ctx.pushViews();
      checkAllDone(ctx, state);
      checkAllReady(ctx, state);
    },

    onSettings(ctx, state, settings) {
      const categoriesChanged = settings.categories.join() !== state.settings.categories.join();
      state.settings = settings;
      if (categoriesChanged) state.pile = [];
      const floor = state.round + (state.phase === 'vote' ? 1 : 0);
      state.totalRounds = settings.rounds === 0 ? null : Math.max(settings.rounds, floor);
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): RedFlagView {
      const r = state.cur;
      const res = r?.result ?? null;
      const showCur = state.phase !== 'podium' && r;
      return {
        phase: state.phase,
        round: state.round,
        totalRounds: state.totalRounds,
        item: showCur ? r.item : null,
        categoryName: showCur ? (CATEGORY_NAMES[r.item.category] ?? r.item.category) : '',
        dealBreaker: r?.dealBreaker ?? state.settings.dealBreaker,
        anonymous: r?.anonymous ?? state.settings.anonymous,
        predict: r?.predict ?? state.settings.predict,
        voters: r?.voters ?? [],
        done: r ? r.voters.filter((id) => isDone(r, id)) : [],
        ready: r?.ready ?? [],
        myVote: r?.votes[playerId] ?? null,
        myGuess: r?.guesses[playerId] ?? null,
        serverNow: state.now(),
        endsAt: state.phase === 'vote' ? (r?.endsAt ?? 0) : 0,
        durationMs: (r?.seconds ?? 0) * 1000,
        nextAt: r?.nextAt ?? 0,
        reveal:
          state.phase === 'reveal' && r && res
            ? {
                counts: res.counts,
                total: res.total,
                majority: res.majority,
                // İsimsiz modda kimin ne dediği hiç gönderilmez.
                votes: r.anonymous ? null : Object.entries(r.votes).map(([id, vote]) => ({ playerId: id, vote })),
                correct: res.correct,
                myVote: r.votes[playerId] ?? null,
                myGuess: r.guesses[playerId] ?? null,
              }
            : null,
        scores: state.scores,
        summary: state.phase === 'podium' ? summaryFor(state, playerId) : null,
      };
    },

    dispose(state) {
      state.cancelTimer?.();
      state.cancelWatchdog?.();
    },
  };
}
