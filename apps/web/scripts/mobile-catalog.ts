/**
 * Mobil uygulamanın oyun kataloğu: web'deki oyun kaydından (ad, tanıtım, rehber, kategori)
 * `packages/songie_core/assets/catalog.json` üretir. Metinler tek kaynakta kalsın diye elle kopyalanmaz.
 * Çalıştır: pnpm --filter @songie/web mobile:catalog
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, GAMES, playersLabel } from '../src/games';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../../packages/songie_core/assets/catalog.json');

const catalog = {
  categories: CATEGORIES,
  games: GAMES.map((g) => ({
    id: g.id,
    name: g.name,
    pitch: g.pitch,
    icon: g.icon,
    category: g.category,
    mono: g.mono,
    teams: g.teams ?? false,
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
    playersLabel: playersLabel(g),
    soloSettings: g.soloSettings ?? null,
    guide: g.guide ?? null,
  })),
};

fs.writeFileSync(out, JSON.stringify(catalog, null, 2) + '\n');
console.log(`${catalog.games.length} oyun → ${path.relative(process.cwd(), out)}`);
