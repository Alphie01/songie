import type Database from 'better-sqlite3';
import type { ServerGame } from '@songie/game-kit/server';
import type { KittenAction, KittenSettings } from '../shared/index.js';
import { createKittenGame, deal, seededRng, shuffleWith, type KittenState, type KittenTiming, type Rng } from './game.js';

export { createKittenGame, deal, seededRng, shuffleWith };
export type { KittenState, KittenTiming, Rng };

/**
 * Bomba Kedi sunucusu. `random` deste karıştırma, ilk oyuncu ve otomatik seçimler için
 * rastgelelik kaynağıdır (testlerde `seededRng` ile deterministik).
 */
export function kittenServer(deps: {
  db?: Database.Database;
  timing?: Partial<KittenTiming>;
  random?: Rng;
} = {}): ServerGame<KittenSettings, KittenState, KittenAction> {
  return createKittenGame({ random: deps.random, timing: deps.timing });
}
