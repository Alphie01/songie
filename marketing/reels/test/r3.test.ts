import { describe, expect, it } from 'vitest';
import { R3, R3_META, gameState, r3Schema, suggestionList, typedAt } from '../src/reels/R3Winner';
import { crew } from '../src/reels/friends';

const p = R3_META.defaultProps;
const c8 = crew(p.solver);

describe('R3Winner composition', () => {
  it('runs at the R2 pace (~17 s) at 1080×1920', () => {
    expect(R3_META.durationInFrames / R3_META.fps).toBeGreaterThan(15);
    expect(R3_META.durationInFrames / R3_META.fps).toBeLessThanOrEqual(18);
    expect(r3Schema.safeParse(p).success).toBe(true);
  });

  it('holds every beat long enough to read', () => {
    expect(R3.wipe1 - R3.names[3]).toBeGreaterThanOrEqual(20);
    expect(R3.tap - R3.typeFrom).toBeGreaterThanOrEqual(40);
    expect(R3.wipe2 - R3.game - R3.lead).toBeGreaterThanOrEqual(60);
    expect(R3.wipe3 - R3.reveal).toBeGreaterThanOrEqual(70);
    expect(R3_META.durationInFrames - R3.cta).toBeGreaterThanOrEqual(60);
  });

  it('types the first three letters of the artist, one at a time', () => {
    expect(typedAt(R3.typeFrom, 'Tarkan')).toBe('T');
    expect(typedAt(R3.typeFrom + R3.typeEvery * 2, 'Tarkan')).toBe('Tar');
    expect(typedAt(R3.typeFrom + 100, 'Tarkan')).toBe('Tar');
  });

  it('lists the answer second, between the decoys, and survives no decoys', () => {
    expect(suggestionList('A – x', ['A – y', 'A – z'])).toEqual(['A – y', 'A – x', 'A – z']);
    expect(suggestionList('A – x', [])).toEqual(['A – x']);
    const g = gameState(R3.select, { ...p, decoys: [] }, c8);
    expect(g.suggestions![g.selected!]).toBe('Tarkan – Şımarık');
  });

  it('you win at 0,5 sn and overtake the leader', () => {
    expect(gameState(R3.tap - 1, p, c8).won).toBe(false);
    const end = gameState(R3.lead, p, c8);
    expect(end).toMatchObject({ won: true, lead: true, guess: 'Tarkan – Şımarık', stage: 1 });
    expect(end.scores[0]).toMatchObject({ name: 'Sen', score: 3030 });
    expect(end.feed[0]).toMatchObject({ name: 'Sen', text: '0.5s’de bildi', points: 880 });
  });
});
