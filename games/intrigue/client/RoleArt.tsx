import type { ReactNode } from 'react';
import type { Role } from '../shared/index.js';
import { ROLE_NAME } from './strings';

/** Rol simgeleri (24×24, kalın çizgi; Entrika tasarımındaki çizim dili). */
const GLYPH: Record<Role, ReactNode> = {
  // Hazinedar: sikke
  treasurer: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  // Fedai: hançer
  assassin: (
    <>
      <path d="M14 4l6 6-9 9H5v-6z" />
      <path d="M4 20l3-3" />
    </>
  ),
  // Muhafız: kalkan
  guard: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  // Korsan: kanca
  pirate: (
    <>
      <path d="M10 3h6" />
      <path d="M13 3v10a5 5 0 1 1-9-3" />
      <path d="M4 10l-1 3h3" />
    </>
  ),
  // Casus: göz
  spy: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

export function Glyph({ role, size = 32 }: { role: Role; size?: number }) {
  return (
    <svg
      className="ig-glyph"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPH[role]}
    </svg>
  );
}

/** Rol kartı yüzü. `size`: mini (rakip kartında küçük kart), normal (el), big (itiraz sonucu). */
export function RoleCard({ role, size, dead, tag }: { role: Role; size?: 'mini' | 'big'; dead?: boolean; tag?: string }) {
  const glyph = size === 'big' ? 60 : 38;
  return (
    <span className="ig-card" data-role={role} data-size={size} data-dead={dead || undefined} title={ROLE_NAME[role]}>
      {size !== 'mini' && <Glyph role={role} size={glyph} />}
      {size !== 'mini' && <span className="ig-card-name">{ROLE_NAME[role]}</span>}
      {tag && <span className="ig-card-tag">{tag}</span>}
      {size === 'mini' && <span className="sr-only">{ROLE_NAME[role]}</span>}
    </span>
  );
}

export function CardBack({ size }: { size?: 'mini' }) {
  return <span className="ig-back" data-size={size} aria-hidden="true" />;
}

export function Coin({ size = 14 }: { size?: number }) {
  return (
    <svg className="ig-coin" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <circle cx="8" cy="8" r="4.2" fill="none" stroke="var(--ink-2)" strokeWidth="1.3" />
    </svg>
  );
}
