import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { C1_META, CB, c1Schema, twistAt } from '../src/reels/casebook/C1Case';
import { CASE_TWISTS, boardMarks, camStamp, caseProps, firstSentence } from '../tools/casebook';

const dir = path.resolve(__dirname, '../../../games/detective/server/cases');
const published = JSON.parse(fs.readFileSync(path.join(dir, 'published.json'), 'utf8')) as string[];

describe('Casebook vaka reel', () => {
  it('runs ~17,8 s with valid defaults and readable beats', () => {
    expect(C1_META.durationInFrames / C1_META.fps).toBeLessThanOrEqual(18);
    expect(c1Schema.safeParse(C1_META.defaultProps).success).toBe(true);
    expect(CB.evidence - CB.scene).toBeGreaterThanOrEqual(150);
    expect(CB.cta - CB.board).toBeGreaterThanOrEqual(110);
    // the twist always gets at least 1,8 s on screen
    expect(CB.evidence - CB.scene - twistAt(6)).toBeGreaterThanOrEqual(55);
  });

  it('every published case builds valid props and never marks the culprit', () => {
    for (const slug of published) {
      const p = caseProps(path.join(dir, slug), slug, { music: 'x.mp3', musicFrom: 0, solver: 'Ece', narrationSec: 2 });
      expect(c1Schema.safeParse(p).success, slug).toBe(true);
      expect(CASE_TWISTS[slug], slug).toBeTruthy();
      const d = JSON.parse(fs.readFileSync(path.join(dir, slug, 'case.json'), 'utf8')) as {
        characters: { id: string; name: string }[];
        solution: Record<string, string[]>;
      };
      const guilty = [...(d.solution.who ?? []), ...(d.solution.planner ?? [])].map((id) => d.characters.find((c) => c.id === id)?.name);
      for (const m of p.marks) expect(guilty, slug).not.toContain(p.suspects[m.i]!.name);
      for (const f of [p.cover, p.act.image, p.photo.image, ...p.suspects.map((s) => s.image)]) {
        expect(fs.existsSync(path.join(dir, '..', f)), f).toBe(true);
      }
    }
  });

  it('first sentence skips dates, ordinals and titles', () => {
    expect(firstSentence('16.11.2025 günü saat 05:43’te ihbar geldi. Ekip çıktı.')).toBe('16.11.2025 günü saat 05:43’te ihbar geldi.');
    expect(firstSentence('Yol 34. kilometrede kapandı. Sonra.')).toBe('Yol 34. kilometrede kapandı.');
    expect(firstSentence('Dr. Cemal geldi. Sonra.')).toBe('Dr. Cemal geldi.');
    expect(camStamp('2026-09-11T21:29')).toBe('11.09.2026 21:29');
  });

  it('board marks: two suspects, one clear, all different, none guilty', () => {
    const m = boardMarks(['a', 'b', 'c', 'd', 'e', 'f'], ['c'], 4);
    expect(new Set(m.map((x) => x.i)).size).toBe(3);
    expect(m.map((x) => x.i)).not.toContain(2);
    expect(m.filter((x) => x.mark === 'suspect')).toHaveLength(2);
  });
});
