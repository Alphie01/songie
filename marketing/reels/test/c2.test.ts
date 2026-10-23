import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { caps } from '../src/brand/casebook/Noir';
import { INTERROGATIONS, PUZZLES } from '../src/reels/casebook/adCases';
import { C2_META, c2Schema, puzzleBeats } from '../src/reels/casebook/C2Puzzle';
import { C3_META, c3Schema, interrogationBeats } from '../src/reels/casebook/C3Interrogation';
import { C4_META, SQ, c4Schema } from '../src/reels/casebook/C4Squad';
import { interrogationLines, puzzleLines } from '../tools/caseAds';
import { audioSeconds } from '../tools/tts';

const root = path.resolve(__dirname, '..');
const pub = (p: string) => path.join(root, 'public', p);

describe('Casebook ad reels', () => {
  it('every mini case has exactly one liar, its name in the reveal, and short lines', () => {
    for (const p of PUZZLES) {
      expect(p.suspects.filter((s) => s.liar), p.id).toHaveLength(1);
      expect(p.reveal).toContain(p.suspects.find((s) => s.liar)!.name);
      for (const s of p.suspects) expect(s.line.length).toBeLessThanOrEqual(60);
      for (const f of [p.scene, ...p.suspects.map((s) => s.portrait)]) expect(fs.existsSync(pub(f)), f).toBe(true);
    }
  });

  it('generated voices exist and the puzzle stays under 21 s with a ~10 s timer', () => {
    for (const p of PUZZLES) {
      const voices = puzzleLines(p).map((l) => ({ sec: audioSeconds(path.join(root, 'assets/voices', `${l.id}.mp3`)) }));
      const b = puzzleBeats(voices);
      expect(b.total / 30, p.id).toBeLessThanOrEqual(21);
      expect(b.seconds).toBeGreaterThanOrEqual(9);
      expect(b.reveal - b.pauseAt).toBeGreaterThanOrEqual(45); // time to think
    }
    expect(c2Schema.safeParse(C2_META.defaultProps).success).toBe(true);
  });

  it('interrogations stay under 20 s', () => {
    for (const iv of INTERROGATIONS) {
      const voices = interrogationLines(iv).map((l) => ({ sec: audioSeconds(path.join(root, 'assets/voices', `${l.id}.mp3`)) }));
      expect(interrogationBeats(voices).total / 30, iv.id).toBeLessThanOrEqual(20);
      expect(fs.existsSync(pub(iv.suspect.portrait))).toBe(true);
    }
    expect(c3Schema.safeParse(C3_META.defaultProps).success).toBe(true);
  });

  it('squad chat runs ~17 s and each message is readable', () => {
    expect(SQ.total / 30).toBeLessThanOrEqual(17.5);
    for (let i = 1; i < SQ.msgs.length; i++) expect(SQ.msgs[i]! - SQ.msgs[i - 1]!).toBeGreaterThanOrEqual(50);
    expect(c4Schema.safeParse(C4_META.defaultProps).success).toBe(true);
  });

  it('Bebas caps keep the Turkish dotted İ', () => {
    expect(caps('bir ipucuydu')).toBe('BİR İPUCUYDU');
  });
});
