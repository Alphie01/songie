/**
 * Vaka görsellerini OpenAI Images API ile üretir (yalnızca geliştirme sırasında; oyun çalışırken
 * OpenAI'ye istek atılmaz). Anahtar: tools/.env.local → OPENAI_API_KEY=… (git'e girmez).
 *
 *   pnpm --filter @songie/detective case:images <slug> [--dry] [--only k1,k2] [--redo] [--candidates]
 *   pnpm --filter @songie/detective case:images --models      (hesapta hangi görsel modelleri var)
 *
 * IMAGE_MODEL (varsayılan gpt-image-2), IMAGE_QUALITY (varsayılan medium), IMAGE_BUDGET_USD (varsayılan 25).
 * Harcama tahmini tools/.image-spend.json'da tutulur; bütçeye gelince durur.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CaseImage } from '../shared/case-schema.js';
import { DEFAULT_CASES_DIR, readCaseFile } from '../server/library.js';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const SPEND_FILE = path.join(TOOLS, '.image-spend.json');

function loadEnv() {
  const file = path.join(TOOLS, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.IMAGE_MODEL ?? 'gpt-image-2';
const QUALITY = (process.env.IMAGE_QUALITY ?? 'medium') as 'low' | 'medium' | 'high';
const BUDGET = Number(process.env.IMAGE_BUDGET_USD ?? 25);

/** Yaklaşık birim fiyat (USD). Kesin fiyat model sayfasından; tahmin bütçe freni içindir. */
const PRICE: Record<string, Record<string, { square: number; wide: number }>> = {
  'gpt-image-1': { low: { square: 0.011, wide: 0.016 }, medium: { square: 0.042, wide: 0.063 }, high: { square: 0.167, wide: 0.25 } },
  // gpt-image-2: çıktı 30 $/M token; 1536x1024 orta ≈ 0,041 $ (OpenAI örnekleri). Kare için de aynısı (üst sınır).
  'gpt-image-2': { low: { square: 0.005, wide: 0.005 }, medium: { square: 0.041, wide: 0.041 }, high: { square: 0.165, wide: 0.165 } },
  'gpt-image-1-mini': { low: { square: 0.005, wide: 0.006 }, medium: { square: 0.011, wide: 0.015 }, high: { square: 0.036, wide: 0.052 } },
};
const priceOf = (aspect: CaseImage['aspect']) => {
  const table = PRICE[MODEL]?.[QUALITY] ?? PRICE['gpt-image-1']![QUALITY]!;
  return aspect === 'square' ? table.square : table.wide;
};

const SIZE: Record<CaseImage['aspect'], string> = { square: '1024x1024', landscape: '1536x1024', portrait: '1024x1536' };

const BASE =
  'Photorealistic documentary photograph set in contemporary Turkey (2020s), natural color grading, realistic lighting, believable everyday detail, shot on a 35mm camera. ' +
  'Absolutely no text, letters, numbers, signage, captions, logos, watermarks or timestamps anywhere in the image.';
const KIND: Record<CaseImage['kind'], string> = {
  cover: 'Moody cinematic establishing shot, like a still from a Turkish crime drama, dusk or night, generous empty space in the upper third.',
  portrait: 'Head-and-shoulders portrait, plain muted backdrop, soft window light, neutral natural expression, looking slightly off camera, like a photo in a police case file. Ordinary non-famous person.',
  scene: 'Location or crime-scene photograph, realistic and restrained, no gore.',
  object: 'Forensic evidence photograph of an object on a neutral surface with harsh flash, a plain scale bar without any markings.',
  cctv: 'Still frame from a security camera: high mounted wide angle, slight fisheye, low resolution, desaturated, compression noise, motion blur on people, faces not clearly identifiable. No on-screen overlay.',
  location: 'Exterior or interior establishing photograph of the place, realistic, no people in focus.',
  'document-photo': 'Photograph of a physical item, any paper in it is blank or illegible.',
};

interface Spend {
  total: number;
  items: { slug: string; key: string; usd: number; at: string; model: string }[];
}
const readSpend = (): Spend => (fs.existsSync(SPEND_FILE) ? (JSON.parse(fs.readFileSync(SPEND_FILE, 'utf8')) as Spend) : { total: 0, items: [] });
const writeSpend = (s: Spend) => fs.writeFileSync(SPEND_FILE, JSON.stringify(s, null, 2));

function ffmpegPath(): string | null {
  try {
    const req = createRequire(path.join(TOOLS, '../../../apps/server/package.json'));
    return req('ffmpeg-static') as string;
  } catch {
    return null;
  }
}

