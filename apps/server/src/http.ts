import fs from 'node:fs';
import path from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { profileInputSchema, roomCodeSchema, type Profile } from '@songie/shared';
import type { AnyServerGame } from '@songie/game-kit/server';
import type { PlayerStore } from './players.js';
import type { RoomManager } from './rooms/RoomManager.js';

export function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

declare module 'fastify' {
  interface FastifyRequest {
    profile: Profile | null;
  }
}

export async function registerHttp(
  app: FastifyInstance,
  deps: { players: PlayerStore; rooms: RoomManager; games: Map<string, AnyServerGame>; webDist: string },
): Promise<void> {
  const { players, rooms, games } = deps;

  app.decorateRequest('profile', null);
  app.addHook('preHandler', async (req) => {
    if (req.url.startsWith('/api/')) req.profile = players.byToken(bearer(req));
  });

  app.get('/health', async () => ({ ok: true }));

  app.post('/api/profile', async (req, reply) => {
    const parsed = profileInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message });
    return players.create(parsed.data);
  });

  app.get('/api/me', async (req, reply) => {
    if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
    return { profile: req.profile, stats: players.stats(req.profile.id), room: rooms.roomOf(req.profile.id) };
  });

  app.put('/api/me', async (req, reply) => {
    if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
    const parsed = profileInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message });
    return { profile: players.update(req.profile.id, parsed.data) };
  });

  app.get<{ Params: { code: string } }>('/api/rooms/:code', async (req, reply) => {
    const code = roomCodeSchema.safeParse(req.params.code);
    const room = code.success ? rooms.peek(code.data) : null;
    if (!room) return reply.code(404).send({ error: 'Bu kodla açık bir oda yok.' });
    return room;
  });

  for (const game of games.values()) {
    if (game.routes) await app.register(async (scope) => game.routes!(scope), { prefix: `/api/games/${game.id}` });
  }

  if (fs.existsSync(deps.webDist)) {
    await app.register(fastifyStatic, {
      root: deps.webDist,
      // Hash'li dosyalar uzun süre, index.html hiç önbelleğe alınmaz.
      setHeaders(res, filePath) {
        res.setHeader('cache-control', filePath.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
      cacheControl: false,
    });
    const indexPath = path.join(deps.webDist, 'index.html');
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Bulunamadı.' });
      // Her istekte okunur: yeni build sunucu yeniden başlamadan yayına girer.
      return reply.type('text/html').header('cache-control', 'no-cache').send(fs.readFileSync(indexPath));
    });
  }
}
