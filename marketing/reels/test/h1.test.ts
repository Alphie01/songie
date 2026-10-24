import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { H1_META, H2_META, H3_META, H_SHOTS, h1Schema, h2Schema, h3Schema, shotBeats } from '../src/reels/weknows/H1Hitler';
import { SH_LIAR } from '../src/reels/weknows/hitlerAds';

const root = path.resolve(__dirname, '..');

describe('We Knows · Secret Hitler reels', () => {
  it('valid defaults, voices on disk, 15–20 s each', () => {
    for (const [meta, schema, key] of [
      [H1_META, h1Schema, 'h1'],
      [H2_META, h2Schema, 'h2'],
      [H3_META, h3Schema, 'h3'],
    ] as const) {
      expect(schema.safeParse(meta.defaultProps).success, meta.id).toBe(true);
      for (const v of meta.defaultProps.voices) expect(fs.existsSync(path.join(root, 'public', v.src)), v.src).toBe(true);
      const sec = shotBeats(H_SHOTS[key], meta.defaultProps.voices).total / 30;
      expect(sec, meta.id).toBeGreaterThanOrEqual(15);
      expect(sec, meta.id).toBeLessThanOrEqual(20);
    }
  });

  it('the liar puzzle is fair: the president discarded the only liberal, so the "liberal" claim is the lie', () => {
    const { hand, discarded } = SH_LIAR;
    expect(hand.filter((c) => c === 'liberal')).toHaveLength(1);
    expect(hand[discarded]).toBe('liberal');
    expect(hand.filter((_, i) => i !== discarded).every((c) => c === 'fascist')).toBe(true);
    expect(SH_LIAR.lines[1]!.text).toContain('liberal');
  });
});
