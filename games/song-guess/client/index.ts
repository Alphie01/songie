import type { ClientGame } from '@songie/game-kit/client';
import { GAME_ID, soloSettings } from '../shared/index.js';
import { s } from './strings';

export const songGuessClient: ClientGame = {
  id: GAME_ID,
  name: s.name,
  pitch: s.pitch,
  minPlayers: 1,
  maxPlayers: 12,
  soloSettings,
  load: () => import('./module').then((m) => m.default),
};
