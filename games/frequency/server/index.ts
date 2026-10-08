import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import { customCardSchema, type FrequencyAction, type FrequencySettings } from '../shared/index.js';
import { Deck } from './deck.js';
import { createFrequencyGame, type FrequencyState, type FrequencyTiming } from './game.js';

export { Deck, createFrequencyGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

export function frequencyServer(deps: {
  db: Database.Database;
  contentDir?: string;
  timing?: Partial<FrequencyTiming>;
  random?: () => number;
}): ServerGame<FrequencySettings, FrequencyState, FrequencyAction> & { deck: Deck } {
  const deck = new Deck(deps.db, deps.contentDir);
  const game = createFrequencyGame({ deck, timing: deps.timing, random: deps.random });
  return {
    ...game,
    deck,
    routes(app: FastifyInstance) {
      // Arkadaş kartı ekle. Kartlar hiçbir uçtan listelenmez.
      app.post('/cards', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        const parsed = customCardSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Kart geçersiz.' });
        if (parsed.data.left.toLocaleLowerCase('tr') === parsed.data.right.toLocaleLowerCase('tr')) {
          return reply.code(400).send({ error: 'İki uç birbirinin aynısı olamaz. Zıt iki kavram yaz.' });
        }
        const card = deck.addCustom(parsed.data, req.profile.id);
        return { ok: true, id: card.id };
      });
    },
  };
}
