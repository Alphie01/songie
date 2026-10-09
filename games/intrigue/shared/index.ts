import { z } from 'zod';

export const GAME_ID = 'intrigue';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
/** 2–6 kişide rol başına 3 kart; 7–10 kişide (ya da ayar açıksa) 4 kart. */
export const SMALL_TABLE_MAX = 6;
export const START_COINS = 2;
export const HAND_SIZE = 2;
export const COUP_COST = 7;
export const ASSASSINATE_COST = 3;
export const MUST_COUP_AT = 10;

/** Roller (özgün): hazine, gizli bıçak, koruma, yağma, istihbarat. */
export const ROLES = ['treasurer', 'assassin', 'guard', 'pirate', 'spy'] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = ['income', 'aid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'] as const;
export type ActionKind = (typeof ACTIONS)[number];

/** Eylemin iddia ettiği rol (yoksa null: herkes yapabilir). */
export const ACTION_ROLE: Record<ActionKind, Role | null> = {
  income: null,
  aid: null,
  coup: null,
  tax: 'treasurer',
  assassinate: 'assassin',
  steal: 'pirate',
  exchange: 'spy',
};

/** Eylemi hangi roller engelleyebilir. */
export const BLOCK_ROLES: Record<ActionKind, Role[]> = {
  income: [],
  aid: ['treasurer'],
  coup: [],
  tax: [],
  assassinate: ['guard'],
  steal: ['pirate', 'spy'],
  exchange: [],
};

export const TARGETED: Record<ActionKind, boolean> = {
  income: false,
  aid: false,
  coup: true,
  tax: false,
  assassinate: true,
  steal: true,
  exchange: false,
};

export const ACTION_COST: Record<ActionKind, number> = {
  income: 0,
  aid: 0,
  coup: COUP_COST,
  tax: 0,
  assassinate: ASSASSINATE_COST,
  steal: 0,
  exchange: 0,
};

export const CHALLENGE_OPTIONS = [5, 8, 12] as const;
/** 0 = süresiz. */
export const TURN_OPTIONS = [0, 45, 90] as const;

export const settingsSchema = z.object({
  /** İtiraz/engel penceresi (saniye). Herkes "geç" derse erken kapanır. */
  challengeSeconds: z.number().int().min(3).max(30),
  /** Tur süresi (saniye); 0 = süresiz. Süre biterse oyuncu yerine Gelir alınır. */
  turnSeconds: z.number().int().min(0).max(300),
  /** Rol başına 4 kart (7–10 kişide kendiliğinden açık). */
  bigDeck: z.boolean(),
});
export type IntrigueSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: IntrigueSettings = {
  challengeSeconds: 8,
  turnSeconds: 0,
  bigDeck: false,
};

export function cardsPerRole(players: number, bigDeck: boolean): number {
  return bigDeck || players > SMALL_TABLE_MAX ? 4 : 3;
}

const id = z.string().min(1).max(64);

export const actionSchema = z.discriminatedUnion('type', [
  /** Sıradaki oyuncu eylemini seçer. `turn` çift tıklamayı ayıklar. */
  z.object({ type: z.literal('act'), turn: z.number().int(), action: z.enum(ACTIONS), target: id.optional() }),
  /** Açık pencerede iddiaya "Yalan!". */
  z.object({ type: z.literal('challenge'), windowId: z.number().int() }),
  /** Açık pencerede itiraz etmeden / engellemeden geç. */
  z.object({ type: z.literal('pass'), windowId: z.number().int() }),
  /** Açık pencerede eylemi bir rolle engelle. */
  z.object({ type: z.literal('block'), windowId: z.number().int(), role: z.enum(ROLES) }),
  /** Kart kaybederken açılacak kart. */
  z.object({ type: z.literal('lose'), cardId: id }),
  /** Değiş tokuş: saklanacak kartlar. */
  z.object({ type: z.literal('exchange'), keep: z.array(id).min(1).max(2) }),
  /** Oda sahibi: bağlantısı kopan oyuncu(lar) yerine varsayılanı uygula. */
  z.object({ type: z.literal('hostDefault') }),
]);
export type IntrigueAction = z.infer<typeof actionSchema>;

export interface Card {
  id: string;
  role: Role;
}

export type IntriguePhase = 'action' | 'window' | 'lose' | 'exchange' | 'over';

/**
 * Pencere türü:
 * - `claim`: rol iddia eden eyleme itiraz (hedef bu sırada engelleyebilir).
 * - `block`: yalnızca engelleme (Yardım iste ya da itirazdan sonra hedefin engel şansı).
 * - `counter`: engele itiraz.
 */
export type WindowKind = 'claim' | 'block' | 'counter';

export type LoseReason = 'challenge' | 'coup' | 'assassinate' | 'left';

export type LogType =
  | 'start'
  | 'turn'
  | 'act'
  | 'block'
  | 'challenge'
  | 'lose'
  | 'out'
  | 'done'
  | 'blocked'
  | 'failed'
  | 'timeout'
  | 'hostDefault'
  | 'left';

export interface LogEntry {
  seq: number;
  t: LogType;
  by?: string;
  to?: string;
  action?: ActionKind;
  role?: Role;
  /** challenge: iddia eden kartı gösterebildi mi. */
  ok?: boolean;
  n?: number;
}

export interface PlayerInfo {
  id: string;
  coins: number;
  /** Gizli kart sayısı. */
  hidden: number;
  /** Açılmış kartlar (herkese açık). */
  revealed: Role[];
  alive: boolean;
  /** Elenme sırası (1 = ilk elenen); oyundaysa null. */
  out: number | null;
}

export interface PendingView {
  actor: string;
  action: ActionKind;
  target: string | null;
  claim: Role | null;
  block: { by: string; role: Role } | null;
}

export interface WindowView {
  id: number;
  kind: WindowKind;
  /** İtiraz edilen ya da edilebilecek kişi. */
  claimant: string;
  claimRole: Role | null;
  /** Bu pencerede söz hakkı olanlar. */
  eligible: string[];
  passed: string[];
  canChallenge: boolean;
  /** Engelleyebilecek oyuncular ve roller. */
  blockers: string[];
  blockRoles: Role[];
  endsAt: number;
}

export interface IntrigueView {
  phase: IntriguePhase;
  order: string[];
  players: PlayerInfo[];
  current: string;
  turn: number;
  me: { inGame: boolean; alive: boolean; hand: Card[]; coins: number };
  deckCount: number;
  cardsPerRole: number;
  pending: PendingView | null;
  window: WindowView | null;
  lose: { player: string; reason: LoseReason } | null;
  /** Değiş tokuş: yalnızca oynayana, eldeki + çekilen kartlar ve kaç tane saklanacağı. */
  exchange: { options: Card[]; keep: number } | null;
  exchanging: string | null;
  serverNow: number;
  endsAt: number;
  durationMs: number;
  log: LogEntry[];
  /** Son itirazda gösterilen kart (herkese açık). */
  flash: { seq: number; claimant: string; challenger: string; role: Role; had: boolean } | null;
  winner: string | null;
}
