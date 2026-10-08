import type { ClientGame } from '@songie/game-kit/client';
import { songGuessClient } from '@songie/song-guess/client';

/** Yeni oyun eklemek için buraya bir satır ekle. */
export const GAMES: ClientGame[] = [songGuessClient];

export function findGame(id: string): ClientGame | undefined {
  return GAMES.find((g) => g.id === id);
}
