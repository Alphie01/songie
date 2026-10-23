/**
 * Red Flag / Green Flag copy and the little sums PlayView does, copied from games/red-flag/client/strings.ts,
 * PlayView.tsx and server/game.ts majorityOf (the reels package does not depend on the game).
 */
export type RedFlagVote = 'green' | 'red' | 'never';
export type RedFlagCounts = Record<RedFlagVote, number>;

/** shared VOTES order. */
export const RF_VOTES: readonly RedFlagVote[] = ['green', 'red', 'never'];

export const RF_TEXT = {
  vote: { green: 'Green flag', red: 'Red flag', never: 'Asla olmaz' } as Record<RedFlagVote, string>,
  voteShort: { green: 'Green', red: 'Red', never: 'Asla' } as Record<RedFlagVote, string>,
  /** Sınır testi kartlarında seçeneklerin adı. */
  limitVote: { green: 'Varım', red: 'Hayır', never: 'Sınırım' } as Record<RedFlagVote, string>,
  you: 'sen',
  pick: 'Sen ne dersin?',
  pickHint: 'Bayrağını gizlice kaldır.',
  picked: 'Oyun gizli. Açılana kadar değiştirebilirsin.',
  guessTitle: 'Çoğunluk ne diyecek?',
  guessHint: 'Doğru tahmin +1 puan.',
  guessFirst: 'Önce kendi oyunu ver.',
  untimed: 'Süresiz',
  revealNow: 'Oyları şimdi aç',
  skip: 'Durumu atla',
  nobody: 'Kimse oy vermedi.',
  tie: 'Oylar bölündü',
  unanimous: 'Herkes aynı fikirde',
  guessHit: 'Tahminin tuttu, +1',
  noGuess: 'Tahmin vermedin',
  anonNote: 'İsimsiz mod: kimin ne dediği gönderilmez.',
  next: 'Sonraki durum',
  discussing: 'Tartışın…',
  ready: 'Hazırım',
  readyDone: 'Hazırsın',
} as const;

/** s.play.round / roundDone with the shown (1-based) number: "Durum 7/20", unlimited "Durum 7". */
export const roundLabel = (n: number, total: number | null) => (total ? `Durum ${Math.min(n, total)}/${total}` : `Durum ${n}`);
export const secsLabel = (n: number) => `${n} sn`;
export const waitingLabel = (done: number, total: number) => `${done}/${total} kişi oy verdi`;
export const majorityLabel = (v: string) => `Çoğunluk: ${v}`;
export const yourVoteLabel = (v: string) => `Sen: ${v}`;
export const guessMissLabel = (v: string) => `Tahminin ${v} idi, tutmadı`;
export const nextInLabel = (s: number) => `Tartışın… ${s}`;
export const readyCountLabel = (n: number, total: number, timed: boolean) =>
  timed
    ? `${n}/${total} kişi hazır. Süre bitince, herkes hazır olunca ya da oda sahibi geçince devam edilir.`
    : `${n}/${total} kişi hazır. Herkes hazır olunca ya da oda sahibi geçince devam edilir.`;

/** Choice labels: Varım / Hayır / Sınırım on limit-test cards. */
export const labelsFor = (limit: boolean) => (limit ? RF_TEXT.limitVote : RF_TEXT.vote);
/** Options on screen: "Asla olmaz" only with the third option (always on limit-test cards). */
export const optionsFor = (dealBreaker: boolean): RedFlagVote[] => (dealBreaker ? ['green', 'red', 'never'] : ['green', 'red']);

/** PlayView pct: whole percent, 0 when nobody voted. */
export const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** .rf-timer-bar fill in % (left over duration). */
export const timerFill = (seconds: number, duration: number) => (duration ? Math.max(0, Math.min(1, seconds / duration)) * 100 : 0);

/** Counts from named ballots. */
export function countVotes(votes: { vote: RedFlagVote }[]): RedFlagCounts {
  const c: RedFlagCounts = { green: 0, red: 0, never: 0 };
  for (const v of votes) c[v.vote] += 1;
  return c;
}

/** server majorityOf: every option on the top count, none when nobody voted. */
export function majorityOf(counts: RedFlagCounts): RedFlagVote[] {
  const max = Math.max(counts.green, counts.red, counts.never);
  if (max <= 0) return [];
  return RF_VOTES.filter((v) => counts[v] === max);
}

/** The big .rf-verdict line. */
export function verdictLabel(counts: RedFlagCounts, options: RedFlagVote[], labels: Record<RedFlagVote, string>): string {
  const total = counts.green + counts.red + counts.never;
  const majority = majorityOf(counts);
  if (total === 0) return RF_TEXT.nobody;
  if (total > 1 && options.some((v) => counts[v] === total)) return RF_TEXT.unanimous;
  if (majority.length > 1) return RF_TEXT.tie;
  return majorityLabel(labels[majority[0]!]);
}

/** .rf-you: "Sen: Red flag · Tahminin tuttu, +1". guess null = no guess; predict off = vote part only. */
export function youLine(
  myVote: RedFlagVote | null,
  myGuess: RedFlagVote | null,
  majority: RedFlagVote[],
  predict: boolean,
  labels: Record<RedFlagVote, string>,
): string {
  const guess = !predict ? null : myGuess === null ? RF_TEXT.noGuess : majority.includes(myGuess) ? RF_TEXT.guessHit : guessMissLabel(labels[myGuess]);
  return [myVote ? yourVoteLabel(labels[myVote]) : null, guess].filter(Boolean).join(' · ');
}
