import { describe, expect, it } from 'vitest';
import { foldText, normalizeArtist, normalizeTitle } from './text.js';

describe('foldText', () => {
  it('folds Turkish letters', () => {
    expect(foldText('Şımarık')).toBe('simarik');
    expect(foldText('İSTANBUL ağlıyor')).toBe('istanbul agliyor');
    expect(foldText('Gülümse, Çiğdem!')).toBe('gulumse cigdem');
  });
  it('strips other diacritics and apostrophes', () => {
    expect(foldText("Beyoncé's Halo")).toBe('beyonces halo');
  });
});

describe('normalizeTitle', () => {
  it('drops featuring, brackets and versions', () => {
    expect(normalizeTitle('Dudu (feat. X)')).toBe('dudu');
    expect(normalizeTitle('Bohemian Rhapsody - Remastered 2011')).toBe('bohemian rhapsody');
    expect(normalizeTitle('Firuze - Live')).toBe('firuze');
    expect(normalizeTitle('Yalan [Akustik]')).toBe('yalan');
    expect(normalizeTitle('Hello ft. Someone')).toBe('hello');
  });
  it('keeps meaningful hyphenated titles', () => {
    expect(normalizeTitle('Kuzu Kuzu')).toBe('kuzu kuzu');
  });
});

describe('normalizeArtist', () => {
  it('keeps the main artist', () => {
    expect(normalizeArtist('Tarkan')).toBe('tarkan');
    expect(normalizeArtist('Sezen Aksu & Tarkan')).toBe('sezen aksu');
    expect(normalizeArtist('Ezhel, UZI')).toBe('ezhel');
  });
});
