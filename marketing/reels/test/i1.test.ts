import { describe, expect, it } from 'vitest';
import { I1, I1_META, answeredAt, i1Schema, roster } from '../src/reels/itiraf/I1Never';
import { crew, deDa } from '../src/reels/friends';

describe('I1 Ben Hiç reel', () => {
  it('runs at the Songie R2 pace (~16 s) with valid defaults', () => {
    const s = I1_META.durationInFrames / I1_META.fps;
    expect(s).toBeGreaterThan(14);
    expect(s).toBeLessThanOrEqual(18);
    expect(i1Schema.safeParse(I1_META.defaultProps).success).toBe(true);
    expect(i1Schema.safeParse({ ...I1_META.defaultProps, statement: 'Hiç yalan söylemedim.' }).success).toBe(false);
  });

  it('holds every beat long enough to read', () => {
    expect(I1.wipe1 - I1.ask).toBeGreaterThanOrEqual(45);
    expect(I1.wipe2 - I1.game - I1.revealPress).toBeGreaterThanOrEqual(20);
    expect(I1.wipe3 - I1.reveal).toBeGreaterThanOrEqual(90);
    expect(I1_META.durationInFrames - I1.cta).toBeGreaterThanOrEqual(60);
  });

  it('counts answers in: 2 → you → … → 6/6', () => {
    expect(answeredAt(0)).toBe(2);
    expect(answeredAt(I1.press)).toBe(3);
    expect(answeredAt(I1.answers[4]!)).toBe(6);
    expect(answeredAt(999)).toBe(6);
  });

  it('puts you and the storyteller among the doers, six players, no duplicates', () => {
    const r = roster(crew('Zeynep'));
    expect(r.did).toEqual(expect.arrayContaining(['Sen', 'Zeynep']));
    expect(new Set([...r.did, ...r.didnt]).size).toBe(6);
  });

  it('uses Turkish vowel harmony for "de/da"', () => {
    expect(deDa('Mert')).toBe('de');
    expect(deDa('Can')).toBe('da');
    expect(deDa('Burak')).toBe('da');
    expect(deDa('Selin')).toBe('de');
    expect(deDa('Ece')).toBe('de');
  });
});
