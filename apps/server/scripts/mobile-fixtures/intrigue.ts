import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type Card, type IntrigueSettings, type IntrigueView, type Role } from '@songie/intrigue/shared';
import { intrigueServer, seededRng, type IntrigueState } from '@songie/intrigue/server';
import { fixtureWriter } from './lib.js';

/**
 * Entrika görünümleri. Her dosyada `me` (görünümün sahibi), `players` (odadakiler, ilk oyuncu oda sahibi)
 * ve gerekirse `offline` (bağlantısı kopanlar) da yazılır; mobil test odayı bunlarla kurar.
 */
const out = fixtureWriter('intrigue');
type H = Harness<IntrigueView>;
const PLAYERS = ['ali', 'ayse', 'cem', 'deniz'];

let seq = 0;
const mk = (role: Role): Card => ({ id: `k${++seq}x`, role });
const st = (h: H) => h.state as IntrigueState;

interface Table {
  h: H;
  settings: IntrigueSettings;
  players: string[];
}

/** Elleri, altınları, desteyi ve sırayı elle kurar (sunucu testlerindeki `arrange` gibi). */
async function table(
  opts: { settings?: Partial<IntrigueSettings>; players?: string[]; hands?: Record<string, Role[]>; coins?: Record<string, number>; current?: string } = {},
): Promise<Table> {
  const players = opts.players ?? PLAYERS;
  const settings: IntrigueSettings = { ...defaultSettings, ...opts.settings };
  const h = createHarness<IntrigueView>(intrigueServer({ random: seededRng(7), timing: { podiumMs: 10_000 } }), { players, settings });
  await h.start();
  const s = st(h);
  const hands: Record<string, Role[]> = { ali: ['treasurer', 'assassin'], ayse: ['spy', 'guard'], cem: ['pirate', 'spy'], deniz: ['guard', 'treasurer'], ...opts.hands };
  for (const id of players) {
    s.hands[id] = (hands[id] ?? ['guard', 'spy']).map(mk);
    s.coins[id] = opts.coins?.[id] ?? 2;
  }
  s.deck = (['treasurer', 'assassin', 'pirate', 'guard', 'spy', 'pirate', 'assassin'] as Role[]).map(mk);
  s.current = opts.current ?? 'ali';
  h.ctx.pushViews();
  return { h, settings, players };
}

const act = (h: H, by: string, action: string, target?: string) => h.act(by, { type: 'act', turn: h.view(by).turn, action, target });
const win = (h: H, by: string) => h.view(by).window!.id;
const pass = (h: H, by: string) => h.act(by, { type: 'pass', windowId: win(h, by) });
const challenge = (h: H, by: string) => h.act(by, { type: 'challenge', windowId: win(h, by) });
const block = (h: H, by: string, role: Role) => h.act(by, { type: 'block', windowId: win(h, by), role });
const cardOf = (h: H, id: string, role: Role) => st(h).hands[id]!.find((c) => c.role === role)!.id;

function write(name: string, t: Table, me: string, extra: Record<string, unknown> = {}) {
  out.write(name, t.h.view(me), { settings: t.settings, me, players: t.players, ...extra });
}

// Eylem seçimi
{
  const t = await table({ coins: { ali: 3 } });
  write('action-me', t, 'ali');
  write('action-guest', t, 'cem');
}
{
  const t = await table({ settings: { turnSeconds: 45 }, coins: { ali: 7 } });
  write('action-timed', t, 'ali');
}
{
  const t = await table({ coins: { ali: 10 } });
  write('action-mustcoup', t, 'ali');
}

// Rol iddiası (Vergi): itiraz penceresi
{
  const t = await table();
  await act(t.h, 'ali', 'tax');
  write('window-claim-actor', t, 'ali');
  write('window-claim', t, 'ayse');
  await pass(t.h, 'cem');
  write('window-passed', t, 'cem');
  t.h.join('emre');
  t.h.ctx.pushViews();
  write('window-spectator', t, 'emre', { players: [...t.players, 'emre'] });
}

// Çal: hedef itiraz edebilir ya da iki rolle engelleyebilir; sonra engele itiraz
{
  const t = await table();
  await act(t.h, 'ali', 'steal', 'ayse');
  write('window-steal-target', t, 'ayse');
  write('window-steal-other', t, 'cem');
  await block(t.h, 'ayse', 'spy');
  write('window-counter', t, 'ali');
  write('window-counter-blocker', t, 'ayse');
}

// Yardım iste: yalnızca engel
{
  const t = await table();
  await act(t.h, 'ali', 'aid');
  write('window-aid', t, 'ayse');
}

// Suikast: hedef yanlış itiraz eder (kart gösterilir), kart kaybeder, sonra hâlâ engelleyebilir
{
  const t = await table({ coins: { ali: 3 } });
  await act(t.h, 'ali', 'assassinate', 'ayse');
  await challenge(t.h, 'ayse');
  write('flash-true', t, 'cem');
  write('lose-challenge', t, 'ayse');
  await t.h.act('ayse', { type: 'lose', cardId: cardOf(t.h, 'ayse', 'spy') });
  write('window-block-only', t, 'ayse');
}

// Darbe: kart kaybı
{
  const t = await table({ coins: { ali: 7 } });
  await act(t.h, 'ali', 'coup', 'ayse');
  write('lose-me', t, 'ayse');
  write('lose-other', t, 'cem');
}

// Blöf yakalandı
{
  const t = await table();
  await act(t.h, 'ali', 'steal', 'cem');
  await challenge(t.h, 'deniz');
  write('flash-false', t, 'deniz');
}

// Değiş tokuş
{
  const t = await table();
  await act(t.h, 'ali', 'exchange');
  for (const id of ['ayse', 'cem', 'deniz']) await pass(t.h, id);
  write('exchange-me', t, 'ali');
  write('exchange-other', t, 'ayse');
}

// Elenen oyuncu: iki kartı da açık
{
  const t = await table({ hands: { ali: ['spy'] }, coins: { ayse: 7 }, current: 'ayse' });
  st(t.h).revealed.ali = ['guard'];
  t.h.ctx.pushViews();
  await act(t.h, 'ayse', 'coup', 'ali');
  write('out-me', t, 'ali');
  write('out-guest', t, 'cem');
}

// Oda sahibi: sırası gelen oyuncunun bağlantısı koptu (odada çevrimdışı)
{
  const t = await table({ current: 'ayse' });
  write('host-default', t, 'ali', { offline: ['ayse'] });
}

// İki kişilik masa
{
  const t = await table({ players: ['ali', 'ayse'] });
  write('two-players', t, 'ali');
}

// Oyun sonu: ali herkesi darbeyle eler
{
  const t = await table({ coins: { ali: 21 }, hands: { ayse: ['pirate'], cem: ['spy'], deniz: ['guard'] } });
  for (const target of ['ayse', 'cem', 'deniz']) {
    st(t.h).current = 'ali';
    st(t.h).turn++;
    await act(t.h, 'ali', 'coup', target);
  }
  write('over-winner', t, 'ali');
  write('over-guest', t, 'cem');
}
{
  const t = await table();
  t.h.end();
  write('over-ended', t, 'ayse');
}

out.done();
