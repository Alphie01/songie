import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type MostLikelyAction,
  type MostLikelyPhase,
  type MostLikelySettings,
  type MostLikelyView,
  type Person,
  type Prompt,
  type RoundResult,
  type TitleEntry,
} from '../shared/index.js';
import type { PromptPool } from './prompts.js';

export class GameError extends UserFacingError {}

export interface MostLikelyTiming {
  /** Oyun bittikten sonra podyumun ekranda kalma süresi. */
  podiumMs: number;
  /** Bağlantısı kopan oyuncuyu beklememek için periyodik "herkes oy verdi mi" kontrolü. */
  watchMs: number;
}

export const PODIUM_MS = 10_000;
export const WATCH_MS = 2_000;

interface Participant {
  id: string;
  nick: string;
  avatar: { shape: string; color: string };
  present: boolean;
}

interface Round {
  n: number;
  prompt: Prompt;
  /** voter → target. Sunucuda kalır; isimsiz modda hiçbir görünüme girmez. */
  votes: Record<string, string>;
  /** guesser → tahmin edilen kazanan. */
  guesses: Record<string, string>;
  /** Tur başında sabitlenen kurallar. */
  selfVote: boolean;
  anonymous: boolean;
  predict: boolean;
  seconds: number;
  endsAt: number;
  result: RoundResult | null;
}

