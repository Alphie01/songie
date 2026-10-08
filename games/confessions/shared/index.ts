import { z } from 'zod';

export const GAME_ID = 'confessions';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;

export const CONFESSION_MIN = 10;
export const CONFESSION_MAX = 240;
export const PROMPT_MIN = 10;
export const PROMPT_MAX = 140;

/** Yazma süresi (sn); 0 = süresiz (oda sahibi bitirir ya da herkes yazınca). */
export const WRITE_OPTIONS = [60, 120, 0] as const;
/** Bir itiraf için tahmin süresi (sn). */
export const GUESS_OPTIONS = [30, 45, 60] as const;
/** Tur sayısı; 0 = sınırsız (oda sahibi bitirir). */
export const ROUND_OPTIONS = [3, 5, 0] as const;

export const CUSTOM_CATEGORY = 'arkadas';
export const CATEGORY_IDS = ['genel', 'cocukluk', 'okul-is', 'ask', 'utanc', 'aliskanliklar', 'cesur', CUSTOM_CATEGORY] as const;

export const REACTIONS = ['yok', 'bende', 'efsane', 'olamaz'] as const;
export type ReactionId = (typeof REACTIONS)[number];

export const settingsSchema = z.object({
  /** `topics`: her tur bir konu; `free`: serbest itiraf. */
  mode: z.enum(['topics', 'free']),
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(20),
  writeSeconds: z.number().int().min(0).max(600),
  guessSeconds: z.number().int().min(5).max(300),
  rounds: z.number().int().min(0).max(20),
  /** Yazar hiç açıklanmaz; yalnızca tahmin dağılımı gösterilir, puan yok. */
  hiddenAuthor: z.boolean(),
});
export type ConfessionsSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: ConfessionsSettings = {
  mode: 'topics',
  categories: ['genel', 'cocukluk', 'okul-is', 'ask', 'utanc', 'aliskanliklar', CUSTOM_CATEGORY],
  writeSeconds: 120,
  guessSeconds: 45,
  rounds: 3,
  hiddenAuthor: false,
};

export const actionSchema = z.discriminatedUnion('type', [
  /** İtirafını yaz ya da değiştir (yazma aşamasında). */
  z.object({ type: z.literal('write'), text: z.string().max(2000) }),
  /** Ekrandaki itirafın yazarını tahmin et. */
  z.object({ type: z.literal('guess'), confessionId: z.string().max(40), targetId: z.string().max(80) }),
  z.object({ type: z.literal('react'), confessionId: z.string().max(40), reaction: z.enum(REACTIONS) }),
  /** Oda sahibi: itirafı gizle (metin bir daha kimseye gönderilmez). */
  z.object({ type: z.literal('hide'), confessionId: z.string().max(40) }),
  /** Oda sahibi: aşamayı bitir / sıradakine geç. */
  z.object({ type: z.literal('next') }),
]);
export type ConfessionsAction = z.infer<typeof actionSchema>;

export type ConfessionsPhase = 'write' | 'guess' | 'reveal' | 'summary' | 'podium';

export interface Topic {
  text: string;
  category: string;
}

export interface CurrentConfession {
  id: string;
  /** Gizlendiyse null. */
  text: string | null;
  hidden: boolean;
  /**
   * Bu turda itiraf yazan herkes (sen dahil, oyuncu sırasıyla). Herkese aynı liste gider;
   * kendi itirafın olsa da olmasa da ekranın aynı görünür.
   */
  candidates: string[];
  reactions: Record<ReactionId, number>;
  myReactions: ReactionId[];
}

export interface Reveal {
  /** Gizli yazar modunda null. */
  authorId: string | null;
  /** Doğru bilenler (gizli yazar modunda boş). */
  correct: string[];
  /** Kim kimi seçti (gizli yazar modunda null: yalnızca dağılım). Yazarın kendi seçimi hiç yer almaz. */
  picks: { playerId: string; targetId: string }[] | null;
  /** Aday başına seçim sayısı. */
  tally: Record<string, number>;
  /** Bu itiraftan kazanılan puanlar. */
  points: { playerId: string; delta: number }[];
}

export interface RecapItem {
  id: string;
  text: string;
  authorId: string | null;
  reactions: Record<ReactionId, number>;
}

export interface PlayerStat {
  score: number;
  /** Doğru tahmin sayısı (dedektiflik). */
  correct: number;
  /** Yanılttığı oyuncu sayısı. */
  fooled: number;
}

export interface PodiumInfo {
  detective: { playerId: string; value: number } | null;
  trickster: { playerId: string; value: number } | null;
  confessions: number;
}

export interface ConfessionsView {
  phase: ConfessionsPhase;
  round: number;
  totalRounds: number | null;
  /** Serbest modda null. */
  topic: Topic | null;
  hiddenAuthor: boolean;
  serverNow: number;
  /** 0 = süresiz. */
  endsAt: number;
  durationMs: number;
  /** Oyuncu sırasıyla skorlar. */
  stats: Record<string, PlayerStat>;
  /** Bu tur itiraf yazanlar (oyuncu sırasıyla). Kimin hangisini yazdığı yok. */
  written: string[];
  /** Yalnızca senin itirafın (yazma aşamasında). */
  myConfession: string | null;
  /** Sıradaki itiraf (1'den başlar) ve bu turdaki itiraf sayısı. */
  index: number;
  count: number;
  current: CurrentConfession | null;
  /** Seçimini yapanlar (herkes, yazar dahil). */
  picked: string[];
  myPick: string | null;
  reveal: Reveal | null;
  recap: RecapItem[] | null;
  podium: PodiumInfo | null;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export const customPromptSchema = z.object({
  text: z
    .string()
    .trim()
    .min(PROMPT_MIN, `Konu en az ${PROMPT_MIN} karakter olmalı`)
    .max(PROMPT_MAX, `Konu en fazla ${PROMPT_MAX} karakter olabilir`),
});
export type CustomPromptInput = z.infer<typeof customPromptSchema>;
