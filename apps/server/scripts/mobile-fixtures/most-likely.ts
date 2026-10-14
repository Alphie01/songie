import path from 'node:path';
import Database from 'better-sqlite3';
import { createHarness } from '@songie/game-kit/testing';
import { defaultSettings, type MostLikelyView } from '@songie/most-likely/shared';
import { mostLikelyServer } from '@songie/most-likely/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('most-likely');
const repo = path.resolve(import.meta.dirname, '../../../..');
const game = () =>
  mostLikelyServer({ db: new Database(':memory:'), contentDir: path.join(repo, 'games/most-likely/server/test-content'), timing: { podiumMs: 5000, watchMs: 2000 } });

type H = ReturnType<typeof createHarness<MostLikelyView>>;
const cur = (h: H) => {
  const v = h.view('ali');
  return { round: v.round, promptId: v.prompt.id };
};
/** `me`: görünümün sahibi; `players`: odadaki oyuncular (ilk oyuncu oda sahibi). */
const write = (h: H, name: string, me: string, players: string[], settings: Record<string, unknown>) =>
  out.write(name, h.view(me), { settings, me, players });

// 1) Açık oylar, tahmin modu, süreli, 2 soru.
{
  const players = ['ali', 'ayse', 'cem', 'deniz'];
  const settings = { ...defaultSettings, categories: ['genel'], seconds: 30, rounds: 2, anonymous: false, predict: true, selfVote: true };
  const h = createHarness<MostLikelyView>(game(), { players, settings });
  await h.start();
  write(h, 'vote-host', 'ali', players, settings);
  await h.act('ali', { type: 'vote', ...cur(h), target: 'cem' });
  await h.act('ali', { type: 'guess', ...cur(h), target: 'cem' });
  write(h, 'vote-voted-host', 'ali', players, settings);
  write(h, 'vote-guest', 'cem', players, settings);
  await h.act('ayse', { type: 'vote', ...cur(h), target: 'cem' });
  await h.act('ayse', { type: 'guess', ...cur(h), target: 'ali' });
  await h.act('cem', { type: 'vote', ...cur(h), target: 'ayse' });
  await h.act('cem', { type: 'guess', ...cur(h), target: 'cem' });
  await h.act('deniz', { type: 'vote', ...cur(h), target: 'cem' });
  await h.act('deniz', { type: 'guess', ...cur(h), target: 'cem' });
  write(h, 'reveal-host', 'ali', players, settings);
  write(h, 'reveal-guest', 'cem', players, settings);
  await h.act('ali', { type: 'next', round: 1 });
  h.setConnected('deniz', false);
  write(h, 'vote-round2-guest', 'ayse', players, settings);
  h.setConnected('deniz', true);
  // Beraberlik: ayse 2, cem 2.
  for (const [voter, target] of [
    ['ali', 'ayse'],
    ['ayse', 'cem'],
    ['cem', 'ayse'],
    ['deniz', 'cem'],
  ] as const) {
    await h.act(voter, { type: 'vote', ...cur(h), target });
    await h.act(voter, { type: 'guess', ...cur(h), target: 'ayse' });
  }
  write(h, 'reveal-tie-final-host', 'ali', players, settings);
  await h.act('ali', { type: 'next', round: 2 });
  write(h, 'podium-host', 'ali', players, settings);
  write(h, 'podium-guest', 'cem', players, settings);
}

// 2) İsimsiz, süresiz, kendine oy yasak, sınırsız tur.
{
  const players = ['ali', 'ayse', 'cem'];
  const settings = { ...defaultSettings, categories: ['genel'], seconds: 0, rounds: 0, anonymous: true, predict: false, selfVote: false };
  const h = createHarness<MostLikelyView>(game(), { players, settings });
  await h.start();
  await h.act('ali', { type: 'vote', ...cur(h), target: 'ayse' });
  write(h, 'vote-untimed-guest', 'cem', players, settings);
  write(h, 'vote-untimed-host', 'ali', players, settings);
  await h.act('ali', { type: 'reveal', ...cur(h) });
  write(h, 'reveal-anon-guest', 'cem', players, settings);
}

// 3) Süre doldu, kimse oy vermedi; oda sahibi oyunu bitirdi (unvan yok).
{
  const players = ['ali', 'ayse', 'cem'];
  const settings = { ...defaultSettings, categories: ['genel'], seconds: 15, rounds: 10, anonymous: true, predict: false };
  const h = createHarness<MostLikelyView>(game(), { players, settings });
  await h.start();
  h.advance(15_000);
  write(h, 'reveal-novotes-host', 'ali', players, settings);
  h.end();
  write(h, 'podium-empty-guest', 'ayse', players, settings);
}

out.done();
