import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  BASE_COUNTS,
  CAT_KINDS,
  GAME_ID,
  HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  SINGLE_DECK_MAX,
  actionSchema,
  defaultSettings,
  isCat,
  settingsSchema,
  type Card,
  type CardKind,
  type KittenAction,
  type KittenPhase,
  type KittenSettings,
  type KittenView,
  type LogEntry,
  type PendingKind,
} from '../shared/index.js';

export class GameError extends UserFacingError {}

export interface KittenTiming {
  /** İyilik verme, bomba, geri koyma ve ıskartadan seçme süresi. */
  phaseMs: number;
  /** Oyun sonu ekranı, sonra lobi. */
  podiumMs: number;
}

export const PHASE_MS = 25_000;
export const PODIUM_MS = 10_000;
const LOG_LIMIT = 40;

export interface Pending {
  id: number;
  by: string;
  kind: PendingKind;
  cards: Card[];
  target: string | null;
  named: CardKind | null;
  nopes: string[];
  endsAt: number;
}

interface StoredLog {
  entry: LogEntry;
  /** Doluysa `entry.kind` yalnızca bu oyunculara gider. */
  secretFor?: string[];
}

export interface KittenState {
  settings: KittenSettings;
  order: string[];
  alive: string[];
  /** Patlama/ayrılma sırası. */
  out: string[];
  hands: Record<string, Card[]>;
  /** deck[0] = en üst kart. */
  deck: Card[];
  discard: Card[];
  phase: KittenPhase;
  current: string;
  turnsLeft: number;
  /** Bu turlar bir saldırıdan mı geldi (saldırı yığılması için). */
  underAttack: boolean;
  turn: number;
  pending: Pending | null;
  pendingSeq: number;
  favor: { from: string; to: string } | null;
  peek: { owner: string; seq: number; cards: CardKind[] } | null;
  peekSeq: number;
  /** Bombayı geri koyan oyuncu → o bomba kartının kimliği. */
  placed: Record<string, string>;
  /** Çekilip elde bekleyen bomba (bomb/place aşamasında). */
  heldBomb: Card | null;
  log: StoredLog[];
  logSeq: number;
  flash: KittenView['flash'];
  flashSeq: number;
  /** Aşama zamanlayıcısı (pencere, iyilik, bomba, seçim). */
  phaseEndsAt: number;
  cancelPhase: (() => void) | null;
  /** Tur süresi. */
  turnEndsAt: number;
  turnRemaining: number | null;
  cancelTurn: (() => void) | null;
  winner: string | null;
}

export type Rng = () => number;

export function shuffleWith<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Deterministik test/rastgelelik kaynağı. */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dağıtım: herkese 1 Etkisiz Kıl + 7 kart; sonra bombalar ve kalan etkisizler desteye karıştırılır. */
export function deal(playerIds: string[], rng: Rng): { hands: Record<string, Card[]>; deck: Card[] } {
  const n = playerIds.length;
  const decks = n > SINGLE_DECK_MAX ? 2 : 1;
  let seq = 0;
  const make = (kind: CardKind): Card => ({ id: `k${++seq}`, kind });
  // Kimlikler karıştırmadan sonra verilsin diye önce türleri karıştır.
  const kinds: CardKind[] = [];
  for (const [kind, count] of Object.entries(BASE_COUNTS) as [CardKind, number][]) {
    for (let i = 0; i < count * decks; i++) kinds.push(kind);
  }
  const base = shuffleWith(kinds, rng).map(make);
  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) hands[id] = [make('defuse'), ...base.splice(0, HAND_SIZE)];
  const extraDefuse = decks === 2 ? 12 - n : n <= 3 ? 2 : 6 - n;
  const extras: CardKind[] = [...Array<CardKind>(n - 1).fill('bomb'), ...Array<CardKind>(Math.max(0, extraDefuse)).fill('defuse')];
  const deck = shuffleWith([...base, ...extras.map(make)], rng);
  return { hands, deck };
}

