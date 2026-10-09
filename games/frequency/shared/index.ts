import { z } from 'zod';

export const GAME_ID = 'frequency';
export const TEAM_IDS = ['a', 'b'] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const MODES = ['teams', 'coop'] as const;
export type Mode = (typeof MODES)[number];

/** Takımlı mod: hedef puan. */
export const TARGET_SCORE_OPTIONS = [10, 15] as const;
/** Birlikte modu: tur sayısı. */
export const ROUND_OPTIONS = [7, 10, 13] as const;
/** Kadran süresi; 0 = süresiz. */
export const SECONDS_OPTIONS = [0, 60, 90] as const;
/** Süreli oyunda rakibin "sağda mı, solda mı" süresi. */
export const SIDE_SECONDS = 30;

export const MIN_TEAM = 2;

/* ---------- Kadran ve puan bantları ----------
 * Kadran 0 (sol uç) ile 100 (sağ uç) arasında. Hedef bölgesi 5 banttan oluşur: 2-3-4-3-2.
 * Her bant kadranın %4'ü genişliğinde; hedef bölgesi toplam %20 (fiziksel oyunlardaki oranlara yakın).
 * Sınırlar dahildir: merkezden tam 2 uzaklık hâlâ 4 puandır.
 */
export const DIAL_MIN = 0;
export const DIAL_MAX = 100;
export const DIAL_START = 50;
export const BAND_WIDTH = 4;
export const BANDS = [
  { points: 4, maxDistance: BAND_WIDTH / 2 },
  { points: 3, maxDistance: BAND_WIDTH * 1.5 },
  { points: 2, maxDistance: BAND_WIDTH * 2.5 },
] as const;
/** Hedef merkezi bu aralıktan seçilir (uçlara çok yapışmasın, ama bantlar kırpılabilsin). */
export const TARGET_MIN = 3;
export const TARGET_MAX = 97;
export const BULLSEYE = 4;

export function scoreFor(dial: number, target: number): number {
  const d = Math.abs(dial - target);
  for (const b of BANDS) if (d <= b.maxDistance + 1e-9) return b.points;
  return 0;
}

/** Kadrandaki konum hedefin neresinde? Eşitse ikisi de değil. */
export function sideOf(dial: number, target: number): 'left' | 'right' | null {
  if (target < dial) return 'left';
  if (target > dial) return 'right';
  return null;
}

/** Birlikte modu derecesi: 0 (en kötü) – 4 (en iyi), oynanan tur sayısının (ek turlar dahil) en yüksek puanına oranla. */
export const RATING_THRESHOLDS = [0.25, 0.45, 0.6, 0.75] as const;
export function ratingFor(score: number, rounds: number): number {
  const ratio = rounds > 0 ? score / (rounds * BULLSEYE) : 0;
  let r = 0;
  for (const t of RATING_THRESHOLDS) if (ratio >= t) r++;
  return r;
}

export const settingsSchema = z.object({
  mode: z.enum(MODES),
  /** Oyuncu kimlikleri (takımlı mod). Takımı seçilmemiş oyuncular başlarken dengeli dağıtılır. */
  teams: z.object({ a: z.array(z.string()).max(12), b: z.array(z.string()).max(12) }),
  targetScore: z.number().int().min(3).max(30),
  rounds: z.number().int().min(1).max(30),
  seconds: z.number().int().min(0).max(300),
  /** Medyum iki karttan birini seçer. */
  cardChoice: z.boolean(),
  /** Kilitlemek için takımın çoğunluğu onaylamalı. */
  majorityLock: z.boolean(),
  /** 4 puan alan takım geride kaldıysa tekrar oynar (birlikte modunda +1 tur). */
  catchUp: z.boolean(),
  /** Oyuncuların eklediği kartlar desteye karışsın. */
  friendCards: z.boolean(),
});
export type FrequencySettings = z.infer<typeof settingsSchema>;

export const defaultSettings: FrequencySettings = {
  mode: 'teams',
  teams: { a: [], b: [] },
  targetScore: 10,
  rounds: 7,
  seconds: 0,
  cardChoice: true,
  majorityLock: false,
  catchUp: true,
  friendCards: true,
};

const round = z.number().int();

export const actionSchema = z.discriminatedUnion('type', [
  /** Medyum iki karttan birini seçer. */
  z.object({ type: z.literal('pick'), round, cardId: z.string() }),
  /** Medyum ipucunu verdi (yazılı ya da sesli; metin boş olabilir). */
  z.object({ type: z.literal('clue'), round, text: z.string().max(80) }),
  /** Medyumun takımı kadranı çevirir. */
  z.object({ type: z.literal('dial'), round, value: z.number().finite() }),
  z.object({ type: z.literal('lock'), round }),
  z.object({ type: z.literal('unlock'), round }),
  /** Takımlı mod: rakip takım tahmini. */
  z.object({ type: z.literal('side'), round, side: z.enum(['left', 'right']) }),
  z.object({ type: z.literal('next'), round }),
  /** Oda sahibi: medyumu ve bu turu atla (ör. bağlantısı koptu). */
  z.object({ type: z.literal('skipPsychic'), round }),
]);
export type FrequencyAction = z.infer<typeof actionSchema>;

export interface Card {
  id: string;
  left: string;
  right: string;
}

export type Phase = 'pick' | 'clue' | 'dial' | 'side' | 'reveal' | 'podium';
export type Role = 'psychic' | 'dialer' | 'opponent' | 'spectator';

export interface RoundSummary {
  id: number;
  team: TeamId;
  psychicId: string;
  card: Card;
  clue: string | null;
  target: number;
  dial: number;
  points: number;
  side: 'left' | 'right' | null;
  /** Rakip tahmini puan getirdi mi (null = tahmin yok). */
  sidePoint: boolean | null;
  /** Yetişme kuralı işledi: aynı takım tekrar oynar / birlikte modunda +1 tur. */
  again: boolean;
}

export interface FrequencyView {
  phase: Phase;
  mode: Mode;
  teams: Record<TeamId, string[]>;
  scores: Record<TeamId, number>;
  myTeam: TeamId | null;
  role: Role;
  /** Tur kimliği; hamleler bununla eşleşir. */
  roundId: number;
  /** Tamamlanan tur sayısı. */
  completed: number;
  /** Birlikte modu: toplam tur (yetişme kuralıyla artabilir). */
  totalRounds: number | null;
  targetScore: number | null;
  team: TeamId;
  psychicId: string;
  /** Yalnızca medyuma, seçim aşamasında. */
  options: Card[] | null;
  card: Card | null;
  /** Yalnızca medyuma (açıklamaya kadar). */
  target: number | null;
  clue: string | null;
  dial: number;
  dialBy: string | null;
  lockVotes: string[];
  votesNeeded: number;
  side: 'left' | 'right' | null;
  sideBy: string | null;
  /** Açıklama aşamasında bu turun sonucu. */
  result: RoundSummary | null;
  history: RoundSummary[];
  /** Oyun bitti: kazanan takım ya da birlikte modunda 'coop'. */
  winner: TeamId | 'coop' | 'draw' | null;
  rating: number | null;
  serverNow: number;
  endsAt: number;
  durationMs: number;
}

export const customCardSchema = z.object({
  left: z.string().trim().min(2, 'Sol uç en az 2 harf olmalı').max(40, 'Sol uç en fazla 40 harf olabilir'),
  right: z.string().trim().min(2, 'Sağ uç en az 2 harf olmalı').max(40, 'Sağ uç en fazla 40 harf olabilir'),
});
export type CustomCardInput = z.infer<typeof customCardSchema>;
