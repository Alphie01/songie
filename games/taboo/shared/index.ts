import { z } from 'zod';

export const GAME_ID = 'taboo';
export const TEAM_IDS = ['a', 'b'] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const SECONDS_OPTIONS = [60, 90, 120] as const;
/** -1 = sınırsız pas. */
export const PASS_OPTIONS = [3, 5, -1] as const;
/** Takım başına anlatma sayısı; 0 = oda sahibi bitirene kadar. */
export const TURN_OPTIONS = [2, 4, 6, 0] as const;

export const CUSTOM_CATEGORY = 'arkadas';

export const settingsSchema = z.object({
  /** Oyuncu kimlikleri. Takımı seçilmemiş oyuncular başlarken dengeli dağıtılır. */
  teams: z.object({ a: z.array(z.string()).max(12), b: z.array(z.string()).max(12) }),
  seconds: z.number().int().min(5).max(300),
  passes: z.number().int().min(-1).max(20),
  turns: z.number().int().min(0).max(20),
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(30),
  /** Yasaklı kelime söylenirse anlatan takımdan 1 puan düşülür. */
  tabooPenalty: z.boolean(),
});
export type TabooSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: TabooSettings = {
  teams: { a: [], b: [] },
  seconds: 60,
  passes: 3,
  turns: 4,
  categories: ['genel', 'yemek', 'hayvanlar', 'meslekler', 'nesneler', 'spor', 'film-dizi-muzik', 'yerler', 'bilim-teknoloji', 'turkiye', CUSTOM_CATEGORY],
  tabooPenalty: true,
};

export const actionSchema = z.discriminatedUnion('type', [
  /** Anlatıcı (ya da anlatıcı yoksa oda sahibi) turu başlatır. */
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('correct'), cardId: z.string() }),
  z.object({ type: z.literal('pass'), cardId: z.string() }),
  /** Rakip takım: anlatıcı yasaklı kelime söyledi. */
  z.object({ type: z.literal('taboo'), cardId: z.string() }),
  /** Anlatıcı son işaretlemeyi geri alır. */
  z.object({ type: z.literal('undo') }),
  /** Oda sahibi: sıradaki anlatıcıyı atla (ör. bağlantısı koptu). */
  z.object({ type: z.literal('skipNarrator') }),
]);
export type TabooAction = z.infer<typeof actionSchema>;

export interface Card {
  id: string;
  word: string;
  taboo: string[];
  category: string;
}

export type CardResult = 'correct' | 'pass' | 'taboo';

export type Role = 'narrator' | 'guesser' | 'watcher' | 'spectator';

export type TabooPhase = 'ready' | 'turn' | 'podium';

export interface TurnSummary {
  team: TeamId;
  narratorId: string;
  points: number;
  cards: { word: string; taboo: string[]; result: CardResult }[];
}

export interface TabooView {
  phase: TabooPhase;
  teams: Record<TeamId, string[]>;
  scores: Record<TeamId, number>;
  myTeam: TeamId | null;
  role: Role;
  /** Tamamlanan tur sayısı ve toplam (null = sınırsız). */
  turnNumber: number;
  totalTurns: number | null;
  /** Sıradaki ya da şu anki anlatıcı. */
  team: TeamId;
  narratorId: string;
  serverNow: number;
  endsAt: number;
  durationMs: number;
  passesLeft: number | null;
  turnStats: { correct: number; pass: number; taboo: number };
  /** Yalnızca anlatıcıya ve rakip takıma gönderilir. */
  card: Card | null;
  canUndo: boolean;
  /** Son olay (animasyon için). */
  flash: { id: number; kind: CardResult; word: string | null } | null;
  lastTurn: TurnSummary | null;
  tabooPenalty: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export const customCardSchema = z.object({
  word: z.string().trim().min(2, 'Kelime en az 2 harf olmalı').max(40),
  taboo: z
    .array(z.string().trim().min(1).max(30))
    .length(5, '5 yasaklı kelime yaz'),
});
export type CustomCardInput = z.infer<typeof customCardSchema>;
