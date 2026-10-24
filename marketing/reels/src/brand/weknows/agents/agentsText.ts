/**
 * Ajanlar copy, copied from games/agents/client/strings.ts (the reels package does not depend on the game).
 * Only the lines the ad screens draw; keep them byte-identical to the game when the game changes.
 * Clue rule (clueProblem) and its messages from games/agents/shared/index.ts; foldText from packages/shared/src/text.ts.
 * Lines marked "artboard" come from Ajanlar.dc.html and are not in strings.ts.
 * Ids: the game uses a = yeşil, b = mor; the artboard (and these screens) use g / p, n = tarafsız, x = suikastçı.
 */

export type AgTeam = 'g' | 'p';
export type AgKey = 'g' | 'p' | 'n' | 'x';

/** shared UNLIMITED: clue number -1 = sınırsız. */
export const AG_UNLIMITED = -1;

export const trUpper = (t: string) => t.toLocaleUpperCase('tr-TR');
/** PlayView `num`. */
export const agNum = (n: number) => (n === AG_UNLIMITED ? '∞' : String(n));

/** Türkçe tamlayan eki: Deniz → ’in, Ali → ’nin, Ufuk → ’un. */
function possessive(name: string): string {
  const lower = name.toLocaleLowerCase('tr');
  const vowels = [...lower].filter((ch) => 'aeıioöuü'.includes(ch));
  const last = vowels.at(-1) ?? 'e';
  const v = 'aı'.includes(last) ? 'ı' : 'ei'.includes(last) ? 'i' : 'ou'.includes(last) ? 'u' : 'ü';
  const endsVowel = 'aeıioöuü'.includes(lower.at(-1) ?? '');
  return `’${endsVowel ? 'n' : ''}${v}n`;
}

export const AG_TEXT = {
  name: 'Ajanlar',
  /** artboard: room code shown top right. */
  code: 'ODAK',
  team: { g: 'Yeşil takım', p: 'Mor takım' } satisfies Record<AgTeam, string>,
  teamShort: { g: 'Yeşil', p: 'Mor' } satisfies Record<AgTeam, string>,
  color: { g: 'Yeşil ajan', p: 'Mor ajan', n: 'Tarafsız', x: 'Suikastçı' } satisfies Record<AgKey, string>,
  play: {
    pill: (n: number) => `Ajanlar · Tablo ${n}`,
    agents: (n: number) => `${n} ajan`,
    clueOf: (nick: string) => `Lider ${nick}${possessive(nick)} ipucu`,
    myClue: 'Senin ipucun',
    thinking: '…',
    yourClue: 'İpucun',
    legendNeutral: 'Tarafsız: sıra biter',
    legendAssassin: 'Suikastçı: oyun biter',
    turnShort: (team: string) => `Sıra ${team.toLocaleLowerCase('tr')}da`,
    you: 'sen',
    waitClue: (nick: string) => `${nick} ipucu düşünüyor.`,
    waitClueMine: 'Liderin ipucu düşünüyor. Tabloya bakıp hazırlan.',
    cluePlaceholder: 'Tek kelime',
    count: 'Kaç kart',
    unlimited: 'Sınırsız',
    giveClue: 'İpucunu ver',
    clueHint: 'Tablodaki açılmamış bir kelimeyi ya da onun kökünü kullanamazsın.',
    guessesLeft: (n: number | null) => (n === null ? 'Sınırsız hak' : n === 1 ? '1 hak kaldı' : `${n} hak kaldı`),
    tapHint: 'Takımınla konuş, sonra karta dokun.',
    endTurn: 'Sırayı bitir',
    leaderGuessing: 'Takımın tahmin ediyor. Yüzün bir şey belli etmesin.',
    opponentGuessing: (team: string) => `${team} tahmin ediyor.`,
    history: 'İpuçları',
    historyEmpty: 'Henüz ipucu verilmedi.',
    noPicks: 'kart açılmadı',
    wins: 'Kazanılan tablolar',
  },
  over: {
    kicker: 'Tablo bitti',
    won: (team: string) => `${team} kazandı!`,
    reason: {
      agents: 'Bütün ajanlarını buldular.',
      assassin: 'Rakip suikastçıyı açtı.',
    },
    newBoard: 'Yeni tablo',
    newBoardHint: 'Aynı takımlarla devam; liderler sırayla değişir.',
    toLobby: 'Lobiye dön',
    waitHost: 'Oda sahibi yeni tablo açabilir ya da lobiye dönebilir.',
  },
} as const;

/* ---------- Clue rule (shared clueProblem) ---------- */

const FOLD: Record<string, string> = {
  ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
  â: 'a', î: 'i', û: 'u', ß: 'ss', æ: 'ae', ø: 'o', œ: 'oe', đ: 'd', ł: 'l',
};

export function foldText(input: string): string {
  let s = input.replace(/[ıİşŞğĞüÜöÖçÇâîûßæøœđł]/g, (ch) => FOLD[ch] ?? ch);
  s = s.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
  s = s.replace(/&/g, ' and ').replace(/['’`´]/g, '');
  return s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const SOFTEN: Record<string, string> = { p: 'b', t: 'd', k: 'g' };

function stems(folded: string): string[] {
  const out = [folded];
  const last = folded.at(-1) ?? '';
  if (SOFTEN[last]) out.push(folded.slice(0, -1) + SOFTEN[last]);
  return out;
}

/** Why the clue is rejected (null = fine). `hidden`: unopened board words. Byte-identical messages to the game. */
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
    const rootOfWord = c.length >= 3 && f.startsWith(c);
    const wordIsRoot = f.length >= 3 && stems(f).some((st) => c.startsWith(st));
    const compound = f.length >= 5 && c.endsWith(f);
    if (same || rootOfWord || wordIsRoot || compound) return `“${word}” tablodaki “${w}” kelimesine çok yakın. Başka bir kelime seç.`;
  }
  return null;
}
