/**
 * pnpm --filter @songie/reels gen <shotId>   generate one shot (paid, cached, budget-checked)
 * pnpm --filter @songie/reels gen --credits  free: print remaining kie credits
 * pnpm --filter @songie/reels gen --sfx      synthesize public/sfx/*.wav
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIE_USD_PER_CREDIT, createTask, credits, download, setKieKey, uploadFile, waitTask } from './kie.js';
import { loadKeys } from './env.js';
import { generateImage, setOpenAIKey } from './openai-image.js';
import { makeSfx } from './sfx.js';
import { SPEND_FILE, SpendLedger } from './spend.js';

export type Shot = {
  id: string;
  kind: 'image' | 'video';
  model: string;
  prompt: string;
  input?: object;
  refs?: string[]; // shot ids
  estimateUsd: number;
};

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTS = ['mp4', 'png'];

export type Ctx = { assetsDir: string; ledger: SpendLedger; shots: Shot[]; intervalMs?: number };

const cached = (dir: string, id: string) => EXTS.map((e) => path.join(dir, `${id}.${e}`)).find((f) => fs.existsSync(f));

export async function runShot(shot: Shot, ctx: Ctx): Promise<string> {
  const hit = cached(ctx.assetsDir, shot.id);
  if (hit) return hit;

  const refPaths = (shot.refs ?? []).map((r) => {
    const f = cached(ctx.assetsDir, r);
    if (!f) throw new Error(`ref shot "${r}" has no local asset yet; generate it first`);
    return f;
  });

  if (shot.model === 'openai' || shot.model === 'gpt-image-2') {
    ctx.ledger.assertCanSpend(shot.estimateUsd);
    const out = path.join(ctx.assetsDir, `${shot.id}.png`);
    await generateImage({ prompt: shot.prompt, out, size: '1024x1536', quality: 'medium', refs: refPaths });
    ctx.ledger.record({ id: shot.id, kind: 'image', provider: 'openai', usd: shot.estimateUsd, state: 'done' });
    return out;
  }

  const pending = ctx.ledger.find(shot.id);
  let taskId = pending?.state === 'pending' ? pending.taskId : undefined;
  if (!taskId) {
    ctx.ledger.assertCanSpend(shot.estimateUsd);
    const urls = await Promise.all(refPaths.map(uploadFile));
    const input = { prompt: shot.prompt, ...(urls.length ? { image_urls: urls } : {}), ...shot.input };
    taskId = await createTask(shot.model, input);
    ctx.ledger.record({ id: shot.id, kind: shot.kind, provider: 'kie', usd: shot.estimateUsd, taskId, state: 'pending' });
  }
  let res;
  try {
    res = await waitTask(taskId, { intervalMs: ctx.intervalMs });
  } catch (e) {
    if (e instanceof Error && /failed \(/.test(e.message)) {
      ctx.ledger.record({ id: shot.id, kind: shot.kind, provider: 'kie', usd: 0, taskId, state: 'failed' });
    }
    throw e; // timeout keeps `pending` so a re-run resumes the same task
  }
  const url = res.urls[0];
  if (!url) throw new Error(`kie task ${taskId} returned no result URL`);
  const ext = shot.kind === 'video' ? 'mp4' : 'png';
  const out = await download(url, path.join(ctx.assetsDir, `${shot.id}.${ext}`));
  ctx.ledger.record({ id: shot.id, kind: shot.kind, provider: 'kie', usd: res.credits * KIE_USD_PER_CREDIT, taskId, state: 'done' });
  return out;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error('usage: gen <shotId> | --credits | --sfx');
  if (arg === '--sfx') {
    console.log(await makeSfx(path.join(ROOT, 'public/sfx')));
    return;
  }
  const keys = loadKeys();
  setKieKey(keys.kie);
  setOpenAIKey(keys.openai);
  if (arg === '--credits') {
    const c = await credits();
    console.log(`kie credits remaining: ${c} (~$${(c * KIE_USD_PER_CREDIT).toFixed(2)})`);
    return;
  }
  const shots = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/shots.json'), 'utf8')) as Shot[];
  const shot = shots.find((s) => s.id === arg);
  if (!shot) throw new Error(`unknown shot "${arg}"`);
  const ledger = new SpendLedger(SPEND_FILE);
  const out = await runShot(shot, { assetsDir: path.join(ROOT, 'assets'), ledger, shots });
  console.log(`${out} (spent $${ledger.spent().toFixed(2)} / $10)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
