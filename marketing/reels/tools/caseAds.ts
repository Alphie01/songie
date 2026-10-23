import path from 'node:path';
import { DETECTIVE_VOICE, INTERROGATIONS, PUZZLES, type Interrogation, type PuzzleCase } from '../src/reels/casebook/adCases.js';
import { audioSeconds, speak, type VoiceLine } from './tts.js';

/** Spoken clip for Remotion: path inside public/ and its length in seconds. */
export type Clip = { src: string; sec: number };

export const puzzleLines = (p: PuzzleCase): VoiceLine[] =>
  p.suspects.map((s, i) => ({ id: `pz-${p.id}-${i}`, text: s.line, voice: s.voice, style: s.style }));

export const interrogationLines = (iv: Interrogation): VoiceLine[] => [
  { id: `iv-${iv.id}-q1`, text: iv.q1, ...DETECTIVE_VOICE },
  { id: `iv-${iv.id}-a1`, text: iv.a1, voice: iv.suspect.voice, style: iv.suspect.style },
  { id: `iv-${iv.id}-q2`, text: iv.q2, ...DETECTIVE_VOICE },
  { id: `iv-${iv.id}-a2`, text: iv.a2, voice: iv.suspect.voice, style: `${iv.suspect.style} Bu cümleyi soğuk ve kısık söyle.` },
];

/** Generates (or reuses) the clips into assets/voices/ → public/assets/voices/. */
export async function voiceClips(lines: VoiceLine[], root: string): Promise<Clip[]> {
  const dir = path.join(root, 'assets', 'voices');
  const out: Clip[] = [];
  for (const l of lines) {
    const file = await speak(l, dir);
    out.push({ src: `assets/voices/${path.basename(file)}`, sec: Math.round(audioSeconds(file) * 100) / 100 });
  }
  return out;
}

export const puzzleById = (id: string) => PUZZLES.find((p) => p.id === id);
export const interrogationById = (id: string) => INTERROGATIONS.find((p) => p.id === id);
