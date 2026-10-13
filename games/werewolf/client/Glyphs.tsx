import type { Role } from '../shared/index.js';

/** Özgün rol simgeleri (24×24, çizgi). Renk `currentColor`'dan gelir. */
const ROLE_PATHS: Record<Role, React.ReactNode> = {
  wolf: (
    <>
      <path d="M4 3.5l4.2 5h7.6l4.2-5-.8 9.2-2.7 3.6L12 20.5l-4.5-4.2-2.7-3.6z" />
      <path d="M9 12.2l1.4.8M15 12.2l-1.4.8M10.6 16.4L12 17.4l1.4-1" />
    </>
  ),
  villager: (
    <>
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  seer: (
    <>
      <path d="M2.5 13.5s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5-9.5-5.5-9.5-5.5z" />
      <circle cx="12" cy="13.5" r="2.5" />
      <path d="M12 2.5v2.5M6.5 4.5l1.3 1.8M17.5 4.5l-1.3 1.8" />
    </>
  ),
  doctor: (
    <>
      <path d="M12 3l7 2.8v5.4c0 4.7-3 8.2-7 9.8-4-1.6-7-5.1-7-9.8V5.8z" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  hunter: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  witch: (
    <>
      <path d="M9 3h6M10 3v5.5L5.2 17a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 8.5V3" />
      <path d="M7.5 14.5h9" />
      <circle cx="11" cy="17.2" r=".9" fill="currentColor" />
      <circle cx="14" cy="16.6" r=".6" fill="currentColor" />
    </>
  ),
  cupid: (
    <>
      <path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.5a3.9 3.9 0 0 1 7 2.4c0 5.3-7 9.6-7 9.6z" />
      <path d="M3 21L21 3M16.5 3H21v4.5M3 21v-3M3 21h3" />
    </>
  ),
  fool: (
    <>
      <path d="M5.5 18L3.5 7.5l4.8 3.8L12 4.5l3.7 6.8 4.8-3.8-2 10.5z" />
      <path d="M5.5 18h13v2.5h-13z" />
      <circle cx="3.5" cy="6" r="1.3" />
      <circle cx="12" cy="3" r="1.3" />
      <circle cx="20.5" cy="6" r="1.3" />
    </>
  ),
};

export function RoleGlyph({ role, size = 20 }: { role: Role; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ROLE_PATHS[role]}
    </svg>
  );
}

/** Süre halkası: 92 px daire, kalan süre kalın yay. `left` 1 (yeni başladı) – 0 (süre doldu). */
export function ClockRing({ left }: { left: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const l = Math.max(0, Math.min(1, left));
  return (
    <svg className="ww-ring" width="92" height="92" viewBox="0 0 92 92" aria-hidden="true" focusable="false">
      <circle cx="46" cy="46" r={r} className="ww-ring-arc" strokeDasharray={c} strokeDashoffset={c * (1 - l)} transform="rotate(-90 46 46)" />
    </svg>
  );
}
