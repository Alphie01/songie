import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import { foldText } from '@songie/shared';
import type { WhoAmIView } from '../shared/index.js';
import { IdentityPool, matchesGuess } from './content.js';
import { hintFor, majority, type WhoAmIState } from './game.js';
import { whoAmIServer } from './index.js';

const TEST_DIR = path.join(import.meta.dirname, 'test-content');
const CONTENT_DIR = path.join(import.meta.dirname, 'content');

function setup(players: string[], settings: Record<string, unknown> = {}, db = new Database(':memory:')) {
  const game = whoAmIServer({ db, contentDir: TEST_DIR, timing: { podiumMs: 5000 } });
  const h = createHarness<WhoAmIView>(game, { players, settings: { categories: ['test'], ...settings } });
  const st = () => h.state as WhoAmIState;
  const name = (id: string) => st().players[id]!.card.name;
  const asker = () => st().askerId!;
  /** Sıradaki soruyu sor ve herkes aynı cevabı versin. */
  async function askAll(answer: 'yes' | 'no' | 'maybe' | 'irrelevant', text?: string) {
    const a = asker();
    const res = await h.act(a, { type: 'ask', text });
    expect(res).toMatchObject({ ok: true });
    const qid = h.view(a).question!.id;
    for (const p of st().order) if (p !== a && !st().players[p]!.left) await h.act(p, { type: 'answer', questionId: qid, answer });
    return a;
  }
  return { h, st, name, asker, askAll, game };
}

describe('who-am-i: kimlik gizliliği', () => {
  it('kimse kendi kimliğini açıklanana kadar görmez; başkalarınınkini görür', async () => {
    const ids = ['ali', 'ayse', 'cem', 'deniz'];
    const { h, name, askAll, asker, st } = setup(ids, { hints: 3 });
    await h.start();
    for (const id of ids) {
      const v = h.view(id);
      expect(v.players.find((p) => p.id === id)!.identity).toBeNull();
      for (const other of ids.filter((x) => x !== id)) {
        expect(v.players.find((p) => p.id === other)!.identity!.name).toBe(name(other));
      }
    }
    // Biraz oyna: sorular, cevaplar, ipuçları, yanlış tahmin.
    await askAll('yes', 'Erkek miyim?');
    await askAll('no', 'Yaşıyor muyum?');
    for (const id of ids) await h.act(id, { type: 'hint' });
    await h.act(asker(), { type: 'guess', text: 'Yanlış bir şey' });
    h.setConnected('cem', false);
    h.setConnected('cem', true);
    for (const id of ids) {
      if (st().players[id]!.finishRank !== null) continue;
      expect(h.seen(id)).not.toContain(name(id));
      for (const other of ids.filter((x) => x !== id)) expect(h.seen(id)).toContain(name(other));
    }
  });

  it('bilen oyuncu kendi kimliğini görür; oyun sonunda herkesinki açılır', async () => {
    const { h, name, asker, st } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const a = asker();
    expect(await h.act(a, { type: 'guess', text: name(a) })).toMatchObject({ ok: true, correct: true });
    expect(h.view(a).players.find((p) => p.id === a)!.identity!.name).toBe(name(a));
    const other = st().order.find((x) => x !== a)!;
    expect(h.view(other).players.find((p) => p.id === other)!.identity).toBeNull();
    h.end();
    expect(h.view(other).phase).toBe('podium');
    expect(h.view(other).players.find((p) => p.id === other)!.identity!.name).toBe(name(other));
  });
});

