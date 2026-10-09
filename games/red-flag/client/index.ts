import type { ClientGame } from '@songie/game-kit/client';
import { GAME_ID } from '../shared/index.js';
import { guide } from './guide';
import { s } from './strings';

export const redFlagClient: ClientGame = {
  id: GAME_ID,
  name: s.name,
  pitch: s.pitch,
  guide,
  icon: 'flag',
  minPlayers: 2,
  maxPlayers: 16,
  load: () => import('./module').then((m) => m.default),
};
