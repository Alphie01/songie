import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type AgentsView, type CardColor, type TeamId } from '@songie/agents/shared';
import { agentsServer, type AgentsState } from '@songie/agents/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('agents');

type H = Harness<AgentsView>;
interface Run {
  h: H;
  settings: Record<string, unknown>;
  players: string[];
}

/** Sabit tohumlu rastgelelik: görünümler her çalıştırmada aynı. */
function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const PLAYERS = ['ali', 'ayse', 'cem', 'deniz', 'ece'];
const TEAMS = { a: ['ali', 'ayse', 'cem'], b: ['deniz', 'ece'] };
const LEADER: Record<TeamId, string> = { a: 'ali', b: 'deniz' };
const GUESSER: Record<TeamId, string> = { a: 'ayse', b: 'ece' };
const CLUES = ['zıpzıp', 'pırpır', 'cırcır', 'fışfış', 'şıpşıp'];

async function setup(extra: Record<string, unknown> = {}, players = PLAYERS, seed = 7): Promise<Run> {
  const settings = { ...defaultSettings, teams: TEAMS, leaderPick: 'host', leaders: { a: 'ali', b: 'deniz' }, ...extra };
  const game = agentsServer({ db: new Database(':memory:'), random: seeded(seed), timing: { closingMs: 5000 } });
  const h = createHarness<AgentsView>(game, { players, settings });
  await h.start();
  return { h, settings, players };
}

const st = (h: H) => h.state as AgentsState;
const other = (t: TeamId): TeamId => (t === 'a' ? 'b' : 'a');
const idx = (h: H, color: CardColor) => st(h).cards.findIndex((c) => c.color === color && !c.revealed);

async function act(h: H, id: string, action: Record<string, unknown>) {
  const res = await h.act(id, action);
  if (!res.ok) throw new Error(`${id} ${JSON.stringify(action)}: ${res.error}`);
}

/** Lider ipucu verir; tablodaki bir kelimeye takılırsa sıradaki adayı dener. */
async function clue(h: H, team: TeamId, number: number, leader = LEADER[team]) {
  for (const word of CLUES) {
    const res = await h.act(leader, { type: 'clue', word, number });
    if (res.ok) return;
  }
  throw new Error('ipucu verilemedi');
}

const touch = (h: H, id: string, index: number) => act(h, id, { type: 'touch', index, turn: st(h).turn });

/**
 * Görünüm + testin ihtiyaçları: kimin gözünden (me), odadaki oyuncular ve bağlantısı kopanlar.
 * agents `serverNow` için Date.now kullanır; süreler düzenek saatiyle tutarlı olsun diye düzenek saati yazılır.
 */
function write(name: string, r: Run, me: string, extra: { offline?: string[] } = {}) {
  const view = { ...r.h.view(me), serverNow: r.h.now };
  const players = r.players.includes(me) ? r.players : [...r.players, me];
  out.write(name, view, { settings: r.settings, me, players, offline: extra.offline ?? [] });
}

// ---------- Temel akış: ipucu, tahmin, suikastçı, yeni tablo ----------
{
  const r = await setup();
  const { h } = r;
  const t = st(h).team;
  const o = other(t);
  write('clue-leader', r, LEADER[t]);
  write('clue-guesser', r, GUESSER[t]);
  write('clue-opponent', r, GUESSER[o]);
  write('clue-opponent-leader', r, LEADER[o]);
  write('clue-spectator', r, 'zeki');
  write('clue-leader-offline', r, GUESSER[t], { offline: [LEADER[t]] });

  await clue(h, t, 2);
  write('guess-guesser', r, GUESSER[t]);
  write('guess-leader', r, LEADER[t]);
  write('guess-opponent', r, GUESSER[o]);
  write('guess-spectator', r, 'zeki');

  await touch(h, GUESSER[t], idx(h, t));
  write('guess-fresh', r, GUESSER[t]);
  write('guess-fresh-leader', r, LEADER[t]);

  await touch(h, GUESSER[t], idx(h, 'neutral'));
  await clue(h, o, -1);
  write('guess-unlimited', r, GUESSER[o]);
  await touch(h, GUESSER[o], idx(h, o));
  await act(h, GUESSER[o], { type: 'endTurn', turn: st(h).turn });

  await clue(h, t, 1);
  await touch(h, GUESSER[t], idx(h, 'assassin'));
  write('over-assassin-host', r, 'ali');
  write('over-assassin-guest', r, 'ece');

  await act(h, 'ali', { type: 'setLeader', team: 'a', playerId: 'cem' });
  write('over-next-leader', r, 'ali');

  await act(h, 'ali', { type: 'newBoard' });
  write('board2-host', r, 'ali');
  write('board2-guest', r, 'ece');
}

// ---------- Süre: lider ve takım ayrı ----------
{
  const r = await setup({ timer: 'split', seconds: 60 });
  const { h } = r;
  const t = st(h).team;
  write('timer-leader', r, LEADER[t]);
  h.advance(52_000);
  write('timer-low', r, GUESSER[t]);
  h.advance(8_000);
  write('timer-expired', r, GUESSER[t]);
}

// ---------- Oylama modu: oylar kartlarda görünür ----------
{
  const players = ['ali', 'ayse', 'cem', 'fatma', 'deniz', 'ece'];
  const r = await setup({ revealMode: 'vote', teams: { a: ['ali', 'ayse', 'cem', 'fatma'], b: ['deniz', 'ece'] } }, players);
  const { h } = r;
  if (st(h).team !== 'a') {
    await clue(h, 'b', 0);
    await act(h, 'ece', { type: 'endTurn', turn: st(h).turn });
  }
  await clue(h, 'a', 2);
  await touch(h, 'ayse', idx(h, 'a'));
  await touch(h, 'cem', idx(h, 'neutral'));
  write('vote-guesser', r, 'ayse');
  write('vote-other', r, 'fatma');
  write('vote-leader', r, 'ali');
  write('vote-opponent', r, 'ece');
}

// ---------- Bütün ajanlarını bulan takım kazanır ----------
{
  const r = await setup({}, PLAYERS, 11);
  const { h } = r;
  const t = st(h).team;
  await clue(h, t, -1);
  const n = st(h).cards.filter((c) => c.color === t).length;
  for (let k = 0; k < n; k++) await touch(h, GUESSER[t], idx(h, t));
  write('over-agents-host', r, 'ali');
  write('over-agents-guest', r, GUESSER[other(t)]);
}

// ---------- Oda sahibi oyunu bitirdi ----------
{
  const r = await setup();
  const { h } = r;
  await clue(h, st(h).team, 2);
  h.end();
  write('closing-host', r, 'ali');
  write('closing-guest', r, 'ece');
}

out.done();
