import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { COLORS, type Card, type CardColor, type CardValue, type ColorCardsView } from '../shared/index.js';
import { buildDeck, colorCardsServer, deal, handPoints, seededRng, type ColorCardsState } from './index.js';

const ROUND = 8_000;
const PODIUM = 5_000;

function setup(players: string[], settings: Record<string, unknown> = {}, seed = 7) {
  return createHarness<ColorCardsView>(colorCardsServer({ random: seededRng(seed), timing: { roundMs: ROUND, podiumMs: PODIUM } }), {
    players,
    settings,
  });
}

async function started(players = ['a', 'b', 'c'], settings: Record<string, unknown> = {}, seed = 7) {
  const h = setup(players, settings, seed);
  await h.start();
  return h;
}

const st = (h: Harness<ColorCardsView>) => h.state as ColorCardsState;

const COLOR_OF: Record<string, CardColor> = { g: 'green', y: 'yellow', r: 'red', p: 'purple' };
let seq = 0;
/** "g5", "rS" (Atla), "yR" (Yön), "p+2", "W" (Renk seç), "W4" (+4). */
function c(code: string): Card {
  const id = `t${++seq}`;
  if (code === 'W') return { id, color: null, value: 'wild' };
  if (code === 'W4') return { id, color: null, value: 'wild4' };
  const color = COLOR_OF[code[0]!]!;
  const rest = code.slice(1);
  const value: CardValue = rest === 'S' ? 'skip' : rest === 'R' ? 'reverse' : rest === '+2' ? 'draw2' : (rest as CardValue);
  return { id, color, value };
}

/** Elleri, desteyi, açık kartı ve sırayı elle kur. */
function arrange(
  h: Harness<ColorCardsView>,
  o: { hands?: Record<string, string[]>; deck?: string[]; top?: string; color?: CardColor; current?: string; dir?: 1 | -1 },
) {
  const s = st(h);
  if (o.hands) for (const [id, codes] of Object.entries(o.hands)) s.hands[id] = codes.map(c);
  if (o.deck) s.deck = o.deck.map(c);
  if (o.top) {
    const t = c(o.top);
    s.discard = [t];
    s.activeColor = t.color ?? o.color ?? 'green';
  }
  if (o.color) s.activeColor = o.color;
  if (o.dir) s.dir = o.dir;
  s.current = o.current ?? s.current;
  s.phase = 'play';
  s.penalty = 0;
  s.challenge = null;
  s.drew = false;
  s.drawnId = null;
  s.exposed = null;
  s.called = {};
  s.step++;
  h.ctx.pushViews();
}

const hand = (h: Harness<ColorCardsView>, id: string) => st(h).hands[id]!;
const find = (h: Harness<ColorCardsView>, id: string, color: CardColor | null, value: CardValue) =>
  hand(h, id).find((x) => x.color === color && x.value === value)!.id;
const play = (h: Harness<ColorCardsView>, id: string, color: CardColor | null, value: CardValue, extra: Record<string, unknown> = {}) =>
  h.act(id, { type: 'play', cardId: find(h, id, color, value), ...extra });
const draw = (h: Harness<ColorCardsView>, id: string) => h.act(id, { type: 'draw', step: h.view(id).step });
const pass = (h: Harness<ColorCardsView>, id: string) => h.act(id, { type: 'pass', step: h.view(id).step });
const decide = (h: Harness<ColorCardsView>, id: string, type: 'challenge' | 'accept') => h.act(id, { type, step: h.view(id).step });

