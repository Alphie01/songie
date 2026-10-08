import { describe, expect, it } from 'vitest';
import { scoreFor } from './index.js';

describe('scoreFor', () => {
  it('rewards early stage and speed', () => {
    expect(scoreFor({ stage: 0, elapsedMs: 0, stageMs: 8000, kind: 'correct', first: true })).toBe(1250);
    expect(scoreFor({ stage: 0, elapsedMs: 8000, stageMs: 8000, kind: 'correct', first: false })).toBe(1000);
    expect(scoreFor({ stage: 4, elapsedMs: 10000, stageMs: 20000, kind: 'correct', first: false })).toBe(200);
  });
  it('gives a share for artist-only guesses without the first bonus', () => {
    expect(scoreFor({ stage: 1, elapsedMs: 0, stageMs: 8000, kind: 'artist', first: true })).toBe(270);
  });
  it('clamps elapsed time', () => {
    expect(scoreFor({ stage: 2, elapsedMs: -50, stageMs: 1000, kind: 'correct', first: false })).toBe(650);
  });
});
