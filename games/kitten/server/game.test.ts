import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import type { Card, CardKind, KittenView } from '../shared/index.js';
import { deal, kittenServer, seededRng, type KittenState } from './index.js';

const PHASE = 20_000;
const PODIUM = 5_000;

function setup(players: string[], settings: Record<string, unknown> = {}, seed = 7) {
  const h = createHarness<KittenView>(kittenServer({ random: seededRng(seed), timing: { phaseMs: PHASE, podiumMs: PODIUM } }), {
    players,
    settings,
  });
  return h;
}

let seq = 0;
const c = (kind: CardKind): Card => ({ id: `t${++seq}`, kind });
const st = (h: Harness<KittenView>) => h.state as KittenState;

/** Elleri, desteyi ve sırayı elle kur (deterministik senaryolar için). */
function arrange(h: Harness<KittenView>, opts: { hands?: Record<string, CardKind[]>; deck?: CardKind[]; current?: string }) {
  const s = st(h);
  if (opts.hands) for (const [id, kinds] of Object.entries(opts.hands)) s.hands[id] = kinds.map(c);
  if (opts.deck) s.deck = opts.deck.map(c);
  if (opts.current) {
    s.current = opts.current;
    s.turnsLeft = 1;
    s.underAttack = false;
  }
  h.ctx.pushViews();
}

const hand = (h: Harness<KittenView>, id: string) => st(h).hands[id]!;
const cardOf = (h: Harness<KittenView>, id: string, kind: CardKind, nth = 0) => hand(h, id).filter((x) => x.kind === kind)[nth]!.id;
const draw = (h: Harness<KittenView>, id: string) => h.act(id, { type: 'draw', turn: h.view(id).turn });

async function started(players = ['a', 'b', 'c'], settings: Record<string, unknown> = {}) {
  const h = setup(players, settings);
  await h.start();
  return h;
}

describe('dağıtım', () => {
  it.each([2, 3, 4, 5, 6, 10])('%i oyuncu: herkese 1 etkisiz + 7 kart, destede n−1 bomba', (n) => {
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    const { hands, deck } = deal(ids, seededRng(n));
    const decks = n > 5 ? 2 : 1;
    for (const id of ids) {
      expect(hands[id]).toHaveLength(8);
      expect(hands[id]!.filter((x) => x.kind === 'defuse')).toHaveLength(1);
      expect(hands[id]!.some((x) => x.kind === 'bomb')).toBe(false);
    }
    expect(deck.filter((x) => x.kind === 'bomb')).toHaveLength(n - 1);
    const extraDefuse = decks === 2 ? 12 - n : n <= 3 ? 2 : 6 - n;
    expect(deck.filter((x) => x.kind === 'defuse')).toHaveLength(extraDefuse);
    expect(deck.length + n * 8).toBe(46 * decks + (n - 1) + n + extraDefuse);
    const all = [...deck, ...Object.values(hands).flat()];
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
  });

  it('aynı tohumla aynı dağıtım (deterministik)', () => {
    expect(deal(['a', 'b', 'c'], seededRng(1))).toEqual(deal(['a', 'b', 'c'], seededRng(1)));
    expect(deal(['a', 'b', 'c'], seededRng(1))).not.toEqual(deal(['a', 'b', 'c'], seededRng(2)));
  });

  it('eller özel: diğerleri yalnızca kart sayısını görür', async () => {
    const h = await started();
    const va = h.view('a');
    expect(va.me.hand).toHaveLength(8);
    expect(va.players.find((p) => p.id === 'b')!.cards).toBe(8);
    for (const card of hand(h, 'a')) expect(h.seen('b')).not.toContain(`"id":"${card.id}"`);
    for (const card of st(h).deck) expect(h.seen('a')).not.toContain(`"id":"${card.id}"`);
    expect(h.view('a').deckCount).toBe(st(h).deck.length);
  });

  it('2 kişiden az ya da izleyici', async () => {
    const h = setup(['a']);
    await expect(h.start()).rejects.toThrow(/En az 2/);
    const g = await started(['a', 'b']);
    g.join('z');
    expect(g.view('z').me).toEqual({ inGame: false, alive: false, hand: [] });
  });
});

