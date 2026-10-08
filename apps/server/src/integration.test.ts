import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import ffmpegStatic from 'ffmpeg-static';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ack, RoomState } from '@songie/shared';
import type { SongView } from '@songie/song-guess/shared';
import { buildApp, type App } from './app.js';

const ffmpeg = ffmpegStatic as unknown as string;

// Sahte Deezer: 6 şarkı, ikisi aynı sanatçının.
const TRACKS = [
  { id: 101, title: 'Şımarık', artist: 'Tarkan', rank: 900000 },
  { id: 102, title: 'Kuzu Kuzu', artist: 'Tarkan', rank: 800000 },
  { id: 103, title: 'Gülümse', artist: 'Sezen Aksu', rank: 700000 },
  { id: 104, title: 'Firuze', artist: 'Sezen Aksu', rank: 600000 },
  { id: 105, title: 'Bohemian Rhapsody', artist: 'Queen', rank: 500000 },
  { id: 106, title: 'Hello', artist: 'Adele', rank: 400000 },
  // Listenin görünmesi için en az 10 şarkı gerekir.
  ...Array.from({ length: 6 }, (_, i) => ({ id: 201 + i, title: `Dolgu ${i + 1}`, artist: `Sanatçı ${i + 1}`, rank: 1000 * (6 - i) })),
].map((t) => ({
  id: t.id,
  title: t.title,
  readable: true,
  rank: t.rank,
  preview: `https://cdn.test/${t.id}.mp3`,
  artist: { id: t.id * 10, name: t.artist },
  album: { id: t.id * 100, title: `${t.title} albüm`, cover_medium: null },
}));

// İkinci liste: tamamen farklı şarkılar.
const TRACKS2 = Array.from({ length: 10 }, (_, i) => ({
  id: 301 + i,
  title: `İkinci ${i + 1}`,
  readable: true,
  rank: 5000 - i,
  preview: `https://cdn.test/${301 + i}.mp3`,
  artist: { id: 9000 + i, name: `Grup ${i + 1}` },
  album: { id: 9100 + i, title: 'İkinci albüm', cover_medium: null },
}));

let mp3: Buffer;
const fakeFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  if (url.host === 'cdn.test') return new Response(new Uint8Array(mp3));
  if (url.pathname === '/playlist/1') return json({ id: 1, title: 'Test listesi', nb_tracks: TRACKS.length });
  if (url.pathname === '/playlist/1/tracks') return json({ data: TRACKS });
  if (url.pathname === '/playlist/2') return json({ id: 2, title: 'İkinci liste', nb_tracks: TRACKS2.length });
  if (url.pathname === '/playlist/2/tracks') return json({ data: TRACKS2 });
  const track = url.pathname.match(/^\/track\/(\d+)$/);
  if (track) return json([...TRACKS, ...TRACKS2].find((t) => t.id === Number(track[1])) ?? { error: { code: 800, message: 'no', type: 'x' } });
  if (url.pathname === '/search/track') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    return json({ data: TRACKS.filter((t) => q.includes(t.artist.name.toLowerCase())).map((t) => ({ ...t, duration: 200 })) });
  }
  if (url.host === 'open.spotify.com' && url.pathname === '/embed/playlist/0123456789abcdefABCDEF') {
    const trackList = [...TRACKS.map((t) => ({ title: t.title, subtitle: t.artist.name, duration: 200_000 })), { title: 'Olmayan', subtitle: 'Kimse', duration: 1 }];
    const data = { props: { pageProps: { state: { data: { entity: { name: 'Spotify listem', trackList } } } } } };
    return new Response(`<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`);
  }
  return new Response('not found', { status: 404 });
};

let app: App;
let base: string;
let tmp: string;

async function profile(nick: string): Promise<string> {
  const res = await app.http.inject({ method: 'POST', url: '/api/profile', payload: { nick, avatar: { shape: 'circle', color: 'signal' } } });
  return res.json().token as string;
}

