import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import { CATEGORY_IDS, cleanPromptText, customPromptSchema, type MostLikelyView } from '../shared/index.js';
import { mostLikelyServer } from './index.js';
import { PromptPool } from './prompts.js';

const TEST_DIR = path.join(import.meta.dirname, 'test-content');
const game = (db = new Database(':memory:')) => mostLikelyServer({ db, contentDir: TEST_DIR, timing: { podiumMs: 5000, watchMs: 2000 } });

async function setup(players: string[], settings: Record<string, unknown> = {}) {
  const h = createHarness<MostLikelyView>(game(), { players, settings: { categories: ['genel'], seconds: 0, ...settings } });
  await h.start();
  return h;
}

const cur = (h: { view(id: string): MostLikelyView }, id = 'ali') => {
  const v = h.view(id);
  return { round: v.round, promptId: v.prompt.id };
};

describe('most-likely: oylama', () => {
  it('herkes oy verince sonuçlar açılır, seçim değiştirilebilir', async () => {
    const h = await setup(['ali', 'ayse', 'cem']);
    expect(h.view('ali')).toMatchObject({ phase: 'vote', round: 1, totalRounds: 10, myVote: null });
    expect(await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' })).toMatchObject({ ok: true });
    // Fikrini değiştir
    expect(await h.act('ali', { type: 'vote', ...cur(h), target: 'ayse' })).toMatchObject({ ok: true });
    expect(h.view('ali').myVote).toBe('ayse');
    expect(h.view('cem').voted).toEqual(['ali']);
    expect(h.view('cem').myVote).toBeNull();
    expect(h.view('cem').waitingFor.sort()).toEqual(['ayse', 'cem']);
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    expect(h.view('ali').phase).toBe('vote');
    await h.act('cem', { type: 'vote', ...cur(h), target: 'ayse' });
    const v = h.view('ali');
    expect(v.phase).toBe('reveal');
    expect(v.result).toMatchObject({ winners: ['ayse'], total: 3, counts: [{ id: 'ayse', votes: 2 }, { id: 'cem', votes: 1 }] });
    expect(v.history).toHaveLength(1);
    expect(v.history[0]).toMatchObject({ winners: ['ayse'], votes: 2 });
  });

  it('kendine oy kuralı ayara uyar', async () => {
    const h = await setup(['ali', 'ayse', 'cem']);
    expect(await h.act('ali', { type: 'vote', ...cur(h), target: 'ali' })).toMatchObject({ ok: false, error: expect.stringContaining('kendine') });
    const h2 = await setup(['ali', 'ayse', 'cem'], { selfVote: true });
    expect(await h2.act('ali', { type: 'vote', ...cur(h2), target: 'ali' })).toMatchObject({ ok: true });
  });

  it('odada olmayan birine oy verilemez, eski tura ait hamle yutulur', async () => {
    const h = await setup(['ali', 'ayse', 'cem']);
    expect(await h.act('ali', { type: 'vote', ...cur(h), target: 'yok' })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'vote', round: 1, promptId: 'baska', target: 'cem' })).toMatchObject({ ok: true, stale: true });
    expect(h.view('ali').myVote).toBeNull();
    expect(await h.act('zeki', { type: 'vote', ...cur(h), target: 'cem' })).toMatchObject({ ok: false });
  });

  it('beraberlikte hepsi unvan alır', async () => {
    const h = await setup(['ali', 'ayse', 'cem', 'deniz']);
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('deniz', { type: 'vote', ...cur(h), target: 'ali' });
    expect(h.view('ali').result!.winners).toEqual(['cem']);
    await h.act('ali', { type: 'next', round: 1 });
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('deniz', { type: 'vote', ...cur(h), target: 'ali' });
    expect(h.view('ali').result!.winners).toEqual(['cem']);
    await h.act('ali', { type: 'next', round: 2 });
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('deniz', { type: 'vote', ...cur(h), target: 'cem' });
    const v = h.view('ayse');
    expect(v.result!.winners.sort()).toEqual(['cem', 'deniz']);
    expect(v.history[2]!.winners.sort()).toEqual(['cem', 'deniz']);
  });
});

