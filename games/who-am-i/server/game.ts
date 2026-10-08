import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  ANSWERS,
  GAME_ID,
  QUESTIONS_PER_TURN,
  actionSchema,
  defaultSettings,
  rankPlayers,
  settingsSchema,
  type Answer,
  type HistoryItem,
  type PlayerCard,
  type WhoAmIAction,
  type WhoAmIPhase,
  type WhoAmISettings,
  type WhoAmIView,
} from '../shared/index.js';
import { CATEGORY_HINT, CATEGORY_NAMES, matchesGuess, type IdentityCard, type IdentityPool } from './content.js';

export const PODIUM_MS = 12_000;
const HISTORY_LIMIT = 60;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export class GameError extends UserFacingError {}

export interface WhoAmITiming {
  podiumMs: number;
}

interface PlayerState {
  id: string;
  card: IdentityCard;
  /** Sorulan soru + kullanılan ipucu (ipucu 1 soru sayılır). */
  questions: number;
  hints: string[];
  finishRank: number | null;
  left: boolean;
}

interface Question {
  id: number;
  askerId: string;
  text: string | null;
  answers: Record<string, Answer>;
}

interface Guess {
  id: number;
  playerId: string;
  text: string;
  votes: Record<string, boolean>;
}

export interface WhoAmIState {
  settings: WhoAmISettings;
  phase: WhoAmIPhase;
  order: string[];
  players: Record<string, PlayerState>;
  askerId: string | null;
  turnNumber: number;
  turnQuestions: number;
  question: Question | null;
  guess: Guess | null;
  history: HistoryItem[];
  finishCount: number;
  seq: number;
  used: Set<string>;
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

/** Çoğulluk: en çok oy alan cevap; en üstte eşitlik varsa "Belki". */
export function majority(counts: Record<Answer, number>): Answer {
  let best: Answer = 'maybe';
  let max = 0;
  let tie = false;
  for (const a of ANSWERS) {
    if (counts[a] > max) {
      best = a;
      max = counts[a];
      tie = false;
    } else if (counts[a] === max && max > 0) {
      tie = true;
    }
  }
  return tie || max === 0 ? 'maybe' : best;
}

function countAnswers(q: Question): Record<Answer, number> {
  const counts: Record<Answer, number> = { yes: 0, no: 0, maybe: 0, irrelevant: 0 };
  for (const a of Object.values(q.answers)) counts[a]++;
  return counts;
}

/** n. ipucu: 1) kategori, 2) baş harf, 3) kelime ve harf sayısı. */
export function hintFor(card: IdentityCard, n: number): string {
  const bare = card.name.replace(/\s*\([^)]*\)/g, '').trim();
  if (n === 0) return CATEGORY_HINT[card.category] ?? `Kategorin: ${CATEGORY_NAMES[card.category] ?? card.category}.`;
  if (n === 1) return `Baş harfin “${bare.charAt(0).toLocaleUpperCase('tr-TR')}”.`;
  const words = bare.split(/\s+/).filter(Boolean);
  const letters = (bare.match(/\p{L}/gu) ?? []).length;
  return `Kimliğin ${words.length} kelime, toplam ${letters} harf.`;
}