describe('çekme ve bomba', () => {
  it('normal kart ele gelir, sıra geçer; çekilen kart yalnızca çekene görünür', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['future', 'skip', 'bomb', 'bomb'], hands: { a: ['defuse'] } });
    expect(await draw(h, 'a')).toMatchObject({ ok: true });
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['defuse', 'future']);
    expect(h.view('b').current).toBe('b');
    const entryA = h.view('a').log.at(-2)!;
    const entryB = h.view('b').log.at(-2)!;
    expect(entryA).toMatchObject({ t: 'draw', by: 'a', kind: 'future' });
    expect(entryB).toMatchObject({ t: 'draw', by: 'a', kind: null });
  });

  it('çift tıklanan çekme yutulur', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'skip', 'bomb', 'bomb'] });
    const turn = h.view('a').turn;
    await h.act('a', { type: 'draw', turn });
    expect(await h.act('a', { type: 'draw', turn })).toMatchObject({ ok: true, stale: true });
    expect(st(h).deck).toHaveLength(3);
  });

  it('bomba + etkisiz: gizli konuma geri koyma; konum yalnızca koyana', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['bomb', 'skip', 'future', 'shuffle', 'favor'], hands: { a: ['defuse', 'attack'] } });
    await draw(h, 'a');
    expect(h.view('b')).toMatchObject({ phase: 'bomb', current: 'a' });
    expect(await h.act('b', { type: 'defuse' })).toMatchObject({ ok: false });
    await h.act('a', { type: 'defuse' });
    expect(h.view('a').phase).toBe('place');
    expect(h.view('c').flash).toMatchObject({ t: 'defuse', by: 'a' });
    expect(await h.act('a', { type: 'place', index: 99 })).toMatchObject({ ok: false });
    await h.act('a', { type: 'place', index: 2 });
    expect(st(h).deck.map((x) => x.kind)).toEqual(['skip', 'future', 'bomb', 'shuffle', 'favor']);
    expect(h.view('a').myBomb).toBe(2);
    expect(h.view('b').myBomb).toBeNull();
    expect(h.view('b').current).toBe('b');
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['attack']);
    // Konum hiçbir veride başkasına gitmez.
    expect(h.seen('b')).not.toContain('"myBomb":2');
    expect(h.seen('c')).not.toContain('"myBomb":2');
    expect(h.view('b').log.find((l) => l.t === 'placed')).toEqual({ seq: expect.any(Number), t: 'placed', by: 'a' });
    // Kart çekildikçe konum güncellenir.
    await draw(h, 'b');
    expect(h.view('a').myBomb).toBe(1);
  });

  it('bomba aşaması süre dolunca otomatik etkisiz kılar ve rastgele koyar', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['bomb', 'skip', 'skip'], hands: { a: ['defuse'] } });
    await draw(h, 'a');
    h.advance(PHASE);
    expect(h.view('a').phase).toBe('play');
    expect(h.view('a').current).toBe('b');
    expect(st(h).deck.filter((x) => x.kind === 'bomb')).toHaveLength(1);
    expect(h.view('a').myBomb).not.toBeNull();
  });

  it('geri koyma süresi dolunca rastgele konum', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['bomb', 'skip', 'skip'], hands: { a: ['defuse'] } });
    await draw(h, 'a');
    await h.act('a', { type: 'defuse' });
    h.advance(PHASE);
    expect(h.view('b')).toMatchObject({ phase: 'play', current: 'b', deckCount: 3 });
  });

  it('etkisiz yoksa patlar: eli ıskartaya, sıra sonrakine', async () => {
    const h = await started();
    arrange(h, { current: 'b', deck: ['bomb', 'skip', 'skip'], hands: { b: ['attack', 'sarman'] } });
    const discardBefore = st(h).discard.length;
    await draw(h, 'b');
    const v = h.view('a');
    expect(v.flash).toMatchObject({ t: 'boom', by: 'b' });
    expect(v.players.find((p) => p.id === 'b')).toMatchObject({ alive: false, cards: 0, out: 1 });
    expect(v.current).toBe('c');
    expect(st(h).discard.length).toBe(discardBefore + 2);
    expect(st(h).discard.some((x) => x.kind === 'bomb')).toBe(false);
    expect(await h.act('b', { type: 'play', cardIds: ['x'] })).toMatchObject({ ok: false });
    // Elenen sıra almaz.
    await draw(h, 'c');
    expect(h.view('a').current).toBe('a');
  });

  it('son kalan kazanır; skor sona kalma sırasına göre', async () => {
    const h = await started();
    arrange(h, { current: 'b', deck: ['bomb', 'bomb', 'skip'], hands: { b: [], c: [] } });
    await draw(h, 'b');
    expect(h.view('a').current).toBe('c');
    await draw(h, 'c');
    expect(h.view('a')).toMatchObject({ phase: 'over', winner: 'a' });
    expect(h.finished).toBeNull();
    h.advance(PODIUM);
    const scores = Object.fromEntries(h.finished!.map((r) => [r.playerId, r.score]));
    expect(scores).toEqual({ b: 0, c: 1, a: 2 });
    expect(h.finished!.find((r) => r.playerId === 'a')!.meta).toMatchObject({ winner: true, place: 1 });
  });
});

