import type { ClientGame } from '@songie/game-kit/client';
import { songGuessClient } from '@songie/song-guess/client';
import { tabooClient } from '@songie/taboo/client';
import { werewolfClient } from '@songie/werewolf/client';
import { intrigueClient } from '@songie/intrigue/client';
import { colorCardsClient } from '@songie/color-cards/client';
import { agentsClient } from '@songie/agents/client';
import { frequencyClient } from '@songie/frequency/client';
import { whoAmIClient } from '@songie/who-am-i/client';
import { kittenClient } from '@songie/kitten/client';
import { neverClient } from '@songie/never/client';
import { bottleClient } from '@songie/bottle/client';
import { mostLikelyClient } from '@songie/most-likely/client';
import { secretHitlerClient } from '@songie/secret-hitler/client';
import { charadesClient } from '@songie/charades/client';
import { paranoiaClient } from '@songie/paranoia/client';
import { confessionsClient } from '@songie/confessions/client';
import { fiveSecondsClient } from '@songie/five-seconds/client';
import { redFlagClient } from '@songie/red-flag/client';

/** Yeni oyun eklemek için buraya bir satır ekle. */
export const GAMES: ClientGame[] = [
  songGuessClient,
  tabooClient,
  werewolfClient,
  intrigueClient,
  colorCardsClient,
  neverClient,
  bottleClient,
  mostLikelyClient,
  secretHitlerClient,
  charadesClient,
  paranoiaClient,
  confessionsClient,
  fiveSecondsClient,
  redFlagClient,
  kittenClient,
  agentsClient,
  frequencyClient,
  whoAmIClient,
];

export function findGame(id: string): ClientGame | undefined {
  return GAMES.find((g) => g.id === id);
}
