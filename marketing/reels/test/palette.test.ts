import { describe, expect, it } from 'vitest';
import { PALETTES, scenePalette, stickerOn } from '../src/brand/palette';
import { songieTheme as t } from '../src/themes/songie';

describe('palette', () => {
  it('keeps palette 0 as the original order', () => {
    expect(scenePalette(t, 0)).toEqual([t.colors.pink, t.colors.yellow, t.colors.mint, t.colors.lilac]);
  });

  it('never repeats a color between neighboring scenes and wraps any index', () => {
    PALETTES.forEach((p) => p.slice(1).forEach((c, i) => expect(c).not.toBe(p[i])));
    expect(scenePalette(t, PALETTES.length + 3)).toEqual(scenePalette(t, 3));
    expect(scenePalette(t, -1)).toEqual(scenePalette(t, PALETTES.length - 1));
  });

  it('picks a sticker color that differs from the background', () => {
    expect(stickerOn(t, t.colors.yellow, ['yellow', 'pink'])).toBe(t.colors.pink);
    expect(stickerOn(t, t.colors.mint, ['yellow', 'pink'])).toBe(t.colors.yellow);
  });
});
