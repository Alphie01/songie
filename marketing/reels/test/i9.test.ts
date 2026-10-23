import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { I9_META, I10_META, PN, i9Schema, pnRoom, pnStep } from '../src/reels/itiraf/I9Paranoia';
import { crew } from '../src/reels/friends';
import { EXPLICIT, PN_FLIRT, pnQuestions } from '../tools/reel';

const dir = path.resolve(__dirname, '../../../games/paranoia/server/content');

describe('Paranoya reels', () => {
  it('both variants run ~17,5 s with valid defaults', () => {
    for (const m of [I9_META, I10_META]) {
      expect(m.durationInFrames / m.fps).toBeLessThanOrEqual(18);
      expect(i9Schema.safeParse(m.defaultProps).success).toBe(true);
    }
    expect(I10_META.defaultProps.flirt).toBe(true);
  });

  it('reveals step by step: question → who was asked → answer', () => {
    expect(pnStep(0)).toBe(0);
    expect(pnStep(PN.steps[1])).toBe(1);
    expect(pnStep(PN.steps[2])).toBe(2);
    expect(PN.after - PN.react).toBeGreaterThanOrEqual(30);
    expect(PN.wipe3 - PN.reveal - PN.after).toBeGreaterThanOrEqual(30);
  });

  it('room: the sender is neither you nor your answer, six players', () => {
    const r = pnRoom(crew('Mert'));
    expect(r.sender).not.toBe(r.target);
    expect(new Set(r.players).size).toBe(6);
  });

  it('flirt questions exist in the game and are not explicit; normal pool is large', () => {
    const all = fs.readdirSync(dir).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as string[]);
    for (const q of PN_FLIRT) {
      expect(all).toContain(q);
      expect(EXPLICIT.test(q)).toBe(false);
    }
    expect(pnQuestions(dir).length).toBeGreaterThan(150);
  });
});
