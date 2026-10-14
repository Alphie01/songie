/**
 * Tabu görünümleri: yeşil takım ali + ayse, mor takım cem + deniz; ali oda sahibi.
 * Her dosyada `me`: görünümün sahibi. Kart çekimi belirleyici olsun diye `Math.random` tohumlanır.
 * viewFor `serverNow` için gerçek saati kullanır, `endsAt` ise düzenek saatindedir; fikstürlerde
 * `serverNow` düzenek saatine eşitlenir (canlı sunucuda ikisi aynı saattir).
 */
import path from 'node:path';
import Database from 'better-sqlite3';
import { createHarness } from '@songie/game-kit/testing';
import { defaultSettings, type TabooView } from '@songie/taboo/shared';
import { tabooServer } from '@songie/taboo/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('taboo');
const repo = path.resolve(import.meta.dirname, '../../../..');
const deckDir = path.join(repo, 'games/taboo/server/test-deck');

let seed = 7;
Math.random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

function setup() {
  const game = tabooServer({ db: new Database(':memory:'), deckDir, timing: { podiumMs: 5000 } });
  const settings = {
    ...defaultSettings,
    teams: { a: ['ali', 'ayse'], b: ['cem', 'deniz'] },
    seconds: 60,
    passes: 3,
    turns: 2,
    categories: ['genel'],
  };
  const h = createHarness<TabooView>(game, { players: ['ali', 'ayse', 'cem', 'deniz'], settings });
  const write = (name: string, me: string, view: TabooView = h.view(me)) => out.write(name, { ...view, serverNow: h.now }, { settings, me });
  return { h, write };
}

// ---- 1) Üç tur: kartlar, olay damgaları, süre azalırken, tur özetleri; mor takım kazanır
{
  const { h, write } = setup();
  const card = (id: string) => h.view(id).card!.id;
  await h.start();
  write('ready-narrator-host', 'ali');
  write('ready-guest', 'cem');

  await h.act('ali', { type: 'start' });
  write('turn-narrator-host', 'ali');
  write('turn-guesser', 'ayse');
  write('turn-watcher', 'cem');
  await h.act('ali', { type: 'correct', cardId: card('ali') });
  await h.act('ali', { type: 'pass', cardId: card('ali') });
  write('turn-narrator-flash', 'ali');
  await h.act('cem', { type: 'taboo', cardId: card('cem') });
  write('turn-guesser-flash', 'ayse');
  write('turn-watcher-flash', 'deniz');
  // Takımsız seyirci sunucuda nadirdir (katılanlar takıma girer); tahminci görünümünden türetilir.
  write('turn-spectator', 'ayse', { ...h.view<TabooView>('ayse'), role: 'spectator', myTeam: null });
  h.advance(52_000);
  write('turn-low-watcher', 'cem');
  write('turn-low-narrator-host', 'ali');

  // Süre biter: sıra mor takımda (cem).
  h.advance(8_000);
  write('ready-host', 'ali');
  write('ready-narrator-guest', 'cem');

  await h.act('cem', { type: 'start' });
  await h.act('cem', { type: 'correct', cardId: card('cem') });
  await h.act('cem', { type: 'correct', cardId: card('cem') });
  h.advance(60_000);
  write('ready-last-guest', 'deniz');

  // ayse başlatır ama hiç kart işaretlenmez.
  await h.act('ayse', { type: 'start' });
  h.advance(60_000);
  write('ready-empty-host', 'ali');

  h.end();
  write('podium-host', 'ali');
  write('podium-guest', 'cem');
}

// ---- 2) Hiç oynanmadan bitirilir: berabere
{
  const { h, write } = setup();
  await h.start();
  h.end();
  write('podium-draw', 'ayse');
}

out.done();
