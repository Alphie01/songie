import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { NV, NeverCanvas } from './neverParts';
import { ML_TEXT, timerFill } from './mostLikelyText';

/** Shades most-likely.css uses on top of APP (tokens.css), copied by value. */
export const ML = {
  violet: NV.violet, // --violet: .ml-ghost border, .ml-empty dashes
  coral: '#ff8a5b', // --coral
  lilac: '#b794ff', // --lilac
  sky: '#5ab8ff', // --sky
} as const;

/** Avatar fills per nick as App Store 03.png shows them (the app assigns one color per profile). */
export const ML_AVATARS: Record<string, string> = {
  Ece: '#ff7ac6',
  Mert: ML.sky,
  Deniz: '#ffd23f',
  Kaan: ML.coral,
  Zeynep: ML.lilac,
  Bora: '#3ee0a8',
};

/** Fallback order for nicks without a color (game-kit AVATAR_COLOR). */
const FALLBACK = ['#3ee0a8', '#ffd23f', '#ff6b6b', '#5ab8ff', '#b794ff'];
export const avatarColor = (nick: string, colors: Record<string, string> | undefined, i: number) =>
  colors?.[nick] ?? ML_AVATARS[nick] ?? FALLBACK[i % FALLBACK.length] ?? '#3ee0a8';

/** .ml column: 393 px, padding 72 18 24, .ml-stage gap 12, body Nunito 600 / 1.45. */
export const MLCanvas: React.FC<{ theme: AppTheme; children: React.ReactNode }> = ({ theme, children }) => (
  <NeverCanvas theme={theme} gap={12} bottom={24} lineHeight={1.45}>
    <div style={{ display: 'contents', fontWeight: 600 }}>{children}</div>
  </NeverCanvas>
);

/** .ml-top: mint .ml-pill "Soru 3/10" and the room code. */
export const MLTop: React.FC<{ theme: AppTheme; label: string; code?: string }> = ({ theme, label, code }) => {
  const c = theme.colors;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
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
        {label}
      </span>
      {code && <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: APP.text3 }}>{code}</span>}
    </div>
  );
};

/** .ml-timer: yellow bar on ink-2 + yellow number; under 5 s both turn red. */
export const MLTimer: React.FC<{ theme: AppTheme; seconds: number; duration: number }> = ({ theme, seconds, duration }) => {
  const low = seconds < 5;
  const color = low ? APP.red : theme.colors.yellow;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
      <span style={{ flex: 1, height: 10, overflow: 'hidden', borderRadius: APP.pill, background: APP.ink2 }}>
        <span style={{ display: 'block', height: '100%', width: `${timerFill(seconds, duration)}%`, background: color }} />
      </span>
      <span style={{ minWidth: 20, fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, textAlign: 'right', color }}>{Math.ceil(seconds)}</span>
    </div>
  );
};

/** .ml-q: white card tilted 1deg, 7 px ink drop, yellow "Aramızdaki en…" sticker on the top edge. */
export const MLQuestion: React.FC<{ theme: AppTheme; text: string; style?: React.CSSProperties }> = ({ theme, text, style }) => {
  const c = theme.colors;
  return (
    <div
      style={{
        position: 'relative',
        marginTop: 8,
        padding: '22px 18px 18px',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 26,
        background: c.paper,
        color: APP.ink2,
        boxShadow: `7px 7px 0 ${c.ink}`,
        textAlign: 'center',
        transform: 'rotate(1deg)',
        flex: 'none',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -16,
          left: '50%',
          padding: '4px 14px',
          border: `${APP.bw}px solid ${c.ink}`,
          borderRadius: APP.pill,
          background: c.yellow,
          fontFamily: FONT_DISPLAY,
          fontSize: 15,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          transform: 'translateX(-50%) rotate(-4deg)',
        }}
      >
        {ML_TEXT.prefix}…
      </span>
      <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, lineHeight: 1.05, overflowWrap: 'anywhere' }}>
        {text} {ML_TEXT.suffix}
      </h1>
    </div>
  );
};

/** game-kit Icon "check" (24 viewBox, stroke 2.6). */
export const CheckIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** game-kit Icon "skip". */
export const SkipIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 5.5v13a.6.6 0 0 0 .9.5l9.4-6.5a.6.6 0 0 0 0-1L6.9 5a.6.6 0 0 0-.9.5z" fill="currentColor" stroke="none" />
    <path d="M19 5v14" />
  </svg>
);

/** .ml-cta: yellow, 58 px, radius 20, 5 px ink drop; press 1 = :active (1 px drop, 4 px down). */
export const MLCta: React.FC<{ theme: AppTheme; label: string; press?: number; disabled?: boolean; style?: React.CSSProperties }> = ({
  theme,
  label,
  press = 0,
  disabled = false,
  style,
}) => {
  const c = theme.colors;
  return (
    <div
      style={{
        minHeight: 58,
        boxSizing: 'border-box',
        padding: '0 18px',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 20,
        background: c.yellow,
        boxShadow: `0 ${5 - 4 * press}px 0 ${c.ink}`,
        transform: press ? `translateY(${4 * press}px)` : undefined,
        opacity: disabled ? 0.5 : 1,
        color: APP.ink2,
        fontFamily: FONT_DISPLAY,
        fontSize: 20,
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

/** .ml-ghost: 46 px, 2 px violet border, radius 14, icon + label. */
export const MLGhost: React.FC<{ label: string; icon?: React.ReactNode }> = ({ label, icon }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 46,
      boxSizing: 'border-box',
      border: `2px solid ${ML.violet}`,
      borderRadius: 14,
      color: APP.text2,
      fontSize: 14,
      fontWeight: 800,
      flex: 'none',
    }}
  >
    {icon}
    {label}
  </div>
);
