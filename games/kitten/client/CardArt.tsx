import type { ReactNode } from 'react';
import type { CardKind } from '../shared/index.js';
import { CARD_NAME } from './strings';

const WHISKERS = <path d="M6 27l8 1M6 32l8-1M42 27l-8 1M42 32l-8-1" />;
const HEAD = 'M11 21L12 7l9 8.5q3-.8 6 0L36 7l1 14q2 16-13 17Q9 37 11 21z';

/** Her kart türü için özgün satır içi simge (48×48). */
const GLYPH: Record<CardKind, ReactNode> = {
  bomb: (
    <>
      <circle cx="22" cy="29" r="12" fill="currentColor" stroke="none" />
      <path d="M29 19.5l3-3" strokeWidth="4" />
      <path d="M32.5 16c2-4 6-4 8-8" />
      <path d="M41 4.5v3M41 10.5v3M37.5 9h-2M46.5 9h-2M38.6 6.5l1 1M43.4 11.5l1 1" strokeWidth="1.8" />
      <path d="M15 26a8 8 0 0 1 5-5" stroke="var(--kt-ink)" strokeWidth="2.4" />
    </>
  ),
  defuse: (
    <>
      <circle cx="13" cy="35" r="5.5" />
      <circle cx="27" cy="38" r="5.5" />
      <path d="M17 31L36 9M23 34L40 15" />
      <path d="M36 9l4 6" strokeWidth="1.6" />
      <path d="M6 14c6 0 8 4 14 4" strokeDasharray="2.5 3" strokeWidth="1.8" />
    </>
  ),
  attack: (
    <>
      <path d="M13 8c2 12 0 22-6 32" />
      <path d="M24 6c2 13 1 25-4 36" />
      <path d="M35 8c2 12 1 22-4 32" />
    </>
  ),
  skip: (
    <>
      <path d="M9 12l12 12-12 12" />
      <path d="M22 12l12 12-12 12" />
      <path d="M40 11v26" />
    </>
  ),
  future: (
    <>
      <path d="M4 24c5-9 12-13 20-13s15 4 20 13c-5 9-12 13-20 13S9 33 4 24z" />
      <circle cx="24" cy="24" r="7" />
      <circle cx="24" cy="24" r="2.6" fill="currentColor" stroke="none" />
      <path d="M24 4v3M12 7l2 3M36 7l-2 3" strokeWidth="1.8" />
    </>
  ),
  shuffle: (
    <>
      <path d="M6 15h7c5 0 7 2 10 7l3 4c3 5 5 7 10 7h6M37 28l5 5-5 5" />
      <path d="M6 33h7c3 0 5-1 7-3M28 18c2-2 4-3 8-3h6M37 10l5 5-5 5" />
    </>
  ),
  favor: (
    <>
      <rect x="9" y="20" width="30" height="20" rx="2" />
      <path d="M7 14h34v6H7zM24 14v26" />
      <path d="M24 14c-3-6-10-8-11-4-1 3 5 4 11 4zM24 14c3-6 10-8 11-4 1 3-5 4-11 4z" />
    </>
  ),
  nope: (
    <>
      <circle cx="24" cy="24" r="17" strokeWidth="4" />
      <path d="M12 12l24 24" strokeWidth="4" />
    </>
  ),
  sarman: (
    <>
      <path d={HEAD} />
      <path d="M20 14.5l1.5 4M24 14v4.5M28 14.5l-1.5 4M14 22l3 1M34 22l-3 1" strokeWidth="1.8" />
      <circle cx="19" cy="26" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="29" cy="26" r="1.8" fill="currentColor" stroke="none" />
      <path d="M22.5 30.5h3l-1.5 1.6z" fill="currentColor" strokeWidth="1.2" />
      {WHISKERS}
    </>
  ),
  tekir: (
    <>
      <path d={HEAD} />
      <path d="M19 19l2.5-3 2.5 3 2.5-3 2.5 3" strokeWidth="1.8" />
      <circle cx="19" cy="26" r="3" />
      <circle cx="29" cy="26" r="3" />
      <path d="M22 26h4" strokeWidth="1.6" />
      <path d="M22.5 31h3l-1.5 1.6z" fill="currentColor" strokeWidth="1.2" />
      {WHISKERS}
    </>
  ),
  pamuk: (
    <>
      <path d="M11 21L12 7l9 8.5q3-.8 6 0L36 7l1 14c2 3 1 6-1 7 1 3-1 6-4 6-2 3-6 4-8 3-2 1-6 0-8-3-3 0-5-3-4-6-2-1-3-4-1-7z" />
      <path d="M16.5 26q2.5 2 5 0M26.5 26q2.5 2 5 0" strokeWidth="1.8" />
      <path d="M22.5 30.5h3l-1.5 1.6z" fill="currentColor" strokeWidth="1.2" />
      <circle cx="15" cy="30" r="1.6" fill="currentColor" stroke="none" opacity=".45" />
      <circle cx="33" cy="30" r="1.6" fill="currentColor" stroke="none" opacity=".45" />
    </>
  ),
  kara: (
    <>
      <path d={HEAD} fill="currentColor" />
      <ellipse cx="19" cy="25.5" rx="2.6" ry="3.2" fill="var(--kt-eye)" stroke="none" />
      <ellipse cx="29" cy="25.5" rx="2.6" ry="3.2" fill="var(--kt-eye)" stroke="none" />
      <path d="M19 23.5v4M29 23.5v4" stroke="var(--kt-ink)" strokeWidth="1.2" />
      {WHISKERS}
    </>
  ),
  benek: (
    <>
      <path d={HEAD} />
      <circle cx="17" cy="18" r="2.3" fill="currentColor" stroke="none" />
      <circle cx="31.5" cy="31" r="3" fill="currentColor" stroke="none" />
      <circle cx="27.5" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="26" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="29" cy="25" r="1.8" fill="currentColor" stroke="none" />
      <path d="M20 31.5q4 2.5 8 0" strokeWidth="1.8" />
      <path d="M6 28l8 .5M6 32.5l8-1" />
    </>
  ),
};

export function Glyph({ kind, size = 40 }: { kind: CardKind; size?: number }) {
  return (
    <svg
      className="kt-glyph"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPH[kind]}
    </svg>
  );
}

/** Kart yüzü. `size`: el (hand), küçük (mini), büyük (big). */
export function CardFace({ kind, size = 'hand' }: { kind: CardKind; size?: 'hand' | 'mini' | 'big' }) {
  const glyph = size === 'mini' ? 16 : size === 'big' ? 64 : 38;
  return (
    <span className="kt-card" data-kind={kind} data-size={size}>
      <Glyph kind={kind} size={glyph} />
      {size !== 'mini' && <span className="kt-card-name">{CARD_NAME[kind]}</span>}
    </span>
  );
}

/** Kartın arkası (deste). */
export function CardBack() {
  return (
    <span className="kt-back" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={HEAD} />
        <circle cx="24" cy="27" r="5" fill="currentColor" stroke="none" />
        <path d="M27.5 23l2-2M30 21c1-2 3-2 4-4" />
      </svg>
    </span>
  );
}
