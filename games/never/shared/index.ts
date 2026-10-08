import { z } from 'zod';

export const GAME_ID = 'never';

/** 0 = can sistemi kapalı. */
export const LIVES_OPTIONS = [3, 5, 10, 0] as const;
/** 0 = süresiz (herkes cevaplayınca açılır). */
export const SECONDS_OPTIONS = [0, 15, 30] as const;
/** 0 = sınırsız. */
export const ROUND_OPTIONS = [10, 20, 0] as const;

export const CUSTOM_CATEGORY = 'arkadas';

export const CATEGORY_NAMES: Record<string, string> = {
  genel: 'Genel',
  'okul-is': 'Okul ve iş',
  'ask-iliski': 'Aşk ve ilişki',
  seyahat: 'Seyahat',
  utanc: 'Utanç',
  teknoloji: 'Teknoloji',
  yemek: 'Yemek',
  cesur: 'Cesur (+18)',
  [CUSTOM_CATEGORY]: 'Arkadaş cümleleri',
};

export const settingsSchema = z.object({
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(30),
  /** Başlangıç canı; 0 = can sistemi kapalı. */
  lives: z.number().int().min(0).max(20),
  /** Açıkken yalnızca sayı ve oran açıklanır; kimin yaptığı sunucudan hiç çıkmaz. */
  anonymous: z.boolean(),
  /** Cevap süresi (sn); 0 = süresiz. */
  seconds: z.number().int().min(0).max(120),
  /** Tur sayısı; 0 = sınırsız. */
  rounds: z.number().int().min(0).max(100),
});
export type NeverSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: NeverSettings = {
  categories: ['genel', 'okul-is', 'ask-iliski', 'seyahat', 'utanc', 'teknoloji', 'yemek', CUSTOM_CATEGORY],
  lives: 5,
  anonymous: false,
  seconds: 30,
  rounds: 20,
};

export type Answer = 'did' | 'didNot';

export const actionSchema = z.discriminatedUnion('type', [
  /** Gizli cevap; açıklamadan önce değiştirilebilir. */
  z.object({ type: z.literal('answer'), statementId: z.string(), answer: z.enum(['did', 'didNot']) }),
  /** "Bu cümleyi atla" oyu (tekrar basınca geri alınır). Çoğunluk olunca cümle değişir. */
  z.object({ type: z.literal('voteSkip'), statementId: z.string() }),
  /** Oda sahibi: süreyi beklemeden cevapları aç. */
  z.object({ type: z.literal('reveal'), statementId: z.string() }),
  /** Oda sahibi: soru sırasında cümleyi değiştirir, açıklamada sıradaki tura geçer. */
  z.object({ type: z.literal('next'), statementId: z.string() }),
]);
export type NeverAction = z.infer<typeof actionSchema>;

export type NeverPhase = 'question' | 'reveal' | 'podium';

export interface Statement {
  id: string;
  text: string;
  category: string;
}

export interface PlayerInfo {
  id: string;
  /** Kalan can; can sistemi kapalıysa ya da isimsiz moddaysa null. */
  lives: number | null;
  eliminated: boolean;
  /** Bu cümleye cevap verdi mi (cevabın kendisi değil). */
  answered: boolean;
  /** Bu turda cevap verebilir mi (elenmemiş ve odada). */
  active: boolean;
  /** Açıklanan turlarda kaç kez "yaptım" dedi; isimsiz modda null. */
  didCount: number | null;
}

export interface RoundSummary {
  round: number;
  text: string;
  didCount: number;
  answered: number;
  total: number;
  /** İsimsiz modda null. */
  didIds: string[] | null;
  /** Bu turda elenenler; isimsiz modda ya da can kapalıyken null/boş. */
  eliminatedIds: string[] | null;
}

export interface PodiumPlayer {
  id: string;
  did: number;
  didNot: number;
  lives: number | null;
  eliminated: boolean;
}

export interface PodiumStats {
  rounds: number;
  /** İsimsiz modda null: kişi başı sayılar gönderilmez. */
  players: PodiumPlayer[] | null;
  /** En çok "yaptım" alan cümle. */
  hottest: { text: string; didCount: number; total: number } | null;
  /** Can sistemi açıkken ayakta kalanlar (isimsiz modda null). */
  winners: string[] | null;
  /** Yalnızca bu oyuncunun kendi sayıları. */
  me: { did: number; didNot: number } | null;
}

export interface NeverView {
  phase: NeverPhase;
  /** Şu anki tur (1'den başlar). */
  round: number;
  totalRounds: number | null;
  statement: Statement | null;
  serverNow: number;
  /** 0 = süresiz. */
  endsAt: number;
  durationMs: number;
  anonymous: boolean;
  maxLives: number | null;
  players: PlayerInfo[];
  myAnswer: Answer | null;
  canAnswer: boolean;
  skip: { votes: number; needed: number; mine: boolean };
  reveal: RoundSummary | null;
  /** Yeniden eskiye, en fazla 30 tur. */
  history: RoundSummary[];
  /** Açıklanan tur oyunun son turu mu (sıradaki adım sonuçlar). */
  final: boolean;
  podium: PodiumStats | null;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export const customStatementSchema = z.object({
  /** "Ben hiç" sonrası kısım, ör. "sınavda kopya çekmedim". */
  text: z
    .string()
    .trim()
    .min(5, 'Cümle en az 5 harf olmalı')
    .max(120, 'Cümle en fazla 120 harf olabilir'),
});
export type CustomStatementInput = z.infer<typeof customStatementSchema>;

/** Oyuncunun yazdığını "Ben hiç … ." biçimine getirir. */
export function normalizeStatement(raw: string): string {
  let t = raw.trim().replace(/\s+/g, ' ');
  t = t.replace(/^ben\s+hiç\s+/i, '');
  t = t.replace(/[.!?…]+$/u, '').trim();
  return `Ben hiç ${t}.`;
}
