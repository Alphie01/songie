import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import type { ConfessionsView } from '../shared/index.js';
import { DEFAULT_TIMING, type ConfessionsState } from './game.js';
import { confessionsServer } from './index.js';

const game = () => confessionsServer({ db: new Database(':memory:') });
const PLAYERS = ['ali', 'ayse', 'cem', 'deniz'];
const TEXT = {
  ali: 'Kahvaltıda gizlice çikolata yerim',
  ayse: 'Hâlâ ışık açık uyuyorum',
  cem: 'Ehliyet sınavından üç kez kaldım',
  deniz: 'Bitkilerime isim koyup konuşurum',
};

async function setup(settings: Record<string, unknown> = {}, players = PLAYERS) {
  const h = createHarness<ConfessionsView>(game(), { players, settings: { writeSeconds: 60, guessSeconds: 30, rounds: 3, ...settings } });
  await h.start();
  return h;
}

async function writeAll(h: Awaited<ReturnType<typeof setup>>, players = PLAYERS) {
  for (const p of players) expect(await h.act(p, { type: 'write', text: (TEXT as Record<string, string>)[p] })).toMatchObject({ ok: true });
}

const st = (h: { state: unknown }) => h.state as ConfessionsState;
const authorOfCurrent = (h: { state: unknown }) => st(h).queue[st(h).index]!.authorId;

