import type Database from 'better-sqlite3';
import type { ServerGame } from '@songie/game-kit/server';
import type { SecretHitlerAction, SecretHitlerSettings } from '../shared/index.js';
import { createSecretHitlerGame, type SecretHitlerState, type SecretHitlerTiming } from './game.js';

export { createSecretHitlerGame };
export type { SecretHitlerState, SecretHitlerTiming };

export function secretHitlerServer(deps: {
  db: Database.Database;
  timing?: Partial<SecretHitlerTiming>;
  random?: () => number;
}): ServerGame<SecretHitlerSettings, SecretHitlerState, SecretHitlerAction> {
  return createSecretHitlerGame({ timing: deps.timing, random: deps.random });
}
