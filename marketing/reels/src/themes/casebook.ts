import type { AppTheme } from './types';
import { songieTheme } from './songie';

/**
 * Casebook (apps/casebook/lib/style.dart K.*), pushed darker for the reels: a noir desk instead of the bright
 * stages. Paper is the case-folder manila, coral is the GİZLİ stamp red, mint the TEMİZ stamp green.
 */
const colors = {
  ...songieTheme.colors,
  bg: '#0d0b10',
  bgDeep: '#050407',
  panel: '#1b1714',
  ink: '#120c08',
  paper: '#f3e6c4',
  cream: '#e4d6ae',
  coral: '#c0392b',
  mint: '#1e7a5a',
  yellow: '#ffd23f',
};

export const casebookTheme: AppTheme = {
  id: 'casebook',
  name: 'Casebook',
  colors,
  stageColors: [colors.bg, colors.panel],
  cta: 'Ekibini topla. Dosyayı aç.',
  stores: songieTheme.stores,
};

/** Noir extras with no token: lamp glow, the brown ink of the folder, the white of police paper. */
export const NOIR = {
  lamp: '#3a2a12',
  brown: '#2b2116',
  doc: '#f4f3ee',
  docInk: '#1c1a17',
  string: '#b3261e',
  dim: 'rgba(243,230,196,0.62)',
} as const;
