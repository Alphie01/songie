import type { ReactNode } from 'react';
import type { Kind } from '../shared/index.js';

/** Türün klasik sessiz sinema işaretinden esinlenen simgeler (game-kit'te karşılığı yok). */
const PATHS: Record<Kind, ReactNode> = {
  // Eski film kamerası: iki makara + gövde + mercek
  film: (
    <>
      <circle cx="7" cy="6.5" r="2.5" />
      <circle cx="13.5" cy="6.5" r="2.5" />
      <rect x="4" y="10" width="12" height="8" rx="1.5" />
      <path d="M16 13l4-2v6l-4-2" />
    </>
  ),
  // Ekran + anten
  dizi: (
    <>
      <rect x="3.5" y="7" width="17" height="12" rx="2" />
      <path d="M9 3.5l3 3.5 3-3.5" />
    </>
  ),
  // Açık kitap
  kitap: (
    <>
      <path d="M12 6.5c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  // Nota
  sarki: (
    <>
      <path d="M9 17.5V5.5l10-2v12" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>
  ),
  // Tırnak işareti
  deyim: (
    <>
      <path d="M5 13.5c0-3.5 1.5-6 4.5-7M5 13.5h4v4.5H5z" />
      <path d="M13.5 13.5c0-3.5 1.5-6 4.5-7M13.5 13.5h4v4.5h-4z" />
    </>
  ),
};

export function KindIcon({ kind, size = 20 }: { kind: Kind; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[kind]}
    </svg>
  );
}
