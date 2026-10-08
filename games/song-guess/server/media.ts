import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { STAGE_CLIPS } from '../shared/index.js';
import type { Catalog } from './catalog/catalog.js';
import { findItunesPreview } from './catalog/itunes.js';

export class NoPreviewError extends Error {}

export interface MediaRound {
  token: string;
  trackId: number;
  /** Açılmış en yüksek aşama; -1 = hiçbiri. */
  unlocked: number;
  revealed: boolean;
  dir: string;
  src: string;
  createdAt: number;
}

const SRC_TTL_MS = 24 * 60 * 60_000;
const ROUND_TTL_MS = 3 * 60 * 60_000;
const PREVIEW_SECONDS = 30;

export class MediaService {
  private rounds = new Map<string, MediaRound>();
  private sweepTimer: NodeJS.Timeout;

  constructor(
    private baseDir: string,
    private catalog: Catalog,
    private ffmpegPath: string,
    private fetchImpl: typeof fetch = fetch,
  ) {
    fs.mkdirSync(path.join(baseDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(baseDir, 'rounds'), { recursive: true });
    fs.rmSync(path.join(baseDir, 'rounds'), { recursive: true, force: true });
    fs.mkdirSync(path.join(baseDir, 'rounds'), { recursive: true });
    this.sweepTimer = setInterval(() => this.sweep(), 15 * 60_000);
    this.sweepTimer.unref();
  }

  urlFor(token: string, stage: number | 'full'): string {
    return `/api/games/song-guess/media/${token}/${stage}`;
  }

  /** Önizlemeyi indirir ve her aşamanın klibini keser. Önizleme yoksa NoPreviewError. */
  async prepare(trackId: number, startAt: 'start' | 'random'): Promise<MediaRound> {
    const src = await this.source(trackId);
    const token = crypto.randomBytes(18).toString('base64url');
    const dir = path.join(this.baseDir, 'rounds', token);
    fs.mkdirSync(dir, { recursive: true });
    const longest = STAGE_CLIPS[STAGE_CLIPS.length - 1]!;
    const offset = startAt === 'random' ? Math.random() * Math.max(0, PREVIEW_SECONDS - longest - 3) : 0;
    await this.cut(src, dir, offset);
    const round: MediaRound = { token, trackId, unlocked: -1, revealed: false, dir, src, createdAt: Date.now() };
    this.rounds.set(token, round);
    return round;
  }

  trackOf(token: string): number | null {
    return this.rounds.get(token)?.trackId ?? null;
  }

  unlock(token: string, stage: number): void {
    const r = this.rounds.get(token);
    if (r) r.unlocked = Math.max(r.unlocked, stage);
  }

  reveal(token: string): void {
    const r = this.rounds.get(token);
    if (r) {
      r.revealed = true;
      r.unlocked = STAGE_CLIPS.length - 1;
    }
  }

  release(token: string): void {
    const r = this.rounds.get(token);
    if (!r) return;
    this.rounds.delete(token);
    // Son istekler yetişsin diye biraz bekleyip sil.
    setTimeout(() => fs.rm(r.dir, { recursive: true, force: true }, () => {}), 30_000).unref();
  }

  routes(app: FastifyInstance): void {
    app.get<{ Params: { token: string; stage: string } }>('/media/:token/:stage', async (req, reply) => {
      const r = this.rounds.get(req.params.token);
      if (!r) return reply.code(404).send({ error: 'Klip bulunamadı.' });
      if (req.params.stage === 'full') {
        if (!r.revealed) return reply.code(403).send({ error: 'Şarkı henüz açıklanmadı.' });
        reply.header('cache-control', 'private, max-age=600').type('audio/mpeg');
        return reply.send(fs.createReadStream(r.src));
      }
      const stage = Number(req.params.stage);
      if (!Number.isInteger(stage) || stage < 0 || stage >= STAGE_CLIPS.length) {
        return reply.code(404).send({ error: 'Klip bulunamadı.' });
      }
      if (stage > r.unlocked) return reply.code(403).send({ error: 'Bu aşama henüz açılmadı.' });
      reply.header('cache-control', 'private, max-age=600').type('audio/wav');
      return reply.send(fs.createReadStream(path.join(r.dir, `${stage}.wav`)));
    });
  }

  dispose(): void {
    clearInterval(this.sweepTimer);
  }

  private async source(trackId: number): Promise<string> {
    const file = path.join(this.baseDir, 'src', `${trackId}.mp3`);
    try {
      const st = fs.statSync(file);
      if (Date.now() - st.mtimeMs < SRC_TTL_MS && st.size > 10_000) return file;
    } catch {
      // indirilecek
    }
    // Önizleme linklerinin süresi doluyor; her seferinde taze link al.
    let url: string | null = null;
    let title = '';
    let artist = '';
    try {
      const t = await this.catalog.deezer.track(trackId);
      url = t.readable === false ? null : t.preview || null;
      title = t.title;
      artist = t.artist.name;
    } catch {
      const row = this.catalog.track(trackId);
      title = row?.title ?? '';
      artist = row?.artist ?? '';
    }
    if (!url && title) url = await findItunesPreview(title, artist, this.fetchImpl);
    if (!url) {
      this.catalog.markNoPreview(trackId);
      throw new NoPreviewError(`no preview for ${trackId}`);
    }
    const res = await this.fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) this.catalog.markNoPreview(trackId);
      throw new NoPreviewError(`preview fetch ${res.status} for ${trackId}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, file);
    return file;
  }

  private cut(src: string, dir: string, offset: number): Promise<void> {
    return cutClips(this.ffmpegPath, src, dir, offset);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [token, r] of this.rounds) if (now - r.createdAt > ROUND_TTL_MS) this.release(token);
    const srcDir = path.join(this.baseDir, 'src');
    for (const f of fs.readdirSync(srcDir)) {
      const p = path.join(srcDir, f);
      try {
        if (now - fs.statSync(p).mtimeMs > SRC_TTL_MS) fs.rmSync(p, { force: true });
      } catch {
        // yarışta silinmiş olabilir
      }
    }
  }
}

/**
 * Tek ffmpeg süreciyle beş çıktı: mono 24 kHz WAV, tıklamayı önlemek için kısa fade.
 * Kesme `atrim` + `asetpts` ile filtre içinde yapılır: böylece her klibin zamanı 0'dan başlar
 * ve fade-out klibin sonuna denk gelir. (Çıktı tarafında `-ss` kullanınca fade, kaynağın
 * zamanına göre uygulanıp klibi tamamen sessiz bırakıyordu.)
 */
export function cutClips(ffmpegPath: string, src: string, dir: string, offset: number): Promise<void> {
  const n = STAGE_CLIPS.length;
  const chains = STAGE_CLIPS.map((dur, i) => {
    const fade = dur < 1 ? 0.008 : 0.025;
    return (
      `[s${i}]atrim=start=${offset.toFixed(3)}:duration=${dur},asetpts=PTS-STARTPTS,` +
      `afade=t=in:d=${fade},afade=t=out:st=${(dur - fade).toFixed(3)}:d=${fade}[o${i}]`
    );
  });
  const graph = `[0:a]asplit=${n}${STAGE_CLIPS.map((_, i) => `[s${i}]`).join('')};${chains.join(';')}`;
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-filter_complex', graph];
  STAGE_CLIPS.forEach((_, i) => args.push('-map', `[o${i}]`, '-ac', '1', '-ar', '24000', path.join(dir, `${i}.wav`)));
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(0, 300)}`))));
  });
}

/** 16 bit PCM WAV'ın tepe genliği (0–1). 44 baytlık standart başlık varsayılır. */
export function wavPeak(buf: Buffer): number {
  let peak = 0;
  for (let i = 44; i + 1 < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
  return peak / 32768;
}
