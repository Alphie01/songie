/**
 * Gizli İtiraflar copy and the little sums PlayView does, copied from games/confessions/client/strings.ts,
 * PlayView.tsx and shared/index.ts (the reels package does not depend on the game).
 */
export const CONFESSION_MIN = 10;
export const CONFESSION_MAX = 240;

export const REACTIONS = ['yok', 'bende', 'efsane', 'olamaz'] as const;
export type ReactionKey = (typeof REACTIONS)[number];
export type ReactionCounts = Record<ReactionKey, number>;

export const CF_TEXT = {
  writePhase: 'Yaz',
  topicLabel: 'Bu turun konusu',
  freeTopic: 'Serbest itiraf',
  freeTopicHint: 'Aklına gelen, kimsenin bilmediği bir şey yaz.',
  you: 'sen',
  me: 'Bu benim',
  placeholder: 'İtirafını yaz. İsmin görünmeyecek.',
  send: 'İtirafı gönder',
  update: 'İtirafı güncelle',
  sent: 'İtirafın gönderildi. Süre bitene kadar değiştirebilirsin.',
  privacy: 'Kimin yazdığını açıklamaya kadar yalnızca sen bilirsin.',
  wroteTitle: 'Yazanlar',
  wrote: 'yazdı',
  waiting: 'yazıyor',
  closeWriting: 'Yazmayı bitir',
  closeWritingHint: 'Yazanların itiraflarıyla tahmine geçilir.',
  whoWrote: 'Sence kim yazdı?',
  whoWroteHint: 'Herkes bir seçim yapar, yazan dahil. Kendi itirafınsa da birini seç; seçimin sayılmaz ve kimse anlamaz.',
  changePick: 'Süre bitene kadar değiştirebilirsin.',
  gotIt: 'Bildin!',
  missed: 'Bilemedin.',
  hide: 'İtirafı gizle',
  closeGuess: 'Tahmini bitir',
  next: 'Sıradaki itiraf',
  nextRound: 'Sonraki tura geç',
  nobodyRight: 'Kimse bilemedi.',
  scores: 'Puanlar',
  reactions: { yok: 'Yok artık', bende: 'Ben de!', efsane: 'Efsane', olamaz: 'Olamaz' } satisfies Record<ReactionKey, string>,
} as const;

export const roundLabel = (n: number, total: number | null) => (total ? `Tur ${n}/${total}` : `Tur ${n}`);
/** Write-phase pill: "Tur 2/5 · Yaz". */
export const writeHead = (n: number, total: number | null) => `${roundLabel(n, total)} · ${CF_TEXT.writePhase}`;
export const confessionOf = (i: number, n: number) => `İtiraf ${i}/${n}`;
export const secsLabel = (n: number) => `${n} sn`;
export const counterLabel = (len: number) => `${len}/${CONFESSION_MAX}`;
export const pickedLabel = (n: number, total: number) => `${n}/${total} kişi seçti`;
export const myPickLabel = (nick: string, n: number, total: number) => `Seçimin: ${nick}. ${n}/${total} kişi seçti.`;
export const authorLabel = (nick: string) => `Yazan: ${nick}`;
export const votesLabel = (n: number) => `${n} oy`;
export const rightListLabel = (names: string) => `Bilenler: ${names}`;
export const fooledLabel = (nick: string, n: number) => (n > 0 ? `${nick}, ${n} kişiyi yanılttı.` : `${nick} kimseyi yanıltamadı.`);
export const fooledMeLabel = (n: number) => (n > 0 ? `Sen ${n} kişiyi yanılttın.` : 'Kimseyi yanıltamadın.');
export const detailLabel = (correct: number, fooled: number) => `${correct} doğru, ${fooled} yanıltma`;
export const reactionLabel = (r: ReactionKey, n: number) => `${CF_TEXT.reactions[r]} ${n}`;
/** "Yazanlar 3/6" box title (shown upper-case by .cf-box-title). */
export const wroteTitle = (n: number, online: number) => `${CF_TEXT.wroteTitle} ${n}/${online}`;
/** One "who wrote" chip: "Mert ✓ yazdı" / "Ece yazıyor". */
export const wroteChip = (nick: string, done: boolean) => `${nick} ${done ? `✓ ${CF_TEXT.wrote}` : CF_TEXT.waiting}`;

/** Trimmed length PlayView counts and whether the send button is enabled (len ≥ 10, not an unchanged resend). */
export const trimmedLength = (text: string) => text.trim().length;
export const canSend = (text: string, sent: boolean, dirty: boolean) => trimmedLength(text) >= CONFESSION_MIN && (!sent || dirty);
/** .cf-counter[data-bad]: something typed but under the minimum. */
export const counterBad = (len: number) => len > 0 && len < CONFESSION_MIN;

/** Timer strip fill in % (PlayView Timer). */
export const timerFill = (seconds: number, duration: number) => Math.min(100, Math.max(0, (seconds / Math.max(1, duration)) * 100));

/** Points the author gets: one per voter who picked someone else (PlayView Foot reads it from reveal.points). */
export const fooledCount = (votes: Record<string, number>, author: string) =>
  Object.entries(votes).reduce((sum, [nick, n]) => (nick === author ? sum : sum + n), 0);

/**
 * The reveal foot (PlayView Foot): main line, sub line and tone. `me` is my nick, `pick` my guess.
 * Tone 'hit' = mint (I guessed right), otherwise 'light' (white).
 */
export function revealFoot(opts: { author: string; me?: string; pick?: string; fooled: number; correct: string[] }): {
  line: string;
  sub: string;
  tone: 'hit' | 'light';
} {
  const { author, me, pick, fooled, correct } = opts;
  const mine = me != null && author === me;
  const hit = !mine && pick === author;
  const line = mine ? fooledMeLabel(fooled) : `${pick ? `${hit ? CF_TEXT.gotIt : CF_TEXT.missed} ` : ''}${fooledLabel(author, fooled)}`;
  const right = correct.map((nick) => (nick === me ? CF_TEXT.you : nick));
  return { line, sub: right.length ? rightListLabel(right.join(', ')) : CF_TEXT.nobodyRight, tone: hit ? 'hit' : 'light' };
}
