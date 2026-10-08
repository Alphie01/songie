import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customStatementSchema, type NeverAction, type NeverSettings } from '../shared/index.js';
import { createNeverGame, type NeverState, type NeverTiming } from './game.js';
import { StatementPool } from './statements.js';

export { StatementPool, createNeverGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function neverServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<NeverTiming>;
}): ServerGame<NeverSettings, NeverState, NeverAction> & { pool: StatementPool } {
  const pool = new StatementPool(deps.db, deps.contentDir);
  const game = createNeverGame({ pool, timing: deps.timing });
  return {
    ...game,
    pool,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: pool.categories() }));

      // Arkadaş cümlesi ekle: "Ben hiç" sonrası kısım yazılır, sunucu cümleyi tamamlar.
      app.post('/statements', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı. Sayfayı yenileyip tekrar dene.' });
        const parsed = customStatementSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Cümle geçersiz.' });
        const statement = pool.addCustom(parsed.data.text, req.profile.id);
        return { ok: true, id: statement.id, text: statement.text };
      });
    },
  };
}