export interface MostLikelyState {
  ctx: GameContext;
  settings: MostLikelySettings;
  people: Participant[];
  phase: MostLikelyPhase;
  totalRounds: number | null;
  round: Round;
  pile: Prompt[];
  used: Set<string>;
  history: TitleEntry[];
  guessScores: Record<string, number>;
  /** En az bir turda tahmin modu açıktı. */
  predictUsed: boolean;
  timers: (() => void)[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const totalFor = (rounds: number): number | null => (rounds === 0 ? null : rounds);

export function createMostLikelyGame(deps: {
  pool: PromptPool;
  timing?: Partial<MostLikelyTiming>;
}): ServerGame<MostLikelySettings, MostLikelyState, MostLikelyAction> {
  const { pool } = deps;
  const timing: MostLikelyTiming = { podiumMs: PODIUM_MS, watchMs: WATCH_MS, ...deps.timing };

  function clearTimers(state: MostLikelyState): void {
    for (const cancel of state.timers.splice(0)) cancel();
  }

  function draw(state: MostLikelyState): Prompt {
    if (!state.pile.length) {
      const all = pool.prompts(state.settings.categories);
      if (!all.length) throw new GameError('Seçili kategorilerde soru yok. Başka kategori seç.');
      let fresh = all.filter((p) => !state.used.has(p.id));
      if (!fresh.length) {
        state.used.clear();
        fresh = all;
      }
      state.pile = shuffle(fresh);
    }
    const p = state.pile.shift()!;
    state.used.add(p.id);
    return p;
  }

  function presentIds(state: MostLikelyState): string[] {
    return state.people.filter((p) => p.present).map((p) => p.id);
  }

  function connectedSet(ctx: GameContext): Set<string> {
    return new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  }

  function isDone(round: Round, id: string): boolean {
    return round.votes[id] !== undefined && (!round.predict || round.guesses[id] !== undefined);
  }

  /** Beklenen oyuncular: odada, bağlı ve henüz bitirmemiş. Kopanlar beklenmez. */
  function waitingFor(state: MostLikelyState): string[] {
    const online = connectedSet(state.ctx);
    return presentIds(state).filter((id) => online.has(id) && !isDone(state.round, id));
  }

  function makeRound(state: MostLikelyState, n: number): Round {
    const s = state.settings;
    const now = state.ctx.now();
    if (s.predict) state.predictUsed = true;
    return {
      n,
      prompt: draw(state),
      votes: {},
      guesses: {},
      selfVote: s.selfVote,
      anonymous: s.anonymous,
      predict: s.predict,
      seconds: s.seconds,
      endsAt: s.seconds > 0 ? now + s.seconds * 1000 : 0,
      result: null,
    };
  }

  function beginRound(ctx: GameContext, state: MostLikelyState, round: Round): void {
    clearTimers(state);
    state.round = round;
    state.phase = 'vote';
    if (round.seconds > 0) state.timers.push(ctx.schedule(round.seconds * 1000, () => reveal(ctx, state)));
    const watch = () => {
      if (state.phase !== 'vote' || state.round !== round) return;
      if (maybeReveal(ctx, state)) return;
      state.timers.push(ctx.schedule(timing.watchMs, watch));
    };
    state.timers.push(ctx.schedule(timing.watchMs, watch));
    ctx.pushViews();
  }

  /** Herkes oy verdiyse sonuçları açar. */
  function maybeReveal(ctx: GameContext, state: MostLikelyState): boolean {
    if (state.phase !== 'vote') return false;
    if (!Object.keys(state.round.votes).length) return false;
    if (waitingFor(state).length) return false;
    reveal(ctx, state);
    return true;
  }

  function reveal(ctx: GameContext, state: MostLikelyState): void {
    if (state.phase !== 'vote') return;
    clearTimers(state);
    const round = state.round;
    const tally = new Map<string, number>();
    for (const target of Object.values(round.votes)) tally.set(target, (tally.get(target) ?? 0) + 1);
    const counts = [...tally].map(([id, votes]) => ({ id, votes })).sort((a, b) => b.votes - a.votes);
    const max = counts[0]?.votes ?? 0;
    const winners = max > 0 ? counts.filter((c) => c.votes === max).map((c) => c.id) : [];
    let correctGuessers: string[] | null = null;
    if (round.predict) {
      correctGuessers = Object.entries(round.guesses)
        .filter(([, target]) => winners.includes(target))
        .map(([id]) => id);
      for (const id of correctGuessers) state.guessScores[id] = (state.guessScores[id] ?? 0) + 1;
    }
    round.result = {
      counts,
      winners,
      total: Object.keys(round.votes).length,
      ballots: round.anonymous ? null : Object.entries(round.votes).map(([voter, target]) => ({ voter, target })),
      correctGuessers,
    };
    if (winners.length) state.history.push({ round: round.n, text: round.prompt.text, winners, votes: max });
    state.phase = 'reveal';
    ctx.pushViews();
  }

  function results(state: MostLikelyState): GameResult[] {
    return state.people
      .filter((p) => p.present)
      .map((p) => {
        const titles = state.history.filter((h) => h.winners.includes(p.id)).map((h) => h.text);
        const guessPoints = state.guessScores[p.id] ?? 0;
        return {
          playerId: p.id,
          score: state.predictUsed ? guessPoints : titles.length,
          meta: { titles, titleCount: titles.length, guessPoints },
        };
      });
  }

  function podium(ctx: GameContext, state: MostLikelyState): void {
    if (state.phase === 'podium') return;
    clearTimers(state);
    state.phase = 'podium';
    ctx.pushViews();
    state.timers.push(ctx.schedule(timing.podiumMs, () => ctx.finish(results(state))));
  }

  function addPerson(state: MostLikelyState, id: string): void {
    const rp = state.ctx.players().find((p) => p.id === id);
    const existing = state.people.find((p) => p.id === id);
    if (existing) {
      existing.present = true;
      if (rp) {
        existing.nick = rp.nick;
        existing.avatar = rp.avatar;
      }
      return;
    }
    state.people.push({ id, nick: rp?.nick ?? id, avatar: rp?.avatar ?? { shape: 'circle', color: 'mint' }, present: true });
  }

  function checkCurrent(state: MostLikelyState, action: { round: number; promptId?: string }): boolean {
    if (action.round !== state.round.n) return false;
    if (action.promptId !== undefined && action.promptId !== state.round.prompt.id) return false;
    return true;
  }

  function requireHost(ctx: GameContext, playerId: string): void {
    if (ctx.hostId() !== playerId) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
  }

  function requirePlayer(state: MostLikelyState, playerId: string): void {
    if (!state.people.some((p) => p.id === playerId && p.present)) throw new GameError('Bu oyunda oyuncu değilsin.');
  }

  function requireTarget(state: MostLikelyState, target: string): void {
    if (!state.people.some((p) => p.id === target && p.present)) throw new GameError('Bu oyuncu artık odada değil. Başka birini seç.');
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (!pool.prompts(settings.categories).length) return 'Seçili kategorilerde soru yok. Başka kategori seç ya da soru ekle.';
      return null;
    },

    async start(ctx, settings) {
      const connected = ctx.players().filter((p) => p.connected);
      if (connected.length < MIN_PLAYERS) throw new GameError(`Başlamak için en az ${MIN_PLAYERS} oyuncu gerekiyor.`);
      const state: MostLikelyState = {
        ctx,
        settings,
        people: connected.map((p) => ({ id: p.id, nick: p.nick, avatar: p.avatar, present: true })),
        phase: 'vote',
        totalRounds: totalFor(settings.rounds),
        round: null as unknown as Round,
        pile: [],
        used: new Set(),
        history: [],
        guessScores: {},
        predictUsed: false,
        timers: [],
      };
      beginRound(ctx, state, makeRound(state, 1));
      return state;
    },

    onAction(ctx, state, playerId, action) {
      switch (action.type) {
        case 'vote':
        case 'guess': {
          requirePlayer(state, playerId);
          if (!checkCurrent(state, action) || state.phase !== 'vote') return { ok: true, stale: true };
          requireTarget(state, action.target);
          const round = state.round;
          if (action.type === 'vote') {
            if (!round.selfVote && action.target === playerId) throw new GameError('Bu oyunda kendine oy veremezsin. Başka birini seç.');
            round.votes[playerId] = action.target;
          } else {
            if (!round.predict) throw new GameError('Bu turda tahmin kapalı.');
            round.guesses[playerId] = action.target;
          }
          if (!maybeReveal(ctx, state)) ctx.pushViews();
          return { ok: true };
        }
        case 'skip': {
          requireHost(ctx, playerId);
          if (!checkCurrent(state, action) || state.phase !== 'vote') return { ok: true, stale: true };
          beginRound(ctx, state, makeRound(state, state.round.n));
          return { ok: true };
        }
        case 'reveal': {
          requireHost(ctx, playerId);
          if (!checkCurrent(state, action) || state.phase !== 'vote') return { ok: true, stale: true };
          if (!Object.keys(state.round.votes).length) throw new GameError('Henüz kimse oy vermedi. Biraz bekle ya da soruyu atla.');
          reveal(ctx, state);
          return { ok: true };
        }
        case 'next': {
          requireHost(ctx, playerId);
          if (action.round !== state.round.n || state.phase !== 'reveal') return { ok: true, stale: true };
          if (state.totalRounds !== null && state.round.n >= state.totalRounds) {
            podium(ctx, state);
          } else {
            beginRound(ctx, state, makeRound(state, state.round.n + 1));
          }
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (state.phase === 'podium') return;
      addPerson(state, playerId);
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      const p = state.people.find((x) => x.id === playerId);
      if (p) p.present = false;
      if (state.phase === 'vote') {
        const r = state.round;
        delete r.votes[playerId];
        delete r.guesses[playerId];
        // Gidene verilen oylar ve tahminler düşer; o kişiler yeniden seçer.
        for (const [voter, target] of Object.entries(r.votes)) if (target === playerId) delete r.votes[voter];
        for (const [guesser, target] of Object.entries(r.guesses)) if (target === playerId) delete r.guesses[guesser];
        if (maybeReveal(ctx, state)) return;
      }
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      const categoriesChanged = settings.categories.join() !== state.settings.categories.join();
      state.settings = settings;
      if (categoriesChanged) state.pile = [];
      const total = totalFor(settings.rounds);
      state.totalRounds = total === null ? null : Math.max(total, state.round.n);
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): MostLikelyView {
      const round = state.round;
      const online = connectedSet(state.ctx);
      const people: Person[] = state.people.map((p) => ({ ...p, connected: p.present && online.has(p.id) }));
      return {
        phase: state.phase,
        round: round.n,
        totalRounds: state.totalRounds,
        prompt: round.prompt,
        people,
        selfVote: round.selfVote,
        anonymous: round.anonymous,
        predict: round.predict,
        voted: Object.keys(round.votes),
        guessed: Object.keys(round.guesses),
        waitingFor: state.phase === 'vote' ? waitingFor(state) : [],
        myVote: round.votes[playerId] ?? null,
        myGuess: round.guesses[playerId] ?? null,
        serverNow: state.ctx.now(),
        endsAt: state.phase === 'vote' ? round.endsAt : 0,
        durationMs: round.seconds * 1000,
        result: state.phase === 'vote' ? null : round.result,
        history: state.history,
        guessScores: state.guessScores,
      };
    },

    dispose(state) {
      clearTimers(state);
    },
  };
}
