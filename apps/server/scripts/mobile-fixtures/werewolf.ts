/**
 * Kurt Adam: mobil widget testleri için gerçek sunucu görünümleri.
 * Her görünümle birlikte izleyen oyuncu (`me`) ve odadaki oyuncular (`players`) yazılır.
 * Roller sunucu testlerindeki gibi sabit dağılır (shuffle birim permütasyon):
 * sırayla kurtlar, kahin, doktor, avcı, cadı, okçu, deli, köylüler. İlk oyuncu oda sahibi.
 */
import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type NightStep, type Phase, type RoleCounts, type WerewolfSettings, type WerewolfView } from '@songie/werewolf/shared';
import { werewolfServer, type WerewolfState } from '@songie/werewolf/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('werewolf');
const identity = () => 0.999999;

interface Game {
  h: Harness<WerewolfView>;
  settings: WerewolfSettings;
  players: string[];
}

async function setup(n: number, roles: RoleCounts, patch: Partial<WerewolfSettings> = {}): Promise<Game> {
  const settings: WerewolfSettings = { ...defaultSettings, roleSeconds: 20, discussSeconds: 60, voteSeconds: 30, ...patch, roles };
  const game = werewolfServer({ db: new Database(':memory:'), timing: { verdictMs: 5000, podiumMs: 10000, tickMs: 1000 }, random: identity });
  const players = Array.from({ length: n }, (_, i) => `p${i}`);
  const h = createHarness<WerewolfView>(game, { players, settings });
  await h.start();
  return { h, settings, players: [...players] };
}

const state = (g: Game) => g.h.state as WerewolfState;
const step = (g: Game): NightStep | null => (state(g).phase === 'night' ? (state(g).nightSteps[state(g).stepIndex] ?? null) : null);

function write(g: Game, name: string, viewer: string) {
  out.write(name, g.h.view(viewer), { settings: g.settings, me: viewer, players: g.players });
}

async function act(g: Game, id: string, action: Record<string, unknown>) {
  const res = await g.h.act(id, { session: state(g).session, ...action });
  if (!res.ok || 'stale' in res) throw new Error(`${id} ${JSON.stringify(action)}: ${JSON.stringify(res)}`);
}

function expectPhase(g: Game, phase: Phase) {
  if (state(g).phase !== phase) throw new Error(`beklenen aşama ${phase}, olan ${state(g).phase}`);
}

const endStep = (g: Game) => g.h.advance(state(g).endsAt - g.h.now);

function goTo(g: Game, target: NightStep) {
  for (let i = 0; i < 10 && step(g) !== target; i++) endStep(g);
  if (step(g) !== target) throw new Error(`${target} adımına gelinemedi`);
}

function endNight(g: Game) {
  for (let i = 0; i < 10 && state(g).phase === 'night'; i++) endStep(g);
}

/* ---- A: 9 kişi, bütün roller, açık oy. p0 kurt (oda sahibi), p1 kurt, p2 kahin, p3 doktor,
        p4 avcı, p5 cadı, p6 okçu, p7 deli, p8 köylü; "late" sonradan gelen izleyici. ---- */
const a = await setup(9, { wolf: 2, seer: 1, doctor: 1, hunter: 1, witch: 1, cupid: 1, fool: 1 });
a.h.join('late');
a.players.push('late');

// 1. gece: aşk okçusu uyanık
write(a, 'n1-cupid-turn', 'p6');
write(a, 'n1-sleep', 'p8');
write(a, 'n1-spectator', 'late');
await act(a, 'p0', { type: 'wolfChat', text: 'Köylüyü mü alsak?' });
await act(a, 'p1', { type: 'wolfChat', text: 'Bence avcıyı alalım, tehlikeli.' });
write(a, 'n1-wolf-chat-host', 'p0');
await act(a, 'p6', { type: 'cupid', a: 'p1', b: 'p8' });
write(a, 'n1-cupid-done', 'p6');

// kurtlar: diğer kurdun oyu görünür
goTo(a, 'wolves');
await act(a, 'p1', { type: 'wolfVote', target: 'p4' });
write(a, 'n1-wolves-turn-host', 'p0');
await act(a, 'p0', { type: 'wolfVote', target: 'p4' });
write(a, 'n1-wolves-voted', 'p1');

goTo(a, 'seer');
write(a, 'n1-seer-turn', 'p2');
await act(a, 'p2', { type: 'seer', target: 'p0' });
write(a, 'n1-seer-wolf', 'p2');

goTo(a, 'doctor');
write(a, 'n1-doctor-turn', 'p3');
await act(a, 'p3', { type: 'doctor', target: 'p2' });
write(a, 'n1-doctor-done', 'p3');

goTo(a, 'witch');
write(a, 'n1-witch-turn', 'p5');
await act(a, 'p5', { type: 'witch', heal: false, poison: null });
write(a, 'n1-witch-done', 'p5');
endNight(a);

