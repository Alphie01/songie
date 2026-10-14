import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type Card, type CardKind, type KittenSettings, type KittenView } from '@songie/kitten/shared';
import { kittenServer, seededRng, type KittenState } from '@songie/kitten/server';
import { fixtureWriter } from './lib.js';

/**
 * Bomba Kedi görünümleri. Her dosyada `me` (görünümün sahibi), `players` ve gerekirse
 * `offline` (bağlantısı kopan oyuncular) da yazılır; mobil test odayı bunlarla kurar.
 */
const out = fixtureWriter('kitten');
const PLAYERS = ['ali', 'ayse', 'cem'];
const PHASE = 20_000;

function setup(patch: Partial<KittenSettings> = {}, players = PLAYERS, seed = 7) {
  const settings = { ...defaultSettings, ...patch };
  const h = createHarness<KittenView>(kittenServer({ random: seededRng(seed), timing: { phaseMs: PHASE, podiumMs: 5000 } }), { players, settings });
  return { h, settings };
}

let seq = 0;
const c = (kind: CardKind): Card => ({ id: `f${++seq}`, kind });
const st = (h: Harness<KittenView>) => h.state as KittenState;

function arrange(h: Harness<KittenView>, opts: { hands?: Record<string, CardKind[]>; deck?: CardKind[]; current?: string; discard?: CardKind[] }) {
  const s = st(h);
  if (opts.hands) for (const [id, kinds] of Object.entries(opts.hands)) s.hands[id] = kinds.map(c);
  if (opts.deck) s.deck = opts.deck.map(c);
  if (opts.discard) s.discard = opts.discard.map(c);
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

async function must(p: Promise<{ ok: boolean; error?: string }>) {
  const r = await p;
  if (!r.ok) throw new Error(`hamle reddedildi: ${r.error}`);
  return r as { ok: true; [k: string]: unknown };
}

const write = (name: string, h: Harness<KittenView>, me: string, settings: KittenSettings, extra: Record<string, unknown> = {}) =>
  out.write(name, h.view(me), { settings, me, players: h.ctx.players().map((p) => p.id), ...extra });

const DECK: CardKind[] = ['skip', 'favor', 'future', 'attack', 'bomb', 'tekir', 'pamuk', 'kara', 'shuffle', 'nope', 'bomb', 'benek'];
const FULL: CardKind[] = ['defuse', 'attack', 'skip', 'future', 'shuffle', 'favor', 'nope', 'tekir', 'tekir', 'sarman', 'pamuk', 'kara', 'benek'];

// ---------- Oyun başı: ıskarta boş ----------
{
  const { h, settings } = setup();
  await h.start();
  const first = st(h).current;
  write('start', h, first, settings);
  write('start-other', h, PLAYERS.find((x) => x !== first)!, settings);
}

// ---------- Sıra bende / başkasında; Hayır penceresi ----------
{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { current: 'ali', deck: DECK, discard: ['skip', 'attack'], hands: { ali: FULL, ayse: ['nope', 'nope', 'kara'], cem: ['tekir', 'pamuk'] } });
  write('play-host', h, 'ali', settings);
  write('play-guest', h, 'cem', settings);
  const res = await must(h.act('ali', { type: 'play', cardIds: [cardOf(h, 'ali', 'attack')] }));
  const pendingId = res.pendingId as number;
  write('nope-actor', h, 'ali', settings);
  write('nope-can', h, 'ayse', settings);
  write('nope-none', h, 'cem', settings);
  await must(h.act('ayse', { type: 'nope', pendingId, cardId: cardOf(h, 'ayse', 'nope') }));
  write('nope-cancelled', h, 'cem', settings);
  h.advance(5_000);
  // Saldırı durduruldu; sıra hâlâ ali'de. Geleceği Gör: üstteki 3 kart yalnızca ona.
  await must(h.act('ali', { type: 'play', cardIds: [cardOf(h, 'ali', 'future')] }));
  h.advance(5_000);
  write('peek', h, 'ali', settings);
}

// ---------- Saldırı: sıradaki 2 tur oynar ----------
{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { current: 'ali', deck: DECK, hands: { ali: ['attack', 'skip'], ayse: ['defuse', 'kara', 'kara', 'kara', 'nope'] } });
  await must(h.act('ali', { type: 'play', cardIds: [cardOf(h, 'ali', 'attack')] }));
  h.advance(5_000);
  write('attacked', h, 'ayse', settings);
  write('attacked-other', h, 'cem', settings);
}

