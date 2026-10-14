/**
 * Şarkıyı Bil: gerçek oyun sunucusu (createSongGame) test düzeneğinde oynatılır.
 * Katalog bellek içi SQLite + sahte Deezer (fetch) ile kurulur; medya (ffmpeg kesimi) yerine
 * yalnızca klip adreslerini üreten bir taslak kullanılır (görünüm yalnızca adresleri taşır).
 * Çalıştır: cd apps/server && npx tsx scripts/mobile-fixtures/song-guess.ts
 */
import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type SongSettings, type SongView } from '@songie/song-guess/shared';
import { Catalog, DeezerClient, createSongGame, type MediaService } from '@songie/song-guess/server';
import { fixtureWriter } from './lib.js';

// Aynı çıktı için sabit tohumlu rastgele (şarkı seçimi karıştırılarak yapılır).
let seed = 20251014;
Math.random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

type Raw = { id: number; title: string; artist: string; rank: number };
// Her sanatçının iki şarkısı var: "sanatçıyı bildi" durumu için.
const LIST1: Raw[] = [
  { id: 101, title: 'Şımarık', artist: 'Tarkan', rank: 900000 },
  { id: 102, title: 'Kuzu Kuzu', artist: 'Tarkan', rank: 850000 },
  { id: 103, title: 'Gülümse', artist: 'Sezen Aksu', rank: 800000 },
  { id: 104, title: 'Firuze', artist: 'Sezen Aksu', rank: 750000 },
  { id: 105, title: 'Gülpembe', artist: 'Barış Manço', rank: 700000 },
  { id: 106, title: 'Dönence', artist: 'Barış Manço', rank: 650000 },
  { id: 107, title: 'Senden Daha Güzel', artist: 'Duman', rank: 600000 },
  { id: 108, title: 'Bu Akşam', artist: 'Duman', rank: 550000 },
  { id: 109, title: 'Bir Derdim Var', artist: 'mor ve ötesi', rank: 500000 },
  { id: 110, title: 'Cambaz', artist: 'mor ve ötesi', rank: 450000 },
  { id: 111, title: 'Yalan', artist: 'Sertab Erener', rank: 400000 },
  { id: 112, title: 'Everyway That I Can', artist: 'Sertab Erener', rank: 350000 },
];
const LIST2: Raw[] = [
  { id: 201, title: 'Bohemian Rhapsody', artist: 'Queen', rank: 990000 },
  { id: 202, title: 'Hello', artist: 'Adele', rank: 980000 },
  { id: 203, title: 'Blinding Lights', artist: 'The Weeknd', rank: 970000 },
  { id: 204, title: 'Billie Jean', artist: 'Michael Jackson', rank: 960000 },
  { id: 205, title: 'Smells Like Teen Spirit', artist: 'Nirvana', rank: 950000 },
  { id: 206, title: 'Rolling in the Deep', artist: 'Adele', rank: 940000 },
  { id: 207, title: 'Levitating', artist: 'Dua Lipa', rank: 930000 },
  { id: 208, title: 'Shape of You', artist: 'Ed Sheeran', rank: 920000 },
  { id: 209, title: 'Halo', artist: 'Beyoncé', rank: 910000 },
  { id: 210, title: 'Wonderwall', artist: 'Oasis', rank: 900000 },
];
const dz = (t: Raw) => ({
  id: t.id,
  title: t.title,
  readable: true,
  rank: t.rank,
  preview: `https://cdn.test/${t.id}.mp3`,
  artist: { id: t.id * 10, name: t.artist },
  album: { id: t.id * 100, title: `${t.title} (Albüm)`, cover_medium: null },
});

const fakeFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  if (url.pathname === '/playlist/1') return json({ id: 1, title: 'Türkçe Pop', nb_tracks: LIST1.length });
  if (url.pathname === '/playlist/1/tracks') return json({ data: LIST1.map(dz) });
  if (url.pathname === '/playlist/2') return json({ id: 2, title: 'Global Hits', nb_tracks: LIST2.length });
  if (url.pathname === '/playlist/2/tracks') return json({ data: LIST2.map(dz) });
  return new Response('not found', { status: 404 });
};

const catalog = new Catalog(new Database(':memory:'), new DeezerClient(fakeFetch));
await catalog.importPool({ id: 'tr-test', name: 'Türkçe Pop', category: 'turkce', playlist: '1' });
await catalog.importPool({ id: 'global-test', name: 'Global Hits', category: 'global', playlist: '2' });

/** Medya taslağı: klipleri kesmez, sunucuyla aynı adresleri üretir. `gate` verilirse ilk şarkıdan sonrakiler onu bekler. */
function stubMedia(gate?: Promise<void>): MediaService {
  let n = 0;
  return {
    async prepare(trackId: number) {
      n++;
      if (gate && n > 1) await gate;
      return { token: `t${trackId}n${n}`, trackId, unlocked: -1, revealed: false, dir: '', src: '', createdAt: 0 };
    },
    unlock() {},
    reveal() {},
    release() {},
    urlFor: (token: string, stage: number | 'full') => `/api/games/song-guess/media/${token}/${stage}`,
  } as unknown as MediaService;
}

const ALL = [...LIST1, ...LIST2];
type State = { current: { track: { id: number; artist: string } } };
const answer = (h: Harness<SongView>) => (h.state as State).current.track;
const artistGuess = (h: Harness<SongView>) => ALL.find((t) => t.artist === answer(h).artist && t.id !== answer(h).id)!.id;
const wrongGuess = (h: Harness<SongView>) => ALL.find((t) => t.artist !== answer(h).artist)!.id;
const flush = () => new Promise((r) => setTimeout(r, 5));

