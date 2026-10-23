/**
 * Ben Hiç copy and the little sums PlayView does, copied from games/never/client/strings.ts and PlayView.tsx
 * (the reels package does not depend on the game). The app's 'didNot' answer is 'didnt' here.
 */
export type NeverChoice = 'did' | 'didnt';

export const NV_TEXT = {
  lead: 'Ben hiç…',
  did: 'Yaptım',
  didNot: 'Yapmadım',
  askNote: 'Cevabını kimse görmez; herkes cevaplayınca açılır.',
  answeredNote: 'Cevabın gizli. Açılana kadar fikrini değiştirebilirsin.',
  revealNow: 'Cevapları şimdi aç',
  nextStatement: 'Başka cümle getir',
  next: 'Sıradaki cümle',
  waitHost: 'Oda sahibi sıradaki cümleye geçecek.',
  eliminatedTag: 'elendi',
} as const;

export const roundLabel = (n: number, total: number | null) => (total ? `Ben Hiç · Tur ${n}/${total}` : `Ben Hiç · Tur ${n}`);
export const secsLabel = (n: number) => `${n} sn`;
export const answeredLabel = (n: number, total: number) => `${n}/${total} kişi cevapladı`;
export const skipLabel = (votes: number, needed: number) => (votes ? `Bu cümleyi atla (${votes}/${needed})` : 'Bu cümleyi atla');
export const unansweredLabel = (n: number) => `${n} kişi cevap vermedi`;
export const yourAnswerLabel = (a: NeverChoice) => (a === 'did' ? 'Sen: yaptım' : 'Sen: yapmadım');
export const doerLivesLabel = (n: number) => `${n} parmak`;
export const storytellerLabel = (nick: string) => `${nick}, hikâyeyi anlatma sırası sende!`;
export const leaderLabel = (nick: string, n: number) => `Şu ana kadar en çok yapan: ${nick} (${n} kez)`;

/** "Ben hiç" girişini cümlenin geri kalanından ayırır (PlayView splitStatement). */
export const splitStatement = (text: string) => text.replace(/^Ben hiç\s+/u, '');

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
}

export const eliminatedLabel = (names: string[]) => `${joinNames(names)} elendi.`;

/** Rounded percentage, 0 when nobody is counted (progress bar and reveal bar). */
export const percent = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Reveal headline, same branches as PlayView Reveal. */
export function revealHeadline(didCount: number, answered: number): string {
  if (answered === 0) return 'Kimse cevap vermedi.';
  if (didCount === 0) return 'Kimse yapmamış. Temiz bir grup.';
  if (didCount === answered) return 'Herkes yapmış.';
  return `${answered} kişiden ${didCount} kişi yaptı`;
}
