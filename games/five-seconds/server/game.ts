import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type AttemptResult,
  type FiveSecondsAction,
  type FiveSecondsPhase,
  type FiveSecondsSettings,
  type FiveSecondsView,
  type Prompt,
  type TeamId,
} from '../shared/index.js';
import type { PromptBank } from './prompts.js';

export class GameError extends UserFacingError {}

export interface FiveSecondsTiming {
  /** Oylama için en uzun süre; bitince verilen oylar sayılır. */
  voteMs: number;
  podiumMs: number;
  /** Sırası gelen oyuncunun bağlantısı bu kadar kopuk kalırsa sırası atlanır. */
  awayMs: number;
  tickMs: number;
}

export const DEFAULT_TIMING: FiveSecondsTiming = { voteMs: 20_000, podiumMs: 8_000, awayMs: 8_000, tickMs: 1_000 };
const MIN_TEAM = 2;

interface Attempt {
  id: string;
  performerId: string;
  stealFrom: string | null;
  prompt: Prompt | null;
  /** Görev herkese açıldı mı (çalma denemesinde baştan açıktır). */
  revealed: boolean;
  endsAt: number;
  durationMs: number;
  voteEndsAt: number;
  votes: Record<string, boolean>;
}

export interface FiveSecondsState {
  settings: FiveSecondsSettings;
  teamMode: boolean;
  teams: Record<TeamId, string[]> | null;
  order: string[];
  /** Sıranın sahibi (order içindeki konum). Çalma denemesinde değişmez. */
  pos: number;
  round: number;
  totalRounds: number | null;
  scores: Record<string, number>;
  phase: FiveSecondsPhase;
  attempt: Attempt;
  attemptSeq: number;
  lastResult: AttemptResult | null;
  pile: Prompt[];
  used: Set<string>;
  awaySince: number | null;
  cancelTimer: (() => void) | null;
  cancelTick: (() => void) | null;
  /** Görünümde bağlı oyuncuları okumak için (JSON'a girmez). */
  ctx: GameContext;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Ayarlardaki takımlar + takımı seçilmemiş oyuncular (küçük takıma). */
export function buildTeams(settings: FiveSecondsSettings, playerIds: string[]): Record<TeamId, string[]> {
  const present = new Set(playerIds);
  const teams: Record<TeamId, string[]> = {
    a: settings.teams.a.filter((id) => present.has(id)),
    b: settings.teams.b.filter((id) => present.has(id) && !settings.teams.a.includes(id)),
  };
  for (const id of shuffle(playerIds.filter((id) => !teams.a.includes(id) && !teams.b.includes(id)))) {
    (teams.a.length <= teams.b.length ? teams.a : teams.b).push(id);
  }
  return teams;
}

/** Takımlar sırayla oynar: a1, b1, a2, b2… */
function interleave(teams: Record<TeamId, string[]>): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(teams.a.length, teams.b.length); i++) {
    if (teams.a[i]) out.push(teams.a[i]!);
    if (teams.b[i]) out.push(teams.b[i]!);
  }
  return out;
}

