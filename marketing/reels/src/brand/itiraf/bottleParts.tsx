import React from 'react';
import { Easing, interpolate } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP, APP_W } from '../app/appTokens';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { usePhoneScreen } from '../PhoneFrame';
import { ML, avatarColor } from './mostLikelyParts';
import { NeverAvatar } from './neverParts';
import { useCssAnim } from './paranoiaParts';
import { BT_TEXT, seatPos, tableSize, type BottleKind } from './bottleText';

/** bottle.css + tokens.css shades on top of APP, copied by value. */
export const BT = {
  felt: '#1e7a5a', // --bt-felt
  feltRing: '#17654a', // --bt-felt-ring
  paper2: '#f1ecff', // --paper-2 (.btn-light)
  violet: ML.violet, // --line-2: .btn-ghost border
  shadowLg: 6, // --shadow-lg
  rMd: 16, // --r-md
} as const;

/** .bt [data-kind]: truth = sky, dare = red. */
export const kindColor = (kind: BottleKind) => (kind === 'truth' ? ML.sky : APP.red);

/** Avatar fills per nick as App Store 06.png shows them (Bora is coral there). */
export const BT_AVATARS: Record<string, string> = {
  Ece: '#ff7ac6',
  Mert: ML.sky,
  Deniz: '#ffd23f',
  Selin: '#3ee0a8',
  Zeynep: ML.lilac,
  Bora: ML.coral,
  Kaan: ML.coral,
};
export const btColor = (nick: string, colors: Record<string, string> | undefined, i: number) =>
  colors?.[nick] ?? BT_AVATARS[nick] ?? avatarColor(nick, undefined, i);

/** .bt-seat[data-target] pop: 420 ms cubic-bezier(0.2, 0.9, 0.3, 1.4) from scale 0.9. */
const POP = Easing.bezier(0.2, 0.9, 0.3, 1.4);

/** .bt-top: mint .bt-pill "Çevirme 6/20" + .bt-code. */
export const BTTop: React.FC<{ theme: AppTheme; label: string; code?: string }> = ({ theme, label, code }) => {
  const c = theme.colors;
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flex: 'none' }}>
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
    </header>
  );
};

/** PlayView BottleSvg (viewBox 54×170): yellow cap, mint body, white label. */
export const BottleSvg: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const c = theme.colors;
  return (
    <svg viewBox="0 0 54 170" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <rect x="19" y="4" width="16" height="14" rx="3" fill={c.yellow} stroke={c.ink} strokeWidth="3" />
      <path
        d="M21 18h12v26c0 6 15 14 15 30v82a10 10 0 0 1-10 10H16a10 10 0 0 1-10-10V74c0-16 15-24 15-30z"
        fill={c.mint}
        stroke={c.ink}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <rect x="12" y="96" width="30" height="34" rx="4" fill={c.paper} stroke={c.ink} strokeWidth="3" />
    </svg>
  );
};

export type BTTableProps = {
  theme: AppTheme;
  players: string[];
  me?: string;
  /** Bottle rotation in deg (0 = neck up, clockwise). */
  angle: number;
  /** Highlighted seat (.bt-seat[data-target]); hidden while spinning. */
  pointed?: string;
  /** Yellow dot on the next spinner (.bt-seat[data-spinner]). */
  spinner?: string;
  /** Offline seats (dim avatar, text-3 name). */
  offline?: string[];
  avatarColors?: Record<string, string>;
  /** Local frame the pointed seat pops (bt-pop 420 ms); omitted = already popped. */
  popAt?: number;
};

