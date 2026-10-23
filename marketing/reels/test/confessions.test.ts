import { describe, expect, it } from 'vitest';
import {
  canSend,
  confessionOf,
  counterBad,
  counterLabel,
  fooledCount,
  myPickLabel,
  pickedLabel,
  reactionLabel,
  revealFoot,
  timerFill,
  writeHead,
  wroteChip,
  wroteTitle,
} from '../src/brand/itiraf/confessionsText';

describe('Gizli İtiraflar copy (games/confessions/client/strings.ts)', () => {
  it('pills, counters and chips', () => {
    expect(writeHead(2, 5)).toBe('Tur 2/5 · Yaz');
    expect(writeHead(3, null)).toBe('Tur 3 · Yaz');
    expect(confessionOf(3, 6)).toBe('İtiraf 3/6');
    expect(counterLabel(45)).toBe('45/240');
    expect(pickedLabel(4, 6)).toBe('4/6 kişi seçti');
    expect(myPickLabel('Bu benim', 4, 6)).toBe('Seçimin: Bu benim. 4/6 kişi seçti.');
    expect(reactionLabel('bende', 3)).toBe('Ben de! 3');
    expect(wroteTitle(3, 6)).toBe('Yazanlar 3/6');
    expect(wroteChip('Mert', true)).toBe('Mert ✓ yazdı');
    expect(wroteChip('Ece', false)).toBe('Ece yazıyor');
  });
  it('send button and counter rules', () => {
    expect(canSend('kısa', false, false)).toBe(false);
    expect(canSend('   on harfli itiraf ', false, false)).toBe(true);
    expect(canSend('on harfli itiraf', true, false)).toBe(false);
    expect(canSend('on harfli itiraf', true, true)).toBe(true);
    expect(counterBad(0)).toBe(false);
    expect(counterBad(4)).toBe(true);
    expect(counterBad(10)).toBe(false);
  });
  it('timer fill clamps', () => {
    expect(timerFill(28, 50)).toBeCloseTo(56);
    expect(timerFill(80, 50)).toBe(100);
    expect(timerFill(5, 0)).toBe(100);
  });
  it('reveal foot branches (PlayView Foot)', () => {
    const votes = { Mert: 2, Deniz: 1, Kaan: 2, Bora: 1 };
    expect(fooledCount(votes, 'Kaan')).toBe(4);
    expect(revealFoot({ author: 'Kaan', me: 'Sen', pick: 'Mert', fooled: 4, correct: ['Deniz', 'Zeynep'] })).toEqual({
      line: 'Bilemedin. Kaan, 4 kişiyi yanılttı.',
      sub: 'Bilenler: Deniz, Zeynep',
      tone: 'light',
    });
    expect(revealFoot({ author: 'Kaan', me: 'Sen', pick: 'Kaan', fooled: 0, correct: ['Sen'] })).toEqual({
      line: 'Bildin! Kaan kimseyi yanıltamadı.',
      sub: 'Bilenler: sen',
      tone: 'hit',
    });
    expect(revealFoot({ author: 'Sen', me: 'Sen', pick: 'Mert', fooled: 3, correct: [] })).toEqual({
      line: 'Sen 3 kişiyi yanılttın.',
      sub: 'Kimse bilemedi.',
      tone: 'light',
    });
    expect(revealFoot({ author: 'Kaan', fooled: 1, correct: [] }).line).toBe('Kaan, 1 kişiyi yanılttı.');
  });
});
