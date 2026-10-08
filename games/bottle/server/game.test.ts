import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { seatAngle, type BottleView } from '../shared/index.js';
import { bottleServer } from './index.js';

const TIMING = { leadMs: 100, spinMinMs: 1000, spinMaxMs: 1000, voteMs: 5000, podiumMs: 1000 };
const SPIN_TOTAL = TIMING.leadMs + TIMING.spinMaxMs;

/** Tekrarlanabilir rastgelelik (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setup(players: string[], settings: Record<string, unknown> = {}, seed = 1, db = new Database(':memory:')) {
  const game = bottleServer({
    db,
    contentDir: path.join(import.meta.dirname, 'test-content'),
    timing: TIMING,
    random: seeded(seed),
  });
  const h = createHarness<BottleView>(game, {
    players,
    settings: { categories: ['eglenceli'], vote: false, ...settings },
  });
  return { h, game };
}

/** Sıradaki kişi şişeyi çevirir ve animasyon biter; hedefi döner. */
async function spinToReveal(h: Harness<BottleView>): Promise<string> {
  const v = h.view('a');
  expect(await h.act(v.spinnerId, { type: 'spin', round: v.round })).toMatchObject({ ok: true });
  h.advance(SPIN_TOTAL);
  const target = h.view('a').targetId;
  expect(target).toBeTruthy();
  return target!;
}

async function playTurn(h: Harness<BottleView>, how: 'done' | 'pass' = 'done'): Promise<string> {
  const target = await spinToReveal(h);
  const v = h.view(target);
  if (v.phase === 'choose') expect(await h.act(target, { type: 'choose', round: v.round, kind: 'truth' })).toMatchObject({ ok: true });
  expect(await h.act(target, { type: how, round: v.round })).toMatchObject({ ok: true });
  return target;
}

describe('şişe çevirme ve hedef', () => {
  it('hedef asla çeviren değil, bağlantısı kopuk oyuncu da değil', async () => {
    const { h } = setup(['a', 'b', 'c', 'd'], { rounds: 0, order: 'round' }, 7);
    await h.start();
    h.setConnected('d', false);
    for (let i = 0; i < 40; i++) {
      const v = h.view('a');
      if (v.spinnerId === 'd') {
        await h.act('a', { type: 'skipSpinner', round: v.round });
        continue;
      }
      const spinner = v.spinnerId;
      const target = await playTurn(h);
      expect(target).not.toBe(spinner);
      expect(target).not.toBe('d');
    }
  });

  it('şişe animasyonun sonunda hedefin oturduğu açıda durur', async () => {
    const { h } = setup(['a', 'b', 'c', 'd', 'e'], {}, 3);
    await h.start();
    const v0 = h.view('a');
    await h.act(v0.spinnerId, { type: 'spin', round: v0.round });
    const spin = h.view('b').spin!;
    expect(spin.startAt).toBe(h.now + TIMING.leadMs);
    expect(spin.durationMs).toBe(TIMING.spinMaxMs);
    expect(spin.toDeg - spin.fromDeg).toBeGreaterThan(360 * 3);
    // Herkes aynı parametreleri alır.
    expect(h.view('c').spin).toEqual(spin);
    h.advance(SPIN_TOTAL);
    const v = h.view('a');
    const n = v.seats.length;
    const want = seatAngle(v.seats.indexOf(v.targetId!), n);
    const rest = ((spin.toDeg % 360) + 360) % 360;
    const diff = Math.min(Math.abs(rest - want), 360 - Math.abs(rest - want));
    expect(diff).toBeLessThan(180 / n);
    expect(v.restDeg).toBe(spin.toDeg);
  });

  it('gizlilik: animasyon bitmeden hedef ve soru görünümde yok', async () => {
    const { h } = setup(['a', 'b', 'c'], {}, 11);
    await h.start();
    const v0 = h.view('a');
    await h.act(v0.spinnerId, { type: 'spin', round: v0.round });
    expect(h.view('a').phase).toBe('spinning');
    for (const id of ['a', 'b', 'c']) {
      expect(h.view(id).targetId).toBeNull();
      expect(h.view(id).prompt).toBeNull();
      expect(h.seen(id)).not.toMatch(/"targetId":"[abc]"/);
    }
    h.advance(SPIN_TOTAL - 1);
    expect(h.view('a').targetId).toBeNull();
    h.advance(1);
    expect(h.view('a').targetId).toMatch(/^[abc]$/);
    expect(h.view('a').phase).toBe('choose');
  });

  it('son seçilenlerin olasılığı azalır (adil şişe)', async () => {
    const count = async (fairSpin: boolean) => {
      const { h } = setup(['a', 'b', 'c', 'd', 'e', 'f'], { rounds: 0, order: 'round', fairSpin }, 99);
      await h.start();
      let repeats = 0;
      const recent: string[] = [];
      for (let i = 0; i < 300; i++) {
        const t = await playTurn(h);
        if (recent.includes(t)) repeats++;
        recent.push(t);
        if (recent.length > 2) recent.shift();
      }
      return repeats;
    };
    expect(await count(true)).toBeLessThan(await count(false));
  });

  it('yalnızca sırası gelen ya da oda sahibi çevirebilir; çift tıklama yutulur', async () => {
    const { h } = setup(['a', 'b', 'c'], {}, 5);
    await h.start();
    const v = h.view('a');
    expect(v.spinnerId).toBe('a');
    expect(await h.act('b', { type: 'spin', round: v.round })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'spin', round: v.round })).toMatchObject({ ok: true });
    expect(await h.act('a', { type: 'spin', round: v.round })).toMatchObject({ ok: true, stale: true });
  });
});

