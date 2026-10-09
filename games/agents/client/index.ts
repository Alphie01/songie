import type { ClientGame } from '@songie/game-kit/client';
import { GAME_ID } from '../shared/index.js';
import { guide } from './guide';
import { s } from './strings';

export const agentsClient: ClientGame = {
  id: GAME_ID,
  name: s.name,
  pitch: s.pitch,
  guide,
  icon: 'cards',
  minPlayers: 4,
  maxPlayers: 16,
  load: () => import('./module').then((m) => m.default),
};
