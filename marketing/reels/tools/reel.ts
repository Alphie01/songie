import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTES } from '../src/brand/palette.js';
import { FRIEND_NAMES } from '../src/reels/friends.js';
import { CONFESSION_PAIRS, FLIRT_PAIRS } from '../src/reels/itiraf/confessionPairs.js';
import { fetchSong, type SongAsset } from './deezer.js';

/**
 * Tek komut: şarkıyı Deezer'dan bulur, nakaratı (en yüksek sesli bölüm) seçer, Reels'i ve kapağını render eder.
 *   pnpm reel r2 "tame impala loser"            → out/r2-tame-impala-loser.mp4 + .png
 *   pnpm reel r1 "tarkan kuzu kuzu" --from 15.5  → kesit saniyesini elle ver
 *   pnpm reel r2 "tarkan şımarık" --palette 3     → renk sırasını seç (0–7; verilmezse şarkıya göre)
 *   pnpm reel r2 "tarkan şımarık" --name Zeynep   → bilen arkadaşın adı (verilmezse şarkıya göre)
 */
export const REELS = {
  r1: { id: 'songie-01-challenge', cover: 20, maxFrom: 29 },
  r2: { id: 'songie-02-gercek-oyun', cover: 70, maxFrom: 27 },
  r3: { id: 'songie-03-kazan', cover: 70, maxFrom: 27 },
} as const;
export type ReelKey = keyof typeof REELS;

/** İtiraf Köşesi game reels: a real card from the game's own pool, background music from Deezer. */
export const GAME_REELS = {
  never: { id: 'itiraf-01-ben-hic', cover: 95, music: 'sneaky snitch kevin macleod', seconds: 16 },
  never18: { id: 'itiraf-02-ben-hic-flort', cover: 100, music: 'deuces kevin macleod', seconds: 18 },
} as const;
export type GameReelKey = keyof typeof GAME_REELS;

/** Ben Hiç categories safe for Instagram (no +18 packs), with the app's display names. */
export const NEVER_SAFE_CATEGORIES: Record<string, string> = {
  genel: 'Genel',
  'okul-is': 'Okul ve iş',
  'ask-iliski': 'Aşk ve ilişki',
  seyahat: 'Seyahat',
  utanc: 'Utanç',
  teknoloji: 'Teknoloji',
  yemek: 'Yemek',
};

/** Ben Hiç +18 packs, used for the flirt reel only after the explicit-word filter below. */
export const NEVER_FLIRT_CATEGORIES: Record<string, string> = {
  cesur: 'Cesur (+18)',
  'yatak-odasi': 'Yatak odası (+18)',
  fantezi: 'Fantezi (+18)',
  'cift-odasi': 'Çift odası (+18)',
  'sinir-testi': 'Sınır testi (+18)',
};

/** Words that make a card explicit (Instagram removes / limits those); flirty innuendo passes. */
export const EXPLICIT = /seks|seviş|oral|orgazm|porno|prezervatif|squirt|klips|deepthroat|\b69\b|yat(t|m|ıp|ar)|soyun|lateks|bağlan|yetişkin|göğüs|çıplak|grup|mastürb|vibrat|oyuncak|penis|vajina|anal|fetiş|kelepçe|sado|maso/iu;

export function flirtCards(contentDir: string): { text: string; category: string }[] {
  return neverCards(contentDir, NEVER_FLIRT_CATEGORIES).filter((c) => !EXPLICIT.test(c.text));
}

/** Every safe Ben Hiç card from games/never/server/content. */
export function neverCards(contentDir: string, categories = NEVER_SAFE_CATEGORIES): { text: string; category: string }[] {
  const out: { text: string; category: string }[] = [];
  for (const [id, name] of Object.entries(categories)) {
    const file = path.join(contentDir, `${id}.json`);
    if (!fs.existsSync(file)) continue;
    for (const text of JSON.parse(fs.readFileSync(file, 'utf8')) as unknown[]) {
      if (typeof text === 'string' && /^Ben hiç\s/u.test(text.trim())) out.push({ text: text.trim(), category: name });
    }
  }
  return out;
}

