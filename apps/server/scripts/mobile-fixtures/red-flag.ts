import Database from 'better-sqlite3';
import { createHarness } from '@songie/game-kit/testing';
import { defaultSettings, type RedFlagView } from '@songie/red-flag/shared';
import { redFlagServer } from '@songie/red-flag/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('red-flag');
const game = () => redFlagServer({ db: new Database(':memory:'), timing: { podiumMs: 5000 } });
const LOCK_MS = 3000; // DEFAULT_TIMING.revealLockMs

type H = ReturnType<typeof createHarness<RedFlagView>>;
const item = (h: H) => h.view('ali').item!.id;
/** `me`: görünümün sahibi; `players`: odadaki oyuncular (ilk oyuncu oda sahibi); `offline`: bağlantısı kopanlar. */
const write = (h: H, name: string, me: string, players: string[], settings: Record<string, unknown>, offline: string[] = []) =>
  out.write(name, h.view(me), { settings, me, players, offline });

// 1) Açık oylar, üçüncü seçenek, tahmin modu, süreli, 2 durum.
{
  const players = ['ali', 'ayse', 'cem', 'deniz'];
  const settings = { ...defaultSettings, categories: ['iliski'], seconds: 30, discuss: 30, rounds: 2, dealBreaker: true, predict: true, anonymous: false };
  const h = createHarness<RedFlagView>(game(), { players, settings });
  await h.start();
  write(h, 'vote-host', 'ali', players, settings);
  await h.act('ali', { type: 'vote', itemId: item(h), vote: 'red' });
  await h.act('ali', { type: 'guess', itemId: item(h), vote: 'red' });
  write(h, 'vote-voted-host', 'ali', players, settings);
  h.setConnected('deniz', false);
  write(h, 'vote-guest', 'cem', players, settings, ['deniz']);
  h.setConnected('deniz', true);
  await h.act('ayse', { type: 'vote', itemId: item(h), vote: 'green' });
  await h.act('ayse', { type: 'guess', itemId: item(h), vote: 'red' });
  await h.act('cem', { type: 'vote', itemId: item(h), vote: 'red' });
  await h.act('cem', { type: 'guess', itemId: item(h), vote: 'green' });
  await h.act('deniz', { type: 'vote', itemId: item(h), vote: 'never' });
  await h.act('deniz', { type: 'guess', itemId: item(h), vote: 'red' });
  write(h, 'reveal-host', 'ali', players, settings);
  write(h, 'reveal-guest', 'cem', players, settings);
  await h.act('cem', { type: 'ready', round: 1 });
  write(h, 'reveal-ready-guest', 'cem', players, settings);
  h.advance(LOCK_MS);
  write(h, 'reveal-unlocked-host', 'ali', players, settings);
  await h.act('ali', { type: 'next', round: 1 });
  for (const p of players) {
    await h.act(p, { type: 'vote', itemId: item(h), vote: 'red' });
    await h.act(p, { type: 'guess', itemId: item(h), vote: 'red' });
  }
  write(h, 'reveal-unanimous-guest', 'ayse', players, settings);
  h.advance(LOCK_MS);
  await h.act('ali', { type: 'next', round: 2 });
  write(h, 'podium-host', 'ali', players, settings);
  write(h, 'podium-guest', 'cem', players, settings);
}

// 2) İsimsiz, süresiz, iki seçenek, tahmin kapalı, tartışma süresiz.
{
  const players = ['ali', 'ayse', 'cem'];
  const settings = { ...defaultSettings, categories: ['is'], seconds: 0, discuss: 0, rounds: 0, dealBreaker: false, predict: false, anonymous: true };
  const h = createHarness<RedFlagView>(game(), { players, settings });
  await h.start();
  await h.act('ali', { type: 'vote', itemId: item(h), vote: 'green' });
  write(h, 'vote-untimed-guest', 'cem', players, settings);
  await h.act('ayse', { type: 'vote', itemId: item(h), vote: 'red' });
  await h.act('cem', { type: 'vote', itemId: item(h), vote: 'red' });
  write(h, 'reveal-anon-host', 'ali', players, settings);
  write(h, 'reveal-anon-guest', 'cem', players, settings);
  h.end();
  write(h, 'podium-anon-guest', 'cem', players, settings);
}

// 3) Süre doldu, kimse oy vermedi.
{
  const players = ['ali', 'ayse', 'cem'];
  const settings = { ...defaultSettings, categories: ['aile'], seconds: 15, discuss: 15, rounds: 10, predict: true };
  const h = createHarness<RedFlagView>(game(), { players, settings });
  await h.start();
  h.advance(15_000);
  write(h, 'reveal-novotes-host', 'ali', players, settings);
}

out.done();
