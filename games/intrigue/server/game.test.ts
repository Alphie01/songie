import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { ROLES, type Card, type IntrigueView, type Role } from '../shared/index.js';
import { deal, intrigueServer, seededRng, type IntrigueState } from './index.js';

const LOSE = 20_000;
const EXCHANGE = 30_000;
const PODIUM = 5_000;
const WIN = 8_000; // varsayılan itiraz penceresi

type H = Harness<IntrigueView>;

function setup(players: string[], settings: Record<string, unknown> = {}, seed = 7): H {
  return createHarness<IntrigueView>(
    intrigueServer({ random: seededRng(seed), timing: { loseMs: LOSE, exchangeMs: EXCHANGE, podiumMs: PODIUM } }),
    { players, settings },
  );
}

let seq = 0;
const mk = (role: Role): Card => ({ id: `x${++seq}z`, role });
const st = (h: H) => h.state as IntrigueState;

/** Elleri, altınları, desteyi ve sırayı elle kur. */
function arrange(
  h: H,
  opts: { hands?: Record<string, Role[]>; coins?: Record<string, number>; deck?: Role[]; current?: string },
) {
  const s = st(h);
  if (opts.hands) for (const [id, roles] of Object.entries(opts.hands)) s.hands[id] = roles.map(mk);
  if (opts.coins) Object.assign(s.coins, opts.coins);
  if (opts.deck) s.deck = opts.deck.map(mk);
  if (opts.current) s.current = opts.current;
  h.ctx.pushViews();
}

async function started(players = ['a', 'b', 'c'], settings: Record<string, unknown> = {}, seed = 7) {
  const h = setup(players, settings, seed);
  await h.start();
  return h;
}

/** a sırada; herkes [guard, spy] ile 2 altın. */
async function table(players = ['a', 'b', 'c'], settings: Record<string, unknown> = {}) {
  const h = await started(players, settings);
  const hands: Record<string, Role[]> = {};
  const coins: Record<string, number> = {};
  for (const p of players) {
    hands[p] = ['guard', 'spy'];
    coins[p] = 2;
  }
  arrange(h, { hands, coins, deck: ['treasurer', 'treasurer', 'pirate', 'pirate', 'assassin'], current: 'a' });
  return h;
}

const act = (h: H, by: string, action: string, target?: string) => h.act(by, { type: 'act', turn: h.view(by).turn, action, target });
const win = (h: H, by: string) => h.view(by).window!.id;
const pass = (h: H, by: string) => h.act(by, { type: 'pass', windowId: win(h, by) });
const challenge = (h: H, by: string) => h.act(by, { type: 'challenge', windowId: win(h, by) });
const block = (h: H, by: string, role: Role) => h.act(by, { type: 'block', windowId: win(h, by), role });
const hand = (h: H, id: string) => st(h).hands[id]!;
const coins = (h: H, id: string) => st(h).coins[id]!;
const cardOf = (h: H, id: string, role: Role) => hand(h, id).find((c) => c.role === role)!.id;