interface Client {
  socket: Socket;
  views: SongView[];
  room: RoomState | null;
  emit<T = Record<string, unknown>>(event: string, payload?: unknown): Promise<Ack<T>>;
  waitView(pred: (v: SongView) => boolean, ms?: number): Promise<SongView>;
  waitRoom(pred: (r: RoomState) => boolean, ms?: number): Promise<RoomState>;
}

function until<T>(check: () => T | undefined, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const v = check();
      if (v !== undefined) return resolve(v);
      if (Date.now() - started > ms) return reject(new Error(`timeout: ${what}`));
      setTimeout(tick, 10);
    };
    tick();
  });
}

async function client(token: string): Promise<Client> {
  const socket = connect(base, { auth: { token }, transports: ['websocket'] });
  const c: Client = {
    socket,
    views: [],
    room: null,
    emit: (event, payload = {}) => new Promise((r) => socket.emit(event, payload, r)),
    waitView: (pred, ms = 4000) =>
      until(() => {
        const v = c.views[c.views.length - 1];
        return v && pred(v) ? v : undefined;
      }, ms, 'view'),
    waitRoom: (pred, ms = 4000) => until(() => (c.room && pred(c.room) ? c.room : undefined), ms, 'room'),
  };
  socket.on('game:view', (v: SongView | null) => v && c.views.push(v));
  socket.on('room:state', (r: RoomState) => (c.room = r));
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', reject);
  });
  return c;
}

const media = () => (app.games.get('song-guess') as unknown as { media: { trackOf(t: string): number | null } }).media;
const tokenOf = (v: SongView) => v.clips[0]!.split('/').at(-2)!;

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'songie-test-'));
  const mp3Path = path.join(tmp, 'tone.mp3');
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=30', '-q:a', '9', mp3Path]);
  mp3 = fs.readFileSync(mp3Path);
  app = await buildApp({
    dataDir: tmp,
    dbFile: ':memory:',
    webDist: path.join(tmp, 'no-web'),
    ffmpegPath: ffmpeg,
    fetchImpl: fakeFetch,
    background: false,
    gameOverrides: { 'song-guess': { timing: { countdownMs: 30, revealMs: 80, podiumMs: 80 } } },
  });
  const catalog = (app.games.get('song-guess') as unknown as { catalog: { importPool(d: object): Promise<unknown> } }).catalog;
  await catalog.importPool({ id: 'test', name: 'Test listesi', category: 'turkce', playlist: '1' });
  await catalog.importPool({ id: 'test2', name: 'İkinci liste', category: 'ozel', playlist: '2' });
  await app.http.listen({ port: 0, host: '127.0.0.1' });
  base = `http://127.0.0.1:${(app.http.server.address() as AddressInfo).port}`;
}, 30_000);

