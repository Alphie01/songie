/**
 * Aramızdaki En copy and the little sums PlayView does, copied from games/most-likely/client/strings.ts,
 * PlayView.tsx and shared/index.ts (the reels package does not depend on the game).
 */
export const ML_TEXT = {
  prefix: 'Aramızdaki en',
  suffix: 'kim?',
  you: 'sen',
  modeVote: 'Oyum',
  modeGuess: 'Tahminim',
  tapToGuess: 'Sence kim kazanacak? Bir oyuncuya dokun.',
  myVote: 'Oyun',
  myGuess: 'Tahminin',
  waiting: 'Beklenenler',
  skip: 'Soruyu atla',
  revealNow: 'Sonuçları şimdi aç',
  untimed: 'Herkes oy verince sonuçlar açılır.',
  anonymousNote: 'Oylar isimsiz. Kime verdiğini kimse görmeyecek.',
  openNote: 'Oylar açık. Sonuçlarda kimin kime verdiği görünecek.',
  winnerOne: 'Unvan sahibi',
  winnerTie: 'Beraberlik, unvan paylaşıldı',
  noVotes: 'Kimse oy vermedi, bu unvan boşta kaldı.',
  votedBy: 'Oy verenler',
  nobodyGuessed: 'Kimse doğru tahmin etmedi.',
  next: 'Sıradaki soru',
  finish: 'Sonuçları gör',
  waitHost: 'Oda sahibi sıradaki soruya geçecek.',
  history: 'Unvan geçmişi',
  historyEmpty: 'Henüz unvan dağıtılmadı. İlk sonuçlar açılınca burada görünecek.',
} as const;

export const roundLabel = (n: number, total: number | null) => (total ? `Soru ${n}/${total}` : `Soru ${n}`);
export const tapToVote = (self: boolean) =>
  self
    ? 'Bir oyuncuya dokunarak oy ver; kendine de verebilirsin! Sonuçlar açılana kadar değiştirebilirsin.'
    : 'Bir oyuncuya dokunarak oy ver. Sonuçlar açılana kadar değiştirebilirsin.';
export const progressLabel = (done: number, total: number) => `${done}/${total} kişi oy verdi`;
/** Unvan biçimi: "en geç kalan". */
export const titleOf = (text: string) => `en ${text}`;
export const winnerLine = (title: string, votes: number) => `${title} · ${votes} oy`;
export const correctGuessLabel = (names: string) => `Doğru tahmin edenler: ${names}`;

/** "Ayşe, Cem ve Deniz" (PlayView joinNames). */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
}

/** "4/6 kişi oy verdi · Beklenenler: Zeynep ve Bora" (.ml-status). */
export function statusLine(done: number, total: number, waiting: string[]): string {
  return progressLabel(done, total) + (waiting.length ? ` · ${ML_TEXT.waiting}: ${joinNames(waiting)}` : '');
}

/** "Oyun · Tahminin" tag over a tile. */
export function tileTag(isVote: boolean, isGuess: boolean): string {
  return [isVote && ML_TEXT.myVote, isGuess && ML_TEXT.myGuess].filter(Boolean).join(' · ');
}

export type MLRow = { id: string; votes: number };
export type MLResult = { rows: MLRow[]; winners: string[]; max: number; total: number };

/**
 * Server RoundResult + PlayView rows: everyone with votes, most first (ties in player order), then the
 * players nobody voted for with 0. Winners = everyone on the top count; no votes = no winner.
 */
export function tally(players: string[], votes: Record<string, number>): MLResult {
  const counts = players
    .map((id, i) => ({ id, votes: votes[id] ?? 0, i }))
    .filter((c) => c.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.i - b.i)
    .map(({ id, votes: v }) => ({ id, votes: v }));
  const max = counts[0]?.votes ?? 0;
  const total = counts.reduce((n, c) => n + c.votes, 0);
  const rows = [...counts, ...players.filter((p) => !counts.some((c) => c.id === p)).map((id) => ({ id, votes: 0 }))];
  return { rows, winners: max > 0 ? counts.filter((c) => c.votes === max).map((c) => c.id) : [], max, total };
}

/** .ml-bar-fill width in % (votes over all votes). */
export const barWidth = (votes: number, total: number) => (total ? (votes / total) * 100 : 0);

/** .ml-timer-bar fill in % (remaining over duration). */
export const timerFill = (seconds: number, duration: number) => (duration ? Math.max(0, Math.min(1, seconds / duration)) * 100 : 0);
