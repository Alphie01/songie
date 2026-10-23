import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { AppTheme } from '../themes/types';
import { FONT_DISPLAY, SAFE } from './fonts';
import { Headline } from './Headline';
import { usePop } from './motion';
import { Sticker } from './Sticker';

/** App icon (apps/songie/assets/icon/icon.png) redrawn: tilted pink tile, ink note, yellow sparkle. */
export const SongieLogo: React.FC<{ theme: AppTheme; size?: number }> = ({ theme, size = 260 }) => {
  const c = theme.colors;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(-8 50 52)">
        <rect x={16} y={20} width={66} height={66} rx={15} fill={c.ink} transform="translate(3 4)" />
        <rect x={16} y={20} width={66} height={66} rx={15} fill={c.pink} stroke={c.ink} strokeWidth={4} />
        <path d="M39 64V36l25-7v28" fill="none" stroke={c.ink} strokeWidth={5} strokeLinejoin="round" />
        <circle cx={33} cy={64} r={7.5} fill={c.ink} />
        <circle cx={58} cy={58} r={7.5} fill={c.ink} />
      </g>
      <path
        d="M80 6c1.4 5.6 3.6 7.8 9.2 9.2-5.6 1.4-7.8 3.6-9.2 9.2-1.4-5.6-3.6-7.8-9.2-9.2 5.6-1.4 7.8-3.6 9.2-9.2z"
        fill={c.yellow}
        stroke={c.ink}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Closing card for the last 2 s: a tilted paper card (6 px ink line, hard shadow) with the logo, "Songie",
 * theme.cta and the stores sticker. Paper keeps the pink logo readable on every stage color.
 */
export const CtaCard: React.FC<{ theme: AppTheme; enterAt?: number }> = ({ theme, enterAt = 0 }) => {
  const c = theme.colors;
  const card = usePop(enterAt, 12);
  const logo = usePop(enterAt + 4, 9);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
      <div
        style={{
          position: 'relative',
          width: 880,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          padding: '56px 40px 84px',
          boxSizing: 'border-box',
          border: `6px solid ${c.ink}`,
          borderRadius: 48,
          background: c.paper,
          boxShadow: `14px 14px 0 ${c.ink}`,
          transform: `translateY(${interpolate(card, [0, 1], [240, 0])}px) rotate(${interpolate(card, [0, 1], [-8, -2])}deg)`,
          opacity: Math.min(1, card * 2),
        }}
      >
        <div style={{ transform: `scale(${logo}) rotate(${interpolate(logo, [0, 1], [-20, 0])}deg)` }}>
          <SongieLogo theme={theme} size={240} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 140, lineHeight: 0.9, color: c.ink }}>{theme.name}</div>
        <Headline theme={theme} text={theme.cta} enterAt={enterAt + 8} size={68} maxWidth={760} />
        <Sticker
          theme={theme}
          text={theme.stores}
          bg={c.yellow}
          rotate={-4}
          enterAt={enterAt + 18}
          size={42}
          style={{ position: 'absolute', bottom: -44 }}
        />
      </div>
    </AbsoluteFill>
  );
};
