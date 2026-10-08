import { z } from 'zod';

export const GAME_ID = 'most-likely';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;

/** Oy süresi (sn); 0 = süresiz. */
export const SECONDS_OPTIONS = [0, 15, 30] as const;
/** Tur sayısı; 0 = sınırsız (oda sahibi bitirene kadar). */
export const ROUND_OPTIONS = [10, 20, 0] as const;

export const CUSTOM_CATEGORY = 'arkadas';
export const CATEGORY_IDS = ['genel', 'arkadaslik', 'ask', 'is-okul', 'gelecek', 'utanc', 'aliskanliklar', 'cesur'] as const;

export const settingsSchema = z.object({
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(20),
  /** Oyuncu kendine oy verebilir mi. */
  selfVote: z.boolean(),
  /** true: kim kime verdi hiç gönderilmez; false: açıklamada gösterilir. */
  anonymous: z.boolean(),
  /** Oy verirken "Sence kim kazanacak?" tahmini; doğru tahmin +1 puan. */
  predict: z.boolean(),
  seconds: z.number().int().min(0).max(120),
  rounds: z.number().int().min(0).max(100),
});
export type MostLikelySettings = z.infer<typeof settingsSchema>;

export const defaultSettings: MostLikelySettings = {
  categories: ['genel', 'arkadaslik', 'ask', 'is-okul', 'gelecek', 'aliskanliklar', CUSTOM_CATEGORY],
  selfVote: false,
  anonymous: true,
  predict: false,
  seconds: 30,
  rounds: 10,
};

export const actionSchema = z.discriminatedUnion('type', [
  /** Oy ver ya da oyunu değiştir. `round` eski turdan gelen gecikmiş hamleleri ayıklar. */
  z.object({ type: z.literal('vote'), round: z.number().int(), promptId: z.string(), target: z.string() }),
  /** Tahmin modu: "Sence kim kazanacak?" */
  z.object({ type: z.literal('guess'), round: z.number().int(), promptId: z.string(), target: z.string() }),
  /** Oda sahibi: bu soruyu atla (oylar silinir, yeni soru gelir). */
  z.object({ type: z.literal('skip'), round: z.number().int(), promptId: z.string() }),
  /** Oda sahibi: beklemeden sonuçları aç. */
  z.object({ type: z.literal('reveal'), round: z.number().int(), promptId: z.string() }),
  /** Oda sahibi: sıradaki soruya geç (açıklamadan sonra). */
  z.object({ type: z.literal('next'), round: z.number().int() }),
]);
export type MostLikelyAction = z.infer<typeof actionSchema>;

export type MostLikelyPhase = 'vote' | 'reveal' | 'podium';

export interface Prompt {
  id: string;
  /** "Aramızdaki en … kim?" kalıbındaki boşluk, ör. "geç kalan". */
  text: string;
  category: string;
}

export interface Person {
  id: string;
  nick: string;
  avatar: { shape: string; color: string };
  connected: boolean;
  /** Odadan ayrıldıysa false (oy alamaz, beklenmez). */
  present: boolean;
}

export interface RoundResult {
  /** Oy alan herkes, çoktan aza. */
  counts: { id: string; votes: number }[];
  /** Unvan sahipleri (beraberlikte hepsi). Hiç oy yoksa boş. */
  winners: string[];
  total: number;
  /** Yalnızca açık oylarda: kim kime verdi. İsimsiz modda null (sunucu hiç göndermez). */
  ballots: { voter: string; target: string }[] | null;
  /** Tahmin modunda doğru tahmin edenler; kapalıysa null. */
  correctGuessers: string[] | null;
}

export interface TitleEntry {
  round: number;
  text: string;
  winners: string[];
  votes: number;
}

export interface MostLikelyView {
  phase: MostLikelyPhase;
  round: number;
  totalRounds: number | null;
  prompt: Prompt;
  people: Person[];
  /** Bu turun kuralları (ayar değişikliği sıradaki turdan itibaren). */
  selfVote: boolean;
  anonymous: boolean;
  predict: boolean;
  /** Oyunu vermiş olanlar (kime verdiği gizli). */
  voted: string[];
  /** Tahmin modunda tahminini yapmış olanlar. */
  guessed: string[];
  /** Hâlâ beklenen bağlı oyuncular. */
  waitingFor: string[];
  myVote: string | null;
  myGuess: string | null;
  serverNow: number;
  /** 0 = süresiz. */
  endsAt: number;
  durationMs: number;
  /** Yalnızca açıklama aşamasında. */
  result: RoundResult | null;
  /** Açılmış turların unvanları, eskiden yeniye. */
  history: TitleEntry[];
  /** Tahmin puanları. */
  guessScores: Record<string, number>;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

/** "Aramızdaki en … kim?" kalıbını temizler: baştaki "aramızdaki en"/"en", sondaki "kim?" atılır. */
export function cleanPromptText(raw: string): string {
  let t = raw.trim().replace(/\s+/g, ' ');
  t = t.replace(/^aramızdaki\s+/iu, '').replace(/^en\s+/iu, '');
  t = t.replace(/\s*kim\s*\??\s*$/iu, '').replace(/[?.!…]+$/u, '').trim();
  return t;
}

export const customPromptSchema = z.object({
  text: z
    .string()
    .transform(cleanPromptText)
    .pipe(z.string().min(3, 'Soru en az 3 harf olmalı').max(80, 'Soru en fazla 80 harf olabilir')),
});
export type CustomPromptInput = z.infer<typeof customPromptSchema>;
