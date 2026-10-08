import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type AnswerHow,
  type ParanoiaAction,
  type ParanoiaPhase,
  type ParanoiaSettings,
  type ParanoiaView,
  type RevealedEntry,
} from '../shared/index.js';
import type { Question, QuestionBank } from './questions.js';

export class GameError extends UserFacingError {}

export interface ParanoiaTiming {
  /** Özet ekranı bu süre sonra kendiliğinden kapanır ve oda lobiye döner. */
  summaryMs: number;
}

export const SUMMARY_MS = 120_000;

interface Entry {
  seq: number;
  question: Question;
  askedId: string;
  answerId: string | null;
  how: AnswerHow;
}

interface Current {
  seq: number;
  question: Question;
  holderId: string;
  /** Soruyu bu kişiye gönderen (bir önceki soruyu alan); ilk soruda null. */
  fromId: string | null;
  endsAt: number | null;
}

export interface ParanoiaState {
  ctx: GameContext;
  settings: ParanoiaSettings;
  /** Oyuna katılan herkes (ayrılanlar da kalır; açıklamada adları gerekir). */
  players: string[];
  names: Record<string, string>;
  phase: ParanoiaPhase;
  total: number;
  seq: number;
  current: Current | null;
  entries: Entry[];
  pile: Question[];
  used: Set<string>;
  revealed: number;
  votes: string[];
  pulse: number;
  closesAt: number;
  finished: boolean;
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

function pick<T>(arr: readonly T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createParanoiaGame(deps: {
  bank: QuestionBank;
  timing?: Partial<ParanoiaTiming>;
}): ServerGame<ParanoiaSettings, ParanoiaState, ParanoiaAction> {
  const { bank } = deps;
  const timing: ParanoiaTiming = { summaryMs: SUMMARY_MS, ...deps.timing };

  /** Hâlâ odada olan oyun oyuncuları. */
  function present(state: ParanoiaState): string[] {
    const inRoom = new Set(state.ctx.players().map((p) => p.id));
    return state.players.filter((id) => inRoom.has(id));
  }

  function online(state: ParanoiaState): string[] {
    const on = new Set(state.ctx.players().filter((p) => p.connected).map((p) => p.id));
    return state.players.filter((id) => on.has(id));
  }

  /** Soruyu alan kişinin seçebileceği oyuncular. Kural kimseyi bırakmıyorsa gevşetilir. */
  function eligible(state: ParanoiaState, holderId: string, fromId: string | null): string[] {
    const all = present(state);
    const { allowSelf, noReturn } = state.settings;
    const strict = all.filter((id) => (allowSelf || id !== holderId) && (!noReturn || id !== fromId));
    if (strict.length) return strict;
    const noSelf = all.filter((id) => allowSelf || id !== holderId);
    return noSelf.length ? noSelf : all;
  }

  /** Rastgele bir sonraki soru alıcısı: önce bağlı olanlar. */
  function randomHolder(state: ParanoiaState, exclude: string | null): string | undefined {
    const on = online(state).filter((id) => id !== exclude);
    if (on.length) return pick(on);
    return pick(present(state).filter((id) => id !== exclude)) ?? pick(present(state));
  }

  function draw(state: ParanoiaState): Question {
    if (!state.pile.length) {
      const all = bank.questions(state.settings.categories);
      let fresh = all.filter((q) => !state.used.has(q.id));
      if (!fresh.length) {
        state.used.clear();
        fresh = all;
      }
      state.pile = shuffle(fresh);
    }
    const q = state.pile.shift()!;
    state.used.add(q.id);
    return q;
  }

  function clearTimer(state: ParanoiaState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
  }

  function startClock(state: ParanoiaState): void {
    const cur = state.current!;
    clearTimer(state);
    const secs = state.settings.thinkSeconds;
    if (secs <= 0) {
      cur.endsAt = null;
      return;
    }
    cur.endsAt = state.ctx.now() + secs * 1000;
    const seq = cur.seq;
    state.cancelTimer = state.ctx.schedule(secs * 1000, () => timeout(state, seq));
  }

  /** Soruyu `holderId`'ye ver (ya da sorular bittiyse açıklamaya geç). */
  function ask(state: ParanoiaState, holderId: string, fromId: string | null): void {
    if (state.entries.length >= state.total) return startReveal(state);
    state.phase = 'asking';
    state.current = { seq: ++state.seq, question: draw(state), holderId, fromId, endsAt: null };
    startClock(state);
    state.ctx.pushViews();
  }

  function resolve(state: ParanoiaState, answerId: string | null, how: AnswerHow): void {
    const cur = state.current!;
    clearTimer(state);
    state.entries.push({ seq: cur.seq, question: cur.question, askedId: cur.holderId, answerId, how });
    state.pulse++;
    state.current = null;
    const next = answerId ?? randomHolder(state, cur.holderId) ?? cur.holderId;
    ask(state, next, cur.holderId);
  }

  function timeout(state: ParanoiaState, seq: number): void {
    const cur = state.current;
    if (state.phase !== 'asking' || !cur || cur.seq !== seq) return;
    state.cancelTimer = null;
    if (state.settings.onTimeout === 'pass') return resolve(state, null, 'pass');
    resolve(state, pick(eligible(state, cur.holderId, cur.fromId)) ?? null, 'random');
  }

  /** Aynı soru başka (bağlı) bir oyuncuya gider. */
  function reassign(state: ParanoiaState): boolean {
    const cur = state.current!;
    const others = online(state).filter((id) => id !== cur.holderId);
    const next = pick(others.length ? others : present(state).filter((id) => id !== cur.holderId));
    if (!next) return false;
    cur.holderId = next;
    if (cur.fromId === next) cur.fromId = null;
    startClock(state);
    return true;
  }

  function startReveal(state: ParanoiaState): void {
    clearTimer(state);
    state.current = null;
    state.votes = [];
    if (!state.entries.length) return startSummary(state);
    state.phase = 'reveal';
    state.revealed = 1;
    state.ctx.pushViews();
  }

  function votesNeeded(state: ParanoiaState): number {
    return Math.floor(Math.max(1, online(state).length) / 2) + 1;
  }

  function advance(state: ParanoiaState): void {
    state.votes = [];
    if (state.revealed < state.entries.length) {
      state.revealed++;
      state.ctx.pushViews();
    } else {
      startSummary(state);
    }
  }

  function results(state: ParanoiaState): GameResult[] {
    return state.players.map((id) => ({
      playerId: id,
      score: state.entries.filter((e) => e.answerId === id).length,
      meta: { asked: state.entries.filter((e) => e.askedId === id).length },
    }));
  }

  function finishNow(state: ParanoiaState): void {
    if (state.finished) return;
    state.finished = true;
    clearTimer(state);
    state.ctx.finish(results(state));
  }

  function startSummary(state: ParanoiaState): void {
    clearTimer(state);
    state.current = null;
    state.phase = 'summary';
    state.revealed = state.entries.length;
    state.votes = [];
    state.closesAt = state.ctx.now() + timing.summaryMs;
    state.cancelTimer = state.ctx.schedule(timing.summaryMs, () => finishNow(state));
    state.ctx.pushViews();
  }

  function stats(state: ParanoiaState): ParanoiaView['stats'] {
    return state.players
      .map((id) => ({
        playerId: id,
        picked: state.entries.filter((e) => e.answerId === id).length,
        asked: state.entries.filter((e) => e.askedId === id).length,
      }))
      .sort((a, b) => b.picked - a.picked || a.asked - b.asked);
  }

  function toRevealed(e: Entry, i: number): RevealedEntry {
    return { n: i + 1, question: e.question.text, askedId: e.askedId, answerId: e.answerId, how: e.how };
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (!bank.questions(settings.categories).length) return 'Seçili kategorilerde soru yok. Başka kategori seç.';
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      if (ids.length < MIN_PLAYERS) throw new GameError(`Bu oyun için en az ${MIN_PLAYERS} bağlı oyuncu gerekiyor.`);
      const state: ParanoiaState = {
        ctx,
        settings,
        players: ids,
        names: Object.fromEntries(ctx.players().map((p) => [p.id, p.nick])),
        phase: 'pickFirst',
        total: settings.questionCount,
        seq: 0,
        current: null,
        entries: [],
        pile: [],
        used: new Set(),
        revealed: 0,
        votes: [],
        pulse: 0,
        closesAt: 0,
        finished: false,
        cancelTimer: null,
      };
      if (settings.firstHolder === 'random') ask(state, pick(ids)!, null);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      switch (action.type) {
        case 'pickFirst': {
          if (state.phase !== 'pickFirst') return { ok: true, stale: true };
          if (!isHost) throw new GameError('İlk soruyu kimin alacağını oda sahibi seçer.');
          if (!present(state).includes(action.targetId)) throw new GameError('Bu oyuncu oyunda değil. Listeden birini seç.');
          ask(state, action.targetId, null);
          return { ok: true };
        }
        case 'choose': {
          const cur = state.current;
          if (state.phase !== 'asking' || !cur || cur.seq !== action.seq) return { ok: true, stale: true };
          if (cur.holderId !== playerId) throw new GameError('Bu soru sana sorulmadı. Sıranı bekle.');
          if (!eligible(state, cur.holderId, cur.fromId).includes(action.targetId)) {
            if (action.targetId === playerId) throw new GameError('Bu oyunda kendini seçemezsin. Başka birini seç.');
            if (action.targetId === cur.fromId) throw new GameError('Soruyu sana gönderen kişiyi seçemezsin. Başka birini seç.');
            throw new GameError('Bu oyuncu seçilemez. Listeden başka birini seç.');
          }
          resolve(state, action.targetId, 'chosen');
          return { ok: true };
        }
        case 'skip': {
          const cur = state.current;
          if (!isHost) throw new GameError('Sırayı yalnızca oda sahibi atlayabilir.');
          if (state.phase !== 'asking' || !cur || cur.seq !== action.seq) return { ok: true, stale: true };
          if (action.mode === 'random') {
            resolve(state, pick(eligible(state, cur.holderId, cur.fromId)) ?? null, 'host');
          } else {
            if (!reassign(state)) throw new GameError('Soruyu verecek başka oyuncu yok.');
            ctx.pushViews();
          }
          return { ok: true };
        }
        case 'next': {
          if (state.phase !== 'reveal' || action.shown !== state.revealed) return { ok: true, stale: true };
          if (state.settings.revealBy === 'host' || isHost) {
            if (!isHost) throw new GameError('Sıradaki soruyu oda sahibi açar.');
            advance(state);
            return { ok: true };
          }
          if (!state.votes.includes(playerId)) state.votes.push(playerId);
          if (state.votes.length >= votesNeeded(state)) advance(state);
          else ctx.pushViews();
          return { ok: true };
        }
        case 'finish': {
          if (!isHost) throw new GameError('Oyunu oda sahibi bitirir.');
          if (state.phase !== 'summary') throw new GameError('Önce bütün sorular açılmalı.');
          finishNow(state);
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!state.players.includes(playerId)) state.players.push(playerId);
      const p = ctx.players().find((x) => x.id === playerId);
      if (p) state.names[playerId] = p.nick;
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      const cur = state.current;
      if (state.phase === 'asking' && cur) {
        if (cur.holderId === playerId) reassign(state);
        else if (cur.fromId === playerId) cur.fromId = null;
      }
      state.votes = state.votes.filter((id) => id !== playerId);
      if (state.phase === 'reveal' && state.votes.length && state.votes.length >= votesNeeded(state)) return advance(state);
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      const categoriesChanged = settings.categories.join() !== state.settings.categories.join();
      state.settings = settings;
      if (categoriesChanged) state.pile = [];
      if (state.phase === 'pickFirst' || state.phase === 'asking') {
        state.total = Math.max(settings.questionCount, state.entries.length + (state.current ? 1 : 0));
      }
      ctx.pushViews();
    },

    end(ctx, state) {
      if (state.phase === 'summary') return finishNow(state);
      startSummary(state);
    },

    viewFor(state, playerId): ParanoiaView {
      const { ctx, settings } = state;
      const isHost = ctx.hostId() === playerId;
      const cur = state.phase === 'asking' ? state.current : null;
      const myTurn = !!cur && cur.holderId === playerId;
      const holder = cur && (myTurn || !settings.hideHolder) ? cur.holderId : null;
      const holderOffline = !!cur && isHost && !online(state).includes(cur.holderId);
      let choices: string[] = [];
      if (cur && myTurn) choices = eligible(state, cur.holderId, cur.fromId);
      else if (state.phase === 'pickFirst' && isHost) choices = present(state);
      const open = state.phase === 'reveal' || state.phase === 'summary';
      return {
        phase: state.phase,
        players: state.players,
        names: state.names,
        total: state.total,
        answered: state.entries.length,
        serverNow: ctx.now(),
        endsAt: cur?.endsAt ?? null,
        durationMs: settings.thinkSeconds * 1000,
        seq: cur?.seq ?? state.seq,
        myTurn,
        question: cur && myTurn ? cur.question.text : null,
        choices,
        holderId: holder,
        holderOffline,
        pulse: state.pulse,
        mine: open
          ? []
          : state.entries.filter((e) => e.askedId === playerId).map((e) => ({ question: e.question.text, answerId: e.answerId, how: e.how })),
        revealed: open ? state.entries.slice(0, state.revealed).map(toRevealed) : [],
        revealTotal: open ? state.entries.length : 0,
        votes: state.phase === 'reveal' ? state.votes.length : 0,
        votesNeeded: state.phase === 'reveal' ? votesNeeded(state) : 0,
        myVote: state.votes.includes(playerId),
        stats: state.phase === 'summary' ? stats(state) : [],
        closesAt: state.phase === 'summary' ? state.closesAt : 0,
      };
    },

    dispose(state) {
      clearTimer(state);
    },
  };
}
