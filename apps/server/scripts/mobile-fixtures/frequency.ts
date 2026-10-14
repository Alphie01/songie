import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type FrequencyView } from '@songie/frequency/shared';
import { frequencyServer } from '@songie/frequency/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('frequency');

type H = Harness<FrequencyView>;
interface Run {
  h: H;
  settings: Record<string, unknown>;
  players: string[];
  host: string;
}

const TEAMS4 = { mode: 'teams', teams: { a: ['ali', 'ayse'], b: ['cem', 'deniz'] } };

/** Sabit rastgelelik: hedef her turda 50 (3 + floor(0.5 × 95)). */
async function setup(extra: Record<string, unknown> = {}, players = ['ali', 'ayse', 'cem', 'deniz'], host = players[0]!): Promise<Run> {
  const settings = { ...defaultSettings, ...TEAMS4, ...extra };
  const game = frequencyServer({ db: new Database(':memory:'), random: () => 0.5, timing: { finalRevealMs: 3000, podiumMs: 9000 } });
  const h = createHarness<FrequencyView>(game, { players, hostId: host, settings });
  await h.start();
  return { h, settings, players, host };
}

async function act(h: H, id: string, action: Record<string, unknown>) {
  const res = await h.act(id, action);
  if (!res.ok) throw new Error(`${id} ${JSON.stringify(action)}: ${res.error}`);
}

/** Görünüm + testin ihtiyaçları: kimin gözünden (me), oda sahibi, oyuncular ve bağlantısı kopanlar. */
function write(name: string, r: Run, me: string, extra: { offline?: string[] } = {}) {
  const players = r.players.includes(me) ? r.players : [...r.players, me];
  out.write(name, r.h.view(me), { settings: r.settings, me, host: r.host, players, offline: extra.offline ?? [] });
}

/** Turu kilide kadar oynat: kart seç, ipucu ver, takım arkadaşı kadranı hedef + offset'e getirip kilitlesin. */
async function toLocked(r: Run, offset: number, text = 'ılık süt') {
  const { h } = r;
  const v = h.view(r.players[0]!);
  const psychic = v.psychicId;
  const pv = h.view(psychic);
  if (pv.phase === 'pick') await act(h, psychic, { type: 'pick', round: pv.roundId, cardId: pv.options![0]!.id });
  await act(h, psychic, { type: 'clue', round: pv.roundId, text });
  const target = h.view(psychic).target!;
  const team = pv.teams[pv.team].filter((id) => id !== psychic);
  await act(h, team[0]!, { type: 'dial', round: pv.roundId, value: Math.max(0, Math.min(100, target + offset)) });
  h.advance(200);
  for (const id of team) {
    if (h.view(id).phase !== 'dial') break;
    await act(h, id, { type: 'lock', round: pv.roundId });
  }
}

// ---------- Takımlı mod: bütün aşamalar, her rol ----------
{
  const r = await setup();
  const { h } = r;
  const round = h.view('ali').roundId;
  write('pick-psychic', r, 'ali');
  write('pick-dialer', r, 'ayse');
  write('pick-opponent', r, 'cem');
  write('pick-spectator', r, 'zeki');

  await act(h, 'ali', { type: 'pick', round, cardId: h.view('ali').options![0]!.id });
  write('clue-psychic', r, 'ali');
  write('clue-dialer', r, 'ayse');

  await act(h, 'ali', { type: 'clue', round, text: 'ılık süt' });
  write('dial-dialer', r, 'ayse');
  write('dial-psychic', r, 'ali');
  write('dial-opponent', r, 'cem');
  write('dial-spectator', r, 'zeki');

  await act(h, 'ayse', { type: 'dial', round, value: 55 });
  h.advance(200);
  write('dial-moved', r, 'ayse');
  write('dial-moved-opponent', r, 'deniz');

  await act(h, 'ayse', { type: 'lock', round });
  write('side-opponent', r, 'cem');
  write('side-dialer', r, 'ayse');
  write('side-psychic', r, 'ali');

  await act(h, 'cem', { type: 'side', round, side: 'left' });
  write('reveal-host', r, 'ali');
  write('reveal-guest', r, 'cem');

  // 2. tur: mor takım, sesli ipucu, ıska; rakip tahmin yapmadan açıklama.
  await act(h, 'ali', { type: 'next', round });
  const r2 = h.view('cem').roundId;
  await act(h, 'cem', { type: 'pick', round: r2, cardId: h.view('cem').options![1]!.id });
  await act(h, 'cem', { type: 'clue', round: r2, text: '' });
  write('dial-spoken', r, 'deniz');
  await act(h, 'deniz', { type: 'dial', round: r2, value: 20 });
  await act(h, 'deniz', { type: 'lock', round: r2 });
  h.setConnected('cem', false);
  write('side-psychic-offline-host', r, 'ali', { offline: ['cem'] });
  h.setConnected('cem', true);
  await act(h, 'ali', { type: 'side', round: r2, side: 'right' });
  write('reveal-miss', r, 'deniz');
  write('reveal-miss-history', r, 'ayse');
}