// ---------- İyilik İste ----------
{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { current: 'ali', deck: DECK, hands: { ali: ['favor', 'skip'], ayse: ['nope', 'kara', 'defuse', 'future'] } });
  await must(h.act('ali', { type: 'play', cardIds: [cardOf(h, 'ali', 'favor')], target: 'ayse' }));
  h.advance(5_000);
  write('favor-giver', h, 'ayse', settings);
  write('favor-asker', h, 'ali', settings);
  write('favor-other', h, 'cem', settings);
}

// ---------- 5 farklı kedi: ıskartadan seç ----------
{
  const { h, settings } = setup();
  await h.start();
  arrange(h, {
    current: 'ali',
    deck: DECK,
    discard: ['defuse', 'attack', 'future', 'skip', 'nope', 'shuffle'],
    hands: { ali: ['sarman', 'tekir', 'pamuk', 'kara', 'benek', 'skip'] },
  });
  await must(h.act('ali', { type: 'play', cardIds: ['sarman', 'tekir', 'pamuk', 'kara', 'benek'].map((k) => cardOf(h, 'ali', k as CardKind)) }));
  h.advance(5_000);
  write('pick-mine', h, 'ali', settings);
  write('pick-other', h, 'cem', settings);
}

// ---------- Bomba: etkisiz kılma, geri koyma, gizli konum ----------
{
  const { h, settings } = setup({ turnSeconds: 30 });
  await h.start();
  arrange(h, { current: 'ali', deck: ['bomb', 'skip', 'future', 'shuffle', 'favor', 'tekir'], hands: { ali: ['defuse', 'attack', 'kara'] } });
  write('timed', h, 'ali', settings);
  await must(draw(h, 'ali'));
  write('bomb-mine', h, 'ali', settings);
  write('bomb-other', h, 'cem', settings);
  await must(h.act('ali', { type: 'defuse' }));
  write('place-mine', h, 'ali', settings);
  write('place-other', h, 'cem', settings);
  await must(h.act('ali', { type: 'place', index: 2 }));
  write('after-place', h, 'ali', settings);
}

{
  // Destede 2 kart: kaydırıcı yok, "Üstten 2." var.
  const { h, settings } = setup();
  await h.start();
  arrange(h, { current: 'ali', deck: ['bomb', 'skip', 'tekir'], hands: { ali: ['defuse'] } });
  await must(draw(h, 'ali'));
  await must(h.act('ali', { type: 'defuse' }));
  write('place-short', h, 'ali', settings);
}

// ---------- Patlama: elenen oyuncu ve diğerleri ----------
{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { current: 'cem', deck: ['bomb', 'skip', 'skip', 'bomb'], hands: { cem: ['attack', 'sarman'] } });
  write('before-boom', h, 'ali', settings);
  write('before-boom-dead', h, 'cem', settings);
  await must(draw(h, 'cem'));
  write('boom', h, 'ali', settings);
  write('boom-dead', h, 'cem', settings);
}

{
  // Elinde kart kalmamış oyuncu.
  const { h, settings } = setup();
  await h.start();
  arrange(h, { current: 'ali', deck: DECK, hands: { ali: [] } });
  write('empty-hand', h, 'ali', settings);
}

// ---------- Bağlantısı kopan oyuncu, izleyici ----------
{
  const { h, settings } = setup({ fiveCats: false }, ['ali', 'ayse', 'cem', 'deniz', 'ece', 'fuat']);
  await h.start();
  arrange(h, { current: 'ayse', deck: DECK });
  h.setConnected('ayse', false);
  write('host-skip', h, 'ali', settings, { offline: ['ayse'] });
  h.join('gul');
  h.ctx.pushViews();
  write('spectator', h, 'gul', settings, { offline: ['ayse'] });
}

// ---------- Oyun sonu ----------
{
  const { h, settings } = setup({}, ['ali', 'ayse', 'cem', 'deniz', 'ece']);
  await h.start();
  arrange(h, { current: 'ayse', deck: ['bomb', 'bomb', 'bomb', 'bomb', 'skip'], hands: { ayse: [], cem: [], deniz: [], ece: [] } });
  for (const id of ['ayse', 'cem', 'deniz', 'ece']) await must(draw(h, id));
  write('over-winner', h, 'cem', settings);
}

{
  const { h, settings } = setup();
  await h.start();
  arrange(h, { current: 'cem', deck: ['bomb', 'skip', 'skip'], hands: { cem: [] } });
  await must(draw(h, 'cem'));
  h.end();
  write('over-ended', h, 'ali', settings);
}

out.done();