describe('eylem kartları', () => {
  async function playAndResolve(h: Harness<KittenView>, id: string, kinds: CardKind[], extra: Record<string, unknown> = {}) {
    const ids = kinds.map((k, i) => cardOf(h, id, k, kinds.slice(0, i).filter((x) => x === k).length));
    const res = await h.act(id, { type: 'play', cardIds: ids, ...extra });
    expect(res).toMatchObject({ ok: true });
    h.advance(5_000);
    return res;
  }

  it('Saldır: çekmeden biter, sıradaki 2 tur oynar', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'skip', 'skip', 'bomb', 'bomb'], hands: { a: ['attack'] } });
    await playAndResolve(h, 'a', ['attack']);
    expect(h.view('a')).toMatchObject({ current: 'b', turnsLeft: 2 });
    expect(st(h).deck).toHaveLength(5);
    await draw(h, 'b');
    expect(h.view('a')).toMatchObject({ current: 'b', turnsLeft: 1 });
    await draw(h, 'b');
    expect(h.view('a')).toMatchObject({ current: 'c', turnsLeft: 1 });
  });

  it('saldırı yığılması: kalan turlar + 2', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'skip', 'skip', 'bomb', 'bomb'], hands: { a: ['attack'], b: ['attack', 'attack', 'sarman'] } });
    await playAndResolve(h, 'a', ['attack']);
    await playAndResolve(h, 'b', ['attack']);
    expect(h.view('a')).toMatchObject({ current: 'c', turnsLeft: 4 });

    // İkinci turunda saldıran: 1 + 2 = 3.
    arrange(h, { current: 'a', hands: { a: ['attack'], b: ['attack'] } });
    await playAndResolve(h, 'a', ['attack']);
    await draw(h, 'b');
    expect(h.view('b').turnsLeft).toBe(1);
    await playAndResolve(h, 'b', ['attack']);
    expect(h.view('a')).toMatchObject({ current: 'c', turnsLeft: 3 });
  });

  it('Atla: çekmeden 1 tur biter', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['future', 'bomb', 'bomb'], hands: { a: ['skip', 'attack'], b: ['skip'] } });
    await playAndResolve(h, 'a', ['attack']);
    await playAndResolve(h, 'b', ['skip']);
    expect(h.view('a')).toMatchObject({ current: 'b', turnsLeft: 1 });
    expect(st(h).deck).toHaveLength(3);
  });

  it('Geleceği Gör: üstteki 3 kart yalnızca oynayana', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['favor', 'tekir', 'bomb', 'pamuk'], hands: { a: ['future'] } });
    await playAndResolve(h, 'a', ['future']);
    expect(h.view('a').peek).toMatchObject({ cards: ['favor', 'tekir', 'bomb'] });
    expect(h.view('b').peek).toBeNull();
    expect(h.seen('b')).not.toContain('"peek":{');
    expect(h.seen('c')).not.toContain('"peek":{');
    expect(h.view('a').phase).toBe('play');
    // Sıra bitince kaybolur.
    await draw(h, 'a');
    expect(h.view('a').peek).toBeNull();
  });

  it('Karıştır: desteyi karıştırır, geri koyma bilgisi ve görülen gelecek silinir', async () => {
    const h = await started();
    const deck: CardKind[] = ['skip', 'favor', 'future', 'attack', 'bomb', 'tekir', 'pamuk', 'kara'];
    arrange(h, { current: 'a', deck, hands: { a: ['shuffle'] } });
    st(h).placed = { b: st(h).deck[4]!.id };
    const ids = st(h).deck.map((x) => x.id);
    await playAndResolve(h, 'a', ['shuffle']);
    expect(st(h).deck.map((x) => x.id).sort()).toEqual([...ids].sort());
    expect(st(h).deck.map((x) => x.id)).not.toEqual(ids);
    expect(h.view('b').myBomb).toBeNull();
  });

  it('İyilik İste: hedef seçtiği kartı verir; kart yalnızca iki tarafa görünür', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'bomb', 'bomb'], hands: { a: ['favor'], b: ['nope', 'kara'] } });
    expect(await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'favor')] })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'favor')], target: 'a' })).toMatchObject({ ok: false });
    await playAndResolve(h, 'a', ['favor'], { target: 'b' });
    expect(h.view('c')).toMatchObject({ phase: 'favor', favor: { from: 'a', to: 'b' } });
    expect(await h.act('a', { type: 'give', cardId: cardOf(h, 'b', 'kara') })).toMatchObject({ ok: false });
    await h.act('b', { type: 'give', cardId: cardOf(h, 'b', 'kara') });
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['kara']);
    expect(h.view('a').phase).toBe('play');
    const give = (id: string) => h.view(id).log.find((l) => l.t === 'favorGive')!;
    expect(give('a').kind).toBe('kara');
    expect(give('b').kind).toBe('kara');
    expect(give('c').kind).toBeNull();
  });

  it('İyilik İste: hedef süre içinde vermezse rastgele kart gider', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'bomb', 'bomb'], hands: { a: ['favor'], b: ['nope', 'kara'] } });
    await playAndResolve(h, 'a', ['favor'], { target: 'b' });
    h.advance(PHASE);
    expect(hand(h, 'a')).toHaveLength(1);
    expect(hand(h, 'b')).toHaveLength(1);
    expect(h.view('a').phase).toBe('play');
  });

  it('kedi çifti: hedefin elinden rastgele kart; yalnızca iki taraf görür', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'bomb', 'bomb'], hands: { a: ['tekir', 'tekir'], c: ['attack'] } });
    await playAndResolve(h, 'a', ['tekir', 'tekir'], { target: 'c' });
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['attack']);
    expect(hand(h, 'c')).toHaveLength(0);
    const steal = (id: string) => h.view(id).log.find((l) => l.t === 'steal')!;
    expect(steal('a').kind).toBe('attack');
    expect(steal('c').kind).toBe('attack');
    expect(steal('b').kind).toBeNull();
  });

  it('kedi üçlüsü: istenen kart varsa alınır, yoksa boşa', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'bomb', 'bomb'], hands: { a: ['pamuk', 'pamuk', 'pamuk', 'kara', 'kara', 'kara'], b: ['defuse', 'nope'] } });
    expect(await h.act('a', { type: 'play', cardIds: hand(h, 'a').slice(0, 3).map((x) => x.id), target: 'b' })).toMatchObject({ ok: false });
    await playAndResolve(h, 'a', ['pamuk', 'pamuk', 'pamuk'], { target: 'b', named: 'defuse' });
    expect(hand(h, 'a').map((x) => x.kind)).toContain('defuse');
    expect(hand(h, 'b').map((x) => x.kind)).toEqual(['nope']);
    await playAndResolve(h, 'a', ['kara', 'kara', 'kara'], { target: 'b', named: 'attack' });
    expect(hand(h, 'b').map((x) => x.kind)).toEqual(['nope']);
    expect(h.view('c').log.filter((l) => l.t === 'named').map((l) => l.ok)).toEqual([true, false]);
  });

  it('5 farklı kedi: ıskartadan seçilen kart; ayar kapalıysa olmaz', async () => {
    const h = await started();
    arrange(h, { current: 'a', deck: ['skip', 'bomb', 'bomb'], hands: { a: ['sarman', 'tekir', 'pamuk', 'kara', 'benek'] } });
    st(h).discard = [c('defuse'), c('attack')];
    await playAndResolve(h, 'a', ['sarman', 'tekir', 'pamuk', 'kara', 'benek']);
    expect(h.view('a').phase).toBe('pick');
    expect(h.view('a').discardPick).toHaveLength(7);
    expect(h.view('b').discardPick).toBeNull();
    const defuse = st(h).discard.find((x) => x.kind === 'defuse')!.id;
    await h.act('a', { type: 'pick', cardId: defuse });
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['defuse']);

    const g = await started(['a', 'b'], { fiveCats: false });
    arrange(g, { current: 'a', hands: { a: ['sarman', 'tekir', 'pamuk', 'kara', 'benek'] } });
    expect(await g.act('a', { type: 'play', cardIds: hand(g, 'a').map((x) => x.id) })).toMatchObject({ ok: false, error: expect.stringMatching(/kapalı/) });
  });

  it('geçersiz oyunlar ve yetki', async () => {
    const h = await started();
    arrange(h, { current: 'a', hands: { a: ['nope', 'sarman', 'defuse', 'tekir'], b: ['attack'] } });
    expect(await h.act('b', { type: 'play', cardIds: [cardOf(h, 'b', 'attack')] })).toMatchObject({ ok: false, error: expect.stringMatching(/Sıra sende değil/) });
    expect(await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'nope')] })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'sarman')] })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'defuse')] })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'sarman'), cardOf(h, 'a', 'tekir')], target: 'b' })).toMatchObject({ ok: false });
    expect(await h.act('a', { type: 'play', cardIds: ['yok'] })).toMatchObject({ ok: true, stale: true });
  });
});

