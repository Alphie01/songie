import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customPromptSchema, type MostLikelyAction, type MostLikelySettings } from '../shared/index.js';
import { createMostLikelyGame, type MostLikelyState, type MostLikelyTiming } from './game.js';
import { PromptPool } from './prompts.js';

export { PromptPool, createMostLikelyGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function mostLikelyServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<MostLikelyTiming>;
}): ServerGame<MostLikelySettings, MostLikelyState, MostLikelyAction> & { pool: PromptPool } {
  const pool = new PromptPool(deps.db, deps.contentDir);
  const game = createMostLikelyGame({ pool, timing: deps.timing });
  return {
    ...game,
    pool,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: pool.categories() }));

      app.post('/prompts', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı. Sayfayı yenileyip tekrar dene.' });
        const parsed = customPromptSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Soru geçersiz.' });
        const prompt = pool.add(parsed.data.text, req.profile.id);
        return { ok: true, id: prompt.id, text: prompt.text };
      });
    },
  };
}