describe('most-likely: gizlilik', () => {
  it('isimsiz modda kim kime verdi hiçbir görünümde yok', async () => {
    const h = await setup(['ali', 'ayse', 'cem', 'deniz']);
    await h.act('ali', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'ayse' });
    await h.act('deniz', { type: 'vote', ...cur(h), target: 'cem' });
    expect(h.view('cem').phase).toBe('reveal');
    for (const id of ['ali', 'ayse', 'cem', 'deniz']) {
      const seen = h.seen(id);
      expect(seen).not.toContain('"voter"');
      expect(seen).not.toContain('"ballots":[');
      // Başkasının oyu kendi görünümüne hiç girmedi
      const views = JSON.parse(seen) as MostLikelyView[];
      const own = { ali: 'deniz', ayse: 'cem', cem: 'ayse', deniz: 'cem' }[id];
      for (const v of views) expect(v.myVote === null || v.myVote === own).toBe(true);
    }
    expect(h.view('cem').result!.ballots).toBeNull();
  });

  it('açık oylarda açıklamada kim kime verdi gösterilir, öncesinde gösterilmez', async () => {
    const h = await setup(['ali', 'ayse', 'cem'], { anonymous: false });
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    expect(h.seen('cem')).not.toContain('"voter"');
    await h.act('cem', { type: 'vote', ...cur(h), target: 'ali' });
    expect(h.view('cem').result!.ballots).toEqual(
      expect.arrayContaining([
        { voter: 'ali', target: 'cem' },
        { voter: 'ayse', target: 'cem' },
        { voter: 'cem', target: 'ali' },
      ]),
    );
  });
});

describe('most-likely: zaman ve bağlantı', () => {
  it('süre dolunca oy vermeyenler beklenmeden açılır', async () => {
    const h = await setup(['ali', 'ayse', 'cem'], { seconds: 15 });
    const v = h.view('ali');
    expect(v.endsAt - v.serverNow).toBe(15_000);
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    h.advance(14_000);
    expect(h.view('ali').phase).toBe('vote');
    h.advance(1_000);
    expect(h.view('ali')).toMatchObject({ phase: 'reveal', result: { winners: ['cem'], total: 1 } });
  });

  it('süre dolunca hiç oy yoksa unvan verilmez', async () => {
    const h = await setup(['ali', 'ayse', 'cem'], { seconds: 30 });
    h.advance(30_000);
    expect(h.view('ali')).toMatchObject({ phase: 'reveal', result: { winners: [], total: 0 }, history: [] });
  });

  it('bağlantısı kopan oyuncu beklenmez', async () => {
    const h = await setup(['ali', 'ayse', 'cem', 'deniz']);
    h.setConnected('deniz', false);
    expect(h.view('ali').waitingFor).not.toContain('deniz');
    await h.act('ali', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'ali' });
    // Kopan oyuncu hâlâ oy alabilir
    expect(h.view('ali')).toMatchObject({ phase: 'reveal', result: { winners: ['deniz'] } });
  });

  it('herkes oy verdikten sonra son kişi koparsa kısa süre içinde açılır', async () => {
    const h = await setup(['ali', 'ayse', 'cem']);
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    h.setConnected('cem', false);
    h.advance(2_000);
    expect(h.view('ali').phase).toBe('reveal');
  });

  it('odadan ayrılana verilen oylar düşer; kalanlar bitirince açılır', async () => {
    const h = await setup(['ali', 'ayse', 'cem', 'deniz']);
    await h.act('ali', { type: 'vote', ...cur(h), target: 'deniz' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'ayse' });
    h.leave('deniz');
    expect(h.view('ali')).toMatchObject({ phase: 'vote', myVote: null, waitingFor: ['ali'] });
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    expect(h.view('ali').result!.winners).toEqual(['cem']);
  });

  it('oda sahibi soruyu atlayabilir ve beklemeden açabilir; diğerleri yapamaz', async () => {
    const h = await setup(['ali', 'ayse', 'cem']);
    const first = h.view('ali').prompt.id;
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    expect(await h.act('ayse', { type: 'skip', ...cur(h) })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'skip', ...cur(h) })).toMatchObject({ ok: true });
    const v = h.view('ali');
    expect(v.prompt.id).not.toBe(first);
    expect(v.round).toBe(1);
    expect(v.voted).toEqual([]);
    expect(await h.act('ali', { type: 'reveal', ...cur(h) })).toMatchObject({ ok: false });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    expect(await h.act('cem', { type: 'reveal', ...cur(h) })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'reveal', ...cur(h) })).toMatchObject({ ok: true });
    expect(h.view('ali').phase).toBe('reveal');
    expect(await h.act('ayse', { type: 'next', round: 1 })).toMatchObject({ ok: false });
  });
});

describe('most-likely: tahmin modu', () => {
  it('kazananı doğru tahmin eden +1 alır; tahmin de beklenir', async () => {
    const h = await setup(['ali', 'ayse', 'cem'], { predict: true });
    await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ali', { type: 'guess', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'guess', ...cur(h), target: 'ali' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'ali' });
    expect(h.view('ali').phase).toBe('vote');
    expect(h.view('ali').waitingFor).toEqual(['cem']);
    await h.act('cem', { type: 'guess', ...cur(h), target: 'cem' });
    const v = h.view('ali');
    expect(v.phase).toBe('reveal');
    expect(v.result!.correctGuessers!.sort()).toEqual(['ali', 'cem']);
    expect(v.guessScores).toEqual({ ali: 1, cem: 1 });
  });

  it('tahmin modu kapalıyken tahmin reddedilir', async () => {
    const h = await setup(['ali', 'ayse', 'cem']);
    expect(await h.act('ali', { type: 'guess', ...cur(h), target: 'cem' })).toMatchObject({ ok: false });
  });
});