export type ReelOptions = { songFrom: number; palette: number; solver: string };

export function propsFor(reel: ReelKey, s: SongAsset, o: ReelOptions): Record<string, unknown> {
  if (reel === 'r1') return { answer: s.answer, solveStage: 0, song: s.src, ...o };
  const base = { title: s.title, artist: s.artist, album: s.album, song: s.src, cover: s.cover, ...o };
  return reel === 'r3' ? { ...base, decoys: s.decoys } : base;
}

/** Stable friend name per song, so it is not always Mert. */
export function solverFor(songId: number): string {
  return FRIEND_NAMES[Math.abs(songId) % FRIEND_NAMES.length]!;
}

/** Stable palette per song, so every song gets its own colors but re-renders look the same. */
export function paletteFor(songId: number): number {
  return Math.abs(songId) % PALETTES.length;
}

export const slug = (q: string) =>
  q
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Start (s) of the loudest `windowSec` stretch, given RMS dB per `stepSec` step. Silence (-inf) counts as -90.
 * The start is clamped to [minSec, maxSec] so the clip never begins in the fade-in or runs off the preview.
 */
export function loudestStart(rms: number[], stepSec: number, windowSec = 3, minSec = 2, maxSec = 24): number {
  const n = Math.max(1, Math.round(windowSec / stepSec));
  const lo = Math.ceil(minSec / stepSec);
  const hi = Math.min(Math.floor(maxSec / stepSec), rms.length - n);
  let best = lo;
  let bestSum = -Infinity;
  for (let i = lo; i <= hi; i++) {
    let sum = 0;
    for (let j = i; j < i + n; j++) sum += Number.isFinite(rms[j]) ? rms[j]! : -90;
    if (sum > bestSum) {
      bestSum = sum;
      best = i;
    }
  }
  return Math.round(best * stepSec * 10) / 10;
}

/** Background start: 1 s before the loud part, never so late that the 30 s preview runs out under the reel. */
export function musicStart(loud: number, reelSeconds: number, previewSeconds = 30): number {
  return Math.round(Math.max(0, Math.min(loud - 1, previewSeconds - reelSeconds - 0.5)) * 10) / 10;
}

/** RMS dB per 0.5 s step of an audio file, via ffmpeg astats. */
function rmsSteps(file: string, stepSec = 0.5): number[] {
  const out = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-af', `aresample=44100,asetnsamples=${Math.round(44100 * stepSec)},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level`, '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  return [...(out.stderr ?? '').matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -Infinity : Number(m[1])));
}

