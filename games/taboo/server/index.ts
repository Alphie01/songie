import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customCardSchema, type TabooAction, type TabooSettings } from '../shared/index.js';
import { Deck } from './deck.js';
import { createTabooGame, type TabooState, type TabooTiming } from './game.js';

export { Deck, createTabooGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function tabooServer(deps: {
  db: Database.Database;
  deckDir?: string;
  timing?: Partial<TabooTiming>;
}): ServerGame<TabooSettings, TabooState, TabooAction> & { deck: Deck } {
  const deck = new Deck(deps.db, deps.deckDir);
  const game = createTabooGame({ deck, timing: deps.timing });
  return {
    ...game,
    deck,
    routes(app: FastifyInstance) {
      app.get('/categories', async () => ({ categories: deck.categories() }));

      // Arkadaş kartı ekle. Kartı ekleyen kişi kelimeyi bilir; bu yüzden kart listesi hiçbir uçtan dönmez.
      app.post('/cards', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        const parsed = customCardSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Kart geçersiz.' });
        const card = deck.addCustom(parsed.data, req.profile.id);
        return { ok: true, id: card.id };
      });
    },
  };
}
