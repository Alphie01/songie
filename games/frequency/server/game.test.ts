import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { BANDS, scoreFor, sideOf, type FrequencyView } from '../shared/index.js';
import { DEFAULT_TIMING } from './game.js';
import { frequencyServer } from './index.js';

// Sabit rastgelelik: hedef her turda 50 (3 + floor(0.5 × 95)).
const game = () => frequencyServer({ db: new Database(':memory:'), random: () => 0.5 });

type H = Harness<FrequencyView>;

const TEAMS4 = { mode: 'teams', teams: { a: ['a1', 'a2'], b: ['b1', 'b2'] } };

async function teams4(extra: Record<string, unknown> = {}): Promise<H> {
  const h = createHarness<FrequencyView>(game(), {
    players: ['a1', 'a2', 'b1', 'b2'],
    hostId: 'b2',
    settings: { ...TEAMS4, ...extra },
  });
  await h.start();
  return h;
}

/** Tur başından kilide kadar: kart seç, ipucu ver, takım arkadaşı kadranı hedef + offset'e getirsin. */
async function toLocked(h: H, offset: number, viewer = 'a1'): Promise<{ psychic: string; target: number; dial: number }> {
  const v = h.view(viewer);
  const psychic = v.psychicId;
  const pv = h.view(psychic);
  if (pv.phase === 'pick') expect(await h.act(psychic, { type: 'pick', round: pv.roundId, cardId: pv.options![0]!.id })).toMatchObject({ ok: true });
  expect(await h.act(psychic, { type: 'clue', round: pv.roundId, text: 'deneme ipucu' })).toMatchObject({ ok: true });
  const target = h.view(psychic).target!;
  const dial = Math.max(0, Math.min(100, target + offset));
  const team = pv.teams[pv.team].filter((id) => id !== psychic);
  expect(await h.act(team[0]!, { type: 'dial', round: pv.roundId, value: dial })).toMatchObject({ ok: true });
  for (const id of team) {
    if (h.view(id).phase !== 'dial') break;
    expect(await h.act(id, { type: 'lock', round: pv.roundId })).toMatchObject({ ok: true });
  }
  return { psychic, target, dial };
}

const opp = (h: H, viewer = 'a1') => {
  const v = h.view(viewer);
  return v.teams[v.team === 'a' ? 'b' : 'a'][0]!;
};

describe('puan bantları', () => {
  it('sınır değerleri dahil', () => {
    expect(BANDS.map((b) => b.maxDistance)).toEqual([2, 6, 10]);
    expect(scoreFor(50, 50)).toBe(4);
    expect(scoreFor(52, 50)).toBe(4);
    expect(scoreFor(47.9, 50)).toBe(3);
    expect(scoreFor(52.1, 50)).toBe(3);
    expect(scoreFor(56, 50)).toBe(3);
    expect(scoreFor(56.1, 50)).toBe(2);
    expect(scoreFor(40, 50)).toBe(2);
    expect(scoreFor(39.9, 50)).toBe(0);
    expect(scoreFor(0, 100)).toBe(0);
    expect(sideOf(50, 40)).toBe('left');
    expect(sideOf(50, 60)).toBe('right');
    expect(sideOf(50, 50)).toBeNull();
  });
});

