import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import { CUSTOM_CATEGORY, type FiveSecondsView } from '../shared/index.js';
import { fiveSecondsServer } from './index.js';

const TIMING = { voteMs: 20_000, podiumMs: 5_000, awayMs: 8_000, tickMs: 1_000 };
const game = () => fiveSecondsServer({ db: new Database(':memory:'), timing: TIMING });

function setup(players = ['a', 'b', 'c'], settings: Record<string, unknown> = {}) {
  const g = game();
  const h = createHarness<FiveSecondsView>(g, { players, settings });
  return { g, h };
}

/** Sıradaki oyuncu Hazırım der, süre biter. */
async function perform(h: ReturnType<typeof setup>['h'], seconds = 5) {
  const v = h.view('a');
  expect(await h.act(v.performerId, { type: 'ready', attemptId: v.attemptId })).toMatchObject({ ok: true });
  h.advance(seconds * 1000);
  expect(h.view('a').phase).toBe('vote');
  return h.view('a');
}

async function voteAll(h: ReturnType<typeof setup>['h'], success: boolean | Record<string, boolean>) {
  const v = h.view('a');
  for (const id of v.voters) {
    const s = typeof success === 'boolean' ? success : (success[id] ?? true);
    expect(await h.act(id, { type: 'vote', attemptId: v.attemptId, success: s })).toMatchObject({ ok: true });
  }
}

describe('five-seconds içerik', () => {
  it('en az 260 hazır görev ve beklenen kategoriler var', () => {
    const g = game();
    const cats = g.bank.categories();
    const builtIn = cats.filter((c) => c.id !== CUSTOM_CATEGORY);
    expect(builtIn.map((c) => c.id).sort()).toEqual(['ask', 'cesur', 'genel', 'is-okul', 'pop-kultur', 'sacma', 'turkiye', 'yemek']);
    expect(builtIn.reduce((n, c) => n + c.count, 0)).toBeGreaterThanOrEqual(260);
    for (const p of g.bank.prompts(builtIn.map((c) => c.id))) expect(p.text).toMatch(/^3 .+ söyle/);
  });

  it('oyuncu görevi eklenir, sayılır ama listelenmez', () => {
    const g = game();
    g.bank.addCustom({ text: '3 gizli arkadaş görevi söyle' }, 'p1');
    const custom = g.bank.categories().find((c) => c.id === CUSTOM_CATEGORY)!;
    expect(custom.count).toBe(1);
    expect(JSON.stringify(g.bank.categories())).not.toContain('gizli arkadaş');
    expect(g.bank.prompts([CUSTOM_CATEGORY])[0]!.text).toBe('3 gizli arkadaş görevi söyle');
  });
});

