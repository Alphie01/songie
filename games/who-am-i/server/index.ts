import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customCardSchema, type WhoAmIAction, type WhoAmISettings } from '../shared/index.js';
import { IdentityPool, matchesGuess } from './content.js';
import { createWhoAmIGame, type WhoAmIState, type WhoAmITiming } from './game.js';

export { IdentityPool, createWhoAmIGame, matchesGuess };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function whoAmIServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<WhoAmITiming>;
}): ServerGame<WhoAmISettings, WhoAmIState, WhoAmIAction> & { pool: IdentityPool } {
  const pool = new IdentityPool(deps.db, deps.contentDir);
  const game = createWhoAmIGame({ pool, timing: deps.timing });
  return {
    ...game,
    pool,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: pool.categories() }));

      // Kimlik ekle. Ekleyen kişi kimliği bilir; bu yüzden eklenen kartlar hiçbir uçtan listelenmez.
      app.post('/cards', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı. Sayfayı yenileyip tekrar dene.' });
        const parsed = customCardSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Kimlik geçersiz.' });
        const card = pool.addCustom(parsed.data, req.profile.id);
        return { ok: true, id: card.id };
      });
    },
  };
}