function run(cmd: string, args: string[], cwd: string) {
  console.log(`\n$ ${cmd} ${args.map((a) => (/\s|"/.test(a) ? `'${a}'` : a)).join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

/** `pnpm reel <never|never18> [--text "Ben hiç …"] [--music "<deezer sorgusu>"] [--name X] [--palette N]` */
async function gameReel(key: GameReelKey, args: string[], root: string) {
  const cfg = GAME_REELS[key];
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1]?.trim() : undefined;
  };
  const KNOWN = new Set(['--text', '--category', '--music', '--song', '--from', '--name', '--palette']);
  const unknown = args.filter((a, i) => a.startsWith('--') && !KNOWN.has(a) && !KNOWN.has(args[i - 1] ?? ''));
  if (unknown.length) {
    console.error(`Bilinmeyen seçenek: ${unknown.join(', ')} (geçerli: ${[...KNOWN].join(' ')})`);
    process.exit(1);
  }
  const text = opt('--text');
  const name = opt('--name');
  const musicQuery = opt('--music') ?? opt('--song');
  const fromArg = opt('--from');
  const palArg = opt('--palette');
  const palette = palArg !== undefined ? Number(palArg) : Math.floor(Math.random() * PALETTES.length);
  if (
    (name !== undefined && (!name || name.length > 12)) ||
    !Number.isInteger(palette) ||
    palette < 0 ||
    palette >= PALETTES.length ||
    (fromArg !== undefined && !Number.isFinite(Number(fromArg)))
  ) {
    console.error(
      `kullanım: pnpm reel <never|never18> [--text "Ben hiç …"] [--song "<şarkı>"] [--from <saniye>] [--name <isim>] [--palette 0-${PALETTES.length - 1}]`,
    );
    process.exit(1);
  }
  const contentDir = path.resolve(root, '../../games/never/server/content');
  const cards = key === 'never18' ? flirtCards(contentDir) : neverCards(contentDir);
  const card = text
    ? { text, category: opt('--category') ?? cards.find((c) => c.text === text)?.category ?? 'Genel' }
    : cards[Math.floor(Math.random() * cards.length)]!;
  if (!/^Ben hiç\s/u.test(card.text)) {
    console.error('Cümle "Ben hiç" ile başlamalı.');
    process.exit(1);
  }
  const music = await fetchSong(musicQuery ?? cfg.music, path.join(root, 'assets'));
  // Own song: start a little before its loudest part, but leave enough of the 30 s preview for the whole reel.
  const musicFrom =
    fromArg !== undefined ? Number(fromArg) : musicQuery ? musicStart(loudestStart(rmsSteps(music.file), 0.5), cfg.seconds) : 0;
  const solver = name ?? FRIEND_NAMES[Math.floor(Math.random() * FRIEND_NAMES.length)]!;
  console.log(`Cümle: ${card.text} (${card.category})${text ? '' : ' — kendi cümlen için --text "Ben hiç …"'}`);
  console.log(`Müzik: ${music.answer} · ${musicFrom} sn'den${musicQuery ? '' : ' — başka şarkı için --song "<şarkı>"'}`);
  console.log(
    key === 'never18'
      ? `Gece ışığı: ${['pembe', 'mercan', 'lila'][palette % 3]} · Flört: ${solver} — değiştirmek için --palette / --name`
      : `Renkler: palet ${palette} (${PALETTES[palette]!.join(' → ')}) · Anlatan: ${solver}`,
  );

  const props = JSON.stringify(
    key === 'never18'
      ? { statement: card.text, category: card.category, music: music.src, musicFrom, accent: palette % 3, date: solver }
      : { statement: card.text, category: card.category, music: music.src, musicFrom, palette, solver },
  );
  const file = `${key}-${slug(card.text.replace(/^Ben hiç\s+/u, '')).slice(0, 40)}`;
  run('npx', ['remotion', 'render', 'src/index.ts', cfg.id, `out/${file}.mp4`, '--codec=h264', '--crf=18', `--props=${props}`], root);
  run('npx', ['remotion', 'still', 'src/index.ts', cfg.id, `out/${file}.png`, `--frame=${cfg.cover}`, `--props=${props}`], root);
  console.log(`\nHazır:\n  ${path.join(root, 'out', `${file}.mp4`)}\n  ${path.join(root, 'out', `${file}.png`)}`);
}

const CONF_REELS = {
  confessions: { id: 'itiraf-03-itiraf', cover: 100, music: 'investigations kevin macleod', seconds: 18, pairs: CONFESSION_PAIRS },
  confessions18: { id: 'itiraf-04-itiraf-flort', cover: 105, music: 'bossa antigua kevin macleod', seconds: 18, pairs: FLIRT_PAIRS },
} as const;

/** `pnpm reel confessions[18] [--topic "…" --text "…"] [--song "…"] [--name X] [--palette N]` */
async function confReel(key: keyof typeof CONF_REELS, args: string[], root: string) {
  const cfg = CONF_REELS[key];
  const KNOWN = new Set(['--topic', '--text', '--music', '--song', '--from', '--name', '--palette']);
  const unknown = args.filter((a, i) => a.startsWith('--') && !KNOWN.has(a) && !KNOWN.has(args[i - 1] ?? ''));
  const opt = (n: string) => {
    const i = args.indexOf(n);
    return i >= 0 ? args[i + 1]?.trim() : undefined;
  };
  const name = opt('--name');
  const palette = opt('--palette') !== undefined ? Number(opt('--palette')) : Math.floor(Math.random() * 8);
  const pick = cfg.pairs[Math.floor(Math.random() * cfg.pairs.length)]!;
  const topic = opt('--topic') ?? pick.topic;
  const text = opt('--text') ?? (opt('--topic') ? undefined : pick.confession);
  if (unknown.length || !text || text.length < 10 || text.length > 240 || (name !== undefined && (!name || name.length > 12)) || !Number.isInteger(palette)) {
    console.error(
      `${unknown.length ? `Bilinmeyen seçenek: ${unknown.join(', ')}\n` : ''}kullanım: pnpm reel ${key} [--topic "<konu>" --text "<itiraf, 10–240 harf>"] [--song "<şarkı>"] [--name <isim>] [--palette N]`,
    );
    process.exit(1);
  }
  if (key === 'confessions18' && EXPLICIT.test(`${topic} ${text}`)) {
    console.error('Bu metin Instagram için fazla açık (seks, seviş, porno…); daha imalı bir şey yaz.');
    process.exit(1);
  }
  const musicQuery = opt('--music') ?? opt('--song');
  const music = await fetchSong(musicQuery ?? cfg.music, path.join(root, 'assets'));
  const musicFrom = opt('--from') !== undefined ? Number(opt('--from')) : musicQuery ? musicStart(loudestStart(rmsSteps(music.file), 0.5), cfg.seconds) : 0;
  const who = name ?? FRIEND_NAMES[Math.floor(Math.random() * FRIEND_NAMES.length)]!;
  console.log(`Konu: ${topic}\nİtiraf: ${text}`);
  console.log(`Müzik: ${music.answer} · ${musicFrom} sn'den · ${key === 'confessions18' ? 'Flört' : 'Şüpheli'}: ${who}`);
  const props = JSON.stringify(
    key === 'confessions18'
      ? { topic, confession: text, music: music.src, musicFrom, accent: palette % 3, date: who }
      : { topic, confession: text, music: music.src, musicFrom, palette, solver: who },
  );
  const file = `${key}-${slug(text).slice(0, 36)}`;
  run('npx', ['remotion', 'render', 'src/index.ts', cfg.id, `out/${file}.mp4`, '--codec=h264', '--crf=18', `--props=${props}`], root);
  run('npx', ['remotion', 'still', 'src/index.ts', cfg.id, `out/${file}.png`, `--frame=${cfg.cover}`, `--props=${props}`], root);
  console.log(`\nHazır:\n  ${path.join(root, 'out', `${file}.mp4`)}\n  ${path.join(root, 'out', `${file}.png`)}`);
}

/** Aramızdaki En traits safe for Instagram (no +18 packs, no drinking pack), from the game content. */
export const ML_SAFE = ['genel', 'aliskanliklar', 'arkadaslik', 'ask', 'utanc', 'gelecek', 'is-okul'];

/** Hand-picked flirty traits from the Cesur / Aşk packs: innuendo, never explicit. */
export const ML_FLIRT = [
  'çekici',
  'flörtöz',
  'yanlış kişiyi öpecek',
  'aynı gece iki kişiyle öpüşen',
  'bir gecede çok numara alan',
  'tuhaf yerde birini öpmüş olan',
  'ateşli mesajlarda yaratıcı olan',
  'yanlış kişiye ateşli mesaj atacak',
  'bu odadaki herkesle flört etmiş olan',
  'flört uygulamasında çok eşleşme alan',
  'çok flört eden',
  'çabuk âşık olan',
];

export function mlTraits(contentDir: string): string[] {
  return ML_SAFE.flatMap((f) => {
    const file = path.join(contentDir, `${f}.json`);
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as unknown[]).filter((t): t is string => typeof t === 'string') : [];
  });
}

