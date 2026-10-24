import { describe, expect, it } from 'vitest';
import { R4, R4_META, r4Schema } from '../src/reels/R4Solo';

describe('Songie · Olsun (solo)', () => {
  it('valid defaults, ~16,7 s, each beat readable', () => {
    expect(r4Schema.safeParse(R4_META.defaultProps).success).toBe(true);
    expect(R4.total / 30).toBeLessThanOrEqual(17.5);
    const beats = [R4.home, R4.play - R4.home, R4.reveal - R4.play, R4.streak - R4.reveal, R4.cta - R4.streak, R4.total - R4.cta];
    for (const b of beats) expect(b).toBeGreaterThanOrEqual(60);
  });
});
