import { describe, expect, it } from 'vitest';
import { R1_META, r1Schema, solveLabel } from '../src/reels/R1Challenge';
import { SAFE, VIDEO } from '../src/brand/fonts';

describe('R1Challenge composition', () => {
  it('is 330 frames (11 s, inside 8–12 s) at 1080×1920', () => {
    expect(R1_META.id).toBe('songie-01-challenge');
    expect(R1_META.durationInFrames).toBe(330);
    const seconds = R1_META.durationInFrames / R1_META.fps;
    expect(seconds).toBeGreaterThanOrEqual(8);
    expect(seconds).toBeLessThanOrEqual(12);
    expect(R1_META.width).toBe(1080);
    expect(R1_META.height).toBe(1920);
    expect(R1_META.fps).toBe(VIDEO.fps);
  });

  it('accepts the default props', () => {
    expect(r1Schema.safeParse(R1_META.defaultProps).success).toBe(true);
    expect(R1_META.defaultProps).toEqual({ answer: 'Tarkan – Kuzu Kuzu', solveStage: 0, song: 'assets/songs/16412320.mp3', songFrom: 15.5 });
  });

  it("rejects answer: ''", () => {
    expect(r1Schema.safeParse({ answer: '', solveStage: 0, song: '', songFrom: 0 }).success).toBe(false);
    expect(r1Schema.safeParse({ answer: '   ', solveStage: 0, song: '', songFrom: 0 }).success).toBe(false);
  });

  it('rejects solveStage outside 0..4', () => {
    expect(r1Schema.safeParse({ answer: 'x', solveStage: 5, song: '', songFrom: 0 }).success).toBe(false);
    expect(r1Schema.safeParse({ answer: 'x', solveStage: 1.5, song: '', songFrom: 0 }).success).toBe(false);
  });

  it('rejects a song offset past the 30 s preview', () => {
    expect(r1Schema.safeParse({ answer: 'x', solveStage: 0, song: '', songFrom: 29.5 }).success).toBe(false);
  });

  it('labels the solve with the app stage seconds (tr-TR) and points', () => {
    expect(solveLabel(0)).toBe("Mert 0,1 sn'de bildi +1000");
    expect(solveLabel(1)).toBe("Mert 0,5 sn'de bildi +700");
    expect(solveLabel(4)).toBe("Mert 15 sn'de bildi +100");
  });

  it('keeps the safe area constant the brief uses', () => {
    expect(SAFE).toEqual({ top: 250, bottom: 400, side: 60 });
  });
});
