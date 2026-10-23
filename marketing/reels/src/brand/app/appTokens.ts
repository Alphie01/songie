/**
 * Shades the real game screen uses on top of the 12 brand tokens, copied by value from
 * apps/web/src/styles/tokens.css and games/song-guess/client/song.css. Only the coded app
 * screen (SongPlayScreen) uses them, so it stays a 1:1 copy of the app; nothing else should.
 */
export const APP = {
  ink2: '#120c2e', // --ink-2: text on colored fills, hint pill, progress track
  panel2: '#1f145a', // --panel-2: live feed card
  text2: '#e4dcff', // --text-2: status line
  text3: '#c9bef5', // --text-3: room code, feed title
  red: '#ff6b6b', // --red: skip / wrong in the feed
  placeholder: '#8b82b0', // .guess-input::placeholder
  rowLine: '#eee8ff', // --song-row-line: suggestion separators
  bw: 3, // --bw
  pill: 999,
} as const;

/** Design width of the app column in CSS px (iPhone 6.9" at 1x); the screen is drawn at this size and scaled. */
export const APP_W = 393;
export const GUTTER = 18;

/** song-guess stage clips (s) and where each ends on the progress bar (%), from ProgressBar.tsx. */
export const CLIPS = [0.1, 0.5, 2, 8, 15];
export const STOPS = [1.5, 5.5, 22, 55, 100];

/** "0.1s" (clipShort) and "0,1" (tr-TR) labels. */
export const clipShort = (s: number) => `${s}s`;
export const clipTr = (s: number) => s.toLocaleString('tr-TR');
