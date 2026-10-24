/**
 * Kurt Adam (We Knows) ad scripts. Voices are ElevenLabs voices from the game's Turkish cast pool
 * (games/detective/server/cases/*\/audio/cast.json); `voice`/`style` are the OpenAI fallback.
 */
export type WwLine = { id: string; who: string; text: string; el: string; tag?: string; voice: string; style: string; tempo: number };

/** The moderator: the game's narrator role ("Anlatıcı sunucudur"), a dramatic storyteller voice. */
const MOD = { who: 'Anlatıcı', el: 'Rn6ATQ4HFbyhBC6mze4Z', tag: '[serious]', voice: 'onyx', style: 'Derin, yavaş, masal anlatır gibi ürkütücü bir anlatıcı.' };
const M = { el: 'D1U9fDt671vz7Bpo0FQM', voice: 'ash', style: 'Genç bir erkek, arkadaş ortamında oyun oynuyor. Doğal, hızlı.' };
const CAN = { el: 'BQnJrtsrT9aT7kziS653', voice: 'verse', style: 'Genç bir erkek, sakin. Doğal, hızlı.' };
const DENIZ = { el: 'LCHGt3rsPMP50Vs28amI', voice: 'echo', style: 'Genç bir erkek, kendinden emin. Doğal, hızlı.' };
const ZEYNEP = { el: 'uKVeTbj0O6ca7CnOrZXx', voice: 'coral', style: 'Genç bir kadın, şüpheci. Doğal, hızlı.' };
const ECE = { el: 'xFsOR54lR471QiCvQ5re', voice: 'nova', style: 'Genç bir kadın, enerjik ve suçlayıcı. Doğal, hızlı.' };
const YOU = { el: 'Vv1QW9Yx3WB2mLKFmyZG', voice: 'ash', style: 'Genç bir erkek, sakin görünmeye çalışıyor ama yalan söylüyor.' };

const mod = (id: string, text: string, tag = MOD.tag): WwLine => ({ id: `ww-${id}`, ...MOD, tag, text, tempo: 1 });
const say = (id: string, who: string, v: typeof M, text: string, tag = '[casual]'): WwLine => ({ id: `ww-${id}`, who, ...v, tag, text, tempo: 1.05 });

/** K1 "Köy uyusun": one night and one morning, told by the moderator. */
export const WW_NIGHT: WwLine[] = [
  mod('n1', 'Gece oldu. Köy uyusun.', '[serious, slow]'),
  mod('n2', 'Kurtlar, gözlerinizi açın.'),
  mod('n3', 'Şimdi kahin uyansın.', '[serious]'),
  mod('n4', 'Günaydın köy.', '[calm]'),
  mod('n5', 'Bu gece Mert öldü.', '[serious, slow]'),
  mod('n6', 'Ama kurtlar hâlâ aramızda.', '[serious, slow]'),
];

/** K2 "Kim kurt?": the morning fact, four claims, the question. Deniz lies: the doctor's patient cannot die. */
export const WW_PUZZLE = {
  dead: 'Ece',
  rule: 'Doktorun koruduğu kişiyi kurtlar öldüremez.',
  wolf: 'Deniz',
  lines: [
    mod('p0', 'Bu gece Ece öldü.', '[serious, slow]'),
    say('p1', 'Mert', M, 'Ben kahinim. Dün gece Can’a baktım, kurt değil.'),
    say('p2', 'Can', CAN, 'Ben köylüyüm, hiçbir şey bilmiyorum.'),
    say('p3', 'Deniz', DENIZ, 'Ben doktorum. Dün gece Ece’yi korudum.', '[calm, clearly]'),
    say('p4', 'Zeynep', ZEYNEP, 'Bence Mert yalan söylüyor.', '[suspicious]'),
    mod('p5', 'Peki, kurt kim?', '[serious, slow]'),
  ],
};

/** K3 "Rolün: Kurt": you draw the wolf, the table turns on you, the vote misses, the wolves win. */
export const WW_POV: WwLine[] = [
  mod('v0', 'Kimseye rolünü gösterme.', '[serious, slow]'),
  say('v1', 'Ece', ECE, 'Sen kurtsun bence.', '[accusing]'),
  say('v2', 'Can', CAN, 'Dün gece niye o kadar sessizdin?', '[suspicious]'),
  say('v3', 'Sen', YOU, 'Ben köylüyüm, yemin ederim.', '[nervous]'),
  mod('v4', 'Bugün kimse asılmadı.', '[serious]'),
  mod('v5', 'Kurtlar kazandı.', '[serious, slow]'),
];
