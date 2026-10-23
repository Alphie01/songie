import { describe, expect, it } from 'vitest';
import { bottleAngleFor, lastLine, roundLabel, seatAngle, seatPos, spinAt, spunBy, tableSize, voteFill } from '../src/brand/itiraf/bottleText';

const players = ['Ece', 'Mert', 'Deniz', 'Selin', 'Zeynep', 'Bora'];
const norm = (d: number) => ((d % 360) + 360) % 360;

describe('Şişe Çevirmece (games/bottle)', () => {
  it('bottleAngleFor lands on the target seat after whole turns', () => {
    expect(bottleAngleFor('Ece', players, 3)).toBe(1080);
    expect(bottleAngleFor('Mert', players, 3)).toBe(1140);
    expect(bottleAngleFor('Selin', players, 4)).toBe(4 * 360 + 180);
    for (const p of players) {
      const a = bottleAngleFor(p, players, 5, 250);
      expect(norm(a)).toBeCloseTo(seatAngle(players.indexOf(p), players.length));
      expect(a - 250).toBeGreaterThanOrEqual(5 * 360);
      expect(a - 250).toBeLessThan(6 * 360);
    }
  });

  it('bottleAngleFor keeps jitter and unknown targets', () => {
    expect(norm(bottleAngleFor('Deniz', players, 3, 0, -10))).toBe(110);
    expect(bottleAngleFor('Nobody', players, 3, 42)).toBe(42);
  });

  it('seats and spin match PlayView', () => {
    expect(seatPos(0, 6).left).toBe(50);
    expect(seatPos(0, 6).top).toBeCloseTo(7.6);
    expect(seatPos(3, 6).top).toBeCloseTo(92.4);
    expect(tableSize(7)).toBe('few');
    expect(tableSize(8)).toBe('mid');
    expect(tableSize(11)).toBe('many');
    expect(spinAt(0, 1000, 0)).toBe(0);
    expect(spinAt(0, 1000, 1)).toBe(1000);
    expect(spinAt(0, 1000, 0.5)).toBeCloseTo(937.5);
  });

  it('copy', () => {
    expect(roundLabel(5, 20)).toBe('Çevirme 6/20');
    expect(roundLabel(5, null)).toBe('Çevirme 6');
    expect(spunBy('Mert', false, true, 'Selin')).toBe('Şişeyi Mert çevirdi, sıra sende');
    expect(spunBy('Mert', false, false, 'Ece')).toBe('Şişeyi Mert çevirdi, şimdi Ece çevirecek');
    expect(lastLine('done', 'Mert', { yes: 4, no: 1 })).toBe('Mert +1 puan aldı (4 evet, 1 hayır)');
    expect(voteFill(3, 1, 5)).toBe(80);
  });
});