describe('deste ve dağıtım', () => {
  it('108 kart: renk başına bir 0, ikişer 1–9/Atla/Yön/+2; 4 Renk seç, 4 +4', () => {
    const d = buildDeck();
    expect(d).toHaveLength(108);
    for (const color of COLORS) {
      const mine = d.filter((x) => x.color === color);
      expect(mine).toHaveLength(25);
      expect(mine.filter((x) => x.value === '0')).toHaveLength(1);
      for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'] as CardValue[]) {
        expect(mine.filter((x) => x.value === v)).toHaveLength(2);
      }
    }
    expect(d.filter((x) => x.value === 'wild' && x.color === null)).toHaveLength(4);
    expect(d.filter((x) => x.value === 'wild4' && x.color === null)).toHaveLength(4);
  });

  it.each([2, 4, 10])('%i oyuncuya 7’şer kart; kimlikler benzersiz', (n) => {
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    const { hands, deck } = deal(ids, seededRng(n));
    for (const id of ids) expect(hands[id]).toHaveLength(7);
    expect(deck.length + n * 7).toBe(108);
    const all = [...deck, ...Object.values(hands).flat()];
    expect(new Set(all.map((x) => x.id)).size).toBe(108);
  });

  it('aynı tohum aynı dağıtım (deterministik)', () => {
    expect(deal(['a', 'b'], seededRng(1))).toEqual(deal(['a', 'b'], seededRng(1)));
    expect(deal(['a', 'b'], seededRng(1))).not.toEqual(deal(['a', 'b'], seededRng(2)));
  });

  it('oyun başında herkesin eli 7, açık kart 1, toplam 108', async () => {
    const h = await started(['a', 'b', 'c', 'd']);
    const s = st(h);
    const total = s.deck.length + s.discard.length + Object.values(s.hands).flat().length;
    expect(total).toBe(108);
    expect(h.view('a').top).not.toBeNull();
  });

  it('2 kişiden az olmaz', async () => {
    await expect(setup(['a']).start()).rejects.toThrow(/En az 2/);
  });
});

describe('açılış kartı', () => {
  /** Açılış kartı istenen değer olan bir tohum bul (dağıtıcı seçimi + karıştırma ile aynı sırada). */
  function seedFor(value: CardValue, players: string[]): number {
    for (let seed = 1; seed < 5000; seed++) {
      const rng = seededRng(seed);
      rng();
      const { deck } = deal(players, rng);
      if (deck[0]!.value === value) return seed;
    }
    throw new Error('tohum bulunamadı');
  }
  const players = ['a', 'b', 'c'];

  it('Atla: ilk oyuncu atlanır', async () => {
    const h = await started(players, {}, seedFor('skip', players));
    const s = st(h);
    const p1 = s.order[(s.order.indexOf(s.dealer) + 1) % 3]!;
    expect(s.current).toBe(s.order[(s.order.indexOf(p1) + 1) % 3]);
  });

  it('Yön değiştir: dağıtıcı başlar, yön ters', async () => {
    const h = await started(players, {}, seedFor('reverse', players));
    const s = st(h);
    expect(s.current).toBe(s.dealer);
    expect(s.dir).toBe(-1);
  });

  it('+2: ilk oyuncu 2 çeker ve atlanır', async () => {
    const h = await started(players, {}, seedFor('draw2', players));
    const s = st(h);
    const p1 = s.order[(s.order.indexOf(s.dealer) + 1) % 3]!;
    expect(s.hands[p1]).toHaveLength(9);
    expect(s.current).not.toBe(p1);
  });

  it('Renk seç: ilk oyuncu rengi seçer', async () => {
    const h = await started(players, {}, seedFor('wild', players));
    const s = st(h);
    const p1 = s.order[(s.order.indexOf(s.dealer) + 1) % 3]!;
    expect(s.phase).toBe('color');
    expect(s.current).toBe(p1);
    const other = players.find((x) => x !== p1)!;
    expect(await h.act(other, { type: 'pickColor', color: 'red' })).toMatchObject({ ok: false });
    expect(await h.act(p1, { type: 'pickColor', color: 'red' })).toMatchObject({ ok: true });
    expect(h.view(p1)).toMatchObject({ phase: 'play', activeColor: 'red', current: p1 });
  });

  it('+4: desteye geri konur, başka kart açılır', async () => {
    const seed = seedFor('wild4', players);
    const h = await started(players, {}, seed);
    const s = st(h);
    expect(s.discard).toHaveLength(1);
    expect(s.discard[0]!.value).not.toBe('wild4');
    expect(s.deck.length + 1 + 21).toBe(108);
  });
});

