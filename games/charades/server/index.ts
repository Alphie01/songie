import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customTitleSchema, type CharadesAction, type CharadesSettings } from '../shared/index.js';
import { createCharadesGame, type CharadesState, type CharadesTiming } from './game.js';
import { TitleBank } from './titles.js';

export { TitleBank, createCharadesGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function charadesServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<CharadesTiming>;
}): ServerGame<CharadesSettings, CharadesState, CharadesAction> & { bank: TitleBank } {
  const bank = new TitleBank(deps.db, deps.contentDir);
  const game = createCharadesGame({ bank, timing: deps.timing });
  return {
    ...game,
    bank,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: bank.categories() }));

      // Arkadaş başlığı ekle. Ekleyen kişi başlığı bilir; bu yüzden başlıklar hiçbir uçtan listelenmez.
      app.post('/titles', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        const parsed = customTitleSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Başlık geçersiz.' });
        const card = bank.addCustom(parsed.data, req.profile.id);
        return { ok: true, id: card.id };
      });
    },
  };
}
