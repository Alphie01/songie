import type { AnyServerGame } from '@songie/game-kit/server';
import { songGuessServer } from '@songie/song-guess/server';
import { tabooServer } from '@songie/taboo/server';
import { werewolfServer } from '@songie/werewolf/server';
import { intrigueServer } from '@songie/intrigue/server';
import { colorCardsServer } from '@songie/color-cards/server';
import { agentsServer } from '@songie/agents/server';
import { frequencyServer } from '@songie/frequency/server';
import { whoAmIServer } from '@songie/who-am-i/server';
import { kittenServer } from '@songie/kitten/server';
import { neverServer } from '@songie/never/server';
import { bottleServer } from '@songie/bottle/server';
import { mostLikelyServer } from '@songie/most-likely/server';
import { secretHitlerServer } from '@songie/secret-hitler/server';
import { charadesServer } from '@songie/charades/server';
import { paranoiaServer } from '@songie/paranoia/server';
import { confessionsServer } from '@songie/confessions/server';
import { fiveSecondsServer } from '@songie/five-seconds/server';
import { redFlagServer } from '@songie/red-flag/server';
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
    werewolfServer({ db: deps.db, ...deps.overrides?.['werewolf'] }),
    intrigueServer({ db: deps.db, ...deps.overrides?.['intrigue'] }),
    colorCardsServer({ db: deps.db, ...deps.overrides?.['color-cards'] }),
    kittenServer({ db: deps.db, ...deps.overrides?.['kitten'] }),
    agentsServer({ db: deps.db, ...deps.overrides?.['agents'] }),
    frequencyServer({ db: deps.db, ...deps.overrides?.['frequency'] }),
    whoAmIServer({ db: deps.db, ...deps.overrides?.['who-am-i'] }),
    neverServer({ db: deps.db, ...deps.overrides?.['never'] }),
    bottleServer({ db: deps.db, ...deps.overrides?.['bottle'] }),
    mostLikelyServer({ db: deps.db, ...deps.overrides?.['most-likely'] }),
    secretHitlerServer({ db: deps.db, ...deps.overrides?.['secret-hitler'] }),
    charadesServer({ db: deps.db, ...deps.overrides?.['charades'] }),
    paranoiaServer({ db: deps.db, ...deps.overrides?.['paranoia'] }),
    confessionsServer({ db: deps.db, ...deps.overrides?.['confessions'] }),
    fiveSecondsServer({ db: deps.db, ...deps.overrides?.['five-seconds'] }),
    redFlagServer({ db: deps.db, ...deps.overrides?.['red-flag'] }),
  ];
  return new Map(games.map((g) => [g.id, g]));
}
