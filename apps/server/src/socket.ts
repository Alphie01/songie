import type { EventEmitter } from 'node:events';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import {
  clientEvents,
  type ClientEventName,
  type ClientToServer,
  type Profile,
  type ServerToClient,
} from '@songie/shared';
import type { PlayerStore } from './players.js';
import { UserFacingError } from '@songie/game-kit/server';
import type { RoomManager, RoomTransport } from './rooms/RoomManager.js';

interface SocketData {
  profile: Profile;
}

export type IO = Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>;

const roomChannel = (code: string) => `room:${code}`;
const playerChannel = (id: string) => `player:${id}`;

export function createIO(http: HttpServer, allowedOrigins: string[]): IO {
  return new Server(http, {
    cors: allowedOrigins.length ? { origin: allowedOrigins } : undefined,
    pingInterval: 10_000,
    pingTimeout: 8_000,
  });
}

export function socketTransport(io: IO): RoomTransport {
  return {
    roomState: (code, state) => {
      // Oyuncunun socket'leri odanın kanalına burada eşitlenir.
      for (const p of state.players) io.in(playerChannel(p.id)).socketsJoin(roomChannel(code));
      io.to(roomChannel(code)).emit('room:state', state);
    },
    roomClosed: (code, ids, reason) => {
      for (const id of ids) {
        io.to(playerChannel(id)).emit('room:closed', reason);
        io.in(playerChannel(id)).socketsLeave(roomChannel(code));
      }
    },
    chat: (code, msg) => io.to(roomChannel(code)).emit('room:chat', msg),
    react: (code, playerId, emoji) => io.to(roomChannel(code)).emit('room:react', { playerId, emoji }),
    gameView: (id, view) => io.to(playerChannel(id)).emit('game:view', view),
  };
}

/** Basit token kovası: saniyede `rate` olay, en fazla `burst`. */
function limiter(rate: number, burst: number) {
  let tokens = burst;
  let last = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(burst, tokens + ((now - last) / 1000) * rate);
    last = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

export function bindSockets(io: IO, players: PlayerStore, rooms: RoomManager): void {
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    const profile = players.byToken(token);
    if (!profile) return next(new Error('unauthorized'));
    socket.data.profile = profile;
    next();
  });

  io.on('connection', (socket) => {
    const me = socket.data.profile;
    socket.join(playerChannel(me.id));
    const code = rooms.roomOf(me.id);
    if (code) socket.join(roomChannel(code));
    rooms.connected(me);
    rooms.resync(me.id);

    const allow = limiter(15, 30);

    const handle = <E extends ClientEventName>(event: E, fn: (payload: never) => unknown) => {
      (socket as unknown as EventEmitter).on(event, async (raw: unknown, ack?: (res: unknown) => void) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (!allow()) return reply({ ok: false, error: 'Çok hızlı gidiyorsun, bir saniye bekle.' });
        const parsed = clientEvents[event].safeParse(raw ?? {});
        if (!parsed.success) return reply({ ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz istek.' });
        try {
          const result = await fn(parsed.data as never);
          reply({ ok: true, ...(result && typeof result === 'object' ? result : {}) });
        } catch (err) {
          if (!(err instanceof UserFacingError)) console.error(`[socket ${event}]`, err);
          reply({ ok: false, error: err instanceof UserFacingError ? err.message : 'Bir şeyler ters gitti. Tekrar dene.' });
        }
      });
    };

    handle('room:create', (p: { gameId: string; settings?: unknown }) => {
      const state = rooms.create(me, p.gameId, p.settings);
      socket.join(roomChannel(state.code));
      return { code: state.code };
    });
    handle('room:join', (p: { code: string }) => {
      const state = rooms.join(me, p.code);
      return { code: state.code };
    });
    handle('room:leave', () => {
      const c = rooms.roomOf(me.id);
      rooms.leave(me.id);
      if (c) io.in(playerChannel(me.id)).socketsLeave(roomChannel(c));
    });
    handle('room:settings', (p: { settings: unknown }) => rooms.updateSettings(me.id, p.settings));
    handle('room:ready', (p: { ready: boolean }) => rooms.setReady(me.id, p.ready));
    handle('room:start', () => rooms.start(me.id));
    handle('room:lobby', () => rooms.backToLobby(me.id));
    handle('room:kick', (p: { playerId: string }) => rooms.kick(me.id, p.playerId));
    handle('room:chat', (p: { text: string }) => rooms.chat(me.id, p.text));
    handle('room:react', (p: { emoji: string }) => rooms.react(me.id, p.emoji));
    handle('game:action', async (p: { action: unknown }) => {
      const res = await rooms.action(me.id, p.action);
      return res && typeof res === 'object' ? res : {};
    });

    socket.on('disconnect', () => rooms.disconnected(me.id));
  });
}
