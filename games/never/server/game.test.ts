import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import type { NeverView } from '../shared/index.js';
import { neverServer } from './index.js';

const TEST_DIR = path.join(import.meta.dirname, 'test-content');
const game = (opts: { real?: boolean } = {}) =>
  neverServer({
    db: new Database(':memory:'),
    contentDir: opts.real ? undefined : TEST_DIR,
    timing: { podiumMs: 5000, finalRevealMs: 3000 },
  });

const base = { categories: ['genel'], seconds: 0, rounds: 10, lives: 0, anonymous: false };

function setup(players: string[], settings: Record<string, unknown> = {}) {
  return createHarness<NeverView>(game(), { players, settings: { ...base, ...settings } });
}

type H = ReturnType<typeof setup>;
const sid = (h: H, id = 'ali') => h.view(id).statement!.id;

async function answerAll(h: H, answers: Record<string, 'did' | 'didNot'>) {
  for (const [id, answer] of Object.entries(answers)) {
    const st = h.view(id).statement!.id;
    expect(await h.act(id, { type: 'answer', statementId: st, answer })).toMatchObject({ ok: true });
  }
}

describe('never: tam akış', () => {
  it('cevaplar herkes cevaplayınca açılır, tur geçer, can biter, sonuç kaydedilir', async () => {
    const h = setup(['ali', 'ayse', 'cem'], { lives: 3, rounds: 2 });
    await h.start();
    const v = h.view('ali');
    expect(v).toMatchObject({ phase: 'question', round: 1, totalRounds: 2, maxLives: 3, canAnswer: true, endsAt: 0 });
    expect(v.statement!.text.startsWith('Ben hiç')).toBe(true);

    await answerAll(h, { ali: 'did', ayse: 'didNot' });
    expect(h.view('cem').phase).toBe('question');
    expect(h.view('cem').players.find((p) => p.id === 'ali')!.answered).toBe(true);
    expect(h.view('cem').players.find((p) => p.id === 'cem')!.answered).toBe(false);

    await answerAll(h, { cem: 'did' });
    const r = h.view('ayse');
    expect(r.phase).toBe('reveal');
    expect(r.reveal).toMatchObject({ round: 1, didCount: 2, answered: 3, total: 3 });
    expect(r.reveal!.didIds!.sort()).toEqual(['ali', 'cem']);
    expect(r.players.find((p) => p.id === 'ali')).toMatchObject({ lives: 2, didCount: 1 });
    expect(r.players.find((p) => p.id === 'ayse')).toMatchObject({ lives: 3, didCount: 0 });
    expect(r.final).toBe(false);
    expect(h.view('ali').myAnswer).toBe('did');

    // Yalnızca oda sahibi geçer.
    expect(await h.act('ayse', { type: 'next', statementId: sid(h) })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'next', statementId: sid(h) })).toMatchObject({ ok: true });
    expect(h.view('ali')).toMatchObject({ phase: 'question', round: 2, myAnswer: null, reveal: null });

    await answerAll(h, { ali: 'did', ayse: 'didNot', cem: 'didNot' });
    expect(h.view('ali')).toMatchObject({ phase: 'reveal', final: true });
    expect(h.view('ali').history).toHaveLength(2);

    expect(await h.act('ali', { type: 'next', statementId: sid(h) })).toMatchObject({ ok: true });
    const p = h.view('cem');
    expect(p.phase).toBe('podium');
    expect(p.podium!.players!.find((x) => x.id === 'ali')).toMatchObject({ did: 2, didNot: 0, lives: 1 });
    expect(p.podium!.winners!.sort()).toEqual(['ali', 'ayse', 'cem']);
    expect(p.podium!.me).toEqual({ did: 1, didNot: 1 });
    expect(h.finished).toBeNull();
    h.advance(5000);
    expect(h.finished).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'ali', score: 1 }),
        expect.objectContaining({ playerId: 'ayse', score: 3 }),
        expect.objectContaining({ playerId: 'cem', score: 2 }),
      ]),
    );
  });

  it('can kapalıyken skor "yapmadım" sayısıdır ve son tur otomatik sonuca geçer', async () => {
    const h = setup(['ali', 'ayse'], { lives: 0, rounds: 1 });
    await h.start();
    expect(h.view('ali').maxLives).toBeNull();
    await answerAll(h, { ali: 'did', ayse: 'didNot' });
    expect(h.view('ali')).toMatchObject({ phase: 'reveal', final: true });
    expect(h.view('ali').players[0]!.lives).toBeNull();
    h.advance(3000);
    expect(h.view('ali').phase).toBe('podium');
    expect(h.view('ali').podium!.winners).toBeNull();
    h.advance(5000);
    expect(h.finished).toEqual(
      expect.arrayContaining([expect.objectContaining({ playerId: 'ali', score: 0 }), expect.objectContaining({ playerId: 'ayse', score: 1 })]),
    );
  });

  it('cümleler tekrar etmez; havuz bitince oyun sonuca geçer', async () => {
    const h = setup(['ali', 'ayse'], { rounds: 0 });
    await h.start();
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const st = h.view('ali').statement!;
      expect(seen.has(st.id)).toBe(false);
      seen.add(st.id);
      await answerAll(h, { ali: 'didNot', ayse: 'didNot' });
      await h.act('ali', { type: 'next', statementId: st.id });
    }
    expect(h.view('ali').phase).toBe('podium');
  });

  it('gerçek içerik: en az 220 cümle, hepsi "Ben hiç" ile başlar', async () => {
    const g = game({ real: true });
    const cats = g.pool.categories();
    for (const c of ['genel', 'okul-is', 'ask-iliski', 'seyahat', 'utanc', 'teknoloji', 'yemek', 'cesur']) {
      expect(cats.find((x) => x.id === c)?.count ?? 0).toBeGreaterThan(0);
    }
    const all = g.pool.statements(cats.map((c) => c.id));
    expect(all.length).toBeGreaterThanOrEqual(220);
    expect(new Set(all.map((s) => s.text)).size).toBe(all.length);
    for (const s of all) expect(s.text).toMatch(/^Ben hiç .+\.$/u);
  });
});