/** Depoda yer kaplamasın: uzun kenar 1280 px, webp kalite 78. */
function shrink(file: string) {
  const ff = ffmpegPath();
  if (!ff) return;
  const tmp = `${file}.tmp.webp`;
  try {
    execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-vf', "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'", '-c:v', 'libwebp', '-quality', '78', tmp]);
    fs.renameSync(tmp, file);
  } catch {
    fs.rmSync(tmp, { force: true });
  }
}

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.openai.com/v1${url}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json;
}

async function generate(prompt: string, aspect: CaseImage['aspect'], n: number): Promise<Buffer[]> {
  const out = await api<{ data: { b64_json: string }[] }>('/images/generations', {
    model: MODEL,
    prompt,
    size: SIZE[aspect],
    quality: QUALITY,
    n,
    output_format: 'webp',
    output_compression: 80,
  });
  return out.data.map((d) => Buffer.from(d.b64_json, 'base64'));
}

async function main() {
  const args = process.argv.slice(2);
  if (!KEY) {
    console.error('OPENAI_API_KEY yok. games/detective/tools/.env.local dosyasına OPENAI_API_KEY=… yazın.');
    process.exit(1);
  }
  if (args.includes('--models')) {
    const list = await api<{ data: { id: string }[] }>('/models');
    console.log(list.data.map((m) => m.id).filter((id) => /image|dall/i.test(id)).sort().join('\n'));
    return;
  }
  const slug = args.find((a) => !a.startsWith('-'));
  if (!slug) throw new Error('Kullanım: case:images <slug> [--dry] [--only k1,k2] [--redo] [--candidates]');
  const dry = args.includes('--dry');
  const redo = args.includes('--redo');
  const candidates = args.includes('--candidates');
  const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const dir = path.join(process.env.CASES_DIR ?? DEFAULT_CASES_DIR, slug);
  const c = readCaseFile(dir);
  const imgDir = path.join(dir, 'img');
  fs.mkdirSync(imgDir, { recursive: true });

  const todo = Object.entries(c.images).filter(([key]) => (only ? only.includes(key) : redo || !fs.existsSync(path.join(imgDir, `${key}.webp`))));
  const cost = (img: CaseImage) => priceOf(img.aspect) * (candidates && (img.kind === 'portrait' || img.kind === 'cover') ? 2 : 1);
  const estimate = todo.reduce((s, [, img]) => s + cost(img), 0);
  const spend = readSpend();
  console.log(`${slug}: ${todo.length} görsel, model ${MODEL}/${QUALITY}, tahmini ${estimate.toFixed(2)} $ (harcanan ${spend.total.toFixed(2)} / ${BUDGET} $)`);
  if (dry) {
    for (const [key, img] of todo) console.log(`  ${key} [${img.kind}, ${img.aspect}] ${img.prompt.slice(0, 90)}…`);
    return;
  }

  // Aynı anda 3 istek.
  const queue = [...todo];
  let failed = 0;
  const worker = async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const [key, img] = next;
      const usd = cost(img);
      const s = readSpend();
      if (s.total + usd > BUDGET) {
        console.log(`  ${key}: bütçe sınırı (${BUDGET} $) — durdu.`);
        queue.length = 0;
        return;
      }
      const n = candidates && (img.kind === 'portrait' || img.kind === 'cover') ? 2 : 1;
      try {
        const bufs = await generate(`${BASE}\n${KIND[img.kind]}\n${img.prompt}`, img.aspect, n);
        const file = path.join(imgDir, `${key}.webp`);
        fs.writeFileSync(file, bufs[0]!);
        shrink(file);
        if (bufs.length > 1) {
          const cand = path.join(imgDir, '_candidates');
          fs.mkdirSync(cand, { recursive: true });
          bufs.forEach((b, i) => fs.writeFileSync(path.join(cand, `${key}-${i + 1}.webp`), b));
        }
        const now = readSpend();
        now.total += usd;
        now.items.push({ slug, key, usd, at: new Date().toISOString(), model: `${MODEL}/${QUALITY}` });
        writeSpend(now);
        console.log(`  ${key}: tamam (${Math.round(fs.statSync(file).size / 1024)} KB)`);
      } catch (err) {
        failed++;
        console.log(`  ${key}: HATA ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  console.log(`Bitti. Harcanan toplam ≈ ${readSpend().total.toFixed(2)} $${failed ? `, ${failed} hata` : ''}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
