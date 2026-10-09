import type { ReactNode } from 'react';
import type { Role } from '../shared/index.js';
import { ROLE_NAME } from './strings';

/** Her rol için özgün satır içi simge (48×48, çizgi). */
const GLYPH: Record<Role, ReactNode> = {
  // Hazinedar: üst üste altın sikkeler ve hazine anahtarı
  treasurer: (
    <>
      <ellipse cx="20" cy="36" rx="12" ry="4" />
      <path d="M8 36v-5c0 2.2 5.4 4 12 4s12-1.8 12-4v5" />
      <ellipse cx="20" cy="27" rx="12" ry="4" />
      <path d="M8 27v-5c0 2.2 5.4 4 12 4s12-1.8 12-4v5" />
      <ellipse cx="20" cy="18" rx="12" ry="4" />
      <circle cx="38" cy="10" r="4" />
      <path d="M38 14v14M38 20h4M38 25h3" />
    </>
  ),
  // Fedai: aşağı bakan hançer, kabzada düğüm
  assassin: (
    <>
      <path d="M24 4v6" strokeWidth="3" />
      <path d="M16 12h16" strokeWidth="3" />
      <path d="M24 14l-5 6 5 24 5-24z" />
      <path d="M24 20v18" strokeWidth="1.4" />
      <circle cx="24" cy="3" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Muhafız: kalkan ve çapraz mızrak
  guard: (
    <>
      <path d="M24 7l14 5v11c0 9-6 15-14 19-8-4-14-10-14-19V12z" />
      <path d="M24 13v23M17 21h14" strokeWidth="1.6" />
      <path d="M6 42L42 6" strokeWidth="1.6" strokeDasharray="3 3" />
    </>
  ),
  // Korsan: kanca ve dalga
  pirate: (
    <>
      <path d="M28 5v6" strokeWidth="3" />
      <path d="M22 11h12v5H22z" />
      <path d="M28 16v12a9 9 0 1 1-17-4" />
      <path d="M11 24l-3 4 6 .5" />
      <path d="M5 42c4-3 7-3 10 0s7 3 10 0 7-3 10 0 6 3 8 1" strokeWidth="1.6" />
    </>
  ),
  // Casus: maske ve içinden bakan göz
  spy: (
    <>
      <path d="M4 20c6-4 14-3 20 1 6-4 14-5 20-1-1 9-6 13-12 13-4 0-6-3-8-5-2 2-4 5-8 5-6 0-11-4-12-13z" />
      <circle cx="15" cy="23" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="33" cy="23" r="2.6" fill="currentColor" stroke="none" />
      <path d="M8 13l4 3M40 13l-4 3M24 9v4" strokeWidth="1.6" />
    </>
  ),
};

export function Glyph({ role, size = 32 }: { role: Role; size?: number }) {
  return (
    <svg
      className="ig-glyph"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPH[role]}
    </svg>
  );
}

/** Rol kartı yüzü. `size`: mini (rakip satırı), normal (el), big (itiraz anı). */
export function RoleCard({ role, size, dead, tag }: { role: Role; size?: 'mini' | 'big'; dead?: boolean; tag?: string }) {
  const glyph = size === 'mini' ? 14 : size === 'big' ? 64 : 40;
  return (
    <span className="ig-card" data-role={role} data-size={size} data-dead={dead || undefined} title={ROLE_NAME[role]}>
      <Glyph role={role} size={glyph} />
      {size !== 'mini' && <span className="ig-card-name">{ROLE_NAME[role]}</span>}
      {tag && <span className="ig-card-tag mono">{tag}</span>}
      {size === 'mini' && <span className="sr-only">{ROLE_NAME[role]}</span>}
    </span>
  );
}

export function CardBack({ size }: { size?: 'mini' }) {
  return (
    <span className="ig-back" data-size={size} aria-hidden="true">
      <svg viewBox="0 0 20 20" width={size === 'mini' ? 10 : 22} height={size === 'mini' ? 10 : 22} fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 2l8 8-8 8-8-8z" />
        <path d="M10 6l4 4-4 4-4-4z" />
      </svg>
    </span>
  );
}

export function Coin({ size = 14 }: { size?: number }) {
  return (
    <svg className="ig-coin" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <circle cx="8" cy="8" r="4.2" fill="none" stroke="var(--ig-coin-ink)" strokeWidth="1.3" />
    </svg>
  );
}
