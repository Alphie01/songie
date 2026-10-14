import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type Policy, type Role, type SecretHitlerSettings, type SecretHitlerView } from '@songie/secret-hitler/shared';
import { secretHitlerServer, type SecretHitlerState } from '@songie/secret-hitler/server';
import { fixtureWriter } from './lib.js';

/**
 * Secret Hitler görünümleri. Her dosyada `me` (görünümün sahibi), `players` (odadakiler, ilk oyuncu oda sahibi)
 * ve gerekirse `offline` da yazılır. Düzenekte saat sahte olduğundan `serverNow` düzeneğin saatine eşitlenir
 * (sunucuda `ctx.now()` ile `Date.now()` aynıdır).
 */
const out = fixtureWriter('secret-hitler');
type H = Harness<SecretHitlerView>;

const P7 = ['ali', 'ayse', 'cem', 'deniz', 'ece', 'fatih', 'gul'];
const R7: Record<string, Role> = { ali: 'liberal', ayse: 'liberal', cem: 'fascist', deniz: 'liberal', ece: 'fascist', fatih: 'liberal', gul: 'hitler' };
const P5 = ['ali', 'ayse', 'cem', 'deniz', 'ece'];
const R5: Record<string, Role> = { ali: 'liberal', ayse: 'liberal', cem: 'fascist', deniz: 'liberal', ece: 'hitler' };

/** Deterministik karıştırma (mulberry32). */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

interface Table {
  h: H;
  s: SecretHitlerState;
  settings: SecretHitlerSettings;
  players: string[];
}

/** Sunucu testlerindeki `setup`: roller elle, ilk başkan ikinci oyuncu. */
async function setup(players: string[], roles: Record<string, Role>): Promise<Table> {
  const settings: SecretHitlerSettings = { ...defaultSettings };
  const h = createHarness<SecretHitlerView>(secretHitlerServer({ db: new Database(':memory:'), random: rng(5) }), { players, settings });
  await h.start();
  const s = h.state as SecretHitlerState;
  s.roles = { ...roles };
  s.seats = [...players];
  s.president = players[1]!;
  s.anchor = players[1]!;
  h.ctx.pushViews();
  return { h, s, settings, players };
}

async function ok(t: Table, id: string, action: Record<string, unknown>) {
  const res = await t.h.act(id, action);
  if (!res.ok) throw new Error(`${id} ${JSON.stringify(action)}: ${res.error}`);
}

async function voteAll(t: Table, vote: 'ja' | 'nein' | ((id: string) => 'ja' | 'nein')) {
  const round = t.s.voteRound;
  for (const id of t.s.seats.filter((x) => !t.s.dead.includes(x))) {
    await ok(t, id, { type: 'vote', round, vote: typeof vote === 'function' ? vote(id) : vote });
  }
}

async function elect(t: Table, chancellor: string) {
  await ok(t, t.s.president, { type: 'nominate', target: chancellor });
  await voteAll(t, 'ja');
}

/** Bir hükümet `policy` yasasını çıkarır (destenin üstüne 3 adet konur). */
async function govern(t: Table, policy: Policy, chancellor: string) {
  t.s.deck.unshift(policy, policy, policy);
  await elect(t, chancellor);
  await ok(t, t.s.president, { type: 'discard', session: t.s.session, index: 0 });
  await ok(t, chancellor, { type: 'enact', session: t.s.session, index: 0 });
}

function write(name: string, t: Table, me: string, extra: Record<string, unknown> = {}) {
  const view = t.h.view(me);
  view.serverNow = t.h.now;
  out.write(name, view, { settings: t.settings, me, players: t.players, ...extra });
}

