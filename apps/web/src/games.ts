import type { ClientGame } from '@songie/game-kit/client';
import { songGuessClient } from '@songie/song-guess/client';
import { tabooClient } from '@songie/taboo/client';
import { werewolfClient } from '@songie/werewolf/client';
import { detectiveClient } from '@songie/detective/client';
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

export type GameCategory = 'takim' | 'parti' | 'gizli' | 'kart' | 'muzik' | 'dedektif';

/** Ana sayfadaki filtre çipleri; renkler kartlara da geçer. */
export const CATEGORIES: { id: GameCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'takim', label: 'Takım' },
  { id: 'parti', label: 'Parti & İtiraf' },
  { id: 'gizli', label: 'Gizli Roller' },
  { id: 'kart', label: 'Kart' },
  { id: 'muzik', label: 'Müzik' },
  { id: 'dedektif', label: 'Dedektif' },
];

export interface WebGame extends ClientGame {
  category: GameCategory;
  /** Kartlardaki iki harflik rozet. */
  mono: string;
  /** İki takımla oynanıyorsa kartta "· iki takım" yazar. */
  teams?: boolean;
}

const web = (game: ClientGame, category: GameCategory, mono: string, teams = false): WebGame => ({ ...game, category, mono, teams });

/** Yeni oyun eklemek için buraya bir satır ekle. */
export const GAMES: WebGame[] = [
  web(songGuessClient, 'muzik', 'ŞB'),
  web(tabooClient, 'takim', 'TB', true),
  web(werewolfClient, 'gizli', 'KA'),
  web(detectiveClient, 'dedektif', 'DM'),
  web(intrigueClient, 'gizli', 'EN'),
  web(colorCardsClient, 'kart', 'RR'),
  web(neverClient, 'parti', 'BH'),
  web(bottleClient, 'parti', 'ŞÇ'),
  web(mostLikelyClient, 'parti', 'AE'),
  web(secretHitlerClient, 'gizli', 'SH'),
  web(charadesClient, 'takim', 'SS', true),
  web(paranoiaClient, 'parti', 'GE'),
  web(confessionsClient, 'parti', 'Gİ'),
  web(fiveSecondsClient, 'takim', '5S'),
  web(redFlagClient, 'parti', 'RF'),
  web(kittenClient, 'kart', 'BK'),
  web(agentsClient, 'takim', 'AJ', true),
  web(frequencyClient, 'takim', 'FR'),
  web(whoAmIClient, 'takim', 'KB'),
];

export function findGame(id: string): WebGame | undefined {
  return GAMES.find((g) => g.id === id);
}

/** "4–12 · iki takım", "1–12 oyuncu" */
export function playersLabel(g: WebGame): string {
  const range = g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers}–${g.maxPlayers}`;
  return g.teams ? `${range} · iki takım` : `${range} oyuncu`;
}
