import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

export const config = {
  port: Number(process.env.PORT ?? 4310),
  host: process.env.HOST ?? '127.0.0.1',
  dataDir: path.resolve(process.env.DATA_DIR ?? path.join(repoRoot, 'data')),
  webDist: path.resolve(process.env.WEB_DIST ?? path.join(repoRoot, 'apps/web/dist')),
  /** Virgülle ayrılmış izinli origin listesi; boşsa aynı origin. */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  isProd: process.env.NODE_ENV === 'production',
};