const ML_REELS = {
  mostlikely: { id: 'itiraf-05-aramizdaki-en', cover: 100, music: 'monkeys spinning monkeys kevin macleod', seconds: 18 },
  mostlikely18: { id: 'itiraf-06-aramizdaki-en-flort', cover: 100, music: 'hot swing kevin macleod', seconds: 18 },
} as const;

/** `pnpm reel mostlikely[18] [--text "<özellik>"] [--song "…"] [--name X] [--palette N]` */
async function mlReel(key: keyof typeof ML_REELS, args: string[], root: string) {
  const cfg = ML_REELS[key];
  const KNOWN = new Set(['--text', '--music', '--song', '--from', '--name', '--palette']);
  const unknown = args.filter((a, i) => a.startsWith('--') && !KNOWN.has(a) && !KNOWN.has(args[i - 1] ?? ''));
  const opt = (n: string) => {
    const i = args.indexOf(n);
    return i >= 0 ? args[i + 1]?.trim() : undefined;
  };
  const pool = key === 'mostlikely18' ? ML_FLIRT : mlTraits(path.resolve(root, '../../games/most-likely/server/content'));
  const question = (opt('--text') ?? pool[Math.floor(Math.random() * pool.length)]!)
    .replace(/^aramızdaki en\s+/iu, '')
    .replace(/\s*kim\?*$/iu, '');
  const name = opt('--name');
  const palette = opt('--palette') !== undefined ? Number(opt('--palette')) : Math.floor(Math.random() * 8);
  if (unknown.length || question.length < 2 || question.length > 60 || (name !== undefined && (!name || name.length > 12)) || !Number.isInteger(palette)) {
    console.error(`${unknown.length ? `Bilinmeyen seçenek: ${unknown.join(', ')}\n` : ''}kullanım: pnpm reel ${key} [--text "<özellik>"] [--song "<şarkı>"] [--name <isim>] [--palette N]`);
    process.exit(1);
  }
  if (key === 'mostlikely18' && EXPLICIT.test(question)) {
    console.error('Bu soru Instagram için fazla açık; daha imalı bir şey yaz.');
    process.exit(1);
  }
  const musicQuery = opt('--music') ?? opt('--song');
  const music = await fetchSong(musicQuery ?? cfg.music, path.join(root, 'assets'));
  const musicFrom = opt('--from') !== undefined ? Number(opt('--from')) : musicQuery ? musicStart(loudestStart(rmsSteps(music.file), 0.5), cfg.seconds) : 0;
  const who = name ?? FRIEND_NAMES[Math.floor(Math.random() * FRIEND_NAMES.length)]!;
  console.log(`Soru: Aramızdaki en ${question} kim?\nMüzik: ${music.answer} · ${musicFrom} sn'den · ${key === 'mostlikely18' ? 'Flört' : 'Unvan'}: ${who}`);
  const props = JSON.stringify(
    key === 'mostlikely18'
      ? { question, music: music.src, musicFrom, accent: palette % 3, date: who }
      : { question, music: music.src, musicFrom, palette, solver: who },
  );
  const file = `${key}-${slug(question).slice(0, 36)}`;
  run('npx', ['remotion', 'render', 'src/index.ts', cfg.id, `out/${file}.mp4`, '--codec=h264', '--crf=18', `--props=${props}`], root);
  run('npx', ['remotion', 'still', 'src/index.ts', cfg.id, `out/${file}.png`, `--frame=${cfg.cover}`, `--props=${props}`], root);
  console.log(`\nHazır:\n  ${path.join(root, 'out', `${file}.mp4`)}\n  ${path.join(root, 'out', `${file}.png`)}`);
}

