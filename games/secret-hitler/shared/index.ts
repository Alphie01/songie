import { z } from 'zod';

export const GAME_ID = 'secret-hitler';
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

/** Oda sahibinin bekleyen oyuncu adına "atla" diyebilmesi için geçmesi gereken süre (sn). */
export const SKIP_AFTER_OPTIONS = [15, 30, 60, 120] as const;

export const settingsSchema = z.object({
  skipAfter: z.number().int().min(5).max(600),
});
export type SecretHitlerSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: SecretHitlerSettings = { skipAfter: 30 };

export type Role = 'liberal' | 'fascist' | 'hitler';
export type Party = 'liberal' | 'fascist';
export type Policy = 'liberal' | 'fascist';
export type Power = 'peek' | 'investigate' | 'specialElection' | 'execution';
export type VoteValue = 'ja' | 'nein';

export type Phase = 'nominate' | 'vote' | 'presidentLegislate' | 'chancellorLegislate' | 'power' | 'over';

/** Oyuncu sayısına göre rol dağılımı (liberal, faşist; Hitler her zaman 1). */
export const ROLE_COUNTS: Record<number, { liberal: number; fascist: number }> = {
  5: { liberal: 3, fascist: 1 },
  6: { liberal: 4, fascist: 1 },
  7: { liberal: 4, fascist: 2 },
  8: { liberal: 5, fascist: 2 },
  9: { liberal: 5, fascist: 3 },
  10: { liberal: 6, fascist: 3 },
};

export const LIBERAL_TO_WIN = 5;
export const FASCIST_TO_WIN = 6;
export const VETO_AT = 5;
export const HITLER_ZONE = 3;
export const DECK_LIBERAL = 6;
export const DECK_FASCIST = 11;

/** Faşist pistindeki yetkiler: dizideki i. eleman, i+1. faşist yasa çıkınca. */
export function fascistTrack(playerCount: number): (Power | null)[] {
  if (playerCount <= 6) return [null, null, 'peek', 'execution', 'execution', null];
  if (playerCount <= 8) return [null, 'investigate', 'specialElection', 'execution', 'execution', null];
  return ['investigate', 'investigate', 'specialElection', 'execution', 'execution', null];
}

/** 5–6 kişide Hitler faşisti tanır; 7+ kişide tanımaz. */
export function hitlerKnowsFascists(playerCount: number): boolean {
  return playerCount <= 6;
}

export const actionSchema = z.discriminatedUnion('type', [
  /** Başkan şansölye adayını gösterir. */
  z.object({ type: z.literal('nominate'), target: z.string() }),
  /** Oy; `round` aynı oylamaya ait olduğunu doğrular. */
  z.object({ type: z.literal('vote'), round: z.number().int(), vote: z.enum(['ja', 'nein']) }),
  /** Başkan 3 karttan birini atar. */
  z.object({ type: z.literal('discard'), session: z.number().int(), index: z.number().int().min(0).max(2) }),
  /** Şansölye 2 karttan birini yasalaştırır. */
  z.object({ type: z.literal('enact'), session: z.number().int(), index: z.number().int().min(0).max(1) }),
  /** Şansölye veto önerir (5 faşist yasadan sonra). */
  z.object({ type: z.literal('veto'), session: z.number().int() }),
  /** Başkan veto önerisine cevap verir. */
  z.object({ type: z.literal('vetoAnswer'), session: z.number().int(), accept: z.boolean() }),
  /** Politika önizlemeyi bitir. */
  z.object({ type: z.literal('peekDone'), session: z.number().int() }),
  /** Sadakat sorgulama, özel seçim ya da idam hedefi. */
  z.object({ type: z.literal('power'), session: z.number().int(), target: z.string() }),
  /** Oda sahibi: bekleyen oyuncu(lar) adına varsayılanı uygula. */
  z.object({ type: z.literal('skip'), session: z.number().int() }),
  /** Oda sahibi: oyun bittiyse lobiye hemen dön. */
  z.object({ type: z.literal('finish') }),
]);
export type SecretHitlerAction = z.infer<typeof actionSchema>;

export type LogEntry =
  | { k: 'start'; president: string }
  | { k: 'nominate'; president: string; chancellor: string }
  | { k: 'vote'; president: string; chancellor: string; ja: string[]; nein: string[]; passed: boolean }
  | { k: 'tracker'; count: number }
  | { k: 'enact'; policy: Policy; chaos: boolean }
  | { k: 'vetoAsked'; chancellor: string }
  | { k: 'veto'; president: string; chancellor: string }
  | { k: 'vetoDenied'; president: string }
  | { k: 'reshuffle'; deck: number }
  | { k: 'peek'; president: string }
  | { k: 'investigate'; president: string; target: string }
  | { k: 'special'; president: string; target: string }
  | { k: 'execute'; president: string; target: string }
  | { k: 'powerSkipped'; president: string; power: Power }
  | { k: 'skip'; who: string[]; phase: Phase }
  | { k: 'notHitler'; chancellor: string }
  | { k: 'over'; winner: Party | null; reason: WinReason };

export type WinReason = 'liberalPolicies' | 'hitlerExecuted' | 'fascistPolicies' | 'hitlerChancellor' | 'ended';

export interface SeatView {
  id: string;
  alive: boolean;
  /** Bu oylamada oy verdi mi (ne verdiği gizli). */
  voted: boolean;
  /** Sadakati sorgulandı mı (sonuç yalnızca sorgulayan başkanda). */
  investigated: boolean;
}

export interface SecretHitlerView {
  phase: Phase;
  playerCount: number;
  seats: SeatView[];
  /** Oyuncu değilse (sonradan katılan) null. */
  me: {
    role: Role;
    /** Bu oyuncunun bildiği diğer gizli roller (faşistler; 5–6 kişide Hitler için faşist). */
    known: { id: string; role: Role }[];
    /** Başkanken yaptığın sadakat sorgulamaları. */
    investigations: { target: string; party: Party }[];
  } | null;
  president: string;
  /** Aday ya da seçilmiş şansölye. */
  chancellor: string | null;
  lastElected: { president: string; chancellor: string } | null;
  /** Şu an aday gösterilebilecek oyuncular (herkese açık bilgi). */
  eligible: string[];
  liberal: number;
  fascist: number;
  track: (Power | null)[];
  electionTracker: number;
  deckCount: number;
  discardCount: number;
  vetoUnlocked: boolean;
  /** Oturum numarası: hamleler buna göre eşlenir, gecikmiş tıklamalar yutulur. */
  session: number;
  voteRound: number;
  myVote: VoteValue | null;
  /** Yalnızca elinde kart olan başkana/şansölyeye. */
  hand: Policy[] | null;
  vetoRequested: boolean;
  vetoDenied: boolean;
  power: Power | null;
  /** Yalnızca önizleme yapan başkana. */
  peek: Policy[] | null;
  /** Bir önceki oylamanın açılmış oyları. */
  lastVote: { president: string; chancellor: string; votes: Record<string, VoteValue>; passed: boolean } | null;
  log: LogEntry[];
  waitingFor: string[];
  /** Oda sahibi bu andan sonra "atla" diyebilir (bağlantısı kopan varsa hemen). */
  skipAt: number;
  serverNow: number;
  winner: Party | null;
  winReason: WinReason | null;
  /** Yalnızca oyun bitince: herkesin rolü. */
  roles: Record<string, Role> | null;
  finishAt: number;
}
