import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  ACTION_COST,
  ACTION_ROLE,
  BLOCK_ROLES,
  GAME_ID,
  HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MUST_COUP_AT,
  ROLES,
  START_COINS,
  TARGETED,
  actionSchema,
  cardsPerRole,
  defaultSettings,
  settingsSchema,
  type ActionKind,
  type Card,
  type IntrigueAction,
  type IntriguePhase,
  type IntrigueSettings,
  type IntrigueView,
  type LogEntry,
  type LoseReason,
  type Role,
  type WindowKind,
} from '../shared/index.js';

export class GameError extends UserFacingError {}

export interface IntrigueTiming {
  /** Kart seçme (kaybetme) süresi; dolarsa rastgele kart açılır. */
  loseMs: number;
  /** Değiş tokuş seçim süresi; dolarsa eldeki kartlar kalır. */
  exchangeMs: number;
  /** Oyun sonu ekranı, sonra lobi. */
  podiumMs: number;
}

export const LOSE_MS = 20_000;
export const EXCHANGE_MS = 30_000;
export const PODIUM_MS = 10_000;
const LOG_LIMIT = 50;

export type Rng = () => number;

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

/** Dağıtım: rol başına `perRole` kart karıştırılır, herkese 2 kart. Kart kimlikleri rol bilgisi taşımaz. */
export function deal(playerIds: string[], perRole: number, rng: Rng): { hands: Record<string, Card[]>; deck: Card[] } {
  const roles: Role[] = [];
  for (const r of ROLES) for (let i = 0; i < perRole; i++) roles.push(r);
  // Kimlikler karıştırmadan sonra verilsin ki sıradan rol çıkarılamasın.
  const cards = shuffleWith(roles, rng).map((role, i) => ({ id: `card-${i + 1}`, role }));
  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) hands[id] = cards.splice(0, HAND_SIZE);
  return { hands, deck: cards };
}

export interface Pending {
  actor: string;
  action: ActionKind;
  target: string | null;
  claim: Role | null;
  block: { by: string; role: Role } | null;
}

export interface Window {
  id: number;
  kind: WindowKind;
  eligible: string[];
  passed: string[];
  endsAt: number;
}

/** Kart kayıpları bittikten sonra yapılacak adım. */
export type Step = 'postClaim' | 'resolve' | 'blocked' | 'failed' | 'endTurn';

export interface IntrigueState {
  settings: IntrigueSettings;
  clock: () => number;
  order: string[];
  alive: string[];
  out: string[];
  coins: Record<string, number>;
  hands: Record<string, Card[]>;
  revealed: Record<string, Role[]>;
  /** deck[0] = en üst. */
  deck: Card[];
  perRole: number;
  phase: IntriguePhase;
  current: string;
  turn: number;
  pending: Pending | null;
  window: Window | null;
  windowSeq: number;
  /** Sırayla kart kaybedecekler. */
  losses: { player: string; reason: LoseReason }[];
  lose: { player: string; reason: LoseReason } | null;
  next: Step | null;
  exchange: { options: Card[]; keep: number } | null;
  log: LogEntry[];
  logSeq: number;
  flash: IntrigueView['flash'];
  flashSeq: number;
  phaseEndsAt: number;
  cancelPhase: (() => void) | null;
  turnEndsAt: number;
  cancelTurn: (() => void) | null;
  winner: string | null;
}