// sabah: avcı öldü, son atışını yapıyor
expectPhase(a, 'hunter');
write(a, 'hunter-shooter', 'p4');
write(a, 'hunter-wait', 'p8');
write(a, 'hunter-wait-host', 'p0');
await act(a, 'p4', { type: 'shoot', target: 'p7' });

// 1. gün: tartışma
expectPhase(a, 'discuss');
await act(a, 'p4', { type: 'ghostChat', text: 'Öbür taraftan selam!' });
await act(a, 'p7', { type: 'ghostChat', text: 'Deli de öldü, bari izleyelim.' });
await act(a, 'p2', { type: 'nominate', target: 'p0' });
await act(a, 'p0', { type: 'nominate', target: 'p2' });
await act(a, 'p1', { type: 'nominate', target: 'p2' });
await act(a, 'p5', { type: 'ready', ready: true });
write(a, 'discuss-host', 'p0');
write(a, 'discuss-guest', 'p8');
write(a, 'discuss-seer', 'p2');
write(a, 'discuss-ready', 'p5');
write(a, 'discuss-cupid', 'p6');
write(a, 'discuss-ghost', 'p4');
write(a, 'discuss-spectator', 'late');

// oylama: açık oy, 3–3 berabere → ikinci tur
await act(a, 'p0', { type: 'hostSkip' });
expectPhase(a, 'vote');
write(a, 'vote-fresh', 'p6');
await act(a, 'p2', { type: 'vote', target: 'p0' });
await act(a, 'p8', { type: 'vote', target: 'p0' });
await act(a, 'p0', { type: 'vote', target: 'p2' });
await act(a, 'p1', { type: 'vote', target: 'p2' });
await act(a, 'p3', { type: 'vote', target: null });
write(a, 'vote-host', 'p0');
write(a, 'vote-guest', 'p8');
write(a, 'vote-none', 'p3');
write(a, 'vote-ghost', 'p4');
write(a, 'vote-spectator', 'late');
await act(a, 'p5', { type: 'vote', target: 'p0' });
await act(a, 'p6', { type: 'vote', target: 'p2' });
expectPhase(a, 'vote');
write(a, 'vote-runoff', 'p8');
for (const id of ['p2', 'p8', 'p5', 'p3', 'p6']) await act(a, id, { type: 'vote', target: 'p0' });
await act(a, 'p1', { type: 'vote', target: 'p2' });
write(a, 'vote-runoff-host', 'p0');
await act(a, 'p0', { type: 'vote', target: 'p2' });

// karar: oda sahibi (kurt) asıldı
expectPhase(a, 'verdict');
write(a, 'verdict-hanged', 'p8');
write(a, 'verdict-hanged-host', 'p0');
a.h.advance(5000);

// 2. gece: okçusuz; ölü oda sahibi hayaletler kanalında
expectPhase(a, 'night');
write(a, 'n2-dead-host', 'p0');
goTo(a, 'wolves');
await act(a, 'p1', { type: 'wolfVote', target: 'p6' });
write(a, 'n2-wolves-voted', 'p1');
goTo(a, 'seer');
await act(a, 'p2', { type: 'seer', target: 'p3' });
write(a, 'n2-seer-notwolf', 'p2');
goTo(a, 'doctor');
write(a, 'n2-doctor-blocked', 'p3');
await act(a, 'p3', { type: 'doctor', target: 'p8' });
goTo(a, 'witch');
write(a, 'n2-witch-turn', 'p5');
await act(a, 'p5', { type: 'witch', heal: true, poison: null });
endNight(a);

// 2. gün: kimse ölmedi; aday yok → kimse asılmaz
expectPhase(a, 'discuss');
write(a, 'discuss2-dawn-none', 'p8');
await act(a, 'p0', { type: 'hostSkip' });
expectPhase(a, 'verdict');
write(a, 'verdict-none', 'p8');
a.h.advance(5000);

// 3. gece: iyileştirme kullanıldı; cadı son kurdu zehirler (âşığı da ölür)
expectPhase(a, 'night');
goTo(a, 'wolves');
await act(a, 'p1', { type: 'wolfVote', target: 'p2' });
goTo(a, 'doctor');
await act(a, 'p3', { type: 'doctor', target: 'p2' });
goTo(a, 'witch');
write(a, 'n3-witch-turn', 'p5');
await act(a, 'p5', { type: 'witch', heal: false, poison: 'p1' });
write(a, 'n3-witch-done', 'p5');
endNight(a);

expectPhase(a, 'over');
write(a, 'over-village-host', 'p0');
write(a, 'over-village-guest', 'p8');
write(a, 'over-village-alive', 'p5');
write(a, 'over-spectator', 'late');

/* ---- B: 5 kişi, gizli oy, roller açıklanmaz, hayaletler rolleri görmez, beraberlikte kimse asılmaz;
        oda sahibi oyunu bitirir. p0 kurt, p1 kahin, p2 doktor, p3–p4 köylü. ---- */
