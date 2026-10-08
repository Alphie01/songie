import type { Policy, Power } from '../shared/index.js';

/** Özgün simgeler (orijinal oyunun görselleri kullanılmaz). */
const POWER_PATHS: Record<Power, React.ReactNode> = {
  peek: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  investigate: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M15 15l5 5" />
    </>
  ),
  specialElection: <path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />,
  execution: (
    <>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5" />
    </>
  ),
};

export function PowerGlyph({ power, size = 18 }: { power: Power; size?: number }) {
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
      {POWER_PATHS[power]}
    </svg>
  );
}

/** Yasa amblemi: liberal = halka, faşist = keskin elmas. */
export function PolicyGlyph({ policy, size = 22 }: { policy: Policy; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {policy === 'liberal' ? (
        <>
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        </>
      ) : (
        <path d="M12 2.5l7 9.5-7 9.5-7-9.5z" fill="currentColor" />
      )}
    </svg>
  );
}
