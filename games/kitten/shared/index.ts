import { z } from 'zod';

export const GAME_ID = 'kitten';

export const MIN_PLAYERS = 2;
/** Tek deste 2–5 kişi; 6–10 kişide otomatik olarak iki deste kullanılır. */
export const SINGLE_DECK_MAX = 5;
export const MAX_PLAYERS = 10;
export const HAND_SIZE = 7;

export const CAT_KINDS = ['sarman', 'tekir', 'pamuk', 'kara', 'benek'] as const;
export type CatKind = (typeof CAT_KINDS)[number];

export const CARD_KINDS = ['bomb', 'defuse', 'attack', 'skip', 'future', 'shuffle', 'favor', 'nope', ...CAT_KINDS] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const isCat = (k: CardKind): k is CatKind => (CAT_KINDS as readonly string[]).includes(k);

/** Tek destedeki adetler (bomba ve etkisiz kıl oyuncu sayısına göre ayrıca eklenir). */
export const BASE_COUNTS: Record<Exclude<CardKind, 'bomb' | 'defuse'>, number> = {
  attack: 4,
  skip: 4,
  future: 5,
  shuffle: 4,
  favor: 4,
  nope: 5,
  sarman: 4,
  tekir: 4,
  pamuk: 4,
  kara: 4,
  benek: 4,
};

export const NOPE_OPTIONS = [3, 5, 8] as const;
/** 0 = süresiz. */
export const TURN_OPTIONS = [0, 30, 60] as const;

export const settingsSchema = z.object({
  /** "Hayır" penceresi (saniye). Her Hayır ile yeniden başlar. */
  nopeSeconds: z.number().int().min(2).max(15),
  /** Tur süresi (saniye); 0 = süresiz. Süre biterse otomatik kart çekilir. */
  turnSeconds: z.number().int().min(0).max(300),
  /** 5 farklı kedi kartı ile ıskartadan istediğin kartı al. */
  fiveCats: z.boolean(),
});
export type KittenSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: KittenSettings = {
  nopeSeconds: 5,
  turnSeconds: 0,
  fiveCats: true,
};

const cardId = z.string().min(1).max(20);

export const actionSchema = z.discriminatedUnion('type', [
  /**
   * Sıradaki oyuncu kart(lar) oynar.
   * 1 kart: attack/skip/future/shuffle/favor(target). 2 aynı kedi: target. 3 aynı kedi: target + named.
   * 5 farklı kedi: ıskartadan seçim (ayar açıksa).
   */
  z.object({
    type: z.literal('play'),
    cardIds: z.array(cardId).min(1).max(5),
    target: z.string().max(64).optional(),
    named: z.enum(CARD_KINDS).optional(),
  }),
  /** Açık pencereye Hayır (ya da Hayır'a Hayır). */
  z.object({ type: z.literal('nope'), pendingId: z.number().int(), cardId }),
  /** Kart çekerek sırayı bitir. `turn` çift tıklamayı ayıklar. */
  z.object({ type: z.literal('draw'), turn: z.number().int() }),
  /** Bomba çektin: Etkisiz Kıl oyna. */
  z.object({ type: z.literal('defuse') }),
  /** Bombayı geri koy: 0 = en üst, deste sayısı = en alt. */
  z.object({ type: z.literal('place'), index: z.number().int().min(0) }),
  /** İyilik İste hedefi: vereceğin kart. */
  z.object({ type: z.literal('give'), cardId }),
  /** 5 farklı kedi: ıskartadan seçilen kart. */
  z.object({ type: z.literal('pick'), cardId }),
  /** Oda sahibi: bağlantısı kopan oyuncunun sırasını atla (onun yerine kart çekilir). */
  z.object({ type: z.literal('skipTurn') }),
]);
export type KittenAction = z.infer<typeof actionSchema>;

export interface Card {
  id: string;
  kind: CardKind;
}

/** Hayır penceresinde bekleyen eylem türü. */
export type PendingKind = 'attack' | 'skip' | 'future' | 'shuffle' | 'favor' | 'pair' | 'triple' | 'five';

export type KittenPhase = 'play' | 'nope' | 'favor' | 'bomb' | 'place' | 'pick' | 'over';

export type LogType =
  | 'start'
  | 'turn'
  | 'play'
  | 'nope'
  | 'cancelled'
  | 'draw'
  | 'bomb'
  | 'defuse'
  | 'placed'
  | 'boom'
  | 'future'
  | 'shuffle'
  | 'favorGive'
  | 'steal'
  | 'named'
  | 'pick'
  | 'empty'
  | 'timeout'
  | 'hostSkip'
  | 'left';

export interface LogEntry {
  seq: number;
  t: LogType;
  by?: string;
  to?: string;
  /** Oynanan eylem (play/cancelled). */
  action?: PendingKind;
  /** İlgili kart. Gizli olaylarda yalnızca taraflara gönderilir, diğerlerine null. */
  kind?: CardKind | null;
  n?: number;
  ok?: boolean;
}

export interface PlayerInfo {
  id: string;
  alive: boolean;
  cards: number;
  /** Patlama sırası (1 = ilk patlayan); hayattaysa null. */
  out: number | null;
}

export interface PendingView {
  id: number;
  by: string;
  kind: PendingKind;
  cards: CardKind[];
  target: string | null;
  named: CardKind | null;
  nopes: string[];
  /** Pencere şimdi kapansa eylem uygulanır mı (Hayır sayısı çift mi). */
  willHappen: boolean;
  endsAt: number;
}

export interface KittenView {
  phase: KittenPhase;
  order: string[];
  players: PlayerInfo[];
  current: string;
  turnsLeft: number;
  /** Her tur başında artar; `draw` hamlesine eklenir. */
  turn: number;
  me: { inGame: boolean; alive: boolean; hand: Card[] };
  deckCount: number;
  discardTop: CardKind | null;
  discardCount: number;
  pending: PendingView | null;
  /** İyilik İste: isteyen ve veren. */
  favor: { from: string; to: string } | null;
  /** Geleceği Gör: yalnızca oynayana, üstten alta. */
  peek: { seq: number; cards: CardKind[] } | null;
  /** Bombayı geri koyduysan şu anki konumu (0 = en üst); yalnızca koyana. */
  myBomb: number | null;
  /** 5 farklı kedi: yalnızca seçen oyuncuya ıskarta. */
  discardPick: Card[] | null;
  serverNow: number;
  /** Aşamanın (ya da tur süresinin) bitiş anı; 0 = süresiz. */
  endsAt: number;
  durationMs: number;
  log: LogEntry[];
  /** Son dramatik olay (patlama / etkisiz kılma). */
  flash: { seq: number; t: 'boom' | 'defuse'; by: string } | null;
  winner: string | null;
  fiveCats: boolean;
}