describe('who-am-i: sıra ve soru hakkı', () => {
  it('klasik kural: "Evet" çıkınca sormaya devam eder, "Hayır" çıkınca sıra geçer', async () => {
    const { h, asker, askAll, st } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const first = asker();
    await askAll('yes');
    expect(asker()).toBe(first);
    await askAll('maybe');
    expect(asker()).toBe(first);
    await askAll('no');
    expect(asker()).not.toBe(first);
    expect(st().players[first]!.questions).toBe(3);
    expect(h.view(first).history.map((x) => (x.kind === 'question' ? x.result : x.kind))).toEqual(['yes', 'maybe', 'no']);
  });

  it('her turda 3 soru ayarı: cevaptan bağımsız 3 sorudan sonra sıra geçer', async () => {
    const { h, asker, askAll } = setup(['ali', 'ayse', 'cem'], { turnMode: 'three' });
    await h.start();
    const first = asker();
    await askAll('no');
    await askAll('no');
    expect(asker()).toBe(first);
    expect(h.view(first).turnQuestions).toBe(2);
    await askAll('yes');
    expect(asker()).not.toBe(first);
  });

  it('yalnızca sırası gelen sorar; soran kendi sorusunu cevaplayamaz; eski cevaplar yutulur', async () => {
    const { h, asker, st } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const a = asker();
    const other = st().order.find((x) => x !== a)!;
    expect(await h.act(other, { type: 'ask' })).toMatchObject({ ok: false });
    await h.act(a, { type: 'ask' });
    const qid = h.view(a).question!.id;
    expect(await h.act(a, { type: 'answer', questionId: qid, answer: 'yes' })).toMatchObject({ ok: false });
    expect(await h.act(other, { type: 'answer', questionId: qid + 99, answer: 'yes' })).toMatchObject({ ok: true, stale: true });
    // Çift tıklama: ikinci soru açılmaz.
    expect(await h.act(a, { type: 'ask' })).toMatchObject({ ok: true, stale: true });
    expect(st().players[a]!.questions).toBe(1);
  });

  it('yazılı soru ayar kapalıyken metni kaydetmez', async () => {
    const { h, asker, askAll } = setup(['ali', 'ayse'], { typedQuestions: false });
    await h.start();
    const a = asker();
    await askAll('yes', 'Ünlü müyüm?');
    const item = h.view(a).history[0]!;
    expect(item.kind === 'question' && item.text).toBeNull();
  });

  it('soran, herkes cevaplamadan gelenlerle soruyu kapatabilir', async () => {
    const { h, asker, st } = setup(['ali', 'ayse', 'cem', 'deniz']);
    await h.start();
    const a = asker();
    const o1 = st().order.find((x) => x !== a && x !== 'ali');
    await h.act(a, { type: 'ask', text: 'İnsan mıyım?' });
    const qid = h.view(a).question!.id;
    expect(await h.act(a, { type: 'close', questionId: qid })).toMatchObject({ ok: false });
    await h.act(o1!, { type: 'answer', questionId: qid, answer: 'no' });
    expect(h.view(a).question!.counts.no).toBe(1);
    expect(await h.act(o1!, { type: 'close', questionId: qid })).toMatchObject({ ok: false });
    expect(await h.act(a, { type: 'close', questionId: qid })).toMatchObject({ ok: true });
    expect(asker()).not.toBe(a);
  });
});

describe('who-am-i: cevap çoğunluğu', () => {
  it('en çok oy alan cevap; en üstte eşitlik "Belki"', () => {
    expect(majority({ yes: 2, no: 1, maybe: 0, irrelevant: 0 })).toBe('yes');
    expect(majority({ yes: 1, no: 3, maybe: 1, irrelevant: 0 })).toBe('no');
    expect(majority({ yes: 2, no: 2, maybe: 0, irrelevant: 0 })).toBe('maybe');
    expect(majority({ yes: 0, no: 0, maybe: 0, irrelevant: 1 })).toBe('irrelevant');
    expect(majority({ yes: 0, no: 0, maybe: 0, irrelevant: 0 })).toBe('maybe');
  });

  it('karışık cevaplarda çoğunluk geçmişe yazılır ve sıra kuralına uygulanır', async () => {
    const { h, asker, st } = setup(['ali', 'ayse', 'cem', 'deniz']);
    await h.start();
    const a = asker();
    const [o1, o2, o3] = st().order.filter((x) => x !== a);
    await h.act(a, { type: 'ask' });
    const qid = h.view(a).question!.id;
    await h.act(o1!, { type: 'answer', questionId: qid, answer: 'no' });
    await h.act(o2!, { type: 'answer', questionId: qid, answer: 'yes' });
    // Fikir değiştirme serbest.
    await h.act(o2!, { type: 'answer', questionId: qid, answer: 'no' });
    expect(h.view(a).question).not.toBeNull();
    await h.act(o3!, { type: 'answer', questionId: qid, answer: 'yes' });
    const item = h.view(a).history.at(-1)!;
    expect(item).toMatchObject({ kind: 'question', result: 'no', counts: { yes: 1, no: 2, maybe: 0, irrelevant: 0 } });
    expect(asker()).not.toBe(a);
  });
});

