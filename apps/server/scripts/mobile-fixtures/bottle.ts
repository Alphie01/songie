import path from 'node:path';
import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type BottleView } from '@songie/bottle/shared';
import { bottleServer } from '@songie/bottle/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('bottle');
const repo = path.resolve(import.meta.dirname, '../../../..');
/** Şişenin en uzun dönüşü (leadMs + spinMaxMs, varsayılan zamanlama). */
const SPIN_MS = 400 + 4800;

/** Tekrarlanabilir rastgelelik (mulberry32), sunucu testlerindeki gibi. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fikstürde oyuncular (ilki oda sahibi), bakan oyuncu (`me`) ve bağlantısı kopuklar da durur. */
function play(players: string[], settings: Record<string, unknown>, seed = 1) {
  const game = bottleServer({ db: new Database(':memory:'), contentDir: path.join(repo, 'games/bottle/server/test-content'), random: seeded(seed) });
  const h: Harness<BottleView> = createHarness<BottleView>(game, { players, settings });
  const full = { ...defaultSettings, ...settings };
  const write = (name: string, me: string) => {
    const offline = h.ctx.players().filter((p) => !p.connected).map((p) => p.id);
    out.write(name, h.view(me), { settings: full, me, players, offline });
  };
  const round = () => h.view(players[0]!).round;
  return { h, write, round };
}

// ---------- Ana akış: ali (oda sahibi), ayse, cem; oylama açık.
{
  const players = ['ali', 'ayse', 'cem'];
  const { h, write, round } = play(players, { categories: ['eglenceli'], vote: true, rounds: 3 });
  await h.start(); // ilk çeviren oda sahibi
  write('spin-mine', 'ali');
  write('spin-guest', 'cem');

  await h.act('ali', { type: 'spin', round: round() });
  write('spinning', 'cem');
  h.advance(SPIN_MS);
  const target = h.view('ali').targetId!;
  const other = players.find((id) => id !== target && id !== 'ali')!;
  write('choose-target', target);
  write('choose-guest', other);

  await h.act(target, { type: 'choose', round: round(), kind: 'dare' });
  write('task-target', target);
  write('task-guest', other);
  h.setConnected(target, false);
  write('task-offline-host', 'ali'); // "Turu puansız geç"
  h.setConnected(target, true);

  await h.act(target, { type: 'done', round: round() });
  write('vote-target', target); // kendine oy veremez
  write('vote-voter', other);
  await h.act('ali', { type: 'vote', round: round(), yes: true });
  write('vote-voted', 'ali');
  await h.act(other, { type: 'vote', round: round(), yes: false }); // 1-1: yaptı sayılır

  // Sıradaki çeviren hedef olan kişi; oda sahibi onun yerine çevirebilir.
  write('spin-last-host', 'ali');
  write('spin-last-mine', target);
  h.setConnected(target, false);
  write('spin-offline-host', 'ali');
  h.setConnected(target, true);

  h.end();
  write('podium-host', 'ali');
  write('podium-guest', other);
}

// ---------- Pas hakkı biten hedef (kişi başı 1 pas, cezalı).
{
  const players = ['ali', 'ayse', 'cem'];
  const { h, write, round } = play(players, { categories: ['eglenceli'], vote: false, rounds: 0, passes: 1, passPenalty: true }, 3);
  await h.start();
  let found = false;
  for (let i = 0; i < 30 && !found; i++) {
    const v = h.view('ali');
    await h.act(v.spinnerId, { type: 'spin', round: round() });
    h.advance(SPIN_MS);
    const t = h.view('ali').targetId!;
    await h.act(t, { type: 'choose', round: round(), kind: 'truth' });
    const tv = h.view(t);
    if (tv.passesLeft === 0) {
      write('task-nopass', t);
      found = true;
    } else if (i === 0) {
      write('task-pass-cost', t); // "Pas geçersen 1 puan kaybedersin."
      await h.act(t, { type: 'pass', round: round() });
    } else {
      await h.act(t, { type: tv.passesLeft ? 'pass' : 'done', round: round() });
    }
  }
  if (!found) throw new Error('Pas hakkı biten hedef bulunamadı');
}

// ---------- Rastgele seçim + kalabalık masa (9 kişi: orta boy koltuklar).
{
  const players = ['ali', 'ayse', 'cem', 'deniz', 'ece', 'fatma', 'gul', 'hakan', 'irem'];
  const { h, write, round } = play(players, { categories: ['eglenceli'], choice: 'random', vote: false }, 5);
  await h.start();
  write('table-mid-spin', 'ayse');
  await h.act('ali', { type: 'spin', round: round() });
  h.advance(SPIN_MS);
  write('table-mid-task', 'ali'); // rastgele seçildi: doğrudan görev
}

// ---------- Çok kalabalık masa (12 kişi: küçük koltuklar), bağlantısı kopuk biri.
{
  const players = Array.from({ length: 12 }, (_, i) => `oyuncu${i + 1}`);
  const { h, write, round } = play(players, { categories: ['eglenceli'] }, 9);
  await h.start();
  h.setConnected('oyuncu7', false);
  await h.act('oyuncu1', { type: 'spin', round: round() });
  h.advance(SPIN_MS);
  write('table-many-choose', 'oyuncu2');
}

// ---------- Berabere biten oyun (2 kişi, puan yok).
{
  const { h, write } = play(['ali', 'ayse'], { categories: ['eglenceli'] });
  await h.start();
  h.end();
  write('podium-tie', 'ayse');
}

out.done();
