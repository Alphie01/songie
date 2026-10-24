import fs from 'node:fs';
import path from 'node:path';
import { loadKeys } from './env.js';

export const OPENAI_IMAGE_ESTIMATE_USD = 0.05;
let key: string | undefined;
export const setOpenAIKey = (k: string) => {
  key = k;
};

export async function generateImage(o: { prompt: string; out: string; size?: string; quality?: 'low' | 'medium' | 'high'; refs?: string[] }): Promise<string> {
  const size = o.size ?? '1024x1536';
  const quality = o.quality ?? 'medium';
  const headers = { authorization: `Bearer ${(key ??= loadKeys().openai)}` };
  let res: Response;
  if (o.refs?.length) {
    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', o.prompt);
    form.append('size', size);
    form.append('quality', quality);
    for (const r of o.refs) {
      const ext = path.extname(r).slice(1).toLowerCase();
      const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      form.append('image[]', new Blob([fs.readFileSync(r)], { type }), path.basename(r));
    }
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: form });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt: o.prompt, size, quality, n: 1 }),
    });
  }
  const json = (await res.json()) as { data?: { b64_json: string }[]; error?: { message: string } };
  if (!res.ok || !json.data?.[0]) throw new Error(json.error?.message ?? `OpenAI HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(o.out), { recursive: true });
  fs.writeFileSync(o.out, Buffer.from(json.data[0].b64_json, 'base64'));
  return o.out;
}