describe('who-am-i: tahmin', () => {
  it('normalizasyon: Türkçe karakter, büyük/küçük harf, boşluk ve noktalama duyarsız; eşanlamlar kabul', () => {
    const card = { name: 'Barış Manço', aliases: ['manço'] };
    for (const g of ['Barış Manço', 'baris manco', 'BARIŞ MANÇO', 'barışmanço', '  Barış   Manço! ', 'MANCO', 'Manço']) {
      expect(matchesGuess(card, g), g).toBe(true);
    }
    expect(matchesGuess(card, 'Barış')).toBe(false);
    expect(matchesGuess(card, 'Cem Karaca')).toBe(false);
    expect(matchesGuess({ name: 'Örümcek Adam', aliases: ['spiderman', 'spider man'] }, 'Spider-Man')).toBe(true);
    expect(matchesGuess({ name: 'Örümcek Adam', aliases: [] }, 'orumcekadam')).toBe(true);
    expect(matchesGuess({ name: 'Tom (Tom ve Jerry)', aliases: [] }, 'tom')).toBe(true);
    expect(matchesGuess({ name: 'İnek Şaban', aliases: [] }, 'INEK SABAN')).toBe(true);
  });

  it('doğru tahmin bitirir ve sırayı geçirir; yanlış tahmin yalnızca sırayı geçirir', async () => {
    const { h, asker, name, st } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const a = asker();
    expect(await h.act(a, { type: 'guess', text: 'kesinlikle yanlış' })).toMatchObject({ ok: true, correct: false });
    expect(st().players[a]!.finishRank).toBeNull();
    const b = asker();
    expect(b).not.toBe(a);
    const folded = foldText(name(b)).toUpperCase();
    expect(await h.act(b, { type: 'guess', text: folded })).toMatchObject({ ok: true, correct: true });
    expect(st().players[b]!.finishRank).toBe(0);
    expect(asker()).not.toBe(b);
    const last = h.view(a).history.at(-1)!;
    expect(last).toMatchObject({ kind: 'guess', correct: true, reveal: name(b) });
  });

  it('sırası gelmeyen ve soru açıkken tahmin edemez', async () => {
    const { h, asker, st, name } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const a = asker();
    const other = st().order.find((x) => x !== a)!;
    expect(await h.act(other, { type: 'guess', text: name(other) })).toMatchObject({ ok: false });
    await h.act(a, { type: 'ask' });
    expect(await h.act(a, { type: 'guess', text: name(a) })).toMatchObject({ ok: false });
  });

  it('grup onayı: diğerleri oylar, çoğunluk karar verir; tahmin eden oylayamaz', async () => {
    const { h, asker, st, name } = setup(['ali', 'ayse', 'cem', 'deniz'], { groupVerify: true });
    await h.start();
    const a = asker();
    const [o1, o2, o3] = st().order.filter((x) => x !== a);
    // Yazım farklı ama grup kabul ediyor.
    expect(await h.act(a, { type: 'guess', text: 'şu meşhur kişi' })).toMatchObject({ ok: true, pending: true });
    const g = h.view(o1!).guess!;
    expect(g.text).toBe('şu meşhur kişi');
    expect(h.view(o1!).players.find((p) => p.id === a)!.identity!.name).toBe(name(a));
    expect(await h.act(a, { type: 'verify', guessId: g.id, correct: true })).toMatchObject({ ok: false });
    await h.act(o1!, { type: 'verify', guessId: g.id, correct: true });
    await h.act(o2!, { type: 'verify', guessId: g.id, correct: true });
    expect(h.view(a).guess!.votes).toEqual({ correct: 2, wrong: 0 });
    await h.act(o3!, { type: 'verify', guessId: g.id, correct: false });
    expect(st().players[a]!.finishRank).toBe(0);
    expect(h.view(a).history.at(-1)).toMatchObject({ kind: 'guess', correct: true, byGroup: true });

    // İkinci oyuncu: grup "yanlış" der, doğru yazsa bile.
    const b = asker();
    await h.act(b, { type: 'guess', text: name(b) });
    const g2 = h.view(a).guess!;
    for (const p of st().order.filter((x) => x !== b)) await h.act(p, { type: 'verify', guessId: g2.id, correct: false });
    expect(st().players[b]!.finishRank).toBeNull();
    expect(asker()).not.toBe(b);
  });

  it('grup onayında eşitlik yazım kontrolüyle çözülür; oda sahibi oylamayı kapatabilir', async () => {
    const { h, asker, st, name } = setup(['ali', 'ayse', 'cem'], { groupVerify: true });
    await h.start();
    const a = asker();
    const others = st().order.filter((x) => x !== a);
    await h.act(a, { type: 'guess', text: name(a) });
    const gid = h.view(a).guess!.id;
    await h.act(others[0]!, { type: 'verify', guessId: gid, correct: false });
    const nonHost = st().order.find((x) => x !== 'ali')!;
    expect(await h.act(nonHost, { type: 'close', guessId: gid })).toMatchObject({ ok: false });
    // ali oda sahibi; 0-1 oyla kapatırsa "yanlış". Bunun yerine eşitlik kur.
    await h.act(others[1]!, { type: 'verify', guessId: gid, correct: true });
    expect(st().players[a]!.finishRank).toBe(0);
  });
});