describe('seçim modları', () => {
  it('oyuncu seçer: yalnızca hedef seçebilir, soru herkese görünür', async () => {
    const { h } = setup(['a', 'b', 'c'], { choice: 'player' }, 2);
    await h.start();
    const target = await spinToReveal(h);
    const other = ['a', 'b', 'c'].find((x) => x !== target)!;
    const r = h.view('a').round;
    expect(await h.act(other, { type: 'choose', round: r, kind: 'dare' })).toMatchObject({ ok: false });
    expect(await h.act(target, { type: 'choose', round: r, kind: 'dare' })).toMatchObject({ ok: true });
    for (const id of ['a', 'b', 'c']) {
      expect(h.view(id).kind).toBe('dare');
      expect(h.view(id).prompt?.text).toMatch(/^Test cesaret/);
    }
  });

  it('rastgele: seçim ekranı atlanır, tür sunucudan gelir', async () => {
    const { h } = setup(['a', 'b', 'c'], { choice: 'random' }, 4);
    await h.start();
    await spinToReveal(h);
    const v = h.view('b');
    expect(v.phase).toBe('task');
    expect(['truth', 'dare']).toContain(v.kind);
    expect(v.prompt).not.toBeNull();
  });

  it('seçili kategorilerde bir tür yoksa ayar geçersiz', () => {
    const { game } = setup(['a', 'b']);
    expect(game.validateSettings!({ ...game.defaultSettings, categories: ['ask'] })).toMatch(/cesaret/);
    expect(game.validateSettings!({ ...game.defaultSettings, categories: ['eglenceli'] })).toBeNull();
  });

  it('oyuncunun eklediği soru kendi kategorisinde gelir', async () => {
    const db = new Database(':memory:');
    const { game } = setup(['a', 'b'], {}, 1, db);
    game.bank.addCustom({ kind: 'truth', text: 'Arkadaşımın özel sorusu?' }, 'p1');
    expect(game.bank.prompts(['oyuncular'], 'truth').map((p) => p.text)).toEqual(['Arkadaşımın özel sorusu?']);
    expect(game.bank.categories().find((c) => c.id === 'oyuncular')).toMatchObject({ truth: 1, dare: 0 });
  });
});

