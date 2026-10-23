import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTES } from '../src/brand/palette.js';
import { FRIEND_NAMES } from '../src/reels/friends.js';
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
  never: { id: 'itiraf-01-ben-hic', cover: 95, music: 'sneaky snitch kevin macleod' },
  never18: { id: 'itiraf-02-ben-hic-flort', cover: 100, music: 'deuces kevin macleod' },
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
  const text = opt('--text');
  const name = opt('--name');
  const palArg = opt('--palette');
  const palette = palArg !== undefined ? Number(palArg) : Math.floor(Math.random() * PALETTES.length);
  if ((name !== undefined && (!name || name.length > 12)) || !Number.isInteger(palette) || palette < 0 || palette >= PALETTES.length) {
    console.error(`kullanım: pnpm reel <never|never18> [--text "Ben hiç …"] [--music "<şarkı>"] [--name <isim>] [--palette 0-${PALETTES.length - 1}]`);
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
  const music = await fetchSong(opt('--music') ?? cfg.music, path.join(root, 'assets'));
  const solver = name ?? FRIEND_NAMES[Math.floor(Math.random() * FRIEND_NAMES.length)]!;
  console.log(`Cümle: ${card.text} (${card.category})${text ? '' : ' — kendi cümlen için --text "Ben hiç …"'}`);
  console.log(`Müzik: ${music.answer}${opt('--music') ? '' : ' — başka müzik için --music "<şarkı>"'}`);
  console.log(
    key === 'never18'
      ? `Gece ışığı: ${['pembe', 'mercan', 'lila'][palette % 3]} · Flört: ${solver} — değiştirmek için --palette / --name`
      : `Renkler: palet ${palette} (${PALETTES[palette]!.join(' → ')}) · Anlatan: ${solver}`,
  );

  const props = JSON.stringify(
    key === 'never18'
      ? { statement: card.text, category: card.category, music: music.src, musicFrom: 0, accent: palette % 3, date: solver }
      : { statement: card.text, category: card.category, music: music.src, musicFrom: 0, palette, solver },
  );
  const file = `${key}-${slug(card.text.replace(/^Ben hiç\s+/u, '')).slice(0, 40)}`;
  run('npx', ['remotion', 'render', 'src/index.ts', cfg.id, `out/${file}.mp4`, '--codec=h264', '--crf=18', `--props=${props}`], root);
  run('npx', ['remotion', 'still', 'src/index.ts', cfg.id, `out/${file}.png`, `--frame=${cfg.cover}`, `--props=${props}`], root);
  console.log(`\nHazır:\n  ${path.join(root, 'out', `${file}.mp4`)}\n  ${path.join(root, 'out', `${file}.png`)}`);
}

async function main() {
  const args = process.argv.slice(2);
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
