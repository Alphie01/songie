import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ffprobeBin, makeSfx } from '../tools/sfx';

const DUR = { bip: 0.1, ding: 0.6, whoosh: 0.4, pop: 0.05, buzz: 0.3, tick: 0.02, type: 0.05, stamp: 0.3, shutter: 0.2 };

describe('makeSfx', () => {
  it('writes 9 wavs with the requested durations', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-'));
    const files = await makeSfx(dir);
    expect(Object.keys(files).sort()).toEqual(Object.keys(DUR).sort());
    for (const [name, d] of Object.entries(DUR)) {
      const f = files[name as keyof typeof DUR];
      expect(fs.statSync(f).size).toBeGreaterThan(1024);
      const out = execFileSync(ffprobeBin(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString();
      expect(Math.abs(parseFloat(out) - d)).toBeLessThanOrEqual(0.05);
    }
  }, 60_000);
});
