import type { AppTheme, ColorToken } from '../themes/types';

/**
 * Scene color orders (hook, game, reveal, closing). Each one keeps neighbors distinct so every ColorWipe
 * reads as a change. 0 is the original pink → yellow → mint → lilac; the rest give each song its own look.
 */
export const PALETTES: [ColorToken, ColorToken, ColorToken, ColorToken][] = [
  ['pink', 'yellow', 'mint', 'lilac'],
  ['sky', 'pink', 'yellow', 'mint'],
  ['yellow', 'lilac', 'pink', 'sky'],
  ['lilac', 'mint', 'sky', 'pink'],
  ['mint', 'sky', 'yellow', 'pink'],
  ['sky', 'yellow', 'lilac', 'mint'],
  ['yellow', 'pink', 'sky', 'lilac'],
  ['pink', 'mint', 'lilac', 'yellow'],
];

export function scenePalette(theme: AppTheme, index: number): [string, string, string, string] {
  const p = PALETTES[((index % PALETTES.length) + PALETTES.length) % PALETTES.length]!;
  return p.map((t) => theme.colors[t]) as [string, string, string, string];
}

/** First preferred token whose color differs from the scene background, so a sticker never melts into it. */
export function stickerOn(theme: AppTheme, bg: string, prefs: ColorToken[]): string {
  return theme.colors[prefs.find((t) => theme.colors[t] !== bg) ?? 'paper'];
}
