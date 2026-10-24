/**
 * Secret Hitler (We Knows) ad scripts. ElevenLabs voices from the game's Turkish cast pool; `voice`/`style` are the
 * OpenAI fallback. Every line is checked by transcription (tools/verifyVoices.ts) before a render.
 */
import type { WwLine } from './werewolfAds';

/** The moderator: a calm documentary voice, a parliament at night. */
const MOD = { who: 'Anlatıcı', el: 'Zpbxhg6LG47cY8y5BJrf', tag: '[serious]', voice: 'onyx', style: 'Derin, sakin, belgesel anlatıcısı gibi ciddi.' };
const ECE = { el: 'xFsOR54lR471QiCvQ5re', voice: 'nova', style: 'Genç bir kadın, kendinden emin, savunmacı. Doğal, hızlı.' };
const MERT = { el: 'D1U9fDt671vz7Bpo0FQM', voice: 'ash', style: 'Genç bir erkek, sinirli, suçlayıcı. Doğal, hızlı.' };
const ZEYNEP = { el: 'uKVeTbj0O6ca7CnOrZXx', voice: 'coral', style: 'Genç bir kadın, samimi, güven veren. Doğal.' };

const mod = (id: string, text: string, tag = MOD.tag): WwLine => ({ id: `sh-${id}`, ...MOD, tag, text, tempo: 1 });
const say = (id: string, who: string, v: typeof ECE, text: string, tag = '[casual]'): WwLine => ({ id: `sh-${id}`, who, ...v, tag, text, tempo: 1.05 });

/** H1 "Ja! mı, Nein mi?": three fascist laws, Ece nominates Mert, the votes open, Mert was Hitler. */
export const SH_VOTE: WwLine[] = [
  mod('v1', 'Üç faşist yasa çıktı.', '[serious, slow]'),
  mod('v2', 'Başkan Ece, şansölye olarak Mert’i aday gösterdi.'),
  mod('v3', 'Eğer Mert Hitler ise, oyun biter.', '[serious, slow]'),
  mod('v4', 'Oylar açılıyor.'),
  mod('v5', 'Mert Hitler’di. Faşistler kazandı.', '[serious, slow]'),
];

/** H2 "Kim yalan söylüyor?": the viewer sees the president's real hand, then both claims. Ece lies. */
export const SH_LIAR = {
  hand: ['fascist', 'liberal', 'fascist'] as ('liberal' | 'fascist')[],
  discarded: 1,
  liar: 'Ece',
  lines: [
    mod('l1', 'Başkan desteden üç kart çekti.'),
    say('l2', 'Ece', ECE, 'Sana bir liberal kart verdim, yemin ederim!', '[defensive]'),
    say('l3', 'Mert', MERT, 'Yalan! Bana iki faşist kart geldi.', '[angry]'),
    mod('l4', 'Peki, kim yalan söylüyor?', '[serious, slow]'),
  ],
};

/** H3 "Rolün: Hitler": you hold the card, the table trusts you, you are elected, the fascists win. */
export const SH_POV: WwLine[] = [
  mod('p1', 'Kimseye rolünü gösterme.', '[serious, slow]'),
  say('p2', 'Zeynep', ZEYNEP, 'Bence en güvenilir kişi sensin.', '[warm]'),
  mod('p3', 'Başkan seni şansölye adayı gösterdi.'),
  mod('p4', 'Hitler şansölye seçildi. Faşistler kazandı.', '[serious, slow]'),
];
