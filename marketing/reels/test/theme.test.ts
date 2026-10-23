import { describe, expect, it } from 'vitest';
import { songieTheme } from '../src/themes/songie';
import { SAFE, VIDEO } from '../src/brand/fonts';

describe('songieTheme', () => {
  it('uses the exact brand tokens', () => {
    expect(songieTheme.colors).toEqual({
      pink: '#ff7ac6', yellow: '#ffd23f', mint: '#3ee0a8', sky: '#5ab8ff',
      lilac: '#b794ff', bg: '#2a1b6e', bgDeep: '#150e38', panel: '#3a2a8c',
      ink: '#0d0828', paper: '#ffffff', cream: '#fff4c2', coral: '#ff8a5b',
    });
  });
  it('has five stage colors in order', () => {
    const c = songieTheme.colors;
    expect(songieTheme.stageColors).toHaveLength(5);
    expect(songieTheme.stageColors).toEqual([c.pink, c.yellow, c.mint, c.sky, c.lilac]);
  });
  it('has cta and stores copy', () => {
    expect(songieTheme.id).toBe('songie');
    expect(songieTheme.cta).toBe('Şarkıyı 0,1 saniyeden bil!');
    expect(songieTheme.stores).toBe("App Store ve Google Play'de ücretsiz");
  });
  it('video and safe area constants', () => {
    expect(VIDEO).toEqual({ width: 1080, height: 1920, fps: 30 });
    expect(SAFE).toEqual({ top: 250, bottom: 400, side: 60 });
  });
});
