import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import { foldText } from '@songie/shared';
import {
  CONFESSION_MAX,
  CONFESSION_MIN,
  GAME_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  REACTIONS,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type ConfessionsAction,
  type ConfessionsPhase,
  type ConfessionsSettings,
  type ConfessionsView,
  type PlayerStat,
  type PodiumInfo,
  type ReactionId,
  type Reveal,
  type Topic,
} from '../shared/index.js';
import type { Prompts } from './prompts.js';

export class GameError extends UserFacingError {}

export interface ConfessionsTiming {
  /** Açıklama ekranı ne kadar kalsın. */
  revealMs: number;
  /** Tur sonu özeti. */
  summaryMs: number;
  podiumMs: number;
  /** Bağlantısı kopanlar yüzünden takılmamak için aşama bitişini düzenli kontrol et. */
  tickMs: number;
}

export const DEFAULT_TIMING: ConfessionsTiming = { revealMs: 8000, summaryMs: 15000, podiumMs: 10000, tickMs: 1000 };

interface Confession {
  id: string;
  authorId: string;
  text: string;
  hidden: boolean;
  /** Açıklandı mı (tahmin aşaması kapandı). Gizlenip atlananlar açıklanmaz. */
  revealed: boolean;
  /** oyuncu -> seçtiği aday. Yazarın kendi (sayılmayan) seçimi de burada. */
  picks: Record<string, string>;
  reactions: Record<ReactionId, string[]>;
}

