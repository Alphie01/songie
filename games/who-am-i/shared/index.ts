import { z } from 'zod';

export const GAME_ID = 'who-am-i';

/** Oyuncuların eklediği kimlikler bu kategoride toplanır. */
export const CUSTOM_CATEGORY = 'arkadas';

export const ANSWERS = ['yes', 'no', 'maybe', 'irrelevant'] as const;
export type Answer = (typeof ANSWERS)[number];

/** `classic`: "Hayır" çıkana kadar sor. `three`: her turda sabit 3 soru. */
export const TURN_MODES = ['classic', 'three'] as const;
export type TurnMode = (typeof TURN_MODES)[number];
export const QUESTIONS_PER_TURN = 3;

export const HINT_OPTIONS = [0, 1, 3] as const;

export const settingsSchema = z.object({
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(20),
  turnMode: z.enum(TURN_MODES),
  /** Sırası gelen soruyu yazarak da sorabilir (soru geçmişine eklenir). */
  typedQuestions: z.boolean(),
  /** Tahmini sunucu değil, diğer oyuncular "Doğru/Yanlış" oyuyla onaylar. */
  groupVerify: z.boolean(),
  /** Kişi başı ipucu hakkı. */
  hints: z.number().int().min(0).max(3),
});
export type WhoAmISettings = z.infer<typeof settingsSchema>;

export const defaultSettings: WhoAmISettings = {
  categories: ['turk-unluler', 'dunya-unluler', 'karakterler', 'hayvanlar', 'nesneler', 'meslekler', 'tarihi-kisiler', 'sporcular', CUSTOM_CATEGORY],
  turnMode: 'classic',
  typedQuestions: true,
  groupVerify: false,
  hints: 1,
};

export const actionSchema = z.discriminatedUnion('type', [
  /** Sırası gelen oyuncu sorusunu sordu (sesli; ayar açıksa yazılı metinle). */
  z.object({ type: z.literal('ask'), text: z.string().trim().max(140).optional() }),
  /** Diğer oyuncular soruyu cevaplar. */
  z.object({ type: z.literal('answer'), questionId: z.number().int(), answer: z.enum(ANSWERS) }),
  /** Soran (ya da oda sahibi) gelen cevaplarla soruyu kapatır; oda sahibi bekleyen tahmini de oylarla sonuçlandırır. */
  z.object({ type: z.literal('close'), questionId: z.number().int().optional(), guessId: z.number().int().optional() }),
  /** Sırası gelen oyuncu kimliğini tahmin eder. */
  z.object({ type: z.literal('guess'), text: z.string().trim().min(1, 'Bir tahmin yaz.').max(60) }),
  /** "Grup onaylasın" modunda diğerleri tahmini oylar. */
  z.object({ type: z.literal('verify'), guessId: z.number().int(), correct: z.boolean() }),
  /** Kendine ipucu iste (yalnızca sana gösterilir). */
  z.object({ type: z.literal('hint') }),
  /** Soran sırasını bırakır; oda sahibi sıradakini atlar (ör. bağlantısı koptu). */
  z.object({ type: z.literal('pass') }),
]);
export type WhoAmIAction = z.infer<typeof actionSchema>;

export interface Identity {
  name: string;
  category: string;
}

export interface PlayerCard {
  id: string;
  /** Kendi kartın açıklanana kadar `null` gelir: sunucu göndermez. */
  identity: Identity | null;
  finished: boolean;
  /** Bitiriş sırası (0 = ilk bilen). */
  finishRank: number | null;
  questions: number;
  hints: number;
  /** Oyundan ayrıldı (kartı yine de görünür). */
  left: boolean;
}

export interface OpenQuestion {
  id: number;
  askerId: string;
  text: string | null;
  counts: Record<Answer, number>;
  answered: string[];
  /** Cevap vermesi beklenen kişi sayısı (bağlı oyuncular). */
  expected: number;
  myAnswer: Answer | null;
}

export interface PendingGuess {
  id: number;
  playerId: string;
  text: string;
  votes: { correct: number; wrong: number };
  voted: string[];
  expected: number;
  myVote: boolean | null;
}

export type HistoryItem =
  | {
      id: number;
      kind: 'question';
      askerId: string;
      text: string | null;
      counts: Record<Answer, number>;
      result: Answer;
    }
  | {
      id: number;
      kind: 'guess';
      askerId: string;
      text: string;
      correct: boolean;
      /** Doğru bilindiyse kimlik (artık herkes görebilir). */
      reveal: string | null;
      byGroup: boolean;
    }
  | { id: number; kind: 'skip'; askerId: string; byHost: boolean };

export type WhoAmIPhase = 'play' | 'podium';

export interface WhoAmIView {
  phase: WhoAmIPhase;
  /** Sıra düzeninde bütün oyuncular. */
  players: PlayerCard[];
  askerId: string | null;
  turnNumber: number;
  /** Bu turda sorulan soru sayısı. */
  turnQuestions: number;
  turnMode: TurnMode;
  typedQuestions: boolean;
  groupVerify: boolean;
  question: OpenQuestion | null;
  guess: PendingGuess | null;
  /** En yeni en sonda. */
  history: HistoryItem[];
  /** Yalnızca sana ait ipuçları. */
  myHints: string[];
  hintsLeft: number;
  hintLimit: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export const customCardSchema = z.object({
  name: z.string().trim().min(2, 'Kimlik en az 2 harf olmalı.').max(40, 'Kimlik en fazla 40 harf olabilir.'),
  /** Kabul edilecek diğer yazımlar (takma ad, soyadı…). */
  aliases: z.array(z.string().trim().min(1).max(40)).max(6, 'En fazla 6 farklı yazım ekleyebilirsin.').default([]),
});
export type CustomCardInput = z.infer<typeof customCardSchema>;

/**
 * Sıralama: bilenler önde, az soruda bilen daha önde (eşitlikte önce bilen);
 * bilemeyenler sonda, az soruyla.
 */
export function rankPlayers<P extends Pick<PlayerCard, 'id' | 'finished' | 'finishRank' | 'questions'>>(players: P[]): P[] {
  return [...players].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.questions !== b.questions) return a.questions - b.questions;
    return (a.finishRank ?? 0) - (b.finishRank ?? 0);
  });
}
