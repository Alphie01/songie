import type { ClientGame } from '@songie/game-kit/client';
import { songGuessClient } from '@songie/song-guess/client';
import { tabooClient } from '@songie/taboo/client';

/** Yeni oyun eklemek için buraya bir satır ekle. */
export const GAMES: ClientGame[] = [songGuessClient, tabooClient];

export function findGame(id: string): ClientGame | undefined {
  return GAMES.find((g) => g.id === id);
}
