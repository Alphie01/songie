import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { shotBeats } from '../src/reels/weknows/H1Hitler';
import { EN1_META, EN2_META, EN3_META, EN_SHOTS, en1Schema, en2Schema, en3Schema } from '../src/reels/weknows/I1Intrigue';
import { IN_COUNT } from '../src/reels/weknows/intrigueAds';

const root = path.resolve(__dirname, '..');

describe('We Knows · Entrika reels', () => {
  it('valid defaults, music only, 14–20,5 s each', () => {
    for (const [meta, schema, key] of [
      [EN1_META, en1Schema, 'i1'],
      [EN2_META, en2Schema, 'i2'],
      [EN3_META, en3Schema, 'i3'],
    ] as const) {
      expect(schema.safeParse(meta.defaultProps).success, meta.id).toBe(true);
      for (const v of meta.defaultProps.voices) expect(v.src, 'music only, no voice-over').toBe('');
      const sec = shotBeats(EN_SHOTS[key], meta.defaultProps.voices).total / 30;
      expect(sec, meta.id).toBeGreaterThanOrEqual(14);
      expect(sec, meta.id).toBeLessThanOrEqual(20.5);
    }
  });

  it('the counting puzzle is fair: open + in hand = every copy, so the claim is a bluff', () => {
    expect(IN_COUNT.open + IN_COUNT.inHand).toBe(IN_COUNT.copies);
  });
});
