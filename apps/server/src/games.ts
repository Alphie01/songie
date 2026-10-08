import type { AnyServerGame } from '@songie/game-kit/server';
import { songGuessServer } from '@songie/song-guess/server';
import { tabooServer } from '@songie/taboo/server';
import type { DB } from './db.js';

export interface GameDeps {
  db: DB;
  dataDir: string;
  ffmpegPath: string;
  fetchImpl?: typeof fetch;
  background?: boolean;
  /** Oyun kimliğine göre ek ayar (testlerde kısa süreler için). */
  overrides?: Record<string, Record<string, unknown>>;
}

/** Yeni oyun eklemek için buraya bir satır ekle. */
export function loadGames(deps: GameDeps): Map<string, AnyServerGame> {
  const games: AnyServerGame[] = [
    songGuessServer({ ...deps, ...deps.overrides?.['song-guess'] }),
    tabooServer({ db: deps.db, ...deps.overrides?.['taboo'] }),
  ];
  return new Map(games.map((g) => [g.id, g]));
}
