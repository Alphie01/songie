/**
 * The user dropped voice-over (2026-10-24: the ElevenLabs reads were "gerçekten kötü"): the We Knows reels run like
 * the Songie ones, music only, every line on screen long enough to read. A silent clip keeps the beat functions
 * unchanged: `sec` is the reading time of the line, `src` is empty so no audio plays and the music is not ducked.
 */
export type Clip = { src: string; sec: number };

/** Reading time on screen: ~3 words a second plus a short settle, never under 1,4 s or over 4,5 s. */
export const readSec = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.round(Math.min(4.5, Math.max(1.4, words / 3 + 0.5)) * 100) / 100;
};

export const silent = (texts: string[]): Clip[] => texts.map((t) => ({ src: '', sec: readSec(t) }));

/** True when any clip has audio (then the music ducks under it). */
export const voiced = (clips: Clip[]) => clips.some((c) => c.src !== '');
