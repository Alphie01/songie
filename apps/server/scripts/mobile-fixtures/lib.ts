/**
 * Mobil uygulamanın widget testleri için gerçek oyun görünümleri üretir:
 * oyunun sunucusu test düzeneğinde oynatılır, her durumun JSON'u
 * `apps/mobile/test/fixtures/<oyun>/<ad>.json` dosyasına yazılır.
 * Çalıştır: cd apps/server && npx tsx scripts/mobile-fixtures/<oyun>.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export function fixtureWriter(gameId: string) {
  const dir = path.resolve(here, '../../../mobile/test/fixtures', gameId);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  return {
    /** `view` (bir oyuncunun görünümü) + isteğe bağlı oda ayarları. */
    write(name: string, view: unknown, extra: Record<string, unknown> = {}) {
      fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ view, ...extra }, null, 2) + '\n');
      written.push(name);
    },
    done() {
      console.log(`${gameId}: ${written.length} görünüm → ${path.relative(process.cwd(), dir)}`);
    },
  };
}
