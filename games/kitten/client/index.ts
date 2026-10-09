import type { ClientGame } from '@songie/game-kit/client';
import { GAME_ID, MAX_PLAYERS, MIN_PLAYERS } from '../shared/index.js';
import { guide } from './guide';
import { s } from './strings';

export const kittenClient: ClientGame = {
  id: GAME_ID,
  name: s.name,
  pitch: s.pitch,
  guide,
  icon: 'cards',
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  load: () => import('./module').then((m) => m.default),
};