export function createWhoAmIGame(deps: { pool: IdentityPool; timing?: Partial<WhoAmITiming> }): ServerGame<WhoAmISettings, WhoAmIState, WhoAmIAction> {
  const { pool } = deps;
  const timing: WhoAmITiming = { podiumMs: PODIUM_MS, ...deps.timing };

  const connected = (ctx: GameContext) => new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));

  function inGame(state: WhoAmIState, id: string): PlayerState | null {
    const p = state.players[id];
    return p && !p.left ? p : null;
  }

  /** Cevap/oy vermesi beklenenler: bağlı, oyunda, soran/tahmin eden dışındakiler. */
  function voters(ctx: GameContext, state: WhoAmIState, exclude: string): string[] {
    const online = connected(ctx);
    return state.order.filter((id) => id !== exclude && online.has(id) && inGame(state, id));
  }

  function push(state: WhoAmIState, item: HistoryItem): void {
    state.history.push(item);
    if (state.history.length > HISTORY_LIMIT) state.history.splice(0, state.history.length - HISTORY_LIMIT);
  }

  /** Bir kart çeker; mümkünse oyuncunun kendi eklediği kartı ona vermez. */
  function deal(state: WhoAmIState, playerId: string): IdentityCard | null {
    const all = pool.cards(state.settings.categories).filter((c) => !state.used.has(c.id));
    const fresh = shuffle(all);
    const card = fresh.find((c) => c.createdBy !== playerId) ?? fresh[0] ?? null;
    if (card) state.used.add(card.id);
    return card;
  }

  function addPlayer(state: WhoAmIState, id: string): boolean {
    const card = deal(state, id);
    if (!card) return false;
    state.players[id] = { id, card, questions: 0, hints: [], finishRank: null, left: false };
    state.order.push(id);
    return true;
  }

  function allDone(state: WhoAmIState): boolean {
    const active = state.order.filter((id) => inGame(state, id));
    return active.length < MIN_PLAYERS || active.every((id) => state.players[id]!.finishRank !== null);
  }

  /** Sıradaki oyuncu: bitirmemiş, oyunda ve bağlı; bağlı kimse yoksa bitirmemiş ilk kişi. */
  function nextAsker(ctx: GameContext, state: WhoAmIState): string | null {
    const online = connected(ctx);
    const start = state.askerId ? state.order.indexOf(state.askerId) : -1;
    const n = state.order.length;
    let fallback: string | null = null;
    for (let k = 1; k <= n; k++) {
      const id = state.order[(start + k + n) % n]!;
      const p = inGame(state, id);
      if (!p || p.finishRank !== null) continue;
      if (online.has(id)) return id;
      fallback ??= id;
    }
    return fallback;
  }

  function advance(ctx: GameContext, state: WhoAmIState): void {
    state.question = null;
    state.guess = null;
    if (allDone(state)) return podium(ctx, state);
    state.askerId = nextAsker(ctx, state);
    state.turnNumber++;
    state.turnQuestions = 0;
    ctx.pushViews();
  }

  function resolveQuestion(ctx: GameContext, state: WhoAmIState): void {
    const q = state.question;
    if (!q) return;
    const counts = countAnswers(q);
    const result = majority(counts);
    push(state, { id: q.id, kind: 'question', askerId: q.askerId, text: q.text, counts, result });
    state.question = null;
    const turnOver = state.settings.turnMode === 'classic' ? result === 'no' : state.turnQuestions >= QUESTIONS_PER_TURN;
    if (turnOver) return advance(ctx, state);
    if (skipOfflineAsker(ctx, state)) return;
    ctx.pushViews();
  }

  /** Sırası gelen oyuncunun bağlantısı yoksa (ve bekleyen soru/tahmin yoksa) sırası atlanır. */
  function skipOfflineAsker(ctx: GameContext, state: WhoAmIState): boolean {
    const asker = state.askerId;
    if (!asker || state.question || state.guess || state.phase !== 'play') return false;
    if (connected(ctx).has(asker)) return false;
    // Bağlı kimse kalmadıysa döngüye girme.
    const next = nextAsker(ctx, state);
    if (!next || next === asker || !connected(ctx).has(next)) return false;
    push(state, { id: ++state.seq, kind: 'skip', askerId: asker, byHost: false });
    advance(ctx, state);
    return true;
  }

  function maybeResolveQuestion(ctx: GameContext, state: WhoAmIState): void {
    const q = state.question;
    if (!q) return;
    const expected = voters(ctx, state, q.askerId);
    if (expected.length > 0 && expected.every((id) => q.answers[id])) resolveQuestion(ctx, state);
  }

  function resolveGuess(ctx: GameContext, state: WhoAmIState, playerId: string, text: string, correct: boolean, byGroup: boolean, id: number): void {
    const p = state.players[playerId]!;
    state.guess = null;
    if (correct) p.finishRank = state.finishCount++;
    push(state, { id, kind: 'guess', askerId: playerId, text, correct, reveal: correct ? p.card.name : null, byGroup });
    advance(ctx, state);
  }

  function settleGroupGuess(ctx: GameContext, state: WhoAmIState): void {
    const g = state.guess;
    if (!g) return;
    const votes = Object.values(g.votes);
    const yes = votes.filter(Boolean).length;
    const no = votes.length - yes;
    // Eşitlikte sunucunun yazım kontrolü karar verir.
    const correct = yes === no ? matchesGuess(state.players[g.playerId]!.card, g.text) : yes > no;
    resolveGuess(ctx, state, g.playerId, g.text, correct, true, g.id);
  }

  function maybeSettleGuess(ctx: GameContext, state: WhoAmIState): void {
    const g = state.guess;
    if (!g) return;
    const expected = voters(ctx, state, g.playerId);
    if (expected.every((id) => g.votes[id] !== undefined)) settleGroupGuess(ctx, state);
  }

  function results(state: WhoAmIState): GameResult[] {
    const ranked = rankPlayers(
      state.order.map((id) => {
        const p = state.players[id]!;
        return { id, finished: p.finishRank !== null, finishRank: p.finishRank, questions: p.questions };
      }),
    );
    const n = ranked.length;
    return ranked.map((r, i) => {
      const p = state.players[r.id]!;
      return {
        playerId: r.id,
        score: r.finished ? n - i : 0,
        meta: { identity: p.card.name, questions: p.questions, hints: p.hints.length, finished: r.finished, place: i + 1 },
      };
    });
  }

  function podium(ctx: GameContext, state: WhoAmIState): void {
    if (state.phase === 'podium') return;
    state.cancelTimer?.();
    state.phase = 'podium';
    state.question = null;
    state.guess = null;
    state.askerId = null;
    ctx.pushViews();
    state.cancelTimer = ctx.schedule(timing.podiumMs, () => ctx.finish(results(state)));
  }

  function requirePlay(state: WhoAmIState): void {
    if (state.phase !== 'play') throw new GameError('Oyun bitti; sonuçlara bak.');
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (pool.cards(settings.categories).length < MAX_PLAYERS) return 'Seçili kategorilerde yeterli kimlik yok. Başka kategori de seç.';
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      if (ids.length < MIN_PLAYERS) throw new GameError(`En az ${MIN_PLAYERS} kişi gerekiyor. Arkadaşlarını odaya çağır.`);
      const state: WhoAmIState = {
        settings,
        phase: 'play',
        order: [],
        players: {},
        askerId: null,
        turnNumber: 1,
        turnQuestions: 0,
        question: null,
        guess: null,
        history: [],
        finishCount: 0,
        seq: 0,
        used: new Set(),
        cancelTimer: null,
      };
      for (const id of shuffle(ids)) {
        if (!addPlayer(state, id)) throw new GameError('Seçili kategorilerde herkese yetecek kimlik yok. Başka kategori de seç.');
      }
      state.askerId = state.order[0]!;
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      const me = inGame(state, playerId);

      switch (action.type) {
        case 'ask': {
          requirePlay(state);
          if (state.askerId !== playerId) throw new GameError('Sıra sende değil. Sırası gelenin sorusunu cevapla.');
          if (state.question) return { ok: true, stale: true };
          if (state.guess) throw new GameError('Tahminin oylanıyor; sonucu bekle.');
          const text = state.settings.typedQuestions && action.text ? action.text : null;
          state.question = { id: ++state.seq, askerId: playerId, text, answers: {} };
          state.players[playerId]!.questions++;
          state.turnQuestions++;
          ctx.pushViews();
          return { ok: true, questionId: state.question.id };
        }

        case 'answer': {
          requirePlay(state);
          const q = state.question;
          if (!q || q.id !== action.questionId) return { ok: true, stale: true };
          if (q.askerId === playerId) throw new GameError('Kendi sorunu cevaplayamazsın; diğerlerini bekle.');
          if (!me) throw new GameError('Bu oyunda değilsin.');
          q.answers[playerId] = action.answer;
          maybeResolveQuestion(ctx, state);
          if (state.question === q) ctx.pushViews();
          return { ok: true };
        }

        case 'close': {
          requirePlay(state);
          if (action.guessId !== undefined) {
            const g = state.guess;
            if (!g || g.id !== action.guessId) return { ok: true, stale: true };
            if (!isHost) throw new GameError('Oylamayı yalnızca oda sahibi kapatabilir.');
            settleGroupGuess(ctx, state);
            return { ok: true };
          }
          const q = state.question;
          if (!q || q.id !== action.questionId) return { ok: true, stale: true };
          if (q.askerId !== playerId && !isHost) throw new GameError('Soruyu soran ya da oda sahibi kapatabilir.');
          if (!Object.keys(q.answers).length) throw new GameError('Henüz kimse cevaplamadı. Biraz bekle.');
          resolveQuestion(ctx, state);
          return { ok: true };
        }

        case 'guess': {
          requirePlay(state);
          if (state.askerId !== playerId || !me) throw new GameError('Tahmini sıran gelince yapabilirsin.');
          if (state.question) throw new GameError('Önce sorunun cevaplanmasını bekle.');
          if (state.guess) return { ok: true, stale: true };
          const id = ++state.seq;
          if (state.settings.groupVerify && voters(ctx, state, playerId).length > 0) {
            state.guess = { id, playerId, text: action.text, votes: {} };
            ctx.pushViews();
            return { ok: true, pending: true };
          }
          const correct = matchesGuess(me.card, action.text);
          resolveGuess(ctx, state, playerId, action.text, correct, false, id);
          return { ok: true, correct };
        }

        case 'verify': {
          requirePlay(state);
          const g = state.guess;
          if (!g || g.id !== action.guessId) return { ok: true, stale: true };
          if (g.playerId === playerId) throw new GameError('Kendi tahminini oylayamazsın.');
          if (!me) throw new GameError('Bu oyunda değilsin.');
          g.votes[playerId] = action.correct;
          maybeSettleGuess(ctx, state);
          if (state.guess === g) ctx.pushViews();
          return { ok: true };
        }

        case 'hint': {
          requirePlay(state);
          if (!me) throw new GameError('Bu oyunda değilsin.');
          if (me.finishRank !== null) throw new GameError('Kimliğini zaten bildin.');
          if (me.hints.length >= state.settings.hints) {
            throw new GameError(state.settings.hints === 0 ? 'Bu oyunda ipucu kapalı.' : 'İpucu hakkın bitti.');
          }
          me.hints.push(hintFor(me.card, me.hints.length));
          me.questions++;
          ctx.pushViews();
          return { ok: true };
        }

        case 'pass': {
          requirePlay(state);
          const asker = state.askerId;
          if (!asker) return { ok: true, stale: true };
          if (asker !== playerId && !isHost) throw new GameError('Sırayı yalnızca sırası gelen ya da oda sahibi geçebilir.');
          if (asker === playerId && state.guess) throw new GameError('Tahminin oylanıyor; sonucu bekle.');
          push(state, { id: ++state.seq, kind: 'skip', askerId: asker, byHost: asker !== playerId });
          advance(ctx, state);
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (state.phase === 'play' && !state.players[playerId]) addPlayer(state, playerId);
      else if (state.players[playerId]) state.players[playerId]!.left = false;
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      const p = state.players[playerId];
      if (!p || state.phase !== 'play') return ctx.pushViews();
      p.left = true;
      if (state.askerId === playerId) {
        push(state, { id: ++state.seq, kind: 'skip', askerId: playerId, byHost: false });
        return advance(ctx, state);
      }
      if (allDone(state)) return podium(ctx, state);
      if (state.question) delete state.question.answers[playerId];
      if (state.guess) delete state.guess.votes[playerId];
      maybeResolveQuestion(ctx, state);
      maybeSettleGuess(ctx, state);
      ctx.pushViews();
    },

    onPlayerConnection(ctx, state, playerId, isConnected) {
      if (state.phase !== 'play' || !state.players[playerId]) return;
      if (!isConnected) {
        if (skipOfflineAsker(ctx, state)) return;
        // Kopan oyuncu artık beklenmiyor; eksik kalan cevap/oy tamamlanmış olabilir.
        maybeResolveQuestion(ctx, state);
        maybeSettleGuess(ctx, state);
      }
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      state.settings = settings;
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): WhoAmIView {
      const reveal = (id: string) => state.phase === 'podium' || id !== playerId || state.players[id]!.finishRank !== null;
      const players: PlayerCard[] = state.order.map((id) => {
        const p = state.players[id]!;
        return {
          id,
          // Kendi kimliğin açıklanana kadar hiç gönderilmez.
          identity: reveal(id) ? { name: p.card.name, category: CATEGORY_NAMES[p.card.category] ?? p.card.category } : null,
          finished: p.finishRank !== null,
          finishRank: p.finishRank,
          questions: p.questions,
          hints: p.hints.length,
          left: p.left,
        };
      });
      const q = state.question;
      const g = state.guess;
      const mine = state.players[playerId];
      const expectedFor = (exclude: string, done: string[]) =>
        new Set([...state.order.filter((id) => id !== exclude && !state.players[id]!.left), ...done]).size;
      return {
        phase: state.phase,
        players,
        askerId: state.askerId,
        turnNumber: state.turnNumber,
        turnQuestions: state.turnQuestions,
        turnMode: state.settings.turnMode,
        typedQuestions: state.settings.typedQuestions,
        groupVerify: state.settings.groupVerify,
        question: q
          ? {
              id: q.id,
              askerId: q.askerId,
              text: q.text,
              counts: countAnswers(q),
              answered: Object.keys(q.answers),
              expected: expectedFor(q.askerId, Object.keys(q.answers)),
              myAnswer: q.answers[playerId] ?? null,
            }
          : null,
        guess: g
          ? {
              id: g.id,
              playerId: g.playerId,
              text: g.text,
              votes: { correct: Object.values(g.votes).filter(Boolean).length, wrong: Object.values(g.votes).filter((v) => !v).length },
              voted: Object.keys(g.votes),
              expected: expectedFor(g.playerId, Object.keys(g.votes)),
              myVote: g.votes[playerId] ?? null,
            }
          : null,
        history: state.history,
        myHints: mine?.hints ?? [],
        hintsLeft: mine && mine.finishRank === null ? Math.max(0, state.settings.hints - mine.hints.length) : 0,
        hintLimit: state.settings.hints,
      };
    },

    dispose(state) {
      state.cancelTimer?.();
    },
  };
}
