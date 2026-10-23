/**
 * Ad-only mini cases (not from the game, so nothing in a real case is spoiled). Faces are the game's own case
 * portraits; voices are generated once with `pnpm reel puzzle|sorgu` (tools/tts.ts) into assets/voices/.
 */
const P = (path: string) => `cases/${path}.webp`;

export type Speaker = { name: string; portrait: string; voice: string; style: string };
export type PuzzleCase = {
  id: string;
  scene: string;
  premise: string;
  clue: { source: string; text: string };
  suspects: (Speaker & { line: string; liar?: boolean })[];
  reveal: string;
};

const STYLE_M = 'Sorguda ifade veren bir erkek; gergin ama kendinden emin. Hızlı, net, kısa.';
const STYLE_F = 'Sorguda ifade veren bir kadın; sakin ve kendinden emin. Hızlı, net, kısa.';

export const PUZZLES: PuzzleCase[] = [
  {
    id: 'yagmur',
    scene: P('yalida-son-aksam/img/scene-night'),
    premise: 'Kurban 22:40’ta evinde ölü bulundu.',
    clue: { source: 'Meteoroloji kaydı', text: 'Yağmur 22:30’da başladı.' },
    suspects: [
      { name: 'Selin', portrait: P('bodrum-zehir/img/p-selin'), voice: 'coral', style: STYLE_F, line: 'Bütün akşam spor salonundaydım.' },
      { name: 'Kerem', portrait: P('ayvalik-miras/img/p-kerem'), voice: 'ash', style: STYLE_M, line: 'Dokuzda geldim, yağmurdan sırılsıklamdım.', liar: true },
      { name: 'Nur', portrait: P('sahnede-olum/img/p-nur'), voice: 'sage', style: STYLE_F, line: 'Sekizden beri annemlerdeydim.' },
    ],
    reveal: 'Yağmur 22:30’da başladı. Kerem dokuzda nasıl ıslandı?',
  },
  {
    id: 'elektrik',
    scene: P('sahnede-olum/img/scene-1'),
    premise: 'Kurban apartman dairesinde ölü bulundu.',
    clue: { source: 'Elektrik idaresi', text: 'Binada elektrik 21:10–21:40 arası kesikti.' },
    suspects: [
      { name: 'Gizem', portrait: P('uludag-firtina/img/p-gizem'), voice: 'nova', style: STYLE_F, line: 'Işıklar gidince mum yaktım, evdeydim.' },
      { name: 'Onur', portrait: P('ankara-ihalesi/img/p-onur'), voice: 'verse', style: STYLE_M, line: 'Dokuzda nöbete girdim, hastanedeydim.' },
      { name: 'Tarık', portrait: P('yalida-son-aksam/img/p-tarik'), voice: 'echo', style: STYLE_M, line: 'Dokuz buçukta asansörle yukarı çıktım.', liar: true },
    ],
    reveal: 'Elektrik kesikken asansör çalışmaz. Tarık yalan söylüyor.',
  },
  {
    id: 'telefon',
    scene: P('izmir-santaj/img/scene-kordon'),
    premise: 'Kurban gece yarısı sahilde bulundu.',
    clue: { source: 'Operatör kaydı', text: 'Kurbanın telefonu 21:30’da kapandı.' },
    suspects: [
      { name: 'Barış', portrait: P('pera-gecesi/img/p-baris'), voice: 'ash', style: STYLE_M, line: 'En son öğlen konuştuk.' },
      { name: 'Ece', portrait: P('izmir-santaj/img/p-ece'), voice: 'shimmer', style: STYLE_F, line: 'Ona onda mesaj attım, hemen cevap verdi.', liar: true },
      { name: 'Leyla', portrait: P('yalida-son-aksam/img/p-leyla'), voice: 'coral', style: STYLE_F, line: 'Akşam toplantıdaydım, hiç aramadım.' },
    ],
    reveal: 'Telefon 21:30’da kapanmıştı. Ece’ye onda kim cevap verdi?',
  },
];

export type Interrogation = {
  id: string;
  suspect: Speaker;
  /** Detective question → suspect answer, evidence, detective follow-up → suspect breaks. */
  q1: string;
  a1: string;
  evidence: { source: string; text: string };
  q2: string;
  a2: string;
};

export const DETECTIVE_VOICE = { voice: 'onyx', style: 'Derin, yavaş ve soğuk bir polisiye dedektif sesi. Sorgu odasında, alçak sesle.' };

export const INTERROGATIONS: Interrogation[] = [
  {
    id: 'volkan',
    suspect: { name: 'Volkan', portrait: P('koza-han-yangini/img/p-volkan'), voice: 'ballad', style: 'Sert, savunmacı bir erkek; sorguda sıkıştırılıyor. Kısa ve net.' },
    q1: 'O gece neredeydin?',
    a1: 'Evdeydim. Onda yattım, sabaha kadar uyudum.',
    evidence: { source: 'Apartman kartlı geçiş kaydı', text: 'Daire 7, Volkan D. Çıkış: 23:47' },
    q2: 'O zaman 23:47’de senin kartınla kim çıktı?',
    a2: 'Avukatımı istiyorum.',
  },
  {
    id: 'nihan',
    suspect: { name: 'Nihan', portrait: P('mersin-limani/img/p-nihan'), voice: 'shimmer', style: 'Soğukkanlı, kibar ama gergin bir kadın; sorguda sıkıştırılıyor. Kısa ve net.' },
    q1: 'Onu en son ne zaman gördün?',
    a1: 'Bir haftadır görmüyorum. Şehir dışındaydım.',
    evidence: { source: 'Otopark kamerası', text: 'Nihan Ö., dün gece 23:12, olay yerinin önünde' },
    q2: 'Dün gece 23:12’de otoparkta ne arıyordun?',
    a2: 'Bu konuşma burada bitti.',
  },
];

/** Squad night: the team's case chat, no voice. `photo` lines attach a case photo. */
export type ChatLine = { who: string; text: string; photo?: string };
export const SQUAD_CHAT = (me: string, a: string, b: string, d: string): ChatLine[] => [
  { who: a, text: 'Kesin şoför. Arabası olay yerindeymiş 😤' },
  { who: b, text: 'Hayır! Kamera kaydına bakın, saat tutmuyor', photo: P('sahnede-olum/img/cam-k4') },
  { who: d, text: 'O zaman şoför 21:30’da neredeydi? 🤔' },
  { who: me, text: 'Durun… fişteki saate bakın 👀' },
  { who: me, text: 'BULDUM 🔎' },
];