describe('dağıtım', () => {
  it.each([2, 3, 4, 5, 6])('%i oyuncu: rol başına 3 kart, herkese 2', (n) => {
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    const { hands, deck } = deal(ids, 3, seededRng(n));
    for (const id of ids) expect(hands[id]).toHaveLength(2);
    const all = [...Object.values(hands).flat(), ...deck];
    expect(all).toHaveLength(15);
    for (const r of ROLES) expect(all.filter((c) => c.role === r)).toHaveLength(3);
    expect(new Set(all.map((c) => c.id)).size).toBe(15);
  });

  it('7–10 kişide rol başına 4 kart, ayar açıksa küçük masada da', async () => {
    const seven = await started(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(st(seven).perRole).toBe(4);
    expect(st(seven).deck).toHaveLength(20 - 14);
    const big = await started(['a', 'b', 'c'], { bigDeck: true });
    expect(st(big).perRole).toBe(4);
    const small = await started(['a', 'b', 'c']);
    expect(st(small).perRole).toBe(3);
    expect(small.view('a').cardsPerRole).toBe(3);
  });

  it('herkes 2 altınla başlar; 2 kişide başlayan 1 altınla', async () => {
    const h = await started(['a', 'b', 'c']);
    for (const p of ['a', 'b', 'c']) expect(h.view(p).players.find((x) => x.id === p)!.coins).toBe(2);
    for (const seed of [1, 2, 3, 4]) {
      const d = await started(['a', 'b'], {}, seed);
      const first = st(d).current;
      const other = first === 'a' ? 'b' : 'a';
      expect(coins(d, first)).toBe(1);
      expect(coins(d, other)).toBe(2);
    }
  });

  it('eller gizli, deste gizli', async () => {
    const h = await started(['a', 'b', 'c']);
    const s = st(h);
    expect(h.view('a').me.hand).toEqual(s.hands.a);
    for (const c of s.hands.b!) expect(h.seen('a')).not.toContain(`"${c.id}"`);
    for (const c of s.deck) for (const p of ['a', 'b', 'c']) expect(h.seen(p)).not.toContain(`"${c.id}"`);
    expect(h.view('a').players.find((p) => p.id === 'b')).toMatchObject({ hidden: 2, revealed: [] });
  });
});

describe('temel eylemler', () => {
  it('Gelir: +1 ve sıra geçer, itiraz penceresi yok', async () => {
    const h = await table();
    expect(await act(h, 'a', 'income')).toMatchObject({ ok: true });
    expect(coins(h, 'a')).toBe(3);
    expect(st(h).current).toBe('b');
    expect(h.view('a').phase).toBe('action');
  });

  it('sırası olmayan eylem seçemez; eski tur numarası yutulur', async () => {
    const h = await table();
    const r = await h.act('b', { type: 'act', turn: h.view('b').turn, action: 'income' });
    expect(r).toMatchObject({ ok: false });
    const turn = h.view('a').turn;
    await act(h, 'a', 'income');
    expect(await h.act('a', { type: 'act', turn, action: 'income' })).toMatchObject({ ok: true, stale: true });
    expect(coins(h, 'a')).toBe(3);
  });

  it('Yardım iste: herkes geçerse +2', async () => {
    const h = await table();
    await act(h, 'a', 'aid');
    const v = h.view('b');
    expect(v.phase).toBe('window');
    expect(v.window).toMatchObject({ kind: 'block', canChallenge: false, blockers: ['b', 'c'], blockRoles: ['treasurer'] });
    await pass(h, 'b');
    expect(coins(h, 'a')).toBe(2);
    await pass(h, 'c');
    expect(coins(h, 'a')).toBe(4);
    expect(st(h).current).toBe('b');
  });

  it('Yardım iste: süre dolarsa +2', async () => {
    const h = await table();
    await act(h, 'a', 'aid');
    h.advance(WIN - 1);
    expect(coins(h, 'a')).toBe(2);
    h.advance(1);
    expect(coins(h, 'a')).toBe(4);
  });

  it('Yardım iste penceresinde "Yalan!" denemez', async () => {
    const h = await table();
    await act(h, 'a', 'aid');
    expect(await challenge(h, 'b')).toMatchObject({ ok: false });
  });

  it('Darbe: 7 altın, engellenemez, hedef seçtiği kartı açar', async () => {
    const h = await table();
    arrange(h, { coins: { a: 7 } });
    await act(h, 'a', 'coup', 'b');
    expect(coins(h, 'a')).toBe(0);
    const v = h.view('b');
    expect(v.phase).toBe('lose');
    expect(v.window).toBeNull();
    expect(v.lose).toEqual({ player: 'b', reason: 'coup' });
    expect(await h.act('c', { type: 'lose', cardId: cardOf(h, 'b', 'spy') })).toMatchObject({ ok: false });
    await h.act('b', { type: 'lose', cardId: cardOf(h, 'b', 'spy') });
    expect(st(h).revealed.b).toEqual(['spy']);
    expect(hand(h, 'b').map((c) => c.role)).toEqual(['guard']);
    expect(h.view('c').players.find((p) => p.id === 'b')!.revealed).toEqual(['spy']);
    expect(st(h).current).toBe('b');
  });

  it('Darbe için 7 altın gerekir, kendini hedef alamazsın', async () => {
    const h = await table();
    expect(await act(h, 'a', 'coup', 'b')).toMatchObject({ ok: false });
    arrange(h, { coins: { a: 8 } });
    expect(await act(h, 'a', 'coup', 'a')).toMatchObject({ ok: false });
    expect(await act(h, 'a', 'coup')).toMatchObject({ ok: false });
  });

  it('10+ altında yalnızca Darbe', async () => {
    const h = await table();
    arrange(h, { coins: { a: 10 } });
    for (const a of ['income', 'aid', 'tax', 'exchange']) {
      const r = await act(h, 'a', a);
      expect(r).toMatchObject({ ok: false });
      if (!r.ok) expect(r.error).toContain('Darbe');
    }
    expect(await act(h, 'a', 'steal', 'b')).toMatchObject({ ok: false });
    expect(await act(h, 'a', 'coup', 'b')).toMatchObject({ ok: true });
    expect(coins(h, 'a')).toBe(3);
  });
});

describe('rol eylemleri ve itiraz', () => {
  it('Vergi: herkes geçerse +3', async () => {
    const h = await table();
    await act(h, 'a', 'tax');
    expect(h.view('b').window).toMatchObject({ kind: 'claim', claimant: 'a', claimRole: 'treasurer', canChallenge: true, blockers: [] });
    await pass(h, 'b');
    await pass(h, 'c');
    expect(coins(h, 'a')).toBe(5);
  });

  it('Vergi: itiraz yalansa iddia eden kart kaybeder, altın gelmez', async () => {
    const h = await table();
    await act(h, 'a', 'tax'); // a'da Hazinedar yok
    await challenge(h, 'b');
    const v = h.view('c');
    expect(v.flash).toMatchObject({ claimant: 'a', challenger: 'b', role: 'treasurer', had: false });
    expect(v.lose).toEqual({ player: 'a', reason: 'challenge' });
    await h.act('a', { type: 'lose', cardId: cardOf(h, 'a', 'guard') });
    expect(coins(h, 'a')).toBe(2);
    expect(st(h).revealed.a).toEqual(['guard']);
    expect(st(h).current).toBe('b');
    expect(st(h).log.some((e) => e.t === 'failed')).toBe(true);
  });

  it('Vergi: itiraz yanlışsa itiraz eden kart kaybeder, kart desteye karışır ve yenisi çekilir, +3', async () => {
    const h = await table();
    arrange(h, { hands: { a: ['treasurer', 'guard'] } });
    const shown = cardOf(h, 'a', 'treasurer');
    const kept = cardOf(h, 'a', 'guard');
    await act(h, 'a', 'tax');
    await challenge(h, 'c');
    expect(h.view('b').flash).toMatchObject({ claimant: 'a', challenger: 'c', role: 'treasurer', had: true });
    expect(hand(h, 'a')).toHaveLength(2);
    expect(hand(h, 'a').some((c) => c.id === shown)).toBe(false);
    expect(st(h).deck.some((c) => c.id === shown)).toBe(true);
    expect(st(h).deck).toHaveLength(5);
    // Yeni çekilen kart yalnızca a'ya görünür.
    const fresh = hand(h, 'a').find((c) => c.id !== kept)!;
    expect(h.view('a').me.hand.map((c) => c.id)).toContain(fresh.id);
    expect(h.seen('b')).not.toContain(`"${fresh.id}"`);
    expect(h.view('c').lose).toEqual({ player: 'c', reason: 'challenge' });
    await h.act('c', { type: 'lose', cardId: cardOf(h, 'c', 'spy') });
    expect(coins(h, 'a')).toBe(5);
    expect(st(h).current).toBe('b');
  });

  it('pencerede geçen oyuncu artık itiraz edemez; iddia sahibi kendine itiraz edemez', async () => {
    const h = await table();
    await act(h, 'a', 'tax');
    await pass(h, 'b');
    expect(await challenge(h, 'b')).toMatchObject({ ok: false });
    expect(await challenge(h, 'a')).toMatchObject({ ok: false });
  });

  it('Çalma: hedeften 2 altın (azsa olanı)', async () => {
    const h = await table();
    arrange(h, { coins: { b: 1 } });
    await act(h, 'a', 'steal', 'b');
    expect(h.view('b').window).toMatchObject({ kind: 'claim', claimRole: 'pirate', blockers: ['b'], blockRoles: ['pirate', 'spy'] });
    expect(h.view('c').window!.blockers).toEqual(['b']);
    await pass(h, 'b');
    await pass(h, 'c');
    expect(coins(h, 'a')).toBe(3);
    expect(coins(h, 'b')).toBe(0);
  });

  it('Çalma: yalnızca hedef engelleyebilir, yalnızca Korsan ya da Casus ile', async () => {
    const h = await table();
    await act(h, 'a', 'steal', 'b');
    expect(await block(h, 'c', 'spy')).toMatchObject({ ok: false });
    expect(await block(h, 'b', 'guard')).toMatchObject({ ok: false });
    expect(await block(h, 'b', 'spy')).toMatchObject({ ok: true });
    const v = h.view('a');
    expect(v.window).toMatchObject({ kind: 'counter', claimant: 'b', claimRole: 'spy', eligible: ['a', 'c'] });
    await pass(h, 'a');
    await pass(h, 'c');
    expect(coins(h, 'a')).toBe(2);
    expect(coins(h, 'b')).toBe(2);
    expect(st(h).log.some((e) => e.t === 'blocked')).toBe(true);
    expect(st(h).current).toBe('b');
  });

  it('Engele itiraz: engelleyen yalan söylediyse kart kaybeder ve eylem gerçekleşir', async () => {
    const h = await table();
    await act(h, 'a', 'steal', 'b');
    await block(h, 'b', 'pirate'); // b'de Korsan yok
    await challenge(h, 'a');
    expect(h.view('c').flash).toMatchObject({ claimant: 'b', challenger: 'a', role: 'pirate', had: false });
    await h.act('b', { type: 'lose', cardId: cardOf(h, 'b', 'guard') });
    expect(coins(h, 'a')).toBe(4);
    expect(coins(h, 'b')).toBe(0);
  });

  it('Engele itiraz: engelleyen doğruysa itiraz eden kart kaybeder ve eylem engellenir', async () => {
    const h = await table();
    await act(h, 'a', 'steal', 'b');
    await block(h, 'b', 'spy');
    const shown = cardOf(h, 'b', 'spy');
    await challenge(h, 'c');
    expect(h.view('a').flash).toMatchObject({ claimant: 'b', challenger: 'c', role: 'spy', had: true });
    expect(hand(h, 'b').some((c) => c.id === shown)).toBe(false);
    expect(hand(h, 'b')).toHaveLength(2);
    await h.act('c', { type: 'lose', cardId: cardOf(h, 'c', 'guard') });
    expect(coins(h, 'a')).toBe(2);
    expect(coins(h, 'b')).toBe(2);
    expect(st(h).current).toBe('b');
  });

  it('Yardım iste engeli (Hazinedar) ve engele itiraz', async () => {
    const h = await table();
    await act(h, 'a', 'aid');
    await block(h, 'c', 'treasurer');
    expect(h.view('a').window).toMatchObject({ kind: 'counter', claimant: 'c', claimRole: 'treasurer' });
    await challenge(h, 'b'); // c yalan söylüyor
    await h.act('c', { type: 'lose', cardId: cardOf(h, 'c', 'spy') });
    expect(coins(h, 'a')).toBe(4);
  });

  it('Yardım iste engeline kimse itiraz etmezse engellenir', async () => {
    const h = await table();
    await act(h, 'a', 'aid');
    await block(h, 'b', 'treasurer');
    h.advance(WIN);
    expect(coins(h, 'a')).toBe(2);
    expect(st(h).current).toBe('b');
  });

  it('Suikast: 3 altın gider, hedef kart kaybeder', async () => {
    const h = await table();
    arrange(h, { coins: { a: 3 } });
    await act(h, 'a', 'assassinate', 'b');
    expect(coins(h, 'a')).toBe(0);
    expect(h.view('b').window).toMatchObject({ kind: 'claim', claimRole: 'assassin', blockers: ['b'], blockRoles: ['guard'] });
    await pass(h, 'b');
    await pass(h, 'c');
    expect(h.view('b').lose).toEqual({ player: 'b', reason: 'assassinate' });
    await h.act('b', { type: 'lose', cardId: cardOf(h, 'b', 'guard') });
    expect(st(h).revealed.b).toEqual(['guard']);
    expect(st(h).current).toBe('b');
  });

  it('Suikast: 3 altından azla yapılamaz', async () => {
    const h = await table();
    expect(await act(h, 'a', 'assassinate', 'b')).toMatchObject({ ok: false });
  });

  it('Suikast Muhafız ile engellenirse 3 altın iade edilmez', async () => {
    const h = await table();
    arrange(h, { coins: { a: 5 } });
    await act(h, 'a', 'assassinate', 'b');
    await block(h, 'b', 'guard');
    await pass(h, 'a');
    await pass(h, 'c');
    expect(coins(h, 'a')).toBe(2);
    expect(hand(h, 'b')).toHaveLength(2);
  });

  it('Suikastçı yalanı yakalanırsa da 3 altın iade edilmez', async () => {
    const h = await table();
    arrange(h, { coins: { a: 3 } });
    await act(h, 'a', 'assassinate', 'b');
    await challenge(h, 'b');
    await h.act('a', { type: 'lose', cardId: cardOf(h, 'a', 'spy') });
    expect(coins(h, 'a')).toBe(0);
    expect(hand(h, 'b')).toHaveLength(2);
  });

  it('Suikasta yanlış itiraz eden hedef kart kaybeder, sonra hâlâ engelleyebilir', async () => {
    const h = await table();
    arrange(h, { coins: { a: 3 }, hands: { a: ['assassin', 'spy'] } });
    await act(h, 'a', 'assassinate', 'b');
    await challenge(h, 'b');
    await h.act('b', { type: 'lose', cardId: cardOf(h, 'b', 'spy') });
    const v = h.view('b');
    expect(v.window).toMatchObject({ kind: 'block', blockers: ['b'], blockRoles: ['guard'], canChallenge: false });
    await block(h, 'b', 'guard');
    await pass(h, 'a');
    await pass(h, 'c');
    expect(hand(h, 'b')).toHaveLength(1);
    expect(st(h).alive).toContain('b');
  });

  it('Suikasta yanlış itiraz eden tek kartlı hedef elenir, suikast boşa düşer', async () => {
    const h = await table();
    arrange(h, { coins: { a: 3 }, hands: { a: ['assassin', 'spy'], b: ['guard'] } });
    st(h).revealed.b = ['spy'];
    await act(h, 'a', 'assassinate', 'b');
    await challenge(h, 'b');
    expect(st(h).alive).not.toContain('b');
    expect(st(h).out).toEqual(['b']);
    expect(st(h).current).toBe('c');
  });

  it('Değiş tokuş: 2 kart çek, istediğin 2 kartı sakla; çekilenler yalnızca oynayana', async () => {
    const h = await table();
    arrange(h, { deck: ['treasurer', 'assassin', 'pirate'] });
    const drawn = st(h).deck.slice(0, 2).map((c) => c.id);
    await act(h, 'a', 'exchange');
    await pass(h, 'b');
    await pass(h, 'c');
    const v = h.view('a');
    expect(v.phase).toBe('exchange');
    expect(v.exchange!.keep).toBe(2);
    expect(v.exchange!.options.map((c) => c.role).sort()).toEqual(['assassin', 'guard', 'spy', 'treasurer']);
    expect(h.view('b').exchange).toBeNull();
    expect(h.view('b').exchanging).toBe('a');
    for (const id of drawn) {
      expect(h.seen('b')).not.toContain(`"${id}"`);
      expect(h.seen('c')).not.toContain(`"${id}"`);
    }
    expect(h.seen('b')).not.toContain('"assassin"');
    expect(await h.act('a', { type: 'exchange', keep: [drawn[0]!] })).toMatchObject({ ok: false });
    expect(await h.act('b', { type: 'exchange', keep: drawn })).toMatchObject({ ok: false });
    await h.act('a', { type: 'exchange', keep: drawn });
    expect(hand(h, 'a').map((c) => c.role).sort()).toEqual(['assassin', 'treasurer']);
    expect(st(h).deck).toHaveLength(3);
    expect(st(h).deck.map((c) => c.role).sort()).toEqual(['guard', 'pirate', 'spy']);
    expect(st(h).current).toBe('b');
  });

  it('Değiş tokuşta süre dolarsa eldeki kartlar kalır', async () => {
    const h = await table();
    const before = hand(h, 'a').map((c) => c.id);
    await act(h, 'a', 'exchange');
    h.advance(WIN);
    expect(h.view('a').phase).toBe('exchange');
    h.advance(EXCHANGE);
    expect(hand(h, 'a').map((c) => c.id)).toEqual(before);
    expect(st(h).deck).toHaveLength(5);
    expect(st(h).current).toBe('b');
  });

  it('Değiş tokuş: tek kartı kalan 1 kart saklar', async () => {
    const h = await table();
    arrange(h, { hands: { a: ['spy'] } });
    st(h).revealed.a = ['guard'];
    await act(h, 'a', 'exchange');
    h.advance(WIN);
    expect(h.view('a').exchange).toMatchObject({ keep: 1 });
    expect(h.view('a').exchange!.options).toHaveLength(3);
  });
});

describe('kart kaybetme ve eleme', () => {
  it('süre dolarsa rastgele bir kart açılır', async () => {
    const h = await table();
    arrange(h, { coins: { a: 7 } });
    await act(h, 'a', 'coup', 'b');
    h.advance(LOSE - 1);
    expect(hand(h, 'b')).toHaveLength(2);
    h.advance(1);
    expect(hand(h, 'b')).toHaveLength(1);
    expect(st(h).revealed.b).toHaveLength(1);
    expect(st(h).current).toBe('b');
  });

  it('tek kartı kalan seçim yapmadan elenir; açılan kartlar herkese açık', async () => {
    const h = await table();
    arrange(h, { coins: { a: 7 }, hands: { b: ['pirate'] } });
    st(h).revealed.b = ['guard'];
    await act(h, 'a', 'coup', 'b');
    expect(st(h).alive).toEqual(['a', 'c']);
    const pb = h.view('c').players.find((p) => p.id === 'b')!;
    expect(pb).toMatchObject({ alive: false, out: 1, hidden: 0, revealed: ['guard', 'pirate'] });
    expect(st(h).current).toBe('c');
  });

  it('son kalan kazanır; sıralama elenme sırasına göre', async () => {
    const h = await table();
    arrange(h, { coins: { a: 14 }, hands: { b: ['pirate'], c: ['spy'] } });
    await act(h, 'a', 'coup', 'b');
    expect(st(h).current).toBe('c');
    st(h).current = 'a';
    st(h).turn++;
    await act(h, 'a', 'coup', 'c');
    const v = h.view('a');
    expect(v.phase).toBe('over');
    expect(v.winner).toBe('a');
    expect(h.finished).toBeNull();
    h.advance(PODIUM);
    const res = h.finished!;
    const score = (id: string) => res.find((r) => r.playerId === id)!;
    expect(score('a').meta).toMatchObject({ place: 1, winner: true });
    expect(score('c').meta).toMatchObject({ place: 2 });
    expect(score('b').meta).toMatchObject({ place: 3 });
    expect(score('a').score).toBeGreaterThan(score('c').score);
    expect(score('c').score).toBeGreaterThan(score('b').score);
  });

  it('elenen oyuncunun sırası atlanır, pencerede söz hakkı yoktur', async () => {
    const h = await table(['a', 'b', 'c', 'd']);
    arrange(h, { coins: { a: 7 }, hands: { b: ['pirate'] } });
    await act(h, 'a', 'coup', 'b');
    expect(st(h).current).toBe('c');
    await act(h, 'c', 'tax');
    expect(h.view('a').window!.eligible).toEqual(['a', 'd']);
    expect(await challenge(h, 'b')).toMatchObject({ ok: false });
  });
});

describe('zaman, bağlantı ve oda sahibi', () => {
  it('tur süresi dolarsa Gelir alınır (10+ altında Darbe)', async () => {
    const h = await table(['a', 'b', 'c'], { turnSeconds: 45 });
    // Tur saati ilk oyuncuyla başladı; düzenlemeden sonra yeniden başlat.
    await act(h, 'a', 'income');
    expect(st(h).current).toBe('b');
    h.advance(45_000);
    expect(coins(h, 'b')).toBe(3);
    expect(st(h).current).toBe('c');
    arrange(h, { coins: { c: 10 } });
    h.advance(45_000);
    expect(coins(h, 'c')).toBe(3);
    expect(h.view('a').phase).toBe('lose');
  });

  it('tur süresi pencere sırasında işlemez', async () => {
    const h = await table(['a', 'b', 'c'], { turnSeconds: 45, challengeSeconds: 12 });
    await act(h, 'a', 'income');
    await act(h, 'b', 'tax');
    h.advance(10_000);
    expect(h.view('a').phase).toBe('window');
    expect(h.view('a').endsAt).toBe(h.now + 2_000);
    expect(h.view('a').serverNow).toBe(h.now);
  });

  it('itiraz penceresi süresi ayardan gelir', async () => {
    const h = await table(['a', 'b', 'c'], { challengeSeconds: 5 });
    await act(h, 'a', 'tax');
    expect(h.view('b').durationMs).toBe(5_000);
    h.advance(5_000);
    expect(coins(h, 'a')).toBe(5);
  });

  it('kopan oyuncu pencerede beklenmez', async () => {
    const h = await table();
    h.setConnected('c', false);
    await act(h, 'a', 'tax');
    expect(h.view('b').window!.passed).toEqual(['c']);
    await pass(h, 'b');
    expect(coins(h, 'a')).toBe(5);
  });

  it('pencere açıkken kopan oyuncu geçmiş sayılır', async () => {
    const h = await table();
    await act(h, 'a', 'tax');
    await pass(h, 'b');
    h.setConnected('c', false);
    expect(coins(h, 'a')).toBe(5);
  });

  it('oda sahibi kopan oyuncunun yerine Gelir alır; yalnızca oda sahibi ve yalnızca kopuksa', async () => {
    const h = await table();
    expect(await h.act('a', { type: 'hostDefault' })).toMatchObject({ ok: false });
    await act(h, 'a', 'income');
    expect(await h.act('a', { type: 'hostDefault' })).toMatchObject({ ok: false }); // b bağlı
    h.setConnected('b', false);
    expect(await h.act('c', { type: 'hostDefault' })).toMatchObject({ ok: false }); // oda sahibi değil
    expect(await h.act('a', { type: 'hostDefault' })).toMatchObject({ ok: true });
    expect(coins(h, 'b')).toBe(3);
    expect(st(h).current).toBe('c');
  });

  it('oda sahibi kopan oyuncu için rastgele kart kaybettirir', async () => {
    const h = await table();
    arrange(h, { coins: { a: 7 } });
    await act(h, 'a', 'coup', 'b');
    h.setConnected('b', false);
    expect(await h.act('a', { type: 'hostDefault' })).toMatchObject({ ok: true });
    expect(hand(h, 'b')).toHaveLength(1);
    expect(st(h).current).toBe('b');
  });

  it('oda sahibi kopan oyuncunun değiş tokuşunu bitirir (kartlar aynen kalır)', async () => {
    const h = await table();
    const before = hand(h, 'a').map((c) => c.id);
    h.setHost('b');
    await act(h, 'a', 'exchange');
    await pass(h, 'b');
    await pass(h, 'c');
    expect(h.view('a').phase).toBe('exchange');
    h.setConnected('a', false);
    expect(await h.act('b', { type: 'hostDefault' })).toMatchObject({ ok: true });
    expect(hand(h, 'a').map((c) => c.id)).toEqual(before);
    expect(st(h).current).toBe('b');
  });

  it('sırası gelen oyuncu ayrılırsa elenir ve tur geçer', async () => {
    const h = await table(['a', 'b', 'c', 'd']);
    h.leave('a');
    expect(st(h).alive).toEqual(['b', 'c', 'd']);
    expect(st(h).current).toBe('b');
    expect(h.view('b').players.find((p) => p.id === 'a')!.revealed).toEqual(['guard', 'spy']);
  });

  it('engelleyen ayrılırsa eylem gerçekleşir', async () => {
    const h = await table();
    await act(h, 'a', 'steal', 'b');
    await block(h, 'b', 'spy');
    h.leave('b');
    // Hedef ayrıldı: çalınacak kimse yok, tur geçer.
    expect(st(h).current).toBe('c');
    expect(h.view('a').phase).toBe('action');
  });

  it('iki kişiden biri ayrılırsa oyun biter', async () => {
    const h = await table(['a', 'b']);
    h.leave('b');
    expect(h.view('a').phase).toBe('over');
    expect(h.view('a').winner).toBe('a');
  });

  it('oyunu bitir: podyum, sonra sonuçlar', async () => {
    const h = await table();
    arrange(h, { coins: { a: 7 }, hands: { b: ['pirate'] } });
    await act(h, 'a', 'coup', 'b');
    h.end();
    expect(h.view('a').phase).toBe('over');
    expect(h.view('a').winner).toBeNull();
    h.advance(PODIUM);
    expect(h.finished).toHaveLength(3);
    expect(h.finished!.find((r) => r.playerId === 'b')!.score).toBe(0);
    expect(await act(h, 'c', 'income')).toMatchObject({ ok: false });
  });

  it('ayar değişikliği süreleri günceller, deste boyutunu değiştirmez', async () => {
    const h = await table();
    h.changeSettings({ challengeSeconds: 12, bigDeck: true });
    expect(st(h).settings.challengeSeconds).toBe(12);
    expect(st(h).settings.bigDeck).toBe(false);
  });
});