describe('Hayır zinciri', () => {
  async function attackWindow(players = ['a', 'b', 'c'], settings: Record<string, unknown> = {}) {
    const h = await started(players, settings);
    arrange(h, { current: 'a', deck: ['skip', 'skip', 'bomb', 'bomb'], hands: { a: ['attack', 'nope'], b: ['nope', 'nope'], c: ['nope'] } });
    const res = await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'attack')] });
    return { h, pendingId: res.ok ? (res.pendingId as number) : -1 };
  }
  const nope = (h: Harness<KittenView>, id: string, pendingId: number) => h.act(id, { type: 'nope', pendingId, cardId: cardOf(h, id, 'nope') });

  it('pencere herkese açılır; Hayır yoksa süre sonunda uygulanır', async () => {
    const { h } = await attackWindow();
    expect(h.view('c')).toMatchObject({ phase: 'nope', pending: { by: 'a', kind: 'attack', willHappen: true } });
    expect(h.view('c').endsAt - h.now).toBe(5_000);
    h.advance(4_999);
    expect(h.view('a').phase).toBe('nope');
    h.advance(1);
    expect(h.view('a')).toMatchObject({ phase: 'play', current: 'b', turnsLeft: 2 });
  });

  it('tek Hayır iptal eder; sıra oynayanda kalır', async () => {
    const { h, pendingId } = await attackWindow();
    expect(await nope(h, 'b', pendingId)).toMatchObject({ ok: true });
    expect(h.view('a').pending).toMatchObject({ nopes: ['b'], willHappen: false });
    h.advance(5_000);
    expect(h.view('a')).toMatchObject({ phase: 'play', current: 'a', turnsLeft: 1 });
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['nope']);
    expect(h.view('c').log.at(-1)).toMatchObject({ t: 'cancelled', by: 'a', action: 'attack' });
  });

  it('Hayır’a Hayır (çift) uygular, üçlü iptal eder', async () => {
    const two = await attackWindow();
    await nope(two.h, 'b', two.pendingId);
    await nope(two.h, 'a', two.pendingId);
    two.h.advance(5_000);
    expect(two.h.view('a')).toMatchObject({ current: 'b', turnsLeft: 2 });

    const three = await attackWindow();
    await nope(three.h, 'b', three.pendingId);
    await nope(three.h, 'a', three.pendingId);
    await nope(three.h, 'c', three.pendingId);
    expect(three.h.view('a').pending).toMatchObject({ nopes: ['b', 'a', 'c'], willHappen: false });
    three.h.advance(5_000);
    expect(three.h.view('a')).toMatchObject({ current: 'a', phase: 'play' });
  });

  it('her Hayır pencereyi yeniler; ayardaki süre kullanılır', async () => {
    const { h, pendingId } = await attackWindow(['a', 'b', 'c'], { nopeSeconds: 3 });
    h.advance(2_500);
    await nope(h, 'b', pendingId);
    h.advance(2_500);
    expect(h.view('a').phase).toBe('nope');
    h.advance(500);
    expect(h.view('a').phase).toBe('play');
  });

  it('eski pencereye ya da Hayır’sız Hayır', async () => {
    const { h, pendingId } = await attackWindow();
    expect(await h.act('b', { type: 'nope', pendingId: pendingId + 5, cardId: cardOf(h, 'b', 'nope') })).toMatchObject({ ok: true, stale: true });
    st(h).hands.c = [c('skip')];
    expect(await h.act('c', { type: 'nope', pendingId, cardId: hand(h, 'c')[0]!.id })).toMatchObject({ ok: false });
    // Pencere açıkken başka kart oynanamaz ve çekilemez.
    expect(await draw(h, 'a')).toMatchObject({ ok: false });
  });

  it('Hayır diğer eylemleri de iptal eder (İyilik, kedi çifti)', async () => {
    const h = await started();
    arrange(h, { current: 'a', hands: { a: ['favor', 'kara', 'kara'], b: ['nope', 'nope', 'attack'] } });
    let res = await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'favor')], target: 'b' });
    await h.act('b', { type: 'nope', pendingId: (res as { pendingId?: number }).pendingId, cardId: cardOf(h, 'b', 'nope') });
    h.advance(5_000);
    expect(h.view('a').phase).toBe('play');
    res = await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'kara'), cardOf(h, 'a', 'kara', 1)], target: 'b' });
    await h.act('b', { type: 'nope', pendingId: (res as { pendingId?: number }).pendingId, cardId: cardOf(h, 'b', 'nope') });
    h.advance(5_000);
    expect(hand(h, 'a')).toHaveLength(0);
    expect(hand(h, 'b').map((x) => x.kind)).toEqual(['attack']);
  });
});

