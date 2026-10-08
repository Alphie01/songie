import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  KINDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  actionSchema,
  defaultSettings,
  seatAngle,
  settingsSchema,
  type BottleAction,
  type BottlePhase,
  type BottleSettings,
  type BottleView,
  type LastResult,
  type Outcome,
  type PlayerScore,
  type Prompt,
  type PromptKind,
  type SpinInfo,
} from '../shared/index.js';
import type { PromptBank } from './prompts.js';

export class GameError extends UserFacingError {}

export interface BottleTiming {
  /** Herkesin animasyonu aynı anda başlatabilmesi için ağ payı. */
  leadMs: number;
  spinMinMs: number;
  spinMaxMs: number;
  /** "Yaptı mı?" oylamasının süresi. */
  voteMs: number;
  podiumMs: number;
}

export const DEFAULT_TIMING: BottleTiming = {
  leadMs: 400,
  spinMinMs: 3800,
  spinMaxMs: 4800,
  voteMs: 20_000,
  podiumMs: 8000,
};

/** Son iki çevirmede seçilenlerin ağırlığı (en yeni önce). */
const RECENT_WEIGHTS = [0.25, 0.5];

export interface BottleState {
  settings: BottleSettings;
  clock: () => number;
  seats: string[];
  phase: BottlePhase;
  round: number;
  turnNumber: number;
  totalRounds: number | null;
  spinnerId: string;
  targetId: string | null;
  spin: SpinInfo | null;
  restDeg: number;
  kind: PromptKind | null;
  prompt: Prompt | null;
  scores: Record<string, PlayerScore>;
  passesUsed: Record<string, number>;
  /** Son seçilen hedefler, en yeni sonda. */
  recentTargets: string[];
  voters: string[];
  votes: Record<string, boolean>;
  voteEndsAt: number;
  lastResult: LastResult | null;
  piles: Record<PromptKind, Prompt[]>;
  used: Set<string>;
  cancelTimer: (() => void) | null;
}

const PHASE_ORDER: BottlePhase[] = ['spin', 'spinning', 'choose', 'task', 'vote', 'podium'];
const passed = (state: BottleState, phase: BottlePhase) => PHASE_ORDER.indexOf(state.phase) > PHASE_ORDER.indexOf(phase);

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const emptyScore = (): PlayerScore => ({ points: 0, done: 0, passes: 0, failed: 0 });

