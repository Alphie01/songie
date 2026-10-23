import { measureText } from '@remotion/layout-utils';
import { FONT_DISPLAY } from './fonts';

/** Width in px of `text` at `fontSize`. */
export type Measure = (text: string, fontSize: number) => number;

export type FitOptions = {
  /** Most lines the text may wrap to before it has to shrink. */
  maxLines?: number;
  /** Size step when shrinking. */
  step?: number;
  /** Injected for tests (jsdom has no layout); defaults to Baloo 2 ExtraBold via measureText. */
  measure?: Measure;
};

/**
 * Baloo 2 ExtraBold, measured in the browser. measureText caches by font name, so only call
 * this after loadBrandFonts() has resolved (see useBrandFonts), or the fallback font's widths stick.
 */
export const measureDisplay: Measure = (text, fontSize) =>
  measureText({ text, fontFamily: FONT_DISPLAY, fontWeight: '800', fontSize, validateFontIsLoaded: true }).width;

/** Greedy word wrap; a word wider than maxWidth stays on its own line. */
function wrap(words: string[], maxWidth: number, size: number, measure: Measure): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Largest font size (from startSize down to minSize) at which `text` wraps into at most
 * `maxLines` lines that each fit `maxWidth`. If nothing fits, returns minSize with its wrap.
 */
export function fitText(
  text: string,
  maxWidth: number,
  startSize: number,
  minSize = 48,
  { maxLines = 2, step = 2, measure = measureDisplay }: FitOptions = {},
): { size: number; lines: string[] } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  for (let size = startSize; size > minSize; size -= step) {
    const lines = wrap(words, maxWidth, size, measure);
    if (lines.length <= maxLines && lines.every((l) => measure(l, size) <= maxWidth)) return { size, lines };
  }
  return { size: minSize, lines: wrap(words, maxWidth, minSize, measure) };
}
