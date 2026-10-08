import type { ClientGame } from '@songie/game-kit/client';
import { GAME_ID, MAX_PLAYERS, MIN_PLAYERS } from '../shared/index.js';
import { s } from './strings';

export const mostLikelyClient: ClientGame = {
  id: GAME_ID,
  name: s.name,
  pitch: s.pitch,
  icon: 'user',
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  load: () => import('./module').then((m) => m.default),
};
