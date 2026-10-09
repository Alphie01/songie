import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  ACTIONS,
  COLORS,
  GAME_ID,
  HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NUMBERS,
  POINT_TARGET,
  actionSchema,
  cardPoints,
  defaultSettings,
  isWildValue,
  settingsSchema,
  type Card,
  type CardColor,
  type CardValue,
  type ColorCardsAction,
  type ColorCardsSettings,
  type ColorCardsView,
  type LogEntry,
  type Phase,
  type RoundResult,
} from '../shared/index.js';

export class GameError extends UserFacingError {}

export interface ColorCardsTiming {
  /** Puan modunda el sonu ekranı, sonra yeni el. */
  roundMs: number;
  /** Oyun sonu ekranı, sonra lobi. */
  podiumMs: number;
}

export const ROUND_MS = 9_000;
export const PODIUM_MS = 12_000;
const LOG_LIMIT = 50;

export type Rng = () => number;

export interface ColorCardsState {
  settings: ColorCardsSettings;
  /** Oyun başında sabitlenir. */
  mode: ColorCardsSettings['mode'];
  /** Oyundaki oyuncular (oturma sırası). */
  order: string[];
  /** Başlangıçtaki bütün oyuncular (sonuçlar için). */
  all: string[];
  left: string[];
  hands: Record<string, Card[]>;
  /** deck[0] = en üst kart. */
  deck: Card[];
  /** discard.at(-1) = açık kart. */
  discard: Card[];
  activeColor: CardColor | null;
  dir: 1 | -1;
  current: string;
  phase: Phase;
  step: number;
  /** Her yeni sırada artar (tur süresi bununla eşleşir). */
  turnSeq: number;
  penalty: number;
  drew: boolean;
  drawnId: string | null;
  challenge: { by: string; victim: string; guilty: boolean } | null;
  reveal: { to: string; of: string; cards: Card[]; guilty: boolean; seq: number } | null;
  revealSeq: number;
  exposed: string | null;
  called: Record<string, boolean>;
  log: LogEntry[];
  logSeq: number;
  lastPlay: ColorCardsView['lastPlay'];
  playSeq: number;
  scores: Record<string, number>;
  round: number;
  dealer: string;
  roundResult: RoundResult | null;
  winner: string | null;
  turnEndsAt: number;
  cancelTurn: (() => void) | null;
  roundEndsAt: number;
  cancelRound: (() => void) | null;
}