describe('five-seconds akış', () => {
  it('görev Hazırım’dan önce kimseye gitmez, sonra herkes aynı görevi görür', async () => {
    const { g, h } = setup();
    await h.start();
    expect(h.view('a')).toMatchObject({ phase: 'ready', performerId: 'a', prompt: null, round: 1 });
    const all = g.bank.prompts(['genel', 'ask', 'is-okul', 'yemek', 'turkiye', 'pop-kultur', 'sacma', 'cesur']);
    for (const id of ['a', 'b', 'c']) for (const p of all) expect(h.seen(id)).not.toContain(p.text);

    expect(await h.act('b', { type: 'ready', attemptId: h.view('a').attemptId })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'ready', attemptId: h.view('a').attemptId })).toMatchObject({ ok: true });
    const text = h.view('a').prompt!.text;
    expect(h.view('b').prompt!.text).toBe(text);
    expect(h.view('c')).toMatchObject({ phase: 'countdown', durationMs: 5000 });
  });

  it('süre ayara göre biter (7 sn), "Söyledim" erken bitirir', async () => {
    const { h } = setup(['a', 'b', 'c'], { seconds: 7 });
    await h.start();
    await h.act('a', { type: 'ready', attemptId: h.view('a').attemptId });
    h.advance(6_999);
    expect(h.view('a').phase).toBe('countdown');
    h.advance(1);
    expect(h.view('a').phase).toBe('vote');
    await voteAll(h, true);
    // b erken bitirir
    const v = h.view('b');
    await h.act('b', { type: 'ready', attemptId: v.attemptId });
    expect(await h.act('c', { type: 'done', attemptId: v.attemptId })).toMatchObject({ ok: false });
    expect(await h.act('b', { type: 'done', attemptId: v.attemptId })).toMatchObject({ ok: true });
    expect(h.view('a').phase).toBe('vote');
  });

  it('sıra döner, tur sayısı dolunca podyum ve ctx.finish', async () => {
    const { h } = setup(['a', 'b', 'c'], { rounds: 3 });
    await h.start();
    const seen: string[] = [];
    for (let i = 0; i < 9; i++) {
      seen.push(h.view('a').performerId);
      await perform(h);
      await voteAll(h, i % 2 === 0);
    }
    expect(seen).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c']);
    expect(h.view('a').phase).toBe('podium');
    expect(h.finished).toBeNull();
    h.advance(TIMING.podiumMs);
    // i çift olanlar başardı: 0,2,4,6,8 → a,c,b,a,c
    expect(h.finished).toEqual(
      expect.arrayContaining([
        { playerId: 'a', score: 2 },
        { playerId: 'b', score: 1 },
        { playerId: 'c', score: 2 },
      ]),
    );
  });

  it('oylama: çoğunluk kazanır, beraberlikte başardı sayılır, kendine oy yok', async () => {
    const { h } = setup(['a', 'b', 'c', 'd']);
    await h.start();
    let v = await perform(h);
    expect(v.voters.sort()).toEqual(['b', 'c', 'd']);
    expect(await h.act('a', { type: 'vote', attemptId: v.attemptId, success: true })).toMatchObject({ ok: false });
    await voteAll(h, { b: false, c: false, d: true });
    expect(h.view('a').lastResult).toMatchObject({ performerId: 'a', success: false, yes: 1, no: 2 });
    expect(h.view('a').scores.a).toBe(0);

    // b: 2 evet 1 hayır → başardı
    v = await perform(h);
    await h.act('a', { type: 'vote', attemptId: v.attemptId, success: true });
    // oy değiştirilebilir, ne verildiği diğerlerine gitmez
    await h.act('c', { type: 'vote', attemptId: v.attemptId, success: true });
    expect(h.view('d').voted.sort()).toEqual(['a', 'c']);
    expect(h.view('d').myVote).toBeNull();
    expect(h.view('c').myVote).toBe(true);
    await h.act('c', { type: 'vote', attemptId: v.attemptId, success: false });
    await h.act('d', { type: 'vote', attemptId: v.attemptId, success: true });
    expect(h.view('a').lastResult).toMatchObject({ performerId: 'b', success: true, yes: 2, no: 1 });
    expect(h.view('a').scores.b).toBe(1);

    // c: süre dolar, 1 evet 1 hayır → beraberlik → başardı
    v = await perform(h);
    await h.act('a', { type: 'vote', attemptId: v.attemptId, success: true });
    await h.act('b', { type: 'vote', attemptId: v.attemptId, success: false });
    expect(h.view('a').phase).toBe('vote');
    h.advance(TIMING.voteMs);
    expect(h.view('a').lastResult).toMatchObject({ performerId: 'c', success: true, yes: 1, no: 1 });
    expect(h.view('a').scores.c).toBe(1);

    // eski denemeye gelen oy yutulur
    expect(await h.act('a', { type: 'vote', attemptId: v.attemptId, success: false })).toMatchObject({ ok: true, stale: true });
  });

  it('çalma kuralı: başaramazsa sıradaki oyuncu aynı görevi aynı sürede dener', async () => {
    const { h } = setup(['a', 'b', 'c'], { steal: true, seconds: 10 });
    await h.start();
    const first = await perform(h, 10);
    const text = first.prompt!.text;
    await voteAll(h, false);
    let v = h.view('c');
    expect(v).toMatchObject({ phase: 'ready', performerId: 'b', stealFrom: 'a' });
    expect(v.prompt!.text).toBe(text);
    expect(await h.act('b', { type: 'ready', attemptId: v.attemptId })).toMatchObject({ ok: true });
    expect(h.view('a')).toMatchObject({ phase: 'countdown', durationMs: 10_000 });
    expect(h.view('a').prompt!.text).toBe(text);
    h.advance(10_000);
    expect(h.view('a').voters.sort()).toEqual(['a', 'c']);
    await voteAll(h, true);
    v = h.view('a');
    expect(v.scores).toMatchObject({ a: 0, b: 1, c: 0 });
    expect(v.lastResult).toMatchObject({ steal: true, scorerId: 'b', success: true });
    // sıra kaldığı yerden: b'nin kendi sırası, yeni gizli görev
    expect(v).toMatchObject({ phase: 'ready', performerId: 'b', stealFrom: null, prompt: null });

    // çalma da başarısızsa ikinci çalma yok
    await perform(h, 10);
    await voteAll(h, false);
    expect(h.view('a')).toMatchObject({ performerId: 'c', stealFrom: 'b' });
    await perform(h, 10);
    await voteAll(h, false);
    expect(h.view('a')).toMatchObject({ performerId: 'c', stealFrom: null });
  });

  it('çalma kapalıyken başarısız deneme doğrudan sıradakine geçer', async () => {
    const { h } = setup();
    await h.start();
    await perform(h);
    await voteAll(h, false);
    expect(h.view('a')).toMatchObject({ performerId: 'b', stealFrom: null });
  });

  it('takım modu: sıra takımlar arasında döner, puan takıma yazılır, çalma rakip takıma gider', async () => {
    const { h } = setup(['a1', 'a2', 'b1', 'b2'], { teamMode: true, steal: true, teams: { a: ['a1', 'a2'], b: ['b1', 'b2'] }, rounds: 1 });
    await h.start();
    let v = h.view<FiveSecondsView>('a1');
    expect(v.order).toEqual(['a1', 'b1', 'a2', 'b2']);
    expect(v.myTeam).toBe('a');
    expect(h.view('b2').myTeam).toBe('b');

    // a1 başarır
    let att = h.view('a1');
    await h.act('a1', { type: 'ready', attemptId: att.attemptId });
    h.advance(5000);
    for (const id of ['a2', 'b1', 'b2']) await h.act(id, { type: 'vote', attemptId: att.attemptId, success: true });
    expect(h.view('a1').teamScores).toEqual({ a: 1, b: 0 });

    // b1 başaramaz → çalma a2'de (rakip takımın sıradaki oyuncusu)
    att = h.view('a1');
    expect(att.performerId).toBe('b1');
    await h.act('b1', { type: 'ready', attemptId: att.attemptId });
    h.advance(5000);
    for (const id of ['a1', 'a2', 'b2']) await h.act(id, { type: 'vote', attemptId: att.attemptId, success: false });
    v = h.view('a1');
    expect(v).toMatchObject({ performerId: 'a2', stealFrom: 'b1' });
    await h.act('a2', { type: 'ready', attemptId: v.attemptId });
    h.advance(5000);
    for (const id of ['a1', 'b1', 'b2']) await h.act(id, { type: 'vote', attemptId: v.attemptId, success: true });
    expect(h.view('a1').teamScores).toEqual({ a: 2, b: 0 });

    h.end();
    h.advance(TIMING.podiumMs);
    expect(h.finished).toEqual(
      expect.arrayContaining([
        { playerId: 'a1', score: 2, meta: { team: 'a', own: 1 } },
        { playerId: 'a2', score: 2, meta: { team: 'a', own: 1 } },
        { playerId: 'b1', score: 0, meta: { team: 'b', own: 0 } },
      ]),
    );
  });

  it('takım modunda takım başına 2 kişiden azsa başlamaz', async () => {
    const { h } = setup(['a', 'b', 'c'], { teamMode: true });
    await expect(h.start()).rejects.toThrow(/en az 2/);
  });

  it('kopan oyuncunun sırası atlanır, kopanlar oylamada beklenmez', async () => {
    const { h } = setup(['a', 'b', 'c', 'd']);
    await h.start();
    // a hazırlanırken bağlantısı kopar → bir süre sonra sıra b'ye geçer
    h.setConnected('a', false);
    h.advance(TIMING.awayMs + 2 * TIMING.tickMs);
    expect(h.view('b')).toMatchObject({ phase: 'ready', performerId: 'b' });
    expect(h.view('b').lastResult).toMatchObject({ performerId: 'a', skipped: true });

    // b oynar; a kopuk olduğu için beklenmez
    const v = await perform(h);
    expect(v.voters.sort()).toEqual(['c', 'd']);
    await h.act('c', { type: 'vote', attemptId: v.attemptId, success: false });
    // d de koparsa sonuç hemen (bir sonraki kontrolde) açıklanır
    h.setConnected('d', false);
    h.advance(TIMING.tickMs);
    expect(h.view('b').lastResult).toMatchObject({ performerId: 'b', success: false });
    // sıradaki c (d kopuk; d'den sonra a da kopuk)
    expect(h.view('b').performerId).toBe('c');
    await perform(h);
    await voteAll(h, true);
    // d ve a kopuk → doğrudan b
    expect(h.view('b')).toMatchObject({ performerId: 'b', round: 2 });
  });

  it('oda sahibi görevi değiştirir ve sırayı atlar; diğerleri yapamaz', async () => {
    const { h } = setup(['a', 'b', 'c'], { steal: false });
    await h.start();
    // a'nın sırası; görev açılmadan değiştirilemez
    let v = h.view('a');
    expect(await h.act('a', { type: 'swap', attemptId: v.attemptId })).toMatchObject({ ok: false });
    expect(await h.act('b', { type: 'skip', attemptId: v.attemptId })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'skip', attemptId: v.attemptId })).toMatchObject({ ok: true });
    v = h.view('a');
    expect(v.performerId).toBe('b');

    // oda sahibi b yerine Hazırım'a basabilir
    await h.act('a', { type: 'ready', attemptId: v.attemptId });
    const before = h.view('a').prompt!.id;
    h.advance(3000);
    expect(await h.act('c', { type: 'swap', attemptId: v.attemptId })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'swap', attemptId: v.attemptId })).toMatchObject({ ok: true });
    const after = h.view('b');
    expect(after.prompt!.id).not.toBe(before);
    expect(after.phase).toBe('countdown');
    // süre baştan başladı
    h.advance(4000);
    expect(h.view('a').phase).toBe('countdown');
    h.advance(1000);
    expect(h.view('a').phase).toBe('vote');
  });

  it('sınırsız turda oda sahibi oyunu bitirir: podyum, sonra finish', async () => {
    const { h } = setup(['a', 'b'], { rounds: 0 });
    await h.start();
    for (let i = 0; i < 6; i++) {
      await perform(h);
      await voteAll(h, true);
    }
    expect(h.view('a')).toMatchObject({ phase: 'ready', round: 4, totalRounds: null });
    h.end();
    expect(h.view('a').phase).toBe('podium');
    expect(await h.act('a', { type: 'ready', attemptId: h.view('a').attemptId })).toMatchObject({ ok: false });
    h.advance(TIMING.podiumMs);
    expect(h.finished).toEqual(expect.arrayContaining([{ playerId: 'a', score: 3 }, { playerId: 'b', score: 3 }]));
  });

  it('sonradan katılan oyuncu sıraya eklenir; ayar değişikliği sıradaki denemeden geçerli', async () => {
    const { h } = setup(['a', 'b']);
    await h.start();
    h.join('z');
    expect(h.view('z').order).toEqual(['a', 'b', 'z']);
    h.changeSettings({ seconds: 10 });
    await perform(h, 10);
    await voteAll(h, true);
    expect(h.view('a').performerId).toBe('b');
  });
});