describe('most-likely: oyun sonu', () => {
  it('tur sayısı dolunca podyum ve unvanlarla sonuç', async () => {
    const h = await setup(['ali', 'ayse', 'cem'], { rounds: 10 });
    h.changeSettings({ rounds: 0 });
    expect(h.view('ali').totalRounds).toBeNull();
    h.changeSettings({ rounds: 10 });
    for (let r = 1; r <= 10; r++) {
      await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
      await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
      await h.act('cem', { type: 'vote', ...cur(h), target: 'ali' });
      expect(h.view('ali').phase).toBe('reveal');
      await h.act('ali', { type: 'next', round: r });
    }
    expect(h.view('ali').phase).toBe('podium');
    expect(h.finished).toBeNull();
    h.advance(5000);
    const cem = h.finished!.find((r) => r.playerId === 'cem')!;
    expect(cem.score).toBe(10);
    expect(cem.meta).toMatchObject({ titleCount: 10, guessPoints: 0 });
    expect(h.finished!.find((r) => r.playerId === 'ali')!.score).toBe(0);
  });

  it('oda sahibi oyunu bitirince podyum, sonra ctx.finish', async () => {
    const h = await setup(['ali', 'ayse', 'cem'], { predict: true });
    await h.act('ali', { type: 'vote', ...cur(h), target: 'ayse' });
    await h.act('ali', { type: 'guess', ...cur(h), target: 'ayse' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
    await h.act('ayse', { type: 'guess', ...cur(h), target: 'cem' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'ayse' });
    await h.act('cem', { type: 'guess', ...cur(h), target: 'ayse' });
    await h.act('ali', { type: 'next', round: 1 });
    h.end();
    expect(h.view('ali').phase).toBe('podium');
    expect(await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' })).toMatchObject({ ok: true, stale: true });
    h.advance(5000);
    expect(h.finished).toHaveLength(3);
    const ayse = h.finished!.find((r) => r.playerId === 'ayse')!;
    expect(ayse.meta).toMatchObject({ titleCount: 1, guessPoints: 0 });
    expect(h.finished!.find((r) => r.playerId === 'ali')!.score).toBe(1);
  });

  it('oyuna sonradan katılan oy verebilir ve oy alabilir', async () => {
    const h = await setup(['ali', 'ayse', 'cem']);
    h.join('zeki');
    expect(h.view('zeki').people.map((p) => p.id)).toContain('zeki');
    await h.act('ali', { type: 'vote', ...cur(h), target: 'zeki' });
    await h.act('ayse', { type: 'vote', ...cur(h), target: 'zeki' });
    await h.act('cem', { type: 'vote', ...cur(h), target: 'zeki' });
    expect(h.view('ali').phase).toBe('vote');
    await h.act('zeki', { type: 'vote', ...cur(h), target: 'ali' });
    expect(h.view('ali').result!.winners).toEqual(['zeki']);
  });

  it('3 kişiden az bağlıyken başlamaz', async () => {
    const h = createHarness(game(), { players: ['ali', 'ayse'], settings: { categories: ['genel'] } });
    await expect(h.start()).rejects.toThrow();
  });
});

describe('most-likely: içerik', () => {
  it('her kategoride soru var, toplam en az 220', () => {
    const pool = new PromptPool(new Database(':memory:'));
    const cats = pool.categories();
    for (const id of CATEGORY_IDS) expect(cats.find((c) => c.id === id)?.count ?? 0).toBeGreaterThanOrEqual(25);
    expect(pool.prompts([...CATEGORY_IDS]).length).toBeGreaterThanOrEqual(220);
  });

  it('eklenen soru kalıptan temizlenir ve arkadaş kategorisine girer', () => {
    expect(cleanPromptText('Aramızdaki en çok uyuyan kim?')).toBe('çok uyuyan');
    expect(cleanPromptText('en geç kalan')).toBe('geç kalan');
    expect(customPromptSchema.safeParse({ text: 'en ?' }).success).toBe(false);
    const g = game();
    g.pool.add('çok uyuyan', 'ali');
    g.pool.add('Çok uyuyan', 'ali');
    expect(g.pool.prompts(['arkadas'])).toHaveLength(1);
    expect(g.validateSettings!({ ...g.defaultSettings, categories: ['arkadas'] })).toBeNull();
    expect(game().validateSettings!({ ...g.defaultSettings, categories: ['arkadas'] })).toMatch(/soru yok/);
  });
});
