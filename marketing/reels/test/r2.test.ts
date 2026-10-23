import { describe, expect, it } from 'vitest';
import { R2, R2_META, gameState, r2Schema } from '../src/reels/R2RealGame';
import { CLIPS, STOPS } from '../src/brand/app/appTokens';

describe('R2RealGame composition', () => {
  it('is 360 frames (12 s, inside 8–12 s) at 1080×1920', () => {
    expect(R2_META.durationInFrames).toBe(360);
    expect(R2_META.durationInFrames / R2_META.fps).toBeLessThanOrEqual(12);
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
