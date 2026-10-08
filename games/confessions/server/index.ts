import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customPromptSchema, type ConfessionsAction, type ConfessionsSettings } from '../shared/index.js';
import { createConfessionsGame, type ConfessionsState, type ConfessionsTiming } from './game.js';
import { Prompts } from './prompts.js';

export { Prompts, createConfessionsGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function confessionsServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<ConfessionsTiming>;
}): ServerGame<ConfessionsSettings, ConfessionsState, ConfessionsAction> & { prompts: Prompts } {
  const prompts = new Prompts(deps.db, deps.contentDir);
  const game = createConfessionsGame({ prompts, timing: deps.timing });
  return {
    ...game,
    prompts,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: prompts.categories() }));

      // Arkadaş konusu ekle. Konular oyunda sürpriz olsun diye listelenmez.
      app.post('/prompts', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı. Sayfayı yenileyip tekrar dene.' });
        const parsed = customPromptSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Konu geçersiz.' });
        const text = parsed.data.text.replace(/\s+/g, ' ');
        if (!prompts.add(text, req.profile.id)) return reply.code(409).send({ error: 'Bu konu zaten var. Başka bir konu yaz.' });
        return { ok: true };
      });
    },
  };
}