describe('eşleşme kuralları', () => {
  it('renk ya da sayı eşleşir; eşleşmeyen reddedilir; joker her zaman', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g3', 'r5', 'y9', 'W', 'g1'], b: ['p1', 'p2'], c: ['y1', 'y2'] }, top: 'g5', current: 'a' });
    expect(h.view('a').me.playable).toHaveLength(4); // g3, r5, W, g1
    expect(await play(h, 'a', 'yellow', '9')).toMatchObject({ ok: false, error: expect.stringContaining('eşleşmeli') });
    expect(await play(h, 'a', 'red', '5')).toMatchObject({ ok: true });
    expect(st(h).activeColor).toBe('red');
    expect(st(h).current).toBe('b');
    // Sıra sende değil
    expect(await play(h, 'a', 'green', '3')).toMatchObject({ ok: false, error: expect.stringContaining('Sıra sende değil') });
  });

  it('simge eşleşmesi: Atla üstüne başka renkte Atla', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['yS', 'g1'], b: ['p1', 'p2'], c: ['y1', 'y2'] }, top: 'rS', current: 'a' });
    expect(await play(h, 'a', 'yellow', 'skip')).toMatchObject({ ok: true });
    expect(st(h).current).toBe('c');
  });

  it('joker renk ister; seçilen renk etkin olur', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['W', 'g1'], b: ['p1', 'p2'], c: ['y1'] }, top: 'r5', current: 'a' });
    expect(await play(h, 'a', null, 'wild')).toMatchObject({ ok: false, error: expect.stringContaining('renk seç') });
    expect(await play(h, 'a', null, 'wild', { color: 'purple' })).toMatchObject({ ok: true });
    expect(h.view('b')).toMatchObject({ activeColor: 'purple', current: 'b' });
    expect(h.view('b').me.playable).toHaveLength(2);
  });

  it('jokerin üstüne aynı sayı değil, seçilen renk gerekir', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g1', 'y2'], b: ['p1'], c: ['y1'] }, top: 'W', color: 'yellow', current: 'a' });
    expect(h.view('a').me.playable).toEqual([find(h, 'a', 'yellow', '2')]);
  });

  it('çift tıklama: oynanmış kart sessizce yutulur', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g3', 'g4'], b: ['p1', 'p2'], c: ['y1'] }, top: 'g5', current: 'a' });
    const id = find(h, 'a', 'green', '3');
    expect(await h.act('a', { type: 'play', cardId: id })).toMatchObject({ ok: true });
    expect(await h.act('a', { type: 'play', cardId: id })).toMatchObject({ ok: true, stale: true });
  });
});

describe('özel kartlar', () => {
  it('Atla: sıradaki atlanır', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['gS', 'g1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', 'skip');
    expect(st(h).current).toBe('c');
  });

  it('Yön değiştir (3 kişi): yön döner', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['gR', 'g1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', 'reverse');
    expect(h.view('a')).toMatchObject({ dir: -1, current: 'c' });
  });

  it('Yön değiştir (2 kişi): Atla gibi, sıra yine oynayanda', async () => {
    const h = await started(['a', 'b']);
    arrange(h, { hands: { a: ['gR', 'g1'], b: ['p1'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', 'reverse');
    expect(st(h).current).toBe('a');
  });

  it('+2: sıradaki 2 çeker ve atlanır', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g+2', 'g1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'r2', 'r3'] });
    await play(h, 'a', 'green', 'draw2');
    expect(hand(h, 'b')).toHaveLength(3);
    expect(st(h).current).toBe('c');
  });

  it('+4 kabul: sıradaki 4 çeker ve atlanır', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['W4', 'y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'r2', 'r3', 'r4', 'r5'] });
    await play(h, 'a', null, 'wild4', { color: 'yellow' });
    expect(h.view('b')).toMatchObject({ phase: 'challenge', challenge: { by: 'a', victim: 'b', penalty: 4 }, current: 'b' });
    expect(await decide(h, 'c', 'accept')).toMatchObject({ ok: false });
    expect(await decide(h, 'b', 'accept')).toMatchObject({ ok: true });
    expect(hand(h, 'b')).toHaveLength(5);
    expect(h.view('a')).toMatchObject({ phase: 'play', current: 'c', activeColor: 'yellow' });
  });
});

