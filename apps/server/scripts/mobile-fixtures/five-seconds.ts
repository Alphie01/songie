import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type FiveSecondsView } from '@songie/five-seconds/shared';
import { fiveSecondsServer } from '@songie/five-seconds/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('five-seconds');

/**
 * Oyunu düzenekte kurar. Görünümün `serverNow` alanı sunucuda `Date.now()`; düzeneğin sahte saatiyle
 * (`endsAt` aynı saatten) tutarlı olsun diye fikstüre `h.now` yazılır (gerçek sunucuda ikisi aynı saattir).
 * Fikstürde oyuncular (ilki oda sahibi), bakan oyuncu (`me`) ve bağlantısı kopuklar da durur.
 */
function play(players: string[], settings: Record<string, unknown>) {
  const game = fiveSecondsServer({ db: new Database(':memory:') });
  const h: Harness<FiveSecondsView> = createHarness<FiveSecondsView>(game, { players, settings });
  const full = { ...defaultSettings, ...settings };
  const write = (name: string, me: string) => {
    const offline = h.ctx.players().filter((p) => !p.connected).map((p) => p.id);
    out.write(name, { ...h.view<FiveSecondsView>(me), serverNow: h.now }, { settings: full, me, players, offline });
  };
  const id = () => h.view(players[0]!).attemptId;
  return { h, write, id };
}

// ---------- Herkes kendine: ali (oda sahibi), ayse, cem; çalma kuralı açık.
{
  const { h, write, id } = play(['ali', 'ayse', 'cem'], { seconds: 5, rounds: 2, steal: true, categories: ['genel'] });
  await h.start();
  write('ready-mine', 'ali'); // sıra oda sahibinde: "Sıra sende" + Hazırım
  write('ready-guest', 'cem'); // izleyen misafir

  await h.act('ali', { type: 'ready', attemptId: id() });
  write('countdown-mine', 'ali'); // halka, sayaç, Söyledim, oda sahibi düğmeleri
  write('countdown-guest', 'cem');
  h.advance(3500);
  write('countdown-low', 'ayse'); // son 1,5 sn: kırmızı halka

  h.advance(1500); // süre bitti → oylama
  write('vote-performer', 'ali'); // kendine oy veremez: bekleme yazısı
  write('vote-voter', 'cem');
  await h.act('cem', { type: 'vote', attemptId: id(), success: false });
  write('vote-voted', 'cem'); // oyunu değiştirebilirsin

  await h.act('ayse', { type: 'vote', attemptId: id(), success: false });
  // Başaramadı → çalma: sıradaki oyuncu (ayse) aynı görevi dener.
  write('steal-ready-host', 'ali'); // oda sahibi: "ayse yerine başlat", görevi değiştir
  write('steal-ready-mine', 'ayse');
  await h.act('ayse', { type: 'ready', attemptId: id() });
  write('steal-countdown', 'cem'); // "Çalma şansı" etiketi

  await h.act('ayse', { type: 'done', attemptId: id() });
  for (const v of ['ali', 'cem']) await h.act(v, { type: 'vote', attemptId: id(), success: true });
  write('ready-last-result', 'cem'); // "ayse puanı çaldı +1 · …"

  await h.act('ali', { type: 'skip', attemptId: id() });
  write('ready-skipped-host', 'ali'); // "ayse atlandı"; sıra cem'de

  h.end();
  write('podium-host', 'ali');
  write('podium-guest', 'ayse');
}

// ---------- İki takım: yeşil (ali, cem), mor (ayse, deniz); sınırsız tur.
{
  const { h, write, id } = play(['ali', 'ayse', 'cem', 'deniz'], {
    seconds: 7,
    rounds: 0,
    teamMode: true,
    teams: { a: ['ali', 'cem'], b: ['ayse', 'deniz'] },
    categories: ['genel', 'yemek'],
  });
  await h.start(); // sıra: ali, ayse, cem, deniz
  write('team-ready', 'deniz');
  await h.act('ali', { type: 'ready', attemptId: id() });
  write('team-countdown-host', 'ali');
  await h.act('ali', { type: 'done', attemptId: id() });
  h.setConnected('deniz', false); // bağlantısı kopan oy vermez
  write('team-vote', 'cem');
  for (const v of ['ayse', 'cem']) await h.act(v, { type: 'vote', attemptId: id(), success: false });
  h.setConnected('deniz', true);

  await h.act('ayse', { type: 'ready', attemptId: id() });
  await h.act('ayse', { type: 'done', attemptId: id() });
  for (const v of ['ali', 'cem', 'deniz']) await h.act(v, { type: 'vote', attemptId: id(), success: true });
  write('team-ready-last', 'cem');

  h.end(); // mor takım önde
  write('team-podium', 'ayse');
}

out.done();
