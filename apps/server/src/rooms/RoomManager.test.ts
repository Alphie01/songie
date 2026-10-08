import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AnyServerGame } from '@songie/game-kit/server';
import type { Profile, RoomState } from '@songie/shared';
import { RoomManager, type RoomTransport } from './RoomManager.js';

const p = (id: string): Profile => ({ id, nick: id.toUpperCase(), avatar: { shape: 'circle', color: 'signal' } });

const dummyGame: AnyServerGame = {
  id: 'dummy',
  minPlayers: 2,
  maxPlayers: 3,
  settingsSchema: z.object({ n: z.number() }),
  defaultSettings: { n: 1 },
  actionSchema: z.object({ win: z.boolean() }),
  async start() {
    return { moves: 0 };
  },
  onAction(ctx, state: { moves: number }, playerId, action: { win: boolean }) {
    state.moves++;
    if (action.win) ctx.finish(ctx.players().map((pl) => ({ playerId: pl.id, score: pl.id === playerId ? 10 : 0 })));
  },
  viewFor: (state: { moves: number }) => state,
};

let states: RoomState[];
let closed: { ids: string[]; reason: string }[];
let saved: unknown[];
let rooms: RoomManager;

beforeEach(() => {
  vi.useFakeTimers();
  states = [];
  closed = [];
  saved = [];
  const transport: RoomTransport = {
    roomState: (_c, s) => states.push(s),
    roomClosed: (_c, ids, reason) => closed.push({ ids, reason }),
    chat: () => {},
    react: () => {},
    gameView: () => {},
  };
  rooms = new RoomManager(new Map([['dummy', dummyGame]]), transport, (...args) => saved.push(args), {
    lobbyGraceMs: 1000,
    emptyRoomMs: 5000,
  });
});

afterEach(() => vi.useRealTimers());

const last = () => states[states.length - 1]!;

describe('RoomManager', () => {
  it('enforces capacity and host-only actions', async () => {
    const { code } = rooms.create(p('a'), 'dummy');
    rooms.join(p('b'), code);
    rooms.join(p('c'), code);
    expect(() => rooms.join(p('d'), code)).toThrow('Oda dolu');
    expect(() => rooms.updateSettings('b', { n: 2 })).toThrow('oda sahibi');
    expect(() => rooms.updateSettings('a', { n: 'x' })).toThrow('Ayarlar geçersiz');
    rooms.updateSettings('a', { n: 5 });
    expect(last().settings).toEqual({ n: 5 });
  });

  it('hands the host role over when the host drops, and lets them back in', () => {
    const { code } = rooms.create(p('a'), 'dummy');
    rooms.join(p('b'), code);
    rooms.disconnected('a');
    expect(last().hostId).toBe('b');
    expect(last().players.find((x) => x.id === 'a')!.connected).toBe(false);
    rooms.connected(p('a'));
    expect(last().players.find((x) => x.id === 'a')!.connected).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(last().players).toHaveLength(2);
  });

  it('removes lobby players after the grace period and closes empty rooms', () => {
    const { code } = rooms.create(p('a'), 'dummy');
    rooms.join(p('b'), code);
    rooms.disconnected('b');
    vi.advanceTimersByTime(1001);
    expect(last().players.map((x) => x.id)).toEqual(['a']);
    rooms.disconnected('a');
    vi.advanceTimersByTime(1001);
    expect(rooms.peek(code)).toBeNull();
  });

  it('kicks players and tells them why', () => {
    const { code } = rooms.create(p('a'), 'dummy');
    rooms.join(p('b'), code);
    rooms.kick('a', 'b');
    expect(closed).toContainEqual({ ids: ['b'], reason: 'Oda sahibi seni odadan çıkardı.' });
    expect(rooms.roomOf('b')).toBeNull();
  });

  it('keeps disconnected players during a game and records results on finish', async () => {
    const { code } = rooms.create(p('a'), 'dummy');
    await expect(rooms.start('a')).rejects.toThrow('en az 2 oyuncu');
    rooms.join(p('b'), code);
    await rooms.start('a');
    expect(last().phase).toBe('playing');
    rooms.disconnected('b');
    vi.advanceTimersByTime(5000);
    expect(last().players).toHaveLength(2);
    await rooms.action('a', { win: true });
    expect(last().phase).toBe('lobby');
    expect(last().lastStandings!.map((s) => [s.playerId, s.rank])).toEqual([['a', 1], ['b', 2]]);
    expect(saved).toHaveLength(1);
    await expect(rooms.action('a', { win: true })).rejects.toThrow('oyun yok');
  });

  it('moves a player out of their old room when they join another', () => {
    const r1 = rooms.create(p('a'), 'dummy');
    rooms.join(p('b'), r1.code);
    const r2 = rooms.create(p('c'), 'dummy');
    rooms.join(p('b'), r2.code);
    expect(rooms.stateOf(r1.code)!.players.map((x) => x.id)).toEqual(['a']);
    expect(rooms.roomOf('b')).toBe(r2.code);
  });
});
