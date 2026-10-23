import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP, APP_W, GUTTER } from '../app/appTokens';
import { StatusBar } from '../app/SongPlayScreen';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { usePhoneScreen } from '../PhoneFrame';
import { NV_TEXT, splitStatement } from './neverText';

/** Shades games/never/client/never.css uses on top of APP (tokens.css), copied by value. */
export const NV = {
  violet: '#6e5fc4', // --violet: ghost button border
  mintDeep: '#2aae82', // --nv-mint-deep: timer track on the card
  lowRed: '#b3262f', // .nv-card-foot [data-low]
} as const;

/** Avatar fills (game-kit Avatar.tsx AVATAR_COLOR) in the order players get them. */
export const AVATAR_COLORS = ['#3ee0a8', '#ffd23f', '#ff6b6b', '#5ab8ff', '#b794ff'] as const;

/**
 * The .nv column: drawn at 393 CSS px (padding 72px gutter 22px) and scaled to the PhoneFrame screen,
 * exactly like SongPlayScreen.
 */
export const NeverCanvas: React.FC<{ theme: AppTheme; children: React.ReactNode }> = ({ theme, children }) => {
  const c = theme.colors;
  const screen = usePhoneScreen() ?? { width: 798, height: 1746 };
  const scale = screen.width / APP_W;
  const height = screen.height / scale;
  return (
    <div style={{ position: 'absolute', inset: 0, background: c.bg }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: APP_W,
          height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          fontFamily: FONT_BODY,
          color: c.paper,
        }}
      >
        <StatusBar color={c.paper} island={c.ink} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: '100%',
            boxSizing: 'border-box',
            padding: `72px ${GUTTER}px 22px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

/** .nv-top: mint round pill on the left, fingers (lives) or the room code on the right. */
export const NeverTop: React.FC<{ theme: AppTheme; round: string; lives?: number; maxLives?: number; code?: string }> = ({
  theme,
  round,
  lives,
  maxLives,
  code,
}) => {
  const c = theme.colors;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span
        style={{
          padding: '7px 14px',
          border: `${APP.bw}px solid ${c.ink}`,
          borderRadius: APP.pill,
          background: c.mint,
          color: APP.ink2,
          fontFamily: FONT_DISPLAY,
          fontSize: 16,
          fontWeight: 800,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {round}
      </span>
      {lives != null && maxLives != null ? (
        <Fingers theme={theme} lives={lives} max={maxLives} />
      ) : (
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: APP.text3 }}>{code}</span>
      )}
    </div>
  );
};

/** .nv-fingers: raised fingers are yellow, lowered ones panel purple. */
export const Fingers: React.FC<{ theme: AppTheme; lives: number; max: number; small?: boolean }> = ({ theme, lives, max, small = false }) => {
  const c = theme.colors;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: small ? 2 : 3 }}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            width: small ? 7 : 9,
            height: small ? 16 : 22,
            border: `2px solid ${c.ink}`,
            borderRadius: small ? '4px 4px 2px 2px' : '5px 5px 3px 3px',
            background: i >= lives ? c.panel : c.yellow,
          }}
        />
      ))}
    </span>
  );
};

/** .nv-card: tilted mint statement card with the timer strip (question phase only), lead, rest and foot. */
export const StatementCard: React.FC<{
  theme: AppTheme;
  statement: string;
  category: string;
  /** Seconds left; omitted = no timer strip and no "18 sn" (reveal phase / untimed room). */
  seconds?: number;
  /** Answer time in seconds (the strip's full width). */
  duration?: number;
  lead?: string;
  style?: React.CSSProperties;
}> = ({ theme, statement, category, seconds, duration = 30, lead = NV_TEXT.lead, style }) => {
  const c = theme.colors;
  const timed = seconds != null && duration > 0;
  const low = timed && seconds < 5;
  return (
    <div
      style={{
        marginTop: 6,
        overflow: 'hidden',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 28,
        background: c.mint,
        boxShadow: `8px 8px 0 ${c.ink}`,
        color: APP.ink2,
        transform: 'rotate(-1.5deg)',
        flex: 'none',
        ...style,
      }}
    >
      {timed && (
        <div style={{ height: 8, background: NV.mintDeep }}>
          <span
            style={{
              display: 'block',
              height: '100%',
              width: `${Math.max(0, Math.min(1, seconds / duration)) * 100}%`,
              background: low ? APP.red : APP.ink2,
            }}
          />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '20px 20px 16px' }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{lead}</span>
        <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 31, fontWeight: 800, lineHeight: 1.08, overflowWrap: 'anywhere' }}>
          {splitStatement(statement)}
        </p>
        <p style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '6px 0 0', fontSize: 13, fontWeight: 800 }}>
          <span>{category}</span>
          {timed && <span style={{ color: low ? NV.lowRed : undefined }}>{`${Math.ceil(seconds)} sn`}</span>}
        </p>
      </div>
    </div>
  );
};

/** .nv-cta: yellow button with a 5 px ink drop; press 1 = :active (1 px drop, 4 px down). */
export const NeverCta: React.FC<{ theme: AppTheme; label: string; large?: boolean; press?: number; style?: React.CSSProperties }> = ({
  theme,
  label,
  large = false,
  press = 0,
  style,
}) => {
  const c = theme.colors;
  return (
    <div
      style={{
        minHeight: large ? 60 : 58,
        boxSizing: 'border-box',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 20,
        background: c.yellow,
        boxShadow: `0 ${5 - 4 * press}px 0 ${c.ink}`,
        transform: press ? `translateY(${4 * press}px)` : undefined,
        color: APP.ink2,
        fontFamily: FONT_DISPLAY,
        fontSize: large ? 22 : 20,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        ...style,
      }}
    >
      {label}
    </div>
  );
};

/** game-kit Avatar: colored circle with the nick's first letter (28 px → 2 px ink border). */
export const NeverAvatar: React.FC<{ theme: AppTheme; nick: string; color: string; size?: number }> = ({ theme, nick, color, size = 28 }) => (
  <span
    style={{
      display: 'inline-grid',
      placeItems: 'center',
      flex: 'none',
      boxSizing: 'border-box',
      width: size,
      height: size,
      border: `${size >= 40 ? 3 : 2}px solid ${theme.colors.ink}`,
      borderRadius: '50%',
      background: color,
      color: APP.ink2,
      fontFamily: FONT_DISPLAY,
      fontSize: size * 0.46,
      fontWeight: 800,
      lineHeight: 1,
    }}
  >
    {nick.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'}
  </span>
);
