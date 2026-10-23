import { describe, expect, it } from 'vitest';
import {
  answeredLabel,
  eliminatedLabel,
  joinNames,
  percent,
  revealHeadline,
  roundLabel,
  skipLabel,
  splitStatement,
} from '../src/brand/itiraf/neverText';
import { itirafTheme } from '../src/themes/itiraf';
import { songieTheme } from '../src/themes/songie';

describe('Ben Hiç copy (games/never/client/strings.ts)', () => {
  it('round, progress and skip labels', () => {
    expect(roundLabel(5, 20)).toBe('Ben Hiç · Tur 5/20');
    expect(roundLabel(3, null)).toBe('Ben Hiç · Tur 3');
    expect(answeredLabel(4, 6)).toBe('4/6 kişi cevapladı');
    expect(skipLabel(1, 4)).toBe('Bu cümleyi atla (1/4)');
    expect(skipLabel(0, 4)).toBe('Bu cümleyi atla');
  });
  it('percent rounds and guards zero', () => {
    expect(percent(4, 6)).toBe(67);
    expect(percent(0, 0)).toBe(0);
  });
  it('reveal headline branches', () => {
    expect(revealHeadline(0, 0)).toBe('Kimse cevap vermedi.');
    expect(revealHeadline(0, 5)).toBe('Kimse yapmamış. Temiz bir grup.');
    expect(revealHeadline(5, 5)).toBe('Herkes yapmış.');
    expect(revealHeadline(3, 6)).toBe('6 kişiden 3 kişi yaptı');
  });
  it('statement split and name joins', () => {
    expect(splitStatement('Ben hiç kopya çekmedim.')).toBe('kopya çekmedim.');
    expect(joinNames(['Ece'])).toBe('Ece');
    expect(joinNames(['Ece', 'Mert', 'Selin'])).toBe('Ece, Mert ve Selin');
    expect(eliminatedLabel(['Selin'])).toBe('Selin elendi.');
  });
});

describe('itirafTheme', () => {
  it('shares the brand tokens and has its own copy', () => {
    expect(itirafTheme.id).toBe('itiraf');
    expect(itirafTheme.name).toBe('İtiraf Köşesi');
    expect(itirafTheme.colors).toEqual(songieTheme.colors);
    expect(itirafTheme.cta).toBe('Arkadaşlarınla en dürüst gece!');
    expect(itirafTheme.stores).toBe(songieTheme.stores);
  });
});
