import { describe, expect, it } from 'vitest';
import { I3, I3_META, i3Schema, reactionsAt, room } from '../src/reels/itiraf/I3Confessions';
import { I4, I4_META, flirtRoom, i4Schema } from '../src/reels/itiraf/I4ConfessionsFlirt';
import { CONFESSION_PAIRS, FLIRT_PAIRS } from '../src/reels/itiraf/confessionPairs';
import { crew } from '../src/reels/friends';
import { EXPLICIT } from '../tools/reel';
import fs from 'node:fs';
import path from 'node:path';

const content = path.resolve(__dirname, '../../../games/confessions/server/content');
const pool = (files: string[]) => files.flatMap((f) => JSON.parse(fs.readFileSync(path.join(content, f), 'utf8')) as string[]);

describe('İtiraf reels', () => {
  it('both run ~17,5 s with valid defaults', () => {
    for (const [meta, schema] of [[I3_META, i3Schema], [I4_META, i4Schema]] as const) {
      expect(meta.durationInFrames / meta.fps).toBeLessThanOrEqual(18);
      expect(schema.safeParse(meta.defaultProps).success).toBe(true);
    }
  });

  it('holds every beat long enough to read', () => {
    expect(I3.wipe1 - I3.ask).toBeGreaterThanOrEqual(45);
    expect(I3.wipe2 - I3.guess - I3.select).toBeGreaterThanOrEqual(60);
    expect(I4.wipe1 - I4.ask).toBeGreaterThanOrEqual(30);
    expect(I4.wipe3 - I4.reveal - I4.aboutYou).toBeGreaterThanOrEqual(45);
  });

  it('uses topics straight from the game pools, and flirt pairs stay non-explicit', () => {
    const all = pool(fs.readdirSync(content));
    for (const p of [...CONFESSION_PAIRS, ...FLIRT_PAIRS]) {
      expect(all).toContain(p.topic);
      expect(p.confession.length).toBeGreaterThanOrEqual(10);
      expect(p.confession.length).toBeLessThanOrEqual(240);
    }
    for (const p of FLIRT_PAIRS) expect(EXPLICIT.test(p.topic + ' ' + p.confession)).toBe(false);
  });

  it('builds six-player rooms without duplicates; the author is not your suspect', () => {
    const r = room(crew('Can'));
    expect(new Set(r.players).size).toBe(6);
    expect(r.author).not.toBe(r.suspect);
    expect(new Set(flirtRoom('Zeynep')).size).toBe(6);
  });

  it('ticks reactions up, your "Ben de!" included', () => {
    expect(reactionsAt(0)).toEqual({ yok: 1, bende: 2, efsane: 0, olamaz: 0 });
    expect(reactionsAt(999)).toEqual({ yok: 2, bende: 3, efsane: 1, olamaz: 0 });
  });
});
