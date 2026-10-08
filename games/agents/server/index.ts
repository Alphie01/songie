import type Database from 'better-sqlite3';
import type { ServerGame } from '@songie/game-kit/server';
import type { AgentsAction, AgentsSettings } from '../shared/index.js';
import { createAgentsGame, type AgentsState, type AgentsTiming } from './game.js';
import { loadPacks, type WordPacks } from './words.js';

export { createAgentsGame, loadPacks };
export type { AgentsState, AgentsTiming, WordPacks };

/** Ajanlar: iki takım, 5×5 kelime tablosu, yalnızca liderlerin gördüğü gizli anahtar. */
export function agentsServer(deps: {
  db?: Database.Database;
  timing?: Partial<AgentsTiming>;
  /** Testler için: kelime paketleri ve rastgelelik. */
  packs?: WordPacks;
  random?: () => number;
}): ServerGame<AgentsSettings, AgentsState, AgentsAction> {
  return createAgentsGame({ packs: deps.packs ?? loadPacks(), timing: deps.timing, random: deps.random });
}