export function shuffleWith<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Deterministik rastgelelik kaynağı (testler için). */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 108 kartlık deste: her renkte bir 0, ikişer 1–9/Atla/Yön/+2; 4 Renk seç, 4 Renk seç +4. */
export function buildDeck(): Omit<Card, 'id'>[] {
  const out: Omit<Card, 'id'>[] = [];
  for (const color of COLORS) {
    out.push({ color, value: '0' });
    for (const v of [...NUMBERS.slice(1), ...ACTIONS] as CardValue[]) {
      out.push({ color, value: v });
      out.push({ color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) out.push({ color: null, value: 'wild' }, { color: null, value: 'wild4' });
  return out;
}

/**
 * Karıştırır ve 7'şer dağıtır. Kimlikler karıştırmadan SONRA verilir; böylece kimlikten kart
 * çıkarılamaz.
 */
export function deal(playerIds: string[], rng: Rng, prefix = 'c'): { hands: Record<string, Card[]>; deck: Card[] } {
  const deck = shuffleWith(buildDeck(), rng).map((c, i) => ({ id: `${prefix}${i + 1}`, ...c }));
  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) hands[id] = [];
  for (let r = 0; r < HAND_SIZE; r++) for (const id of playerIds) hands[id]!.push(deck.shift()!);
  return { hands, deck };
}

export function handPoints(hand: Card[]): number {
  return hand.reduce((sum, c) => sum + cardPoints(c), 0);
}

export function createColorCardsGame(
  deps: { random?: Rng; timing?: Partial<ColorCardsTiming> } = {},
): ServerGame<ColorCardsSettings, ColorCardsState, ColorCardsAction> {
  const rng: Rng = deps.random ?? Math.random;
  const timing: ColorCardsTiming = { roundMs: ROUND_MS, podiumMs: PODIUM_MS, ...deps.timing };

  // ---------- yardımcılar ----------

  function log(state: ColorCardsState, entry: Omit<LogEntry, 'seq'>): void {
    state.log.push({ seq: ++state.logSeq, ...entry });
    if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  }

  const face = (c: Card) => ({ color: c.color, value: c.value });

  function isConnected(ctx: GameContext, id: string): boolean {
    return ctx.players().some((p) => p.id === id && p.connected);
  }

  function next(state: ColorCardsState, from: string, k = 1): string {
    const n = state.order.length;
    const i = state.order.indexOf(from);
    if (i < 0 || n === 0) return state.order[0] ?? from;
    return state.order[(((i + state.dir * k) % n) + n) % n]!;
  }

  function top(state: ColorCardsState): Card | null {
    return state.discard.at(-1) ?? null;
  }

  function isPlayable(state: ColorCardsState, card: Card): boolean {
    if (state.drawnId) return card.id === state.drawnId;
    if (state.penalty > 0) return card.value === 'draw2' || card.value === 'wild4';
    if (isWildValue(card.value)) return true;
    if (card.color === state.activeColor) return true;
    const t = top(state);
    return !!t && !isWildValue(t.value) && t.value === card.value;
  }

  /** Eli 2'den fazla olanın "Son kart!" bildirimi düşer; yakalanabilirlik el 1 değilse biter. */
  function tidyCalls(state: ColorCardsState): void {
    for (const id of state.order) if ((state.hands[id]?.length ?? 0) > 2) state.called[id] = false;
    if (state.exposed && state.hands[state.exposed]?.length !== 1) state.exposed = null;
  }

  function refill(state: ColorCardsState): boolean {
    if (state.discard.length <= 1) return false;
    const t = state.discard.pop()!;
    state.deck.push(...shuffleWith(state.discard, rng));
    state.discard = [t];
    log(state, { t: 'reshuffle' });
    return true;
  }

  function drawCards(state: ColorCardsState, id: string, n: number): Card[] {
    const got: Card[] = [];
    for (let i = 0; i < n; i++) {
      if (!state.deck.length && !refill(state)) break;
      const c = state.deck.shift()!;
      state.hands[id]!.push(c);
      got.push(c);
    }
    tidyCalls(state);
    return got;
  }

  // Tur süresi
  function stopClock(state: ColorCardsState): void {
    state.cancelTurn?.();
    state.cancelTurn = null;
    state.turnEndsAt = 0;
  }

  function startClock(ctx: GameContext, state: ColorCardsState): void {
    stopClock(state);
    const ms = state.settings.turnSeconds * 1000;
    if (ms <= 0) return;
    const token = state.turnSeq;
    state.turnEndsAt = ctx.now() + ms;
    state.cancelTurn = ctx.schedule(ms, () => {
      state.cancelTurn = null;
      if (state.turnSeq !== token || !isTurnPhase(state.phase)) return;
      log(state, { t: 'timeout', by: state.current });
      autoAct(ctx, state);
      ctx.pushViews();
    });
  }

  const isTurnPhase = (p: Phase) => p === 'play' || p === 'color' || p === 'challenge';

  function beginTurn(ctx: GameContext, state: ColorCardsState, id: string, phase: Phase = 'play'): void {
    state.current = id;
    state.phase = phase;
    state.drew = false;
    state.drawnId = null;
    state.turnSeq++;
    state.step++;
    startClock(ctx, state);
  }

  /** En çok tuttuğu renk (eşitlikte sabit sıra). */
  function bestColor(hand: Card[]): CardColor {
    let best: CardColor = COLORS[0];
    let max = -1;
    for (const col of COLORS) {
      const n = hand.filter((c) => c.color === col).length;
      if (n > max) {
        max = n;
        best = col;
      }
    }
    return best;
  }

  /** Süre doldu ya da oda sahibi atladı: oyuncu yerine en güvenli hamle. */
  function autoAct(ctx: GameContext, state: ColorCardsState): void {
    state.exposed = null;
    const id = state.current;
    if (state.phase === 'color') {
      chooseStartColor(ctx, state, bestColor(state.hands[id] ?? []));
      return;
    }
    if (state.phase === 'challenge') {
      acceptPenalty(ctx, state);
      return;
    }
    if (state.drew) {
      log(state, { t: 'pass', by: id });
      beginTurn(ctx, state, next(state, id));
      return;
    }
    drawTurn(ctx, state, id);
    if (state.phase === 'play' && state.drew && state.current === id) {
      log(state, { t: 'pass', by: id });
      beginTurn(ctx, state, next(state, id));
    }
  }

  function chooseStartColor(ctx: GameContext, state: ColorCardsState, color: CardColor): void {
    state.activeColor = color;
    log(state, { t: 'color', by: state.current, color });
    beginTurn(ctx, state, state.current);
  }

  function acceptPenalty(ctx: GameContext, state: ColorCardsState): void {
    const ch = state.challenge!;
    drawCards(state, ch.victim, state.penalty);
    log(state, { t: 'accept', by: ch.victim, n: state.penalty });
    state.penalty = 0;
    state.challenge = null;
    beginTurn(ctx, state, next(state, ch.victim));
  }

  /** Sıradaki oyuncu kart çeker (ya da biriken cezayı alır). */
  function drawTurn(ctx: GameContext, state: ColorCardsState, id: string): void {
    if (state.penalty > 0) {
      const n = state.penalty;
      drawCards(state, id, n);
      state.penalty = 0;
      log(state, { t: 'penalty', by: id, n });
      beginTurn(ctx, state, next(state, id));
      return;
    }
    let last: Card | null = null;
    let count = 0;
    const limit = state.settings.drawUntilPlayable ? 200 : 1;
    while (count < limit) {
      const [c] = drawCards(state, id, 1);
      if (!c) break;
      count++;
      last = c;
      if (isPlayable(state, c)) break;
    }
    log(state, { t: 'draw', by: id, n: count });
    if (last && isPlayable(state, last)) {
      state.drew = true;
      state.drawnId = last.id;
      state.step++;
      return;
    }
    beginTurn(ctx, state, next(state, id));
  }

  function rotateHands(state: ColorCardsState): void {
    const out: Record<string, Card[]> = {};
    for (const id of state.order) out[next(state, id)] = state.hands[id]!;
    for (const id of state.order) state.hands[id] = out[id]!;
  }

  function playCard(ctx: GameContext, state: ColorCardsState, id: string, card: Card, color: CardColor | undefined, swapWith: string | null): void {
    const hand = state.hands[id]!;
    const prevColor = state.activeColor;
    hand.splice(
      hand.findIndex((c) => c.id === card.id),
      1,
    );
    const guilty = card.value === 'wild4' && hand.some((c) => c.color === prevColor);
    state.discard.push(card);
    state.activeColor = card.color ?? color!;
    state.drew = false;
    state.drawnId = null;
    state.lastPlay = { seq: ++state.playSeq, by: id, card };
    log(state, { t: 'play', by: id, card: face(card), color: card.color ? undefined : state.activeColor });

    if (hand.length === 0) return finishRound(ctx, state, id, card);
    if (hand.length === 1 && !state.called[id]) state.exposed = id;

    if (state.settings.sevenZero && card.value === '0') {
      rotateHands(state);
      log(state, { t: 'rotate', by: id, n: state.dir });
      tidyCalls(state);
    } else if (state.settings.sevenZero && card.value === '7' && swapWith) {
      const mine = state.hands[id]!;
      state.hands[id] = state.hands[swapWith]!;
      state.hands[swapWith] = mine;
      log(state, { t: 'swap', by: id, to: swapWith });
      tidyCalls(state);
    }

    const n = state.order.length;
    switch (card.value) {
      case 'skip': {
        const skipped = next(state, id);
        log(state, { t: 'skipped', by: skipped });
        beginTurn(ctx, state, next(state, id, 2));
        return;
      }
      case 'reverse': {
        state.dir = state.dir === 1 ? -1 : 1;
        log(state, { t: 'reverse', by: id, n: state.dir });
        // 2 kişide Atla gibi: sıra yine oynayanda.
        beginTurn(ctx, state, n === 2 ? id : next(state, id));
        return;
      }
      case 'draw2': {
        const victim = next(state, id);
        if (state.settings.stacking) {
          state.penalty += 2;
          beginTurn(ctx, state, victim);
          return;
        }
        drawCards(state, victim, 2);
        log(state, { t: 'penalty', by: victim, n: 2 });
        beginTurn(ctx, state, next(state, victim));
        return;
      }
      case 'wild4': {
        const victim = next(state, id);
        state.penalty += 4;
        state.challenge = { by: id, victim, guilty };
        beginTurn(ctx, state, victim, 'challenge');
        return;
      }
      default:
        beginTurn(ctx, state, next(state, id));
    }
  }

  function finishRound(ctx: GameContext, state: ColorCardsState, winner: string, last: Card): void {
    stopClock(state);
    // Son kart +2/+4 ise sıradaki yine çeker (puana sayılır).
    if (last.value === 'draw2' || last.value === 'wild4') {
      const victim = next(state, winner);
      const n = state.penalty + (last.value === 'draw2' ? 2 : 4);
      if (victim !== winner) {
        drawCards(state, victim, n);
        log(state, { t: 'penalty', by: victim, n });
      }
    }
    state.penalty = 0;
    state.challenge = null;
    state.exposed = null;
    const hands = state.order.map((id) => ({ id, cards: state.hands[id]!.length, points: handPoints(state.hands[id]!) }));
    const points = hands.reduce((s, h) => s + h.points, 0);
    if (state.mode === 'points') state.scores[winner] = (state.scores[winner] ?? 0) + points;
    state.roundResult = { winner, points, hands };
    log(state, { t: 'roundWin', by: winner, n: points });

    if (state.mode === 'single' || (state.scores[winner] ?? 0) >= POINT_TARGET) {
      gameOver(ctx, state, winner);
      return;
    }
    state.phase = 'roundOver';
    state.step++;
    state.turnSeq++;
    state.roundEndsAt = ctx.now() + timing.roundMs;
    state.cancelRound = ctx.schedule(timing.roundMs, () => {
      state.cancelRound = null;
      if (state.phase !== 'roundOver') return;
      startRound(ctx, state);
      ctx.pushViews();
    });
  }

  function startRound(ctx: GameContext, state: ColorCardsState): void {
    state.round++;
    const di = state.order.indexOf(state.dealer);
    state.dealer = state.round === 1 && di >= 0 ? state.dealer : state.order[(di + 1) % state.order.length]!;
    const { hands, deck } = deal(state.order, rng, `r${state.round}c`);
    state.hands = hands;
    state.deck = deck;
    state.discard = [];
    state.dir = 1;
    state.penalty = 0;
    state.challenge = null;
    state.reveal = null;
    state.exposed = null;
    state.called = {};
    state.roundResult = null;
    state.lastPlay = null;
    state.roundEndsAt = 0;
    log(state, { t: 'round', by: state.dealer, n: state.round });

    // Açılış kartı; +4 ise desteye geri karıştırılır.
    let first = state.deck.shift()!;
    while (first.value === 'wild4') {
      state.deck.push(first);
      state.deck = shuffleWith(state.deck, rng);
      first = state.deck.shift()!;
    }
    state.discard.push(first);
    state.activeColor = first.color;
    log(state, { t: 'firstCard', card: face(first) });

    const p1 = next(state, state.dealer);
    switch (first.value) {
      case 'skip':
        log(state, { t: 'skipped', by: p1 });
        beginTurn(ctx, state, next(state, p1));
        return;
      case 'reverse':
        state.dir = -1;
        log(state, { t: 'reverse', n: -1 });
        beginTurn(ctx, state, state.dealer);
        return;
      case 'draw2':
        drawCards(state, p1, 2);
        log(state, { t: 'penalty', by: p1, n: 2 });
        beginTurn(ctx, state, next(state, p1));
        return;
      case 'wild':
        beginTurn(ctx, state, p1, 'color');
        return;
      default:
        beginTurn(ctx, state, p1);
    }
  }

  function ranking(state: ColorCardsState): string[] {
    const inGame = [...state.order];
    inGame.sort((a, b) => {
      if (state.mode === 'points') {
        const d = (state.scores[b] ?? 0) - (state.scores[a] ?? 0);
        if (d) return d;
      } else {
        if (a === state.winner) return -1;
        if (b === state.winner) return 1;
      }
      const ha = state.hands[a] ?? [];
      const hb = state.hands[b] ?? [];
      return ha.length - hb.length || handPoints(ha) - handPoints(hb);
    });
    return [...inGame, ...[...state.left].reverse()];
  }

  function gameOver(ctx: GameContext, state: ColorCardsState, winner: string | null): void {
    if (state.phase === 'over') return;
    stopClock(state);
    state.cancelRound?.();
    state.cancelRound = null;
    state.phase = 'over';
    state.winner = winner;
    state.challenge = null;
    state.penalty = 0;
    state.exposed = null;
    state.step++;
    ctx.pushViews();
    ctx.schedule(timing.podiumMs, () => {
      const order = ranking(state);
      const n = order.length;
      const results: GameResult[] = order.map((id, i) => ({
        playerId: id,
        score: state.mode === 'points' ? (state.scores[id] ?? 0) : n - 1 - i,
        meta: { place: i + 1, winner: id === state.winner, cards: state.hands[id]?.length ?? 0 },
      }));
      ctx.finish(results);
    });
  }

  function requireCurrent(state: ColorCardsState, playerId: string, phase: Phase): void {
    if (!state.order.includes(playerId)) throw new GameError('Bu elde oyuncu değilsin; izlemeye devam edebilirsin.');
    if (state.current !== playerId) throw new GameError('Sıra sende değil. Sıran gelince oynayabilirsin.');
    if (state.phase !== phase) {
      if (state.phase === 'challenge') throw new GameError('Önce +4 için itiraz ya da kabul kararı verilmeli.');
      if (state.phase === 'color') throw new GameError('Önce açılış rengi seçilmeli.');
      throw new GameError('Şu an bu hamle yapılamaz.');
    }
  }

  // ---------- oyun ----------

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      if (ids.length < MIN_PLAYERS) throw new GameError('En az 2 oyuncu gerekli.');
      if (ids.length > MAX_PLAYERS) throw new GameError(`En fazla ${MAX_PLAYERS} kişi oynayabilir.`);
      const state: ColorCardsState = {
        settings,
        mode: settings.mode,
        order: ids,
        all: [...ids],
        left: [],
        hands: {},
        deck: [],
        discard: [],
        activeColor: null,
        dir: 1,
        current: ids[0]!,
        phase: 'play',
        step: 0,
        turnSeq: 0,
        penalty: 0,
        drew: false,
        drawnId: null,
        challenge: null,
        reveal: null,
        revealSeq: 0,
        exposed: null,
        called: {},
        log: [],
        logSeq: 0,
        lastPlay: null,
        playSeq: 0,
        scores: Object.fromEntries(ids.map((id) => [id, 0])),
        round: 0,
        dealer: ids[Math.floor(rng() * ids.length)]!,
        roundResult: null,
        winner: null,
        turnEndsAt: 0,
        cancelTurn: null,
        roundEndsAt: 0,
        cancelRound: null,
      };
      log(state, { t: 'start', n: ids.length });
      startRound(ctx, state);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      if (state.phase === 'over') throw new GameError('Oyun bitti.');
      const roundOver = state.phase === 'roundOver';

      switch (action.type) {
        case 'play': {
          if (roundOver) return { ok: true, stale: true };
          const hand = state.hands[playerId];
          const card = hand?.find((c) => c.id === action.cardId);
          if (!card) return { ok: true, stale: true };
          const stackOnFour = state.phase === 'challenge' && state.challenge?.victim === playerId && state.settings.stacking;
          if (stackOnFour) {
            if (card.value !== 'wild4') throw new GameError('+4’ün üstüne yalnızca +4 koyabilirsin. Ya itiraz et ya da cezayı kabul et.');
          } else {
            requireCurrent(state, playerId, 'play');
            if (!isPlayable(state, card)) {
              if (state.drawnId) throw new GameError('Kart çektikten sonra yalnızca çektiğin kartı oynayabilirsin; istemezsen sırayı geçir.');
              if (state.penalty > 0) throw new GameError(`Üstüne +2 ya da +4 koy veya ${state.penalty} kartı çek.`);
              throw new GameError('Bu kart oynanamaz: renk ya da sayı/simge eşleşmeli. Eşleşen kartın yoksa kart çek.');
            }
          }
          let color: CardColor | undefined;
          if (isWildValue(card.value)) {
            if (!action.color) throw new GameError('Joker için bir renk seç.');
            color = action.color;
          }
          let swapWith: string | null = null;
          if (state.settings.sevenZero && card.value === '7' && hand!.length > 1) {
            const others = state.order.filter((id) => id !== playerId);
            swapWith = action.swapWith ?? (others.length === 1 ? others[0]! : null);
            if (!swapWith) throw new GameError('7 oynarken elini değiştireceğin oyuncuyu seç.');
            if (!others.includes(swapWith)) throw new GameError('Bu oyuncuyla el değiştiremezsin; oyundaki başka birini seç.');
          }
          state.exposed = null;
          if (stackOnFour) state.challenge = null;
          playCard(ctx, state, playerId, card, color, swapWith);
          ctx.pushViews();
          return { ok: true };
        }

        case 'draw': {
          if (action.step !== state.step) return { ok: true, stale: true };
          requireCurrent(state, playerId, 'play');
          if (state.drew) throw new GameError('Zaten kart çektin. Çektiğin kartı oyna ya da sırayı geçir.');
          state.exposed = null;
          drawTurn(ctx, state, playerId);
          ctx.pushViews();
          return { ok: true };
        }

        case 'pass': {
          if (action.step !== state.step) return { ok: true, stale: true };
          requireCurrent(state, playerId, 'play');
          if (!state.drew) throw new GameError('Sırayı geçirmeden önce bir kart çekmelisin.');
          state.exposed = null;
          log(state, { t: 'pass', by: playerId });
          beginTurn(ctx, state, next(state, playerId));
          ctx.pushViews();
          return { ok: true };
        }

        case 'pickColor': {
          if (state.phase !== 'color') return { ok: true, stale: true };
          requireCurrent(state, playerId, 'color');
          state.exposed = null;
          chooseStartColor(ctx, state, action.color);
          ctx.pushViews();
          return { ok: true };
        }

        case 'accept':
        case 'challenge': {
          if (action.step !== state.step || state.phase !== 'challenge' || !state.challenge) return { ok: true, stale: true };
          if (state.challenge.victim !== playerId) throw new GameError('+4’e yalnızca sıradaki oyuncu itiraz edebilir.');
          state.exposed = null;
          if (action.type === 'accept') {
            acceptPenalty(ctx, state);
          } else {
            const ch = state.challenge;
            state.reveal = { to: playerId, of: ch.by, cards: [...state.hands[ch.by]!], guilty: ch.guilty, seq: ++state.revealSeq };
            const n = state.penalty;
            state.penalty = 0;
            state.challenge = null;
            if (ch.guilty) {
              drawCards(state, ch.by, n);
              log(state, { t: 'challengeWin', by: playerId, to: ch.by, n });
              beginTurn(ctx, state, playerId);
            } else {
              drawCards(state, playerId, n + 2);
              log(state, { t: 'challengeLose', by: playerId, to: ch.by, n: n + 2 });
              beginTurn(ctx, state, next(state, playerId));
            }
          }
          ctx.pushViews();
          return { ok: true };
        }

        case 'callLast': {
          if (roundOver || !state.order.includes(playerId)) return { ok: true, stale: true };
          const n = state.hands[playerId]?.length ?? 0;
          if (n > 2) throw new GameError('“Son kart!” için elinde en fazla 2 kart olmalı.');
          if (state.called[playerId] && state.exposed !== playerId) return { ok: true, stale: true };
          state.called[playerId] = true;
          if (state.exposed === playerId) state.exposed = null;
          log(state, { t: 'call', by: playerId });
          ctx.pushViews();
          return { ok: true };
        }

        case 'catch': {
          if (roundOver) return { ok: true, stale: true };
          if (!state.order.includes(playerId)) throw new GameError('Yalnızca oyuncular yakalayabilir.');
          if (action.target === playerId) throw new GameError('Kendini yakalayamazsın; “Son kart!” de.');
          if (state.exposed !== action.target) throw new GameError('Yakalanacak kimse yok: ya “Son kart!” dedi ya da geç kaldın.');
          state.exposed = null;
          state.called[action.target] = false;
          drawCards(state, action.target, 2);
          log(state, { t: 'caught', by: playerId, to: action.target, n: 2 });
          ctx.pushViews();
          return { ok: true };
        }

        case 'skipTurn': {
          if (ctx.hostId() !== playerId) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
          if (!isTurnPhase(state.phase)) return { ok: true, stale: true };
          if (isConnected(ctx, state.current)) throw new GameError('Bu oyuncu bağlı; sırasını kendisi oynasın.');
          log(state, { t: 'hostSkip', by: state.current });
          autoAct(ctx, state);
          ctx.pushViews();
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx) {
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, id) {
      if (state.phase === 'over' || !state.order.includes(id)) {
        ctx.pushViews();
        return;
      }
      log(state, { t: 'left', by: id });
      const after = next(state, id);
      const wasCurrent = state.current === id;
      const ch = state.challenge;
      if (state.dealer === id) state.dealer = after;
      // Eli destenin altına karışır.
      state.deck.push(...shuffleWith(state.hands[id] ?? [], rng));
      state.hands[id] = [];
      state.order = state.order.filter((x) => x !== id);
      state.left.push(id);
      delete state.called[id];
      if (state.exposed === id) state.exposed = null;
      if (state.reveal?.to === id) state.reveal = null;

      if (state.order.length < MIN_PLAYERS) {
        gameOver(ctx, state, state.order[0] ?? null);
        return;
      }
      if (state.phase === 'roundOver') {
        ctx.pushViews();
        return;
      }
      if (ch && (ch.victim === id || ch.by === id)) {
        // İtiraz penceresi taraflardan biri gidince kapanır; ceza düşer.
        state.challenge = null;
        state.penalty = 0;
        beginTurn(ctx, state, ch.by === id ? ch.victim : after);
      } else if (wasCurrent) {
        state.penalty = state.phase === 'play' ? state.penalty : 0;
        beginTurn(ctx, state, after, state.phase === 'color' ? 'color' : 'play');
      }
      ctx.pushViews();
    },

    onPlayerConnection(ctx) {
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      // Kazanma modu oyun boyunca sabit; ev kuralları ve süre hemen (süre sıradaki turdan) geçerli.
      state.settings = settings;
      ctx.pushViews();
    },

    end(ctx, state) {
      if (state.phase === 'over') return;
      let winner: string | null = null;
      if (state.mode === 'points') {
        const best = ranking(state)[0];
        if (best && (state.scores[best] ?? 0) > 0) winner = best;
      }
      gameOver(ctx, state, winner);
    },

    viewFor(state, playerId): ColorCardsView {
      const inGame = state.order.includes(playerId);
      const hand = state.hands[playerId] ?? [];
      let playable: string[] = [];
      if (inGame && state.current === playerId) {
        if (state.phase === 'play') playable = hand.filter((c) => isPlayable(state, c)).map((c) => c.id);
        else if (state.phase === 'challenge' && state.settings.stacking) playable = hand.filter((c) => c.value === 'wild4').map((c) => c.id);
      }
      let endsAt = 0;
      let durationMs = 0;
      if (state.phase === 'roundOver') {
        endsAt = state.roundEndsAt;
        durationMs = timing.roundMs;
      } else if (isTurnPhase(state.phase) && state.turnEndsAt) {
        endsAt = state.turnEndsAt;
        durationMs = state.settings.turnSeconds * 1000;
      }
      const r = state.reveal;
      return {
        phase: state.phase,
        mode: state.mode,
        target: POINT_TARGET,
        round: state.round,
        order: state.order,
        players: state.order.map((id) => ({
          id,
          cards: state.hands[id]?.length ?? 0,
          score: state.scores[id] ?? 0,
          called: !!state.called[id],
        })),
        current: state.current,
        dir: state.dir,
        step: state.step,
        top: top(state),
        activeColor: state.activeColor,
        deckCount: state.deck.length,
        discardCount: state.discard.length,
        penalty: state.penalty,
        drew: state.drew,
        drawnId: state.current === playerId ? state.drawnId : null,
        me: { inGame, hand, playable },
        challenge: state.challenge ? { by: state.challenge.by, victim: state.challenge.victim, penalty: state.penalty } : null,
        reveal: r && r.to === playerId ? { seq: r.seq, of: r.of, cards: r.cards, guilty: r.guilty } : null,
        exposed: state.exposed,
        lastPlay: state.lastPlay,
        serverNow: Date.now(),
        endsAt,
        durationMs,
        log: state.log,
        roundResult: state.roundResult,
        winner: state.winner,
        rules: {
          stacking: state.settings.stacking,
          sevenZero: state.settings.sevenZero,
          drawUntilPlayable: state.settings.drawUntilPlayable,
          turnSeconds: state.settings.turnSeconds,
        },
      };
    },

    dispose(state) {
      state.cancelTurn?.();
      state.cancelRound?.();
    },
  };
}