// ---------- Yetişme kuralı: tam isabet yapan takım hâlâ gerideyse tekrar oynar ----------
{
  const r = await setup({ targetScore: 30 });
  const { h } = r;
  await toLocked(r, 20);
  await act(h, 'cem', { type: 'side', round: h.view('cem').roundId, side: 'left' });
  await act(h, 'ali', { type: 'next', round: h.view('ali').roundId });
  await toLocked(r, 0);
  await act(h, 'ali', { type: 'side', round: h.view('ali').roundId, side: 'left' });
  await act(h, 'ali', { type: 'next', round: h.view('ali').roundId });
  await toLocked(r, 1);
  await act(h, 'cem', { type: 'side', round: h.view('cem').roundId, side: 'left' });
  write('reveal-again', r, 'ali');
}

// ---------- Hedef puana ulaşan kazanır; sonuç ekranı ----------
{
  const r = await setup({ targetScore: 3 });
  const { h } = r;
  await toLocked(r, 0);
  await act(h, 'cem', { type: 'side', round: h.view('cem').roundId, side: 'left' });
  write('reveal-winner', r, 'cem');
  h.advance(3000);
  write('podium-winner-host', r, 'ali');
  write('podium-winner-guest', r, 'cem');
}

// ---------- Oda sahibi oyunu hemen bitirdi: berabere ----------
{
  const r = await setup();
  r.h.end();
  write('podium-draw', r, 'ayse');
}

// ---------- Süreli kadran, kendiliğinden kilit, süreli sağ-sol ----------
{
  const r = await setup({ seconds: 60, cardChoice: false });
  const { h } = r;
  const round = h.view('ali').roundId;
  write('clue-psychic-nochoice', r, 'ali');
  await act(h, 'ali', { type: 'clue', round, text: 'buz gibi' });
  write('dial-timed', r, 'ayse');
  h.advance(52_000);
  write('dial-timed-low', r, 'ayse');
  h.advance(8_000);
  write('side-timed', r, 'cem');
}

// ---------- Kilit için çoğunluk ----------
{
  const players = ['ali', 'ayse', 'can', 'cem', 'deniz', 'ece'];
  const r = await setup({ majorityLock: true, cardChoice: false, teams: { a: ['ali', 'ayse', 'can'], b: ['cem', 'deniz', 'ece'] } }, players);
  const { h } = r;
  const round = h.view('ali').roundId;
  await act(h, 'ali', { type: 'clue', round, text: 'ılık' });
  await act(h, 'ayse', { type: 'lock', round });
  write('dial-majority-voted', r, 'ayse');
  write('dial-majority-other', r, 'can');
}

// ---------- Medyumun bağlantısı koptu: oda sahibi atlayabilir ----------
{
  const players = ['ali', 'ayse', 'fatma', 'cem', 'deniz'];
  const r = await setup({ teams: { a: ['ali', 'ayse', 'fatma'], b: ['cem', 'deniz'] } }, players, 'deniz');
  r.h.setConnected('ali', false);
  write('pick-psychic-offline-host', r, 'deniz', { offline: ['ali'] });
  write('pick-psychic-offline-guest', r, 'ayse', { offline: ['ali'] });
}

// ---------- Birlikte modu ----------
{
  const players = ['ali', 'ayse', 'cem'];
  const r = await setup({ mode: 'coop', rounds: 2, cardChoice: false }, players);
  const { h } = r;
  const round = h.view('ali').roundId;
  await act(h, 'ali', { type: 'clue', round, text: 'tam orta' });
  write('coop-dial', r, 'ayse');
  write('coop-dial-psychic', r, 'ali');
  await act(h, 'ayse', { type: 'dial', round, value: 50 });
  h.advance(200);
  await act(h, 'ayse', { type: 'lock', round });
  write('coop-reveal-again', r, 'cem');
  await act(h, 'cem', { type: 'next', round });
  await toLocked(r, 30);
  await act(h, 'ali', { type: 'next', round: h.view('ali').roundId });
  await toLocked(r, 5);
  write('coop-reveal-over', r, 'ali');
  await act(h, 'ali', { type: 'next', round: h.view('ali').roundId });
  write('coop-podium', r, 'ayse');
}

out.done();
