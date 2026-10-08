import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customItemSchema, type RedFlagAction, type RedFlagSettings } from '../shared/index.js';
import { createRedFlagGame, type RedFlagState, type RedFlagTiming } from './game.js';
import { Pool } from './pool.js';

export { Pool, createRedFlagGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function redFlagServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<RedFlagTiming>;
}): ServerGame<RedFlagSettings, RedFlagState, RedFlagAction> & { pool: Pool } {
  const pool = new Pool(deps.db, deps.contentDir);
  const game = createRedFlagGame({ pool, timing: deps.timing });
  return {
    ...game,
    pool,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: pool.categories() }));

      // Oyuncu kendi durumunu ekler. Liste hiçbir uçtan dönmez; durumlar oyunda sürpriz olarak çıkar.
      app.post('/items', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı. Sayfayı yenileyip tekrar dene.' });
        const parsed = customItemSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Durum geçersiz.' });
        const item = pool.addCustom(parsed.data, req.profile.id);
        return { ok: true, id: item.id };
      });
    },
  };
}
