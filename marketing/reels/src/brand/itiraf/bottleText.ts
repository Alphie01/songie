/**
 * Şişe Çevirmece (game id `bottle`) copy and the little sums PlayView / the server do, copied from
 * games/bottle/client/strings.ts, client/PlayView.tsx and shared/index.ts + server/game.ts startSpin
 * (the reels package does not depend on the game).
 */
export type BottleKind = 'truth' | 'dare';
export type BottleOutcome = 'done' | 'pass' | 'failed' | 'skipped';

export const BT_TEXT = {
  name: 'Şişe Çevirmece',
  kind: { truth: 'Doğruluk', dare: 'Cesaret' } as Record<BottleKind, string>,
  you: 'sen',
  yourTurn: 'Sıra sende',
  spin: 'Şişeyi çevir',
  spinHint: 'Şişe kimi gösterirse o seçecek.',
  spinning: 'Şişe dönüyor…',
  pointedYou: 'Şişe seni gösterdi',
  chooseHint: 'Seç: dürüstçe cevapla ya da görevi yap.',
  done: { truth: 'Cevapladım', dare: 'Yaptım' } as Record<BottleKind, string>,
  pass: 'Pas',
  noPass: 'Pas hakkın kalmadı',
  passCost: 'Pas geçersen 1 puan kaybedersin.',
  voteTitle: { truth: 'Dürüstçe cevapladı mı?', dare: 'Görevi yaptı mı?' } as Record<BottleKind, string>,
  yes: 'Evet',
  no: 'Hayır',
  voteWait: 'Diğerleri oyluyor…',
} as const;

/** s.play.round: "Çevirme 6/20" (turnNumber = finished spins), "Çevirme 6" when unlimited. */
export const roundLabel = (n: number, total: number | null) => (total ? `Çevirme ${Math.min(n + 1, total)}/${total}` : `Çevirme ${n + 1}`);
/** s.play.spunBy: "Şişeyi Mert çevirdi, sıra sende". */
export const spunBy = (prev: string, prevIsMe: boolean, mine: boolean, next: string) =>
  `${prevIsMe ? 'Şişeyi sen çevirdin' : `Şişeyi ${prev} çevirdi`}, ${mine ? 'sıra sende' : `şimdi ${next} çevirecek`}`;
export const waitSpinner = (nick: string) => `Şişeyi ${nick} çevirecek.`;
export const pointed = (nick: string) => `Şişe durdu: ${nick}`;
export const choosing = (nick: string) => `${nick} seçiyor: doğruluk mu, cesaret mi?`;
export const doing = (kind: BottleKind, nick: string) => (kind === 'truth' ? `${nick} cevaplıyor` : `${nick} görevi yapıyor`);
export const passLeft = (left: number | null) => (left === null ? 'sınırsız' : `${left} hak`);
export const votedLabel = (n: number, total: number) => `${n}/${total} oy`;
export const secsLabel = (n: number) => `${n} sn`;
export const votesLabel = (yes: number, no: number) => `${yes} evet, ${no} hayır`;
export const lastHead: Record<BottleOutcome, (nick: string) => string> = {
  done: (nick) => `${nick} +1 puan aldı`,
  pass: (nick) => `${nick} pas geçti`,
  failed: (nick) => `Masa ${nick} için “yapmadı” dedi`,
  skipped: (nick) => `${nick} için tur geçildi`,
};
/** LastResult .bt-last-head: "Mert +1 puan aldı (4 evet, 1 hayır)". */
export const lastLine = (outcome: BottleOutcome, nick: string, votes?: { yes: number; no: number } | null) =>
  `${lastHead[outcome](nick)}${votes ? ` (${votesLabel(votes.yes, votes.no)})` : ''}`;

/** shared seatAngle: player i's angle on the table (0 = top, clockwise). */
export const seatAngle = (i: number, n: number) => (n > 0 ? (i * 360) / n : 0);

/** Table seat centre in % of the .bt-table box (PlayView: 50 ± 42.4 sin/cos). */
export function seatPos(i: number, n: number): { left: number; top: number } {
  const a = (seatAngle(i, n) * Math.PI) / 180;
  return { left: 50 + 42.4 * Math.sin(a), top: 50 - 42.4 * Math.cos(a) };
}

/** .bt-table data-n: seats shrink past 7 and 10 players. */
export const tableSize = (n: number): 'few' | 'mid' | 'many' => (n > 10 ? 'many' : n > 7 ? 'mid' : 'few');

/**
 * Final bottle rotation (deg, CSS rotate: neck up at 0, clockwise) so it points at `target`, the way
 * server/game.ts startSpin computes toDeg: from + turns·360 + the forward delta to the target's seat (+ jitter).
 */
export function bottleAngleFor(target: string, players: string[], turns: number, from = 0, jitter = 0): number {
  const i = players.indexOf(target);
  if (i < 0) return from;
  const want = seatAngle(i, players.length) + jitter;
  const current = ((from % 360) + 360) % 360;
  const delta = (((want - current) % 360) + 360) % 360;
  return from + turns * 360 + delta;
}

/** PlayView easeOut (1 − (1 − t)^4) for the spin. */
export const spinEase = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);
/** Bottle angle at spin progress t (0..1) between fromDeg and toDeg, as useBottle draws it. */
export const spinAt = (fromDeg: number, toDeg: number, t: number) => fromDeg + (toDeg - fromDeg) * spinEase(t);

/** Vote progress bar width in % ((yes + no) / voters). */
export const voteFill = (yes: number, no: number, voters: number) => Math.round(((yes + no) / (voters || 1)) * 100);
