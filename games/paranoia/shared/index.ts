import { z } from 'zod';

export const GAME_ID = 'paranoia';
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;

export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;
/** 0 = süresiz. */
export const THINK_OPTIONS = [0, 20, 40] as const;

/** Oyuncuların eklediği sorular bu kategoride toplanır. */
export const CUSTOM_CATEGORY = 'eklenen';

export const BUILT_IN_CATEGORIES = ['genel', 'arkadaslik', 'ask', 'gelecek', 'utanc', 'yetenek', 'cesur'] as const;

export const settingsSchema = z.object({
  questionCount: z.number().int().min(1).max(40),
  categories: z.array(z.string().min(1).max(40)).min(1, 'En az bir kategori seç').max(20),
  /** Düşünme süresi (saniye). 0 = süresiz. */
  thinkSeconds: z.number().int().min(0).max(300),
  /** Süre dolunca: rastgele bir oyuncu seçilir ya da soru pas geçilir. */
  onTimeout: z.enum(['random', 'pass']),
  /** Soruyu alan kişi kendini seçebilir mi? */
  allowSelf: z.boolean(),
  /** Soruyu sana gönderen kişiyi (bir önceki soruyu alanı) seçemezsin. */
  noReturn: z.boolean(),
  /** Açıkken soruyu kimin aldığı da diğerlerinden gizlenir. */
  hideHolder: z.boolean(),
  /** İlk soruyu kim alır: rastgele ya da oda sahibi seçer. */
  firstHolder: z.enum(['random', 'host']),
  /** Açıklamada "Sonraki": oda sahibi basar ya da çoğunluk oy verir. */
  revealBy: z.enum(['host', 'vote']),
});
export type ParanoiaSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: ParanoiaSettings = {
  questionCount: 10,
  categories: ['genel', 'arkadaslik', 'ask', 'gelecek', 'utanc', 'yetenek', CUSTOM_CATEGORY],
  thinkSeconds: 40,
  onTimeout: 'random',
  allowSelf: false,
  noReturn: true,
  hideHolder: true,
  firstHolder: 'random',
  revealBy: 'host',
};

export const actionSchema = z.discriminatedUnion('type', [
  /** Oda sahibi: ilk soruyu alacak kişiyi seçer (firstHolder = 'host'). */
  z.object({ type: z.literal('pickFirst'), targetId: z.string().min(1).max(64) }),
  /** Soruyu alan kişi cevap olarak bir oyuncu seçer. `seq` eski/çift tıklamaları ayıklar. */
  z.object({ type: z.literal('choose'), seq: z.number().int(), targetId: z.string().min(1).max(64) }),
  /**
   * Oda sahibi: soruyu alan kişi takıldı (bağlantısı koptu). `random` = onun yerine rastgele cevap,
   * `reassign` = aynı soru rastgele başka bir oyuncuya gider.
   */
  z.object({ type: z.literal('skip'), seq: z.number().int(), mode: z.enum(['random', 'reassign']) }),
  /** Açıklamada sıradaki soruya geç (oda sahibi ya da oy). `shown` = istemcinin gördüğü açık soru sayısı. */
  z.object({ type: z.literal('next'), shown: z.number().int() }),
  /** Özet ekranında oda sahibi: oyunu bitir ve lobiye dön. */
  z.object({ type: z.literal('finish') }),
]);
export type ParanoiaAction = z.infer<typeof actionSchema>;

export type ParanoiaPhase = 'pickFirst' | 'asking' | 'reveal' | 'summary';

/** Bir sorunun nasıl sonuçlandığı. */
export type AnswerHow = 'chosen' | 'random' | 'pass' | 'host';

export interface RevealedEntry {
  /** 1'den başlayan sıra. */
  n: number;
  question: string;
  /** Soruyu alan (cevaplayan) kişi. */
  askedId: string;
  /** Cevap olarak seçilen kişi; pas geçildiyse null. */
  answerId: string | null;
  how: AnswerHow;
}

export interface ParanoiaView {
  phase: ParanoiaPhase;
  /** Oyundaki oyuncular (katılma sırasıyla). */
  players: string[];
  /** Oyuncu adları (ayrılanlar dahil). */
  names: Record<string, string>;
  total: number;
  /** Cevaplanan soru sayısı. */
  answered: number;
  serverNow: number;
  /** Düşünme süresinin bittiği an; süresizse null. */
  endsAt: number | null;
  durationMs: number;

  /** Toplama aşamasındaki sorunun sıra numarası (hamlelerde gönderilir). */
  seq: number;
  /** Soru sende mi? */
  myTurn: boolean;
  /** Yalnızca soruyu alan kişiye gider. */
  question: string | null;
  /** Seçilebilecek oyuncular: soruyu alana (ya da ilk seçimde oda sahibine) gider. */
  choices: string[];
  /** Soruyu kimin aldığı; "kime sorulduğu gizli" açıkken başkalarına null. */
  holderId: string | null;
  /** Yalnızca oda sahibine: soruyu alan kişinin bağlantısı koptu. */
  holderOffline: boolean;
  /** Bir soru cevaplanınca artar (bekleyen ekranlarda küçük bir işaret için). */
  pulse: number;
  /** Kendi aldığın ve cevapladığın sorular (yalnızca sana). */
  mine: { question: string; answerId: string | null; how: AnswerHow }[];

  /** Açıklama: şimdiye kadar açılanlar (sonuncusu sahnede). */
  revealed: RevealedEntry[];
  revealTotal: number;
  votes: number;
  votesNeeded: number;
  myVote: boolean;
  /** Özet: kim kaç kez cevap olarak seçildi (çoktan aza). */
  stats: { playerId: string; picked: number; asked: number }[];
  /** Özet ekranının kendiliğinden kapanacağı an. */
  closesAt: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export const customQuestionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(8, 'Soru en az 8 harf olmalı')
    .max(140, 'Soru en fazla 140 harf olabilir'),
});
export type CustomQuestionInput = z.infer<typeof customQuestionSchema>;
