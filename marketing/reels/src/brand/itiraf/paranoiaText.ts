/**
 * Gizlilik Esas (Paranoya, game id `paranoia`) copy and the little sums PlayView does, copied from
 * games/paranoia/client/strings.ts and PlayView.tsx (the reels package does not depend on the game).
 */
export type ParanoiaHow = 'chosen' | 'random' | 'pass' | 'host';

/** strings.ts suffix: Turkish case endings "Ayşe'ye", "Barış'ın"; null when the nick has no vowel / ends in a non-letter. */
export function suffix(nick: string, kind: 'dat' | 'gen'): string | null {
  const name = nick.trim();
  const lower = name.toLocaleLowerCase('tr-TR');
  const last = lower.at(-1) ?? '';
  if (!/\p{L}/u.test(last)) return null;
  const vowels = [...lower].filter((c) => 'aıoueiöü'.includes(c));
  const v = vowels.at(-1);
  if (!v) return null;
  const endsVowel = 'aıoueiöü'.includes(last);
  if (kind === 'dat') {
    const e = 'aıou'.includes(v) ? 'a' : 'e';
    return `${name}'${endsVowel ? 'y' : ''}${e}`;
  }
  const i = 'aı'.includes(v) ? 'ı' : 'ou'.includes(v) ? 'u' : 'ei'.includes(v) ? 'i' : 'ü';
  return `${name}'${endsVowel ? 'n' : ''}${i}n`;
}

export const PN_TEXT = {
  name: 'Gizlilik Esas',
  you: 'sen',
  players: 'Oyuncular',
  thinking: 'düşünüyor',
  envelopeTitle: 'Sana gizli bir soru geldi!',
  envelopeHint: 'Kimse görmesin, sonra zarfa dokun.',
  sentYou: 'sana gönderdi',
  yourTurn: 'Sıra sende',
  secretNote: 'Bu soruyu yalnızca sen görüyorsun.',
  pickTitle: 'Cevabın kim?',
  confirm: 'Seçimi onayla',
  sending: 'Gönderiliyor…',
  timeoutRandom: 'Süre bitince rastgele biri seçilir.',
  timeoutPass: 'Süre bitince soru pas geçilir.',
  waitHidden: 'Şu an birine soru soruldu, düşünüyor…',
  waitHint: 'Sorular ve cevaplar en sonda teker teker açılacak.',
  answeredFlash: 'Bir soru cevaplandı',
  mine: 'Senin gizli cevapların',
  mineHint: 'Bunları yalnızca sen görüyorsun; açıklamaya kadar sır.',
  passed: 'pas geçildi',
  noAnswer: 'Cevap vermedi',
  how: {
    chosen: null,
    random: 'Süre bitti, rastgele seçildi',
    pass: 'Süre bitti, pas geçildi',
    host: 'Oda sahibi onun yerine rastgele seçti',
  } as Record<ParanoiaHow, string | null>,
  next: 'Sıradaki soruyu aç',
  last: 'Özeti göster',
  hostWillOpen: 'Sıradaki soruyu oda sahibi açacak.',
  history: 'Açılan sorular',
} as const;

/** s.play.progress: "4/10 soru". */
export const progressLabel = (n: number, total: number) => `${n}/${total} soru`;
/** The .pr-pill text: "Gizlilik Esas · 4/10 soru". */
export const pillLabel = (n: number, total: number, mode: string = PN_TEXT.name) => `${mode} · ${progressLabel(n, total)}`;
export const secsLabel = (n: number) => `${n} sn`;
export const envelopeFrom = (nick: string) => `${nick} sana gönderdi. Kimse görmesin, sonra zarfa dokun.`;
export const confirmPick = (nick: string) => `${nick} seçimini onayla`;
export const waitHolder = (nick: string) => `${nick} düşünüyor…`;
export const revealHead = (n: number, total: number) => `Soru ${n}/${total}`;
export const askedTo = (nick: string) => {
  const d = suffix(nick, 'dat');
  return d ? `${d} soruldu` : `Soruldu: ${nick}`;
};
export const answerOf = (nick: string) => {
  const g = suffix(nick, 'gen');
  return g ? `${g} cevabı` : `${nick} cevap verdi`;
};
export const voteLabel = (votes: number, needed: number) => `Sıradakine geç (${votes}/${needed})`;
export const votedLabel = (votes: number, needed: number) => `Oyun verildi (${votes}/${needed})`;

/** s.play.pickHint(allowSelf, noReturn). */
export function pickHint(allowSelf: boolean, noReturn: boolean): string {
  return [
    !allowSelf && noReturn
      ? 'Kendini ve soruyu sana gönderen kişiyi seçemezsin.'
      : !allowSelf
        ? 'Kendini seçemezsin.'
        : noReturn
          ? 'Soruyu sana gönderen kişiyi seçemezsin.'
          : null,
    'Seçtiğin kişi sıradaki soruyu alır.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Server choices for the holder: everyone but me (allowSelf off) and the sender (noReturn on). */
export function pickable(players: string[], me: string, from: string | undefined, allowSelf: boolean, noReturn: boolean): string[] {
  return players.filter((p) => (allowSelf || p !== me) && !(noReturn && from && p === from));
}

/** .pr-progress segment state for segment i: done (mint), now (yellow) or empty (panel). */
export const segment = (i: number, done: number): 'done' | 'now' | 'empty' => (i < done ? 'done' : i === done ? 'now' : 'empty');

/** Countdown bar width in % (left over duration); data-low under 8 s. */
export const timerFill = (seconds: number, duration: number) => (duration ? Math.max(0, Math.min(1, seconds / duration)) * 100 : 0);
export const timerLow = (seconds: number) => seconds < 8;
