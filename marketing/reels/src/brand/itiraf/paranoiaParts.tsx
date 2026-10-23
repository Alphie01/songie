import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { NeverAvatar } from './neverParts';
import { MLTop } from './mostLikelyParts';
import { PN_TEXT, secsLabel, segment, timerFill, timerLow } from './paranoiaText';

/** tokens.css shades paranoia.css uses on top of APP, copied by value. */
export const PN = {
  paper2: '#f1ecff', // --paper-2: envelope flap, "no answer" card
  shadowLg: 6, // --shadow-lg: 6px 6px 0 ink
  shadowBtn: 6, // --shadow-btn: 0 6px 0 ink
} as const;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Local 0..1 progress of a CSS animation (`ms` long, `delay` ms after enterAt); enterAt omitted = finished. */
export function useCssAnim(enterAt: number | undefined, ms: number, delay = 0, easing: (t: number) => number = Easing.ease): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (enterAt == null) return 1;
  const start = enterAt + (delay / 1000) * fps;
  return interpolate(frame - start, [0, (ms / 1000) * fps], [0, 1], { ...clamp, easing });
}

/** .pr-top: mint .pr-pill "Gizlilik Esas · 4/10 soru" + room code (same rules as .ml-top). */
export const PNTop = MLTop;

/** .pr-progress: one 8 px pill per question, gap 4; done mint, current yellow, rest panel. */
export const PNProgress: React.FC<{ theme: AppTheme; done: number; total: number }> = ({ theme, done, total }) => {
  const c = theme.colors;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, total)}, minmax(0, 1fr))`, gap: 4, flex: 'none' }}>
      {Array.from({ length: total }, (_, i) => {
        const s = segment(i, done);
        return <span key={i} style={{ height: 8, borderRadius: APP.pill, background: s === 'done' ? c.mint : s === 'now' ? c.yellow : c.panel }} />;
      })}
    </div>
  );
};

/** .pr-timer: 8 px yellow bar on --bg + "28 sn" (13 px 800); under 8 s (data-low) both red. */
export const PNTimer: React.FC<{ theme: AppTheme; seconds: number; duration: number }> = ({ theme, seconds, duration }) => {
  const low = timerLow(seconds);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span style={{ flex: 1, height: 8, overflow: 'hidden', borderRadius: APP.pill, background: theme.colors.bg }}>
        <span style={{ display: 'block', height: '100%', width: `${timerFill(seconds, duration)}%`, background: low ? APP.red : theme.colors.yellow }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: low ? APP.red : undefined }}>
        {secsLabel(Math.ceil(seconds))}
      </span>
    </div>
  );
};

/** .pr-label: 12 px 800, 1.5 px tracking, uppercase, text-3. */
export const PNLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p lang="tr" style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: APP.text3 }}>{children}</p>
);

/** .pr-big (30 px Baloo 800 / 1.05) and .pr-sub (15 px 700 text-2, max 290). */
export const PNBig: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, lineHeight: 1.05 }}>{children}</p>
);
export const PNSub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: 0, maxWidth: 290, fontSize: 15, fontWeight: 700, color: APP.text2 }}>{children}</p>
);
/** .pr-hint: 12 px 700 / 1.4, text-3. */
export const PNHint: React.FC<{ children: React.ReactNode; center?: boolean }> = ({ children, center }) => (
  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.4, color: APP.text3, textAlign: center ? 'center' : undefined }}>{children}</p>
);

/**
 * PlayView Envelope inside .pr-env: paper box (4 px ink border, radius 18, 8 px ink drop, rotate -4deg) with the
 * paper-2 flap, the two fold lines and the red seal. `small` = .pr-env-sm (260×172, radius 16, 48 px seal).
 * `open` 0..1 = the 650 ms data-opening sequence (flap folds up in 350 ms, seal pops off in 250 ms, box slides
 * away from 45 %). `wiggle` plays pr-wiggle (2.4 s loop) on the tappable envelope.
 */
export const PNEnvelope: React.FC<{ theme: AppTheme; seal?: string; small?: boolean; open?: number; wiggle?: boolean; press?: number }> = ({
  theme,
  seal,
  small = false,
  open = 0,
  wiggle = false,
  press = 0,
}) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = small ? 260 : 300;
  const h = small ? 172 : 200;
  const fold = small ? 96 : 110;
  const mid = w / 2;

  // pr-wiggle: 0/80/100 % -4deg, 86 % -1deg, 92 % -6deg (ease-in-out per segment).
  let rot = -4;
  if (wiggle && open === 0 && press === 0) {
    const p = ((frame / fps) % 2.4) / 2.4;
    const io = Easing.inOut(Easing.ease);
    rot = interpolate(p, [0, 0.8, 0.86, 0.92, 1], [-4, -4, -1, -6, -4], { ...clamp, easing: io });
  }
  const ms = open * 650;
  const flap = interpolate(ms, [0, 350], [1, -0.15], { ...clamp, easing: Easing.ease });
  const sealT = interpolate(ms, [0, 250], [0, 1], { ...clamp, easing: Easing.ease });
  const out = interpolate(open, [0.45, 1], [0, 1], { ...clamp, easing: Easing.ease });
  const sealSize = small ? 48 : 56;

  return (
    <div
      style={{
        position: 'relative',
        flex: 'none',
        width: w,
        maxWidth: '100%',
        height: h,
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: `4px solid ${c.ink}`,
        borderRadius: small ? 16 : 18,
        background: c.paper,
        boxShadow: `8px 8px 0 ${c.ink}`,
        // Reels-only tap feedback (the app has no :active on .pr-env): press nudges it 3 px down.
        transform: `rotate(${interpolate(out, [0, 1], [rot, 0])}deg) translateY(${out * 40 + press * 3}px) scale(${1 - out * 0.08})`,
        opacity: 1 - out,
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', top: -4, left: -4 }}>
        <path
          d={`M0 0 L${mid} ${fold} L${w} 0`}
          fill={PN.paper2}
          stroke={c.ink}
          strokeWidth={4}
          strokeLinejoin="round"
          style={{ transformBox: 'fill-box', transformOrigin: 'top', transform: `scaleY(${flap})` }}
        />
        <path d={`M0 ${h} L${w * 0.4} ${fold - 15} M${w} ${h} L${w * 0.6} ${fold - 15}`} stroke={c.ink} strokeWidth={3} />
      </svg>
      <span
        style={{
          position: 'absolute',
          top: small ? 78 : 92,
          left: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: sealSize,
          height: sealSize,
          marginLeft: -sealSize / 2,
          boxSizing: 'border-box',
          border: `3px solid ${c.ink}`,
          borderRadius: '50%',
          background: APP.red,
          color: APP.ink2,
          fontFamily: FONT_DISPLAY,
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1,
          opacity: 1 - sealT,
          transform: `scale(${1 + 0.6 * sealT}) rotate(${25 * sealT}deg)`,
        }}
      >
        {seal}
      </span>
    </div>
  );
};

/** PlayView LockGlyph (24 viewBox, stroke 2.6). */
export const LockGlyph: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/**
 * .pr-secret: ink-2 card, bw ink border, radius 26, 6 px drop, rotate(-1deg), padding 18, gap 10.
 * `head` = yellow .pr-secret-who pill, `n` = .pr-secret-n on the right.
 */
export const PNSecret: React.FC<{ theme: AppTheme; head: string; n?: string; question: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  theme,
  head,
  n,
  question,
  style,
  children,
}) => {
  const c = theme.colors;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 18,
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 26,
        background: APP.ink2,
        boxShadow: `${PN.shadowLg}px ${PN.shadowLg}px 0 ${c.ink}`,
        transform: 'rotate(-1deg)',
        flex: 'none',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ padding: '4px 12px', borderRadius: APP.pill, background: c.yellow, color: APP.ink2, fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800 }}>
          {head}
        </span>
        {n && <span style={{ fontSize: 13, fontWeight: 800, color: APP.text3 }}>{n}</span>}
      </div>
      <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{question}</p>
      {children}
    </div>
  );
};

/** .pr-secret-note: mint lock line. */
export const PNSecretNote: React.FC<{ theme: AppTheme }> = ({ theme }) => (
  <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 13, fontWeight: 700, color: theme.colors.mint }}>
    <LockGlyph />
    {PN_TEXT.secretNote}
  </p>
);

/**
 * .pr-pick: 52 px, bw ink border, radius 16, panel, 17 px Baloo; aria-checked = mint, 3 px drop, rotate(-1.5deg);
 * disabled 0.45. `on` 0..1 eases toward the checked look (the tap).
 */
export const PNPick: React.FC<{ theme: AppTheme; nick: string; color: string; note?: string; on?: number; disabled?: boolean }> = ({
  theme,
  nick,
  color,
  note,
  on = 0,
  disabled = false,
}) => {
  const c = theme.colors;
  const checked = on >= 0.5;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
        minHeight: 52,
        boxSizing: 'border-box',
        padding: '0 10px',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 16,
        background: c.panel,
        color: checked ? APP.ink2 : c.paper,
        boxShadow: on ? `0 ${3 * on}px 0 ${c.ink}` : undefined,
        transform: on ? `rotate(${-1.5 * on}deg)` : undefined,
        opacity: disabled ? 0.45 : 1,
        fontFamily: FONT_DISPLAY,
        fontSize: 17,
        fontWeight: 800,
        overflow: 'hidden',
      }}
    >
      {on > 0 && <span style={{ position: 'absolute', inset: 0, background: c.mint, opacity: Math.min(1, on * 1.5) }} />}
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <NeverAvatar theme={theme} nick={nick} color={color} size={34} />
      </span>
      <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
        <span style={{ maxWidth: '100%', overflow: 'hidden', lineHeight: 1.15, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nick}</span>
        {note && <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, lineHeight: 1.45 }}>{note}</span>}
      </span>
    </div>
  );
};

/**
 * .pr-confirm: 62 px, radius 20, 0 6px 0 ink, 21 px Baloo; off = panel / text-3, data-on = yellow / ink-2;
 * disabled + on = 0.6. press 1 = :active (5 px down, 1 px drop).
 */
export const PNConfirm: React.FC<{ theme: AppTheme; label: React.ReactNode; on?: boolean; disabled?: boolean; press?: number }> = ({
  theme,
  label,
  on = true,
  disabled = false,
  press = 0,
}) => {
  const c = theme.colors;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 62,
        boxSizing: 'border-box',
        padding: '0 16px',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 20,
        background: on ? c.yellow : c.panel,
        color: on ? APP.ink2 : APP.text3,
        boxShadow: `0 ${PN.shadowBtn - 5 * press}px 0 ${c.ink}`,
        transform: press ? `translateY(${5 * press}px)` : undefined,
        opacity: on && disabled ? 0.6 : 1,
        fontFamily: FONT_DISPLAY,
        fontSize: 21,
        fontWeight: 800,
        lineHeight: 1.45,
        textAlign: 'center',
        flex: 'none',
      }}
    >
      {label}
    </div>
  );
};

export type PNMineEntry = { question: string; answer: string | null };

/** .pr-mine: panel-2 box (2 px ink, radius 16) with "Senin gizli cevapların", "soru → İsim" rows and the hint. */
export const PNMine: React.FC<{ theme: AppTheme; entries: PNMineEntry[] }> = ({ theme, entries }) => {
  if (!entries.length) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 14px',
        border: `2px solid ${theme.colors.ink}`,
        borderRadius: 16,
        background: APP.panel2,
        textAlign: 'left',
        flex: 'none',
      }}
    >
      <PNLabel>{PN_TEXT.mine}</PNLabel>
      {entries.map((m, i) => (
        <p key={i} style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
          {m.question} → <strong style={{ color: theme.colors.yellow, fontWeight: 800 }}>{m.answer ?? PN_TEXT.passed}</strong>
        </p>
      ))}
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: APP.text3 }}>{PN_TEXT.mineHint}</p>
    </div>
  );
};
