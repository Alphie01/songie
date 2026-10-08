import { z } from 'zod';

export const GAME_ID = 'bottle';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 16;

/** Hazır kategoriler (server/content/<id>.json) + oyuncuların eklediği sorular. */
export const BUILTIN_CATEGORIES = ['eglenceli', 'arkadaslar', 'ask', 'utanc', 'cesur'] as const;
export const CUSTOM_CATEGORY = 'oyuncular';

export const KINDS = ['truth', 'dare'] as const;
export type PromptKind = (typeof KINDS)[number];

/** -1 = sınırsız pas. */
export const PASS_OPTIONS = [1, 2, 3, -1] as const;
/** Çevirme sayısı; 0 = oda sahibi bitirene kadar. */
export const ROUND_OPTIONS = [10, 20, 0] as const;

export const settingsSchema = z.object({
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(20),
  /** player: hedef doğruluk/cesaret seçer; random: sunucu seçer. */
  choice: z.enum(['player', 'random']),
  /** Oyuncu başına pas hakkı; -1 = sınırsız. */
  passes: z.number().int().min(-1).max(10),
  /** Pas geçen 1 puan kaybeder. */
  passPenalty: z.boolean(),
  /** "Yaptım" deyince diğerleri "Yaptı mı?" oylar. */
  vote: z.boolean(),
  /** target: sıradaki çeviren hedef olan kişi (klasik); round: masada sırayla. */
  order: z.enum(['target', 'round']),
  rounds: z.number().int().min(0).max(100),
  /** Son 2 çevirmede seçilenlerin yeniden gelme olasılığı azalır. */
  fairSpin: z.boolean(),
});
export type BottleSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: BottleSettings = {
  categories: ['eglenceli', 'arkadaslar', 'ask', 'utanc', CUSTOM_CATEGORY],
  choice: 'player',
  passes: 2,
  passPenalty: true,
  vote: true,
  order: 'target',
  rounds: 20,
  fairSpin: true,
};

const round = z.number().int().min(0);

export const actionSchema = z.discriminatedUnion('type', [
  /** Sırası gelen (ya da oda sahibi onun yerine) şişeyi çevirir. */
  z.object({ type: z.literal('spin'), round }),
  /** Hedef doğruluk ya da cesaret seçer. */
  z.object({ type: z.literal('choose'), round, kind: z.enum(KINDS) }),
  /** Hedef: yaptım / cevapladım. */
  z.object({ type: z.literal('done'), round }),
  /** Hedef: pas. */
  z.object({ type: z.literal('pass'), round }),
  /** Diğerleri: yaptı mı? */
  z.object({ type: z.literal('vote'), round, yes: z.boolean() }),
  /** Oda sahibi: sıradaki çevireni atla (ör. bağlantısı koptu). */
  z.object({ type: z.literal('skipSpinner'), round }),
  /** Oda sahibi: hedefin bağlantısı koptu, turu puansız geç. */
  z.object({ type: z.literal('skipTurn'), round }),
]);
export type BottleAction = z.infer<typeof actionSchema>;

export interface Prompt {
  id: string;
  kind: PromptKind;
  text: string;
  category: string;
}

export type BottlePhase = 'spin' | 'spinning' | 'choose' | 'task' | 'vote' | 'podium';

export type Outcome = 'done' | 'pass' | 'failed' | 'skipped';

export interface SpinInfo {
  /** Çevirme numarası (animasyonu yeniden başlatmak için anahtar). */
  id: number;
  /** Sunucu saatine göre başlangıç. */
  startAt: number;
  durationMs: number;
  fromDeg: number;
  toDeg: number;
}

export interface PlayerScore {
  points: number;
  done: number;
  passes: number;
  failed: number;
}

export interface LastResult {
  targetId: string;
  kind: PromptKind;
  text: string;
  outcome: Outcome;
  votes: { yes: number; no: number } | null;
}

export interface BottleView {
  phase: BottlePhase;
  /** Masadaki oturma sırası (açılar buradan hesaplanır). */
  seats: string[];
  /** Şimdiki çevirme numarası; hamleler bununla eşleşir. */
  round: number;
  /** Tamamlanan çevirme sayısı ve toplam (null = sınırsız). */
  turnNumber: number;
  totalRounds: number | null;
  spinnerId: string;
  /** Şişe animasyon bitip sonuç açıklanana kadar null. */
  targetId: string | null;
  spin: SpinInfo | null;
  /** Şişenin durduğu açı (animasyon yokken). */
  restDeg: number;
  kind: PromptKind | null;
  prompt: { id: string; text: string; category: string } | null;
  scores: Record<string, PlayerScore>;
  /** Hedefin kalan pas hakkı (null = sınırsız). */
  passesLeft: number | null;
  vote: { yes: number; no: number; voters: number; myVote: boolean | null; canVote: boolean; endsAt: number } | null;
  lastResult: LastResult | null;
  serverNow: number;
  choice: BottleSettings['choice'];
  passPenalty: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  truth: number;
  dare: number;
}

export const customPromptSchema = z.object({
  kind: z.enum(KINDS),
  text: z.string().trim().min(8, 'En az 8 harf yaz').max(200, 'En fazla 200 harf olabilir'),
});
export type CustomPromptInput = z.infer<typeof customPromptSchema>;

/** Oyuncu `i`'nin masadaki açısı (0 = üst, saat yönünde). */
export function seatAngle(i: number, n: number): number {
  return n > 0 ? (i * 360) / n : 0;
}