/** .bt-table: green felt, seats round it, the bottle in the middle. Width = min(330, column, max(240, 100dvh − 430)). */
export const BTTable: React.FC<BTTableProps> = ({ theme, players, me, angle, pointed, spinner, offline = [], avatarColors, popAt }) => {
  const c = theme.colors;
  const screen = usePhoneScreen() ?? { width: 798, height: 1746 };
  const dvh = screen.height / (screen.width / APP_W);
  const w = Math.min(330, APP_W - 36, Math.max(240, dvh - 430));
  const n = players.length;
  const size = tableSize(n);
  const seat = size === 'many' ? 34 : size === 'mid' ? 42 : 50;
  const seatW = size === 'many' ? 52 : size === 'mid' ? 62 : 72;
  const ringScale = size === 'many' ? 0.68 : size === 'mid' ? 0.84 : 1;
  const pop = useCssAnim(popAt, 420, 0, POP);
  return (
    <div style={{ position: 'relative', width: w, height: w, margin: '0 auto', flex: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: '10.6%',
          boxSizing: 'border-box',
          border: `4px solid ${c.ink}`,
          borderRadius: '50%',
          background: BT.felt,
          boxShadow: `inset 0 0 0 10px ${BT.feltRing}, 0 8px 0 ${c.ink}`,
        }}
      />
      {players.map((p, i) => {
        const pos = seatPos(i, n);
        const target = pointed === p;
        const off = offline.includes(p);
        const scale = target ? interpolate(pop, [0, 1], [0.9, 1.15]) : 1;
        return (
          <div
            key={p}
            style={{
              position: 'absolute',
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              width: seatW,
              transform: `translate(-50%, ${-seat / 2}px)`,
              zIndex: 1,
            }}
          >
            <span
              style={{
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                boxShadow: target ? `0 0 0 5px ${c.paper}` : undefined,
                transform: `scale(${scale * ringScale})`,
              }}
            >
              <span style={{ display: 'inline-flex', opacity: off ? 0.45 : 1 }}>
                <NeverAvatar theme={theme} nick={p} color={btColor(p, avatarColors, i)} size={50} />
              </span>
              {spinner === p && (
                <span
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 14,
                    height: 14,
                    boxSizing: 'border-box',
                    border: `3px solid ${c.ink}`,
                    borderRadius: '50%',
                    background: c.yellow,
                  }}
                />
              )}
            </span>
            <span
              style={{
                maxWidth: '100%',
                marginTop: target ? 6 : 0,
                overflow: 'hidden',
                fontSize: size === 'many' ? 10.5 : 12,
                fontWeight: 800,
                lineHeight: 1.2,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: off ? APP.text3 : undefined,
              }}
            >
              {p === me ? BT_TEXT.you : p}
            </span>
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: '27.3%',
          left: '50%',
          width: '13.9%',
          height: '45.5%',
          marginLeft: '-6.95%',
          transformOrigin: '50% 50%',
          transform: `rotate(${angle}deg)`,
          zIndex: 2,
        }}
      >
        <BottleSvg theme={theme} />
      </div>
    </div>
  );
};

/** .bt-headline: 26 px Baloo 800 / 1.05, centred. */
export const BTHeadline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, lineHeight: 1.05, textAlign: 'center', overflowWrap: 'anywhere', flex: 'none' }}>
    {children}
  </h1>
);

/** .bt-hint (text-3) / .bt-hint-2 (text-2): 14 px 700, centred. */
export const BTHint: React.FC<{ children: React.ReactNode; strong?: boolean }> = ({ children, strong }) => (
  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: strong ? APP.text2 : APP.text3, textAlign: 'center' }}>{children}</p>
);

/** .bt-last: panel-2 box (2 px ink, radius 16), head in text-2 and "Cesaret: …" in text-3. */
export const BTLast: React.FC<{ theme: AppTheme; head: string; text?: string }> = ({ theme, head, text }) => (
  <div
    style={{
      display: 'grid',
      gap: 2,
      padding: '10px 12px',
      border: `2px solid ${theme.colors.ink}`,
      borderRadius: BT.rMd,
      background: APP.panel2,
      fontSize: 14,
      fontWeight: 700,
      color: APP.text2,
      flex: 'none',
    }}
  >
    <p style={{ margin: 0 }}>{head}</p>
    {text && <p style={{ margin: 0, color: APP.text3 }}>{text}</p>}
  </div>
);

