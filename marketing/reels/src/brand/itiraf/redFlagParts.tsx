import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { MLTop } from './mostLikelyParts';
import { RF_VOTES, secsLabel, timerFill, type RedFlagCounts, type RedFlagVote } from './redFlagText';

/** Colors red-flag.css maps to [data-vote] (--v), by value from tokens.css. */
export const voteColor = (theme: AppTheme, v: RedFlagVote) => (v === 'green' ? theme.colors.mint : v === 'red' ? APP.red : theme.colors.lilac);

/** Flag.tsx VoteIcon: line flag, "Asla olmaz" a circle with a minus (24 viewBox, stroke 2.4). */
export const VoteIcon: React.FC<{ vote: RedFlagVote; size?: number }> = ({ vote, size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d={vote === 'never' ? 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M7 12h10' : 'M5 21V4M5 4h12l-2 4 2 4H5'} />
  </svg>
);

/** .rf-head: mint .rf-pill "Durum 7/20" + room code (same rules as .ml-top). */
export const RFTop = MLTop;

/** .rf-timer: 10 px yellow bar on ink-2 + "19 sn" (14 px Nunito 800); under 5 s both red. */
export const RFTimer: React.FC<{ theme: AppTheme; seconds: number; duration: number }> = ({ theme, seconds, duration }) => {
  const color = seconds < 5 ? APP.red : theme.colors.yellow;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
      <span style={{ flex: 1, height: 10, overflow: 'hidden', borderRadius: APP.pill, background: APP.ink2 }}>
        <span style={{ display: 'block', height: '100%', width: `${timerFill(seconds, duration)}%`, background: color }} />
      </span>
      <span style={{ minWidth: '4ch', fontSize: 14, fontWeight: 800, textAlign: 'right', color }}>{secsLabel(Math.ceil(seconds))}</span>
    </div>
  );
};

/**
 * .rf-card: white situation card, radius 26, 7 px ink drop, rotate(-1.5deg); pink category chip.
 * rf-card-in (320 ms, from rotate(1deg) translateY(10px), opacity 0) plays from `enterAt` when given.
 */
export const RFCard: React.FC<{ theme: AppTheme; situation: string; category: string; enterAt?: number; children?: React.ReactNode }> = ({
  theme,
  situation,
  category,
  enterAt,
  children,
}) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t =
    enterAt == null
      ? 1
      : interpolate(frame - enterAt, [0, 0.32 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 18,
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 26,
        background: c.paper,
        color: APP.ink2,
        boxShadow: `7px 7px 0 ${c.ink}`,
        transform: `rotate(${interpolate(t, [0, 1], [1, -1.5])}deg) translateY(${(1 - t) * 10}px)`,
        opacity: t,
        flex: 'none',
      }}
    >
      <span
        style={{
          alignSelf: 'flex-start',
          padding: '3px 12px',
          border: `2px solid ${c.ink}`,
          borderRadius: APP.pill,
          background: c.pink,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {category}
      </span>
      <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{situation}</p>
      {children}
    </div>
  );
};

/** .rf-bar: 18 px pill, 2 px ink border, a segment per option with votes; each grows 600 ms, 90 ms apart. */
export const RFBar: React.FC<{ theme: AppTheme; counts: RedFlagCounts; options: RedFlagVote[]; enterAt?: number }> = ({ theme, counts, options, enterAt }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = RF_VOTES.reduce((n, v) => n + counts[v], 0);
  const shown = options.filter((v) => counts[v] > 0);
  const grow = (i: number) =>
    enterAt == null
      ? 1
      : interpolate(frame - enterAt - i * 0.09 * fps, [0, 0.6 * fps], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        });
  return (
    <div style={{ display: 'flex', height: 18, boxSizing: 'border-box', overflow: 'hidden', border: `2px solid ${c.ink}`, borderRadius: APP.pill, background: APP.panel2 }}>
      {shown.map((v, i) => (
        <span
          key={v}
          style={{
            flexGrow: counts[v],
            flexBasis: 0,
            minWidth: 0,
            background: voteColor(theme, v),
            borderLeft: i ? `2px solid ${c.ink}` : undefined,
            transform: `scaleX(${grow(options.indexOf(v))})`,
            transformOrigin: 'left',
          }}
        />
      ))}
      {total === 0 && <span style={{ flexGrow: 1, background: '#4a389e' /* --panel-3 */ }} />}
    </div>
  );
};

/** .rf-big: yellow, 56 px, radius 20, 5 px ink drop; press 1 = :active (1 px drop, 4 px down); disabled 0.6. */
export const RFBig: React.FC<{ theme: AppTheme; label: string; press?: number; disabled?: boolean; done?: boolean }> = ({
  theme,
  label,
  press = 0,
  disabled = false,
  done = false,
}) => {
  const c = theme.colors;
  return (
    <div
      style={{
        minHeight: 56,
        boxSizing: 'border-box',
        padding: '0 18px',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 20,
        background: done ? c.mint : c.yellow,
        boxShadow: `0 ${5 - 4 * press}px 0 ${c.ink}`,
        transform: press ? `translateY(${4 * press}px)` : undefined,
        opacity: disabled && !done ? 0.6 : 1,
        color: APP.ink2,
        fontFamily: FONT_DISPLAY,
        fontSize: 20,
        fontWeight: 800,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {label}
    </div>
  );
};

/** .rf-note: 13 px / 700, text-2 (dim = text-3), centered. */
export const RFNote: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: dim ? APP.text3 : APP.text2, textAlign: 'center' }}>{children}</p>
);
