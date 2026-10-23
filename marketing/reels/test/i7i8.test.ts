import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { I7_META, RF, i7Schema, lonelyRed, rfVotedAt } from '../src/reels/itiraf/I7RedFlag';
import { I8_META, flirtBallots, i8Schema } from '../src/reels/itiraf/I8RedFlagFlirt';
import { crew } from '../src/reels/friends';
import { EXPLICIT, RF_FLIRT, RF_SAFE, rfSituations } from '../tools/reel';

const dir = path.resolve(__dirname, '../../../games/red-flag/server/content');

describe('Red Flag reels', () => {
  it('both run ~17,5 s with valid defaults', () => {
    for (const [m, s] of [[I7_META, i7Schema], [I8_META, i8Schema]] as const) {
      expect(m.durationInFrames / m.fps).toBeLessThanOrEqual(18);
      expect(s.safeParse(m.defaultProps).success).toBe(true);
    }
  });

  it('counts votes up to 6/6, holds the reveal long enough', () => {
    expect(rfVotedAt(0)).toBe(1);
    expect(rfVotedAt(999)).toBe(6);
    expect(RF.wipe3 - RF.reveal - RF.you).toBeGreaterThanOrEqual(45);
  });

  it('normal: majority green, only you red; flirt: you green, your date red', () => {
    const b = lonelyRed(crew('Mert'));
    expect(b.filter((x) => x.vote === 'red').map((x) => x.name)).toEqual(['Sen']);
    expect(b.filter((x) => x.vote === 'green').length).toBe(4);
    const f = flirtBallots('Zeynep');
    expect(f.find((x) => x.name === 'Sen')!.vote).toBe('green');
    expect(f.find((x) => x.name === 'Zeynep')!.vote).toBe('red');
    expect(new Set(f.map((x) => x.name)).size).toBe(6);
  });

  it('pools: real situations, no +18 in the normal pool, nothing explicit in the flirt pool', () => {
    const safe = rfSituations(dir, RF_SAFE);
    const flirt = rfSituations(dir, RF_FLIRT);
    expect(safe.length).toBeGreaterThan(150);
    expect(safe.some((s) => s.category.includes('+18'))).toBe(false);
    expect(flirt.every((s) => !EXPLICIT.test(s.text))).toBe(true);
  });
});
