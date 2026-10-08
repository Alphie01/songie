import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customPromptSchema, type FiveSecondsAction, type FiveSecondsSettings } from '../shared/index.js';
import { createFiveSecondsGame, type FiveSecondsState, type FiveSecondsTiming } from './game.js';
import { PromptBank } from './prompts.js';

export { PromptBank, createFiveSecondsGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function fiveSecondsServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<FiveSecondsTiming>;
}): ServerGame<FiveSecondsSettings, FiveSecondsState, FiveSecondsAction> & { bank: PromptBank } {
  const bank = new PromptBank(deps.db, deps.contentDir);
  const game = createFiveSecondsGame({ bank, timing: deps.timing });
  return {
    ...game,
    bank,
    routes(app: FastifyInstance) {
      // Yalnızca kategori adları ve sayıları; görev metinleri hiçbir uçtan dönmez.
      app.get('/categories', async () => ({ categories: bank.categories() }));

      app.post('/prompts', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı. Sayfayı yenileyip tekrar dene.' });
        const parsed = customPromptSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Görev geçersiz.' });
        const prompt = bank.addCustom(parsed.data, req.profile.id);
        return { ok: true, id: prompt.id };
      });
    },
  };
}
