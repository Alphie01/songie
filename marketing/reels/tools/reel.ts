import { execFileSync, spawnSync } from 'node:child_process';
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

async function main() {
  const args = process.argv.slice(2);
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
    console.error(`kullanım: pnpm reel <r1|r2|r3> "<sanatçı şarkı>" [--from <saniye>] [--palette 0-${PALETTES.length - 1}] [--name <en çok 12 harf>]`);
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
