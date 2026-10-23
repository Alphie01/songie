import { describe, expect, it } from 'vitest';
import {
  RF_TEXT,
  countVotes,
  majorityOf,
  optionsFor,
  pct,
  readyCountLabel,
  roundLabel,
  timerFill,
  verdictLabel,
  waitingLabel,
  youLine,
} from '../src/brand/itiraf/redFlagText';

const L = RF_TEXT.vote;

describe('Red Flag copy (games/red-flag/client/strings.ts)', () => {
  it('labels', () => {
    expect(roundLabel(7, 20)).toBe('Durum 7/20');
    expect(roundLabel(7, null)).toBe('Durum 7');
    expect(waitingLabel(5, 6)).toBe('5/6 kişi oy verdi');
    expect(readyCountLabel(2, 6, true)).toMatch(/^2\/6 kişi hazır\. Süre bitince/);
    expect(optionsFor(false)).toEqual(['green', 'red']);
    expect(timerFill(15, 30)).toBe(50);
  });
  it('split, majority and verdict (server majorityOf + PlayView)', () => {
    const c = countVotes([{ vote: 'red' }, { vote: 'green' }, { vote: 'red' }, { vote: 'never' }]);
    expect(c).toEqual({ green: 1, red: 2, never: 1 });
    expect(pct(2, 4)).toBe(50);
    expect(pct(1, 0)).toBe(0);
    expect(majorityOf(c)).toEqual(['red']);
    expect(majorityOf({ green: 0, red: 0, never: 0 })).toEqual([]);
    const all = optionsFor(true);
    expect(verdictLabel(c, all, L)).toBe('Çoğunluk: Red flag');
    expect(verdictLabel({ green: 2, red: 2, never: 0 }, all, L)).toBe('Oylar bölündü');
    expect(verdictLabel({ green: 3, red: 0, never: 0 }, all, L)).toBe('Herkes aynı fikirde');
    expect(verdictLabel({ green: 0, red: 0, never: 0 }, all, L)).toBe('Kimse oy vermedi.');
  });
  it('my line', () => {
    expect(youLine('red', 'red', ['red'], true, L)).toBe('Sen: Red flag · Tahminin tuttu, +1');
    expect(youLine('green', 'never', ['red'], true, L)).toBe('Sen: Green flag · Tahminin Asla olmaz idi, tutmadı');
    expect(youLine('green', null, ['red'], true, L)).toBe('Sen: Green flag · Tahmin vermedin');
    expect(youLine(null, null, [], false, L)).toBe('');
  });
});