describe('pas hakkı', () => {
  it('pas hakkı sınırlı ve puan düşürür', async () => {
    const { h } = setup(['a', 'b'], { passes: 1, passPenalty: true, rounds: 0 }, 6);
    await h.start();
    // İki kişide hedef hep diğeri; klasik sırada çeviren değişir.
    const t1 = await playTurn(h, 'pass');
    expect(h.view('a').scores[t1]).toMatchObject({ points: -1, passes: 1 });
    expect(h.view('a').lastResult).toMatchObject({ targetId: t1, outcome: 'pass' });
    await playTurn(h, 'done'); // diğeri
    const t3 = await spinToReveal(h);
    expect(t3).toBe(t1);
    const r = h.view('a').round;
    await h.act(t3, { type: 'choose', round: r, kind: 'truth' });
    expect(h.view(t3).passesLeft).toBe(0);
    expect(await h.act(t3, { type: 'pass', round: r })).toMatchObject({ ok: false, error: expect.stringMatching(/Pas hakkın bitti/) });
    expect(await h.act(t3, { type: 'done', round: r })).toMatchObject({ ok: true });
    expect(h.view('a').scores[t1]).toMatchObject({ points: 0, done: 1, passes: 1 });
  });

  it('sınırsız pas ve cezasız mod', async () => {
    const { h } = setup(['a', 'b'], { passes: -1, passPenalty: false, rounds: 0 }, 6);
    await h.start();
    for (let i = 0; i < 6; i++) await playTurn(h, 'pass');
    expect(h.view('a').scores.a!.points).toBe(0);
    expect(h.view('a').scores.a!.passes + h.view('a').scores.b!.passes).toBe(6);
  });
});

describe('oylama', () => {
  it('çoğunluk evet derse puan, hayır derse puan yok; hedef oy veremez', async () => {
    const { h } = setup(['a', 'b', 'c', 'd'], { vote: true, rounds: 0 }, 8);
    await h.start();
    const target = await spinToReveal(h);
    const others = ['a', 'b', 'c', 'd'].filter((x) => x !== target);
    let r = h.view('a').round;
    await h.act(target, { type: 'choose', round: r, kind: 'truth' });
    await h.act(target, { type: 'done', round: r });
    expect(h.view('a').phase).toBe('vote');
    expect(h.view(target).vote?.canVote).toBe(false);
    expect(await h.act(target, { type: 'vote', round: r, yes: true })).toMatchObject({ ok: false });
    await h.act(others[0]!, { type: 'vote', round: r, yes: false });
    await h.act(others[1]!, { type: 'vote', round: r, yes: false });
    expect(h.view(others[0]!).vote).toMatchObject({ yes: 0, no: 2, myVote: false });
    await h.act(others[2]!, { type: 'vote', round: r, yes: true });
    expect(h.view('a').phase).toBe('spin');
    expect(h.view('a').lastResult).toMatchObject({ outcome: 'failed', votes: { yes: 1, no: 2 } });
    expect(h.view('a').scores[target]).toMatchObject({ points: 0, failed: 1 });

    const t2 = await spinToReveal(h);
    r = h.view('a').round;
    await h.act(t2, { type: 'choose', round: r, kind: 'dare' });
    await h.act(t2, { type: 'done', round: r });
    const voter = ['a', 'b', 'c', 'd'].find((x) => x !== t2)!;
    await h.act(voter, { type: 'vote', round: r, yes: true });
    // Süre dolunca verilen oylarla karar verilir.
    h.advance(TIMING.voteMs);
    expect(h.view('a').lastResult).toMatchObject({ outcome: 'done', votes: { yes: 1, no: 0 } });
    expect(h.view('a').scores[t2]!.done).toBe(1);
  });

  it('oylama kapalıysa "Yaptım" doğrudan puan verir', async () => {
    const { h } = setup(['a', 'b', 'c'], { vote: false }, 8);
    await h.start();
    const t = await playTurn(h);
    expect(h.view('a').scores[t]).toMatchObject({ points: 1, done: 1 });
  });
});

