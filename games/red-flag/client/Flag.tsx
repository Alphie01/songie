import type { Vote } from '../shared/index.js';

/** Renkli bayrak simgesi (emoji yerine). "Asla olmaz" için yasak işareti. */
export function VoteIcon({ vote, size = 20 }: { vote: Vote; size?: number }) {
  if (vote === 'never') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className="rf-ico" data-vote="never">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M6.2 17.8 17.8 6.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className="rf-ico" data-vote={vote}>
      <path d="M5.5 21.5V3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M6 4.2c2.4-1.4 4.6.9 7 .2s4.3-1.7 6.2-.6v9.4c-1.9-1.1-3.8-.1-6.2.6s-4.6-1.6-7-.2z" fill="currentColor" />
    </svg>
  );
}
