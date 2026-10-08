import { z } from 'zod';

export const GAME_ID = 'red-flag';

export const CUSTOM_CATEGORY = 'arkadas';

/** Hazır kategoriler (dosya adları server/content/<id>.json) ve arkadaşların eklediği durumlar. */
export const CATEGORY_IDS = [
  'iliski',
  'ilk-bulusma',
  'arkadaslik',
  'ev-arkadasi',
  'is',
  'aile',
  'sosyal-medya',
  'aliskanliklar',
  'cesur',
  CUSTOM_CATEGORY,
] as const;

/** 0 = süresiz (herkes oy verince açılır). */
export const SECONDS_OPTIONS = [0, 15, 30] as const;
/** 0 = oda sahibi bitirene kadar. */
export const ROUND_OPTIONS = [10, 20, 0] as const;

export const VOTES = ['green', 'red', 'never'] as const;
export type Vote = (typeof VOTES)[number];

export const settingsSchema = z.object({
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(30),
  /** Üçüncü seçenek: "Asla olmaz". */
  dealBreaker: z.boolean(),
  /** true: açıklamada yalnızca sayılar gider, kimin ne dediği hiç gönderilmez. */
  anonymous: z.boolean(),
  /** Oyuncular "Çoğunluk ne diyecek?" tahmini de yapar; doğru tahmin +1 puan. */
  predict: z.boolean(),
  seconds: z.number().int().min(0).max(120),
  rounds: z.number().int().min(0).max(100),
});
export type RedFlagSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: RedFlagSettings = {
  categories: ['iliski', 'ilk-bulusma', 'arkadaslik', 'ev-arkadasi', 'is', 'aile', 'sosyal-medya', 'aliskanliklar', CUSTOM_CATEGORY],
  dealBreaker: false,
  anonymous: false,
  predict: true,
  seconds: 30,
  rounds: 10,
};

const voteEnum = z.enum(VOTES);

export const actionSchema = z.discriminatedUnion('type', [
  /** Kendi oyun. Açıklamaya kadar değiştirilebilir. */
  z.object({ type: z.literal('vote'), itemId: z.string(), vote: voteEnum }),
  /** "Çoğunluk ne diyecek?" tahmini (tahmin modu açıkken). */
  z.object({ type: z.literal('guess'), itemId: z.string(), vote: voteEnum }),
  /** Açıklamada "hazırım": herkes hazır olunca sıradaki duruma geçilir. */
  z.object({ type: z.literal('ready'), round: z.number().int() }),
  /** Oda sahibi: sıradaki duruma geç. */
  z.object({ type: z.literal('next'), round: z.number().int() }),
  /** Oda sahibi: oyları beklemeden aç. */
  z.object({ type: z.literal('reveal'), itemId: z.string() }),
  /** Oda sahibi: bu durumu atla (tur sayılmaz). */
  z.object({ type: z.literal('skip'), itemId: z.string() }),
]);
export type RedFlagAction = z.infer<typeof actionSchema>;

export interface Situation {
  id: string;
  text: string;
  category: string;
}

export type RedFlagPhase = 'vote' | 'reveal' | 'podium';

export type Counts = Record<Vote, number>;

export interface RevealInfo {
  counts: Counts;
  total: number;
  /** En çok oy alan seçenek(ler). Beraberlikte birden fazla. */
  majority: Vote[];
  /** Açık modda kimin ne dediği; isimsiz modda null (sunucu kimlik göndermez). */
  votes: { playerId: string; vote: Vote }[] | null;
  /** Tahmin modunda doğru tahmin edenler (tahmin oy değildir, isimsizde de gösterilir). */
  correct: string[];
  /** İzleyenin kendi oyu ve tahmini. */
  myVote: Vote | null;
  myGuess: Vote | null;
}

export interface PlayerProfile {
  playerId: string;
  green: number;
  red: number;
  never: number;
  /** Azınlıkta kaldığı tur sayısı. */
  minority: number;
  /** 0–100: oylarının yüzde kaçı green. */
  tolerance: number;
}

export interface DivisiveItem {
  text: string;
  counts: Counts;
}

export interface Summary {
  rounds: number;
  /** Açık modda herkesin profili; isimsiz modda yalnızca izleyenin kendisi. */
  profiles: PlayerProfile[];
  mostGreen: string | null;
  strictest: string | null;
  rebel: string | null;
  divisive: DivisiveItem[];
  totals: Counts;
}

export interface RedFlagView {
  phase: RedFlagPhase;
  /** Tamamlanan (açılan) durum sayısı ve toplam (null = sınırsız). */
  round: number;
  totalRounds: number | null;
  item: Situation | null;
  categoryName: string;
  dealBreaker: boolean;
  anonymous: boolean;
  predict: boolean;
  /** Bu turda oy verebilenler (katılımcılar). */
  voters: string[];
  /** Oyunu (ve tahmin modunda tahminini) tamamlayanlar. Ne dedikleri gitmez. */
  done: string[];
  /** Açıklamada "hazırım" diyenler. */
  ready: string[];
  myVote: Vote | null;
  myGuess: Vote | null;
  serverNow: number;
  /** 0 = süresiz. */
  endsAt: number;
  durationMs: number;
  /** Açıklamadan sonra "Sonraki" bu andan itibaren çalışır. */
  nextAt: number;
  reveal: RevealInfo | null;
  scores: Record<string, number>;
  summary: Summary | null;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export const customItemSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, 'Durum en az 10 harf olmalı')
    .max(160, 'Durum en fazla 160 harf olabilir'),
});
export type CustomItemInput = z.infer<typeof customItemSchema>;