export function createBottleGame(deps: {
  bank: PromptBank;
  timing?: Partial<BottleTiming>;
  random?: () => number;
}): ServerGame<BottleSettings, BottleState, BottleAction> {
  const { bank } = deps;
  const timing: BottleTiming = { ...DEFAULT_TIMING, ...deps.timing };
  const rnd = deps.random ?? Math.random;

  const online = (ctx: GameContext) => new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  const inRoom = (ctx: GameContext) => new Set(ctx.players().map((p) => p.id));

  function ensureScore(state: BottleState, id: string): PlayerScore {
    return (state.scores[id] ??= emptyScore());
  }

  /** `fromId`'den sonra masada oturan ilk bağlı oyuncu. */
  function nextSeat(ctx: GameContext, state: BottleState, fromId: string): string {
    const on = online(ctx);
    const n = state.seats.length;
    const start = state.seats.indexOf(fromId);
    for (let k = 1; k <= n; k++) {
      const id = state.seats[(start + k + n) % n]!;
      if (on.has(id)) return id;
    }
    return state.seats[(start + 1 + n) % n] ?? fromId;
  }

  function draw(state: BottleState, kind: PromptKind): Prompt {
    if (!state.piles[kind].length) {
      let all = bank.prompts(state.settings.categories, kind);
      if (!all.length) all = bank.prompts(bank.categories().map((c) => c.id), kind);
      if (!all.length) throw new GameError('Bu türde soru kalmadı. Ayarlardan başka kategori seç.');
      let fresh = all.filter((p) => !state.used.has(p.id));
      if (!fresh.length) {
        for (const p of all) state.used.delete(p.id);
        fresh = all;
      }
      state.piles[kind] = shuffle(fresh, rnd);
    }
    const p = state.piles[kind].shift()!;
    state.used.add(p.id);
    return p;
  }

  function setTimer(ctx: GameContext, state: BottleState, ms: number, fn: () => void): void {
    state.cancelTimer?.();
    state.cancelTimer = ctx.schedule(ms, () => {
      state.cancelTimer = null;
      fn();
    });
  }

  function clearTimer(state: BottleState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
  }

  function beginSpinPhase(ctx: GameContext, state: BottleState, spinnerId: string): void {
    clearTimer(state);
    // Odadan çıkanlar masadan şimdi kalkar (şişe dururken açılar değişmesin diye).
    const present = inRoom(ctx);
    state.seats = state.seats.filter((id) => present.has(id));
    state.round++;
    state.phase = 'spin';
    state.spinnerId = spinnerId;
    state.targetId = null;
    state.kind = null;
    state.prompt = null;
    state.voters = [];
    state.votes = {};
    ctx.pushViews();
  }

  function pickTarget(ctx: GameContext, state: BottleState): string {
    const on = online(ctx);
    const eligible = state.seats.filter((id) => id !== state.spinnerId && on.has(id));
    if (!eligible.length) throw new GameError('Şişenin gösterebileceği bağlı başka oyuncu yok. Arkadaşlarının dönmesini bekle.');
    const weights = eligible.map((id) => {
      if (!state.settings.fairSpin || eligible.length < 2) return 1;
      const back = state.recentTargets.length - 1 - state.recentTargets.lastIndexOf(id);
      return state.recentTargets.includes(id) && back < RECENT_WEIGHTS.length ? RECENT_WEIGHTS[back]! : 1;
    });
    let r = rnd() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < eligible.length; i++) {
      r -= weights[i]!;
      if (r < 0) return eligible[i]!;
    }
    return eligible[eligible.length - 1]!;
  }

  function startSpin(ctx: GameContext, state: BottleState): void {
    const target = pickTarget(ctx, state);
    const n = state.seats.length;
    const slice = 360 / n;
    // Şişe hedefin dilimi içinde ama tam ortada olmayan bir yerde durur.
    const jitter = (rnd() - 0.5) * Math.min(slice * 0.5, 30);
    const want = seatAngle(state.seats.indexOf(target), n) + jitter;
    const from = state.restDeg;
    const current = ((from % 360) + 360) % 360;
    const delta = (((want - current) % 360) + 360) % 360;
    const turns = 3 + Math.floor(rnd() * 3);
    const durationMs = Math.round(timing.spinMinMs + rnd() * (timing.spinMaxMs - timing.spinMinMs));
    const startAt = ctx.now() + timing.leadMs;
    state.targetId = target;
    state.spin = { id: state.round, startAt, durationMs, fromDeg: from, toDeg: from + turns * 360 + delta };
    state.phase = 'spinning';
    setTimer(ctx, state, timing.leadMs + durationMs, () => reveal(ctx, state));
    ctx.pushViews();
  }

  function reveal(ctx: GameContext, state: BottleState): void {
    if (state.phase !== 'spinning' || !state.targetId) return;
    state.restDeg = state.spin?.toDeg ?? state.restDeg;
    state.recentTargets = [...state.recentTargets, state.targetId].slice(-RECENT_WEIGHTS.length);
    const present = inRoom(ctx);
    if (!present.has(state.targetId)) {
      // Hedef animasyon sırasında odadan çıktı: aynı kişi (o da yoksa sıradaki) yeniden çevirir.
      const spinner = present.has(state.spinnerId) ? state.spinnerId : nextSeat(ctx, state, state.spinnerId);
      beginSpinPhase(ctx, state, spinner);
      return;
    }
    if (state.settings.choice === 'random') {
      choose(ctx, state, rnd() < 0.5 ? 'truth' : 'dare');
      return;
    }
    state.phase = 'choose';
    ctx.pushViews();
  }

  function choose(ctx: GameContext, state: BottleState, kind: PromptKind): void {
    state.kind = kind;
    state.prompt = draw(state, kind);
    state.phase = 'task';
    ctx.pushViews();
  }

  function passesLeft(state: BottleState, id: string): number | null {
    if (state.settings.passes < 0) return null;
    return Math.max(0, state.settings.passes - (state.passesUsed[id] ?? 0));
  }

  function finishTurn(ctx: GameContext, state: BottleState, outcome: Outcome, votes: LastResult['votes'] = null): void {
    clearTimer(state);
    const targetId = state.targetId!;
    const score = ensureScore(state, targetId);
    if (outcome === 'done') {
      score.points++;
      score.done++;
    } else if (outcome === 'failed') {
      score.failed++;
    } else if (outcome === 'pass') {
      score.passes++;
      state.passesUsed[targetId] = (state.passesUsed[targetId] ?? 0) + 1;
      if (state.settings.passPenalty) score.points--;
    }
    state.lastResult = {
      targetId,
      kind: state.kind ?? 'truth',
      text: state.prompt?.text ?? '',
      outcome,
      votes,
    };
    if (outcome !== 'skipped') state.turnNumber++;
    if (state.totalRounds !== null && state.turnNumber >= state.totalRounds) return podium(ctx, state);

    const on = online(ctx);
    let next: string;
    if (outcome !== 'skipped' && state.settings.order === 'target' && on.has(targetId)) next = targetId;
    else next = nextSeat(ctx, state, state.spinnerId);
    beginSpinPhase(ctx, state, next);
  }

  function resolveVote(ctx: GameContext, state: BottleState): void {
    if (state.phase !== 'vote') return;
    const values = state.voters.filter((id) => id in state.votes).map((id) => state.votes[id]!);
    const yes = values.filter(Boolean).length;
    const no = values.length - yes;
    finishTurn(ctx, state, yes >= no ? 'done' : 'failed', { yes, no });
  }

  function maybeCloseVote(ctx: GameContext, state: BottleState): void {
    const on = online(ctx);
    const pending = state.voters.filter((id) => on.has(id) && !(id in state.votes));
    if (!pending.length) resolveVote(ctx, state);
    else ctx.pushViews();
  }

  function podium(ctx: GameContext, state: BottleState): void {
    if (state.phase === 'podium') return;
    clearTimer(state);
    state.phase = 'podium';
    state.targetId = null;
    state.prompt = null;
    ctx.pushViews();
    setTimer(ctx, state, timing.podiumMs, () => {
      const ids = new Set([...state.seats, ...Object.keys(state.scores)]);
      ctx.finish(
        [...ids].map((id) => {
          const sc = state.scores[id] ?? emptyScore();
          return { playerId: id, score: sc.points, meta: { done: sc.done, passes: sc.passes, failed: sc.failed } };
        }),
      );
    });
  }

  function expectRound(state: BottleState, round: number): boolean {
    return round === state.round;
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      for (const kind of KINDS) {
        if (!bank.prompts(settings.categories, kind).length) {
          return kind === 'truth'
            ? 'Seçili kategorilerde doğruluk sorusu yok. Bir kategori daha seç.'
            : 'Seçili kategorilerde cesaret görevi yok. Bir kategori daha seç.';
        }
      }
      return null;
    },

    async start(ctx, settings) {
      const players = ctx.players();
      const connected = players.filter((p) => p.connected);
      if (connected.length < MIN_PLAYERS) throw new GameError('Şişe çevirmek için en az 2 kişi gerekli. Bir arkadaşını davet et.');
      const seats = shuffle(
        players.map((p) => p.id),
        rnd,
      );
      const scores: Record<string, PlayerScore> = {};
      for (const id of seats) scores[id] = emptyScore();
      const firstSpinner = ctx.hostId() && connected.some((p) => p.id === ctx.hostId()) ? ctx.hostId() : connected[0]!.id;
      const state: BottleState = {
        settings,
        clock: () => ctx.now(),
        seats,
        phase: 'spin',
        round: 1,
        turnNumber: 0,
        totalRounds: settings.rounds === 0 ? null : settings.rounds,
        spinnerId: firstSpinner,
        targetId: null,
        spin: null,
        restDeg: rnd() * 360,
        kind: null,
        prompt: null,
        scores,
        passesUsed: {},
        recentTargets: [],
        voters: [],
        votes: {},
        voteEndsAt: 0,
        lastResult: null,
        piles: { truth: [], dare: [] },
        used: new Set(),
        cancelTimer: null,
      };
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      if (state.phase === 'podium') throw new GameError('Oyun bitti.');
      if (!expectRound(state, action.round)) return { ok: true, stale: true };

      switch (action.type) {
        case 'spin': {
          if (state.phase !== 'spin') {
            if (passed(state, 'spin')) return { ok: true, stale: true };
            throw new GameError('Şu anda şişe çevrilemez.');
          }
          if (playerId !== state.spinnerId && !isHost) throw new GameError('Şişeyi sırası gelen çevirir.');
          startSpin(ctx, state);
          return { ok: true };
        }
        case 'choose': {
          if (state.phase !== 'choose') {
            if (passed(state, 'choose')) return { ok: true, stale: true };
            throw new GameError('Şişe henüz durmadı.');
          }
          if (playerId !== state.targetId) throw new GameError('Doğruluk ya da cesareti şişenin gösterdiği kişi seçer.');
          choose(ctx, state, action.kind);
          return { ok: true };
        }
        case 'done': {
          if (state.phase !== 'task') {
            if (passed(state, 'task')) return { ok: true, stale: true };
            throw new GameError('Henüz bir soru ya da görev yok.');
          }
          if (playerId !== state.targetId) throw new GameError('“Yaptım” diyebilen yalnızca şişenin gösterdiği kişi.');
          if (state.settings.vote) {
            const on = online(ctx);
            const voters = state.seats.filter((id) => id !== state.targetId && on.has(id));
            if (voters.length) {
              state.phase = 'vote';
              state.voters = voters;
              state.votes = {};
              state.voteEndsAt = ctx.now() + timing.voteMs;
              setTimer(ctx, state, timing.voteMs, () => resolveVote(ctx, state));
              ctx.pushViews();
              return { ok: true };
            }
          }
          finishTurn(ctx, state, 'done');
          return { ok: true };
        }
        case 'pass': {
          if (state.phase !== 'task' && state.phase !== 'choose') {
            if (passed(state, 'task')) return { ok: true, stale: true };
            throw new GameError('Henüz bir soru ya da görev yok.');
          }
          if (state.phase === 'choose') throw new GameError('Önce doğruluk ya da cesaret seç.');
          if (playerId !== state.targetId) throw new GameError('Pas yalnızca şişenin gösterdiği kişi geçebilir.');
          const left = passesLeft(state, playerId);
          if (left !== null && left <= 0) throw new GameError('Pas hakkın bitti. Bu sefer cevaplaman ya da yapman gerek.');
          finishTurn(ctx, state, 'pass');
          return { ok: true };
        }
        case 'vote': {
          if (state.phase !== 'vote') {
            if (passed(state, 'vote')) return { ok: true, stale: true };
            throw new GameError('Şu anda oylama yok.');
          }
          if (!state.voters.includes(playerId)) {
            throw new GameError(playerId === state.targetId ? 'Kendine oy veremezsin.' : 'Bu oylamaya katılamazsın; sıradakini bekle.');
          }
          state.votes[playerId] = action.yes;
          maybeCloseVote(ctx, state);
          return { ok: true };
        }
        case 'skipSpinner': {
          if (!isHost) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
          if (state.phase !== 'spin') return { ok: true, stale: true };
          beginSpinPhase(ctx, state, nextSeat(ctx, state, state.spinnerId));
          return { ok: true };
        }
        case 'skipTurn': {
          if (!isHost) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
          if (state.phase !== 'choose' && state.phase !== 'task' && state.phase !== 'vote') return { ok: true, stale: true };
          finishTurn(ctx, state, 'skipped');
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!state.seats.includes(playerId)) state.seats.push(playerId);
      ensureScore(state, playerId);
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      const wasSpinner = state.spinnerId === playerId;
      const wasTarget = state.targetId === playerId;
      // Sıra hesabı için çıkan kişiden sonraki oyuncuyu koltuktan çıkarmadan önce bul.
      const after = state.seats.length > 1 ? nextSeat(ctx, state, playerId) : null;
      // Koltuklar yalnızca çevirme beklenirken değişir; aksi halde şişenin gösterdiği yer kayardı.
      if (state.phase === 'spin') state.seats = state.seats.filter((id) => id !== playerId);
      state.voters = state.voters.filter((id) => id !== playerId);
      delete state.votes[playerId];

      if (state.phase === 'spin' && wasSpinner && after && after !== playerId) return beginSpinPhase(ctx, state, after);
      if ((state.phase === 'choose' || state.phase === 'task' || state.phase === 'vote') && wasTarget) {
        state.spinnerId = state.seats.includes(state.spinnerId) ? state.spinnerId : (after ?? state.spinnerId);
        return finishTurn(ctx, state, 'skipped');
      }
      if (state.phase === 'vote') return maybeCloseVote(ctx, state);
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      if (settings.categories.join() !== state.settings.categories.join()) state.piles = { truth: [], dare: [] };
      state.settings = settings;
      state.totalRounds = settings.rounds === 0 ? null : Math.max(settings.rounds, state.turnNumber + 1);
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): BottleView {
      const revealed = state.phase === 'choose' || state.phase === 'task' || state.phase === 'vote';
      const targetId = revealed ? state.targetId : null;
      return {
        phase: state.phase,
        seats: state.seats,
        round: state.round,
        turnNumber: state.turnNumber,
        totalRounds: state.totalRounds,
        spinnerId: state.spinnerId,
        targetId,
        spin: state.spin,
        restDeg: state.phase === 'spinning' ? (state.spin?.fromDeg ?? state.restDeg) : state.restDeg,
        kind: revealed ? state.kind : null,
        prompt: revealed && state.prompt ? { id: state.prompt.id, text: state.prompt.text, category: state.prompt.category } : null,
        scores: state.scores,
        passesLeft: targetId ? passesLeft(state, targetId) : null,
        vote:
          state.phase === 'vote'
            ? {
                yes: Object.values(state.votes).filter(Boolean).length,
                no: Object.values(state.votes).filter((v) => !v).length,
                voters: state.voters.length,
                myVote: playerId in state.votes ? state.votes[playerId]! : null,
                canVote: state.voters.includes(playerId),
                endsAt: state.voteEndsAt,
              }
            : null,
        lastResult: state.lastResult,
        serverNow: state.clock(),
        choice: state.settings.choice,
        passPenalty: state.settings.passPenalty,
      };
    },

    dispose(state) {
      clearTimer(state);
    },
  };
}