/** Red Flag categories with the app's labels; normal reels use the safe ones, flirt reels the dating ones. */
export const RF_NAMES: Record<string, string> = {
  iliski: 'İlişki',
  'ilk-bulusma': 'İlk buluşma',
  arkadaslik: 'Arkadaşlık',
  'ev-arkadasi': 'Ev arkadaşı',
  is: 'İş',
  aile: 'Aile',
  'sosyal-medya': 'Sosyal medya',
  aliskanliklar: 'Alışkanlıklar',
  cesur: 'Cesur (+18)',
};
export const RF_SAFE = ['iliski', 'ilk-bulusma', 'arkadaslik', 'ev-arkadasi', 'is', 'aile', 'sosyal-medya', 'aliskanliklar'];
export const RF_FLIRT = ['ilk-bulusma', 'iliski', 'sosyal-medya', 'cesur'];

export function rfSituations(contentDir: string, cats: string[]): { text: string; category: string }[] {
  return cats.flatMap((id) => {
    const file = path.join(contentDir, `${id}.json`);
    if (!fs.existsSync(file)) return [];
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as unknown[])
      .filter((t): t is string => typeof t === 'string' && t.length >= 10 && t.length <= 200 && !EXPLICIT.test(t))
      .map((text) => ({ text, category: RF_NAMES[id]! }));
  });
}

