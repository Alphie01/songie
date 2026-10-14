import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type Card, type CardColor, type CardValue, type ColorCardsSettings, type ColorCardsView } from '@songie/color-cards/shared';
import { colorCardsServer, deal, seededRng, type ColorCardsState } from '@songie/color-cards/server';
import { fixtureWriter } from './lib.js';

/**
 * Renk Renk görünümleri. Her dosyada `me` (görünümün sahibi) ve gerekirse
 * `offline` (bağlantısı kopan oyuncular) da yazılır; mobil test odayı bunlarla kurar.
 */
const out = fixtureWriter('color-cards');
const PLAYERS = ['ali', 'ayse', 'cem'];

function setup(patch: Partial<ColorCardsSettings> = {}, players = PLAYERS, seed = 7) {
  const settings = { ...defaultSettings, ...patch };
  const h = createHarness<ColorCardsView>(colorCardsServer({ random: seededRng(seed), timing: { roundMs: 8000, podiumMs: 5000 } }), {
    players,
    settings,
  });
  return { h, settings };
}

const st = (h: Harness<ColorCardsView>) => h.state as ColorCardsState;

const COLOR_OF: Record<string, CardColor> = { g: 'green', y: 'yellow', r: 'red', p: 'purple' };
let seq = 0;
/** "g5", "rS" (Atla), "yR" (Yön), "p+2", "W" (Renk seç), "W4" (+4). */
function c(code: string): Card {
  const id = `f${++seq}`;
  if (code === 'W') return { id, color: null, value: 'wild' };
  if (code === 'W4') return { id, color: null, value: 'wild4' };
  const color = COLOR_OF[code[0]!]!;
  const rest = code.slice(1);
  const value: CardValue = rest === 'S' ? 'skip' : rest === 'R' ? 'reverse' : rest === '+2' ? 'draw2' : (rest as CardValue);
  return { id, color, value };
}

function arrange(
  h: Harness<ColorCardsView>,
  o: { hands?: Record<string, string[]>; deck?: string[]; top?: string; color?: CardColor; current?: string; dir?: 1 | -1 },
) {
  const s = st(h);
  if (o.hands) for (const [id, codes] of Object.entries(o.hands)) s.hands[id] = codes.map(c);
  if (o.deck) s.deck = o.deck.map(c);
  if (o.top) {
    const t = c(o.top);
    s.discard = [...s.discard.slice(0, -1), t];
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

const find = (h: Harness<ColorCardsView>, id: string, color: CardColor | null, value: CardValue) =>
  st(h).hands[id]!.find((x) => x.color === color && x.value === value)!.id;
const play = (h: Harness<ColorCardsView>, id: string, color: CardColor | null, value: CardValue, extra: Record<string, unknown> = {}) =>
  h.act(id, { type: 'play', cardId: find(h, id, color, value), ...extra });

async function must(p: Promise<{ ok: boolean; error?: string }>) {
  const r = await p;
  if (!r.ok) throw new Error(`hamle reddedildi: ${r.error}`);
}

const write = (name: string, h: Harness<ColorCardsView>, me: string, settings: ColorCardsSettings, extra: Record<string, unknown> = {}) =>
  out.write(name, h.view(me), { settings, me, players: h.ctx.players().map((p) => p.id), ...extra });

// ---------- Tek el: sıra bende / başkasında, çekme, son kart ----------
{
  const { h, settings } = setup();
  await h.start();
  arrange(h, {
    hands: { ali: ['g3', 'r5', 'y9', 'W', 'g1', 'W4', 'p7', 'yS', 'rR', 'p+2'], ayse: ['p1', 'p2', 'y4', 'g8', 'r+2'], cem: ['y1', 'y2', 'r3', 'p4', 'g6', 'W'] },
    top: 'g5',
    current: 'ali',
    deck: ['g7', 'r1', 'y2', 'p3', 'g4', 'r6', 'y8', 'p9'],
  });
  write('play-host', h, 'ali', settings);
  write('play-guest', h, 'cem', settings);
  // Oynanabilir kart çek: "Tut ve sırayı geçir".
  await must(h.act('ali', { type: 'draw', step: h.view('ali').step }));
  write('drew', h, 'ali', settings);
  // Tut ve geç; sonra eşleşen kart ve joker: renk seçildi, açık kart ve günlük dolu.
  await must(h.act('ali', { type: 'pass', step: h.view('ali').step }));
  await must(play(h, 'ayse', 'green', '8'));
  await must(play(h, 'cem', null, 'wild', { color: 'purple' }));
  write('after-wild', h, 'ayse', settings);
}

{
  // Son kart: söylemeden 1 karta inen yakalanabilir.
  const { h, settings } = setup();
  await h.start();
  arrange(h, { hands: { ali: ['g1', 'g2'], ayse: ['p1', 'p2', 'p3'], cem: ['y1', 'y4'] }, top: 'g5', current: 'ali', deck: ['r1', 'r2', 'r3', 'r4'] });
  await must(play(h, 'ali', 'green', '1'));
  write('exposed-me', h, 'ali', settings);
  write('exposed-catch', h, 'cem', settings);
  // Önceden "Son kart!" diyen: rozet.
  await must(h.act('cem', { type: 'callLast' }));
  await must(h.act('ali', { type: 'callLast' }));
  write('called', h, 'ayse', settings);
}

// ---------- Açılış kartı Renk seç: ilk oyuncu rengi seçer ----------
{
  const players = PLAYERS;
  let seed = 1;
  for (; seed < 5000; seed++) {
    const rng = seededRng(seed);
    rng();
    if (deal(players, rng).deck[0]!.value === 'wild') break;
  }
  const { h, settings } = setup({}, players, seed);
  await h.start();
  const picker = st(h).current;
  const other = players.find((x) => x !== picker)!;
  write('color-mine', h, picker, settings);
  write('color-other', h, other, settings);
}

// ---------- Ceza yığma, +4 itirazı, el gösterimi ----------
{
  const { h, settings } = setup({ stacking: true, turnSeconds: 20 });
  await h.start();
  arrange(h, { hands: { ali: ['g+2', 'g1'], ayse: ['r+2', 'p2', 'y7'], cem: ['y1', 'y2'] }, top: 'g5', current: 'ali', deck: Array(12).fill('p9') });
  await must(play(h, 'ali', 'green', 'draw2'));
  write('penalty-mine', h, 'ayse', settings);
  write('penalty-other', h, 'cem', settings);
}

{
  const { h, settings } = setup({ stacking: true });
  await h.start();
  arrange(h, { hands: { ali: ['W4', 'r1', 'g7'], ayse: ['W4', 'p2', 'y7'], cem: ['y1', 'y2'] }, top: 'g5', current: 'ali', deck: Array(12).fill('p9') });
  await must(play(h, 'ali', null, 'wild4', { color: 'red' }));
  write('challenge-victim', h, 'ayse', settings);
  write('challenge-other', h, 'cem', settings);
}

{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { hands: { ali: ['W4', 'g1', 'r7'], ayse: ['p1', 'y3'], cem: ['y1'] }, top: 'g5', current: 'ali', deck: Array(12).fill('p9') });
  await must(play(h, 'ali', null, 'wild4', { color: 'red' }));
  write('challenge-nostack', h, 'ayse', settings);
  await must(h.act('ayse', { type: 'challenge', step: h.view('ayse').step }));
  write('reveal-guilty', h, 'ayse', settings);
}

{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { hands: { ali: ['W4', 'r1', 'y7'], ayse: ['p1'], cem: ['y1'] }, top: 'g5', current: 'ali', deck: Array(12).fill('p9') });
  await must(play(h, 'ali', null, 'wild4', { color: 'red' }));
  await must(h.act('ayse', { type: 'challenge', step: h.view('ayse').step }));
  write('reveal-clean', h, 'ayse', settings);
}