describe('never: gizlilik', () => {
  it('açıklamadan önce kimse başkasının cevabını görmez', async () => {
    const h = setup(['ali', 'ayse', 'cem']);
    await h.start();
    await answerAll(h, { ali: 'did', ayse: 'didNot' });
    // "did"/"didNot" değerleri yalnızca kendi myAnswer alanında görünebilir.
    expect(h.seen('cem')).not.toContain(':"did"');
    expect(h.seen('cem')).not.toContain(':"didNot"');
    expect(h.seen('ayse')).not.toContain(':"did"');
    expect(h.seen('ali')).not.toContain(':"didNot"');
    expect(h.view('ali').myAnswer).toBe('did');
    expect(h.view('ayse').myAnswer).toBe('didNot');
    expect(h.view('cem').reveal).toBeNull();
    expect(h.seen('cem')).not.toContain('didIds":["');
  });

  it('isimsiz modda kimlikler sunucudan hiç çıkmaz', async () => {
    const h = setup(['ali', 'ayse', 'cem'], { anonymous: true, lives: 0, rounds: 1 });
    await h.start();
    await answerAll(h, { ali: 'did', ayse: 'did', cem: 'didNot' });
    const v = h.view('cem');
    expect(v.reveal).toMatchObject({ didCount: 2, answered: 3, total: 3, didIds: null, eliminatedIds: null });
    expect(v.players.every((p) => p.didCount === null && p.lives === null)).toBe(true);
    h.advance(3000);
    const p = h.view('cem').podium!;
    expect(p.players).toBeNull();
    expect(p.me).toEqual({ did: 0, didNot: 1 });
    for (const id of ['ali', 'ayse', 'cem']) {
      expect(h.seen(id)).not.toMatch(/didIds":\[/);
    }
    // Herkes kendi cevabını görür, başkasınınkini görmez.
    expect(h.seen('cem')).not.toContain(':"did"');
    h.advance(5000);
    // Skor tablosu herkese görünür: isimsiz modda yalnızca katılım yazılır.
    expect(h.finished!.map((r) => r.score)).toEqual([1, 1, 1]);
  });

  it('isimsiz mod ile can sistemi birlikte açılamaz', async () => {
    const h = setup(['ali', 'ayse'], { anonymous: true, lives: 3 });
    await expect(h.start()).rejects.toThrow(/İsimsiz modda can/);
  });
});

describe('never: canlar ve eleme', () => {
  it('canı biten elenir, izler; tek kişi kalınca oyun biter', async () => {
    const h = setup(['ali', 'ayse', 'cem'], { lives: 3, rounds: 0 });
    await h.start();
    for (let i = 0; i < 3; i++) {
      await answerAll(h, { ali: 'didNot', ayse: 'did', cem: 'did' });
      if (i < 2) await h.act('ali', { type: 'next', statementId: sid(h) });
    }
    const v = h.view('ayse');
    expect(v.reveal!.eliminatedIds!.sort()).toEqual(['ayse', 'cem']);
    expect(v.players.find((p) => p.id === 'ayse')).toMatchObject({ lives: 0, eliminated: true, active: false });
    expect(v.final).toBe(true);
    h.advance(3000);
    expect(h.view('ali').podium!.winners).toEqual(['ali']);
  });

  it('elenen oyuncu cevap veremez, cevap beklenmez', async () => {
    const h = setup(['ali', 'ayse', 'cem'], { lives: 3, rounds: 0 });
    await h.start();
    for (let i = 0; i < 3; i++) {
      await answerAll(h, { ali: 'didNot', ayse: 'didNot', cem: 'did' });
      await h.act('ali', { type: 'next', statementId: sid(h) });
    }
    expect(h.view('cem')).toMatchObject({ phase: 'question', canAnswer: false });
    expect(await h.act('cem', { type: 'answer', statementId: sid(h), answer: 'didNot' })).toMatchObject({
      ok: false,
      error: expect.stringContaining('Canın bitti'),
    });
    await answerAll(h, { ali: 'did', ayse: 'didNot' });
    expect(h.view('cem').reveal).toMatchObject({ total: 2, answered: 2, didIds: ['ali'] });
  });
});

describe('never: süre', () => {
  it('süre dolunca cevaplayanlarla açılır', async () => {
    const h = setup(['ali', 'ayse', 'cem'], { seconds: 15 });
    await h.start();
    const v = h.view('ali');
    expect(v.endsAt - v.serverNow).toBe(15_000);
    await answerAll(h, { ayse: 'did' });
    h.advance(14_999);
    expect(h.view('ali').phase).toBe('question');
    h.advance(1);
    expect(h.view('ali').reveal).toMatchObject({ didCount: 1, answered: 1, total: 3, didIds: ['ayse'] });
  });

  it('herkes erken cevaplarsa eski zamanlayıcı yeni turu açmaz', async () => {
    const h = setup(['ali', 'ayse'], { seconds: 15 });
    await h.start();
    h.advance(5_000);
    await answerAll(h, { ali: 'did', ayse: 'did' });
    await h.act('ali', { type: 'next', statementId: sid(h) });
    // İlk cümlenin zamanlayıcısı 15. saniyede düşerdi; iptal edildiği için ikinci soru açık kalır.
    h.advance(10_000);
    expect(h.view('ali').phase).toBe('question');
    h.advance(5_000);
    expect(h.view('ali').phase).toBe('reveal');
  });

  it('süresizde oda sahibi cevapları erken açabilir', async () => {
    const h = setup(['ali', 'ayse', 'cem']);
    await h.start();
    await answerAll(h, { ayse: 'did' });
    expect(await h.act('ayse', { type: 'reveal', statementId: sid(h) })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'reveal', statementId: sid(h) })).toMatchObject({ ok: true });
    expect(h.view('ali').reveal).toMatchObject({ answered: 1, total: 3 });
  });
});