describe('confessions', () => {
  it('ships at least 120 prompts in the required categories', () => {
    const g = game();
    const cats = g.prompts.categories();
    expect(cats.map((c) => c.id)).toEqual(expect.arrayContaining(['genel', 'cocukluk', 'okul-is', 'ask', 'utanc', 'aliskanliklar', 'cesur', 'arkadas']));
    expect(cats.reduce((n, c) => n + c.count, 0)).toBeGreaterThanOrEqual(120);
  });

  it('keeps confessions private while writing and shows only who wrote', async () => {
    const h = await setup();
    expect(h.view('ali').phase).toBe('write');
    expect(h.view('ali').topic).not.toBeNull();
    await h.act('ali', { type: 'write', text: TEXT.ali });
    expect(h.view('ali').myConfession).toBe(TEXT.ali);
    expect(h.view('ayse').myConfession).toBeNull();
    expect(h.view('ayse').written).toEqual(['ali']);
    for (const p of ['ayse', 'cem', 'deniz']) expect(h.seen(p)).not.toContain('çikolata');
  });

  it('never sends the author before the reveal and gives the author an indistinguishable screen', async () => {
    const h = await setup();
    await writeAll(h);
    expect(h.view('ali').phase).toBe('guess');
    const author = authorOfCurrent(h);
    // Seçim yapılmadan önce herkesin görünümü birebir aynı.
    const views = PLAYERS.map((p) => JSON.stringify(h.view(p)));
    expect(new Set(views).size).toBe(1);
    expect(h.view(author).current!.candidates).toEqual(PLAYERS);
    // Yazar da seçim yapar; görünümünün yapısı değişmez.
    const other = PLAYERS.find((p) => p !== author)!;
    await h.act(author, { type: 'guess', confessionId: h.view(author).current!.id, targetId: other });
    await h.act(other, { type: 'guess', confessionId: h.view(other).current!.id, targetId: author });
    const keys = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, typeof val[k] === 'object' ? val[k] : typeof val[k]])) : val));
    expect(keys(h.view(author))).toBe(keys(h.view(other)));
    expect(h.view(other).picked).toEqual(expect.arrayContaining([author, other]));
    // Açıklamaya kadar hiçbir oyuncuya yazar bilgisi gitmedi.
    for (const p of PLAYERS) expect(h.seen(p)).not.toContain('"authorId"');
  });

  it('scores correct guesses and fooled players, ignoring the author’s own pick', async () => {
    const h = await setup();
    await writeAll(h);
    const author = authorOfCurrent(h);
    const [b, c, d] = PLAYERS.filter((p) => p !== author) as [string, string, string];
    const id = h.view(b).current!.id;
    await h.act(author, { type: 'guess', confessionId: id, targetId: b });
    await h.act(b, { type: 'guess', confessionId: id, targetId: author });
    await h.act(c, { type: 'guess', confessionId: id, targetId: d });
    expect(h.view(b).phase).toBe('guess');
    await h.act(d, { type: 'guess', confessionId: id, targetId: author });
    const v = h.view(b);
    expect(v.phase).toBe('reveal');
    expect(v.reveal!.authorId).toBe(author);
    expect(v.reveal!.correct.sort()).toEqual([b, d].sort());
    expect(v.reveal!.picks!.some((p) => p.playerId === author)).toBe(false);
    expect(v.reveal!.tally[author]).toBe(2);
    expect(v.reveal!.tally[b]).toBe(0);
    expect(v.stats[b]).toMatchObject({ score: 1, correct: 1 });
    expect(v.stats[d]).toMatchObject({ score: 1, correct: 1 });
    expect(v.stats[c]).toMatchObject({ score: 0 });
    expect(v.stats[author]).toMatchObject({ score: 1, fooled: 1 });
    // Eski hamle yutulur.
    expect(await h.act(c, { type: 'guess', confessionId: id, targetId: author })).toMatchObject({ ok: true, stale: true });
    h.advance(DEFAULT_TIMING.revealMs);
    expect(h.view(b)).toMatchObject({ phase: 'guess', index: 2 });
  });

  it('closes writing and guessing when time runs out', async () => {
    const h = await setup();
    await h.act('ali', { type: 'write', text: TEXT.ali });
    await h.act('ayse', { type: 'write', text: TEXT.ayse });
    h.advance(60_000);
    expect(h.view('cem')).toMatchObject({ phase: 'guess', count: 2, written: ['ali', 'ayse'] });
    expect(h.view('cem').current!.candidates).toEqual(['ali', 'ayse']);
    h.advance(30_000);
    expect(h.view('cem').phase).toBe('reveal');
    h.advance(DEFAULT_TIMING.revealMs + 30_000);
    expect(h.view('cem').phase).toBe('reveal');
    h.advance(DEFAULT_TIMING.revealMs);
    expect(h.view('cem').phase).toBe('summary');
    expect(h.view('cem').recap).toHaveLength(2);
    h.advance(DEFAULT_TIMING.summaryMs);
    expect(h.view('cem')).toMatchObject({ phase: 'write', round: 2 });
  });

  it('untimed writing waits for everyone; the host can close it', async () => {
    const h = await setup({ writeSeconds: 0 });
    await h.act('ali', { type: 'write', text: TEXT.ali });
    h.advance(10 * 60_000);
    expect(h.view('ali').phase).toBe('write');
    expect(await h.act('ayse', { type: 'next' })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'next' })).toMatchObject({ ok: true });
    expect(h.view('ali').phase).toBe('guess');
  });

  it('hidden-author mode never reveals the author and gives no points', async () => {
    const h = await setup({ hiddenAuthor: true, rounds: 1 });
    await writeAll(h);
    for (let i = 0; i < 4; i++) {
      const id = h.view('ali').current!.id;
      for (const p of PLAYERS) await h.act(p, { type: 'guess', confessionId: id, targetId: 'ali' });
      const r = h.view('ayse').reveal!;
      expect(r).toMatchObject({ authorId: null, picks: null, correct: [] });
      expect(Object.values(r.tally).reduce((a, b) => a + b, 0)).toBe(3);
      h.advance(DEFAULT_TIMING.revealMs);
    }
    expect(h.view('ali').phase).toBe('summary');
    expect(h.view('ali').recap!.every((c) => c.authorId === null)).toBe(true);
    for (const p of PLAYERS) {
      expect(h.seen(p)).not.toMatch(/"authorId":"/);
      expect(h.view(p).stats[p]!.score).toBe(0);
    }
    h.advance(DEFAULT_TIMING.summaryMs);
    expect(h.view('ali').phase).toBe('podium');
  });

  it('lets only the host hide a confession; hidden text is never sent again', async () => {
    const h = await setup();
    await writeAll(h);
    const cur = h.view('ali').current!;
    const author = authorOfCurrent(h);
    const text = cur.text!;
    expect(await h.act('ayse', { type: 'hide', confessionId: cur.id })).toMatchObject({ ok: false });
    const before = h.seen('cem').length;
    expect(await h.act('ali', { type: 'hide', confessionId: cur.id })).toMatchObject({ ok: true });
    expect(h.view('cem')).toMatchObject({ phase: 'guess', index: 2 });
    expect(h.seen('cem').slice(before)).not.toContain(text);
    expect(h.view('cem').stats[author]!.score).toBe(0);
    // Açıklamadan sonra gizlenen itiraf da özetten çıkar.
    for (let i = 0; i < 3; i++) {
      h.advance(30_000);
      if (i === 0) {
        const revealed = h.view('cem').current!;
        await h.act('ali', { type: 'hide', confessionId: revealed.id });
        expect(h.view('cem').current).toMatchObject({ text: null, hidden: true });
      }
      h.advance(DEFAULT_TIMING.revealMs);
    }
    expect(h.view('cem').phase).toBe('summary');
    expect(h.view('cem').recap).toHaveLength(2);
    expect(JSON.stringify(h.view('cem').recap)).not.toContain(text);
  });

  it('rejects empty, short, long, spammy and duplicate confessions', async () => {
    const h = await setup();
    expect(await h.act('ali', { type: 'write', text: '   ' })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'write', text: 'kısa' })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'write', text: 'a'.repeat(241) })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'write', text: 'aaaaaaaaaaaaaa' })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'write', text: h.view('ali').topic!.text })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'write', text: TEXT.ali })).toMatchObject({ ok: true });
    expect(await h.act('ayse', { type: 'write', text: TEXT.ali.toUpperCase() + '!' })).toMatchObject({ ok: false });
    // Kendi itirafını değiştirebilir.
    expect(await h.act('ali', { type: 'write', text: TEXT.ali + ' her sabah' })).toMatchObject({ ok: true });
    expect(h.view('ali').myConfession).toBe(TEXT.ali + ' her sabah');
  });

  it('counts reactions per confession and toggles them', async () => {
    const h = await setup();
    await writeAll(h);
    const id = h.view('ali').current!.id;
    await h.act('ali', { type: 'react', confessionId: id, reaction: 'efsane' });
    await h.act('ayse', { type: 'react', confessionId: id, reaction: 'efsane' });
    await h.act('cem', { type: 'react', confessionId: id, reaction: 'bende' });
    expect(h.view('deniz').current!.reactions).toMatchObject({ efsane: 2, bende: 1, yok: 0 });
    expect(h.view('ali').current!.myReactions).toEqual(['efsane']);
    await h.act('ali', { type: 'react', confessionId: id, reaction: 'efsane' });
    expect(h.view('deniz').current!.reactions.efsane).toBe(1);
  });

  it('does not get stuck when a player disconnects', async () => {
    const h = await setup({ writeSeconds: 0 });
    await writeAll(h, ['ali', 'ayse', 'cem']);
    expect(h.view('ali').phase).toBe('write');
    h.setConnected('deniz', false);
    h.advance(DEFAULT_TIMING.tickMs);
    expect(h.view('ali')).toMatchObject({ phase: 'guess', count: 3 });
    const id = h.view('ali').current!.id;
    for (const p of ['ali', 'ayse']) await h.act(p, { type: 'guess', confessionId: id, targetId: 'cem' });
    h.setConnected('cem', false);
    h.advance(DEFAULT_TIMING.tickMs);
    expect(h.view('ali').phase).toBe('reveal');
  });

  it('moves on when a player leaves, and new players can join in', async () => {
    const h = await setup();
    await writeAll(h, ['ali', 'ayse', 'cem']);
    h.leave('deniz');
    expect(h.view('ali').phase).toBe('guess');
    h.join('ece');
    expect(h.view('ece').stats.ece).toMatchObject({ score: 0 });
    const id = h.view('ece').current!.id;
    expect(await h.act('ece', { type: 'guess', confessionId: id, targetId: 'deniz' })).toMatchObject({ ok: false });
    expect(await h.act('ece', { type: 'guess', confessionId: id, targetId: 'ali' })).toMatchObject({ ok: true });
  });

  it('plays all rounds to the podium and finishes', async () => {
    const h = await setup({ rounds: 3 });
    for (let r = 0; r < 3; r++) {
      await writeAll(h);
      for (let i = 0; i < 4; i++) {
        const id = h.view('ali').current!.id;
        const author = authorOfCurrent(h);
        for (const p of PLAYERS) await h.act(p, { type: 'guess', confessionId: id, targetId: p === 'ali' ? author : 'ali' });
        await h.act('ali', { type: 'next' });
      }
      expect(h.view('ali').phase).toBe('summary');
      await h.act('ali', { type: 'next' });
    }
    const v = h.view('ali');
    expect(v.phase).toBe('podium');
    expect(v.podium!.detective!.playerId).toBe('ali');
    expect(v.podium!.confessions).toBe(12);
    h.advance(DEFAULT_TIMING.podiumMs);
    expect(h.finished).not.toBeNull();
    expect(h.finished!.find((r) => r.playerId === 'ali')!.score).toBe(v.stats.ali!.score);
  });

  it('host can end the game early with a podium', async () => {
    const h = await setup({ rounds: 0 });
    await writeAll(h);
    h.end();
    expect(h.view('cem')).toMatchObject({ phase: 'podium', current: null, reveal: null });
    expect(h.finished).toBeNull();
    h.advance(DEFAULT_TIMING.podiumMs);
    expect(h.finished).toHaveLength(4);
  });

  it('adds custom prompts and rejects duplicates', () => {
    const g = game();
    expect(g.prompts.add('Bu odadaki birine söylemediğin bir şey var mı?', 'u1')).toBe(true);
    expect(g.prompts.add('bu odadaki birine söylemediğin bir şey var mı', 'u2')).toBe(false);
    expect(g.prompts.add('En utanç verici anın', 'u2')).toBe(false);
    expect(g.prompts.topics(['arkadas'])).toHaveLength(1);
  });
});