describe('+4 itirazı', () => {
  it('haklı itiraz: elinde o renk varken oynayan 4 çeker; itiraz eden normal oynar', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['W4', 'g1', 'r7'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] });
    await play(h, 'a', null, 'wild4', { color: 'red' });
    // Hile olup olmadığı kimseye gönderilmez.
    expect(h.seen('b')).not.toContain('guilty');
    expect(await decide(h, 'b', 'challenge')).toMatchObject({ ok: true });
    expect(hand(h, 'a')).toHaveLength(6);
    expect(hand(h, 'b')).toHaveLength(1);
    expect(h.view('b')).toMatchObject({ current: 'b', phase: 'play', activeColor: 'red' });
    const reveal = h.view('b').reveal!;
    expect(reveal).toMatchObject({ of: 'a', guilty: true });
    expect(reveal.cards.map((x) => x.value).sort()).toEqual(['1', '7']);
  });

  it('haksız itiraz: itiraz eden 6 çeker ve atlanır', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['W4', 'r1', 'y7'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: Array(8).fill('p9') });
    await play(h, 'a', null, 'wild4', { color: 'red' });
    await decide(h, 'b', 'challenge');
    expect(hand(h, 'a')).toHaveLength(2);
    expect(hand(h, 'b')).toHaveLength(7);
    expect(st(h).current).toBe('c');
    expect(h.view('b').reveal).toMatchObject({ of: 'a', guilty: false });
  });

  it('el yalnızca itiraz edene gösterilir', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['W4', 'r1', 'y7'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: Array(8).fill('p9') });
    const secret = hand(h, 'a').filter((x) => x.value !== 'wild4').map((x) => x.id);
    await play(h, 'a', null, 'wild4', { color: 'red' });
    await decide(h, 'b', 'challenge');
    for (const id of secret) {
      expect(h.seen('b')).toContain(`"id":"${id}"`);
      expect(h.seen('c')).not.toContain(`"id":"${id}"`);
    }
    expect(h.view('c').reveal).toBeNull();
  });

  it('eski karar sessizce yutulur', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['W4', 'r1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: Array(8).fill('p9') });
    await play(h, 'a', null, 'wild4', { color: 'red' });
    const step = h.view('b').step;
    await h.act('b', { type: 'accept', step });
    expect(await h.act('b', { type: 'challenge', step })).toMatchObject({ ok: true, stale: true });
  });
});

describe('çekme', () => {
  it('çekilen kart oynanabilirse hemen oynanabilir; başka kart oynanamaz', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['y1', 'p2'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['g7', 'r1'] });
    await draw(h, 'a');
    const v = h.view('a');
    expect(v.drew).toBe(true);
    expect(v.drawnId).toBe(find(h, 'a', 'green', '7'));
    expect(v.me.playable).toEqual([v.drawnId]);
    expect(h.view('b').drawnId).toBeNull();
    expect(await draw(h, 'a')).toMatchObject({ ok: false, error: expect.stringContaining('Zaten') });
    expect(await play(h, 'a', 'green', '7')).toMatchObject({ ok: true });
    expect(st(h).current).toBe('b');
  });

  it('çekip tutabilir (sırayı geçir)', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['g7'] });
    expect(await pass(h, 'a')).toMatchObject({ ok: false, error: expect.stringContaining('çekmelisin') });
    await draw(h, 'a');
    expect(await pass(h, 'a')).toMatchObject({ ok: true });
    expect(hand(h, 'a')).toHaveLength(2);
    expect(st(h).current).toBe('b');
  });

  it('çekilen kart oynanamazsa sıra geçer', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'g2'] });
    await draw(h, 'a');
    expect(hand(h, 'a')).toHaveLength(2);
    expect(st(h).current).toBe('b');
  });

  it('çift tıklama: aynı adımla ikinci çekme yutulur', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'r2'] });
    const step = h.view('a').step;
    await h.act('a', { type: 'draw', step });
    expect(await h.act('a', { type: 'draw', step })).toMatchObject({ ok: true, stale: true });
    expect(hand(h, 'a')).toHaveLength(2);
  });

  it('deste biterse ıskarta (açık kart hariç) karıştırılır', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: [] });
    st(h).discard = [c('r3'), c('p4'), c('g5')];
    await draw(h, 'a');
    expect(st(h).discard).toHaveLength(1);
    expect(st(h).discard[0]!.value).toBe('5');
    expect(hand(h, 'a')).toHaveLength(2);
  });
});

