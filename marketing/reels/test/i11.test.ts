import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BT, I11_META, I12_META, btAngle, btPlayers, btYes, i11Schema } from '../src/reels/itiraf/I11Bottle';
import { seatAngle } from '../src/brand/itiraf/bottleText';
import { crew } from '../src/reels/friends';
import { BT_FLIRT, EXPLICIT, btCards } from '../tools/reel';

const dir = path.resolve(__dirname, '../../../games/bottle/server/content');

describe('Şişe reels', () => {
  it('both variants run ~17,5 s with valid defaults', () => {
    for (const m of [I11_META, I12_META]) {
      expect(m.durationInFrames / m.fps).toBeLessThanOrEqual(18);
      expect(i11Schema.safeParse(m.defaultProps).success).toBe(true);
    }
  });

  it('the bottle spins several turns and stops pointing at you', () => {
    const c = crew('Mert');
    const end = btAngle(BT.spinTo, c);
    expect(end).toBeGreaterThan(3 * 360);
    const you = seatAngle(btPlayers(c).indexOf('Sen'), 6);
    expect(Math.abs((((end - you) % 360) + 360) % 360)).toBeLessThanOrEqual(5);
    expect(btAngle(0, c)).toBe(0);
  });

  it('yes votes tick up to 4 of 5', () => {
    expect(btYes(0)).toBe(0);
    expect(btYes(999)).toBe(4);
  });

  it('flirt cards exist in the game and are not explicit; normal pool is large', () => {
    const all = fs.readdirSync(dir).flatMap((f) => {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { truth: string[]; dare: string[] };
      return [...j.truth, ...j.dare];
    });
    for (const c of BT_FLIRT) {
      expect(all).toContain(c.text);
      expect(EXPLICIT.test(c.text)).toBe(false);
    }
    expect(btCards(dir).length).toBeGreaterThan(150);
  });
});
