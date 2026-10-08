import type { ClientGame } from '@songie/game-kit/client';
import { GAME_ID } from '../shared/index.js';
import { s } from './strings';

export const frequencyClient: ClientGame = {
  id: GAME_ID,
  name: s.name,
  pitch: s.pitch,
  icon: 'volume',
  minPlayers: 2,
  maxPlayers: 16,
  load: () => import('./module').then((m) => m.default),
};