describe('who-am-i: ipucu', () => {
  it('ipucu yalnızca isteyen kişiye gider, hakla sınırlıdır ve 1 soru sayılır', async () => {
    const { h, name, st } = setup(['ali', 'ayse', 'cem'], { hints: 1 });
    await h.start();
    expect(await h.act('ayse', { type: 'hint' })).toMatchObject({ ok: true });
    const hint = h.view('ayse').myHints[0]!;
    expect(hint).toBeTruthy();
    expect(h.view('ali').myHints).toEqual([]);
    expect(h.seen('ali')).not.toContain(hint);
    expect(h.view('ayse').hintsLeft).toBe(0);
    expect(st().players.ayse!.questions).toBe(1);
    expect(await h.act('ayse', { type: 'hint' })).toMatchObject({ ok: false, error: 'İpucu hakkın bitti.' });
    expect(h.view('ali').players.find((p) => p.id === 'ayse')!.hints).toBe(1);
    expect(h.seen('ayse')).not.toContain(name('ayse'));
  });

  it('ipucu sırası: kategori, baş harf, kelime ve harf sayısı; ipucu kapalı olabilir', async () => {
    const card = { id: 'x', name: 'Barış Manço', category: 'turk-unluler', aliases: [], createdBy: null };
    expect(hintFor(card, 0)).toBe('Türkiye’den bir ünlüsün.');
    expect(hintFor(card, 1)).toBe('Baş harfin “B”.');
    expect(hintFor(card, 2)).toBe('Kimliğin 2 kelime, toplam 10 harf.');
    expect(hintFor({ ...card, name: 'İnek Şaban' }, 1)).toBe('Baş harfin “İ”.');

    const { h } = setup(['ali', 'ayse'], { hints: 0 });
    await h.start();
    expect(await h.act('ali', { type: 'hint' })).toMatchObject({ ok: false, error: 'Bu oyunda ipucu kapalı.' });
  });
});

