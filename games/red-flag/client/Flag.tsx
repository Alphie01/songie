import type { Vote } from '../shared/index.js';

/** Bayrak simgesi (tasarımdaki çizgi bayrak). "Asla olmaz" için eksi işaretli daire. */
export function VoteIcon({ vote, size = 20 }: { vote: Vote; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="rf-ico"
    >
      <path d={vote === 'never' ? 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M7 12h10' : 'M5 21V4M5 4h12l-2 4 2 4H5'} />
    </svg>
  );
}
