import type Database from 'better-sqlite3';
import type { ServerGame } from '@songie/game-kit/server';
import type { WerewolfAction, WerewolfSettings } from '../shared/index.js';
import { createWerewolfGame, type WerewolfState, type WerewolfTiming } from './game.js';

export { createWerewolfGame };
export type { WerewolfState, WerewolfTiming };

export function werewolfServer(deps: {
  db: Database.Database;
  timing?: Partial<WerewolfTiming>;
  random?: () => number;
}): ServerGame<WerewolfSettings, WerewolfState, WerewolfAction> {
  return createWerewolfGame({ timing: deps.timing, random: deps.random });
}
