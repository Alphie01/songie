import { describe, expect, it } from 'vitest';
import { brightBeats } from '../src/brand/weknows/Bright';
import { AG_BOARD } from '../src/brand/weknows/agents/AgScreens';
import { AG1_META, AG2_META, AG3_META, AG_SHOTS, agSchema } from '../src/reels/weknows/A1Agents';

describe('We Knows · Ajanlar reels (bright, music only)', () => {
  it('valid defaults, 12–18 s each', () => {
    for (const [meta, key] of [
      [AG1_META, 'a1'],
      [AG2_META, 'a2'],
      [AG3_META, 'a3'],
    ] as const) {
      expect(agSchema.safeParse(meta.defaultProps).success).toBe(true);
      const sec = brightBeats(AG_SHOTS[key]).total / 30;
      expect(sec, meta.id).toBeGreaterThanOrEqual(12);
      expect(sec, meta.id).toBeLessThanOrEqual(18);
    }
  });

  it('the story matches the board key', () => {
    const k = (w: string) => AG_BOARD.find((c) => c.word === w)!.key;
    expect([k('BALIK'), k('BUZ'), k('BAHÇE')]).toEqual(['g', 'g', 'g']);
    expect(k('BARDAK')).toBe('n');
    expect(k('BIÇAK')).toBe('x');
  });
});