describe('Son kart! ve Yakaladım!', () => {
  it('söylemeden 1 karta inen yakalanır, 2 kart çeker', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g1', 'g2'], b: ['p1', 'p2'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'r2', 'r3'] });
    await play(h, 'a', 'green', '1');
    expect(h.view('c').exposed).toBe('a');
    expect(await h.act('a', { type: 'catch', target: 'a' })).toMatchObject({ ok: false });
    expect(await h.act('c', { type: 'catch', target: 'a' })).toMatchObject({ ok: true });
    expect(hand(h, 'a')).toHaveLength(3);
    expect(h.view('c').exposed).toBeNull();
  });

  it('önceden söyleyen yakalanmaz', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g1', 'g2'], b: ['p1', 'p2'], c: ['y1'] }, top: 'g5', current: 'a' });
    expect(await h.act('a', { type: 'callLast' })).toMatchObject({ ok: true });
    expect(h.view('b').players.find((p) => p.id === 'a')!.called).toBe(true);
    await play(h, 'a', 'green', '1');
    expect(h.view('c').exposed).toBeNull();
    expect(await h.act('c', { type: 'catch', target: 'a' })).toMatchObject({ ok: false });
  });

  it('yakalanmadan önce söyleyen kurtulur', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g1', 'g2'], b: ['p1', 'p2'], c: ['y1'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', '1');
    await h.act('a', { type: 'callLast' });
    expect(await h.act('c', { type: 'catch', target: 'a' })).toMatchObject({ ok: false });
    expect(hand(h, 'a')).toHaveLength(1);
  });

  it('sıradaki oyuncu oynayınca yakalama süresi biter', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g1', 'g2'], b: ['g7', 'p2'], c: ['y1'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', '1');
    await play(h, 'b', 'green', '7');
    expect(await h.act('c', { type: 'catch', target: 'a' })).toMatchObject({ ok: false, error: expect.stringContaining('geç kaldın') });
  });

  it('elinde 3+ kart varken Son kart! denemez', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g1', 'g2', 'g3'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a' });
    expect(await h.act('a', { type: 'callLast' })).toMatchObject({ ok: false });
  });
});