// ---------- Ev kuralları: 7-0, sınırsız çekme, tur süresi ----------
{
  const { h, settings } = setup({ sevenZero: true, drawUntilPlayable: true, turnSeconds: 40 }, ['ali', 'ayse', 'cem', 'deniz']);
  await h.start();
  arrange(h, {
    hands: { ali: ['g7', 'g1', 'r7', 'y2'], ayse: ['p1', 'p2'], cem: ['y1', 'y2', 'y3'], deniz: ['r2', 'r3', 'r4', 'r5'] },
    top: 'g5',
    current: 'ali',
    dir: -1,
  });
  write('seven-zero', h, 'ali', settings);
}

// ---------- Bağlantısı kopan oyuncu, izleyici ----------
{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { hands: { ali: ['y1'], ayse: ['p1', 'p2'], cem: ['y1'] }, top: 'g5', current: 'ayse', deck: ['g7', 'r1'] });
  h.setConnected('ayse', false);
  write('host-skip', h, 'ali', settings, { offline: ['ayse'] });
  h.join('deniz');
  h.ctx.pushViews();
  write('spectator', h, 'deniz', settings, { offline: ['ayse'] });
}

// ---------- Puan modu: puanlar, el sonu, oyun sonu ----------
{
  const { h, settings } = setup({ mode: 'points' });
  await h.start();
  st(h).scores = { ali: 120, ayse: 64, cem: 0 };
  arrange(h, { hands: { ali: ['g1'], ayse: ['p9', 'rS'], cem: ['W', 'y3'] }, top: 'g5', current: 'ali' });
  write('points-play', h, 'ayse', settings);
  await must(play(h, 'ali', 'green', '1'));
  write('round-over', h, 'ayse', settings);
  write('round-over-host', h, 'ali', settings);
}

{
  const { h, settings } = setup({ mode: 'points' }, ['ali', 'ayse', 'cem', 'deniz', 'ece']);
  await h.start();
  st(h).scores = { ali: 480, ayse: 210, cem: 95, deniz: 30, ece: 0 };
  arrange(h, { hands: { ali: ['g1'], ayse: ['W4'], cem: ['p2', 'p3'], deniz: ['y1'], ece: ['r5', 'r6', 'r7'] }, top: 'g5', current: 'ali' });
  await must(play(h, 'ali', 'green', '1'));
  write('over-points', h, 'cem', settings);
}

{
  const { h, settings } = setup({}, ['ali', 'ayse', 'cem', 'deniz']);
  await h.start();
  arrange(h, { hands: { ali: ['g1'], ayse: ['p1', 'p2', 'p3'], cem: ['y1'], deniz: ['r2', 'r3'] }, top: 'g5', current: 'ali' });
  await must(play(h, 'ali', 'green', '1'));
  write('over-single', h, 'ayse', settings);
}

{
  // Oda sahibi oyunu erken bitirdi: kazanan yok.
  const { h, settings } = setup({}, ['ali', 'ayse']);
  await h.start();
  h.end();
  write('over-ended', h, 'ali', settings);
}

out.done();
