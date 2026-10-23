import { describe, expect, it } from 'vitest';
import { loudestStart, paletteFor, propsFor, slug } from '../tools/reel';
import { PALETTES } from '../src/brand/palette';
import { r1Schema } from '../src/reels/R1Challenge';
import { r2Schema } from '../src/reels/R2RealGame';

const song = {
  id: 1,
  title: 'Loser',
  artist: 'Tame Impala',
  album: 'Deadbeat',
  answer: 'Tame Impala – Loser',
  src: 'assets/songs/1.mp3',
  cover: 'assets/songs/1.jpg',
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
    expect(r1Schema.safeParse(propsFor('r1', song, 15, 3)).success).toBe(true);
    expect(r2Schema.safeParse(propsFor('r2', song, 8, 5)).success).toBe(true);
  });

  it('gives each song a stable palette in range', () => {
    expect(paletteFor(3602329332)).toBe(paletteFor(3602329332));
    expect(paletteFor(16412330)).toBeGreaterThanOrEqual(0);
    expect(paletteFor(16412330)).toBeLessThan(PALETTES.length);
  });

  it('makes file-safe names from Turkish queries', () => {
    expect(slug('Tarkan Şımarık')).toBe('tarkan-simarik');
    expect(slug('tame impala loser')).toBe('tame-impala-loser');
  });
});
