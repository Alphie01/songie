import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { NV, NeverCanvas } from './neverParts';
import { REACTIONS, reactionLabel, secsLabel, timerFill, type ReactionCounts, type ReactionKey } from './confessionsText';

/** Shades confessions.css adds on top of APP (tokens.css), copied by value. */
export const CF = {
  note: '#ffe680', // --cf-note: sticky note
  noteInk: '#2b2116', // --cf-note-ink
  quote: '#c9a400', // --cf-quote
  placeholder: 'rgb(43 33 22 / 0.55)', // .cf-note-input::placeholder
  bad: '#b3261e', // .cf-counter[data-bad]
  violet: NV.violet, // --violet / --line-2
  rMd: 16, // --r-md
} as const;

/** .cf.sg column: 393 px, padding 72 18 24, .sg-center gap 12, body Nunito 600 / 1.45. */
export const ConfCanvas: React.FC<{ theme: AppTheme; children: React.ReactNode }> = ({ theme, children }) => (
  <NeverCanvas theme={theme} gap={12} bottom={24} lineHeight={1.45}>
    {children}
  </NeverCanvas>
);

/** .cf-head: mint .cf-pill on the left, .cf-code on the right. */
export const ConfHead: React.FC<{ theme: AppTheme; label: string; code?: string }> = ({ theme, label, code }) => {
  const c = theme.colors;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flex: 'none' }}>
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

/**
 * .cf-timer: yellow bar + "28 sn"; under 10 s both turn red. `quiet` (reveal) = violet bar, no number.
 * seconds omitted = untimed room ("Süresiz").
 */
export const ConfTimer: React.FC<{ theme: AppTheme; seconds?: number; duration?: number; quiet?: boolean }> = ({
  theme,
  seconds,
  duration = 60,
  quiet = false,
}) => {
  const c = theme.colors;
  if (seconds == null) return <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: APP.text3 }}>Süresiz</p>;
  const low = !quiet && seconds < 10;
  const fill = quiet ? CF.violet : low ? APP.red : c.yellow;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', minHeight: 20 }}>
      <span style={{ flex: 1, height: 10, overflow: 'hidden', borderRadius: APP.pill, background: APP.ink2 }}>
        <span style={{ display: 'block', height: '100%', width: `${timerFill(seconds, duration)}%`, background: fill }} />
      </span>
      {!quiet && (
        <span style={{ minWidth: '4ch', fontSize: 14, fontWeight: 800, textAlign: 'right', color: low ? APP.red : c.yellow }}>
          {secsLabel(Math.ceil(seconds))}
        </span>
      )}
    </div>
  );
};

/** .cf-topic-small: the topic above the note in the guess/reveal phases. */
export const TopicSmall: React.FC<{ text: string }> = ({ text }) => (
  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: APP.text3 }}>{text}</p>
);

/** .cf-paper: taped yellow sticky note (−2°, 7 px ink drop) with the big yellow quote mark. */
export const ConfNote: React.FC<{ theme: AppTheme; text: string; style?: React.CSSProperties }> = ({ theme, text, style }) => {
  const c = theme.colors;
  return (
    <div style={{ position: 'relative', marginTop: 6, flex: 'none', ...style }}>
      <span
        style={{
          position: 'absolute',
          top: -14,
          left: '50%',
          zIndex: 1,
          width: 80,
          height: 24,
          marginLeft: -40,
          borderRadius: 3,
          background: c.paper,
          opacity: 0.55,
          transform: 'rotate(-4deg)',
        }}
      />
      <div
        style={{
          padding: '22px 18px 16px',
          border: `${APP.bw}px solid ${c.ink}`,
          borderRadius: 6,
          background: CF.note,
          color: CF.noteInk,
          boxShadow: `7px 7px 0 ${c.ink}`,
          transform: 'rotate(-2deg)',
          fontSize: 16,
        }}
      >
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 46, fontWeight: 800, lineHeight: 0.5, color: CF.quote }}>“</span>
        <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 23, fontWeight: 700, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{text}</p>
      </div>
    </div>
  );
};

/** .cf-reactions: four 38 px pill chips; pressed (mine) ones are pink. */
export const ConfReactions: React.FC<{ theme: AppTheme; counts: ReactionCounts; mine?: ReactionKey[]; pop?: Partial<Record<ReactionKey, number>> }> = ({
  theme,
  counts,
  mine = [],
  pop,
}) => {
  const c = theme.colors;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 'none' }}>
      {REACTIONS.map((r) => {
        const on = mine.includes(r);
        const s = pop?.[r];
        return (
          <span
            key={r}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 38,
              boxSizing: 'border-box',
              padding: '0 12px',
              border: `2px solid ${c.ink}`,
              borderRadius: APP.pill,
              background: on ? c.pink : c.panel,
              color: on ? APP.ink2 : c.paper,
              fontSize: 13,
              fontWeight: 800,
              transform: s != null ? `scale(${s})` : undefined,
            }}
          >
            {reactionLabel(r, counts[r])}
          </span>
        );
      })}
    </div>
  );
};

