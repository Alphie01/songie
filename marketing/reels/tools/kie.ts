import fs from 'node:fs';
import path from 'node:path';
import { loadKeys } from './env.js';

/** Verify against the kie pricing page on the first real call; update if different. */
export const KIE_USD_PER_CREDIT = 0.005;

const API = 'https://api.kie.ai';
const UPLOAD = 'https://kieai.redpandaai.co/api/file-stream-upload';

export class KieError extends Error {
  constructor(
    public code: number,
    msg: string,
  ) {
    super(`kie error ${code}: ${msg}`);
    this.name = 'KieError';
  }
}

let key: string | undefined;
export const setKieKey = (k: string) => {
  key = k;
};
const auth = () => ({ Authorization: `Bearer ${(key ??= loadKeys().kie)}` });

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...auth(), ...(init.headers as object) } });
  const body = (await res.json()) as { code: number; msg?: string; data: T };
  if (body.code !== 200) throw new KieError(body.code, body.msg ?? 'unknown');
  return body.data;
}

export async function uploadFile(localPath: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(localPath)]), path.basename(localPath));
  form.append('uploadPath', 'songie-reels');
  const data = await call<{ downloadUrl: string }>(UPLOAD, { method: 'POST', body: form });
  return data.downloadUrl;
}

export async function createTask(model: string, input: object): Promise<string> {
  const data = await call<{ taskId: string }>(`${API}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, input }),
  });
  return data.taskId;
}

type Info = { state: string; resultJson?: string; creditsConsumed?: number; failCode?: string; failMsg?: string };

export async function waitTask(taskId: string, { intervalMs = 10_000, timeoutMs = 15 * 60_000 } = {}): Promise<{ urls: string[]; credits: number }> {
  const start = Date.now();
  for (;;) {
    const d = await call<Info>(`${API}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    if (d.state === 'success') {
      const urls = (JSON.parse(d.resultJson ?? '{}') as { resultUrls?: string[] }).resultUrls ?? [];
      return { urls, credits: d.creditsConsumed ?? 0 };
    }
    if (d.state === 'fail') throw new Error(`kie task ${taskId} failed (${d.failCode ?? '?'}): ${d.failMsg ?? 'no message'}`);
    if (Date.now() - start > timeoutMs) throw new Error(`kie task ${taskId} timed out; still pending, re-run to resume`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export async function credits(): Promise<number> {
  return call<number>(`${API}/api/v1/chat/credit`);
}

export async function download(url: string, out: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return out;
}