const out = fixtureWriter('song-guess');
/** Görünüm + odanın ayarları + oyuncular + kimin görünümü. Gerçek sunucuda `serverNow` ile `phaseEndsAt` aynı saatten gelir. */
function write(name: string, h: Harness<SongView>, me: string, settings: SongSettings, players: string[]) {
  out.write(name, { ...h.view<SongView>(me), serverNow: h.now }, { settings, players, me });
}
async function skipAll(h: Harness<SongView>, ids: string[]) {
  for (const id of ids) await h.act(id, { type: 'skip' });
}

// ---------------------------------------------------------------- 4 kişilik, süresiz, 3 tur
{
  const players = ['ali', 'ayse', 'cem', 'deniz'];
  let settings: SongSettings = { ...defaultSettings, pools: ['tr-test'], rounds: 3, timer: 0, startStage: 0 };
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const game = createSongGame({ catalog, media: stubMedia(gate) });
  const h = createHarness<SongView>(game, { players, settings });
  await h.start();
  write('countdown', h, 'ali', settings, players);
  h.advance(3000);
  write('stage-host', h, 'ali', settings, players);
  write('stage-guest', h, 'cem', settings, players);
  h.advance(2500);
  await h.act('ayse', { type: 'guess', trackId: wrongGuess(h) });
  write('stage-wrong', h, 'ayse', settings, players);
  await h.act('ali', { type: 'guess', trackId: artistGuess(h) });
  await skipAll(h, ['cem', 'deniz']);
  // 2. parça: ali sanatçıyı bildi, şarkıyı arıyor.
  write('stage-artist', h, 'ali', settings, players);
  h.advance(4000);
  await h.act('ali', { type: 'guess', trackId: answer(h).id });
  write('stage-correct', h, 'ali', settings, players);
  await h.act('ayse', { type: 'guess', trackId: artistGuess(h) });
  await h.act('cem', { type: 'skip' });
  await h.act('deniz', { type: 'guess', trackId: wrongGuess(h) });
  await skipAll(h, ['ayse', 'cem', 'deniz']);
  await skipAll(h, ['ayse', 'cem', 'deniz']);
  write('stage-last', h, 'cem', settings, players);
  await skipAll(h, ['ayse', 'cem', 'deniz']);
  write('reveal-host', h, 'ali', settings, players);
  write('reveal-artist', h, 'ayse', settings, players);
  write('reveal-guest', h, 'cem', settings, players);
  await h.act('ali', { type: 'next' });
  write('reveal-ready', h, 'ali', settings, players);
  for (const id of ['ayse', 'cem', 'deniz']) await h.act(id, { type: 'next' });
  write('loading', h, 'ali', settings, players);
  release();
  await flush();
  h.advance(3000);
  // Oda sahibi oyun sırasında listeyi değiştirir: akışta görünür.
  settings = { ...settings, pools: ['tr-test', 'global-test'] };
  h.changeSettings({ pools: settings.pools });
  write('stage-settings', h, 'cem', settings, players);
  for (let i = 0; i < 5; i++) await skipAll(h, players);
  write('reveal-nobody', h, 'ali', settings, players);
  for (const id of players) await h.act(id, { type: 'next' });
  await flush();
  h.advance(3000);
  h.advance(1200);
  await h.act('deniz', { type: 'guess', trackId: answer(h).id });
  for (let i = 0; i < 5; i++) await skipAll(h, ['ali', 'ayse', 'cem']);
  write('reveal-final', h, 'ali', settings, players);
  for (const id of players) await h.act(id, { type: 'next' });
  await flush();
  write('podium', h, 'ayse', settings, players);
}

// ---------------------------------------------------------------- Tek başına (sınırsız, seri)
{
  const players = ['ali'];
  const settings: SongSettings = { ...defaultSettings, pools: ['tr-test'], rounds: 0 };
  const h = createHarness<SongView>(createSongGame({ catalog, media: stubMedia() }), { players, settings });
  await h.start();
  for (let round = 0; round < 2; round++) {
    h.advance(3000);
    h.advance(1500);
    await h.act('ali', { type: 'guess', trackId: answer(h).id });
    if (round === 1) write('solo-reveal', h, 'ali', settings, players);
    await h.act('ali', { type: 'next' });
    await flush();
  }
  h.advance(3000);
  write('solo-stage', h, 'ali', settings, players);
  await h.act('ali', { type: 'guess', trackId: wrongGuess(h) });
  write('solo-history', h, 'ali', settings, players);
  h.end();
  write('solo-podium', h, 'ali', settings, players);
}

// ---------------------------------------------------------------- 2 kişilik, süreli (20 sn), 0,5 sn'den başlar
{
  const players = ['ali', 'ayse'];
  const settings: SongSettings = { ...defaultSettings, pools: ['tr-test'], rounds: 5, timer: 20, startStage: 1, difficulty: 'hard', easySearch: true };
  const h = createHarness<SongView>(createSongGame({ catalog, media: stubMedia() }), { players, settings });
  await h.start();
  write('countdown-timed', h, 'ayse', settings, players);
  h.advance(3000);
  h.advance(5000);
  write('stage-timed', h, 'ali', settings, players);
  h.advance(12500);
  write('stage-timed-low', h, 'ayse', settings, players);
  h.advance(2500 + 20000 * 3);
  write('reveal-timed', h, 'ayse', settings, players);
}

// ---------------------------------------------------------------- Kimse puan almadan bitti: berabere
{
  const players = ['ali', 'ayse'];
  const settings: SongSettings = { ...defaultSettings, pools: ['tr-test'], rounds: 5 };
  const h = createHarness<SongView>(createSongGame({ catalog, media: stubMedia() }), { players, settings });
  await h.start();
  h.advance(3000);
  h.end();
  write('podium-draw', h, 'ali', settings, players);
}

out.done();
