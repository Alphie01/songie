import { describe, expect, it } from 'vitest';
import { I5_META, ML, i5Schema, voteRoom, votedAt } from '../src/reels/itiraf/I5MostLikely';
import { I6_META, flirtResults, i6Schema } from '../src/reels/itiraf/I6MostLikelyFlirt';
import { crew, dative } from '../src/reels/friends';

describe('Aramızdaki En reels', () => {
  it('both run ~17,5 s with valid defaults', () => {
    for (const [m, s] of [[I5_META, i5Schema], [I6_META, i6Schema]] as const) {
      expect(m.durationInFrames / m.fps).toBeLessThanOrEqual(18);
      expect(s.safeParse(m.defaultProps).success).toBe(true);
    }
  });

  it('holds every beat long enough to read', () => {
    expect(ML.wipe1 - ML.ask).toBeGreaterThanOrEqual(45);
    expect(ML.wipe2 - ML.vote - ML.revealPress).toBeGreaterThanOrEqual(30);
    expect(ML.wipe3 - ML.result - ML.you).toBeGreaterThanOrEqual(45);
  });

  it('ticks voters in until all six voted, you included after your tap', () => {
    const c = crew('Kaan');
    expect(votedAt(0, c)).toEqual([]);
    expect(votedAt(ML.tap + 4, c)).toContain('Sen');
    expect(new Set(votedAt(999, c))).toEqual(new Set(voteRoom(c).players));
  });

  it('flirt results: your date wins and the one vote you got is theirs', () => {
    const r = flirtResults('Zeynep');
    expect(Math.max(...Object.values(r.votes))).toBe(r.votes.Zeynep);
    expect(r.ballots.filter((b) => b.target === 'Sen')).toEqual([{ voter: 'Zeynep', target: 'Sen' }]);
    expect(r.ballots.reduce((n, b) => ({ ...n, [b.target]: (n[b.target] ?? 0) + 1 }), {} as Record<string, number>)).toEqual(r.votes);
  });

  it('builds Turkish datives', () => {
    expect(dative('Zeynep')).toBe("Zeynep'e");
    expect(dative('Can')).toBe("Can'a");
    expect(dative('Ece')).toBe("Ece'ye");
    expect(dative('Kaan')).toBe("Kaan'a");
    expect(dative('Emre')).toBe("Emre'ye");
  });
});