export function createKittenGame(deps: { random?: Rng; timing?: Partial<KittenTiming> } = {}): ServerGame<KittenSettings, KittenState, KittenAction> {
  const rng: Rng = deps.random ?? Math.random;
  const timing: KittenTiming = { phaseMs: PHASE_MS, podiumMs: PODIUM_MS, ...deps.timing };

  // ---------- yardımcılar ----------

  function log(state: KittenState, entry: Omit<LogEntry, 'seq'>, secretFor?: string[]): void {
    state.log.push({ entry: { seq: ++state.logSeq, ...entry }, secretFor });
    if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  }

  function isConnected(ctx: GameContext, id: string): boolean {
    return ctx.players().some((p) => p.id === id && p.connected);
  }

  function nextAlive(state: KittenState, from: string): string {
    const i = state.order.indexOf(from);
    for (let k = 1; k <= state.order.length; k++) {
      const id = state.order[(i + k) % state.order.length]!;
      if (state.alive.includes(id)) return id;
    }
    return from;
  }

  function takeFromHand(state: KittenState, playerId: string, cardId: string): Card | null {
    const hand = state.hands[playerId] ?? [];
    const i = hand.findIndex((c) => c.id === cardId);
    if (i < 0) return null;
    return hand.splice(i, 1)[0]!;
  }

  function clearPhaseTimer(state: KittenState): void {
    state.cancelPhase?.();
    state.cancelPhase = null;
    state.phaseEndsAt = 0;
  }

  function setPhaseTimer(ctx: GameContext, state: KittenState, ms: number, fn: () => void): void {
    clearPhaseTimer(state);
    state.phaseEndsAt = ctx.now() + ms;
    state.cancelPhase = ctx.schedule(ms, fn);
  }

  // Tur süresi: yalnızca "play" aşamasında işler; pencere ve ara aşamalarda durur.
  function stopClock(state: KittenState): void {
    state.cancelTurn?.();
    state.cancelTurn = null;
    state.turnEndsAt = 0;
    state.turnRemaining = null;
  }

  function startClock(ctx: GameContext, state: KittenState, ms?: number): void {
    stopClock(state);
    const total = ms ?? state.settings.turnSeconds * 1000;
    if (total <= 0) return;
    const turn = state.turn;
    state.turnEndsAt = ctx.now() + total;
    state.cancelTurn = ctx.schedule(total, () => {
      if (state.phase !== 'play' || state.turn !== turn) return;
      state.cancelTurn = null;
      log(state, { t: 'timeout', by: state.current });
      drawFor(ctx, state, !isConnected(ctx, state.current));
      ctx.pushViews();
    });
  }

  function pauseClock(ctx: GameContext, state: KittenState): void {
    if (!state.cancelTurn) return;
    const left = Math.max(1000, state.turnEndsAt - ctx.now());
    stopClock(state);
    state.turnRemaining = left;
  }

  function resumeClock(ctx: GameContext, state: KittenState): void {
    if (state.turnRemaining !== null) startClock(ctx, state, state.turnRemaining);
  }

  function toPlay(ctx: GameContext, state: KittenState): void {
    clearPhaseTimer(state);
    state.phase = 'play';
    state.favor = null;
    resumeClock(ctx, state);
  }

  function beginTurn(ctx: GameContext, state: KittenState, playerId: string, turns: number, underAttack: boolean): void {
    clearPhaseTimer(state);
    state.pending = null;
    state.favor = null;
    state.heldBomb = null;
    state.current = playerId;
    state.turnsLeft = turns;
    state.underAttack = underAttack;
    state.turn++;
    state.phase = 'play';
    log(state, { t: 'turn', by: playerId, n: turns });
    startClock(ctx, state);
  }

  /** Bir tur bitti (kart çekildi ya da Atla). Kalan tur varsa aynı oyuncu devam eder. */
  function endOneTurn(ctx: GameContext, state: KittenState): void {
    if (state.peek?.owner === state.current) state.peek = null;
    state.turnsLeft--;
    if (state.turnsLeft > 0) {
      clearPhaseTimer(state);
      state.heldBomb = null;
      state.turn++;
      state.phase = 'play';
      startClock(ctx, state);
    } else {
      beginTurn(ctx, state, nextAlive(state, state.current), 1, false);
    }
  }

  function gameOver(ctx: GameContext, state: KittenState): void {
    if (state.phase === 'over') return;
    clearPhaseTimer(state);
    stopClock(state);
    state.phase = 'over';
    state.pending = null;
    state.favor = null;
    state.heldBomb = null;
    state.winner = state.alive.length === 1 ? state.alive[0]! : null;
    ctx.pushViews();
    state.cancelPhase = ctx.schedule(timing.podiumMs, () => {
      const outlived = state.out.length;
      ctx.finish(
        state.order.map((id) => {
          const i = state.out.indexOf(id);
          const score = i >= 0 ? i : outlived;
          return { playerId: id, score, meta: { place: i >= 0 ? state.order.length - i : 1, winner: id === state.winner } };
        }),
      );
    });
  }

  /** Oyuncu oyundan çıkar (patladı ya da odadan ayrıldı). Eli ıskartaya gider. */
  function eliminate(ctx: GameContext, state: KittenState, id: string): void {
    if (!state.alive.includes(id)) return;
    const wasCurrent = state.current === id;
    const next = nextAlive(state, id);
    state.alive = state.alive.filter((x) => x !== id);
    state.out.push(id);
    state.discard.push(...(state.hands[id] ?? []));
    state.hands[id] = [];
    delete state.placed[id];
    if (state.peek?.owner === id) state.peek = null;
    if (state.alive.length <= 1) return gameOver(ctx, state);
    if (wasCurrent) {
      beginTurn(ctx, state, next, 1, false);
      return;
    }
    // Başkasının sırasında: onu bekleyen bir aşama varsa çöz.
    if (state.phase === 'favor' && state.favor?.to === id) {
      log(state, { t: 'empty', by: state.favor.from, to: id, action: 'favor' });
      toPlay(ctx, state);
    }
    // Bekleyen eylemin hedefi gittiyse pencere kapanınca eylem boşa düşer (applyPending kontrol eder).
  }

  function explode(ctx: GameContext, state: KittenState, id: string): void {
    state.heldBomb = null;
    state.flash = { seq: ++state.flashSeq, t: 'boom', by: id };
    log(state, { t: 'boom', by: id });
    eliminate(ctx, state, id);
  }

  /** Bombayı destede `index` konumuna koy (0 = üst). */
  function placeBomb(ctx: GameContext, state: KittenState, index: number): void {
    const bomb = state.heldBomb;
    if (!bomb) return;
    const at = Math.max(0, Math.min(index, state.deck.length));
    state.deck.splice(at, 0, bomb);
    state.placed[state.current] = bomb.id;
    state.heldBomb = null;
    log(state, { t: 'placed', by: state.current });
    endOneTurn(ctx, state);
  }

  function useDefuse(ctx: GameContext, state: KittenState): boolean {
    const hand = state.hands[state.current] ?? [];
    const i = hand.findIndex((c) => c.kind === 'defuse');
    if (i < 0) return false;
    state.discard.push(hand.splice(i, 1)[0]!);
    state.flash = { seq: ++state.flashSeq, t: 'defuse', by: state.current };
    log(state, { t: 'defuse', by: state.current });
    return true;
  }

  /** Bomba aşamasından geri koyma aşamasına. */
  function enterPlace(ctx: GameContext, state: KittenState): void {
    state.phase = 'place';
    setPhaseTimer(ctx, state, timing.phaseMs, () => {
      if (state.phase !== 'place') return;
      placeBomb(ctx, state, Math.floor(rng() * (state.deck.length + 1)));
      ctx.pushViews();
    });
  }

  /**
   * Sıradaki oyuncu için kart çek. `auto` (bağlantı kopuk / oda sahibi atladı): bomba gelirse
   * etkisiz varsa otomatik kullanılır ve bomba en üste konur.
   */
  function drawFor(ctx: GameContext, state: KittenState, auto: boolean): void {
    const id = state.current;
    stopClock(state);
    const card = state.deck.shift();
    if (!card) {
      // Teoride olmaz (destede her zaman en az bir bomba vardır); yine de kilitlenme.
      endOneTurn(ctx, state);
      return;
    }
    if (card.kind !== 'bomb') {
      state.hands[id]!.push(card);
      log(state, { t: 'draw', by: id, kind: card.kind }, [id]);
      endOneTurn(ctx, state);
      return;
    }
    log(state, { t: 'bomb', by: id });
    state.heldBomb = card;
    const hasDefuse = (state.hands[id] ?? []).some((c) => c.kind === 'defuse');
    if (!hasDefuse) return explode(ctx, state, id);
    if (auto) {
      useDefuse(ctx, state);
      placeBomb(ctx, state, 0);
      return;
    }
    state.phase = 'bomb';
    setPhaseTimer(ctx, state, timing.phaseMs, () => {
      if (state.phase !== 'bomb') return;
      useDefuse(ctx, state);
      placeBomb(ctx, state, Math.floor(rng() * (state.deck.length + 1)));
      ctx.pushViews();
    });
  }

  function classify(cards: Card[], fiveCats: boolean): PendingKind {
    const kinds = cards.map((c) => c.kind);
    const [first] = kinds;
    if (cards.length === 1) {
      if (first === 'attack' || first === 'skip' || first === 'future' || first === 'shuffle' || first === 'favor') return first;
      if (first === 'nope') throw new GameError('Hayır kartını yalnızca biri bir eylem oynadığında, geri sayım sırasında oynayabilirsin.');
      if (first === 'defuse') throw new GameError('Etkisiz Kıl yalnızca bomba çektiğinde oynanır.');
      if (first && isCat(first)) throw new GameError('Kedi kartları tek başına oynanmaz; aynı kediden 2 ya da 3 tane seç.');
      throw new GameError('Bu kart oynanamaz.');
    }
    const allSameCat = kinds.every((k) => k === first) && first !== undefined && isCat(first);
    if (cards.length === 2 && allSameCat) return 'pair';
    if (cards.length === 3 && allSameCat) return 'triple';
    if (cards.length === 5 && CAT_KINDS.every((k) => kinds.includes(k))) {
      if (!fiveCats) throw new GameError('5 farklı kedi kuralı bu odada kapalı.');
      return 'five';
    }
    throw new GameError('Bu kartlar birlikte oynanmaz. Aynı kediden 2 ya da 3 tane, ya da 5 farklı kedi seç.');
  }

  function openPending(ctx: GameContext, state: KittenState, p: Omit<Pending, 'id' | 'nopes' | 'endsAt'>): void {
    pauseClock(ctx, state);
    const ms = state.settings.nopeSeconds * 1000;
    state.pending = { ...p, id: ++state.pendingSeq, nopes: [], endsAt: ctx.now() + ms };
    state.phase = 'nope';
    state.discard.push(...p.cards);
    log(state, { t: 'play', by: p.by, to: p.target ?? undefined, action: p.kind, kind: p.named ?? undefined, n: p.cards.length });
    armWindow(ctx, state);
  }

  function armWindow(ctx: GameContext, state: KittenState): void {
    const p = state.pending!;
    const ms = state.settings.nopeSeconds * 1000;
    p.endsAt = ctx.now() + ms;
    setPhaseTimer(ctx, state, ms, () => {
      if (state.phase !== 'nope' || state.pending?.id !== p.id) return;
      closeWindow(ctx, state);
      ctx.pushViews();
    });
  }

  function closeWindow(ctx: GameContext, state: KittenState): void {
    const p = state.pending!;
    state.pending = null;
    clearPhaseTimer(state);
    if (p.nopes.length % 2 === 1) {
      log(state, { t: 'cancelled', by: p.by, action: p.kind });
      toPlay(ctx, state);
      return;
    }
    applyPending(ctx, state, p);
  }

  function applyPending(ctx: GameContext, state: KittenState, p: Pending): void {
    const me = p.by;
    const target = p.target && state.alive.includes(p.target) ? p.target : null;
    switch (p.kind) {
      case 'attack': {
        const turns = (state.underAttack ? state.turnsLeft : 0) + 2;
        if (state.peek?.owner === me) state.peek = null;
        beginTurn(ctx, state, nextAlive(state, me), turns, true);
        return;
      }
      case 'skip': {
        endOneTurn(ctx, state);
        return;
      }
      case 'future': {
        state.peek = { owner: me, seq: ++state.peekSeq, cards: state.deck.slice(0, 3).map((c) => c.kind) };
        log(state, { t: 'future', by: me });
        toPlay(ctx, state);
        return;
      }
      case 'shuffle': {
        state.deck = shuffleWith(state.deck, rng);
        state.placed = {};
        state.peek = null;
        log(state, { t: 'shuffle', by: me });
        toPlay(ctx, state);
        return;
      }
      case 'favor': {
        if (!target || !(state.hands[target] ?? []).length) {
          log(state, { t: 'empty', by: me, to: p.target ?? undefined, action: 'favor' });
          toPlay(ctx, state);
          return;
        }
        state.favor = { from: me, to: target };
        state.phase = 'favor';
        const auto = () => {
          if (state.phase !== 'favor' || state.favor?.to !== target) return;
          const hand = state.hands[target]!;
          giveCard(ctx, state, hand[Math.floor(rng() * hand.length)]!.id);
        };
        if (!isConnected(ctx, target)) auto();
        else
          setPhaseTimer(ctx, state, timing.phaseMs, () => {
            auto();
            ctx.pushViews();
          });
        return;
      }
      case 'pair': {
        const hand = target ? state.hands[target]! : [];
        if (!target || !hand.length) {
          log(state, { t: 'empty', by: me, to: p.target ?? undefined, action: 'pair' });
        } else {
          const [card] = hand.splice(Math.floor(rng() * hand.length), 1);
          state.hands[me]!.push(card!);
          log(state, { t: 'steal', by: me, to: target, kind: card!.kind }, [me, target]);
        }
        toPlay(ctx, state);
        return;
      }
      case 'triple': {
        const hand = target ? state.hands[target]! : [];
        const i = hand.findIndex((c) => c.kind === p.named);
        if (target && i >= 0) {
          state.hands[me]!.push(hand.splice(i, 1)[0]!);
          log(state, { t: 'named', by: me, to: target, kind: p.named, ok: true });
        } else {
          log(state, { t: 'named', by: me, to: p.target ?? undefined, kind: p.named, ok: false });
        }
        toPlay(ctx, state);
        return;
      }
      case 'five': {
        if (!state.discard.length) {
          log(state, { t: 'empty', by: me, action: 'five' });
          toPlay(ctx, state);
          return;
        }
        state.phase = 'pick';
        setPhaseTimer(ctx, state, timing.phaseMs, () => {
          if (state.phase !== 'pick') return;
          pickCard(ctx, state, state.discard[Math.floor(rng() * state.discard.length)]!.id);
          ctx.pushViews();
        });
        return;
      }
    }
  }

  function giveCard(ctx: GameContext, state: KittenState, cardId: string): void {
    const f = state.favor!;
    const card = takeFromHand(state, f.to, cardId);
    if (!card) throw new GameError('Bu kart elinde yok.');
    state.hands[f.from]!.push(card);
    log(state, { t: 'favorGive', by: f.to, to: f.from, kind: card.kind }, [f.from, f.to]);
    toPlay(ctx, state);
  }

  function pickCard(ctx: GameContext, state: KittenState, cardId: string): void {
    const i = state.discard.findIndex((c) => c.id === cardId);
    if (i < 0) throw new GameError('Bu kart ıskartada yok.');
    const card = state.discard.splice(i, 1)[0]!;
    state.hands[state.current]!.push(card);
    log(state, { t: 'pick', by: state.current, kind: card.kind });
    toPlay(ctx, state);
  }

  function requireTarget(state: KittenState, me: string, target: string | undefined): string {
    if (!target) throw new GameError('Önce bir oyuncu seç.');
    if (target === me) throw new GameError('Kendini seçemezsin; başka bir oyuncu seç.');
    if (!state.alive.includes(target)) throw new GameError('Bu oyuncu oyunda değil; başka birini seç.');
    if (!(state.hands[target] ?? []).length) throw new GameError('Bu oyuncunun elinde kart yok; başka birini seç.');
    return target;
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
      const { hands, deck } = deal(ids, rng);
      const first = ids[Math.floor(rng() * ids.length)]!;
      const state: KittenState = {
        settings,
        order: ids,
        alive: [...ids],
        out: [],
        hands,
        deck,
        discard: [],
        phase: 'play',
        current: first,
        turnsLeft: 1,
        underAttack: false,
        turn: 0,
        pending: null,
        pendingSeq: 0,
        favor: null,
        peek: null,
        peekSeq: 0,
        placed: {},
        heldBomb: null,
        log: [],
        logSeq: 0,
        flash: null,
        flashSeq: 0,
        phaseEndsAt: 0,
        cancelPhase: null,
        turnEndsAt: 0,
        turnRemaining: null,
        cancelTurn: null,
        winner: null,
      };
      log(state, { t: 'start', n: ids.length > SINGLE_DECK_MAX ? 2 : 1 });
      beginTurn(ctx, state, first, 1, false);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      if (state.phase === 'over') throw new GameError('Oyun bitti.');
      const isCurrent = playerId === state.current;

      switch (action.type) {
        case 'play': {
          if (!state.alive.includes(playerId)) throw new GameError('Oyunda değilsin; izlemeye devam edebilirsin.');
          if (!isCurrent) throw new GameError('Sıra sende değil. Sıran gelince kart oynayabilirsin.');
          if (state.phase !== 'play') throw new GameError('Önce bekleyen eylemin sonucunu bekle.');
          const ids = [...new Set(action.cardIds)];
          const hand = state.hands[playerId]!;
          const cards = ids.map((id) => hand.find((c) => c.id === id));
          // Çift tıklama: kartlar zaten oynandıysa sessizce yut.
          if (cards.some((c) => !c)) return { ok: true, stale: true };
          const played = cards as Card[];
          const kind = classify(played, state.settings.fiveCats);
          let target: string | null = null;
          let named: CardKind | null = null;
          if (kind === 'favor' || kind === 'pair' || kind === 'triple') target = requireTarget(state, playerId, action.target);
          if (kind === 'triple') {
            if (!action.named) throw new GameError('İstediğin kartın adını seç.');
            if (action.named === 'bomb') throw new GameError('Bomba istenemez; başka bir kart seç.');
            named = action.named;
          }
          for (const c of played) takeFromHand(state, playerId, c.id);
          openPending(ctx, state, { by: playerId, kind, cards: played, target, named });
          ctx.pushViews();
          return { ok: true, pendingId: state.pending?.id };
        }

        case 'nope': {
          if (state.phase !== 'nope' || !state.pending || state.pending.id !== action.pendingId) return { ok: true, stale: true };
          if (!state.alive.includes(playerId)) throw new GameError('Oyunda değilsin.');
          const hand = state.hands[playerId] ?? [];
          const card = hand.find((c) => c.id === action.cardId);
          if (!card) return { ok: true, stale: true };
          if (card.kind !== 'nope') throw new GameError('Bu bir Hayır kartı değil.');
          takeFromHand(state, playerId, card.id);
          state.discard.push(card);
          state.pending.nopes.push(playerId);
          log(state, { t: 'nope', by: playerId, n: state.pending.nopes.length });
          armWindow(ctx, state);
          ctx.pushViews();
          return { ok: true };
        }

        case 'draw': {
          if (action.turn !== state.turn && state.order.includes(playerId)) return { ok: true, stale: true };
          if (!isCurrent || !state.alive.includes(playerId)) throw new GameError('Sıra sende değil.');
          if (state.phase !== 'play') throw new GameError('Önce bekleyen eylemin sonucunu bekle.');
          drawFor(ctx, state, false);
          ctx.pushViews();
          return { ok: true };
        }

        case 'defuse': {
          if (state.phase !== 'bomb') return { ok: true, stale: true };
          if (!isCurrent) throw new GameError('Bombayı çeken oyuncu etkisiz kılar.');
          if (!useDefuse(ctx, state)) {
            explode(ctx, state, playerId);
          } else {
            enterPlace(ctx, state);
          }
          ctx.pushViews();
          return { ok: true };
        }

        case 'place': {
          if (state.phase !== 'place') return { ok: true, stale: true };
          if (!isCurrent) throw new GameError('Bombayı yalnızca etkisiz kılan oyuncu yerleştirir.');
          if (action.index > state.deck.length) throw new GameError('Destede bu kadar kart yok; başka bir konum seç.');
          placeBomb(ctx, state, action.index);
          ctx.pushViews();
          return { ok: true };
        }

        case 'give': {
          if (state.phase !== 'favor' || !state.favor) return { ok: true, stale: true };
          if (state.favor.to !== playerId) throw new GameError('Kartı İyilik istenen oyuncu verir.');
          if (!(state.hands[playerId] ?? []).some((c) => c.id === action.cardId)) return { ok: true, stale: true };
          giveCard(ctx, state, action.cardId);
          ctx.pushViews();
          return { ok: true };
        }

        case 'pick': {
          if (state.phase !== 'pick') return { ok: true, stale: true };
          if (!isCurrent) throw new GameError('Iskartadan yalnızca kedileri oynayan seçer.');
          pickCard(ctx, state, action.cardId);
          ctx.pushViews();
          return { ok: true };
        }

        case 'skipTurn': {
          if (ctx.hostId() !== playerId) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
          if (state.phase !== 'play') throw new GameError('Sıra şu an bir eylemi bekliyor; süre dolunca kendiliğinden ilerler.');
          if (isConnected(ctx, state.current)) throw new GameError('Bu oyuncu bağlı; sırasını kendisi oynasın.');
          log(state, { t: 'hostSkip', by: state.current });
          drawFor(ctx, state, true);
          ctx.pushViews();
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx) {
      // Oyun sürerken gelen izler.
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      if (state.phase !== 'over' && state.alive.includes(playerId)) {
        log(state, { t: 'left', by: playerId });
        if (state.pending?.by === playerId) {
          state.pending = null;
          clearPhaseTimer(state);
        }
        eliminate(ctx, state, playerId);
        // Destedeki bomba sayısı (hayatta − 1) dengede kalsın.
        if ((state.phase as KittenPhase) !== 'over') {
          const extra = state.deck.filter((c) => c.kind === 'bomb').length - (state.alive.length - 1);
          for (let k = 0; k < extra; k++) {
            const bombs = state.deck.flatMap((c, i) => (c.kind === 'bomb' ? [i] : []));
            state.deck.splice(bombs[Math.floor(rng() * bombs.length)]!, 1);
          }
          for (const [owner, id] of Object.entries(state.placed)) if (!state.deck.some((c) => c.id === id)) delete state.placed[owner];
        }
      }
      ctx.pushViews();
    },

    onPlayerConnection(ctx, state, playerId, connected) {
      // İyilik istenen oyuncu koptuysa beklemeden rastgele bir kart gider.
      if (!connected && state.phase === 'favor' && state.favor?.to === playerId) {
        const hand = state.hands[playerId] ?? [];
        if (hand.length) giveCard(ctx, state, hand[Math.floor(rng() * hand.length)]!.id);
      }
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      state.settings = settings;
      ctx.pushViews();
    },

    end(ctx, state) {
      gameOver(ctx, state);
    },

    viewFor(state, playerId): KittenView {
      const inGame = state.order.includes(playerId);
      const p = state.pending;
      const deckIndexOf = (cardId: string | undefined) => {
        if (!cardId) return null;
        const i = state.deck.findIndex((c) => c.id === cardId);
        return i >= 0 ? i : null;
      };
      let endsAt = 0;
      let durationMs = 0;
      if (state.phase === 'nope' && p) {
        endsAt = p.endsAt;
        durationMs = state.settings.nopeSeconds * 1000;
      } else if (state.phase === 'play') {
        endsAt = state.turnEndsAt;
        durationMs = state.settings.turnSeconds * 1000;
      } else if (state.phase !== 'over') {
        endsAt = state.phaseEndsAt;
        durationMs = timing.phaseMs;
      }
      return {
        phase: state.phase,
        order: state.order,
        players: state.order.map((id) => ({
          id,
          alive: state.alive.includes(id),
          cards: (state.hands[id] ?? []).length,
          out: state.out.includes(id) ? state.out.indexOf(id) + 1 : null,
        })),
        current: state.current,
        turnsLeft: state.turnsLeft,
        turn: state.turn,
        me: { inGame, alive: state.alive.includes(playerId), hand: state.hands[playerId] ?? [] },
        deckCount: state.deck.length,
        discardTop: state.discard.at(-1)?.kind ?? null,
        discardCount: state.discard.length,
        pending: p
          ? {
              id: p.id,
              by: p.by,
              kind: p.kind,
              cards: p.cards.map((c) => c.kind),
              target: p.target,
              named: p.named,
              nopes: p.nopes,
              willHappen: p.nopes.length % 2 === 0,
              endsAt: p.endsAt,
            }
          : null,
        favor: state.favor,
        peek: state.peek && state.peek.owner === playerId ? { seq: state.peek.seq, cards: state.peek.cards } : null,
        myBomb: deckIndexOf(state.placed[playerId]),
        discardPick: state.phase === 'pick' && state.current === playerId ? state.discard : null,
        serverNow: Date.now(),
        endsAt,
        durationMs,
        log: state.log.map(({ entry, secretFor }) =>
          secretFor && !secretFor.includes(playerId) ? { ...entry, kind: null } : entry,
        ),
        flash: state.flash,
        winner: state.winner,
        fiveCats: state.settings.fiveCats,
      };
    },

    dispose(state) {
      state.cancelPhase?.();
      state.cancelTurn?.();
    },
  };
}