describe('never: atlama', () => {
  it('çoğunluk "atla" derse cümle değişir, tur sayılmaz', async () => {
    const h = setup(['ali', 'ayse', 'cem', 'deniz']);
    await h.start();
    const first = sid(h);
    await answerAll(h, { cem: 'did' });
    await h.act('ayse', { type: 'voteSkip', statementId: first });
    await h.act('cem', { type: 'voteSkip', statementId: first });
    expect(h.view('ali').skip).toEqual({ votes: 2, needed: 3, mine: false });
    expect(h.view('cem').skip.mine).toBe(true);
    // Geri alma
    await h.act('cem', { type: 'voteSkip', statementId: first });
    expect(h.view('ali').skip.votes).toBe(1);
    await h.act('cem', { type: 'voteSkip', statementId: first });
    await h.act('deniz', { type: 'voteSkip', statementId: first });
    const v = h.view('cem');
    expect(v.statement!.id).not.toBe(first);
    expect(v).toMatchObject({ phase: 'question', round: 1, myAnswer: null, skip: { votes: 0, mine: false } });
    expect(v.players.every((p) => !p.answered)).toBe(true);
    // Eski cümleye gelen gecikmiş oy/cevap yutulur.
    expect(await h.act('ali', { type: 'voteSkip', statementId: first })).toMatchObject({ ok: true, stale: true });
    expect(await h.act('ali', { type: 'answer', statementId: first, answer: 'did' })).toMatchObject({ ok: true, stale: true });
  });

  it('oda sahibi soru sırasında sıradaki cümleye geçebilir', async () => {
    const h = setup(['ali', 'ayse']);
    await h.start();
    const first = sid(h);
    expect(await h.act('ayse', { type: 'next', statementId: first })).toMatchObject({ ok: false });
    await h.act('ali', { type: 'next', statementId: first });
    expect(h.view('ali')).toMatchObject({ phase: 'question', round: 1 });
    expect(sid(h)).not.toBe(first);
  });
});