export function createIntrigueGame(
  deps: { random?: Rng; timing?: Partial<IntrigueTiming> } = {},
): ServerGame<IntrigueSettings, IntrigueState, IntrigueAction> {
  const rng: Rng = deps.random ?? Math.random;
  const timing: IntrigueTiming = { loseMs: LOSE_MS, exchangeMs: EXCHANGE_MS, podiumMs: PODIUM_MS, ...deps.timing };

  // ---------- yardımcılar ----------

  function log(state: IntrigueState, entry: Omit<LogEntry, 'seq'>): void {
    state.log.push({ seq: ++state.logSeq, ...entry });
    if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  }

  function isConnected(ctx: GameContext, id: string): boolean {
    return ctx.players().some((p) => p.id === id && p.connected);
  }

  const isAlive = (state: IntrigueState, id: string | null | undefined) => !!id && state.alive.includes(id);

  function nextAlive(state: IntrigueState, from: string): string {
    const i = state.order.indexOf(from);
    for (let k = 1; k <= state.order.length; k++) {
      const id = state.order[(i + k) % state.order.length]!;
      if (state.alive.includes(id)) return id;
    }
    return from;
  }

  function clearPhaseTimer(state: IntrigueState): void {
    state.cancelPhase?.();
    state.cancelPhase = null;
    state.phaseEndsAt = 0;
  }

  function setPhaseTimer(ctx: GameContext, state: IntrigueState, ms: number, fn: () => void): void {
    clearPhaseTimer(state);
    state.phaseEndsAt = ctx.now() + ms;
    state.cancelPhase = ctx.schedule(ms, () => {
      state.cancelPhase = null;
      fn();
      ctx.pushViews();
    });
  }

  function stopClock(state: IntrigueState): void {
    state.cancelTurn?.();
    state.cancelTurn = null;
    state.turnEndsAt = 0;
  }

  function startClock(ctx: GameContext, state: IntrigueState): void {
    stopClock(state);
    const ms = state.settings.turnSeconds * 1000;
    if (ms <= 0) return;
    const turn = state.turn;
    state.turnEndsAt = ctx.now() + ms;
    state.cancelTurn = ctx.schedule(ms, () => {
      state.cancelTurn = null;
      if (state.phase !== 'action' || state.turn !== turn) return;
      log(state, { t: 'timeout', by: state.current });
      defaultAction(ctx, state);
      ctx.pushViews();
    });
  }

  function beginTurn(ctx: GameContext, state: IntrigueState, playerId: string): void {
    clearPhaseTimer(state);
    state.pending = null;
    state.window = null;
    state.lose = null;
    state.losses = [];
    state.next = null;
    state.exchange = null;
    state.current = playerId;
    state.turn++;
    state.phase = 'action';
    log(state, { t: 'turn', by: playerId });
    startClock(ctx, state);
  }

  function endTurn(ctx: GameContext, state: IntrigueState): void {
    if (state.phase === 'over') return;
    if (state.alive.length <= 1) return gameOver(ctx, state);
    beginTurn(ctx, state, nextAlive(state, state.current));
  }

  function gameOver(ctx: GameContext, state: IntrigueState): void {
    if (state.phase === 'over') return;
    clearPhaseTimer(state);
    stopClock(state);
    state.phase = 'over';
    state.pending = null;
    state.window = null;
    state.lose = null;
    state.losses = [];
    state.exchange = null;
    state.winner = state.alive.length === 1 ? state.alive[0]! : null;
    ctx.pushViews();
    state.cancelPhase = ctx.schedule(timing.podiumMs, () => {
      const outCount = state.out.length;
      ctx.finish(
        state.order.map((id) => {
          const i = state.out.indexOf(id);
          const score = i >= 0 ? i : outCount;
          return {
            playerId: id,
            score,
            meta: { place: i >= 0 ? state.order.length - i : 1, winner: id === state.winner },
          };
        }),
      );
    });
  }

  /** Kartı açar; son kartıysa oyuncu elenir. */
  function reveal(state: IntrigueState, playerId: string, cardId: string): void {
    const hand = state.hands[playerId] ?? [];
    const i = hand.findIndex((c) => c.id === cardId);
    if (i < 0) return;
    const [card] = hand.splice(i, 1);
    state.revealed[playerId]!.push(card!.role);
    log(state, { t: 'lose', by: playerId, role: card!.role });
    if (hand.length === 0) eliminate(state, playerId);
  }

  function eliminate(state: IntrigueState, playerId: string): void {
    if (!state.alive.includes(playerId)) return;
    state.alive = state.alive.filter((x) => x !== playerId);
    state.out.push(playerId);
    log(state, { t: 'out', by: playerId });
    // Elenen oyuncunun altınları hazineye döner.
    state.coins[playerId] = 0;
    state.losses = state.losses.filter((l) => l.player !== playerId);
    if (state.window) {
      state.window.eligible = state.window.eligible.filter((x) => x !== playerId);
      state.window.passed = state.window.passed.filter((x) => x !== playerId);
    }
  }

  function randomCard(state: IntrigueState, playerId: string): string {
    const hand = state.hands[playerId]!;
    return hand[Math.floor(rng() * hand.length)]!.id;
  }

  /** Kart kaybı kuyruğunu işler; bitince `state.next` adımını çalıştırır. */
  function drain(ctx: GameContext, state: IntrigueState): void {
    for (;;) {
      if (state.phase === 'over') return;
      const item = state.losses.shift();
      if (!item) break;
      if (!isAlive(state, item.player)) continue;
      const hand = state.hands[item.player]!;
      if (hand.length === 1) {
        reveal(state, item.player, hand[0]!.id);
        continue;
      }
      state.phase = 'lose';
      state.lose = item;
      state.window = null;
      setPhaseTimer(ctx, state, timing.loseMs, () => {
        if (state.phase !== 'lose' || state.lose !== item) return;
        loseCard(ctx, state, randomCard(state, item.player));
      });
      return;
    }
    state.lose = null;
    clearPhaseTimer(state);
    if (state.alive.length <= 1) return gameOver(ctx, state);
    const step = state.next ?? 'endTurn';
    state.next = null;
    runStep(ctx, state, step);
  }

  function queueLoss(state: IntrigueState, player: string, reason: LoseReason): void {
    state.losses.push({ player, reason });
  }

  function loseCard(ctx: GameContext, state: IntrigueState, cardId: string): void {
    const item = state.lose!;
    reveal(state, item.player, cardId);
    state.lose = null;
    drain(ctx, state);
  }

  function runStep(ctx: GameContext, state: IntrigueState, step: Step): void {
    const p = state.pending;
    if (!p || !isAlive(state, p.actor)) return endTurn(ctx, state);
    switch (step) {
      case 'postClaim': {
        // İddia doğru çıktı. Engellenebilir eylemse hedef hâlâ engelleyebilir.
        if (BLOCK_ROLES[p.action].length && !p.block && isAlive(state, p.target)) {
          openWindow(ctx, state, 'block');
          return;
        }
        return resolveAction(ctx, state);
      }
      case 'resolve':
        return resolveAction(ctx, state);
      case 'blocked':
        log(state, { t: 'blocked', by: p.block?.by, to: p.actor, action: p.action, role: p.block?.role });
        return endTurn(ctx, state);
      case 'failed':
        log(state, { t: 'failed', by: p.actor, action: p.action });
        return endTurn(ctx, state);
      case 'endTurn':
        return endTurn(ctx, state);
    }
  }

  function resolveAction(ctx: GameContext, state: IntrigueState): void {
    const p = state.pending!;
    state.window = null;
    clearPhaseTimer(state);
    const me = p.actor;
    switch (p.action) {
      case 'income':
        state.coins[me]! += 1;
        log(state, { t: 'done', by: me, action: p.action, n: 1 });
        return endTurn(ctx, state);
      case 'aid':
        state.coins[me]! += 2;
        log(state, { t: 'done', by: me, action: p.action, n: 2 });
        return endTurn(ctx, state);
      case 'tax':
        state.coins[me]! += 3;
        log(state, { t: 'done', by: me, action: p.action, n: 3 });
        return endTurn(ctx, state);
      case 'steal': {
        if (!isAlive(state, p.target)) return endTurn(ctx, state);
        const n = Math.min(2, state.coins[p.target!]!);
        state.coins[p.target!]! -= n;
        state.coins[me]! += n;
        log(state, { t: 'done', by: me, to: p.target!, action: p.action, n });
        return endTurn(ctx, state);
      }
      case 'coup':
      case 'assassinate': {
        if (!isAlive(state, p.target)) return endTurn(ctx, state);
        log(state, { t: 'done', by: me, to: p.target!, action: p.action });
        queueLoss(state, p.target!, p.action);
        state.next = 'endTurn';
        return drain(ctx, state);
      }
      case 'exchange': {
        const drawn = state.deck.splice(0, 2);
        const hand = state.hands[me]!;
        state.exchange = { options: [...hand, ...drawn], keep: hand.length };
        state.phase = 'exchange';
        log(state, { t: 'done', by: me, action: p.action, n: drawn.length });
        if (!isConnected(ctx, me)) return finishExchange(ctx, state, hand.map((c) => c.id));
        setPhaseTimer(ctx, state, timing.exchangeMs, () => {
          if (state.phase !== 'exchange' || state.pending !== p) return;
          finishExchange(ctx, state, state.hands[me]!.map((c) => c.id));
        });
        return;
      }
    }
  }

  function finishExchange(ctx: GameContext, state: IntrigueState, keep: string[]): void {
    const ex = state.exchange!;
    const me = state.current;
    const kept = ex.options.filter((c) => keep.includes(c.id));
    const back = ex.options.filter((c) => !keep.includes(c.id));
    state.hands[me] = kept;
    state.deck = shuffleWith([...state.deck, ...back], rng);
    state.exchange = null;
    clearPhaseTimer(state);
    endTurn(ctx, state);
  }

  /** Pencereyi açar. Söz hakkı olan kimse yoksa hemen kapanır. */
  function openWindow(ctx: GameContext, state: IntrigueState, kind: WindowKind): void {
    const p = state.pending!;
    let eligible: string[];
    if (kind === 'claim') eligible = state.alive.filter((x) => x !== p.actor);
    else if (kind === 'counter') eligible = state.alive.filter((x) => x !== p.block!.by);
    else eligible = p.action === 'aid' ? state.alive.filter((x) => x !== p.actor) : state.alive.filter((x) => x === p.target);
    const ms = state.settings.challengeSeconds * 1000;
    const w: Window = {
      id: ++state.windowSeq,
      kind,
      eligible,
      passed: eligible.filter((x) => !isConnected(ctx, x)),
      endsAt: ctx.now() + ms,
    };
    state.window = w;
    state.phase = 'window';
    if (w.passed.length >= w.eligible.length) return closeWindow(ctx, state);
    setPhaseTimer(ctx, state, ms, () => {
      if (state.window?.id !== w.id) return;
      closeWindow(ctx, state);
    });
  }

  /** Herkes geçti ya da süre doldu. */
  function closeWindow(ctx: GameContext, state: IntrigueState): void {
    const w = state.window!;
    state.window = null;
    clearPhaseTimer(state);
    // claim/block: eylem gerçekleşir; counter: engel geçerli.
    runStep(ctx, state, w.kind === 'counter' ? 'blocked' : 'resolve');
  }

  function blockersOf(state: IntrigueState, w: Window): string[] {
    const p = state.pending!;
    if (w.kind === 'counter' || p.block || !BLOCK_ROLES[p.action].length) return [];
    if (p.action === 'aid') return w.eligible;
    return w.eligible.filter((x) => x === p.target);
  }

  function claimantOf(state: IntrigueState, w: Window): { id: string; role: Role | null } {
    const p = state.pending!;
    if (w.kind === 'counter') return { id: p.block!.by, role: p.block!.role };
    return { id: p.actor, role: p.claim };
  }

  function challenge(ctx: GameContext, state: IntrigueState, challenger: string): void {
    const w = state.window!;
    const { id: claimant, role } = claimantOf(state, w);
    const hand = state.hands[claimant]!;
    const card = hand.find((c) => c.role === role);
    state.window = null;
    clearPhaseTimer(state);
    state.flash = { seq: ++state.flashSeq, claimant, challenger, role: role!, had: !!card };
    log(state, { t: 'challenge', by: challenger, to: claimant, role: role!, ok: !!card });
    if (card) {
      // Gösterilen kart desteye karışır, yerine yenisi çekilir.
      hand.splice(hand.indexOf(card), 1);
      state.deck = shuffleWith([...state.deck, card], rng);
      hand.push(state.deck.shift()!);
      queueLoss(state, challenger, 'challenge');
      state.next = w.kind === 'counter' ? 'blocked' : 'postClaim';
    } else {
      queueLoss(state, claimant, 'challenge');
      state.next = w.kind === 'counter' ? 'resolve' : 'failed';
    }
    drain(ctx, state);
  }

  function pass(ctx: GameContext, state: IntrigueState, playerIds: string[]): void {
    const w = state.window!;
    for (const id of playerIds) if (w.eligible.includes(id) && !w.passed.includes(id)) w.passed.push(id);
    if (w.passed.length >= w.eligible.length) closeWindow(ctx, state);
  }

  function declare(ctx: GameContext, state: IntrigueState, action: ActionKind, target: string | null): void {
    const me = state.current;
    stopClock(state);
    state.coins[me]! -= ACTION_COST[action];
    const p: Pending = { actor: me, action, target, claim: ACTION_ROLE[action], block: null };
    state.pending = p;
    log(state, { t: 'act', by: me, to: target ?? undefined, action, role: p.claim ?? undefined });
    if (p.claim) return openWindow(ctx, state, 'claim');
    if (action === 'aid') return openWindow(ctx, state, 'block');
    resolveAction(ctx, state);
  }

  /** Süre dolan ya da kopan oyuncu için: Gelir (10+ altında rastgele birine Darbe). */
  function defaultAction(ctx: GameContext, state: IntrigueState): void {
    const me = state.current;
    if (state.coins[me]! >= MUST_COUP_AT) {
      const others = state.alive.filter((x) => x !== me);
      declare(ctx, state, 'coup', others[Math.floor(rng() * others.length)]!);
    } else {
      declare(ctx, state, 'income', null);
    }
  }

  function validateAct(state: IntrigueState, me: string, action: ActionKind, target: string | undefined): string | null {
    const coins = state.coins[me]!;
    if (coins >= MUST_COUP_AT && action !== 'coup') throw new GameError(`${MUST_COUP_AT} ya da daha fazla altının var; bu turda Darbe yapmak zorundasın.`);
    if (coins < ACTION_COST[action]) throw new GameError(`Bunun için ${ACTION_COST[action]} altın gerekli; önce altın topla.`);
    if (!TARGETED[action]) return null;
    if (!target) throw new GameError('Önce bir hedef oyuncu seç.');
    if (target === me) throw new GameError('Kendini hedef alamazsın; başka bir oyuncu seç.');
    if (!state.alive.includes(target)) throw new GameError('Bu oyuncu oyunda değil; başka birini seç.');
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
      const perRole = cardsPerRole(ids.length, settings.bigDeck);
      const { hands, deck } = deal(ids, perRole, rng);
      const first = ids[Math.floor(rng() * ids.length)]!;
      const coins: Record<string, number> = {};
      const revealed: Record<string, Role[]> = {};
      for (const id of ids) {
        // İki kişilik klasik kural: başlayan oyuncu 1 altınla başlar.
        coins[id] = ids.length === 2 && id === first ? START_COINS - 1 : START_COINS;
        revealed[id] = [];
      }
      const state: IntrigueState = {
        settings,
        clock: () => ctx.now(),
        order: ids,
        alive: [...ids],
        out: [],
        coins,
        hands,
        revealed,
        deck,
        perRole,
        phase: 'action',
        current: first,
        turn: 0,
        pending: null,
        window: null,
        windowSeq: 0,
        losses: [],
        lose: null,
        next: null,
        exchange: null,
        log: [],
        logSeq: 0,
        flash: null,
        flashSeq: 0,
        phaseEndsAt: 0,
        cancelPhase: null,
        turnEndsAt: 0,
        cancelTurn: null,
        winner: null,
      };
      log(state, { t: 'start', n: perRole });
      beginTurn(ctx, state, first);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      if (state.phase === 'over') throw new GameError('Oyun bitti.');

      switch (action.type) {
        case 'act': {
          if (action.turn !== state.turn || state.phase !== 'action') return { ok: true, stale: true };
          if (!state.alive.includes(playerId)) throw new GameError('Oyunda değilsin; izlemeye devam edebilirsin.');
          if (playerId !== state.current) throw new GameError('Sıra sende değil. Sıran gelince eylem seçebilirsin.');
          const target = validateAct(state, playerId, action.action, action.target);
          declare(ctx, state, action.action, target);
          ctx.pushViews();
          return { ok: true };
        }

        case 'challenge': {
          const w = state.window;
          if (state.phase !== 'window' || !w || w.id !== action.windowId) return { ok: true, stale: true };
          if (w.kind === 'block') throw new GameError('Burada itiraz edilecek bir iddia yok; engelle ya da geç.');
          if (!w.eligible.includes(playerId)) throw new GameError('Bu iddiaya itiraz edemezsin.');
          if (w.passed.includes(playerId)) throw new GameError('Bu pencerede geçtin; sıradaki iddiayı bekle.');
          challenge(ctx, state, playerId);
          ctx.pushViews();
          return { ok: true };
        }

        case 'pass': {
          const w = state.window;
          if (state.phase !== 'window' || !w || w.id !== action.windowId) return { ok: true, stale: true };
          if (!w.eligible.includes(playerId)) throw new GameError('Bu pencerede söz hakkın yok.');
          pass(ctx, state, [playerId]);
          ctx.pushViews();
          return { ok: true };
        }

        case 'block': {
          const w = state.window;
          if (state.phase !== 'window' || !w || w.id !== action.windowId) return { ok: true, stale: true };
          const p = state.pending!;
          if (!blockersOf(state, w).includes(playerId)) {
            throw new GameError(p.action === 'aid' || !BLOCK_ROLES[p.action].length ? 'Bu eylemi engelleyemezsin.' : 'Bu eylemi yalnızca hedef alınan oyuncu engelleyebilir.');
          }
          if (w.passed.includes(playerId)) throw new GameError('Bu pencerede geçtin.');
          if (!BLOCK_ROLES[p.action].includes(action.role)) throw new GameError('Bu rol bu eylemi engellemez; başka bir rol seç.');
          p.block = { by: playerId, role: action.role };
          log(state, { t: 'block', by: playerId, to: p.actor, action: p.action, role: action.role });
          openWindow(ctx, state, 'counter');
          ctx.pushViews();
          return { ok: true };
        }

        case 'lose': {
          if (state.phase !== 'lose' || !state.lose) return { ok: true, stale: true };
          if (state.lose.player !== playerId) throw new GameError('Kart kaybeden sen değilsin.');
          if (!state.hands[playerId]!.some((c) => c.id === action.cardId)) return { ok: true, stale: true };
          loseCard(ctx, state, action.cardId);
          ctx.pushViews();
          return { ok: true };
        }

        case 'exchange': {
          if (state.phase !== 'exchange' || !state.exchange) return { ok: true, stale: true };
          if (playerId !== state.current) throw new GameError('Değiş tokuşu yapan oyuncu seçer.');
          const keep = [...new Set(action.keep)];
          if (keep.length !== state.exchange.keep) throw new GameError(`Tam ${state.exchange.keep} kart seç.`);
          if (!keep.every((id) => state.exchange!.options.some((c) => c.id === id))) return { ok: true, stale: true };
          finishExchange(ctx, state, keep);
          ctx.pushViews();
          return { ok: true };
        }

        case 'hostDefault': {
          if (ctx.hostId() !== playerId) throw new GameError('Bunu yalnızca oda sahibi yapabilir.');
          const off = (id: string) => !isConnected(ctx, id);
          if (state.phase === 'action') {
            if (!off(state.current)) throw new GameError('Sıradaki oyuncu bağlı; sırasını kendisi oynasın.');
            log(state, { t: 'hostDefault', by: state.current });
            defaultAction(ctx, state);
          } else if (state.phase === 'window' && state.window) {
            const w = state.window;
            const waiting = w.eligible.filter((x) => !w.passed.includes(x) && off(x));
            if (!waiting.length) throw new GameError('Bağlantısı kopan ve beklenen oyuncu yok.');
            for (const id of waiting) log(state, { t: 'hostDefault', by: id });
            pass(ctx, state, waiting);
          } else if (state.phase === 'lose' && state.lose) {
            if (!off(state.lose.player)) throw new GameError('Bu oyuncu bağlı; kartını kendisi seçsin.');
            log(state, { t: 'hostDefault', by: state.lose.player });
            loseCard(ctx, state, randomCard(state, state.lose.player));
          } else if (state.phase === 'exchange') {
            if (!off(state.current)) throw new GameError('Bu oyuncu bağlı; kartlarını kendisi seçsin.');
            log(state, { t: 'hostDefault', by: state.current });
            finishExchange(ctx, state, state.hands[state.current]!.map((c) => c.id));
          } else {
            throw new GameError('Şu an beklenen bir oyuncu yok.');
          }
          ctx.pushViews();
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx) {
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      if (state.phase === 'over' || !state.alive.includes(playerId)) return ctx.pushViews();
      log(state, { t: 'left', by: playerId });
      const hand = state.hands[playerId]!;
      while (hand.length) {
        const c = hand.shift()!;
        state.revealed[playerId]!.push(c.role);
      }
      const wasLosing = state.lose?.player === playerId;
      eliminate(state, playerId);
      if (state.alive.length <= 1) return gameOver(ctx, state);
      const p = state.pending;
      if (wasLosing) {
        // Kart seçmesi beklenen oyuncu ayrıldı: kuyruğun kalanı (ve sonraki adım) devam eder.
        state.lose = null;
        drain(ctx, state);
      } else if (state.current === playerId && state.phase !== 'lose') {
        // Sıradaki oyuncu ayrıldı: turu bitir (başkası kart seçiyorsa o bitince tur kendiliğinden biter).
        endTurn(ctx, state);
      } else if (state.phase === 'window' && state.window) {
        const w = state.window;
        if (w.kind === 'counter' && p?.block?.by === playerId) {
          // Engelleyen ayrıldı: engel düşer, eylem gerçekleşir.
          state.window = null;
          runStep(ctx, state, 'resolve');
        } else if (w.passed.length >= w.eligible.length) {
          closeWindow(ctx, state);
        }
      }
      ctx.pushViews();
    },

    onPlayerConnection(ctx, state, playerId, connected) {
      // Kopan oyuncu açık pencerede beklenmez.
      if (!connected && state.phase === 'window' && state.window?.eligible.includes(playerId)) {
        pass(ctx, state, [playerId]);
      }
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      // Deste boyutu oyun başında belirlenir; süreler bir sonraki pencereden/turdan itibaren.
      state.settings = { ...settings, bigDeck: state.settings.bigDeck };
      ctx.pushViews();
    },

    end(ctx, state) {
      gameOver(ctx, state);
    },

    viewFor(state, playerId): IntrigueView {
      const inGame = state.order.includes(playerId);
      const p = state.pending;
      const w = state.window;
      let endsAt = 0;
      let durationMs = 0;
      if (state.phase === 'window' && w) {
        endsAt = w.endsAt;
        durationMs = state.settings.challengeSeconds * 1000;
      } else if (state.phase === 'action') {
        endsAt = state.turnEndsAt;
        durationMs = state.turnEndsAt ? state.settings.turnSeconds * 1000 : 0;
      } else if (state.phase === 'lose') {
        endsAt = state.phaseEndsAt;
        durationMs = timing.loseMs;
      } else if (state.phase === 'exchange') {
        endsAt = state.phaseEndsAt;
        durationMs = timing.exchangeMs;
      }
      const claimant = w ? claimantOf(state, w) : null;
      const blockers = w ? blockersOf(state, w) : [];
      return {
        phase: state.phase,
        order: state.order,
        players: state.order.map((id) => ({
          id,
          coins: state.coins[id] ?? 0,
          hidden: (state.hands[id] ?? []).length,
          revealed: state.revealed[id] ?? [],
          alive: state.alive.includes(id),
          out: state.out.includes(id) ? state.out.indexOf(id) + 1 : null,
        })),
        current: state.current,
        turn: state.turn,
        me: {
          inGame,
          alive: state.alive.includes(playerId),
          hand: state.hands[playerId] ?? [],
          coins: state.coins[playerId] ?? 0,
        },
        deckCount: state.deck.length,
        cardsPerRole: state.perRole,
        pending: p ? { actor: p.actor, action: p.action, target: p.target, claim: p.claim, block: p.block } : null,
        window:
          w && claimant
            ? {
                id: w.id,
                kind: w.kind,
                claimant: claimant.id,
                claimRole: w.kind === 'block' ? null : claimant.role,
                eligible: w.eligible,
                passed: w.passed,
                canChallenge: w.kind !== 'block',
                blockers,
                blockRoles: blockers.length && p ? BLOCK_ROLES[p.action] : [],
                endsAt: w.endsAt,
              }
            : null,
        lose: state.lose,
        exchange: state.exchange && state.current === playerId ? state.exchange : null,
        exchanging: state.phase === 'exchange' ? state.current : null,
        serverNow: state.clock(),
        endsAt,
        durationMs,
        log: state.log,
        flash: state.flash,
        winner: state.winner,
      };
    },

    dispose(state) {
      state.cancelPhase?.();
      state.cancelTurn?.();
    },
  };
}
