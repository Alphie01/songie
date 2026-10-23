import { z } from 'zod';
import type { ScoreRow } from '../brand/app/SongPlayScreen';
import type { AppTheme } from '../themes/types';

/** Names `pnpm reel` rotates through when no --name is given, so it is not always Mert. */
export const FRIEND_NAMES = ['Mert', 'Deniz', 'Ece', 'Kaan', 'Zeynep', 'Can', 'Elif', 'Burak', 'Selin', 'Emre'] as const;

/** The friend who solves it; short enough for the stickers. */
export const solverSchema = z
  .string()
  .refine((s) => s.trim().length > 0, { message: 'solver must not be empty' })
  .refine((s) => s.trim().length <= 12, { message: 'solver must be 12 characters or fewer' });

export type Crew = { solver: string; others: [string, string, string] };

/** The solver plus three other friends in the room (never "Sen", never the solver twice). */
export function crew(solver: string): Crew {
  const others = FRIEND_NAMES.filter((n) => n.toLocaleLowerCase('tr-TR') !== solver.trim().toLocaleLowerCase('tr-TR'));
  return { solver: solver.trim(), others: [others[0]!, others[1]!, others[2]!] };
}

/** Turkish "de/da" after a name (vowel harmony on the last vowel): "Mert de", "Can da". */
export function deDa(name: string): string {
  const v = [...name.toLocaleLowerCase('tr-TR')].reverse().find((ch) => 'aıoueiöü'.includes(ch));
  return v && 'aıou'.includes(v) ? 'da' : 'de';
}

/** Dative with apostrophe: "Zeynep'e", "Can'a", "Ece'ye", "Kaan'a". */
export function dative(name: string): string {
  const n = name.trim();
  const v = [...n.toLocaleLowerCase('tr-TR')].reverse().find((ch) => 'aıoueiöü'.includes(ch));
  const e = v && 'aıou'.includes(v) ? 'a' : 'e';
  const endsVowel = 'aıoueiöü'.includes(n.toLocaleLowerCase('tr-TR').slice(-1));
  return `${n}'${endsVowel ? 'y' : ''}${e}`;
}

/** Status line under the search box: "Mert, Deniz ve Ece dinliyor." */
export const listening = (c: Crew) => `${c.solver}, ${c.others[0]} ve ${c.others[1]} dinliyor.`;

/** Bottom score cards: the solver leads, then you, then two friends. */
export const crewScores = (t: AppTheme, c: Crew): ScoreRow[] => [
  { name: c.solver, score: 2420, color: t.colors.mint },
  { name: 'Sen', score: 2150, color: t.colors.yellow, me: true },
  { name: c.others[0], score: 1780, color: t.colors.panel },
  { name: c.others[1], score: 920, color: t.colors.panel },
];