describe('never: oda olayları', () => {
  it('bağlantısı kopan beklenmez; ayrılan oyuncu turu kilitlemez', async () => {
    const h = setup(['ali', 'ayse', 'cem', 'deniz']);
    await h.start();
    h.setConnected('deniz', false);
    await answerAll(h, { ali: 'did', ayse: 'didNot' });
    expect(h.view('ali').phase).toBe('question');
    h.leave('cem');
    expect(h.view('ali').reveal).toMatchObject({ answered: 2, total: 3 });
    expect(h.view('ali').players.map((p) => p.id)).not.toContain('cem');
  });

  it('sonradan katılan oyuncu tam canla oyuna girer', async () => {
    const h = setup(['ali', 'ayse'], { lives: 5 });
    await h.start();
    h.join('ece');
    expect(h.view('ece').players.find((p) => p.id === 'ece')).toMatchObject({ lives: 5, eliminated: false });
    expect(h.view('ece').canAnswer).toBe(true);
  });

  it('oyunu bitir: sonuç ekranı, sonra kayıt', async () => {
    const h = setup(['ali', 'ayse'], { lives: 3 });
    await h.start();
    await answerAll(h, { ali: 'did', ayse: 'didNot' });
    h.end();
    expect(h.view('ali').phase).toBe('podium');
    expect(h.view('ali').statement).toBeNull();
    h.advance(5000);
    expect(h.finished).toEqual(
      expect.arrayContaining([expect.objectContaining({ playerId: 'ali', score: 2 }), expect.objectContaining({ playerId: 'ayse', score: 3 })]),
    );
  });

  it('ayar değişikliği: tur sayısı canlı uygulanır, can ve isimsiz mod sabit kalır', async () => {
    const h = setup(['ali', 'ayse'], { lives: 3, rounds: 10 });
    await h.start();
    h.changeSettings({ rounds: 0, lives: 10 });
    expect(h.view('ali')).toMatchObject({ totalRounds: null, maxLives: 3 });
  });
});

describe('never: arkadaş cümleleri', () => {
  it('eklenen cümle "Ben hiç … ." biçimine getirilir ve kendi kategorisinde çıkar', async () => {
    const g = game();
    const s = g.pool.addCustom('  ben hiç   kendi cümlemi yazmadım!! ', 'p1');
    expect(s.text).toBe('Ben hiç kendi cümlemi yazmadım.');
    expect(g.pool.categories().find((c) => c.id === 'arkadas')!.count).toBe(1);
    const h = createHarness<NeverView>(g, { players: ['ali', 'ayse'], settings: { ...base, categories: ['arkadas'] } });
    await h.start();
    expect(h.view('ali').statement!.text).toBe('Ben hiç kendi cümlemi yazmadım.');
  });
});