describe('frequency (harness)', () => {
  it('hedefi açıklamaya kadar yalnızca medyum görür', async () => {
    const h = await teams4();
    const v = h.view('a1');
    expect(v).toMatchObject({ phase: 'pick', team: 'a', psychicId: 'a1', role: 'psychic' });
    expect(v.target).toBeTypeOf('number');
    expect(v.options).toHaveLength(2);
    expect(h.view('a2')).toMatchObject({ role: 'dialer', target: null, options: null });
    expect(h.view('b1')).toMatchObject({ role: 'opponent', target: null, options: null });

    const { target } = await toLocked(h, 15);
    expect(h.view('b1').phase).toBe('side');
    // Açıklamadan önce medyum dışındaki herkese giden hiçbir görünümde hedef yok.
    for (const id of ['a2', 'b1', 'b2']) {
      const views = JSON.parse(h.seen(id)) as FrequencyView[];
      expect(views.length).toBeGreaterThan(2);
      for (const view of views) {
        expect(view.target).toBeNull();
        expect(view.options).toBeNull();
        expect(view.result).toBeNull();
      }
      expect(h.seen(id)).not.toContain('"target":' + target);
    }
    expect(await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' })).toMatchObject({ ok: true });
    expect(h.view('b2')).toMatchObject({ phase: 'reveal', target });
  });

  it('kadranı yalnızca medyumun takımı çevirir (medyum hariç) ve yayın ~10/sn ile birleştirilir', async () => {
    const h = await teams4({ cardChoice: false });
    const round = h.view('a1').roundId;
    expect(h.view('a1').phase).toBe('clue');
    // İpucu verilmeden kadran dönmez (gecikmiş hamle gibi yutulur).
    expect(await h.act('a2', { type: 'dial', round, value: 30 })).toMatchObject({ ok: true, stale: true });
    expect(h.view('b1').dial).toBe(50);
    await h.act('a1', { type: 'clue', round, text: '' });
    expect(h.view('b1')).toMatchObject({ phase: 'dial', clue: null });
    expect(await h.act('a1', { type: 'dial', round, value: 30 })).toMatchObject({ ok: false, error: expect.stringContaining('Medyum') });
    expect(await h.act('b1', { type: 'dial', round, value: 30 })).toMatchObject({ ok: false });
    expect(await h.act('b1', { type: 'lock', round })).toMatchObject({ ok: false });

    h.advance(1000);
    const before = (JSON.parse(h.seen('b1')) as unknown[]).length;
    for (let i = 0; i < 10; i++) expect(await h.act('a2', { type: 'dial', round, value: 20 + i })).toMatchObject({ ok: true });
    // İlk hareket hemen yayınlanır, gerisi birleştirilir.
    expect((JSON.parse(h.seen('b1')) as unknown[]).length).toBe(before + 1);
    expect(h.view('b1').dial).toBe(29);
    h.advance(DEFAULT_TIMING.dialPushMs);
    const views = JSON.parse(h.seen('b1')) as FrequencyView[];
    expect(views.length).toBe(before + 2);
    expect(views.at(-1)!.dial).toBe(29);
    expect(views.at(-1)!.dialBy).toBe('a2');
    // Sınır dışı değerler kırpılır; eski turun hamlesi yutulur.
    await h.act('a2', { type: 'dial', round, value: 140 });
    expect(h.view('b1').dial).toBe(100);
    expect(await h.act('a2', { type: 'dial', round: round - 1, value: 5 })).toMatchObject({ ok: true, stale: true });
  });

  it('çoğunluk onayı: kadran oynayınca onaylar sıfırlanır', async () => {
    const h = createHarness<FrequencyView>(game(), {
      players: ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'],
      settings: { mode: 'teams', teams: { a: ['a1', 'a2', 'a3'], b: ['b1', 'b2', 'b3'] }, majorityLock: true, cardChoice: false },
    });
    await h.start();
    const round = h.view('a1').roundId;
    await h.act('a1', { type: 'clue', round, text: 'ılık' });
    expect(h.view('a2').votesNeeded).toBe(2);
    await h.act('a2', { type: 'lock', round });
    expect(h.view('a3')).toMatchObject({ phase: 'dial', lockVotes: ['a2'] });
    await h.act('a3', { type: 'dial', round, value: 70 });
    expect(h.view('a2').lockVotes).toEqual([]);
    await h.act('a2', { type: 'lock', round });
    await h.act('a2', { type: 'unlock', round });
    expect(h.view('a2').lockVotes).toEqual([]);
    await h.act('a2', { type: 'lock', round });
    await h.act('a3', { type: 'lock', round });
    expect(h.view('a1')).toMatchObject({ phase: 'side', dial: 70 });
    // Bağlantısı kopan oyuncu çoğunluk hesabından düşer.
    expect(await h.act('b1', { type: 'side', round, side: 'right' })).toMatchObject({ ok: true });
    await h.act('a1', { type: 'next', round });
    const r2 = h.view('b1').roundId;
    await h.act('b1', { type: 'clue', round: r2, text: 'x' });
    h.setConnected('b3', false);
    expect(h.view('b2').votesNeeded).toBe(1);
    await h.act('b2', { type: 'lock', round: r2 });
    expect(h.view('b2').phase).toBe('side');
  });

  it('sağ-sol tahmini doğruysa rakibe +1, tam isabette puan yok', async () => {
    const h = await teams4();
    const { target, dial } = await toLocked(h, -15);
    expect(dial).toBeLessThan(target);
    await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'right' });
    expect(h.view('a1')).toMatchObject({ phase: 'reveal', scores: { a: 0, b: 1 } });
    expect(h.view('a1').result).toMatchObject({ points: 0, side: 'right', sidePoint: true });
    expect(h.view('a1').team).toBe('a');

    await h.act('b2', { type: 'next', round: h.view('b2').roundId });
    expect(h.view('a1')).toMatchObject({ phase: 'pick', team: 'b', psychicId: 'b1' });
    const r2 = await toLocked(h, 3, 'b2');
    expect(r2.psychic).toBe('b1');
    // Hedef kadranın solunda kaldı; rakip "sağda" dedi, yanlış.
    await h.act('a1', { type: 'side', round: h.view('a1').roundId, side: 'right' });
    expect(h.view('a1').result).toMatchObject({ points: 3, sidePoint: false });
    expect(h.view('a1').scores).toEqual({ a: 0, b: 4 });

    await h.act('a1', { type: 'next', round: h.view('a1').roundId });
    // a takımı: medyum a2 (sıra döndü), tam isabet. Rakip doğru tahmin etse bile puan almaz.
    expect(h.view('a1').psychicId).toBe('a2');
    await toLocked(h, 0, 'a1');
    await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' });
    expect(h.view('a1').result).toMatchObject({ points: 4, sidePoint: false });
  });

  it('yetişme kuralı: 4 alan takım gerideyse tekrar oynar', async () => {
    for (const catchUp of [true, false]) {
      const h = await teams4({ catchUp, targetScore: 30 });
      // Tur 1 (a): 0 puan, b doğru tahmin: 0-1
      await toLocked(h, 20);
      await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' });
      expect(h.view('a1').scores).toEqual({ a: 0, b: 1 });
      await h.act('a1', { type: 'next', round: h.view('a1').roundId });
      // Tur 2 (b): tam isabet ama önde, tekrar yok: 0-5
      await toLocked(h, 0);
      await h.act('a1', { type: 'side', round: h.view('a1').roundId, side: 'left' });
      expect(h.view('a1').scores).toEqual({ a: 0, b: 5 });
      expect(h.view('a1').result!.again).toBe(false);
      await h.act('a1', { type: 'next', round: h.view('a1').roundId });
      // Tur 3 (a): tam isabet, hâlâ geride: 4-5
      expect(h.view('a1').team).toBe('a');
      await toLocked(h, 1);
      await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' });
      expect(h.view('a1').scores).toEqual({ a: 4, b: 5 });
      expect(h.view('a1').result!.again).toBe(catchUp);
      await h.act('a1', { type: 'next', round: h.view('a1').roundId });
      expect(h.view('a1').team).toBe(catchUp ? 'a' : 'b');
    }
  });

  it('hedef puana ulaşan kazanır; podyum ve ctx.finish', async () => {
    const h = await teams4({ targetScore: 3 });
    await toLocked(h, 0);
    await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' });
    expect(h.view('b1')).toMatchObject({ phase: 'reveal', winner: 'a', scores: { a: 4, b: 0 } });
    h.advance(DEFAULT_TIMING.finalRevealMs);
    expect(h.view('b1').phase).toBe('podium');
    expect(h.finished).toBeNull();
    h.advance(DEFAULT_TIMING.podiumMs);
    expect(h.finished).toEqual(
      expect.arrayContaining([
        { playerId: 'a1', score: 4, meta: { team: 'a', won: true } },
        { playerId: 'b2', score: 0, meta: { team: 'b', won: false } },
      ]),
    );
  });

  it('aynı turda ikisi de hedefe eşit puanla ulaşırsa oyun sürer', async () => {
    const h = await teams4({ targetScore: 3 });
    (h.state as { scores: { a: number; b: number } }).scores = { a: 1, b: 2 };
    // a: 2 puan, b doğru tahmin: 3-3
    await toLocked(h, 8);
    await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' });
    expect(h.view('a1')).toMatchObject({ phase: 'reveal', scores: { a: 3, b: 3 }, winner: null });
    await h.act('a1', { type: 'next', round: h.view('a1').roundId });
    expect(h.view('a1')).toMatchObject({ phase: 'pick', team: 'b' });
  });

  it('birlikte modu: herkes tek takım, tur sonunda derece', async () => {
    const h = createHarness<FrequencyView>(game(), { players: ['p1', 'p2', 'p3'], settings: { mode: 'coop', rounds: 2 } });
    await h.start();
    expect(h.view('p2')).toMatchObject({ mode: 'coop', role: 'dialer', totalRounds: 2, teams: { a: ['p1', 'p2', 'p3'], b: [] } });
    // Tam isabet: yetişme kuralı birlikte modunda +1 tur verir; "sağda mı" aşaması yok.
    await toLocked(h, 0, 'p1');
    expect(h.view('p1')).toMatchObject({ phase: 'reveal', totalRounds: 3, scores: { a: 4, b: 0 } });
    await h.act('p3', { type: 'next', round: h.view('p3').roundId });
    expect(h.view('p1').psychicId).toBe('p2');
    expect(await h.act('p3', { type: 'side', round: h.view('p3').roundId, side: 'left' })).toMatchObject({ ok: true, stale: true });
    await toLocked(h, 30, 'p1');
    await h.act('p1', { type: 'next', round: h.view('p1').roundId });
    expect(h.view('p1').psychicId).toBe('p3');
    await toLocked(h, 5, 'p1');
    expect(h.view('p1')).toMatchObject({ phase: 'reveal', winner: 'coop', completed: 3, scores: { a: 7 } });
    await h.act('p1', { type: 'next', round: h.view('p1').roundId });
    expect(h.view('p1').phase).toBe('podium');
    h.advance(DEFAULT_TIMING.podiumMs);
    // Ek tur da paydaya girer: 7 / (3 oynanan tur × 4) = 0.58 → derece 2 ("Aynı kanaldasınız").
    expect(h.finished).toEqual([
      { playerId: 'p1', score: 7, meta: { mode: 'coop', rating: 2 } },
      { playerId: 'p2', score: 7, meta: { mode: 'coop', rating: 2 } },
      { playerId: 'p3', score: 7, meta: { mode: 'coop', rating: 2 } },
    ]);
  });

  it('takımlı modda her takımda en az 2 kişi ister', async () => {
    const h = createHarness<FrequencyView>(game(), { players: ['a1', 'b1', 'b2'], settings: { mode: 'teams', teams: { a: ['a1'], b: ['b1', 'b2'] } } });
    await expect(h.start()).rejects.toThrow(/en az 2/);
  });

  it('kopan medyumu oda sahibi atlar; sıradaki medyum bağlı olan', async () => {
    const h = createHarness<FrequencyView>(game(), {
      players: ['a1', 'a2', 'a3', 'b1', 'b2'],
      hostId: 'b2',
      settings: { mode: 'teams', teams: { a: ['a1', 'a2', 'a3'], b: ['b1', 'b2'] } },
    });
    await h.start();
    const round = h.view('a1').roundId;
    h.setConnected('a1', false);
    expect(await h.act('a2', { type: 'skipPsychic', round })).toMatchObject({ ok: false });
    expect(await h.act('b2', { type: 'skipPsychic', round })).toMatchObject({ ok: true });
    expect(h.view('b1')).toMatchObject({ phase: 'pick', team: 'a', psychicId: 'a2', scores: { a: 0, b: 0 } });
    expect(h.view('b1').roundId).toBe(round + 1);
    expect(await h.act('b2', { type: 'skipPsychic', round })).toMatchObject({ ok: true, stale: true });
    // Bir sonraki a turunda kopuk a1 atlanır.
    await toLocked(h, 30, 'b1');
    await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' });
    await h.act('b1', { type: 'next', round: h.view('b1').roundId });
    await toLocked(h, 30, 'a2');
    await h.act('a2', { type: 'side', round: h.view('a2').roundId, side: 'left' });
    await h.act('a2', { type: 'next', round: h.view('a2').roundId });
    expect(h.view('a2').psychicId).toBe('a3');
  });

  it('ipucundan önce ayrılan medyumun yerine takım arkadaşı geçer', async () => {
    const h = createHarness<FrequencyView>(game(), {
      players: ['a1', 'a2', 'a3', 'b1', 'b2'],
      settings: { mode: 'teams', teams: { a: ['a1', 'a2', 'a3'], b: ['b1', 'b2'] } },
    });
    await h.start();
    h.leave('a1');
    expect(h.view('b1')).toMatchObject({ phase: 'pick', team: 'a', psychicId: 'a2', teams: { a: ['a2', 'a3'] } });
  });

  it('süreli oyunda süre bitince kadran kendiliğinden kilitlenir', async () => {
    const h = await teams4({ seconds: 60, cardChoice: false });
    const round = h.view('a1').roundId;
    await h.act('a1', { type: 'clue', round, text: 'ipucu' });
    const v = h.view('a2');
    expect(v.endsAt - v.serverNow).toBe(60_000);
    await h.act('a2', { type: 'dial', round, value: 12 });
    h.advance(60_000);
    expect(h.view('b1')).toMatchObject({ phase: 'side', dial: 12 });
    h.advance(30_000);
    expect(h.view('b1')).toMatchObject({ phase: 'reveal' });
    expect(h.view('b1').result!.side).toBeNull();
  });

  it('oyunu bitir: yarım turun hedefi açıklanmaz, podyum sonra finish', async () => {
    const h = await teams4();
    const target = h.view('a1').target!;
    h.end();
    const v = h.view('b1');
    expect(v).toMatchObject({ phase: 'podium', winner: 'draw', target: null });
    expect(h.view('a1').target).toBeNull();
    expect(await h.act('a1', { type: 'next', round: v.roundId })).toMatchObject({ ok: true, stale: true });
    h.advance(DEFAULT_TIMING.podiumMs);
    expect(h.finished).toHaveLength(4);
    expect(target).toBeGreaterThanOrEqual(3);
  });

  it('oyun sırasında ayar değişikliği sıradaki turdan geçerli; kart seçimi kapanabilir', async () => {
    const h = await teams4();
    h.changeSettings({ cardChoice: false, mode: 'coop' });
    expect(h.view('a1')).toMatchObject({ mode: 'teams', phase: 'pick' });
    await toLocked(h, 30);
    await h.act('b1', { type: 'side', round: h.view('b1').roundId, side: 'left' });
    await h.act('b1', { type: 'next', round: h.view('b1').roundId });
    expect(h.view('b1')).toMatchObject({ phase: 'clue', options: null });
    expect(h.view('b1').card).not.toBeNull();
  });

  it('arkadaş kartı eklenir ve desteye karışır', () => {
    const g = game();
    const n = g.deck.cards(true).length;
    expect(n).toBeGreaterThanOrEqual(160);
    g.deck.addCustom({ left: 'Bizim ekip', right: 'Rakip ekip' }, 'u1');
    expect(g.deck.cards(true)).toHaveLength(n + 1);
    expect(g.deck.cards(false)).toHaveLength(n);
  });
});
