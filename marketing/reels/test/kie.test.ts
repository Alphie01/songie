import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetError } from '../tools/spend';
import { KieError, KieTaskFailed, createTask, setKieKey, waitTask } from '../tools/kie';
import { runShot } from '../tools/gen';
import { SpendLedger } from '../tools/spend';

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
let calls: string[] = [];
function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  calls = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    calls.push(String(url));
    return handler(String(url), init);
  }));
}
beforeEach(() => setKieKey('test-key'));
afterEach(() => vi.unstubAllGlobals());

describe('kie', () => {
  it('throws on non-200 code', async () => {
    mockFetch(() => json({ code: 402, msg: 'insufficient' }));
    await expect(createTask('m', {})).rejects.toBeInstanceOf(KieError);
    await expect(createTask('m', {})).rejects.toThrow(/insufficient/);
  });

  it('waitTask parses resultJson', async () => {
    let n = 0;
    mockFetch(() =>
      json({ code: 200, data: ++n === 1 ? { state: 'queuing' } : { state: 'success', resultJson: JSON.stringify({ resultUrls: ['https://x/a.mp4'] }), creditsConsumed: 40 } }),
    );
    const r = await waitTask('t1', { intervalMs: 1, timeoutMs: 5000 });
    expect(r.urls[0]).toBe('https://x/a.mp4');
    expect(r.credits).toBe(40);
  });

  it('waitTask throws KieError when polling returns code != 200', async () => {
    mockFetch(() => json({ code: 500, msg: 'server down' }));
    await expect(waitTask('t1', { intervalMs: 1, timeoutMs: 5000 })).rejects.toBeInstanceOf(KieError);
  });

  it('waitTask throws on fail', async () => {
    mockFetch(() => json({ code: 200, data: { state: 'fail', failCode: '500', failMsg: 'bad prompt' } }));
    await expect(waitTask('t1', { intervalMs: 1, timeoutMs: 5000 })).rejects.toThrow(/bad prompt/);
  });
});

describe('gen', () => {
  const setup = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-'));
    const assetsDir = path.join(dir, 'assets');
    fs.mkdirSync(assetsDir);
    const ledger = new SpendLedger(path.join(dir, '.spend.json'));
    return { assetsDir, ledger };
  };
  const shot = { id: 's1', kind: 'video' as const, model: 'google/gemini-omni-flash-1-1', prompt: 'p', estimateUsd: 1 };
  const kieHandler = (url: string) => {
    if (url.includes('createTask')) return json({ code: 200, data: { taskId: 'new-task' } });
    if (url.includes('recordInfo')) return json({ code: 200, data: { state: 'success', resultJson: JSON.stringify({ resultUrls: ['https://cdn/out.mp4'] }), creditsConsumed: 100 } });
    if (url.startsWith('https://cdn/')) return Promise.resolve(new Response(Buffer.from('VIDEO')));
    throw new Error('unexpected ' + url);
  };

  it('resumes pending task', async () => {
    const { assetsDir, ledger } = setup();
    ledger.record({ id: 's1', kind: 'video', provider: 'kie', usd: 1, taskId: 'old-task', state: 'pending' });
    mockFetch(kieHandler);
    await runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 });
    expect(calls.some((u) => u.includes('createTask'))).toBe(false);
    expect(calls.some((u) => u.includes('taskId=old-task'))).toBe(true);
  });

  it('downloads result locally', async () => {
    const { assetsDir, ledger } = setup();
    mockFetch(kieHandler);
    const out = await runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 });
    expect(out).toBe(path.join(assetsDir, 's1.mp4'));
    expect(fs.readFileSync(out, 'utf8')).toBe('VIDEO');
    expect(ledger.find('s1')?.state).toBe('done');
    expect(ledger.spent()).toBeCloseTo(0.5);
    // cached: no further calls
    const before = calls.length;
    await runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 });
    expect(calls.length).toBe(before);
    expect(fs.readFileSync(path.join(assetsDir, '..', 'assets', 's1.mp4'), 'utf8')).not.toMatch(/https?:/);
  });

  it('records the estimate when kie reports no credits', async () => {
    const { assetsDir, ledger } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch((url) => {
      if (url.includes('recordInfo')) return json({ code: 200, data: { state: 'success', resultJson: JSON.stringify({ resultUrls: ['https://cdn/o.mp4'] }) } });
      return kieHandler(url);
    });
    await runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 });
    expect(ledger.find('s1')?.usd).toBe(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('leaves the entry pending when polling times out', async () => {
    const { assetsDir, ledger } = setup();
    mockFetch((url) => (url.includes('createTask') ? json({ code: 200, data: { taskId: 'tt' } }) : json({ code: 200, data: { state: 'generating' } })));
    const ctx = { assetsDir, ledger, shots: [shot], intervalMs: 1, timeoutMs: 20 };
    await expect(runShot(shot, ctx)).rejects.toThrow(/timed out/);
    expect(ledger.find('s1')).toMatchObject({ state: 'pending', taskId: 'tt' });
  });

  it('records failed with usd 0 on kie fail, then creates a new task', async () => {
    const { assetsDir, ledger } = setup();
    mockFetch((url) => (url.includes('createTask') ? json({ code: 200, data: { taskId: 'bad' } }) : json({ code: 200, data: { state: 'fail', failMsg: 'nope' } })));
    await expect(runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 })).rejects.toBeInstanceOf(KieTaskFailed);
    expect(ledger.find('s1')).toMatchObject({ state: 'failed', usd: 0 });
    mockFetch(kieHandler);
    await runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 });
    expect(calls.some((u) => u.includes('createTask'))).toBe(true);
    expect(ledger.find('s1')?.state).toBe('done');
  });

  it('BudgetError blocks before any fetch', async () => {
    const { assetsDir, ledger } = setup();
    ledger.record({ id: 'x', kind: 'video', provider: 'kie', usd: 9.5, state: 'done' });
    mockFetch(kieHandler);
    await expect(runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 })).rejects.toBeInstanceOf(BudgetError);
    expect(calls.length).toBe(0);
  });

  it('writes nothing to the ledger on a kie error', async () => {
    const { assetsDir, ledger } = setup();
    mockFetch(() => json({ code: 402, msg: 'insufficient' }));
    await expect(runShot(shot, { assetsDir, ledger, shots: [shot], intervalMs: 1 })).rejects.toBeInstanceOf(KieError);
    expect(ledger.find('s1')).toBeUndefined();
  });
});
