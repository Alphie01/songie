import { z } from 'zod';

export const GAME_ID = 'five-seconds';
export const TEAM_IDS = ['a', 'b'] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const SECONDS_OPTIONS = [5, 7, 10] as const;
/** Oyuncu başına sıra sayısı; 0 = oda sahibi bitirene kadar. */
export const ROUND_OPTIONS = [3, 5, 0] as const;

export const CUSTOM_CATEGORY = 'arkadas';
export const CATEGORY_IDS = ['genel', 'ask', 'is-okul', 'yemek', 'turkiye', 'pop-kultur', 'sacma', 'cesur'] as const;

export const settingsSchema = z.object({
  seconds: z.number().int().min(3).max(30),
  /** Oyuncu başına sıra; 0 = sınırsız. */
  rounds: z.number().int().min(0).max(20),
  /** Başaramazsa sıradaki oyuncu aynı görevi dener. */
  steal: z.boolean(),
  teamMode: z.boolean(),
  /** Takım modu için oyuncu kimlikleri; seçilmeyenler başlarken dağıtılır. */
  teams: z.object({ a: z.array(z.string()).max(16), b: z.array(z.string()).max(16) }),
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(30),
});
export type FiveSecondsSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: FiveSecondsSettings = {
  seconds: 5,
  rounds: 3,
  steal: false,
  teamMode: false,
  teams: { a: [], b: [] },
  categories: ['genel', 'ask', 'is-okul', 'yemek', 'turkiye', 'pop-kultur', 'sacma', CUSTOM_CATEGORY],
};

export const actionSchema = z.discriminatedUnion('type', [
  /** Sırası gelen oyuncu (ya da oda sahibi) "Hazırım": görev açılır, süre başlar. */
  z.object({ type: z.literal('ready'), attemptId: z.string() }),
  /** Sırası gelen oyuncu süre bitmeden "Söyledim" der; oylamaya geçilir. */
  z.object({ type: z.literal('done'), attemptId: z.string() }),
  z.object({ type: z.literal('vote'), attemptId: z.string(), success: z.boolean() }),
  /** Oda sahibi: görevi yenisiyle değiştir (süre baştan başlar). */
  z.object({ type: z.literal('swap'), attemptId: z.string() }),
  /** Oda sahibi: bu sırayı puansız atla. */
  z.object({ type: z.literal('skip'), attemptId: z.string() }),
]);
export type FiveSecondsAction = z.infer<typeof actionSchema>;

export interface Prompt {
  id: string;
  text: string;
  category: string;
}

export type FiveSecondsPhase = 'ready' | 'countdown' | 'vote' | 'podium';

export interface AttemptResult {
  attemptId: string;
  performerId: string;
  prompt: string;
  success: boolean;
  yes: number;
  no: number;
  /** Çalma denemesiydi. */
  steal: boolean;
  /** Puan kimin hanesine yazıldı (başarısızsa null). */
  scorerId: string | null;
  skipped: boolean;
}

export interface FiveSecondsView {
  phase: FiveSecondsPhase;
  /** Sıra düzeni (oyuncu kimlikleri). */
  order: string[];
  scores: Record<string, number>;
  teamMode: boolean;
  teams: Record<TeamId, string[]> | null;
  teamScores: Record<TeamId, number> | null;
  myTeam: TeamId | null;
  /** 1'den başlar. */
  round: number;
  totalRounds: number | null;
  attemptId: string;
  performerId: string;
  /** Çalma denemesi: asıl oyuncu kimdi. */
  stealFrom: string | null;
  /** Hazırım'dan önce null (çalma denemesi hariç: görev zaten açılmıştır). */
  prompt: Prompt | null;
  serverNow: number;
  endsAt: number;
  durationMs: number;
  voteEndsAt: number;
  voteMs: number;
  /** Oy verenler (ne verdikleri gizli). */
  voted: string[];
  /** Oy vermesi beklenen bağlı oyuncular. */
  voters: string[];
  myVote: boolean | null;
  lastResult: AttemptResult | null;
  steal: boolean;
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
    .min(8, 'Görev en az 8 harf olmalı')
    .max(120, 'Görev en fazla 120 harf olabilir'),
});
export type CustomPromptInput = z.infer<typeof customPromptSchema>;
