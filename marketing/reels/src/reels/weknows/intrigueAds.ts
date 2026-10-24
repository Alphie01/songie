/**
 * Entrika (We Knows) ad scripts. ElevenLabs voices from the game's Turkish cast pool, each line verified by
 * transcription (tools/verifyVoices.ts). Role names are the game's own (Hazinedar, Fedai, Muhafız, Korsan, Casus).
 */
import type { WwLine } from './werewolfAds';

/** The moderator: a deep, calm court narrator. */
const MOD = { who: 'Anlatıcı', el: '0DihkedLJYKoWg7H1u4d', tag: '[serious]', voice: 'onyx', style: 'Derin, sakin, saray entrikası anlatır gibi.' };
const MERT = { el: 'D1U9fDt671vz7Bpo0FQM', voice: 'ash', style: 'Genç bir erkek, kendinden emin, iddialı. Doğal, hızlı.' };
const YOU = { el: 'Vv1QW9Yx3WB2mLKFmyZG', voice: 'echo', style: 'Genç bir erkek, sakin ve kendinden emin.' };

const mod = (id: string, text: string, tag = MOD.tag): WwLine => ({ id: `in-${id}`, ...MOD, tag, text, tempo: 1 });
const say = (id: string, who: string, v: typeof MERT, text: string, tag = '[confident]'): WwLine => ({ id: `in-${id}`, who, ...v, tag, text, tempo: 1.05 });

/** E1 "Sen ne yapardın?": Mert claims Fedai and attacks you; you really hold Muhafız; you block, he cries lie, he loses. */
export const IN_BLOCK: WwLine[] = [
  mod('b1', 'Mert, elinde Fedai kartı olduğunu söylüyor.'),
  say('b2', 'Mert', MERT, 'Sana suikast yapıyorum.'),
  mod('b3', 'Sen olsan ne yapardın?', '[serious, slow]'),
  say('b4', 'Sen', YOU, 'Muhafız olarak engelliyorum.'),
  say('b5', 'Mert', MERT, 'Yalan!', '[shouting]'),
  mod('b6', 'Muhafız gerçekten elinde. Mert bir kart kaybetti.', '[serious]'),
];

/** E2 "Kartın yoktu": you claim Hazinedar without holding it, nobody calls it, seven gold, coup, you win. */
export const IN_BLUFF: WwLine[] = [
  mod('f1', 'Elinde Hazinedar yok.', '[serious, slow]'),
  say('f2', 'Sen', YOU, 'Vergi alıyorum. Ben Hazinedarım.', '[calm, confident]'),
  mod('f3', 'Kimse yalan demedi.'),
  mod('f4', 'Yedi altın. Darbe.', '[serious, slow]'),
  mod('f5', 'Son ayakta kalan sensin.', '[serious, slow]'),
];

/** E3 "Kart say": three of each role; two Fedai are open, one is in your hand, so Mert cannot hold one. */
export const IN_COUNT = {
  copies: 3,
  open: 2,
  inHand: 1,
  liar: 'Mert',
  lines: [
    mod('c1', 'Her rolden sadece üç kart var.'),
    mod('c2', 'İki Fedai masada açıldı. Üçüncüsü senin elinde.'),
    say('c3', 'Mert', MERT, 'Fedai benim. Sana suikast yapıyorum.'),
    mod('c4', 'Peki, Mert blöf mü yapıyor?', '[serious, slow]'),
  ],
};
