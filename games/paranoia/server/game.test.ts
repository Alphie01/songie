import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import type { ParanoiaView } from '../shared/index.js';
import { paranoiaServer } from './index.js';

const PLAYERS = ['ali', 'ayse', 'cem', 'deniz'];

const game = () => paranoiaServer({ db: new Database(':memory:'), timing: { summaryMs: 60_000 } });

async function setup(settings: Record<string, unknown> = {}, players = PLAYERS) {
  const h = createHarness<ParanoiaView>(game(), {
    players,
    settings: { firstHolder: 'host', thinkSeconds: 0, questionCount: 5, ...settings },
  });
  await h.start();
  return h;
}

/** Soruyu şu an kimin aldığı (oyunun iç durumundan). */
function holderOf(h: Harness<ParanoiaView>): string {
  const st = h.state as { current: { holderId: string } | null };
  return st.current!.holderId;
}

function viewsSeen(h: Harness<ParanoiaView>, id: string): ParanoiaView[] {
  return JSON.parse(h.seen(id)) as ParanoiaView[];
}

describe('Gizlilik Esas', () => {
  it('soruyu seçilen kişi alır: zincir akışı ve açıklamaya geçiş', async () => {
    const h = await setup({ questionCount: 3 });
    expect(h.view('ali').phase).toBe('pickFirst');
    expect(h.view('ali').choices).toEqual(PLAYERS);
    expect(h.view('ayse').choices).toEqual([]);
    expect(await h.act('ayse', { type: 'pickFirst', targetId: 'cem' })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'pickFirst', targetId: 'cem' })).toMatchObject({ ok: true });

    let v = h.view('cem');
    expect(v).toMatchObject({ phase: 'asking', myTurn: true, answered: 0, total: 3 });
    expect(v.question).toBeTruthy();
    expect(await h.act('ayse', { type: 'choose', seq: v.seq, targetId: 'deniz' })).toMatchObject({ ok: false });
    expect(await h.act('cem', { type: 'choose', seq: v.seq, targetId: 'deniz' })).toMatchObject({ ok: true });
    // Çift tıklama yutulur.
    expect(await h.act('cem', { type: 'choose', seq: v.seq, targetId: 'deniz' })).toMatchObject({ ok: true, stale: true });

    expect(h.view('cem').myTurn).toBe(false);
    v = h.view('deniz');
    expect(v).toMatchObject({ myTurn: true, answered: 1 });
    await h.act('deniz', { type: 'choose', seq: v.seq, targetId: 'ali' });
    v = h.view('ali');
    expect(v.myTurn).toBe(true);
    await h.act('ali', { type: 'choose', seq: v.seq, targetId: 'ayse' });

    v = h.view('ayse');
    expect(v.phase).toBe('reveal');
    expect(v.revealTotal).toBe(3);
    expect(v.revealed).toHaveLength(1);
    expect(v.revealed[0]).toMatchObject({ n: 1, askedId: 'cem', answerId: 'deniz', how: 'chosen' });
    // Kendi geçmişi toplama sırasında yalnızca kendisine gider.
    expect(h.view('ali').mine).toEqual([]);
  });

  it('soru ve seçim açıklamaya kadar başkasına gitmez; kime sorulduğu da gizli', async () => {
    const h = await setup({ questionCount: 3, hideHolder: true });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    const texts: string[] = [];
    const chain: [string, string][] = [
      ['ayse', 'cem'],
      ['cem', 'deniz'],
    ];
    for (const [from, to] of chain) {
      const v = h.view(from);
      texts.push(v.question!);
      await h.act(from, { type: 'choose', seq: v.seq, targetId: to });
    }
    // Üçüncü soru deniz'de; henüz cevaplanmadı.
    texts.push(h.view('deniz').question!);
    expect(h.view('deniz').mine).toEqual([]);
    expect(h.view('cem').mine).toEqual([{ question: texts[1], answerId: 'deniz', how: 'chosen' }]);

    for (const id of PLAYERS) {
      const seen = h.seen(id);
      texts.forEach((t, i) => {
        const holder = ['ayse', 'cem', 'deniz'][i];
        if (holder !== id) expect(seen).not.toContain(t);
      });
      for (const view of viewsSeen(h, id)) {
        // Kime sorulduğu yalnızca soruyu alana gider.
        if (view.holderId !== null) expect(view.holderId).toBe(id);
        if (!view.myTurn) expect(view.question).toBeNull();
        expect(view.revealed).toEqual([]);
        // Seçim (cevap) yalnızca soruyu alanın kendi geçmişinde.
        for (const m of view.mine) expect(texts.indexOf(m.question)).toBe(['ayse', 'cem', 'deniz'].indexOf(id));
        if (!view.myTurn) expect(view.choices.length === 0 || (id === 'ali' && view.phase === 'pickFirst')).toBe(true);
      }
    }

    // Açıklama başlayınca sırayla açılır.
    await h.act('deniz', { type: 'choose', seq: h.view('deniz').seq, targetId: 'ali' });
    expect(h.view('ali').revealed[0]!.question).toBe(texts[0]);
    expect(h.view('ali').revealed.map((r) => r.question)).not.toContain(texts[1]);
  });

  it('"kime sorulduğu gizli" kapalıyken herkes sırayı görür ama soruyu görmez', async () => {
    const h = await setup({ hideHolder: false });
    await h.act('ali', { type: 'pickFirst', targetId: 'cem' });
    const q = h.view('cem').question!;
    expect(h.view('ayse')).toMatchObject({ holderId: 'cem', question: null, myTurn: false });
    expect(h.seen('ayse')).not.toContain(q);
  });

  it('kendini seçme kuralı', async () => {
    const h = await setup({ allowSelf: false });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    const v = h.view('ayse');
    expect(v.choices).not.toContain('ayse');
    const res = await h.act('ayse', { type: 'choose', seq: v.seq, targetId: 'ayse' });
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining('kendini') });

    const h2 = await setup({ allowSelf: true });
    await h2.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    const v2 = h2.view('ayse');
    expect(v2.choices).toContain('ayse');
    expect(await h2.act('ayse', { type: 'choose', seq: v2.seq, targetId: 'ayse' })).toMatchObject({ ok: true });
    expect(h2.view('ayse')).toMatchObject({ myTurn: true, answered: 1 });
  });

  it('geri seçim kuralı: soruyu gönderen seçilemez', async () => {
    const h = await setup({ noReturn: true });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    await h.act('ayse', { type: 'choose', seq: h.view('ayse').seq, targetId: 'cem' });
    const v = h.view('cem');
    expect(v.choices).not.toContain('ayse');
    expect(await h.act('cem', { type: 'choose', seq: v.seq, targetId: 'ayse' })).toMatchObject({
      ok: false,
      error: expect.stringContaining('gönderen'),
    });
    expect(await h.act('cem', { type: 'choose', seq: v.seq, targetId: 'deniz' })).toMatchObject({ ok: true });

    const h2 = await setup({ noReturn: false });
    await h2.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    await h2.act('ayse', { type: 'choose', seq: h2.view('ayse').seq, targetId: 'cem' });
    expect(await h2.act('cem', { type: 'choose', seq: h2.view('cem').seq, targetId: 'ayse' })).toMatchObject({ ok: true });
  });

  it('3 kişide kurallar kimseyi bırakmazsa gevşer', async () => {
    const h = await setup({ noReturn: true, allowSelf: false }, ['ali', 'ayse', 'cem']);
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    await h.act('ayse', { type: 'choose', seq: h.view('ayse').seq, targetId: 'cem' });
    expect(h.view('cem').choices).toEqual(['ali']);
    h.leave('ali');
    // ali ayrıldı: tek seçenek geri seçim olur.
    expect(h.view('cem').choices).toEqual(['ayse']);
  });

  it('süre dolunca rastgele biri seçilir', async () => {
    const h = await setup({ thinkSeconds: 20, onTimeout: 'random' });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    const v = h.view('ayse');
    expect(v.endsAt).toBe(h.now + 20_000);
    h.advance(19_000);
    expect(h.view('ayse').answered).toBe(0);
    h.advance(1_000);
    const st = h.state as { entries: { askedId: string; answerId: string; how: string }[] };
    expect(st.entries[0]).toMatchObject({ askedId: 'ayse', how: 'random' });
    expect(st.entries[0]!.answerId).not.toBe('ayse');
    expect(holderOf(h)).toBe(st.entries[0]!.answerId);
    // Gecikmiş seçim yutulur.
    expect(await h.act('ayse', { type: 'choose', seq: v.seq, targetId: 'cem' })).toMatchObject({ ok: true, stale: true });
  });

  it('süre dolunca pas: soru cevapsız kalır, sıra başkasına geçer', async () => {
    const h = await setup({ thinkSeconds: 40, onTimeout: 'pass' });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    h.advance(40_000);
    const st = h.state as { entries: { answerId: string | null; how: string }[] };
    expect(st.entries[0]).toMatchObject({ answerId: null, how: 'pass' });
    expect(holderOf(h)).not.toBe('ayse');
    expect(h.view(holderOf(h)).endsAt).toBe(h.now + 40_000);
  });

  it('süresiz modda zamanlayıcı yok', async () => {
    const h = await setup({ thinkSeconds: 0 });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    expect(h.view('ayse').endsAt).toBeNull();
    h.advance(10 * 60_000);
    expect(holderOf(h)).toBe('ayse');
  });

  it('açıklama sırası: oda sahibi açar, sonra özet', async () => {
    const h = await setup({ questionCount: 3, revealBy: 'host' });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    const order: [string, string][] = [
      ['ayse', 'cem'],
      ['cem', 'deniz'],
      ['deniz', 'ayse'],
    ];
    const qs: string[] = [];
    for (const [from, to] of order) {
      qs.push(h.view(from).question!);
      await h.act(from, { type: 'choose', seq: h.view(from).seq, targetId: to });
    }
    expect(h.view('cem').revealed.map((r) => r.question)).toEqual([qs[0]]);
    expect(await h.act('cem', { type: 'next', shown: 1 })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'next', shown: 1 })).toMatchObject({ ok: true });
    expect(await h.act('ali', { type: 'next', shown: 1 })).toMatchObject({ ok: true, stale: true });
    expect(h.view('cem').revealed.map((r) => r.question)).toEqual([qs[0], qs[1]]);
    await h.act('ali', { type: 'next', shown: 2 });
    expect(h.view('cem').revealed).toHaveLength(3);
    expect(h.view('cem').revealed[2]).toMatchObject({ n: 3, askedId: 'deniz', answerId: 'ayse' });
    await h.act('ali', { type: 'next', shown: 3 });
    const v = h.view('cem');
    expect(v.phase).toBe('summary');
    expect(v.stats[0]).toMatchObject({ playerId: expect.any(String), picked: 1 });
    expect(v.stats.find((s) => s.playerId === 'ali')).toMatchObject({ picked: 0, asked: 0 });
  });

  it('açıklama oylaması: çoğunluk basınca açılır', async () => {
    const h = await setup({ questionCount: 2, revealBy: 'vote' });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    await h.act('ayse', { type: 'choose', seq: h.view('ayse').seq, targetId: 'cem' });
    await h.act('cem', { type: 'choose', seq: h.view('cem').seq, targetId: 'deniz' });
    expect(h.view('ayse')).toMatchObject({ phase: 'reveal', votes: 0, votesNeeded: 3 });
    await h.act('ayse', { type: 'next', shown: 1 });
    await h.act('ayse', { type: 'next', shown: 1 });
    expect(h.view('cem')).toMatchObject({ votes: 1, myVote: false });
    expect(h.view('ayse').myVote).toBe(true);
    await h.act('cem', { type: 'next', shown: 1 });
    expect(h.view('cem').revealed).toHaveLength(1);
    await h.act('deniz', { type: 'next', shown: 1 });
    expect(h.view('cem')).toMatchObject({ votes: 0 });
    expect(h.view('cem').revealed).toHaveLength(2);
    // Oda sahibi oy beklemeden geçebilir.
    await h.act('ali', { type: 'next', shown: 2 });
    expect(h.view('cem').phase).toBe('summary');
  });

  it('bağlantısı kopan oyuncuya sıra gelince oda sahibi atlar', async () => {
    const h = await setup({ hideHolder: true });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    expect(h.view('ali').holderOffline).toBe(false);
    h.setConnected('ayse', false);
    expect(h.view('ali').holderOffline).toBe(true);
    expect(h.view('cem').holderOffline).toBe(false);
    const seq = h.view('ali').seq;
    expect(await h.act('cem', { type: 'skip', seq, mode: 'reassign' })).toMatchObject({ ok: false });

    expect(await h.act('ali', { type: 'skip', seq, mode: 'reassign' })).toMatchObject({ ok: true });
    const next = holderOf(h);
    expect(next).not.toBe('ayse');
    expect(h.view(next).myTurn).toBe(true);
    expect(h.view('ali').answered).toBe(0);

    // Yeni sahip de koparsa oda sahibi onun yerine rastgele cevaplatır.
    h.setConnected(next, false);
    const seq2 = h.view(next).seq;
    expect(await h.act('ali', { type: 'skip', seq: seq2, mode: 'random' })).toMatchObject({ ok: true });
    const st = h.state as { entries: { askedId: string; how: string; answerId: string }[] };
    expect(st.entries[0]).toMatchObject({ askedId: next, how: 'host' });
    expect(holderOf(h)).toBe(st.entries[0]!.answerId);
  });

  it('soruyu alan odadan ayrılırsa soru başkasına geçer', async () => {
    const h = await setup();
    await h.act('ali', { type: 'pickFirst', targetId: 'cem' });
    h.leave('cem');
    expect(holderOf(h)).not.toBe('cem');
    expect(h.view(holderOf(h)).myTurn).toBe(true);
  });

  it('oyunu bitir: ortada kesilirse özet, sonra sonuçlar', async () => {
    const h = await setup({ questionCount: 10 });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    await h.act('ayse', { type: 'choose', seq: h.view('ayse').seq, targetId: 'cem' });
    await h.act('cem', { type: 'choose', seq: h.view('cem').seq, targetId: 'deniz' });
    h.end();
    const v = h.view('deniz');
    expect(v.phase).toBe('summary');
    expect(v.revealed).toHaveLength(2);
    expect(h.finished).toBeNull();
    expect(await h.act('cem', { type: 'finish' })).toMatchObject({ ok: false });
    h.end();
    expect(h.finished).not.toBeNull();
    expect(h.finished!.find((r) => r.playerId === 'ayse')).toMatchObject({ score: 0, meta: { asked: 1 } });
    expect(h.finished!.find((r) => r.playerId === 'deniz')).toMatchObject({ score: 1, meta: { asked: 0 } });
    expect(h.finished!.find((r) => r.playerId === 'cem')).toMatchObject({ score: 1 });
    expect(h.finished).toHaveLength(4);
  });

  it('özet ekranı süre dolunca ya da oda sahibi basınca biter', async () => {
    const h = await setup({ questionCount: 1 });
    await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    await h.act('ayse', { type: 'choose', seq: h.view('ayse').seq, targetId: 'cem' });
    await h.act('ali', { type: 'next', shown: 1 });
    expect(h.view('ali').phase).toBe('summary');
    h.advance(59_000);
    expect(h.finished).toBeNull();
    h.advance(1_000);
    expect(h.finished).not.toBeNull();

    const h2 = await setup({ questionCount: 1 });
    await h2.act('ali', { type: 'pickFirst', targetId: 'ayse' });
    await h2.act('ayse', { type: 'choose', seq: h2.view('ayse').seq, targetId: 'cem' });
    await h2.act('ali', { type: 'next', shown: 1 });
    expect(await h2.act('ali', { type: 'finish' })).toMatchObject({ ok: true });
    expect(h2.finished!.find((r) => r.playerId === 'cem')!.score).toBe(1);
  });

  it('rastgele ilk soru, oyuna sonradan katılan seçilebilir, ayar değişikliği', async () => {
    const h = createHarness<ParanoiaView>(game(), { players: PLAYERS, settings: { firstHolder: 'random', questionCount: 5 } });
    await h.start();
    expect(h.view('ali').phase).toBe('asking');
    const holder = holderOf(h);
    h.join('elif');
    expect(h.view(holder).choices).toContain('elif');
    h.changeSettings({ questionCount: 15 });
    expect(h.view('ali').total).toBe(15);
  });

  it('en az 3 oyuncu ve yeterli içerik', async () => {
    const h = createHarness<ParanoiaView>(game(), { players: ['ali', 'ayse'] });
    await expect(h.start()).rejects.toThrow(/en az 3/);
    const g = game();
    const cats = g.bank.categories();
    const total = cats.reduce((n, c) => n + c.count, 0);
    expect(total).toBeGreaterThanOrEqual(220);
    for (const c of cats.filter((x) => x.id !== 'eklenen')) expect(c.count).toBeGreaterThanOrEqual(25);
    expect(g.validateSettings!({ ...g.defaultSettings, categories: ['eklenen'] })).toMatch(/soru yok/);
    g.bank.add('Aramızda kim en çok pizza yer?', 'ali');
    expect(g.validateSettings!({ ...g.defaultSettings, categories: ['eklenen'] })).toBeNull();
  });
});
