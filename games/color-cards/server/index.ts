import type Database from 'better-sqlite3';
import type { ServerGame } from '@songie/game-kit/server';
import type { ColorCardsAction, ColorCardsSettings } from '../shared/index.js';
import {
  buildDeck,
  createColorCardsGame,
  deal,
  handPoints,
  seededRng,
  shuffleWith,
  type ColorCardsState,
  type ColorCardsTiming,
  type Rng,
} from './game.js';

export { buildDeck, createColorCardsGame, deal, handPoints, seededRng, shuffleWith };
export type { ColorCardsState, ColorCardsTiming, Rng };

/**
 * Renk Renk sunucusu. `random` karıştırma ve dağıtıcı seçimi için rastgelelik kaynağıdır
 * (testlerde `seededRng` ile deterministik).
 */
export function colorCardsServer(
  deps: { db?: Database.Database; timing?: Partial<ColorCardsTiming>; random?: Rng } = {},
): ServerGame<ColorCardsSettings, ColorCardsState, ColorCardsAction> {
  return createColorCardsGame({ random: deps.random, timing: deps.timing });
}