describe('who-am-i: bitiriş ve sonuç', () => {
  it('bitiriş sırası kaydedilir, bilenler cevaplamaya devam eder, herkes bilince sıralama ve finish', async () => {
    const { h, asker, name, st, askAll } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const first = asker();
    // first: 2 soru (evet, evet) sonra doğru tahmin → 2 soru.
    await askAll('yes');
    await askAll('yes');
    await h.act(first, { type: 'guess', text: name(first) });
    const second = asker();
    // second: hemen bilir → 0 soru; sıralamada öne geçer.
    await h.act(second, { type: 'guess', text: name(second) });
    const third = asker();
    expect(third).not.toBe(first);
    expect(third).not.toBe(second);
    // Bitirenler cevaplamaya devam eder.
    await h.act(third, { type: 'ask' });
    const qid = h.view(third).question!.id;
    expect(await h.act(first, { type: 'answer', questionId: qid, answer: 'yes' })).toMatchObject({ ok: true });
    await h.act(second, { type: 'answer', questionId: qid, answer: 'yes' });
    // Sıra yine third'de (tek bitirmeyen).
    await h.act(third, { type: 'guess', text: 'olmaz' });
    expect(asker()).toBe(third);
    await h.act(third, { type: 'guess', text: name(third) });
    expect(h.view(first).phase).toBe('podium');
    expect(st().players[first]!.finishRank).toBe(0);
    expect(st().players[second]!.finishRank).toBe(1);
    expect(st().players[third]!.finishRank).toBe(2);
    expect(h.finished).toBeNull();
    h.advance(5000);
    const res = h.finished!;
    // Az soruda bilen önde: second (0), third (1), first (2).
    expect(res.map((r) => r.playerId)).toEqual([second, third, first]);
    expect(res[0]).toMatchObject({ playerId: second, score: 3, meta: { questions: 0, finished: true, place: 1 } });
  });

  it('oda sahibi oyunu bitirince bilemeyenler sonda, kimlikler açılır', async () => {
    const { h, asker, name, st } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const a = asker();
    await h.act(a, { type: 'guess', text: name(a) });
    h.end();
    const v = h.view('ali');
    expect(v.phase).toBe('podium');
    expect(v.players.every((p) => p.identity)).toBe(true);
    expect(await h.act(asker() ?? 'ali', { type: 'ask' })).toMatchObject({ ok: false });
    h.advance(5000);
    expect(h.finished![0]).toMatchObject({ playerId: a, score: 3 });
    expect(h.finished!.slice(1).every((r) => r.score === 0)).toBe(true);
    expect(st().phase).toBe('podium');
  });
});

describe('who-am-i: bağlantı ve katılım', () => {
  it('kopan oyuncunun sırası atlanır; oda sahibi sıradakini atlayabilir', async () => {
    const { h, asker, st, askAll } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const order = st().order;
    const first = asker();
    const second = order[(order.indexOf(first) + 1) % 3]!;
    const third = order[(order.indexOf(first) + 2) % 3]!;
    h.setConnected(second, false);
    // Kopan oyuncu cevap beklenenlerden düşer: tek cevap yeter.
    await askAll('no');
    expect(asker()).toBe(third);

    // Oda sahibi atlar.
    h.setConnected(second, true);
    const host = 'ali';
    const cur = asker();
    if (cur === host) {
      expect(await h.act(host, { type: 'pass' })).toMatchObject({ ok: true });
    } else {
      const nonHost = order.find((x) => x !== host && x !== cur)!;
      expect(await h.act(nonHost, { type: 'pass' })).toMatchObject({ ok: false });
      expect(await h.act(host, { type: 'pass' })).toMatchObject({ ok: true });
      expect(h.view(host).history.at(-1)).toMatchObject({ kind: 'skip', askerId: cur, byHost: true });
    }
    expect(asker()).not.toBe(cur);
  });

  it('sırası gelenin bağlantısı koparsa sırası kendiliğinden atlanır; açık soru kopan cevaplayıcıyı beklemez', async () => {
    const { h, asker, st } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const a = asker();
    h.setConnected(a, false);
    expect(asker()).not.toBe(a);
    expect(h.view(asker()).history.at(-1)).toMatchObject({ kind: 'skip', askerId: a, byHost: false });
    h.setConnected(a, true);

    const b = asker();
    const [o1, o2] = st().order.filter((x) => x !== b);
    await h.act(b, { type: 'ask' });
    const qid = h.view(b).question!.id;
    await h.act(o1!, { type: 'answer', questionId: qid, answer: 'yes' });
    expect(h.view(b).question).not.toBeNull();
    h.setConnected(o2!, false);
    expect(h.view(b).question).toBeNull();
    expect(h.view(b).history.at(-1)).toMatchObject({ kind: 'question', result: 'yes' });
    expect(asker()).toBe(b);
  });

  it('sırası gelen oyundan ayrılınca sıra geçer; yeni gelen kart alır', async () => {
    const { h, asker, st } = setup(['ali', 'ayse', 'cem']);
    await h.start();
    const a = asker();
    h.leave(a);
    expect(asker()).not.toBe(a);
    expect(h.view(asker()).players.find((p) => p.id === a)!.left).toBe(true);
    h.join('ece');
    expect(st().players.ece).toBeDefined();
    expect(h.view('ece').players.find((p) => p.id === 'ece')!.identity).toBeNull();
    expect(h.view('ali').players.find((p) => p.id === 'ece')?.identity?.name ?? h.view(asker()).players.find((p) => p.id === 'ece')!.identity!.name).toBe(
      st().players.ece!.card.name,
    );
  });

  it('herkes ayrılıp tek kişi kalınca sonuçlara geçer', async () => {
    const { h } = setup(['ali', 'ayse']);
    await h.start();
    h.leave('ayse');
    expect(h.view('ali').phase).toBe('podium');
  });
});