/** .cf-ask: "Sence kim yazdı?" / "Yazan: Mert" (display 22). */
export const ConfAsk: React.FC<{ text: string; style?: React.CSSProperties }> = ({ text, style }) => (
  <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, lineHeight: 1.15, ...style }}>{text}</h2>
);

export type PickState = 'idle' | 'chosen' | 'wrong' | 'author';

/** .cf-pick: 54 px panel button with a 4 px drop; chosen yellow, wrong red, author mint; press 1 = :active. */
export const ConfPick: React.FC<{
  theme: AppTheme;
  label: string;
  state?: PickState;
  votes?: string;
  press?: number;
  off?: boolean;
  style?: React.CSSProperties;
}> = ({ theme, label, state = 'idle', votes, press = 0, off = false, style }) => {
  const c = theme.colors;
  const bg = state === 'author' ? c.mint : state === 'wrong' ? APP.red : state === 'chosen' ? c.yellow : c.panel;
  const fg = state === 'idle' ? c.paper : APP.ink2;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        minHeight: 54,
        boxSizing: 'border-box',
        padding: '4px 6px',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: CF.rMd,
        background: bg,
        color: fg,
        boxShadow: `0 ${4 - 3 * press}px 0 ${c.ink}`,
        transform: press ? `translateY(${3 * press}px)` : undefined,
        opacity: off ? 0.6 : 1,
        fontFamily: FONT_DISPLAY,
        fontSize: 17,
        fontWeight: 800,
        lineHeight: 1.1,
        ...style,
      }}
    >
      <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {votes != null && <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 800, opacity: 0.8 }}>{votes}</span>}
    </div>
  );
};

/** .cf-grid: three columns, 8 px gaps. */
export const ConfGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, flex: 'none' }}>{children}</div>
);

/** .cf-foot: status box; dark (guess), light (reveal) or hit (mint, I guessed right). */
export const ConfFoot: React.FC<{ theme: AppTheme; line: string; sub?: string; tone?: 'dark' | 'light' | 'hit'; style?: React.CSSProperties }> = ({
  theme,
  line,
  sub,
  tone = 'dark',
  style,
}) => {
  const c = theme.colors;
  const bg = tone === 'light' ? c.paper : tone === 'hit' ? c.mint : APP.panel2;
  return (
    <div
      style={{
        display: 'grid',
        gap: 4,
        padding: 14,
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 18,
        background: bg,
        color: tone === 'dark' ? APP.text2 : APP.ink2,
        fontFamily: FONT_DISPLAY,
        fontSize: 18,
        fontWeight: 800,
        lineHeight: 1.2,
        textAlign: 'center',
        flex: 'none',
        ...style,
      }}
    >
      <p style={{ margin: 0 }}>{line}</p>
      {sub && <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, opacity: 0.8 }}>{sub}</p>}
    </div>
  );
};

/** .btn.btn-ghost: 44 px, 2 px violet border, Nunito 14 text-2, no drop. */
export const GhostButton: React.FC<{ label: string }> = ({ label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      boxSizing: 'border-box',
      padding: '0 14px',
      border: `2px solid ${CF.violet}`,
      borderRadius: 14,
      color: APP.text2,
      fontFamily: FONT_BODY,
      fontSize: 14,
      fontWeight: 800,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

/** .cf-host: centered ghost buttons with an optional hint line under them. */
export const HostBox: React.FC<{ children: React.ReactNode; hint?: string; style?: React.CSSProperties }> = ({ children, hint, style }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', flex: 'none', ...style }}>
    {children}
    {hint && <p style={{ flexBasis: '100%', margin: 0, fontSize: 13, fontWeight: 700, color: APP.text3 }}>{hint}</p>}
  </div>
);

/** .cf-box: dark panel-2 box with the upper-case display title (Yazanlar, Puanlar). */
export const ConfBox: React.FC<{ theme: AppTheme; title: string; children: React.ReactNode; radius?: number; padding?: string | number }> = ({
  theme,
  title,
  children,
  radius = CF.rMd,
  padding = '10px 12px',
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding,
      border: `2px solid ${theme.colors.ink}`,
      borderRadius: radius,
      background: APP.panel2,
      flex: 'none',
    }}
  >
    <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 800, lineHeight: 1.05, letterSpacing: 1.5, textTransform: 'uppercase', color: APP.text3 }}>
      {title}
    </h2>
    {children}
  </div>
);
