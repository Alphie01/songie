/** Gerçek Deezer'dan rastgele şarkıların kliplerini keser ve sürelerini doğrular. `pnpm --filter @songie/server check:media [adet]` */
import fs from 'node:fs';
import ffmpegStatic from 'ffmpeg-static';
import { Catalog, MediaService } from '@songie/song-guess/server';
import { wavPeak } from '@songie/song-guess/server/media';
import { STAGE_CLIPS } from '@songie/song-guess/shared';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';

const count = Number(process.argv[2] ?? 5);
const ffmpeg = process.env.FFMPEG_PATH ?? (ffmpegStatic as unknown as string);
const db = openDb(config.dataDir);
const catalog = new Catalog(db);
const media = new MediaService(`${config.dataDir}/media`, catalog, ffmpeg);
const pools = catalog.pools().map((p) => p.id);
const picks = catalog.pickTracks(pools, count, 'medium', new Set());
let failed = 0;
for (const t of picks) {
  const started = Date.now();
  try {
    const r = await media.prepare(t.id, 'random');
    // mono, 24 kHz, 16 bit = saniyede 48000 bayt; 44 bayt WAV başlığı.
    const secs = STAGE_CLIPS.map((_, i) => ((fs.statSync(`${r.dir}/${i}.wav`).size - 44) / 48000).toFixed(2));
    const peaks = STAGE_CLIPS.map((_, i) => wavPeak(fs.readFileSync(`${r.dir}/${i}.wav`)));
    // 0,1 sn'lik klip sessiz bir ana denk gelebilir; uzun klipler mutlaka ses içermeli.
    const ok = secs.every((s, i) => Math.abs(Number(s) - STAGE_CLIPS[i]!) < 0.02) && peaks.slice(2).every((p) => p > 0.05);
    if (!ok) failed++;
    console.log(`${ok ? 'ok ' : 'BAD'} ${Date.now() - started}ms  ${t.artist} – ${t.title}  [${secs.join(', ')}]  tepe [${peaks.map((p) => p.toFixed(2)).join(', ')}]`);
    media.release(r.token);
  } catch (err) {
    failed++;
    console.log(`ERR ${t.artist} – ${t.title}: ${String(err)}`);
  }
}
console.log('arama "simarik":', catalog.searchLocal('simarik').slice(0, 2).map((h) => `${h.artist} – ${h.title}`));
console.log('arama "sezen gülümse":', (await catalog.search('sezen aksu gülümse')).slice(0, 3).map((h) => `${h.artist} – ${h.title}`));
media.dispose();
db.close();
process.exit(failed ? 1 : 0);
