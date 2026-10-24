import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { W1_META, nightBeats, w1Schema } from '../src/reels/weknows/W1Night';
import { W2_META, w2Schema, whoBeats } from '../src/reels/weknows/W2WhoWolf';
import { W3_META, w3Schema, youBeats } from '../src/reels/weknows/W3YouWolf';
import { WW_NIGHT, WW_POV, WW_PUZZLE } from '../src/reels/weknows/werewolfAds';
import { words } from '../tools/verifyVoices';

const root = path.resolve(__dirname, '..');

describe('We Knows · Kurt Adam reels', () => {
  it('valid defaults, every voice file exists, ~17–19,5 s each', () => {
    for (const [meta, schema, beats] of [
      [W1_META, w1Schema, nightBeats],
      [W2_META, w2Schema, whoBeats],
      [W3_META, w3Schema, youBeats],
    ] as const) {
      expect(schema.safeParse(meta.defaultProps).success, meta.id).toBe(true);
      for (const v of meta.defaultProps.voices) expect(fs.existsSync(path.join(root, 'public', v.src)), v.src).toBe(true);
      const sec = (beats as (v: { sec: number }[]) => { total: number })(meta.defaultProps.voices).total / 30;
      expect(sec, meta.id).toBeLessThanOrEqual(19.5);
      expect(sec, meta.id).toBeGreaterThanOrEqual(15);
    }
  });

  it('the puzzle is fair: the wolf is the only claim that contradicts the morning and the rule', () => {
    const doc = W2_META.defaultProps.players.find((p) => p.claim === 'doctor')!;
    expect(doc.wolf).toBe(true);
    expect(doc.line).toContain(W2_META.defaultProps.dead);
    expect(W2_META.defaultProps.players.filter((p) => p.wolf)).toHaveLength(1);
    expect(WW_PUZZLE.wolf).toBe(doc.name);
  });

  it('no line can be heard as an ethnic word ("Kürt") and transcripts compare word by word', () => {
    for (const l of [...WW_NIGHT, ...WW_PUZZLE.lines, ...WW_POV]) expect(l.text).not.toMatch(/\bKurt\s+hâlâ\b/);
    expect(words('Dün gece Ece’yi korudum.')).toEqual(['dün', 'gece', 'eceyi', 'korudum']);
  });
});
