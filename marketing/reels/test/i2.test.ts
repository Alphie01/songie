import { describe, expect, it } from 'vitest';
import { I2, I2_META, duoAnswered, i2Schema } from '../src/reels/itiraf/I2NeverFlirt';

describe('I2 Ben Hiç flirt (+18) reel', () => {
  it('runs ~17,5 s with valid defaults', () => {
    const s = I2_META.durationInFrames / I2_META.fps;
    expect(s).toBeGreaterThan(15);
    expect(s).toBeLessThanOrEqual(18);
    expect(i2Schema.safeParse(I2_META.defaultProps).success).toBe(true);
  });

  it('peels the censor tape before asking, and holds every beat long enough', () => {
    expect(I2.peel).toBeGreaterThan(I2.card);
    expect(I2.ask - I2.peel).toBeGreaterThanOrEqual(20);
    expect(I2.wipe1 - I2.ask).toBeGreaterThanOrEqual(30);
    expect(I2.wipe3 - I2.reveal).toBeGreaterThanOrEqual(90);
    expect(I2_META.durationInFrames - I2.cta).toBeGreaterThanOrEqual(60);
  });

  it('counts answers on the two phones: 0 → you → your date', () => {
    expect(duoAnswered(0)).toBe(0);
    expect(duoAnswered(I2.youPress)).toBe(1);
    expect(duoAnswered(I2.datePress)).toBe(2);
  });
});
