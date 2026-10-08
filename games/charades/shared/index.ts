import { z } from 'zod';

export const GAME_ID = 'charades';
export const TEAM_IDS = ['a', 'b'] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const SECONDS_OPTIONS = [60, 90, 120, 180] as const;
/** -1 = sınırsız pas. */
export const PASS_OPTIONS = [1, 3, -1] as const;
/** Takım başına anlatma sayısı; 0 = oda sahibi bitirene kadar. */
export const TURN_OPTIONS = [2, 4, 6, 0] as const;

export const DIFFICULTIES = ['kolay', 'karisik', 'zor'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Başlığın türü: anlatıcının ilk işareti (film çevirmek, kitap açmak…). */
export const KINDS = ['film', 'dizi', 'kitap', 'sarki', 'deyim'] as const;
export type Kind = (typeof KINDS)[number];

/** Hazır kategoriler ve türleri. Arkadaş başlıkları kendi türünü taşır. */
export const CATEGORY_KIND: Record<string, Kind> = {
  'film-turk': 'film',
  'film-yabanci': 'film',
  'dizi-turk': 'dizi',
  'dizi-yabanci': 'dizi',
  kitap: 'kitap',
  sarki: 'sarki',
  'atasozu-deyim': 'deyim',
};

export const CUSTOM_CATEGORY = 'arkadas';

export const settingsSchema = z.object({
  /** Oyuncu kimlikleri. Takımı seçilmemiş oyuncular başlarken dengeli dağıtılır. */
  teams: z.object({ a: z.array(z.string()).max(12), b: z.array(z.string()).max(12) }),
  seconds: z.number().int().min(5).max(300),
  passes: z.number().int().min(-1).max(20),
  turns: z.number().int().min(0).max(20),
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir tür seç').max(30),
  difficulty: z.enum(DIFFICULTIES),
  /** "Konuştu!" denirse anlatan takımdan 1 puan düşülür. */
  foulPenalty: z.boolean(),
});
export type CharadesSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: CharadesSettings = {
  teams: { a: [], b: [] },
  seconds: 90,
  passes: 3,
  turns: 4,
  categories: [...Object.keys(CATEGORY_KIND), CUSTOM_CATEGORY],
  difficulty: 'karisik',
  foulPenalty: true,
};

export const actionSchema = z.discriminatedUnion('type', [
  /** Anlatıcı (ya da oda sahibi) turu başlatır. */
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('correct'), cardId: z.string() }),
  z.object({ type: z.literal('pass'), cardId: z.string() }),
  /** Rakip takım: anlatıcı konuştu. */
  z.object({ type: z.literal('foul'), cardId: z.string() }),
  /** Anlatıcı son işaretlemeyi geri alır. */
  z.object({ type: z.literal('undo') }),
  /** Oda sahibi: sıradaki anlatıcıyı atla (ör. bağlantısı koptu). */
  z.object({ type: z.literal('skipNarrator') }),
]);
export type CharadesAction = z.infer<typeof actionSchema>;

export interface Card {
  id: string;
  title: string;
  kind: Kind;
  /** Başlıktaki kelime sayısı (anlatıcının ikinci işareti). */
  words: number;
  category: string;
}

export type CardResult = 'correct' | 'pass' | 'foul';

export type Role = 'narrator' | 'guesser' | 'watcher' | 'spectator';

export type CharadesPhase = 'ready' | 'turn' | 'podium';

export interface TurnSummary {
  team: TeamId;
  narratorId: string;
  points: number;
  cards: { title: string; kind: Kind; result: CardResult }[];
}

export interface CharadesView {
  phase: CharadesPhase;
  teams: Record<TeamId, string[]>;
  scores: Record<TeamId, number>;
  myTeam: TeamId | null;
  role: Role;
  /** Tamamlanan anlatma sayısı ve toplam (null = sınırsız). */
  turnNumber: number;
  totalTurns: number | null;
  /** Sıradaki ya da şu anki anlatan takım ve anlatıcı. */
  team: TeamId;
  narratorId: string;
  serverNow: number;
  endsAt: number;
  durationMs: number;
  passesLeft: number | null;
  turnStats: Record<CardResult, number>;
  /** Yalnızca anlatıcıya ve rakip takıma gönderilir. */
  card: Card | null;
  canUndo: boolean;
  /** Son olay (animasyon için). Başlık yalnızca kartı görenlere gider. */
  flash: { id: number; kind: CardResult; title: string | null } | null;
  lastTurn: TurnSummary | null;
  foulPenalty: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export function countWords(title: string): number {
  return title.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export const customTitleSchema = z.object({
  title: z.string().trim().min(2, 'Başlık en az 2 harf olmalı').max(80, 'Başlık en fazla 80 harf olabilir'),
  kind: z.enum(KINDS, { errorMap: () => ({ message: 'Bir tür seç' }) }),
});
export type CustomTitleInput = z.infer<typeof customTitleSchema>;
