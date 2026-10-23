import { describe, expect, it } from 'vitest';
import { loudestStart, paletteFor, propsFor, slug, solverFor } from '../tools/reel';
import { FRIEND_NAMES } from '../src/reels/friends';
import { PALETTES } from '../src/brand/palette';
import { r1Schema } from '../src/reels/R1Challenge';
import { r2Schema } from '../src/reels/R2RealGame';
import { r3Schema } from '../src/reels/R3Winner';

const song = {
  id: 1,
  title: 'Loser',
  artist: 'Tame Impala',
  album: 'Deadbeat',
  answer: 'Tame Impala – Loser',
  src: 'assets/songs/1.mp3',
  cover: 'assets/songs/1.jpg',
  decoys: ['Tame Impala – Borderline'],
  file: '/x/1.mp3',
};

describe('reel', () => {
  it('picks the start of the loudest window, inside the allowed range', () => {
    const rms = Array.from({ length: 60 }, (_, i) => (i >= 30 && i < 36 ? -8 : -20));
    expect(loudestStart(rms, 0.5)).toBe(15);
    expect(loudestStart([-Infinity, -Infinity, ...Array(56).fill(-15)], 0.5)).toBeGreaterThanOrEqual(2);
    const lateLoud = Array.from({ length: 60 }, (_, i) => (i >= 55 ? -5 : -20));
    expect(loudestStart(lateLoud, 0.5)).toBeLessThanOrEqual(24);
  });

  it('builds props each composition schema accepts', () => {
    expect(r1Schema.safeParse(propsFor('r1', song, { songFrom: 15, palette: 3, solver: 'Zeynep' })).success).toBe(true);
    expect(r3Schema.safeParse(propsFor('r3', song, { songFrom: 8, palette: 5, solver: 'Can' })).success).toBe(true);
    expect(r2Schema.safeParse(propsFor('r2', song, { songFrom: 8, palette: 5, solver: 'Can' })).success).toBe(true);
  });

  it('gives each song a stable palette in range', () => {
    expect(paletteFor(3602329332)).toBe(paletteFor(3602329332));
    expect(paletteFor(16412330)).toBeGreaterThanOrEqual(0);
    expect(paletteFor(16412330)).toBeLessThan(PALETTES.length);
  });

  it('rotates the solver name per song', () => {
    expect(FRIEND_NAMES).toContain(solverFor(3602329332));
    expect(new Set([1, 2, 3, 4].map(solverFor)).size).toBe(4);
  });

  it('makes file-safe names from Turkish queries', () => {
    expect(slug('Tarkan Şımarık')).toBe('tarkan-simarik');
    expect(slug('tame impala loser')).toBe('tame-impala-loser');
  });
});

describe('game reels', () => {
  it('reads only safe Ben Hiç cards (no +18 packs) from the game content', async () => {
    const { neverCards, NEVER_SAFE_CATEGORIES } = await import('../tools/reel');
    const path = await import('node:path');
    const cards = neverCards(path.resolve(__dirname, '../../../games/never/server/content'));
    expect(cards.length).toBeGreaterThan(50);
    expect(cards.every((c) => c.text.startsWith('Ben hiç '))).toBe(true);
    expect(new Set(cards.map((c) => c.category))).toEqual(new Set(Object.values(NEVER_SAFE_CATEGORIES).filter((n) => cards.some((c) => c.category === n))));
    expect(cards.some((c) => /\+18/.test(c.category))).toBe(false);
  });
});
