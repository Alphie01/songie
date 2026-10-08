/** Bir Spotify listesini içe aktarır: `pnpm --filter @songie/server exec tsx scripts/import-spotify.ts <link>` */
import { Catalog } from '@songie/song-guess/server';
import { parseSpotifyPlaylistRef } from '@songie/song-guess/server/spotify';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';

const id = parseSpotifyPlaylistRef(process.argv[2] ?? '');
if (!id) throw new Error('Spotify playlist linki ver.');
const db = openDb(config.dataDir);
const started = Date.now();
const res = await new Catalog(db).importSpotify(id);
console.log(`${res.pool.name}: ${res.matched}/${res.total} şarkı eşleşti (${((Date.now() - started) / 1000).toFixed(1)} sn)`);
db.close();