describe('süre, bağlantı ve bitiş', () => {
  it('tur süresi dolunca otomatik çeker; pencerede süre durur', async () => {
    const h = await started(['a', 'b', 'c'], { turnSeconds: 30 });
    arrange(h, { current: 'a', deck: ['skip', 'skip', 'skip', 'bomb', 'bomb'], hands: { a: ['future'] } });
    // arrange sırayı elle değiştirdi; saati yeniden kur.
    await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'future')] });
    h.advance(5_000);
    expect(h.view('a').phase).toBe('play');
    expect(h.view('a').current).toBe('a');
    const left = h.view('a').endsAt - h.now;
    expect(left).toBeGreaterThan(0);
    h.advance(left);
    expect(h.view('a').current).toBe('b');
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['skip']);
    expect(h.view('b').log.some((l) => l.t === 'timeout' && l.by === 'a')).toBe(true);
    // Yeni turun süresi tam.
    expect(h.view('b').endsAt - h.now).toBe(30_000);
    h.advance(30_000);
    expect(h.view('b').current).toBe('c');
  });

  it('süresiz turda zamanlayıcı yok', async () => {
    const h = await started();
    const cur = h.view('a').current;
    h.advance(10 * 60_000);
    expect(h.view('a')).toMatchObject({ current: cur, endsAt: 0 });
  });

  it('kopuk oyuncu: oda sahibi atlar; bomba gelirse etkisiz otomatik, bomba en üste', async () => {
    const h = await started();
    arrange(h, { current: 'b', deck: ['bomb', 'skip', 'skip'], hands: { b: ['defuse', 'tekir'] } });
    expect(await h.act('a', { type: 'skipTurn' })).toMatchObject({ ok: false, error: expect.stringMatching(/bağlı/) });
    h.setConnected('b', false);
    expect(await h.act('c', { type: 'skipTurn' })).toMatchObject({ ok: false, error: expect.stringMatching(/oda sahibi/) });
    expect(await h.act('a', { type: 'skipTurn' })).toMatchObject({ ok: true });
    expect(st(h).deck.map((x) => x.kind)).toEqual(['bomb', 'skip', 'skip']);
    expect(hand(h, 'b').map((x) => x.kind)).toEqual(['tekir']);
    expect(h.view('a').current).toBe('c');
  });

  it('kopuk oyuncuya İyilik istenirse rastgele kart hemen gider', async () => {
    const h = await started();
    arrange(h, { current: 'a', hands: { a: ['favor'], b: ['kara'] } });
    h.setConnected('b', false);
    await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'favor')], target: 'b' });
    h.advance(5_000);
    expect(hand(h, 'a').map((x) => x.kind)).toEqual(['kara']);
    expect(h.view('a').phase).toBe('play');
  });

  it('İyilik beklenirken hedefin bağlantısı koparsa rastgele kart hemen gider', async () => {
    const h = await started();
    arrange(h, { current: 'a', hands: { a: ['favor'], b: ['kara', 'tekir'] } });
    await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'favor')], target: 'b' });
    h.advance(5_000);
    expect(h.view('a').phase).toBe('favor');
    h.setConnected('b', false);
    expect(h.view('a').phase).toBe('play');
    expect(hand(h, 'a')).toHaveLength(1);
  });

  it('odadan ayrılan elenir; bomba sayısı dengelenir; sırası geçer', async () => {
    const h = await started(['a', 'b', 'c', 'd']);
    arrange(h, { current: 'b', deck: ['bomb', 'bomb', 'bomb', 'skip'] });
    h.leave('b');
    expect(h.view('a').players.find((p) => p.id === 'b')).toMatchObject({ alive: false, out: 1 });
    expect(h.view('a').current).toBe('c');
    expect(st(h).deck.filter((x) => x.kind === 'bomb')).toHaveLength(2);
    h.leave('c');
    h.leave('d');
    expect(h.view('a')).toMatchObject({ phase: 'over', winner: 'a' });
  });

  it('oyunu bitir: podyum, sonra sona kalma sırasına göre skor', async () => {
    const h = await started();
    arrange(h, { current: 'c', deck: ['bomb', 'skip', 'skip'], hands: { c: [] } });
    await draw(h, 'c');
    h.end();
    expect(h.view('a')).toMatchObject({ phase: 'over', winner: null });
    expect(await h.act('a', { type: 'draw', turn: 0 })).toMatchObject({ ok: false });
    h.advance(PODIUM);
    const scores = Object.fromEntries(h.finished!.map((r) => [r.playerId, r.score]));
    expect(scores).toEqual({ a: 1, b: 1, c: 0 });
  });

  it('oyun sırasında ayar değişikliği', async () => {
    const h = await started();
    h.changeSettings({ nopeSeconds: 8 });
    arrange(h, { current: 'a', hands: { a: ['skip'] } });
    await h.act('a', { type: 'play', cardIds: [cardOf(h, 'a', 'skip')] });
    expect(h.view('a').endsAt - h.now).toBe(8_000);
  });
});