export function createFiveSecondsGame(deps: {
  bank: PromptBank;
  timing?: Partial<FiveSecondsTiming>;
}): ServerGame<FiveSecondsSettings, FiveSecondsState, FiveSecondsAction> {
  const { bank } = deps;
  const timing: FiveSecondsTiming = { ...DEFAULT_TIMING, ...deps.timing };

  function online(ctx: GameContext): Set<string> {
    return new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  }

  function teamOf(state: FiveSecondsState, id: string): TeamId | null {
    if (!state.teams) return null;
    if (state.teams.a.includes(id)) return 'a';
    if (state.teams.b.includes(id)) return 'b';
    return null;
  }

  function teamScores(state: FiveSecondsState): Record<TeamId, number> | null {
    if (!state.teams) return null;
    const sum = (ids: string[]) => ids.reduce((n, id) => n + (state.scores[id] ?? 0), 0);
    return { a: sum(state.teams.a), b: sum(state.teams.b) };
  }

  function draw(state: FiveSecondsState): Prompt {
    if (!state.pile.length) {
      const all = bank.prompts(state.settings.categories);
      if (!all.length) throw new GameError('Seçili kategorilerde görev yok. Oda sahibi başka kategori seçmeli.');
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

  function clearTimer(state: FiveSecondsState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
  }

  function newAttempt(ctx: GameContext, state: FiveSecondsState, performerId: string, stealFrom: string | null, prompt: Prompt | null): void {
    clearTimer(state);
    state.attempt = {
      id: `${++state.attemptSeq}`,
      performerId,
      stealFrom,
      prompt,
      revealed: prompt !== null,
      endsAt: 0,
      durationMs: state.settings.seconds * 1000,
      voteEndsAt: 0,
      votes: {},
    };
    state.phase = 'ready';
    state.awaySince = null;
    ctx.pushViews();
  }

  /** Sıradaki bağlı oyuncuya geç; tur sınırı dolduysa podyum. */
  function nextTurn(ctx: GameContext, state: FiveSecondsState): void {
    const on = online(ctx);
    let pos = state.pos;
    let round = state.round;
    let fallback: { pos: number; round: number } | null = null;
    for (let k = 0; k < state.order.length; k++) {
      pos++;
      if (pos >= state.order.length) {
        pos = 0;
        round++;
      }
      if (state.totalRounds !== null && round > state.totalRounds) return podium(ctx, state);
      fallback ??= { pos, round };
      if (on.has(state.order[pos]!)) {
        fallback = { pos, round };
        break;
      }
    }
    // Kimse bağlı değilse bir sonrakine geçilir; bağlanmazsa zamanlayıcı yine atlar.
    state.pos = fallback!.pos;
    state.round = fallback!.round;
    newAttempt(ctx, state, state.order[state.pos]!, null, null);
  }

  function reveal(ctx: GameContext, state: FiveSecondsState): void {
    const a = state.attempt;
    if (!a.prompt) a.prompt = draw(state);
    a.revealed = true;
    a.durationMs = state.settings.seconds * 1000;
    a.endsAt = ctx.now() + a.durationMs;
    a.votes = {};
    state.phase = 'countdown';
    clearTimer(state);
    const id = a.id;
    state.cancelTimer = ctx.schedule(a.durationMs, () => {
      if (state.attempt.id === id && state.phase === 'countdown') startVote(ctx, state);
    });
    ctx.pushViews();
  }

  function voters(ctx: GameContext, state: FiveSecondsState): string[] {
    const on = online(ctx);
    return state.order.filter((id) => id !== state.attempt.performerId && on.has(id));
  }

  function startVote(ctx: GameContext, state: FiveSecondsState): void {
    clearTimer(state);
    state.phase = 'vote';
    state.attempt.voteEndsAt = ctx.now() + timing.voteMs;
    const id = state.attempt.id;
    state.cancelTimer = ctx.schedule(timing.voteMs, () => {
      if (state.attempt.id === id && state.phase === 'vote') resolve(ctx, state);
    });
    if (!checkVotes(ctx, state)) ctx.pushViews();
  }

  /** Bağlı herkes oy verdiyse sonucu açıklar. */
  function checkVotes(ctx: GameContext, state: FiveSecondsState): boolean {
    if (state.phase !== 'vote') return false;
    if (voters(ctx, state).every((id) => id in state.attempt.votes)) {
      resolve(ctx, state);
      return true;
    }
    return false;
  }

  function resolve(ctx: GameContext, state: FiveSecondsState): void {
    const a = state.attempt;
    clearTimer(state);
    const cast = Object.values(a.votes);
    const yes = cast.filter(Boolean).length;
    const no = cast.length - yes;
    // Çoğunluk; beraberlikte (ve hiç oy yoksa) başardı sayılır.
    const success = yes >= no;
    if (success) state.scores[a.performerId] = (state.scores[a.performerId] ?? 0) + 1;
    state.lastResult = {
      attemptId: a.id,
      performerId: a.performerId,
      prompt: a.prompt?.text ?? '',
      success,
      yes,
      no,
      steal: a.stealFrom !== null,
      scorerId: success ? a.performerId : null,
      skipped: false,
    };
    if (!success && state.settings.steal && a.stealFrom === null) {
      const stealer = findStealer(ctx, state, a.performerId);
      if (stealer) return newAttempt(ctx, state, stealer, a.performerId, a.prompt);
    }
    nextTurn(ctx, state);
  }

  /** Çalma hakkı: sıradaki bağlı oyuncu (takım modunda rakip takımdan). */
  function findStealer(ctx: GameContext, state: FiveSecondsState, performerId: string): string | null {
    const on = online(ctx);
    const start = state.order.indexOf(performerId);
    const myTeam = teamOf(state, performerId);
    for (let k = 1; k < state.order.length; k++) {
      const id = state.order[(start + k) % state.order.length]!;
      if (id === performerId || !on.has(id)) continue;
      if (state.teamMode && teamOf(state, id) === myTeam) continue;
      return id;
    }
    return null;
  }

  function skip(ctx: GameContext, state: FiveSecondsState): void {
    const a = state.attempt;
    if (a.stealFrom === null) {
      state.lastResult = {
        attemptId: a.id,
        performerId: a.performerId,
        prompt: a.revealed ? (a.prompt?.text ?? '') : '',
        success: false,
        yes: 0,
        no: 0,
        steal: false,
        scorerId: null,
        skipped: true,
      };
    }
    nextTurn(ctx, state);
  }

  function tick(ctx: GameContext, state: FiveSecondsState): void {
    state.cancelTick = ctx.schedule(timing.tickMs, () => {
      if (state.phase === 'podium') return;
      if (state.phase === 'ready') {
        if (online(ctx).has(state.attempt.performerId)) state.awaySince = null;
        else if (state.awaySince === null) state.awaySince = ctx.now();
        else if (ctx.now() - state.awaySince >= timing.awayMs) skip(ctx, state);
      } else if (state.phase === 'vote') {
        checkVotes(ctx, state);
      }
      tick(ctx, state);
    });
  }

  function podium(ctx: GameContext, state: FiveSecondsState): void {
    if (state.phase === 'podium') return;
    clearTimer(state);
    state.cancelTick?.();
    state.cancelTick = null;
    state.phase = 'podium';
    ctx.pushViews();
    const ts = teamScores(state);
    state.cancelTimer = ctx.schedule(timing.podiumMs, () => {
      const results: GameResult[] = state.order.map((id) => {
        const own = state.scores[id] ?? 0;
        const team = teamOf(state, id);
        return team && ts ? { playerId: id, score: ts[team], meta: { team, own } } : { playerId: id, score: own };
      });
      ctx.finish(results);
    });
  }

  function assertHostOrPerformer(ctx: GameContext, state: FiveSecondsState, playerId: string, msg: string): void {
    if (playerId !== state.attempt.performerId && playerId !== ctx.hostId()) throw new GameError(msg);
  }

  return {
    id: GAME_ID,
    minPlayers: 2,
    maxPlayers: 16,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (!bank.prompts(settings.categories).length) return 'Seçili kategorilerde görev yok. Başka kategori seç.';
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      if (ids.length < 2) throw new GameError('En az 2 oyuncu gerekli. Bir arkadaşını davet et.');
      let teams: Record<TeamId, string[]> | null = null;
      let order = ids;
      if (settings.teamMode) {
        teams = buildTeams(settings, ids);
        if (teams.a.length < MIN_TEAM || teams.b.length < MIN_TEAM) {
          throw new GameError(`Takım modunda her takımda en az ${MIN_TEAM} kişi olmalı. Takımları düzenle ya da bireysel oyna.`);
        }
        order = interleave(teams);
      }
      const state: FiveSecondsState = {
        settings,
        teamMode: settings.teamMode,
        teams,
        order,
        pos: -1,
        round: 1,
        totalRounds: settings.rounds === 0 ? null : settings.rounds,
        scores: Object.fromEntries(order.map((id) => [id, 0])),
        phase: 'ready',
        attempt: { id: '0', performerId: order[0]!, stealFrom: null, prompt: null, revealed: false, endsAt: 0, durationMs: 0, voteEndsAt: 0, votes: {} },
        attemptSeq: 0,
        lastResult: null,
        pile: [],
        used: new Set(),
        awaySince: null,
        cancelTimer: null,
        cancelTick: null,
        ctx,
      };
      nextTurn(ctx, state);
      tick(ctx, state);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const a = state.attempt;
      if (state.phase === 'podium') throw new GameError('Oyun bitti.');
      if (action.attemptId !== a.id) return { ok: true, stale: true };

      switch (action.type) {
        case 'ready': {
          if (state.phase !== 'ready') return { ok: true, stale: true };
          assertHostOrPerformer(ctx, state, playerId, 'Hazırım’a sırası gelen oyuncu basar.');
          reveal(ctx, state);
          return { ok: true };
        }
        case 'done': {
          if (state.phase !== 'countdown') return { ok: true, stale: true };
          assertHostOrPerformer(ctx, state, playerId, 'Süreyi yalnızca sırası gelen oyuncu bitirebilir.');
          startVote(ctx, state);
          return { ok: true };
        }
        case 'vote': {
          if (state.phase !== 'vote') throw new GameError('Oylama süre bitince başlar.');
          if (playerId === a.performerId) throw new GameError('Kendine oy veremezsin; arkadaşların karar verecek.');
          if (!state.order.includes(playerId)) throw new GameError('Bu oyunda oy hakkın yok.');
          a.votes[playerId] = action.success;
          if (!checkVotes(ctx, state)) ctx.pushViews();
          return { ok: true };
        }
        case 'swap': {
          if (playerId !== ctx.hostId()) throw new GameError('Görevi yalnızca oda sahibi değiştirebilir.');
          if (!a.revealed) throw new GameError('Görev, Hazırım’a basılınca açılır. Sırayı atlamak için “Sırayı atla”yı kullan.');
          a.prompt = draw(state);
          if (state.phase === 'ready') ctx.pushViews();
          else reveal(ctx, state);
          return { ok: true };
        }
        case 'skip': {
          if (playerId !== ctx.hostId()) throw new GameError('Sırayı yalnızca oda sahibi atlayabilir.');
          skip(ctx, state);
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!state.order.includes(playerId)) {
        state.order.push(playerId);
        state.scores[playerId] ??= 0;
        if (state.teams && !teamOf(state, playerId)) {
          (state.teams.a.length <= state.teams.b.length ? state.teams.a : state.teams.b).push(playerId);
        }
      }
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state) {
      if (!checkVotes(ctx, state)) ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      const categoriesChanged = settings.categories.join() !== state.settings.categories.join();
      // Takım modu yalnızca oyun başında belirlenir.
      state.settings = { ...settings, teamMode: state.teamMode };
      if (categoriesChanged) state.pile = [];
      state.totalRounds = settings.rounds === 0 ? null : Math.max(settings.rounds, state.round);
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): FiveSecondsView {
      const a = state.attempt;
      const present = new Set(state.order);
      return {
        phase: state.phase,
        order: state.order,
        scores: state.scores,
        teamMode: state.teamMode,
        teams: state.teams,
        teamScores: teamScores(state),
        myTeam: teamOf(state, playerId),
        round: state.round,
        totalRounds: state.totalRounds,
        attemptId: a.id,
        performerId: a.performerId,
        stealFrom: a.stealFrom,
        prompt: a.revealed ? a.prompt : null,
        serverNow: Date.now(),
        endsAt: a.endsAt,
        durationMs: a.durationMs || state.settings.seconds * 1000,
        voteEndsAt: a.voteEndsAt,
        voteMs: timing.voteMs,
        voted: state.phase === 'vote' ? Object.keys(a.votes).filter((id) => present.has(id)) : [],
        voters: state.phase === 'vote' ? voters(state.ctx, state) : [],
        myVote: state.phase === 'vote' ? (a.votes[playerId] ?? null) : null,
        lastResult: state.lastResult,
        steal: state.settings.steal,
      };
    },

    dispose(state) {
      state.cancelTimer?.();
      state.cancelTick?.();
    },
  };
}
