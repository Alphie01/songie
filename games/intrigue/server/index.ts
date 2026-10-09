import type Database from 'better-sqlite3';
import type { ServerGame } from '@songie/game-kit/server';
import type { IntrigueAction, IntrigueSettings } from '../shared/index.js';
import { createIntrigueGame, deal, seededRng, shuffleWith, type IntrigueState, type IntrigueTiming, type Rng } from './game.js';

export { createIntrigueGame, deal, seededRng, shuffleWith };
export type { IntrigueState, IntrigueTiming, Rng };

/**
 * Entrika sunucusu. `random` dağıtım, ilk oyuncu, deste karıştırma ve otomatik seçimler için
 * rastgelelik kaynağıdır (testlerde `seededRng` ile deterministik).
 */
export function intrigueServer(
  deps: { db?: Database.Database; timing?: Partial<IntrigueTiming>; random?: Rng } = {},
): ServerGame<IntrigueSettings, IntrigueState, IntrigueAction> {
  return createIntrigueGame({ random: deps.random, timing: deps.timing });
}
