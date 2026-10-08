import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customPromptSchema, type BottleAction, type BottleSettings } from '../shared/index.js';
import { createBottleGame, type BottleState, type BottleTiming } from './game.js';
import { PromptBank } from './prompts.js';

export { PromptBank, createBottleGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function bottleServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<BottleTiming>;
  random?: () => number;
}): ServerGame<BottleSettings, BottleState, BottleAction> & { bank: PromptBank } {
  const bank = new PromptBank(deps.db, deps.contentDir);
  const game = createBottleGame({ bank, timing: deps.timing, random: deps.random });
  return {
    ...game,
    bank,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: bank.categories() }));

      // Oyuncu kendi doğruluk sorusunu ya da cesaret görevini ekler ("Oyuncuların ekledikleri" kategorisi).
      app.post('/prompts', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        const parsed = customPromptSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Soru geçersiz.' });
        const prompt = bank.addCustom(parsed.data, req.profile.id);
        return { ok: true, id: prompt.id };
      });
    },
  };
}