export interface ConfessionsState {
  settings: ConfessionsSettings;
  clock: () => number;
  phase: ConfessionsPhase;
  round: number;
  totalRounds: number | null;
  topic: Topic | null;
  usedTopics: Set<string>;
  /** Bu turun gizli yazar ayarı (tur başında sabitlenir). */
  roundHidden: boolean;
  stats: Record<string, PlayerStat>;
  /** Yazma aşamasındaki itiraflar: oyuncu -> metin. */
  drafts: Record<string, { text: string; folded: string }>;
  /** Bu turda yazanlar (oyuncu sırasıyla). */
  writers: string[];
  queue: Confession[];
  index: number;
  reveal: Reveal | null;
  endsAt: number;
  durationMs: number;
  totalConfessions: number;
  podium: PodiumInfo | null;
  cancelTimer: (() => void) | null;
  cancelTick: (() => void) | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const emptyReactions = (): Record<ReactionId, string[]> => ({ yok: [], bende: [], efsane: [], olamaz: [] });

/** Boşlukları sadeleştirir. */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function createConfessionsGame(deps: {
  prompts: Prompts;
  timing?: Partial<ConfessionsTiming>;
}): ServerGame<ConfessionsSettings, ConfessionsState, ConfessionsAction> {
  const { prompts } = deps;
  const timing: ConfessionsTiming = { ...DEFAULT_TIMING, ...deps.timing };

  const ids = (ctx: GameContext) => ctx.players().map((p) => p.id);
  const connected = (ctx: GameContext) => ctx.players().filter((p) => p.connected).map((p) => p.id);

  function ensureStat(state: ConfessionsState, id: string): PlayerStat {
    return (state.stats[id] ??= { score: 0, correct: 0, fooled: 0 });
  }

  function clearTimers(state: ConfessionsState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
    state.cancelTick?.();
    state.cancelTick = null;
  }

  /** Bağlantısı kopan biri aşamayı kilitlemesin diye düzenli kontrol. */
  function startTick(ctx: GameContext, state: ConfessionsState): void {
    state.cancelTick?.();
    const tick = () => {
      state.cancelTick = null;
      if (state.phase !== 'write' && state.phase !== 'guess') return;
      if (checkDone(ctx, state)) return;
      state.cancelTick = ctx.schedule(timing.tickMs, tick);
    };
    state.cancelTick = ctx.schedule(timing.tickMs, tick);
  }

  function pickTopic(state: ConfessionsState): Topic | null {
    if (state.settings.mode === 'free') return null;
    const all = prompts.topics(state.settings.categories);
    if (!all.length) return null;
    let fresh = all.filter((t) => !state.usedTopics.has(t.text));
    if (!fresh.length) {
      state.usedTopics.clear();
      fresh = all;
    }
    const topic = fresh[Math.floor(Math.random() * fresh.length)]!;
    state.usedTopics.add(topic.text);
    return topic;
  }

  function startRound(ctx: GameContext, state: ConfessionsState): void {
    clearTimers(state);
    state.round++;
    state.phase = 'write';
    state.topic = pickTopic(state);
    state.roundHidden = state.settings.hiddenAuthor;
    state.drafts = {};
    state.writers = [];
    state.queue = [];
    state.index = 0;
    state.reveal = null;
    const secs = state.settings.writeSeconds;
    state.durationMs = secs * 1000;
    state.endsAt = secs > 0 ? ctx.now() + secs * 1000 : 0;
    if (secs > 0) state.cancelTimer = ctx.schedule(secs * 1000, () => closeWriting(ctx, state));
    startTick(ctx, state);
    ctx.pushViews();
  }

  function closeWriting(ctx: GameContext, state: ConfessionsState): void {
    if (state.phase !== 'write') return;
    clearTimers(state);
    const order = ids(ctx);
    const authors = Object.keys(state.drafts);
    // Oyuncu sırasıyla; odadan çıkanlar sona.
    state.writers = [...order.filter((id) => authors.includes(id)), ...authors.filter((id) => !order.includes(id))];
    // Rastgele sıra; kimlik yalnızca sıraya göre verilir, yazardan türetilmez.
    state.queue = shuffle(authors).map((authorId, i) => ({
      id: `r${state.round}c${i + 1}`,
      authorId,
      text: state.drafts[authorId]!.text,
      hidden: false,
      revealed: false,
      picks: {},
      reactions: emptyReactions(),
    }));
    state.drafts = {};
    state.totalConfessions += state.queue.length;
    if (!state.queue.length) return summary(ctx, state);
    beginGuess(ctx, state, 0);
  }

  function beginGuess(ctx: GameContext, state: ConfessionsState, index: number): void {
    clearTimers(state);
    while (index < state.queue.length && state.queue[index]!.hidden) index++;
    if (index >= state.queue.length) return summary(ctx, state);
    state.index = index;
    state.phase = 'guess';
    state.reveal = null;
    const ms = state.settings.guessSeconds * 1000;
    state.durationMs = ms;
    state.endsAt = ctx.now() + ms;
    state.cancelTimer = ctx.schedule(ms, () => closeGuess(ctx, state));
    startTick(ctx, state);
    ctx.pushViews();
  }

  function closeGuess(ctx: GameContext, state: ConfessionsState): void {
    if (state.phase !== 'guess') return;
    clearTimers(state);
    const c = state.queue[state.index]!;
    c.revealed = true;
    const tally: Record<string, number> = Object.fromEntries(state.writers.map((id) => [id, 0]));
    const picks: { playerId: string; targetId: string }[] = [];
    const correct: string[] = [];
    const points = new Map<string, number>();
    const add = (id: string, n: number) => points.set(id, (points.get(id) ?? 0) + n);
    for (const id of [...ids(ctx), ...Object.keys(c.picks).filter((x) => !ids(ctx).includes(x))]) {
      const target = c.picks[id];
      // Yazarın seçimi hiç sayılmaz ve hiçbir yerde gösterilmez.
      if (target === undefined || id === c.authorId) continue;
      tally[target] = (tally[target] ?? 0) + 1;
      picks.push({ playerId: id, targetId: target });
      if (state.roundHidden) continue;
      if (target === c.authorId) {
        correct.push(id);
        ensureStat(state, id).correct++;
        ensureStat(state, id).score++;
        add(id, 1);
      } else {
        ensureStat(state, c.authorId).fooled++;
        ensureStat(state, c.authorId).score++;
        add(c.authorId, 1);
      }
    }
    state.reveal = state.roundHidden
      ? { authorId: null, correct: [], picks: null, tally, points: [] }
      : { authorId: c.authorId, correct, picks, tally, points: [...points].map(([playerId, delta]) => ({ playerId, delta })) };
    state.phase = 'reveal';
    state.endsAt = ctx.now() + timing.revealMs;
    state.durationMs = timing.revealMs;
    state.cancelTimer = ctx.schedule(timing.revealMs, () => afterReveal(ctx, state));
    ctx.pushViews();
  }

  function afterReveal(ctx: GameContext, state: ConfessionsState): void {
    if (state.phase !== 'reveal') return;
    beginGuess(ctx, state, state.index + 1);
  }

  function summary(ctx: GameContext, state: ConfessionsState): void {
    clearTimers(state);
    state.phase = 'summary';
    state.reveal = null;
    state.endsAt = ctx.now() + timing.summaryMs;
    state.durationMs = timing.summaryMs;
    state.cancelTimer = ctx.schedule(timing.summaryMs, () => nextRound(ctx, state));
    ctx.pushViews();
  }

  function nextRound(ctx: GameContext, state: ConfessionsState): void {
    if (state.phase !== 'summary') return;
    if (state.totalRounds !== null && state.round >= state.totalRounds) return podium(ctx, state);
    startRound(ctx, state);
  }

  function best(state: ConfessionsState, order: string[], key: 'correct' | 'fooled') {
    let top: { playerId: string; value: number } | null = null;
    for (const id of order) {
      const v = state.stats[id]?.[key] ?? 0;
      if (v > 0 && (!top || v > top.value)) top = { playerId: id, value: v };
    }
    return top;
  }

  function podium(ctx: GameContext, state: ConfessionsState): void {
    if (state.phase === 'podium') return;
    clearTimers(state);
    const order = Object.keys(state.stats);
    state.phase = 'podium';
    state.reveal = null;
    state.drafts = {};
    state.podium = {
      detective: best(state, order, 'correct'),
      trickster: best(state, order, 'fooled'),
      confessions: state.totalConfessions,
    };
    state.endsAt = ctx.now() + timing.podiumMs;
    state.durationMs = timing.podiumMs;
    ctx.pushViews();
    state.cancelTimer = ctx.schedule(timing.podiumMs, () => {
      ctx.finish(
        Object.entries(state.stats).map(([playerId, st]) => ({
          playerId,
          score: st.score,
          meta: { correct: st.correct, fooled: st.fooled },
        })),
      );
    });
  }

  /** Aşama kendiliğinden bitmeli mi? Bittiyse true. */
  function checkDone(ctx: GameContext, state: ConfessionsState): boolean {
    const online = connected(ctx);
    if (state.phase === 'write') {
      const count = Object.keys(state.drafts).length;
      if (count > 0 && online.every((id) => state.drafts[id])) {
        closeWriting(ctx, state);
        return true;
      }
    } else if (state.phase === 'guess') {
      const c = state.queue[state.index]!;
      if (online.length > 0 && online.every((id) => c.picks[id] !== undefined)) {
        closeGuess(ctx, state);
        return true;
      }
    }
    return false;
  }

  function current(state: ConfessionsState): Confession | null {
    if (state.phase !== 'guess' && state.phase !== 'reveal') return null;
    return state.queue[state.index] ?? null;
  }

  function validateConfession(state: ConfessionsState, playerId: string, raw: string): { text: string; folded: string } {
    const text = cleanText(raw);
    if (!text) throw new GameError('İtirafın boş. Bir şeyler yaz.');
    if (text.length < CONFESSION_MIN) throw new GameError(`İtiraf en az ${CONFESSION_MIN} karakter olmalı. Biraz daha anlat.`);
    if (text.length > CONFESSION_MAX) throw new GameError(`İtiraf en fazla ${CONFESSION_MAX} karakter olabilir. Biraz kısalt.`);
    const folded = foldText(text);
    const letters = folded.replace(/[^\p{L}]/gu, '');
    if (letters.length < 5 || new Set(letters).size < 4) throw new GameError('Bu bir itirafa benzemiyor. Gerçek bir cümle yaz.');
    if (state.topic && folded === foldText(state.topic.text)) throw new GameError('Konuyu tekrar etme; kendi itirafını yaz.');
    for (const [id, d] of Object.entries(state.drafts)) {
      if (id !== playerId && d.folded === folded) throw new GameError('Bu itirafın aynısı zaten yazıldı. Kendi itirafını yaz.');
    }
    return { text, folded };
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (settings.mode === 'topics' && !prompts.topics(settings.categories).length) {
        return 'Seçili kategorilerde konu yok. Başka kategori seç ya da serbest itirafa geç.';
      }
      return null;
    },

    async start(ctx, settings) {
      const online = connected(ctx);
      if (online.length < MIN_PLAYERS) throw new GameError(`En az ${MIN_PLAYERS} kişi gerekiyor. Arkadaşlarını odaya çağır.`);
      const state: ConfessionsState = {
        settings,
        clock: () => ctx.now(),
        phase: 'write',
        round: 0,
        totalRounds: settings.rounds === 0 ? null : settings.rounds,
        topic: null,
        usedTopics: new Set(),
        roundHidden: settings.hiddenAuthor,
        stats: Object.fromEntries(ids(ctx).map((id) => [id, { score: 0, correct: 0, fooled: 0 }])),
        drafts: {},
        writers: [],
        queue: [],
        index: 0,
        reveal: null,
        endsAt: 0,
        durationMs: 0,
        totalConfessions: 0,
        podium: null,
        cancelTimer: null,
        cancelTick: null,
      };
      startRound(ctx, state);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      switch (action.type) {
        case 'write': {
          if (state.phase !== 'write') throw new GameError('Yazma süresi bitti. Sıradaki turu bekle.');
          state.drafts[playerId] = validateConfession(state, playerId, action.text);
          ensureStat(state, playerId);
          if (!checkDone(ctx, state)) ctx.pushViews();
          return { ok: true };
        }
        case 'guess': {
          const c = current(state);
          if (!c || c.id !== action.confessionId) return { ok: true, stale: true };
          if (state.phase !== 'guess') return { ok: true, stale: true };
          if (c.hidden) return { ok: true, stale: true };
          if (!state.writers.includes(action.targetId)) throw new GameError('Bu oyuncu bu turda itiraf yazmadı. Listeden birini seç.');
          // Yazarın seçimi de kaydedilir (ekranı başkalarınınkinden farklı görünmesin) ama sayılmaz.
          c.picks[playerId] = action.targetId;
          if (!checkDone(ctx, state)) ctx.pushViews();
          return { ok: true };
        }
        case 'react': {
          const c = current(state);
          if (!c || c.id !== action.confessionId || c.hidden) return { ok: true, stale: true };
          const list = c.reactions[action.reaction];
          const i = list.indexOf(playerId);
          if (i >= 0) list.splice(i, 1);
          else list.push(playerId);
          ctx.pushViews();
          return { ok: true };
        }
        case 'hide': {
          if (!isHost) throw new GameError('İtirafı yalnızca oda sahibi gizleyebilir.');
          const pos = state.queue.findIndex((c) => c.id === action.confessionId);
          const c = state.queue[pos];
          if (!c || pos > state.index || state.phase === 'write' || state.phase === 'podium') return { ok: true, stale: true };
          if (c.hidden) return { ok: true, stale: true };
          c.hidden = true;
          if (state.phase === 'guess' && pos === state.index) {
            // Tahmin sürerken gizlenirse puan yok, yazar açıklanmaz; sıradakine geç.
            beginGuess(ctx, state, state.index + 1);
          } else {
            ctx.pushViews();
          }
          return { ok: true };
        }
        case 'next': {
          if (!isHost) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
          if (state.phase === 'write') closeWriting(ctx, state);
          else if (state.phase === 'guess') closeGuess(ctx, state);
          else if (state.phase === 'reveal') afterReveal(ctx, state);
          else if (state.phase === 'summary') nextRound(ctx, state);
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      ensureStat(state, playerId);
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state) {
      if (!checkDone(ctx, state)) ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      state.settings = settings;
      state.totalRounds = settings.rounds === 0 ? null : Math.max(settings.rounds, state.round);
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): ConfessionsView {
      const c = current(state);
      const recap =
        state.phase === 'summary'
          ? state.queue
              .filter((q) => q.revealed && !q.hidden)
              .map((q) => ({
                id: q.id,
                text: q.text,
                authorId: state.roundHidden ? null : q.authorId,
                reactions: Object.fromEntries(REACTIONS.map((r) => [r, q.reactions[r].length])) as Record<ReactionId, number>,
              }))
          : null;
      const stats = Object.fromEntries(Object.entries(state.stats).map(([id, s]) => [id, { ...s }]));
      return {
        phase: state.phase,
        round: state.round,
        totalRounds: state.totalRounds,
        topic: state.phase === 'podium' ? null : state.topic,
        hiddenAuthor: state.roundHidden,
        serverNow: state.clock(),
        endsAt: state.endsAt,
        durationMs: state.durationMs,
        stats,
        written:
          state.phase === 'write'
            ? Object.keys(state.stats).filter((id) => state.drafts[id]).concat(Object.keys(state.drafts).filter((id) => !state.stats[id]))
            : state.writers,
        myConfession: state.phase === 'write' ? (state.drafts[playerId]?.text ?? null) : null,
        index: c ? state.index + 1 : 0,
        count: state.queue.length,
        current: c
          ? {
              id: c.id,
              text: c.hidden ? null : c.text,
              hidden: c.hidden,
              candidates: state.writers,
              reactions: Object.fromEntries(REACTIONS.map((r) => [r, c.reactions[r].length])) as Record<ReactionId, number>,
              myReactions: REACTIONS.filter((r) => c.reactions[r].includes(playerId)),
            }
          : null,
        picked: c ? Object.keys(state.stats).filter((id) => c.picks[id] !== undefined) : [],
        myPick: c ? (c.picks[playerId] ?? null) : null,
        reveal: state.phase === 'reveal' ? state.reveal : null,
        recap,
        podium: state.phase === 'podium' ? state.podium : null,
      };
    },

    dispose(state) {
      clearTimers(state);
    },
  };
}