describe('sıra modları', () => {
  it('klasik: sıradaki çeviren hedef olan kişi', async () => {
    const { h } = setup(['a', 'b', 'c', 'd'], { order: 'target', rounds: 0 }, 12);
    await h.start();
    for (let i = 0; i < 5; i++) {
      const t = await playTurn(h);
      expect(h.view('a').spinnerId).toBe(t);
    }
  });

  it('sırayla: masadaki oturma sırasıyla döner', async () => {
    const { h } = setup(['a', 'b', 'c', 'd'], { order: 'round', rounds: 0 }, 12);
    await h.start();
    const seats = h.view('a').seats;
    for (let i = 0; i < 6; i++) {
      const spinner = h.view('a').spinnerId;
      await playTurn(h);
      expect(h.view('a').spinnerId).toBe(seats[(seats.indexOf(spinner) + 1) % seats.length]);
    }
  });

  it('kopuk çeviren: oda sahibi atlar; hedef koparsa tur puansız geçilir', async () => {
    const { h } = setup(['a', 'b', 'c'], { order: 'target', rounds: 0 }, 13);
    await h.start();
    const t = await playTurn(h); // t artık çeviren
    expect(h.view('a').spinnerId).toBe(t);
    h.setConnected(t, false);
    const host = 'a' === t ? 'b' : 'a';
    if (host !== 'a') h.setHost(host);
    const notHost = ['a', 'b', 'c'].find((x) => x !== t && x !== host)!;
    let r = h.view(host).round;
    expect(await h.act(notHost, { type: 'skipSpinner', round: r })).toMatchObject({ ok: false });
    expect(await h.act(host, { type: 'skipSpinner', round: r })).toMatchObject({ ok: true });
    expect(h.view(host).spinnerId).not.toBe(t);

    const t2 = await spinToReveal(h);
    expect(t2).not.toBe(t);
    h.setConnected(t2, false);
    r = h.view(host).round;
    const doneBefore = h.view(host).turnNumber;
    expect(await h.act(host, { type: 'skipTurn', round: r })).toMatchObject({ ok: true });
    expect(h.view(host)).toMatchObject({ phase: 'spin', turnNumber: doneBefore });
    expect(h.view(host).lastResult?.outcome).toBe('skipped');
  });

  it('hedef odadan çıkarsa tur geçilir, oyun kilitlenmez', async () => {
    const { h } = setup(['a', 'b', 'c'], { rounds: 0 }, 14);
    await h.start();
    const t = await spinToReveal(h);
    h.leave(t);
    expect(h.view(t === 'a' ? 'b' : 'a').phase).toBe('spin');
    expect(h.view(t === 'a' ? 'b' : 'a').seats).not.toContain(t);
  });

  it('yeni gelen masaya oturur', async () => {
    const { h } = setup(['a', 'b'], {}, 1);
    await h.start();
    h.join('z');
    expect(h.view('z').seats).toContain('z');
    expect(h.view('z').scores.z).toMatchObject({ points: 0 });
  });
});

describe('oyun sonu', () => {
  it('tur sayısı dolunca podyum, sonra sonuçlar', async () => {
    const { h } = setup(['a', 'b', 'c'], { rounds: 10 }, 21);
    await h.start();
    for (let i = 0; i < 10; i++) await playTurn(h);
    expect(h.view('a').phase).toBe('podium');
    expect(h.finished).toBeNull();
    h.advance(TIMING.podiumMs);
    const res = h.finished!;
    expect(res).toHaveLength(3);
    expect(res.reduce((n, r) => n + r.score, 0)).toBe(10);
  });

  it('oda sahibi "Oyunu bitir" der', async () => {
    const { h } = setup(['a', 'b', 'c'], { rounds: 0 }, 22);
    await h.start();
    await playTurn(h);
    await spinToReveal(h);
    h.end();
    expect(h.view('a').phase).toBe('podium');
    expect(h.view('a').prompt).toBeNull();
    expect(await h.act('a', { type: 'spin', round: h.view('a').round })).toMatchObject({ ok: false });
    h.advance(TIMING.podiumMs);
    expect(h.finished?.map((r) => r.playerId).sort()).toEqual(['a', 'b', 'c']);
  });

  it('oyun sırasında tur sayısı değişebilir', async () => {
    const { h } = setup(['a', 'b'], { rounds: 0 }, 23);
    await h.start();
    await playTurn(h);
    await playTurn(h);
    h.changeSettings({ rounds: 10 });
    expect(h.view('a').totalRounds).toBe(10);
  });
});

describe('hazır içerik', () => {
  it('en az 130 doğruluk ve 130 cesaret, beş kategori, tekrar yok', () => {
    const game = bottleServer({ db: new Database(':memory:') });
    const cats = game.bank.categories();
    expect(cats.map((c) => c.id)).toEqual(['eglenceli', 'arkadaslar', 'ask', 'utanc', 'cesur', 'oyuncular']);
    const ids = cats.map((c) => c.id);
    const truths = game.bank.prompts(ids, 'truth');
    const dares = game.bank.prompts(ids, 'dare');
    expect(truths.length).toBeGreaterThanOrEqual(130);
    expect(dares.length).toBeGreaterThanOrEqual(130);
    const texts = [...truths, ...dares].map((p) => p.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(game.validateSettings!(game.defaultSettings)).toBeNull();
  });
});