describe('who-am-i: içerik ve eklenen kartlar', () => {
  it('en az 260 kimlik, 8 kategori; adlar benzersiz ve eşanlamlar kendi adıyla eşleşir', () => {
    const pool = new IdentityPool(new Database(':memory:'), CONTENT_DIR);
    const cats = pool.categories().filter((c) => c.id !== 'arkadas');
    expect(cats.length).toBe(8);
    const all = pool.cards(cats.map((c) => c.id));
    expect(all.length).toBeGreaterThanOrEqual(260);
    const keys = all.map((c) => foldText(c.name));
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of all) {
      expect(matchesGuess(c, c.name)).toBe(true);
      for (const a of c.aliases) expect(matchesGuess(c, a)).toBe(true);
    }
    expect(matchesGuess(all.find((c) => c.name === 'Barış Manço')!, 'manço')).toBe(true);
  });

  it('oyuncunun eklediği kimlik oyunda kullanılır, ekleyene verilmez', async () => {
    const db = new Database(':memory:');
    const game = whoAmIServer({ db, contentDir: TEST_DIR });
    game.pool.addCustom({ name: 'Bizim Hasan', aliases: ['hasan'] }, 'ali');
    expect(game.pool.categories().find((c) => c.id === 'arkadas')!.count).toBe(1);
    const card = game.pool.cards(['arkadas'])[0]!;
    expect(matchesGuess(card, 'HASAN')).toBe(true);
    // Yalnızca arkadaş kartları + test: ali, kendi eklediği kartı almamalı.
    for (let i = 0; i < 10; i++) {
      const h = createHarness<WhoAmIView>(game, { players: ['ali', 'ayse'], settings: { categories: ['test', 'arkadas'] } });
      await h.start();
      expect((h.state as WhoAmIState).players.ali!.card.name).not.toBe('Bizim Hasan');
    }
  });

  it('POST /cards profil ister ve kartı listelemez', async () => {
    const { default: Fastify } = await import('fastify');
    const db = new Database(':memory:');
    const game = whoAmIServer({ db, contentDir: TEST_DIR });
    const app = Fastify();
    app.decorateRequest('profile', null);
    app.addHook('preHandler', async (req) => {
      (req as unknown as { profile: { id: string } | null }).profile = req.headers['x-profile'] ? { id: String(req.headers['x-profile']) } : null;
    });
    await app.register(async (s) => game.routes!(s), { prefix: '/api/games/who-am-i' });
    const anon = await app.inject({ method: 'POST', url: '/api/games/who-am-i/cards', payload: { name: 'Bizim Hasan' } });
    expect(anon.statusCode).toBe(401);
    const bad = await app.inject({ method: 'POST', url: '/api/games/who-am-i/cards', headers: { 'x-profile': 'ali' }, payload: { name: 'x' } });
    expect(bad.statusCode).toBe(400);
    const ok = await app.inject({ method: 'POST', url: '/api/games/who-am-i/cards', headers: { 'x-profile': 'ali' }, payload: { name: 'Bizim Hasan', aliases: ['hasan'] } });
    expect(ok.json()).toMatchObject({ ok: true });
    const cats = await app.inject({ method: 'GET', url: '/api/games/who-am-i/categories' });
    expect(cats.body).not.toContain('Hasan');
    expect(cats.json().categories.find((c: { id: string }) => c.id === 'arkadas').count).toBe(1);
    await app.close();
  });
});

describe('who-am-i: içerik dosyaları', () => {
  it('her dosya geçerli JSON ve boş ad yok', () => {
    for (const f of fs.readdirSync(CONTENT_DIR)) {
      const arr = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8')) as { n: string; a: string[] }[];
      expect(arr.every((c) => c.n.trim() && Array.isArray(c.a))).toBe(true);
    }
  });
});
