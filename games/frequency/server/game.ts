import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  DIAL_MAX,
  DIAL_MIN,
  DIAL_START,
  BULLSEYE,
  GAME_ID,
  MIN_TEAM,
  SIDE_SECONDS,
  TARGET_MAX,
  TARGET_MIN,
  actionSchema,
  defaultSettings,
  ratingFor,
  scoreFor,
  settingsSchema,
  sideOf,
  type Card,
  type FrequencyAction,
  type FrequencySettings,
  type FrequencyView,
  type Mode,
  type Phase,
  type Role,
  type RoundSummary,
  type TeamId,
} from '../shared/index.js';
import type { Deck } from './deck.js';

export class GameError extends UserFacingError {}

export interface FrequencyTiming {
  /** Kadran güncellemelerinin en sık yayın aralığı (~10/sn). */
  dialPushMs: number;
  /** Oyun bitince açıklama ekranında beklenip podyuma geçilir. */
  finalRevealMs: number;
  podiumMs: number;
}

export const DEFAULT_TIMING: FrequencyTiming = { dialPushMs: 100, finalRevealMs: 9000, podiumMs: 9000 };

const HISTORY = 12;

interface Round {
  id: number;
  team: TeamId;
  psychicId: string;
  options: Card[];
  card: Card | null;
  target: number;
  clue: string | null;
  dial: number;
  dialBy: string | null;
  votes: string[];
  side: 'left' | 'right' | null;
  sideBy: string | null;
  endsAt: number;
  durationMs: number;
}

export interface FrequencyState {
  settings: FrequencySettings;
  mode: Mode;
  teams: Record<TeamId, string[]>;
  scores: Record<TeamId, number>;
  phase: Phase;
  round: Round | null;
  roundSeq: number;
  completed: number;
  /** Birlikte modunda yetişme kuralıyla kazanılan ek turlar. */
  bonusRounds: number;
  nextTeam: TeamId;
  psychicIdx: Record<TeamId, number>;
  pile: Card[];
  used: Set<string>;
  history: RoundSummary[];
  result: RoundSummary | null;
  winner: FrequencyView['winner'];
  clock: () => number;
  cancelTimer: (() => void) | null;
  cancelPush: (() => void) | null;
  lastPushAt: number;
  ctx: GameContext;
}

const other = (t: TeamId): TeamId => (t === 'a' ? 'b' : 'a');

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Ayarlardaki takımlar + takımı seçilmemiş oyuncular (küçük takıma). */
export function buildTeams(settings: FrequencySettings, playerIds: string[], rnd: () => number = Math.random): Record<TeamId, string[]> {
  if (settings.mode === 'coop') return { a: [...playerIds], b: [] };
  const present = new Set(playerIds);
  const teams: Record<TeamId, string[]> = {
    a: settings.teams.a.filter((id) => present.has(id)),
    b: settings.teams.b.filter((id) => present.has(id) && !settings.teams.a.includes(id)),
  };
  for (const id of shuffle(playerIds.filter((id) => !teams.a.includes(id) && !teams.b.includes(id)), rnd)) {
    (teams.a.length <= teams.b.length ? teams.a : teams.b).push(id);
  }
  return teams;
}

