import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ack, RoomState } from '@songie/shared';
import type { TabooView } from '@songie/taboo/shared';
import { buildApp, type App } from './app.js';

let app: App;
let base: string;
let tmp: string;

interface Client {
  id: string;
  socket: Socket;
  views: TabooView[];
  room: RoomState | null;
  emit(event: string, payload?: unknown): Promise<Ack<Record<string, unknown>>>;
  view(pred: (v: TabooView) => boolean, ms?: number): Promise<TabooView>;
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

async function player(nick: string): Promise<Client> {
  const res = await app.http.inject({ method: 'POST', url: '/api/profile', payload: { nick, avatar: { shape: 'circle', color: 'mint' } } });
  const { token, profile } = res.json() as { token: string; profile: { id: string } };
  const socket = connect(base, { auth: { token }, transports: ['websocket'] });
  const c: Client = {
    id: profile.id,
    socket,
    views: [],
    room: null,
    emit: (event, payload = {}) => new Promise((r) => socket.emit(event, payload, r)),
    view: (pred, ms = 4000) =>
      until(() => {
        const v = c.views.at(-1);
        return v && pred(v) ? v : undefined;
      }, ms, `view (${nick})`),
    waitRoom: (pred, ms = 4000) => until(() => (c.room && pred(c.room) ? c.room : undefined), ms, 'room'),
  };
  socket.on('game:view', (v: TabooView | null) => v && c.views.push(v));
  socket.on('room:state', (r: RoomState) => (c.room = r));
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', reject);
  });
  return c;
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'songie-taboo-'));
  app = await buildApp({
    dataDir: tmp,
    dbFile: ':memory:',
    webDist: path.join(tmp, 'no-web'),
    ffmpegPath: 'ffmpeg',
    background: false,
    gameOverrides: { taboo: { deckDir: path.resolve(import.meta.dirname, '../../../games/taboo/server/test-deck'), timing: { podiumMs: 50 } } },
  });
  await app.http.listen({ port: 0, host: '127.0.0.1' });
  base = `http://127.0.0.1:${(app.http.server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await app?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('taboo', () => {
  it('shows the card to the narrator and the rival team, never to the narrator’s teammates', async () => {
    const [a, b, c, d] = await Promise.all(['Anlatan', 'Takımdaş', 'Rakip1', 'Rakip2'].map(player));
    const settings = {
      teams: { a: [a!.id, b!.id], b: [c!.id, d!.id] },
      seconds: 5,
      passes: 3,
      turns: 1,
      categories: ['genel'],
      tabooPenalty: true,
    };
    const created = await a!.emit('room:create', { gameId: 'taboo', settings });
    const code = (created as unknown as { code: string }).code;
    for (const p of [b, c, d]) expect((await p!.emit('room:join', { code })).ok).toBe(true);
    await a!.waitRoom((r) => r.players.length === 4);
    expect(await a!.emit('room:start')).toEqual({ ok: true });

    let v = await a!.view((x) => x.phase === 'ready');
    expect(v.narratorId).toBe(a!.id);
    expect(await b!.emit('game:action', { action: { type: 'start' } })).toMatchObject({ ok: false });
    await a!.emit('game:action', { action: { type: 'start' } });

    const va = await a!.view((x) => x.phase === 'turn');
    const vb = await b!.view((x) => x.phase === 'turn');
    const vc = await c!.view((x) => x.phase === 'turn');
    const vd = await d!.view((x) => x.phase === 'turn');
    expect(va.role).toBe('narrator');
    expect(vb.role).toBe('guesser');
    expect(vc.role).toBe('watcher');
    expect(va.card?.taboo).toHaveLength(5);
    expect(vb.card).toBeNull();
    // Takım arkadaşına giden hiçbir veride kart kelimesi yok.
    expect(JSON.stringify(b!.views)).not.toContain(va.card!.word);
    expect(vc.card).toEqual(va.card);
    expect(vd.card).toEqual(va.card);

    // Doğru: +1
    await a!.emit('game:action', { action: { type: 'correct', cardId: va.card!.id } });
    v = await c!.view((x) => x.scores.a === 1);
    const second = v.card!;
    // Takım arkadaşı ve anlatıcı Tabu diyemez; rakip der: -1
    expect(await b!.emit('game:action', { action: { type: 'taboo', cardId: second.id } })).toMatchObject({ ok: false });
    expect(await c!.emit('game:action', { action: { type: 'taboo', cardId: second.id } })).toMatchObject({ ok: true });
    // Aynı karta geç basan ikinci rakip sayılmaz.
    expect(await d!.emit('game:action', { action: { type: 'taboo', cardId: second.id } })).toMatchObject({ ok: true, stale: true });
    v = await a!.view((x) => x.scores.a === 0 && x.flash?.kind === 'taboo');
    // Pas ve geri al
    await a!.emit('game:action', { action: { type: 'pass', cardId: v.card!.id } });
    v = await a!.view((x) => x.passesLeft === 2);
    const afterPass = v.card!;
    await a!.emit('game:action', { action: { type: 'undo' } });
    v = await a!.view((x) => x.passesLeft === 3);
    expect(v.card!.id).not.toBe(afterPass.id);
    expect(await b!.emit('game:action', { action: { type: 'correct', cardId: v.card!.id } })).toMatchObject({ ok: false });

    // Süre bitince sıra rakip takıma geçer; şimdi kartı A görür, D görmez.
    v = await a!.view((x) => x.phase === 'ready' && x.team === 'b', 8000);
    expect(v.lastTurn?.cards.map((x) => x.result)).toEqual(['correct', 'taboo']);
    expect(v.narratorId).toBe(c!.id);
    await c!.emit('game:action', { action: { type: 'start' } });
    expect((await a!.view((x) => x.phase === 'turn')).card).not.toBeNull();
    expect((await d!.view((x) => x.phase === 'turn')).card).toBeNull();
    const vc2 = await c!.view((x) => x.phase === 'turn');
    await c!.emit('game:action', { action: { type: 'correct', cardId: vc2.card!.id } });

    // Takım başına 1 anlatma → ikinci tur bitince oyun biter, skorlar kaydedilir.
    await a!.view((x) => x.phase === 'podium', 8000);
    const room = await a!.waitRoom((r) => r.phase === 'lobby' && r.lastStandings !== null);
    expect(room.lastStandings!.find((s) => s.playerId === c!.id)).toMatchObject({ score: 1, rank: 1 });
    expect(room.lastStandings!.find((s) => s.playerId === a!.id)).toMatchObject({ score: 0 });
    for (const p of [a, b, c, d]) p!.socket.close();
  }, 30_000);

  it('needs two players per team and balances unassigned players', async () => {
    const ps = await Promise.all(['T1', 'T2', 'T3'].map(player));
    const created = await ps[0]!.emit('room:create', { gameId: 'taboo' });
    const code = (created as unknown as { code: string }).code;
    for (const p of ps.slice(1)) await p.emit('room:join', { code });
    await ps[0]!.waitRoom((r) => r.players.length === 3);
    expect(await ps[0]!.emit('room:start')).toMatchObject({ ok: false });
    const p4 = await player('T4');
    await p4.emit('room:join', { code });
    await ps[0]!.waitRoom((r) => r.players.length === 4);
    expect(await ps[0]!.emit('room:start')).toEqual({ ok: true });
    const v = await ps[0]!.view((x) => x.phase === 'ready');
    expect([v.teams.a.length, v.teams.b.length]).toEqual([2, 2]);
    for (const p of [...ps, p4]) p.socket.close();
  }, 15_000);

  it('accepts custom cards from friends', async () => {
    const res = await app.http.inject({ method: 'POST', url: '/api/profile', payload: { nick: 'Kartçı', avatar: { shape: 'circle', color: 'mint' } } });
    const token = res.json().token as string;
    const add = await app.http.inject({
      method: 'POST',
      url: '/api/games/taboo/cards',
      headers: { authorization: `Bearer ${token}` },
      payload: { word: 'Mahalle maçı', taboo: ['Futbol', 'Sokak', 'Top', 'Kale', 'Arkadaş'] },
    });
    expect(add.json()).toMatchObject({ ok: true });
    const bad = await app.http.inject({ method: 'POST', url: '/api/games/taboo/cards', headers: { authorization: `Bearer ${token}` }, payload: { word: 'X', taboo: ['a'] } });
    expect(bad.statusCode).toBe(400);
    const cats = await app.http.inject({ method: 'GET', url: '/api/games/taboo/categories' });
    expect(cats.json().categories).toContainEqual({ id: 'arkadas', name: 'Arkadaş kartları', count: 1 });
  });
});
