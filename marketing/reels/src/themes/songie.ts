import type { AppTheme } from './types';

const colors = {
  pink: '#ff7ac6',
  yellow: '#ffd23f',
  mint: '#3ee0a8',
  sky: '#5ab8ff',
  lilac: '#b794ff',
  bg: '#2a1b6e',
  bgDeep: '#150e38',
  panel: '#3a2a8c',
  ink: '#0d0828',
  paper: '#ffffff',
  cream: '#fff4c2',
  coral: '#ff8a5b',
};

export const songieTheme: AppTheme = {
  id: 'songie',
  name: 'Songie',
  colors,
  stageColors: [colors.pink, colors.yellow, colors.mint, colors.sky, colors.lilac],
  cta: 'Şarkıyı 0,1 saniyeden bil!',
  stores: "App Store ve Google Play'de ücretsiz",
};