const b = await setup(5, { wolf: 1, seer: 1, doctor: 1, hunter: 0, witch: 0, cupid: 0, fool: 0 }, {
  openVotes: false,
  revealRoles: false,
  ghostsSeeRoles: false,
  dayTie: 'none',
});
goTo(b, 'wolves');
await act(b, 'p0', { type: 'wolfVote', target: 'p4' });
write(b, 'b-n1-wolf-alone', 'p0');
endNight(b);
expectPhase(b, 'discuss');
write(b, 'b-discuss-dawn-norole', 'p3');
await act(b, 'p0', { type: 'nominate', target: 'p1' });
await act(b, 'p1', { type: 'nominate', target: 'p0' });
await act(b, 'p0', { type: 'hostSkip' });
expectPhase(b, 'vote');
await act(b, 'p0', { type: 'vote', target: 'p1' });
await act(b, 'p1', { type: 'vote', target: 'p0' });
await act(b, 'p4', { type: 'ghostChat', text: 'Kimse beni duymuyor mu?' });
write(b, 'b-vote-secret', 'p2');
write(b, 'b-vote-secret-host', 'p0');
write(b, 'b-ghost-noroles', 'p4');
await act(b, 'p2', { type: 'vote', target: 'p0' });
await act(b, 'p3', { type: 'vote', target: 'p1' });
expectPhase(b, 'verdict');
write(b, 'b-verdict-tie', 'p3');
b.h.end();
expectPhase(b, 'over');
write(b, 'b-over-ended', 'p0');

/* ---- C: köyün delisi asılıp kazanır. p0 kurt, p1 deli, p2–p5 köylü. ---- */
const c = await setup(6, { wolf: 1, seer: 0, doctor: 0, hunter: 0, witch: 0, cupid: 0, fool: 1 });
endNight(c);
expectPhase(c, 'discuss');
write(c, 'c-discuss-fool', 'p1');
await act(c, 'p2', { type: 'nominate', target: 'p1' });
await act(c, 'p0', { type: 'hostSkip' });
for (const id of ['p0', 'p2', 'p3', 'p4', 'p5', 'p1']) await act(c, id, { type: 'vote', target: 'p1' });
expectPhase(c, 'over');
write(c, 'c-over-fool', 'p1');

/* ---- D: farklı taraftaki âşıklar son iki kişi kalır. p0 kurt, p1 okçu, p2–p4 köylü. ---- */
const d = await setup(5, { wolf: 1, seer: 0, doctor: 0, hunter: 0, witch: 0, cupid: 1, fool: 0 });
await act(d, 'p1', { type: 'cupid', a: 'p0', b: 'p2' });
goTo(d, 'wolves');
await act(d, 'p0', { type: 'wolfVote', target: 'p3' });
endNight(d);
expectPhase(d, 'discuss');
await act(d, 'p0', { type: 'nominate', target: 'p4' });
await act(d, 'p0', { type: 'hostSkip' });
for (const id of ['p0', 'p1', 'p2']) await act(d, id, { type: 'vote', target: 'p4' });
await act(d, 'p4', { type: 'vote', target: null });
expectPhase(d, 'verdict');
d.h.advance(5000);
goTo(d, 'wolves');
await act(d, 'p0', { type: 'wolfVote', target: 'p1' });
endNight(d);
expectPhase(d, 'over');
write(d, 'd-over-lovers', 'p2');

/* ---- E: kurtlar köylülere yetişir. p0 kurt, p1 kahin, p2 doktor, p3–p4 köylü. ---- */
const e = await setup(5, { wolf: 1, seer: 1, doctor: 1, hunter: 0, witch: 0, cupid: 0, fool: 0 });
goTo(e, 'wolves');
await act(e, 'p0', { type: 'wolfVote', target: 'p3' });
endNight(e);
expectPhase(e, 'discuss');
await act(e, 'p0', { type: 'nominate', target: 'p4' });
await act(e, 'p0', { type: 'hostSkip' });
for (const id of ['p0', 'p1', 'p2']) await act(e, id, { type: 'vote', target: 'p4' });
await act(e, 'p4', { type: 'vote', target: null });
expectPhase(e, 'verdict');
e.h.advance(5000);
goTo(e, 'wolves');
await act(e, 'p0', { type: 'wolfVote', target: 'p1' });
endNight(e);
expectPhase(e, 'over');
write(e, 'e-over-wolves-host', 'p0');
write(e, 'e-over-wolves-guest', 'p2');

/* ---- F: aynı anda düzeni, 9 kişi, bütün roller, erken bitiş açık. ---- */
const f = await setup(9, { wolf: 2, seer: 1, doctor: 1, hunter: 1, witch: 1, cupid: 1, fool: 1 }, { nightMode: 'simultaneous', nightEndsEarly: true });
write(f, 'f-sim-n1-villager', 'p8');
write(f, 'f-sim-n1-seer', 'p2');
await act(f, 'p8', { type: 'chores' });
f.h.advance(1000);
write(f, 'f-sim-n1-villager-done', 'p8');
f.h.advance(state(f).endsAt - f.h.now);
write(f, 'f-sim-n1-witch', 'p5');

out.done();