describe('ev kuralları', () => {
  it('yığma kapalı: +2 üstüne +2 konamaz (ceza hemen uygulanır)', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g+2', 'g1'], b: ['r+2', 'p2'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'r2'] });
    await play(h, 'a', 'green', 'draw2');
    expect(hand(h, 'b')).toHaveLength(4);
    expect(st(h).current).toBe('c');
  });

  it('yığma: +2 üstüne +2, sonraki 4 çeker', async () => {
    const h = await started(['a', 'b', 'c'], { stacking: true });
    arrange(h, { hands: { a: ['g+2', 'g1'], b: ['r+2', 'p2'], c: ['y1', 'y2'] }, top: 'g5', current: 'a', deck: Array(6).fill('p9') });
    await play(h, 'a', 'green', 'draw2');
    expect(h.view('b')).toMatchObject({ penalty: 2, current: 'b' });
    expect(h.view('b').me.playable).toEqual([find(h, 'b', 'red', 'draw2')]);
    expect(await play(h, 'b', 'purple', '2')).toMatchObject({ ok: false });
    await play(h, 'b', 'red', 'draw2');
    expect(h.view('c')).toMatchObject({ penalty: 4, current: 'c' });
    await draw(h, 'c');
    expect(hand(h, 'c')).toHaveLength(6);
    expect(h.view('a')).toMatchObject({ penalty: 0, current: 'a' });
  });

  it('yığma: +4 üstüne +4, kabul eden 8 çeker', async () => {
    const h = await started(['a', 'b', 'c'], { stacking: true });
    arrange(h, { hands: { a: ['W4', 'r1'], b: ['W4', 'p2'], c: ['y1'] }, top: 'g5', current: 'a', deck: Array(10).fill('p9') });
    await play(h, 'a', null, 'wild4', { color: 'red' });
    expect(h.view('b').me.playable).toEqual([find(h, 'b', null, 'wild4')]);
    await play(h, 'b', null, 'wild4', { color: 'yellow' });
    expect(h.view('c').challenge).toMatchObject({ by: 'b', victim: 'c', penalty: 8 });
    await decide(h, 'c', 'accept');
    expect(hand(h, 'c')).toHaveLength(9);
  });

  it('7-0: 0 oynanınca eller oyun yönünde döner', async () => {
    const h = await started(['a', 'b', 'c'], { sevenZero: true });
    arrange(h, { hands: { a: ['g0', 'g1'], b: ['p1', 'p2'], c: ['y1', 'y2', 'y3'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', '0');
    expect(hand(h, 'b').map((x) => x.value)).toEqual(['1']); // a'nın kalan eli
    expect(hand(h, 'c')).toHaveLength(2); // b'nin eli
    expect(hand(h, 'a')).toHaveLength(3); // c'nin eli
  });

  it('7-0: 7 oynayan seçtiği oyuncuyla el değiştirir', async () => {
    const h = await started(['a', 'b', 'c'], { sevenZero: true });
    arrange(h, { hands: { a: ['g7', 'g1'], b: ['p1', 'p2'], c: ['y1', 'y2', 'y3', 'y4'] }, top: 'g5', current: 'a' });
    expect(await play(h, 'a', 'green', '7')).toMatchObject({ ok: false, error: expect.stringContaining('seç') });
    await play(h, 'a', 'green', '7', { swapWith: 'c' });
    expect(hand(h, 'a')).toHaveLength(4);
    expect(hand(h, 'c')).toHaveLength(1);
    expect(hand(h, 'b')).toHaveLength(2);
  });

  it('7-0 kapalıyken 7 ve 0 sıradan kart', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g0', 'g1'], b: ['p1', 'p2'], c: ['y1', 'y2', 'y3'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', '0');
    expect(hand(h, 'c')).toHaveLength(3);
  });

  it('sınırsız çekme: oynanabilir kart gelene kadar çekilir', async () => {
    const h = await started(['a', 'b', 'c'], { drawUntilPlayable: true });
    arrange(h, { hands: { a: ['y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['r1', 'p2', 'y3', 'g8', 'r9'] });
    await draw(h, 'a');
    expect(hand(h, 'a')).toHaveLength(5);
    expect(h.view('a').drawnId).toBe(find(h, 'a', 'green', '8'));
  });
});

describe('tur süresi', () => {
  it('süre dolunca otomatik çekilir ve sıra geçer', async () => {
    const h = await started(['a', 'b', 'c'], { turnSeconds: 20 });
    arrange(h, { hands: { a: ['y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: ['g7', 'r2'] });
    // Başlangıçta kurulan tur saati (turnSeq aynı) a için işler.
    await draw(h, 'a');
    // a çekti (g7 oynanabilir); süre bitince tutar ve geçer.
    expect(st(h).current).toBe('a');
    h.advance(20_000);
    expect(st(h).current).toBe('b');
    expect(hand(h, 'a')).toHaveLength(2);
    // b'nin süresi de işler.
    expect(h.view('b').endsAt).toBeGreaterThan(0);
    h.advance(20_000);
    expect(hand(h, 'b')).toHaveLength(2);
    expect(st(h).current).toBe('c');
  });

  it('itiraz penceresinde süre dolarsa ceza kabul edilir', async () => {
    const h = await started(['a', 'b', 'c'], { turnSeconds: 20 });
    arrange(h, { hands: { a: ['W4', 'r1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a', deck: Array(5).fill('p9') });
    await play(h, 'a', null, 'wild4', { color: 'red' });
    h.advance(20_000);
    expect(hand(h, 'b')).toHaveLength(5);
    expect(st(h).current).toBe('c');
  });

  it('süresizde zamanlayıcı yok', async () => {
    const h = await started();
    expect(h.view('a').endsAt).toBe(0);
  });
});

describe('puan modu', () => {
  it('eli bitiren rakip ellerinden resmî puanları toplar; yeni el başlar', async () => {
    const h = await started(['a', 'b', 'c'], { mode: 'points' });
    arrange(h, { hands: { a: ['g1'], b: ['p9', 'rS'], c: ['W', 'y3'] }, top: 'g5', current: 'a' });
    expect(handPoints(hand(h, 'b'))).toBe(29);
    expect(handPoints(hand(h, 'c'))).toBe(53);
    await play(h, 'a', 'green', '1');
    const v = h.view('b');
    expect(v.phase).toBe('roundOver');
    expect(v.roundResult).toMatchObject({ winner: 'a', points: 82 });
    expect(v.players.find((p) => p.id === 'a')!.score).toBe(82);
    expect(h.seen('b')).not.toContain(`"id":"${hand(h, 'c')[0]!.id}"`);
    h.advance(ROUND);
    expect(h.view('a')).toMatchObject({ round: 2 });
    expect(['play', 'color']).toContain(h.view('a').phase);
    expect(hand(h, 'a')).toHaveLength(7);
    expect(h.finished).toBeNull();
  });

  it('son kart +2 ise sıradaki çeker, puana sayılır', async () => {
    const h = await started(['a', 'b'], { mode: 'points' });
    arrange(h, { hands: { a: ['g+2'], b: ['p9'] }, top: 'g5', current: 'a', deck: ['r1', 'y2'] });
    await play(h, 'a', 'green', 'draw2');
    expect(h.view('a').roundResult!.points).toBe(12);
  });

  it('500 puana ulaşan oyunu kazanır', async () => {
    const h = await started(['a', 'b'], { mode: 'points' });
    st(h).scores.a = 480;
    arrange(h, { hands: { a: ['g1'], b: ['W4'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', '1');
    expect(h.view('a')).toMatchObject({ phase: 'over', winner: 'a' });
    h.advance(PODIUM);
    expect(h.finished).toEqual([
      { playerId: 'a', score: 530, meta: { place: 1, winner: true, cards: 0 } },
      { playerId: 'b', score: 0, meta: { place: 2, winner: false, cards: 1 } },
    ]);
  });
});

describe('tek el modu ve oyun sonu', () => {
  it('eli ilk bitiren kazanır; sıralama kart sayısına göre', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['g1'], b: ['p1', 'p2', 'p3'], c: ['y1'] }, top: 'g5', current: 'a' });
    await play(h, 'a', 'green', '1');
    expect(h.view('b')).toMatchObject({ phase: 'over', winner: 'a' });
    expect(await draw(h, 'b')).toMatchObject({ ok: false, error: 'Oyun bitti.' });
    h.advance(PODIUM);
    expect(h.finished!.map((r) => r.playerId)).toEqual(['a', 'c', 'b']);
    expect(h.finished![0]).toMatchObject({ score: 2, meta: { winner: true } });
  });

  it('oda sahibi oyunu bitirir', async () => {
    const h = await started();
    h.end();
    expect(h.view('a').phase).toBe('over');
    h.advance(PODIUM);
    expect(h.finished).toHaveLength(3);
  });
});

describe('bağlantı ve ayrılma', () => {
  it('kopan oyuncunun yerine oda sahibi çeker', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['y1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'b', deck: ['g7', 'r1'] });
    expect(await h.act('a', { type: 'skipTurn' })).toMatchObject({ ok: false, error: expect.stringContaining('bağlı') });
    h.setConnected('b', false);
    expect(await h.act('c', { type: 'skipTurn' })).toMatchObject({ ok: false, error: expect.stringContaining('oda sahibi') });
    expect(await h.act('a', { type: 'skipTurn' })).toMatchObject({ ok: true });
    expect(hand(h, 'b')).toHaveLength(2);
    expect(st(h).current).toBe('c');
  });

  it('ayrılan oyuncunun eli desteye döner, sıra ilerler', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['y1'], b: ['p1', 'p2'], c: ['y1'] }, top: 'g5', current: 'b', deck: [] });
    h.leave('b');
    expect(st(h).order).toEqual(['a', 'c']);
    expect(st(h).deck).toHaveLength(2);
    expect(st(h).current).toBe('c');
  });

  it('tek kişi kalırsa oyun biter', async () => {
    const h = await started(['a', 'b']);
    h.leave('b');
    expect(h.view('a')).toMatchObject({ phase: 'over', winner: 'a' });
  });

  it('+4 penceresinde kurban ayrılırsa ceza düşer, sıra ilerler', async () => {
    const h = await started();
    arrange(h, { hands: { a: ['W4', 'r1'], b: ['p1'], c: ['y1'] }, top: 'g5', current: 'a' });
    await play(h, 'a', null, 'wild4', { color: 'red' });
    h.leave('b');
    expect(h.view('a')).toMatchObject({ phase: 'play', current: 'c', penalty: 0, challenge: null });
  });
});

describe('gizlilik', () => {
  it('eller ve deste sırası gizli; rakipler yalnızca kart sayısını görür', async () => {
    const h = await started(['a', 'b', 'c']);
    for (const card of hand(h, 'a')) {
      expect(h.seen('b')).not.toContain(`"id":"${card.id}"`);
      expect(h.seen('c')).not.toContain(`"id":"${card.id}"`);
    }
    for (const card of st(h).deck) expect(h.seen('a')).not.toContain(`"id":"${card.id}"`);
    expect(h.view('b').players.find((p) => p.id === 'a')!.cards).toBe(7);
    expect(h.view('a').me.hand).toHaveLength(7);
  });

  it('izleyici el görmez', async () => {
    const h = await started();
    h.join('z');
    h.ctx.pushViews();
    expect(h.view('z').me).toMatchObject({ inGame: false, hand: [], playable: [] });
  });
});
