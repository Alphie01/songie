import { z } from 'zod';
import { foldText } from '@songie/shared';

export const GAME_ID = 'agents';
/** a = yeşil, b = mor. */
export const TEAM_IDS = ['a', 'b'] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const BOARD_SIZE = 25;
/** Başlayan takımın 9, diğerinin 8 ajanı; 7 tarafsız, 1 suikastçı. */
export const KEY_COUNTS = { start: 9, other: 8, neutral: 7, assassin: 1 } as const;

export const PACKS = ['genel', 'kolay', 'zor'] as const;
export type PackId = (typeof PACKS)[number];

export const SECONDS_OPTIONS = [60, 120] as const;
/** İpucu sayısı: 0–9, -1 = sınırsız. */
export const UNLIMITED = -1;

export const settingsSchema = z.object({
  /** Oyuncu kimlikleri. Takımı seçilmemiş oyuncular başlarken dengeli dağıtılır. */
  teams: z.object({ a: z.array(z.string()).max(12), b: z.array(z.string()).max(12) }),
  /** Oda sahibinin seçtiği liderler (`leaderPick: 'host'`). Boş kalan takıma rastgele lider seçilir. */
  leaders: z.object({ a: z.string().nullable(), b: z.string().nullable() }),
  leaderPick: z.enum(['host', 'random']),
  /** 'first': ilk dokunuş kartı açar. 'vote': takımın çoğunluğu aynı karta dokununca açılır. */
  revealMode: z.enum(['first', 'vote']),
  /** 'off': süresiz. 'split': lider ve takım için ayrı ayrı süre. 'total': tüm sıra için tek süre. */
  timer: z.enum(['off', 'split', 'total']),
  seconds: z.number().int().min(10).max(600),
  packs: z.array(z.enum(PACKS)).min(1, 'En az bir kelime paketi seç').max(PACKS.length),
});
export type AgentsSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: AgentsSettings = {
  teams: { a: [], b: [] },
  leaders: { a: null, b: null },
  leaderPick: 'random',
  revealMode: 'first',
  timer: 'off',
  seconds: 120,
  packs: ['genel'],
};

export const actionSchema = z.discriminatedUnion('type', [
  /** Lider: tek kelimelik ipucu ve sayı (0–9, -1 = sınırsız). */
  z.object({ type: z.literal('clue'), word: z.string().max(40), number: z.number().int().min(-1).max(9) }),
  /** Takım oyuncusu karta dokunur (oylama modunda oy verir / oyunu geri çeker). */
  z.object({ type: z.literal('touch'), index: z.number().int().min(0).max(BOARD_SIZE - 1), turn: z.number().int() }),
  z.object({ type: z.literal('endTurn'), turn: z.number().int() }),
  /** Oda sahibi: takımın liderini değiştirir (ör. bağlantısı koptu). */
  z.object({ type: z.literal('setLeader'), team: z.enum(TEAM_IDS), playerId: z.string() }),
  /** Oda sahibi, tablo bitince: aynı odada yeni tablo (liderler sırayla değişir). */
  z.object({ type: z.literal('newBoard') }),
  /** Oda sahibi, tablo bitince: sonuçları kaydet ve lobiye dön. */
  z.object({ type: z.literal('toLobby') }),
]);
export type AgentsAction = z.infer<typeof actionSchema>;

export type CardColor = TeamId | 'neutral' | 'assassin';
export type AgentsPhase = 'clue' | 'guess' | 'over';
export type Role = 'leader' | 'guesser' | 'spectator';
export type EndReason = 'agents' | 'assassin' | 'ended';

export interface AgentsCard {
  word: string;
  /** Açılmış kartlarda herkese; açılmamışlarda yalnızca liderlere (ve tablo bitince herkese). */
  color: CardColor | null;
  revealed: boolean;
  /** Oylama modunda bu karta dokunan oyuncular. */
  votes: string[];
}

export interface ClueEntry {
  team: TeamId;
  leaderId: string;
  /** null = lider süresinde ipucu vermedi. */
  word: string | null;
  number: number;
  picks: { word: string; color: CardColor }[];
}

export interface AgentsView {
  phase: AgentsPhase;
  /** Kaçıncı tablo (1'den başlar). */
  board: number;
  /** Sıra kimliği; eski tıklamalar bununla elenir. */
  turn: number;
  cards: AgentsCard[];
  /** true ise `cards[].color` açılmamış kartlar için de dolu (lider ya da tablo bitti). */
  keyVisible: boolean;
  teams: Record<TeamId, string[]>;
  leaders: Record<TeamId, string>;
  /** Tablo bittikten sonra oda sahibinin sıradaki tablo için seçtiği liderler. */
  nextLeaders: Partial<Record<TeamId, string>>;
  myTeam: TeamId | null;
  role: Role;
  /** Sırası gelen takım. */
  team: TeamId;
  startTeam: TeamId;
  remaining: Record<TeamId, number>;
  total: Record<TeamId, number>;
  clue: { word: string; number: number } | null;
  /** Bu sırada kalan açma hakkı; null = sınırsız. */
  guessesLeft: number | null;
  log: ClueEntry[];
  revealMode: AgentsSettings['revealMode'];
  /** Oylama modunda bir kartın açılması için gereken oy. */
  votesNeeded: number;
  serverNow: number;
  /** 0 = süre yok. */
  endsAt: number;
  durationMs: number;
  winner: TeamId | null;
  reason: EndReason | null;
  /** Bu odada kazanılan tablolar. */
  wins: Record<TeamId, number>;
  /** Oda sahibi oyunu bitirdi; birazdan lobiye dönülecek. */
  closing: boolean;
  lastReveal: { id: number; index: number; color: CardColor } | null;
}

/** Türkçe ünsüz yumuşaması: kitap → kitab(ı), kanat → kanad(ı), ırmak → ırmağ(ı). */
const SOFTEN: Record<string, string> = { p: 'b', t: 'd', k: 'g' };

function stems(folded: string): string[] {
  const out = [folded];
  const last = folded.at(-1) ?? '';
  if (SOFTEN[last]) out.push(folded.slice(0, -1) + SOFTEN[last]);
  return out;
}

/**
 * İpucunun neden geçersiz olduğunu söyler (yoksa null). Sunucu ve istemci aynı kuralı kullanır.
 * `hidden`: tablodaki açılmamış kelimeler.
 */
export function clueProblem(raw: string, hidden: string[]): string | null {
  const word = raw.trim();
  if (!word) return 'İpucu yaz.';
  if (/\s/.test(word)) return 'İpucu tek kelime olmalı; boşluk kullanma.';
  if (!/^\p{L}+$/u.test(word)) return 'İpucu yalnızca harflerden oluşmalı.';
  if (word.length < 2) return 'İpucu en az 2 harf olmalı.';
  if (word.length > 24) return 'İpucu en fazla 24 harf olabilir.';
  const c = foldText(word);
  for (const w of hidden) {
    const f = foldText(w);
    const same = c === f;
    // İpucu kelimenin kökü (göz → gözlük) ya da kelime ipucunun kökü (kalem → kalemlik, kitap → kitabı).
    const rootOfWord = c.length >= 3 && f.startsWith(c);
    const wordIsRoot = f.length >= 3 && stems(f).some((st) => c.startsWith(st));
    // Bileşik kelime: denizyıldızı ↔ yıldız.
    const compound = f.length >= 5 && c.endsWith(f);
    if (same || rootOfWord || wordIsRoot || compound) return `“${word}” tablodaki “${w}” kelimesine çok yakın. Başka bir kelime seç.`;
  }
  return null;
}