// Aday gösterme, roller, oylama
{
  const t = await setup(P7, R7);
  write('nominate-president', t, 'ayse');
  write('nominate-host', t, 'ali');
  write('nominate-offline', t, 'ali', { offline: ['ayse'] });
  write('role-fascist', t, 'cem');
  write('role-hitler-blind', t, 'gul');
  await ok(t, 'ayse', { type: 'nominate', target: 'cem' });
  write('vote-guest', t, 'deniz');
  await ok(t, 'ali', { type: 'vote', round: t.s.voteRound, vote: 'ja' });
  await ok(t, 'ayse', { type: 'vote', round: t.s.voteRound, vote: 'nein' });
  write('vote-mine', t, 'ali');
  write('vote-nein', t, 'ayse');
  t.h.join('hasan');
  t.h.ctx.pushViews();
  write('vote-spectator', t, 'hasan', { players: [...P7, 'hasan'] });
  await voteAll(t, (id) => (['ali', 'ayse', 'cem'].includes(id) ? 'ja' : 'nein'));
  write('nominate-after-fail', t, 'cem');
  write('nominate-after-fail-guest', t, 'ali');
  t.h.advance(30_000);
  write('hostbar-ready', t, 'ali');
}

// Yasama
{
  const t = await setup(P7, R7);
  t.s.deck.unshift('fascist', 'liberal', 'fascist');
  await elect(t, 'deniz');
  write('legislate-president', t, 'ayse');
  write('legislate-president-guest', t, 'ali');
  await ok(t, 'ayse', { type: 'discard', session: t.s.session, index: 1 });
  write('legislate-chancellor', t, 'deniz');
  write('legislate-chancellor-guest', t, 'cem');
}

// Veto (5 faşist yasadan sonra)
{
  const t = await setup(P7, R7);
  t.s.liberal = 3;
  t.s.fascist = 5;
  t.s.deck.unshift('fascist', 'fascist', 'liberal');
  await elect(t, 'deniz');
  await ok(t, 'ayse', { type: 'discard', session: t.s.session, index: 0 });
  write('veto-unlocked', t, 'deniz');
  await ok(t, 'deniz', { type: 'veto', session: t.s.session });
  write('veto-president', t, 'ayse');
  write('veto-chancellor', t, 'deniz');
  write('veto-guest', t, 'ali');
  await ok(t, 'ayse', { type: 'vetoAnswer', session: t.s.session, accept: false });
  write('veto-denied', t, 'deniz');
}

// Yetkiler (7 kişi): sadakat sorgulama, özel seçim, idam
{
  const t = await setup(P7, R7);
  t.s.fascist = 1;
  await govern(t, 'fascist', 'deniz');
  write('power-investigate', t, 'ayse');
  write('power-investigate-guest', t, 'ali');
  await ok(t, 'ayse', { type: 'power', session: t.s.session, target: 'cem' });
  write('role-investigations', t, 'ayse');
}
{
  const t = await setup(P7, R7);
  t.s.fascist = 2;
  await govern(t, 'fascist', 'deniz');
  write('power-special', t, 'ayse');
}
{
  const t = await setup(P7, R7);
  t.s.fascist = 3;
  t.s.electionTracker = 2;
  await govern(t, 'fascist', 'deniz');
  write('power-execution', t, 'ayse');
  write('power-execution-guest', t, 'gul');
  await ok(t, 'ayse', { type: 'power', session: t.s.session, target: 'fatih' });
  await ok(t, t.s.president, { type: 'nominate', target: 'ali' });
  write('vote-dead', t, 'fatih');
}

// Politika önizleme (5 kişi); Hitler faşisti tanır
{
  const t = await setup(P5, R5);
  write('role-hitler-knows', t, 'ece');
  t.s.fascist = 2;
  await govern(t, 'fascist', 'deniz');
  write('power-peek', t, 'ayse');
  write('power-peek-guest', t, 'ali');
}

// Oyun sonu
{
  const t = await setup(P7, R7);
  t.s.liberal = 4;
  await govern(t, 'liberal', 'deniz');
  write('over-liberal', t, 'ali');
  write('over-liberal-guest', t, 'gul');
}
{
  const t = await setup(P7, R7);
  t.s.fascist = 3;
  await elect(t, 'gul');
  write('over-fascist', t, 'cem');
}
{
  const t = await setup(P5, R5);
  t.h.end();
  write('over-ended', t, 'ayse');
}

out.done();
