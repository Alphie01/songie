import { describe, expect, it } from 'vitest';
import { R2, R2_META, gameState, r2Schema } from '../src/reels/R2RealGame';
import { CLIPS, STOPS } from '../src/brand/app/appTokens';

describe('R2RealGame composition', () => {
  it('is 664 frames (~22 s; readable pace beats the 8–12 s target, user ruling) at 1080×1920', () => {
    expect(R2_META.durationInFrames).toBe(664);
    expect(R2_META.durationInFrames).toBe(R2.cta + 80);
    expect([R2_META.width, R2_META.height]).toEqual([1080, 1920]);
  });

  it('accepts the default props and rejects an empty title', () => {
    expect(r2Schema.safeParse(R2_META.defaultProps).success).toBe(true);
    expect(r2Schema.safeParse({ ...R2_META.defaultProps, title: ' ' }).success).toBe(false);
  });

  it('plays each stage clip in full before its "Pas"', () => {
    R2.stages.forEach((s, i) => expect(s.clip + Math.round(CLIPS[i]! * 30)).toBeLessThanOrEqual(s.pass));
    expect(R2.game + R2.stages[2]!.pass).toBeLessThan(R2.wipe2);
  });

  it('holds every beat long enough to read (≥ 0,8 sn)', () => {
    const min = 24;
    R2.counts.slice(1).forEach((f, i) => expect(f - R2.counts[i]!).toBeGreaterThanOrEqual(min));
    R2.stages.slice(1).forEach((s, i) => expect(s.play - R2.stages[i]!.pass).toBeGreaterThanOrEqual(30));
    expect(R2.wipe2 - R2.game - R2.mert).toBeGreaterThanOrEqual(60);
    expect(R2.wipe3 - R2.reveal).toBeGreaterThanOrEqual(90);
    expect(R2_META.durationInFrames - R2.cta).toBeGreaterThanOrEqual(75);
  });

  it('walks 0,1 → 0,5 → 2 sn on each pass and reveals Mert last', () => {
    expect(gameState(0).stage).toBe(0);
    expect(gameState(R2.stages[0]!.pass + 20).stage).toBe(1);
    expect(gameState(R2.stages[1]!.pass + 20)).toMatchObject({ stage: 2, fill: STOPS[2] });
    expect(gameState(R2.mert - 1).feed.some((l) => l.name === 'Mert')).toBe(false);
    expect(gameState(R2.mert).feed[0]).toMatchObject({ name: 'Mert', text: '0.1s’de bildi', points: 1000 });
  });

  it('only plays while a stage clip is sounding', () => {
    const s = R2.stages[1]!;
    expect(gameState(s.clip - 1).playing).toBe(false);
    expect(gameState(s.clip).playing).toBe(true);
    expect(gameState(s.clip + 15).playing).toBe(false);
  });
});
