import { z } from 'zod';

export const GAME_ID = 'song-guess';

/** Her aşamada çalınan klip uzunluğu (saniye). */
export const STAGE_CLIPS = [0.1, 0.5, 2, 8, 15] as const;
export const STAGE_COUNT = STAGE_CLIPS.length;
export const STAGE_POINTS = [1000, 700, 450, 250, 100] as const;
export const SPEED_BONUS = 200;
export const FIRST_BONUS = 50;
export const ARTIST_SHARE = 0.3;

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'impossible'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Aşama başına süre seçenekleri (sn). 0 = süresiz: aşamalar yalnızca pas/tahminle ilerler. */
export const TIMER_OPTIONS = [0, 10, 20, 30] as const;
/** Tur sayısı seçenekleri. 0 = sınırsız. */
export const ROUND_OPTIONS = [5, 10, 15, 20, 0] as const;

export const settingsSchema = z.object({
  rounds: z.number().int().min(0).max(50),
  pools: z.array(z.string().min(1).max(64)).min(1, 'En az bir liste seç').max(12),
  difficulty: z.enum(DIFFICULTIES),
  timer: z.number().int().min(0).max(120),
  startAt: z.enum(['start', 'random']),
  /** Oyun bu aşamadan başlar (songspot'taki "Guess after"). */
  startStage: z.number().int().min(0).max(STAGE_COUNT - 1),
  /** Öneriler yalnızca seçili listelerden gelir. */
  easySearch: z.boolean(),
  artistCredit: z.boolean(),
});
export type SongSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: SongSettings = {
  rounds: 10,
  pools: ['tr-top', 'global-top'],
  difficulty: 'medium',
  timer: 0,
  startAt: 'random',
  startStage: 0,
  easySearch: false,
  artistCredit: true,
};

/** Tek başına: sınırsız, süresiz; seri sayılır. */
export const soloSettings: SongSettings = { ...defaultSettings, rounds: 0 };

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('guess'), trackId: z.number().int().positive() }),
  z.object({ type: z.literal('skip') }),
  /** Sonuç ekranında "Sonraki şarkı". Oda sahibi `force` ile beklemeden geçirir. */
  z.object({ type: z.literal('next'), force: z.boolean().optional() }),
  /** Oda sahibi: kimse bir şey yapmıyorsa sonraki aşamayı herkese aç. */
  z.object({ type: z.literal('advance') }),
]);
export type SongAction = z.infer<typeof actionSchema>;

export type Verdict = 'wrong' | 'artist' | 'correct';
export type PlayerRoundState = 'listening' | 'locked' | 'skipped' | 'artist' | 'correct';

export interface GuessRecord {
  stage: number;
  title: string;
  artist: string;
  verdict: Verdict;
}

export interface PlayerLine {
  id: string;
  score: number;
  roundPoints: number;
  state: PlayerRoundState;
  /** Doğru bildiği aşama (0–4). */
  solvedStage: number | null;
  /** Art arda doğru bilinen şarkı sayısı. */
  streak: number;
  bestStreak: number;
  /** Sonuç ekranında "Sonraki şarkı"ya bastı mı. */
  ready: boolean;
}

export interface RevealInfo {
  trackId: number;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  year: number | null;
  link: string;
  previewUrl: string;
  results: { playerId: string; stage: number; points: number; kind: 'artist' | 'correct' }[];
}

export type FeedKind = 'correct' | 'artist' | 'wrong' | 'skip' | 'settings';

/** Canlı akış: kim ne yaptı (tahminin kendisi gösterilmez, ipucu olmasın). */
export interface FeedItem {
  id: number;
  at: number;
  playerId: string;
  kind: FeedKind;
  stage: number;
  points?: number;
  /** 'settings' için kısa açıklama. */
  text?: string;
}

export type SongPhase = 'loading' | 'countdown' | 'stage' | 'reveal' | 'podium';

export interface SongView {
  phase: SongPhase;
  round: number;
  totalRounds: number | null;
  stage: number;
  stageClips: readonly number[];
  serverNow: number;
  phaseEndsAt: number;
  phaseMs: number;
  /** Açılmış aşamaların klip adresleri; açılmamışlar null. */
  clips: (string | null)[];
  poolNames: string[];
  players: PlayerLine[];
  me: { state: PlayerRoundState; canGuess: boolean; guesses: GuessRecord[] };
  reveal: RevealInfo | null;
  /** Aşama süresi açık mı; kapalıyken phaseEndsAt anlamsızdır. */
  timed: boolean;
  startStage: number;
  easySearch: boolean;
  pools: string[];
  artistCredit: boolean;
  difficulty: Difficulty;
  feed: FeedItem[];
}

export interface SearchHit {
  id: number;
  title: string;
  artist: string;
  cover: string | null;
}

export interface PoolInfo {
  id: string;
  name: string;
  category: PoolCategory;
  cover: string | null;
  trackCount: number;
  custom: boolean;
}

export const POOL_CATEGORIES = ['turkce', 'global', 'tur', 'donem', 'ulke', 'ozel'] as const;
export type PoolCategory = (typeof POOL_CATEGORIES)[number];

/** Aşama içinde ne kadar erken bilinirse o kadar hız bonusu. */
export function scoreFor(opts: {
  stage: number;
  elapsedMs: number;
  stageMs: number;
  kind: 'artist' | 'correct';
  first: boolean;
}): number {
  const base = STAGE_POINTS[opts.stage] ?? 0;
  const speed = Math.round(SPEED_BONUS * Math.max(0, Math.min(1, 1 - opts.elapsedMs / opts.stageMs)));
  if (opts.kind === 'artist') return Math.round((base + speed) * ARTIST_SHARE);
  return base + speed + (opts.first ? FIRST_BONUS : 0);
}