afterAll(async () => {
  await app?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('song-guess over sockets', () => {
  it('plays a full 3-round game with 3 players', async () => {
    const [a, b, c] = await Promise.all([profile('Ayşe'), profile('Barış'), profile('Cem')].map(async (p) => client(await p)));
    const ids = await Promise.all(
      [a, b, c].map(async (cl) => {
        const res = await app.http.inject({ method: 'GET', url: '/api/me', headers: { authorization: `Bearer ${(cl!.socket.auth as { token: string }).token}` } });
        return res.json().profile.id as string;
      }),
    );
    const [aId, bId, cId] = ids as [string, string, string];

    const created = await a!.emit<{ code: string }>('room:create', {
      gameId: 'song-guess',
      settings: { rounds: 3, pools: ['test'], difficulty: 'easy', timer: 0, startAt: 'start', startStage: 0, easySearch: false, artistCredit: true },
    });
    expect(created.ok).toBe(true);
    const code = (created as { code: string }).code;
    expect((await b!.emit('room:join', { code })).ok).toBe(true);
    expect((await c!.emit('room:join', { code })).ok).toBe(true);
    await a!.waitRoom((r) => r.players.length === 3);

    // Yalnızca host başlatabilir.
    const notHost = await b!.emit('room:start');
    expect(notHost).toMatchObject({ ok: false });
    expect(await a!.emit('room:start')).toEqual({ ok: true });

    // --- Tur 1: B yanlış, C sadece sanatçı, A doğru (aşama 0) → aşama 1'e geçer.
    let v = await a!.waitView((x) => x.phase === 'stage' && x.round === 1);
    expect(v.clips.filter(Boolean)).toHaveLength(1);
    const token = tokenOf(v);
    const answer = media().trackOf(token)!;
    const clip0 = await fetch(`${base}${v.clips[0]}`);
    expect(clip0.status).toBe(200);
    expect(clip0.headers.get('content-type')).toBe('audio/wav');
    // Açılmamış aşama ve tam önizleme gizli.
    expect((await fetch(`${base}/api/games/song-guess/media/${token}/1`)).status).toBe(403);
    expect((await fetch(`${base}/api/games/song-guess/media/${token}/full`)).status).toBe(403);
    // Görünüm cevabı sızdırmıyor.
    expect(JSON.stringify(v)).not.toContain(String(answer));

    const ans = TRACKS.find((t) => t.id === answer)!;
    const sameArtist = TRACKS.find((t) => t.artist.name === ans.artist.name && t.id !== answer);
    const other = TRACKS.find((t) => t.artist.name !== ans.artist.name)!;

    expect(await b!.emit('game:action', { action: { type: 'guess', trackId: other.id } })).toMatchObject({ ok: true, verdict: 'wrong' });
    // Kilitliyken ikinci tahmin reddedilir.
    expect(await b!.emit('game:action', { action: { type: 'guess', trackId: answer } })).toMatchObject({ ok: false });
    if (sameArtist) {
      expect(await c!.emit('game:action', { action: { type: 'guess', trackId: sameArtist.id } })).toMatchObject({ ok: true, verdict: 'artist' });
    } else {
      await c!.emit('game:action', { action: { type: 'skip' } });
    }
    expect(await a!.emit('game:action', { action: { type: 'guess', trackId: answer } })).toMatchObject({ ok: true, verdict: 'correct' });

    // Bilmeyen herkes kilitli → hemen aşama 1.
    v = await b!.waitView((x) => x.phase === 'stage' && x.stage === 1);
    expect(v.me.canGuess).toBe(true);
    expect((await fetch(`${base}${v.clips[1]}`)).status).toBe(200);
    expect(await b!.emit('game:action', { action: { type: 'guess', trackId: answer } })).toMatchObject({ verdict: 'correct' });
    expect(await c!.emit('game:action', { action: { type: 'guess', trackId: answer } })).toMatchObject({ verdict: 'correct' });

    // Herkes bildi → sonuç.
    v = await a!.waitView((x) => x.phase === 'reveal' && x.round === 1);
    expect(v.reveal?.trackId).toBe(answer);
    expect((await fetch(`${base}${v.reveal!.previewUrl}`)).status).toBe(200);
    const scores = Object.fromEntries(v.players.map((p) => [p.id, p.score]));
    expect(scores[aId]).toBeGreaterThan(1000); // aşama 0 + ilk bilen
    expect(scores[aId]).toBeGreaterThan(scores[bId]!);
    // Sanatçı puanı tam puanla değiştirilir, üstüne eklenmez: C ve B aynı aşamada bildi.
    if (sameArtist) expect(Math.abs(scores[cId]! - scores[bId]!)).toBeLessThan(60);

    // Süresiz oyunda sonuç ekranı kendiliğinden geçmez; herkes "Sonraki şarkı" demeli.
    await new Promise((r) => setTimeout(r, 300));
    expect(a!.views.at(-1)!.phase).toBe('reveal');
    expect(await b!.emit('game:action', { action: { type: 'next', force: true } })).toMatchObject({ ok: false });
    await a!.emit('game:action', { action: { type: 'next' } });
    await b!.emit('game:action', { action: { type: 'next' } });
    v = await a!.waitView((x) => x.players.filter((p) => p.ready).length === 2);
    expect(v.phase).toBe('reveal');
    await c!.emit('game:action', { action: { type: 'next' } });

    // --- Tur 2 ve 3: herkes pas → aşamalar ilerler; sonra herkes bilir.
    for (const round of [2, 3]) {
      v = await a!.waitView((x) => x.phase === 'stage' && x.round === round, 6000);
      for (const cl of [a, b, c]) await cl!.emit('game:action', { action: { type: 'skip' } });
      v = await a!.waitView((x) => x.phase === 'stage' && x.round === round && x.stage === 1);
      const ansId = media().trackOf(tokenOf(v))!;
      for (const cl of [a, b, c]) await cl!.emit('game:action', { action: { type: 'guess', trackId: ansId } });
      v = await a!.waitView((x) => x.phase === 'reveal' && x.round === round);
      expect(v.players.map((p) => p.streak)).toEqual([round, round, round]);
      // Oda sahibi beklemeden geçirebilir.
      await a!.emit('game:action', { action: { type: 'next', force: true } });
    }

    // Podyum → oda lobiye döner, sonuçlar kaydedilir.
    await a!.waitView((x) => x.phase === 'podium');
    const room = await a!.waitRoom((r) => r.phase === 'lobby' && r.lastStandings !== null);
    expect(room.lastStandings![0]!.playerId).toBe(aId);
    const rows = app.db.prepare('SELECT player_id, rank FROM game_results WHERE room_code = ? ORDER BY rank').all(code) as { player_id: string }[];
    expect(rows).toHaveLength(3);
    const stats = await app.http.inject({ method: 'GET', url: '/api/me', headers: { authorization: `Bearer ${(a!.socket.auth as { token: string }).token}` } });
    expect(stats.json().stats).toMatchObject({ gamesPlayed: 1, wins: 1 });

    for (const cl of [a, b, c]) cl!.socket.close();
  }, 30_000);

  it('rejects sockets without a valid token and unknown room codes', async () => {
    const bad = connect(base, { auth: { token: 'nope' }, transports: ['websocket'] });
    const err = await new Promise<Error>((r) => bad.on('connect_error', r));
    expect(err.message).toBe('unauthorized');
    bad.close();

    const d = await client(await profile('Deniz'));
    expect(await d.emit('room:join', { code: 'ZZZZ' })).toMatchObject({ ok: false });
    expect(await d.emit('room:join', { code: '12' })).toMatchObject({ ok: false, error: 'Oda kodu 4 harften oluşur' });
    d.socket.close();
  });

  it('plays unlimited solo rounds with a streak until the host ends the game', async () => {
    const s = await client(await profile('Solo'));
    const res = await s.emit<{ code: string }>('room:create', {
      gameId: 'song-guess',
      settings: { rounds: 0, pools: ['test'], difficulty: 'expert', timer: 0, startAt: 'random', startStage: 2, easySearch: true, artistCredit: false },
    });
    expect(res.ok).toBe(true);
    await s.emit('room:start');
    let v = await s.waitView((x) => x.phase === 'stage' && x.round === 1);
    expect(v.totalRounds).toBeNull();
    // "Tahmin şuradan başlasın: 2 sn" → aşama 2'den başlar, önceki klipler de açık.
    expect(v.stage).toBe(2);
    expect(v.clips.filter(Boolean)).toHaveLength(3);
    await s.emit('game:action', { action: { type: 'guess', trackId: media().trackOf(tokenOf(v))! } });
    v = await s.waitView((x) => x.phase === 'reveal');
    expect(v.players[0]).toMatchObject({ streak: 1, bestStreak: 1 });
    await s.emit('game:action', { action: { type: 'next' } });

    v = await s.waitView((x) => x.phase === 'stage' && x.round === 2);
    for (let stage = 2; stage < 5; stage++) {
      await s.waitView((x) => x.phase === 'stage' && x.stage === stage);
      await s.emit('game:action', { action: { type: 'skip' } });
    }
    v = await s.waitView((x) => x.phase === 'reveal' && x.round === 2);
    expect(v.players[0]).toMatchObject({ streak: 0, bestStreak: 1 });
    await s.emit('game:action', { action: { type: 'next' } });
    await s.waitView((x) => x.phase === 'stage' && x.round === 3);

    // Sınırsız oyun, oda sahibi bitirince skor kaydedilerek kapanır.
    expect((await s.emit('room:lobby')).ok).toBe(true);
    await s.waitView((x) => x.phase === 'podium');
    const room = await s.waitRoom((r) => r.phase === 'lobby' && r.lastStandings !== null);
    expect(room.lastStandings).toHaveLength(1);
    const me = await app.http.inject({ method: 'GET', url: '/api/me', headers: { authorization: `Bearer ${(s.socket.auth as { token: string }).token}` } });
    expect(me.json().stats.bestStreak).toBe(1);
    s.socket.close();
  }, 20_000);

  it('advances stages and the reveal by itself when the timer is on', async () => {
    const s = await client(await profile('Saatli'));
    await s.emit('room:create', {
      gameId: 'song-guess',
      settings: { rounds: 2, pools: ['test'], difficulty: 'easy', timer: 1, startAt: 'start', startStage: 3, easySearch: false, artistCredit: true },
    });
    await s.emit('room:start');
    await s.waitView((x) => x.phase === 'stage' && x.stage === 3 && x.timed);
    // Kimse bir şey yapmadan 1 sn sonra son aşama, sonra sonuç, sonra ikinci şarkı.
    await s.waitView((x) => x.phase === 'stage' && x.stage === 4, 3000);
    await s.waitView((x) => x.phase === 'reveal', 3000);
    await s.waitView((x) => x.phase === 'stage' && x.round === 2, 3000);
    s.socket.close();
  }, 15_000);

  it('only lets the host force the next stage', async () => {
    const [h, g] = await Promise.all([profile('Ev'), profile('Misafir')].map(async (p) => client(await p)));
    const res = await h!.emit<{ code: string }>('room:create', {
      gameId: 'song-guess',
      settings: { rounds: 3, pools: ['test'], difficulty: 'easy', timer: 0, startAt: 'start', startStage: 0, easySearch: false, artistCredit: true },
    });
    await g!.emit('room:join', { code: (res as { code: string }).code });
    await h!.waitRoom((r) => r.players.length === 2);
    await h!.emit('room:start');
    await h!.waitView((x) => x.phase === 'stage' && x.stage === 0);
    expect(await g!.emit('game:action', { action: { type: 'advance' } })).toMatchObject({ ok: false });
    expect(await h!.emit('game:action', { action: { type: 'advance' } })).toMatchObject({ ok: true });
    await g!.waitView((x) => x.phase === 'stage' && x.stage === 1);
    h!.socket.close();
    g!.socket.close();
  }, 15_000);

  it('lets the host change settings during the game, applied from the next song', async () => {
    const [h, g] = await Promise.all([profile('Canlı'), profile('İzleyen')].map(async (p) => client(await p)));
    const base = { rounds: 3, pools: ['test'], difficulty: 'easy', timer: 0, startAt: 'start', startStage: 0, easySearch: false, artistCredit: true };
    const res = await h!.emit<{ code: string }>('room:create', { gameId: 'song-guess', settings: base });
    await g!.emit('room:join', { code: (res as { code: string }).code });
    await h!.waitRoom((r) => r.players.length === 2);
    await h!.emit('room:start');
    await h!.waitView((x) => x.phase === 'stage');
    expect(await g!.emit('room:settings', { settings: { ...base, difficulty: 'hard' } })).toMatchObject({ ok: false });
    expect(await h!.emit('room:settings', { settings: { ...base, difficulty: 'impossible', rounds: 0 } })).toMatchObject({ ok: true });
    const v = await g!.waitView((x) => x.difficulty === 'impossible');
    expect(v.totalRounds).toBeNull();
    expect(v.feed.at(-1)).toMatchObject({ kind: 'settings' });
    await g!.waitRoom((r) => (r.settings as { difficulty: string }).difficulty === 'impossible');
    // Canlı akış: pas geçen görünür.
    await g!.emit('game:action', { action: { type: 'skip' } });
    await h!.waitView((x) => x.feed.some((f) => f.kind === 'skip'));
    h!.socket.close();
    g!.socket.close();
  }, 15_000);

  it('plays the very next song from a list the host switches to mid-game', async () => {
    const s = await client(await profile('Değiştiren'));
    const base = { rounds: 5, pools: ['test'], difficulty: 'easy', timer: 0, startAt: 'start', startStage: 0, easySearch: false, artistCredit: true };
    await s.emit('room:create', { gameId: 'song-guess', settings: base });
    await s.emit('room:start');
    let v = await s.waitView((x) => x.phase === 'stage' && x.round === 1);
    // Sıradaki şarkı arka planda eski listeden hazırlanmış olabilir; liste değişince atılmalı.
    await new Promise((r) => setTimeout(r, 300));
    expect(await s.emit('room:settings', { settings: { ...base, pools: ['test2'] } })).toMatchObject({ ok: true });
    for (let stage = 0; stage < 5; stage++) {
      await s.waitView((x) => x.phase === 'stage' && x.stage === stage);
      await s.emit('game:action', { action: { type: 'skip' } });
    }
    await s.waitView((x) => x.phase === 'reveal');
    await s.emit('game:action', { action: { type: 'next' } });
    v = await s.waitView((x) => x.phase === 'stage' && x.round === 2, 6000);
    expect(media().trackOf(tokenOf(v))).toBeGreaterThanOrEqual(301);
    for (let stage = 0; stage < 5; stage++) {
      await s.waitView((x) => x.phase === 'stage' && x.stage === stage);
      await s.emit('game:action', { action: { type: 'skip' } });
    }
    v = await s.waitView((x) => x.phase === 'reveal' && x.round === 2);
    expect(v.reveal?.poolName).toBe('İkinci liste');
    s.socket.close();
  }, 20_000);

  it('imports a Spotify playlist by matching its songs on Deezer', async () => {
    const token = await profile('Spotifyci');
    const res = await app.http.inject({
      method: 'POST',
      url: '/api/games/song-guess/pools',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://open.spotify.com/intl-tr/playlist/0123456789abcdefABCDEF?si=x' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ matched: 12, total: 13, pool: { id: 'custom-sp-0123456789abcdefABCDEF', name: 'Spotify listem', category: 'ozel' } });
    const bad = await app.http.inject({
      method: 'POST',
      url: '/api/games/song-guess/pools',
      headers: { authorization: `Bearer ${token}` },
      payload: { url: 'https://example.com/list' },
    });
    expect(bad.json().error).toContain('Spotify');

    // Eklenen liste kişiye özel: başkası görmez, ama odada seçiliyse adı için istenebilir.
    const list = (t: string, q = '') =>
      app.http.inject({ method: 'GET', url: `/api/games/song-guess/pools${q}`, headers: { authorization: `Bearer ${t}` } }).then((r) => r.json().pools.map((p: { id: string }) => p.id) as string[]);
    const other = await profile('Başkası');
    const spId = 'custom-sp-0123456789abcdefABCDEF';
    expect(await list(token)).toContain(spId);
    expect(await list(other)).not.toContain(spId);
    expect(await list(other, `?selected=${spId}`)).toContain(spId);
    expect(await list(other)).toContain('test');
    // Kendi listesinden çıkarınca o kişiden kaybolur.
    await app.http.inject({ method: 'POST', url: `/api/games/song-guess/pools/${spId}/remove`, headers: { authorization: `Bearer ${token}` }, payload: {} });
    expect(await list(token)).not.toContain(spId);
  });

  it('limits easy search to the given pools', async () => {
    const token = await profile('Arayan');
    const res = await app.http.inject({ method: 'GET', url: '/api/games/song-guess/search?q=tarkan&pools=test', headers: { authorization: `Bearer ${token}` } });
    expect(res.json().hits.map((h: { title: string }) => h.title).sort()).toEqual(['Kuzu Kuzu', 'Şımarık']);
    const none = await app.http.inject({ method: 'GET', url: '/api/games/song-guess/search?q=tarkan&pools=yok', headers: { authorization: `Bearer ${token}` } });
    expect(none.json().hits).toEqual([]);
  });
});
