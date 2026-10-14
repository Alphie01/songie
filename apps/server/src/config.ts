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
  /** Google girişi bu Firebase projesinin ID token'larını kabul eder. */
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? 'songie-app',
  /** Bunun altındaki mobil sürümler "güncelle" ekranı gösterir. */
  minAppVersion: process.env.MIN_APP_VERSION ?? '1.0.0',
  /** Davet linklerinin (/r/KOD) uygulamada açılması: iOS Universal Links ve Android App Links. */
  appLinks: {
    appleTeamId: process.env.APPLE_TEAM_ID ?? '',
    androidCertSha256: (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  },
};
