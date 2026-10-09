import { z } from 'zod';

export const GAME_ID = 'color-cards';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const HAND_SIZE = 7;
/** Puan modunda oyunu kazanmak için gereken puan. */
export const POINT_TARGET = 500;

/** Dört renk (tokens.css): yeşil, sarı, kırmızı, mor. */
export const COLORS = ['green', 'yellow', 'red', 'purple'] as const;
export type CardColor = (typeof COLORS)[number];

export const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export const ACTIONS = ['skip', 'reverse', 'draw2'] as const;
export const WILDS = ['wild', 'wild4'] as const;
export const VALUES = [...NUMBERS, ...ACTIONS, ...WILDS] as const;
export type CardValue = (typeof VALUES)[number];

export const isWildValue = (v: CardValue): v is (typeof WILDS)[number] => v === 'wild' || v === 'wild4';
export const isNumberValue = (v: CardValue): boolean => (NUMBERS as readonly string[]).includes(v);

export interface Card {
  id: string;
  /** Jokerlerde null. */
  color: CardColor | null;
  value: CardValue;
}

/** Resmî puan değerleri: sayı kendi değeri, Atla/Yön/+2 20, jokerler 50. */
export function cardPoints(c: Pick<Card, 'value'>): number {
  if (isWildValue(c.value)) return 50;
  if (isNumberValue(c.value)) return Number(c.value);
  return 20;
}

/** 0 = süresiz. */
export const TURN_OPTIONS = [0, 20, 40] as const;

export const settingsSchema = z.object({
  /** Kazanma: tek el (eli ilk bitiren) ya da puan modu (500'e ilk ulaşan). */
  mode: z.enum(['single', 'points']),
  /** Tur süresi (saniye); 0 = süresiz. Süre dolarsa otomatik çekilir ve sıra geçer. */
  turnSeconds: z.number().int().min(0).max(120),
  /** Ev kuralı: +2 üstüne +2/+4, +4 üstüne +4 konabilir; ceza birikir. */
  stacking: z.boolean(),
  /** Ev kuralı: 0 oynanınca eller oyun yönünde döner, 7 oynanınca seçilen oyuncuyla el değiştirilir. */
  sevenZero: z.boolean(),
  /** Ev kuralı: oynanabilir kart gelene kadar çekilir. */
  drawUntilPlayable: z.boolean(),
});
export type ColorCardsSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: ColorCardsSettings = {
  mode: 'single',
  turnSeconds: 0,
  stacking: false,
  sevenZero: false,
  drawUntilPlayable: false,
};

const cardId = z.string().min(1).max(24);
const step = z.number().int();

export const actionSchema = z.discriminatedUnion('type', [
  /** Kart oyna. Jokerde `color`, 7-0 kuralında 7 için `swapWith` gerekir. */
  z.object({
    type: z.literal('play'),
    cardId,
    color: z.enum(COLORS).optional(),
    swapWith: z.string().max(64).optional(),
  }),
  /** Kart çek (ya da biriken cezayı al). `step` çift tıklamayı ayıklar. */
  z.object({ type: z.literal('draw'), step }),
  /** Çektiğin kartı tutup sırayı geçir. */
  z.object({ type: z.literal('pass'), step }),
  /** Açılış kartı joker: ilk oyuncu rengi seçer. */
  z.object({ type: z.literal('pickColor'), color: z.enum(COLORS) }),
  /** +4'e itiraz ("Hile!") ya da kabul. */
  z.object({ type: z.literal('challenge'), step }),
  z.object({ type: z.literal('accept'), step }),
  /** "Son kart!" */
  z.object({ type: z.literal('callLast') }),
  /** "Yakaladım!": Son kart demeyen oyuncuyu yakala. */
  z.object({ type: z.literal('catch'), target: z.string().max(64) }),
  /** Oda sahibi: bağlantısı kopan oyuncunun yerine çek (ya da cezayı kabul et) ve geç. */
  z.object({ type: z.literal('skipTurn') }),
]);
export type ColorCardsAction = z.infer<typeof actionSchema>;

export type Phase = 'play' | 'color' | 'challenge' | 'roundOver' | 'over';

export type LogType =
  | 'start'
  | 'round'
  | 'firstCard'
  | 'play'
  | 'draw'
  | 'penalty'
  | 'pass'
  | 'skipped'
  | 'reverse'
  | 'color'
  | 'challengeWin'
  | 'challengeLose'
  | 'accept'
  | 'call'
  | 'caught'
  | 'swap'
  | 'rotate'
  | 'reshuffle'
  | 'timeout'
  | 'hostSkip'
  | 'left'
  | 'roundWin';

export interface LogEntry {
  seq: number;
  t: LogType;
  by?: string;
  to?: string;
  card?: { color: CardColor | null; value: CardValue };
  color?: CardColor;
  n?: number;
}

export interface PlayerInfo {
  id: string;
  cards: number;
  score: number;
  /** "Son kart!" dedi (eli 1–2 kartken). */
  called: boolean;
}

export interface RoundResult {
  winner: string;
  /** Kazananın bu elde topladığı puan (puan modu). */
  points: number;
  hands: { id: string; cards: number; points: number }[];
}

export interface ColorCardsView {
  phase: Phase;
  mode: ColorCardsSettings['mode'];
  target: number;
  round: number;
  order: string[];
  players: PlayerInfo[];
  current: string;
  /** 1 = saat yönü (listede ileri), -1 = ters. */
  dir: 1 | -1;
  /** Her hamlede artar; `draw`/`pass`/`challenge`/`accept` hamlelerine eklenir. */
  step: number;
  top: Card | null;
  activeColor: CardColor | null;
  deckCount: number;
  discardCount: number;
  /** Biriken çekme cezası (yığma kuralı). */
  penalty: number;
  /** Bu tur kart çektin mi; çektiğin oynanabilir kartın kimliği yalnızca sana. */
  drew: boolean;
  drawnId: string | null;
  me: {
    inGame: boolean;
    hand: Card[];
    /** Şu an oynayabileceğin kartlar. */
    playable: string[];
  };
  /** +4 itiraz penceresi: kimin oynadığı, kimin karar vereceği. Hile olup olmadığı gizli. */
  challenge: { by: string; victim: string; penalty: number } | null;
  /** İtiraz edildiyse oynayanın eli yalnızca itiraz edene. */
  reveal: { seq: number; of: string; cards: Card[]; guilty: boolean } | null;
  /** Son kart demeden 1 karta inen ve henüz yakalanmamış oyuncu. */
  exposed: string | null;
  lastPlay: { seq: number; by: string; card: Card } | null;
  serverNow: number;
  endsAt: number;
  durationMs: number;
  log: LogEntry[];
  roundResult: RoundResult | null;
  winner: string | null;
  rules: { stacking: boolean; sevenZero: boolean; drawUntilPlayable: boolean; turnSeconds: number };
}
