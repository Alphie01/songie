import { describe, expect, it } from 'vitest';
import { fitText } from '../src/brand/fitText';

/** Deterministic stand-in for measureText (jsdom has no layout): ~0.55em per character. */
const fake = (text: string, fontSize: number) => text.length * fontSize * 0.55;

describe('fitText', () => {
  it('fitText shrinks long answers', () => {
    const r = fitText('Sezen Aksu – Kaybolan Yıllar', 960, 120, 48, { measure: fake });
    expect(r.size).toBeLessThan(120);
    expect(r.size).toBeGreaterThanOrEqual(48);
    expect(r.lines.length).toBeLessThanOrEqual(2);
    for (const line of r.lines) expect(fake(line, r.size)).toBeLessThanOrEqual(960);
    expect(r.lines.join(' ')).toBe('Sezen Aksu – Kaybolan Yıllar');
  });

  it('keeps short answers at start size on one line', () => {
    const r = fitText('Tarkan', 960, 120, 48, { measure: fake });
    expect(r.size).toBe(120);
    expect(r.lines).toEqual(['Tarkan']);
  });

  it('never goes below minSize', () => {
    const r = fitText('Çok çok çok uzun bir şarkı adı ki hiçbir şekilde iki satıra sığmaz gerçekten', 300, 120, 48, {
      measure: fake,
    });
    expect(r.size).toBe(48);
  });
});
