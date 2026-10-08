import { openDb } from '../src/db.js';
import { config } from '../src/config.js';
import { Catalog, seedPools } from '@songie/song-guess/server';

const db = openDb(config.dataDir);
const catalog = new Catalog(db);
await seedPools(catalog);
console.log(`${catalog.pools().length} liste hazır.`);
db.close();
