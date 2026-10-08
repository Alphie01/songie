import ffmpegStatic from 'ffmpeg-static';
import { buildApp } from './app.js';
import { config } from './config.js';

const app = await buildApp({
  dataDir: config.dataDir,
  webDist: config.webDist,
  ffmpegPath: process.env.FFMPEG_PATH ?? (ffmpegStatic as unknown as string),
  allowedOrigins: config.allowedOrigins,
  logger: config.isProd ? { level: 'warn' } : false,
  trustProxy: true,
});

await app.http.listen({ port: config.port, host: config.host });
console.log(`songie hazır: http://${config.host}:${config.port}`);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void app.close().finally(() => process.exit(0));
  });
}
