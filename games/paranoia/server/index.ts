import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customQuestionSchema, type ParanoiaAction, type ParanoiaSettings } from '../shared/index.js';
import { createParanoiaGame, type ParanoiaState, type ParanoiaTiming } from './game.js';
import { QuestionBank } from './questions.js';

export { QuestionBank, createParanoiaGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function paranoiaServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<ParanoiaTiming>;
}): ServerGame<ParanoiaSettings, ParanoiaState, ParanoiaAction> & { bank: QuestionBank } {
  const bank = new QuestionBank(deps.db, deps.contentDir);
  const game = createParanoiaGame({ bank, timing: deps.timing });
  return {
    ...game,
    bank,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: bank.categories() }));

      // Oyuncu sorusu ekle. Sorular hiçbir uçtan listelenmez; oyunda sürpriz olarak çıkar.
      app.post('/questions', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı. Sayfayı yenileyip tekrar dene.' });
        const parsed = customQuestionSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Soru geçersiz.' });
        const q = bank.add(parsed.data.text, req.profile.id);
        return { ok: true, id: q.id };
      });
    },
  };
}