/**
 * .btn with the bottle sizes: big = .bt-big (66 px, radius 22, 6 px drop, 24 px), mid = .bt-mid (58, 20, 5, 20),
 * done = .bt-done (62, 20, 5, 22). press 1 = .btn:active (3 px down, 1 px drop).
 */
export const BTButton: React.FC<{
  theme: AppTheme;
  label: React.ReactNode;
  size: 'big' | 'mid' | 'done';
  bg: string;
  color?: string;
  press?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
}> = ({ theme, label, size, bg, color = APP.ink2, press = 0, disabled = false, style }) => {
  const s = size === 'big' ? { h: 66, r: 22, d: 6, f: 24 } : size === 'mid' ? { h: 58, r: 20, d: 5, f: 20 } : { h: 62, r: 20, d: 5, f: 22 };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: s.h,
        boxSizing: 'border-box',
        padding: '0 18px',
        border: `${APP.bw}px solid ${theme.colors.ink}`,
        borderRadius: s.r,
        background: bg,
        color,
        boxShadow: `0 ${s.d - (s.d - 1) * press}px 0 ${theme.colors.ink}`,
        transform: press ? `translateY(${3 * press}px)` : undefined,
        opacity: disabled ? 0.5 : 1,
        fontFamily: FONT_DISPLAY,
        fontSize: s.f,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flex: 'none',
        ...style,
      }}
    >
      {label}
    </div>
  );
};

/** .bt-choice: 96 px kind-coloured tile, radius 24, 6 px drop, 25 px Baloo, rotate ∓2deg; press = :active (5 px down, 1 px drop). */
export const BTChoice: React.FC<{ theme: AppTheme; kind: BottleKind; press?: number; disabled?: boolean }> = ({ theme, kind, press = 0, disabled }) => {
  const c = theme.colors;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 96,
        boxSizing: 'border-box',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 24,
        background: kindColor(kind),
        color: APP.ink2,
        boxShadow: `0 ${6 - 5 * press}px 0 ${c.ink}`,
        fontFamily: FONT_DISPLAY,
        fontSize: 25,
        fontWeight: 800,
        lineHeight: 1.45,
        transform: `translateY(${5 * press}px) rotate(${kind === 'dare' ? 2 : -2}deg)`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {BT_TEXT.kind[kind]}
    </div>
  );
};

/** .bt-card: kind-coloured card, radius 24, 6 px hard shadow, rotate(-1deg); `rise` 0..1 = bt-card-in (280 ms). */
export const BTCard: React.FC<{ theme: AppTheme; kind: BottleKind; text: string; rise?: number }> = ({ theme, kind, text, rise = 1 }) => {
  const c = theme.colors;
  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 16,
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 24,
        background: kindColor(kind),
        color: APP.ink2,
        boxShadow: `${BT.shadowLg}px ${BT.shadowLg}px 0 ${c.ink}`,
        transform: `translateY(${(1 - rise) * 8}px) rotate(-1deg) scale(${0.98 + 0.02 * rise})`,
        opacity: rise,
        flex: 'none',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }} lang="tr">
        {BT_TEXT.kind[kind]}
      </span>
      <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, lineHeight: 1.12, overflowWrap: 'anywhere' }}>{text}</p>
    </article>
  );
};

/** .bt-pass: white (paper) column button, 62 px, radius 20, 5 px drop; "Pas" 17 px + 12 px Nunito "2 hak". */
export const BTPass: React.FC<{ theme: AppTheme; sub: string; disabled?: boolean; press?: number }> = ({ theme, sub, disabled, press = 0 }) => {
  const c = theme.colors;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 62,
        boxSizing: 'border-box',
        padding: '0 8px',
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 20,
        background: c.paper,
        color: APP.ink2,
        boxShadow: `0 ${5 - 4 * press}px 0 ${c.ink}`,
        transform: press ? `translateY(${3 * press}px)` : undefined,
        opacity: disabled ? 0.5 : 1,
        fontFamily: FONT_DISPLAY,
        fontSize: 17,
        fontWeight: 800,
        lineHeight: 1.05,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{BT_TEXT.pass}</span>
      <small style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 800 }}>{sub}</small>
    </div>
  );
};