const RF_REELS = {
  redflag: { id: 'itiraf-07-red-flag', cover: 100, music: 'fluffing a duck kevin macleod', seconds: 18, cats: RF_SAFE },
  redflag18: { id: 'itiraf-08-red-flag-flort', cover: 100, music: 'smooth lovin kevin macleod', seconds: 18, cats: RF_FLIRT },
} as const;

/** `pnpm reel redflag[18] [--text "<durum>" --category "<etiket>"] [--song "…"] [--name X] [--palette N]` */
async function rfReel(key: keyof typeof RF_REELS, args: string[], root: string) {
  const cfg = RF_REELS[key];
  const KNOWN = new Set(['--text', '--category', '--music', '--song', '--from', '--name', '--palette']);
  const unknown = args.filter((a, i) => a.startsWith('--') && !KNOWN.has(a) && !KNOWN.has(args[i - 1] ?? ''));
  const opt = (n: string) => {
    const i = args.indexOf(n);
    return i >= 0 ? args[i + 1]?.trim() : undefined;
  };
  const pool = rfSituations(path.resolve(root, '../../games/red-flag/server/content'), [...cfg.cats]);
  const text = opt('--text');
  const card = text ? { text, category: opt('--category') ?? pool.find((x) => x.text === text)?.category ?? 'İlişki' } : pool[Math.floor(Math.random() * pool.length)]!;
  const name = opt('--name');
  const palette = opt('--palette') !== undefined ? Number(opt('--palette')) : Math.floor(Math.random() * 8);
  if (unknown.length || card.text.length < 10 || card.text.length > 200 || (name !== undefined && (!name || name.length > 12)) || !Number.isInteger(palette)) {
    console.error(`${unknown.length ? `Bilinmeyen seçenek: ${unknown.join(', ')}\n` : ''}kullanım: pnpm reel ${key} [--text "<durum>" --category "<etiket>"] [--song "<şarkı>"] [--name <isim>] [--palette N]`);
    process.exit(1);
  }
  if (key === 'redflag18' && EXPLICIT.test(card.text)) {
    console.error('Bu durum Instagram için fazla açık; daha imalı bir şey yaz.');
    process.exit(1);
  }
  const musicQuery = opt('--music') ?? opt('--song');
  const music = await fetchSong(musicQuery ?? cfg.music, path.join(root, 'assets'));
  const musicFrom = opt('--from') !== undefined ? Number(opt('--from')) : musicQuery ? musicStart(loudestStart(rmsSteps(music.file), 0.5), cfg.seconds) : 0;
  const who = name ?? FRIEND_NAMES[Math.floor(Math.random() * FRIEND_NAMES.length)]!;
  console.log(`Durum: ${card.text} (${card.category})\nMüzik: ${music.answer} · ${musicFrom} sn'den · ${key === 'redflag18' ? 'Flört' : 'Arkadaş'}: ${who}`);
  const props = JSON.stringify(
    key === 'redflag18'
      ? { situation: card.text, category: card.category, music: music.src, musicFrom, accent: palette % 3, date: who }
      : { situation: card.text, category: card.category, music: music.src, musicFrom, palette, solver: who },
  );
  const file = `${key}-${slug(card.text).slice(0, 36)}`;
  run('npx', ['remotion', 'render', 'src/index.ts', cfg.id, `out/${file}.mp4`, '--codec=h264', '--crf=18', `--props=${props}`], root);
  run('npx', ['remotion', 'still', 'src/index.ts', cfg.id, `out/${file}.png`, `--frame=${cfg.cover}`, `--props=${props}`], root);
  console.log(`\nHazır:\n  ${path.join(root, 'out', `${file}.mp4`)}\n  ${path.join(root, 'out', `${file}.png`)}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] && args[0] in RF_REELS) {
    await rfReel(args[0] as keyof typeof RF_REELS, args.slice(1), path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    return;
  }
  if (args[0] && args[0] in ML_REELS) {
    await mlReel(args[0] as keyof typeof ML_REELS, args.slice(1), path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    return;
  }
  if (args[0] && args[0] in CONF_REELS) {
    await confReel(args[0] as keyof typeof CONF_REELS, args.slice(1), path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    return;
  }
  if (args[0] && args[0] in GAME_REELS) {
    await gameReel(args[0] as GameReelKey, args.slice(1), path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    return;
  }
  const reel = args[0] as ReelKey;
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? { i, v: Number(args[i + 1]) } : undefined;
  };
  const from = flag('--from');
  const pal = flag('--palette');
  const nameIdx = args.indexOf('--name');
  const name = nameIdx >= 0 ? args[nameIdx + 1]?.trim() : undefined;
  const skip = new Set([from?.i, from && from.i + 1, pal?.i, pal && pal.i + 1, nameIdx >= 0 ? nameIdx : undefined, nameIdx >= 0 ? nameIdx + 1 : undefined]);
  const query = args.filter((_, i) => i > 0 && !skip.has(i)).join(' ');
  const manualFrom = from?.v;
  const bad = (f?: { v: number }) => f !== undefined && !Number.isFinite(f.v);
  const badName = nameIdx >= 0 && (!name || name.length > 12);
  if (!(reel in REELS) || !query || bad(from) || bad(pal) || badName || (pal && (pal.v < 0 || pal.v >= PALETTES.length))) {
    console.error(`kullanım: pnpm reel <r1|r2|r3> "<sanatçı şarkı>" | pnpm reel never [--text …] [--from <saniye>] [--palette 0-${PALETTES.length - 1}] [--name <en çok 12 harf>]`);
    process.exit(1);
  }
  const cfg = REELS[reel];
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  const song = await fetchSong(query, path.join(root, 'assets'));
  const songFrom = Math.min(manualFrom ?? loudestStart(rmsSteps(song.file), 0.5), cfg.maxFrom);
  const palette = pal?.v ?? paletteFor(song.id);
  console.log(`Şarkı: ${song.answer} (${song.album}) · kesit ${songFrom} sn'den${manualFrom === undefined ? ' (otomatik: en yüksek sesli bölüm)' : ''}`);
  console.log(`Renkler: palet ${palette} (${PALETTES[palette]!.join(' → ')})${pal ? '' : ' — başka renk için --palette 0-' + (PALETTES.length - 1)}`);

  const solver = name ?? solverFor(song.id);
  console.log(`Bilen: ${solver}${name ? '' : ' — başka isim için --name <isim>'}`);

  const props = JSON.stringify(propsFor(reel, song, { songFrom, palette, solver }));
  const file = `${reel}-${slug(query)}${pal ? `-p${palette}` : ''}${name ? `-${slug(name)}` : ''}`;
  run('npx', ['remotion', 'render', 'src/index.ts', cfg.id, `out/${file}.mp4`, '--codec=h264', '--crf=18', `--props=${props}`], root);
  run('npx', ['remotion', 'still', 'src/index.ts', cfg.id, `out/${file}.png`, `--frame=${cfg.cover}`, `--props=${props}`], root);
  console.log(`\nHazır:\n  ${path.join(root, 'out', `${file}.mp4`)}\n  ${path.join(root, 'out', `${file}.png`)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
