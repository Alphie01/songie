import { describe, expect, it } from 'vitest';
import { barWidth, joinNames, roundLabel, statusLine, tally, tapToVote, tileTag, timerFill, titleOf, winnerLine } from '../src/brand/itiraf/mostLikelyText';

describe('Aramızdaki En copy (games/most-likely/client/strings.ts)', () => {
  it('round, status and tags', () => {
    expect(roundLabel(3, 10)).toBe('Soru 3/10');
    expect(roundLabel(3, null)).toBe('Soru 3');
    expect(statusLine(4, 6, ['Zeynep', 'Bora'])).toBe('4/6 kişi oy verdi · Beklenenler: Zeynep ve Bora');
    expect(statusLine(6, 6, [])).toBe('6/6 kişi oy verdi');
    expect(tileTag(true, true)).toBe('Oyun · Tahminin');
    expect(tileTag(false, false)).toBe('');
    expect(tapToVote(true)).toContain('kendine de verebilirsin!');
  });
  it('names and titles', () => {
    expect(joinNames(['Ece', 'Mert', 'Deniz'])).toBe('Ece, Mert ve Deniz');
    expect(joinNames([])).toBe('');
    expect(winnerLine(titleOf('geç kalan'), 3)).toBe('en geç kalan · 3 oy');
  });
  it('tally: order, zeros, tie, no votes', () => {
    const players = ['Ece', 'Mert', 'Kaan', 'Bora'];
    const r = tally(players, { Kaan: 3, Mert: 1 });
    expect(r.rows.map((x) => x.id)).toEqual(['Kaan', 'Mert', 'Ece', 'Bora']);
    expect(r).toMatchObject({ winners: ['Kaan'], max: 3, total: 4 });
    expect(tally(players, { Bora: 2, Mert: 2 }).winners).toEqual(['Mert', 'Bora']);
    expect(tally(players, {}).winners).toEqual([]);
  });
  it('bar and timer fills', () => {
    expect(barWidth(3, 6)).toBe(50);
    expect(barWidth(1, 0)).toBe(0);
    expect(timerFill(15, 30)).toBe(50);
    expect(timerFill(40, 30)).toBe(100);
  });
});