export function createFrequencyGame(deps: {
  deck: Deck;
  timing?: Partial<FrequencyTiming>;
  /** Testler için: hedef ve karıştırma. */
  random?: () => number;
}): ServerGame<FrequencySettings, FrequencyState, FrequencyAction> {
  const { deck } = deps;
  const timing: FrequencyTiming = { ...DEFAULT_TIMING, ...deps.timing };
  const rnd = deps.random ?? Math.random;

  function teamOf(state: FrequencyState, id: string): TeamId | null {
    if (state.teams.a.includes(id)) return 'a';
    if (state.teams.b.includes(id)) return 'b';
    return null;
  }

  function online(ctx: GameContext): Set<string> {
    return new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  }

  function roleOf(state: FrequencyState, id: string): Role {
    const r = state.round;
    if (r && r.psychicId === id) return 'psychic';
    const mine = teamOf(state, id);
    if (!mine) return 'spectator';
    if (state.mode === 'coop') return 'dialer';
    return mine === (r?.team ?? state.nextTeam) ? 'dialer' : 'opponent';
  }

  /** Kadranı çevirebilecekler: medyumun takımı, medyum hariç, bağlı olanlar. */
  function dialers(ctx: GameContext, state: FrequencyState): string[] {
    const r = state.round;
    if (!r) return [];
    const on = online(ctx);
    return state.teams[r.team].filter((id) => id !== r.psychicId && on.has(id));
  }

  function votesNeeded(ctx: GameContext, state: FrequencyState): number {
    if (!state.settings.majorityLock) return 1;
    return Math.floor(dialers(ctx, state).length / 2) + 1;
  }

  /** Takımın sıradaki medyumu; bağlantısı olmayanlar atlanır. */
  function psychicFor(ctx: GameContext, state: FrequencyState, team: TeamId): string {
    const list = state.teams[team];
    const on = online(ctx);
    for (let k = 0; k < list.length; k++) {
      const i = (state.psychicIdx[team] + k) % list.length;
      if (on.has(list[i]!)) {
        state.psychicIdx[team] = i;
        return list[i]!;
      }
    }
    return list[state.psychicIdx[team] % list.length]!;
  }

  function draw(state: FrequencyState): Card {
    if (!state.pile.length) {
      const all = deck.cards(state.settings.friendCards);
      let fresh = all.filter((c) => !state.used.has(c.id));
      if (!fresh.length) {
        state.used.clear();
        fresh = all;
      }
      state.pile = shuffle(fresh, rnd);
    }
    const card = state.pile.shift()!;
    state.used.add(card.id);
    return card;
  }

  function push(ctx: GameContext, state: FrequencyState): void {
    state.cancelPush?.();
    state.cancelPush = null;
    state.lastPushAt = ctx.now();
    ctx.pushViews();
  }

  /** Kadran hareketleri birleştirilir: en fazla `dialPushMs`'de bir yayın. */
  function pushDial(ctx: GameContext, state: FrequencyState): void {
    if (state.cancelPush) return;
    const wait = state.lastPushAt + timing.dialPushMs - ctx.now();
    if (wait <= 0) return push(ctx, state);
    state.cancelPush = ctx.schedule(wait, () => {
      state.cancelPush = null;
      push(ctx, state);
    });
  }

  function clearTimer(state: FrequencyState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
  }

  function beginRound(ctx: GameContext, state: FrequencyState): void {
    clearTimer(state);
    const team = state.mode === 'coop' ? 'a' : state.nextTeam;
    const psychicId = psychicFor(ctx, state, team);
    const span = TARGET_MAX - TARGET_MIN;
    const target = TARGET_MIN + Math.floor(rnd() * (span + 1));
    const choice = state.settings.cardChoice;
    const options = choice ? [draw(state), draw(state)] : [];
    state.round = {
      id: ++state.roundSeq,
      team,
      psychicId,
      options,
      card: choice ? null : draw(state),
      target: Math.min(TARGET_MAX, target),
      clue: null,
      dial: DIAL_START,
      dialBy: null,
      votes: [],
      side: null,
      sideBy: null,
      endsAt: 0,
      durationMs: 0,
    };
    state.result = null;
    state.phase = choice ? 'pick' : 'clue';
    push(ctx, state);
  }

  function startDial(ctx: GameContext, state: FrequencyState): void {
    const r = state.round!;
    state.phase = 'dial';
    const secs = state.settings.seconds;
    if (secs > 0) {
      r.durationMs = secs * 1000;
      r.endsAt = ctx.now() + r.durationMs;
      state.cancelTimer = ctx.schedule(r.durationMs, () => {
        state.cancelTimer = null;
        if (state.phase === 'dial' && state.round === r) lockDial(ctx, state);
      });
    }
    push(ctx, state);
  }

  function lockDial(ctx: GameContext, state: FrequencyState): void {
    clearTimer(state);
    const r = state.round!;
    r.votes = [];
    r.endsAt = 0;
    r.durationMs = 0;
    if (state.mode === 'teams') {
      const on = online(ctx);
      const opponents = state.teams[other(r.team)].filter((id) => on.has(id));
      if (opponents.length) {
        state.phase = 'side';
        if (state.settings.seconds > 0) {
          r.durationMs = SIDE_SECONDS * 1000;
          r.endsAt = ctx.now() + r.durationMs;
          state.cancelTimer = ctx.schedule(r.durationMs, () => {
            state.cancelTimer = null;
            if (state.phase === 'side' && state.round === r) reveal(ctx, state);
          });
        }
        push(ctx, state);
        return;
      }
    }
    reveal(ctx, state);
  }

  function reveal(ctx: GameContext, state: FrequencyState): void {
    clearTimer(state);
    const r = state.round!;
    r.endsAt = 0;
    const points = scoreFor(r.dial, r.target);
    state.scores[r.team] += points;
    let sidePoint: boolean | null = null;
    if (state.mode === 'teams' && r.side) {
      // Tam isabette (4 puan) rakip tahmini puan getirmez.
      sidePoint = points !== BULLSEYE && sideOf(r.dial, r.target) === r.side;
      if (sidePoint) state.scores[other(r.team)] += 1;
    }
    let again = false;
    if (state.settings.catchUp && points === BULLSEYE) {
      if (state.mode === 'coop') {
        again = true;
        state.bonusRounds++;
      } else if (state.scores[r.team] < state.scores[other(r.team)]) {
        again = true;
      }
    }
    const summary: RoundSummary = {
      id: r.id,
      team: r.team,
      psychicId: r.psychicId,
      card: r.card!,
      clue: r.clue,
      target: r.target,
      dial: r.dial,
      points,
      side: r.side,
      sidePoint,
      again,
    };
    state.result = summary;
    state.history = [summary, ...state.history].slice(0, HISTORY);
    state.completed++;
    state.psychicIdx[r.team]++;
    if (state.mode === 'teams') state.nextTeam = again ? r.team : other(r.team);
    state.phase = 'reveal';

    state.winner = checkWinner(state);
    if (state.winner) state.cancelTimer = ctx.schedule(timing.finalRevealMs, () => podium(ctx, state));
    push(ctx, state);
  }

  function totalRounds(state: FrequencyState): number {
    return state.settings.rounds + state.bonusRounds;
  }

  function checkWinner(state: FrequencyState): FrequencyView['winner'] {
    if (state.mode === 'coop') return state.completed >= totalRounds(state) ? 'coop' : null;
    const t = state.settings.targetScore;
    const { a, b } = state.scores;
    if (a < t && b < t) return null;
    // İkisi birden aynı puanla hedefe ulaştıysa bir tur daha.
    if (a === b) return null;
    return a > b ? 'a' : 'b';
  }

  function podium(ctx: GameContext, state: FrequencyState): void {
    if (state.phase === 'podium') return;
    clearTimer(state);
    state.cancelPush?.();
    state.cancelPush = null;
    // Yarım kalan turun hedefi açıklanmaz.
    if (state.phase !== 'reveal') state.round = null;
    if (!state.winner) {
      if (state.mode === 'coop') state.winner = 'coop';
      else state.winner = state.scores.a === state.scores.b ? 'draw' : state.scores.a > state.scores.b ? 'a' : 'b';
    }
    state.phase = 'podium';
    push(ctx, state);
    state.cancelTimer = ctx.schedule(timing.podiumMs, () => {
      state.cancelTimer = null;
      if (state.mode === 'coop') {
        const rating = ratingFor(state.scores.a, Math.max(state.settings.rounds, state.completed));
        ctx.finish(state.teams.a.map((id) => ({ playerId: id, score: state.scores.a, meta: { mode: 'coop', rating } })));
        return;
      }
      ctx.finish(
        (['a', 'b'] as TeamId[]).flatMap((team) =>
          state.teams[team].map((id) => ({
            playerId: id,
            score: state.scores[team],
            meta: { team, won: state.winner === team },
          })),
        ),
      );
    });
  }

  function requireRound(state: FrequencyState, roundId: number, phase: Phase | Phase[]): Round | null {
    const r = state.round;
    if (!r || r.id !== roundId) return null;
    const phases = Array.isArray(phase) ? phase : [phase];
    if (!phases.includes(state.phase)) return null;
    return r;
  }

  return {
    id: GAME_ID,
    minPlayers: 2,
    maxPlayers: 16,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (!deck.cards(settings.friendCards).length) return 'Destede kart yok. Önce bir spektrum kartı ekle.';
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      const teams = buildTeams(settings, ids, rnd);
      if (settings.mode === 'teams' && (teams.a.length < MIN_TEAM || teams.b.length < MIN_TEAM)) {
        throw new GameError(`Takımlı modda her takımda en az ${MIN_TEAM} kişi olmalı. Lobiden takımları düzenle ya da “Birlikte” modunu seç.`);
      }
      if (settings.mode === 'coop' && teams.a.length < 2) {
        throw new GameError('En az 2 oyuncu gerekiyor.');
      }
      const state: FrequencyState = {
        settings,
        mode: settings.mode,
        teams,
        scores: { a: 0, b: 0 },
        phase: 'pick',
        round: null,
        roundSeq: 0,
        completed: 0,
        bonusRounds: 0,
        nextTeam: 'a',
        psychicIdx: { a: 0, b: 0 },
        pile: [],
        used: new Set(),
        history: [],
        result: null,
        winner: null,
        clock: () => ctx.now(),
        cancelTimer: null,
        cancelPush: null,
        lastPushAt: 0,
        ctx,
      };
      beginRound(ctx, state);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      if (state.phase === 'podium') return { ok: true, stale: true };

      switch (action.type) {
        case 'pick': {
          const r = requireRound(state, action.round, 'pick');
          if (!r) return { ok: true, stale: true };
          if (playerId !== r.psychicId) throw new GameError('Kartı medyum seçer.');
          const card = r.options.find((c) => c.id === action.cardId);
          if (!card) throw new GameError('Bu kart seçeneklerde yok. İki karttan birini seç.');
          // Seçilmeyen kart desteye geri döner.
          for (const c of r.options) {
            if (c.id !== card.id) {
              state.used.delete(c.id);
              state.pile.push(c);
            }
          }
          r.card = card;
          r.options = [];
          state.phase = 'clue';
          push(ctx, state);
          return { ok: true };
        }
        case 'clue': {
          const r = requireRound(state, action.round, 'clue');
          if (!r) return { ok: true, stale: true };
          if (playerId !== r.psychicId) throw new GameError('İpucunu medyum verir.');
          const text = action.text.trim().replace(/\s+/g, ' ');
          r.clue = text || null;
          startDial(ctx, state);
          return { ok: true };
        }
        case 'dial': {
          const r = requireRound(state, action.round, 'dial');
          if (!r) return { ok: true, stale: true };
          if (playerId === r.psychicId) throw new GameError('Medyum kadrana dokunamaz; takımını izle.');
          if (teamOf(state, playerId) !== r.team) throw new GameError('Kadranı medyumun takımı çevirir.');
          const value = Math.round(Math.min(DIAL_MAX, Math.max(DIAL_MIN, action.value)) * 10) / 10;
          if (value === r.dial) return { ok: true };
          r.dial = value;
          r.dialBy = playerId;
          // Kadran oynadıysa eski onaylar geçersiz.
          r.votes = [];
          pushDial(ctx, state);
          return { ok: true };
        }
        case 'lock': {
          const r = requireRound(state, action.round, 'dial');
          if (!r) return { ok: true, stale: true };
          if (playerId === r.psychicId) throw new GameError('Kilitlemeye medyum karışamaz.');
          if (teamOf(state, playerId) !== r.team) throw new GameError('Kadranı medyumun takımı kilitler.');
          if (!r.votes.includes(playerId)) r.votes.push(playerId);
          const on = new Set(dialers(ctx, state));
          const valid = r.votes.filter((id) => on.has(id) || id === playerId);
          if (valid.length >= votesNeeded(ctx, state)) lockDial(ctx, state);
          else push(ctx, state);
          return { ok: true };
        }
        case 'unlock': {
          const r = requireRound(state, action.round, 'dial');
          if (!r) return { ok: true, stale: true };
          r.votes = r.votes.filter((id) => id !== playerId);
          push(ctx, state);
          return { ok: true };
        }
        case 'side': {
          const r = requireRound(state, action.round, 'side');
          if (!r) return { ok: true, stale: true };
          const mine = teamOf(state, playerId);
          if (!mine || mine === r.team) throw new GameError('“Sağda mı, solda mı?” tahminini rakip takım yapar.');
          r.side = action.side;
          r.sideBy = playerId;
          reveal(ctx, state);
          return { ok: true };
        }
        case 'next': {
          const r = requireRound(state, action.round, 'reveal');
          if (!r) return { ok: true, stale: true };
          if (!teamOf(state, playerId) && !isHost) throw new GameError('Sıradaki turu oyuncular başlatır.');
          if (state.winner) podium(ctx, state);
          else beginRound(ctx, state);
          return { ok: true };
        }
        case 'skipPsychic': {
          const r = requireRound(state, action.round, ['pick', 'clue', 'dial', 'side']);
          if (!r) return { ok: true, stale: true };
          if (!isHost) throw new GameError('Medyumu yalnızca oda sahibi atlayabilir.');
          // Tur puansız iptal; kartlar desteye döner, aynı takımın sıradaki medyumu oynar.
          for (const c of [...r.options, ...(r.card ? [r.card] : [])]) state.used.delete(c.id);
          state.psychicIdx[r.team]++;
          if (state.mode === 'teams') state.nextTeam = r.team;
          beginRound(ctx, state);
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!teamOf(state, playerId)) {
        if (state.mode === 'coop') state.teams.a.push(playerId);
        else (state.teams.a.length <= state.teams.b.length ? state.teams.a : state.teams.b).push(playerId);
      }
      push(ctx, state);
    },

    onPlayerLeave(ctx, state, playerId) {
      const r = state.round;
      if (r && r.votes.includes(playerId)) r.votes = r.votes.filter((id) => id !== playerId);
      // Medyum ipucunu vermeden ayrıldıysa tur aynı takımın sıradaki medyumuyla yeniden başlar.
      if (r && r.psychicId === playerId && (state.phase === 'pick' || state.phase === 'clue')) {
        const team = r.team;
        const i = state.teams[team].indexOf(playerId);
        for (const c of [...r.options, ...(r.card ? [r.card] : [])]) state.used.delete(c.id);
        if (i >= 0) state.teams[team].splice(i, 1);
        if (state.teams[team].length) {
          state.psychicIdx[team] = i >= 0 ? i : state.psychicIdx[team];
          if (state.mode === 'teams') state.nextTeam = team;
          beginRound(ctx, state);
          return;
        }
      }
      push(ctx, state);
    },

    onSettings(ctx, state, settings) {
      // Mod ve takımlar oyun sırasında değişmez; diğer ayarlar sıradaki turdan itibaren geçerli.
      const friendsChanged = settings.friendCards !== state.settings.friendCards;
      state.settings = { ...settings, mode: state.mode, teams: state.settings.teams };
      if (friendsChanged) state.pile = [];
      if (state.mode === 'coop' && state.settings.rounds + state.bonusRounds <= state.completed && state.phase !== 'reveal') {
        state.settings.rounds = Math.max(1, state.completed + 1 - state.bonusRounds);
      }
      push(ctx, state);
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): FrequencyView {
      const r = state.round;
      const role = roleOf(state, playerId);
      const revealed = state.phase === 'reveal' || (state.phase === 'podium' && !!r);
      const seesTarget = !!r && (revealed || (role === 'psychic' && state.phase !== 'podium'));
      const lockVotes = r && state.phase === 'dial' ? r.votes : [];
      return {
        phase: state.phase,
        mode: state.mode,
        teams: state.teams,
        scores: state.scores,
        myTeam: teamOf(state, playerId),
        role,
        roundId: r?.id ?? 0,
        completed: state.completed,
        totalRounds: state.mode === 'coop' ? totalRounds(state) : null,
        targetScore: state.mode === 'teams' ? state.settings.targetScore : null,
        team: r?.team ?? state.nextTeam,
        psychicId: r?.psychicId ?? '',
        options: role === 'psychic' && state.phase === 'pick' ? (r?.options ?? null) : null,
        card: r?.card ?? null,
        target: seesTarget ? r!.target : null,
        clue: r?.clue ?? null,
        dial: r?.dial ?? DIAL_START,
        dialBy: r?.dialBy ?? null,
        lockVotes,
        votesNeeded: votesNeeded(state.ctx, state),
        side: r?.side ?? null,
        sideBy: r?.sideBy ?? null,
        result: state.phase === 'reveal' || state.phase === 'podium' ? state.result : null,
        history: state.history,
        winner: state.phase === 'reveal' || state.phase === 'podium' ? state.winner : null,
        rating: state.mode === 'coop' ? ratingFor(state.scores.a, Math.max(state.settings.rounds, state.completed)) : null,
        serverNow: state.clock(),
        endsAt: r?.endsAt ?? 0,
        durationMs: r?.durationMs ?? 0,
      };
    },

    dispose(state) {
      state.cancelTimer?.();
      state.cancelPush?.();
    },
  };
}
