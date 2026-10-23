import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BudgetError, SpendLedger } from '../tools/spend';

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-')), '.spend.json');

describe('SpendLedger', () => {
  it('starts at 0 when the file is missing', () => {
    expect(new SpendLedger(tmp()).spent()).toBe(0);
  });
  it('spent() sums only done entries', () => {
    const l = new SpendLedger(tmp());
    l.record({ id: 'a', kind: 'image', provider: 'openai', usd: 1, state: 'done' });
    l.record({ id: 'b', kind: 'video', provider: 'kie', usd: 5, state: 'pending' });
    l.record({ id: 'c', kind: 'video', provider: 'kie', usd: 3, state: 'failed' });
    expect(l.spent()).toBe(1);
    expect(new SpendLedger(l['file']).spent()).toBe(1);
  });
  it('assertCanSpend throws BudgetError over the cap', () => {
    const l = new SpendLedger(tmp());
    l.record({ id: 'a', kind: 'video', provider: 'kie', usd: 9.5, state: 'done' });
    expect(() => l.assertCanSpend(1)).toThrow(BudgetError);
    expect(() => l.assertCanSpend(0.5)).not.toThrow();
  });
  it('reserves pending estimates against the cap', () => {
    const l = new SpendLedger(tmp());
    l.record({ id: 'a', kind: 'video', provider: 'kie', usd: 8, state: 'done' });
    l.record({ id: 'b', kind: 'video', provider: 'kie', usd: 0, estimateUsd: 1.5, taskId: 't', state: 'pending' });
    expect(l.spent()).toBe(8);
    expect(() => l.assertCanSpend(1)).toThrow(BudgetError);
    expect(() => l.assertCanSpend(0.5)).not.toThrow();
  });
  it('record replaces an entry with the same id', () => {
    const l = new SpendLedger(tmp());
    l.record({ id: 'a', kind: 'video', provider: 'kie', usd: 1, taskId: 't', state: 'pending' });
    l.record({ id: 'a', kind: 'video', provider: 'kie', usd: 2, taskId: 't', state: 'done' });
    expect(l.spent()).toBe(2);
    expect(l.find('a')?.state).toBe('done');
  });
});
