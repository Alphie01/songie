import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { NOIR, casebookTheme } from '../../themes/casebook';
import { FONT_DISPLAY, FONT_HEAD, FONT_MONO } from '../fonts';
import { hasStaticFile } from '../ClipCard';
import { usePop } from '../motion';

const c = casebookTheme.colors;

/** Deterministic 0..1 noise for flicker and grain seeds. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Film grain over everything: SVG turbulence with a new seed every 2 frames. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.11 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 24;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity }}>
      <svg width="100%" height="100%">
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Dark edges, like a desk lamp that only reaches the middle. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.85 }) => (
  <AbsoluteFill
    style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 75% 60% at 50% 45%, transparent 40%, rgba(0,0,0,${strength}) 100%)` }}
  />
);

/**
 * The noir desk: warm black, one lamp glow from the top left that flickers a little, grain and vignette on top.
 */
export const NoirStage: React.FC<{ children?: React.ReactNode; lamp?: boolean }> = ({ children, lamp = true }) => {
  const frame = useCurrentFrame();
  const flicker = 0.92 + 0.08 * hash(Math.floor(frame / 3));
  return (
    <AbsoluteFill style={{ backgroundColor: c.bg, overflow: 'hidden' }}>
      {lamp && (
        <AbsoluteFill
          style={{
            opacity: flicker,
            background: `radial-gradient(circle at 22% 18%, ${NOIR.lamp} 0%, rgba(58,42,18,0.35) 35%, transparent 65%)`,
          }}
        />
      )}
      {children}
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};

/** Case photo, graded cold and dark; slow push-in. Missing file → the desk shows through. */
export const CasePhoto: React.FC<{
  src: string;
  style?: React.CSSProperties;
  zoom?: [number, number];
  frames?: number;
  dim?: number;
  position?: string;
}> = ({ src, style, zoom = [1.08, 1], frames = 120, dim = 0.62, position = 'center' }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, frames], zoom, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (!hasStaticFile(src)) return <div style={{ ...style, background: c.panel }} />;
  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: position,
          transform: `scale(${s})`,
          filter: `brightness(${dim}) saturate(0.7) contrast(1.12)`,
        }}
      />
    </div>
  );
};

/** Typewriter: `text` appears `cps` characters per second from `enterAt`, with a blinking caret while typing. */
export function typed(text: string, frame: number, enterAt: number, charsPerFrame: number): string {
  const n = Math.max(0, Math.floor((frame - enterAt) * charsPerFrame));
  return [...text].slice(0, n).join('');
}

export const Typewriter: React.FC<{
  text: string;
  enterAt?: number;
  charsPerFrame?: number;
  size?: number;
  color?: string;
  weight?: 400 | 700;
  style?: React.CSSProperties;
}> = ({ text, enterAt = 0, charsPerFrame = 1.6, size = 60, color = c.paper, weight = 700, style }) => {
  const frame = useCurrentFrame();
  const shown = typed(text, frame, enterAt, charsPerFrame);
  const done = shown.length >= [...text].length;
  const caret = !done || Math.floor(frame / 12) % 2 === 0;
  return (
    <div style={{ fontFamily: FONT_MONO, fontWeight: weight, fontSize: size, lineHeight: 1.22, color, position: 'relative', ...style }}>
      {/* the full text keeps the box size fixed while typing */}
      <span style={{ visibility: 'hidden' }}>{text}</span>
      <span style={{ position: 'absolute', inset: 0 }}>
        {shown}
        {frame >= enterAt && (
          <span style={{ display: 'inline-block', width: 0, overflow: 'visible', opacity: caret ? 1 : 0, color: c.yellow }}>▍</span>
        )}
      </span>
    </div>
  );
};

/** Rubber stamp that slams down (scale 2.4 → 1) at `enterAt`: GİZLİ, ŞÜPHELİ, TEMİZ. */
export const Stamp: React.FC<{
  text: string;
  color?: string;
  enterAt?: number;
  size?: number;
  rotate?: number;
  style?: React.CSSProperties;
}> = ({ text, color = c.coral, enterAt = 0, size = 64, rotate = -12, style }) => {
  const frame = useCurrentFrame();
  const p = usePop(enterAt, 16);
  if (frame < enterAt) return null;
  return (
    <div
      style={{
        display: 'inline-block',
        padding: `${Math.round(size * 0.12)}px ${Math.round(size * 0.35)}px ${Math.round(size * 0.04)}px`,
        border: `${Math.max(4, Math.round(size * 0.09))}px solid ${color}`,
        borderRadius: Math.round(size * 0.16),
        color,
        fontFamily: FONT_MONO,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: size * 0.06,
        lineHeight: 1.1,
        opacity: Math.min(1, p * 1.6) * 0.9,
        transform: `rotate(${rotate}deg) scale(${interpolate(p, [0, 1], [2.4, 1])})`,
        mixBlendMode: 'multiply',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** White flash at a cut, like a crime-scene camera. */
export const Flash: React.FC<{ at: number; frames?: number }> = ({ at, frames = 7 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 1, at + frames], [0, 0.85, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: '#fff', opacity: o, pointerEvents: 'none' }} />;
};

/** Manila case folder with a tab: the case title in Baloo, place and date in Courier. */
export const CaseFolder: React.FC<{ title: string; subtitle: string; genre: string; enterAt?: number; children?: React.ReactNode }> = ({
  title,
  subtitle,
  genre,
  enterAt = 0,
  children,
}) => {
  const p = usePop(enterAt, 14);
  return (
    <div
      style={{
        position: 'relative',
        width: 960,
        transform: `translateY(${interpolate(p, [0, 1], [420, 0])}px) rotate(${interpolate(p, [0, 1], [6, -2])}deg)`,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          height: 64,
          marginLeft: 40,
          paddingRight: 30,
          whiteSpace: 'nowrap',
          background: c.cream,
          border: `5px solid ${c.ink}`,
          borderBottom: 0,
          borderRadius: '20px 20px 0 0',
          fontFamily: FONT_MONO,
          fontWeight: 700,
          fontSize: 32,
          color: NOIR.brown,
          alignItems: 'center',
          paddingLeft: 26,
          boxSizing: 'border-box',
        }}
      >
        Vaka: {genre}
      </div>
      <div
        style={{
          position: 'relative',
          background: c.paper,
          border: `5px solid ${c.ink}`,
          borderRadius: '0 24px 24px 24px',
          padding: '44px 48px 48px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 108, lineHeight: 0.95, color: NOIR.brown }}>{title}</div>
        <div style={{ marginTop: 18, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 36, color: NOIR.brown, opacity: 0.8 }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
};

/** Pinned instant photo with a handwritten-ish Courier caption. */
export const Polaroid: React.FC<{
  src: string;
  caption: string;
  width: number;
  photoHeight: number;
  rotate?: number;
  enterAt?: number;
  children?: React.ReactNode;
}> = ({ src, caption, width, photoHeight, rotate = 0, enterAt = 0, children }) => {
  const p = usePop(enterAt, 13);
  return (
    <div
      style={{
        position: 'relative',
        width,
        padding: '14px 14px 0',
        boxSizing: 'border-box',
        background: c.paper,
        boxShadow: '0 18px 36px rgba(0,0,0,0.65)',
        opacity: Math.min(1, p * 2),
        transform: `rotate(${rotate}deg) scale(${interpolate(p, [0, 1], [1.25, 1])})`,
      }}
    >
      <CasePhoto src={src} style={{ width: '100%', height: photoHeight }} dim={0.85} zoom={[1, 1]} position="center 25%" />
      <div
        style={{
          fontFamily: FONT_MONO,
          fontWeight: 700,
          fontSize: Math.round(width * 0.095),
          lineHeight: 1.05,
          color: NOIR.brown,
          padding: '12px 2px 14px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {caption}
      </div>
      {children}
    </div>
  );
};

/** Red push pin. */
export const Pin: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      position: 'absolute',
      width: 30,
      height: 30,
      borderRadius: 99,
      background: `radial-gradient(circle at 35% 35%, #ff8a7a, ${c.coral} 55%, #6b1810)`,
      boxShadow: '0 6px 8px rgba(0,0,0,0.6)',
      ...style,
    }}
  />
);

/** Yellow sticky note from a teammate: "Ece: Bu saat tutmuyor…". */
export const Note: React.FC<{ text: string; enterAt?: number; rotate?: number; width?: number; style?: React.CSSProperties }> = ({
  text,
  enterAt = 0,
  rotate = 5,
  width = 420,
  style,
}) => {
  const p = usePop(enterAt, 12);
  const frame = useCurrentFrame();
  if (frame < enterAt) return null;
  return (
    <div
      style={{
        width,
        padding: '26px 28px 30px',
        boxSizing: 'border-box',
        background: c.yellow,
        color: c.ink,
        fontFamily: FONT_MONO,
        fontWeight: 700,
        fontSize: 40,
        lineHeight: 1.15,
        boxShadow: '0 16px 30px rgba(0,0,0,0.55)',
        transform: `rotate(${rotate}deg) scale(${p})`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Casebook app icon (apps/casebook/assets/icon/icon.png). */
export const CasebookLogo: React.FC<{ size?: number }> = ({ size = 260 }) => (
  <Img src={staticFile('casebook/icon/icon.png')} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
);

/** Red/blue police strobe washing over the frame from both sides (true-crime opener). */
export const PoliceLights: React.FC<{ from?: number; to?: number; strength?: number }> = ({ from = 0, to = 9999, strength = 0.55 }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const t = frame - from;
  const phase = Math.floor(t / 4) % 4; // red, red, blue, blue with a dark gap between
  const fade = interpolate(frame, [to - 10, to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const red = phase === 0 ? 1 : phase === 1 ? 0.35 : 0;
  const blue = phase === 2 ? 1 : phase === 3 ? 0.35 : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: strength * fade }}>
      <AbsoluteFill style={{ opacity: red, background: 'radial-gradient(ellipse 70% 55% at 0% 30%, #ff1a1a 0%, transparent 70%)' }} />
      <AbsoluteFill style={{ opacity: blue, background: 'radial-gradient(ellipse 70% 55% at 100% 30%, #1a5cff 0%, transparent 70%)' }} />
    </AbsoluteFill>
  );
};

/** Condensed true-crime caps that punch in (scale 1.4 → 1) at `enterAt`. */
export const BigCaps: React.FC<{ text: string; enterAt?: number; size?: number; color?: string; style?: React.CSSProperties }> = ({
  text,
  enterAt = 0,
  size = 170,
  color = c.paper,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = usePop(enterAt, 18);
  if (frame < enterAt) return null;
  return (
    <div
      style={{
        fontFamily: FONT_HEAD,
        fontSize: size,
        lineHeight: 0.92,
        color,
        letterSpacing: size * 0.01,
        textShadow: '0 8px 30px rgba(0,0,0,0.8)',
        opacity: Math.min(1, p * 2),
        transform: `scale(${interpolate(p, [0, 1], [1.4, 1])})`,
        transformOrigin: 'left center',
        whiteSpace: 'pre-line',
        ...style,
      }}
    >
      {caps(text)}
    </div>
  );
};

/** Bebas Neue has caps only: lowercase "i" would show as dotless "I", so uppercase the Turkish way first. */
export const caps = (s: string) => s.toLocaleUpperCase('tr-TR');

/** Little live waveform while someone talks. */
export const Waveform: React.FC<{ active: boolean; color?: string; bars?: number; height?: number }> = ({ active, color = c.yellow, bars = 7, height = 44 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height }}>
      {Array.from({ length: bars }, (_, i) => {
        const h = active ? 0.25 + 0.75 * Math.abs(Math.sin(frame * 0.45 + i * 1.7) * hash(i + Math.floor(frame / 3))) : 0.15;
        return <div key={i} style={{ width: 8, height: height * h, borderRadius: 4, background: color }} />;
      })}
    </div>
  );
};

/** Evidence card: source line in mono, the fact big; optional yellow marker sweep at `markAt`. */
export const ClueCard: React.FC<{ source: string; text: string; enterAt?: number; markAt?: number; width?: number; size?: number; rotate?: number; style?: React.CSSProperties }> = ({
  source,
  text,
  enterAt = 0,
  markAt,
  width = 900,
  size = 54,
  rotate = -1.5,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = usePop(enterAt, 14);
  const mark = markAt === undefined ? 0 : interpolate(frame, [markAt, markAt + 14], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (frame < enterAt) return null;
  return (
    <div
      style={{
        width,
        boxSizing: 'border-box',
        padding: '26px 34px 30px',
        background: NOIR.doc,
        color: NOIR.docInk,
        fontFamily: FONT_MONO,
        boxShadow: '0 24px 50px rgba(0,0,0,0.7)',
        borderLeft: `14px solid ${c.coral}`,
        opacity: Math.min(1, p * 2),
        transform: `rotate(${rotate}deg) translateY(${interpolate(p, [0, 1], [-160, 0])}px)`,
        ...style,
      }}
    >
      <div style={{ fontSize: Math.round(size * 0.52), fontWeight: 700, opacity: 0.6 }}>{source}</div>
      <div style={{ marginTop: 8, fontSize: size, fontWeight: 700, lineHeight: 1.15 }}>
        <span
          style={{
            backgroundImage: `linear-gradient(${c.yellow}, ${c.yellow})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${mark}% 100%`,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

/** Countdown ring with the seconds left in the middle; turns red under 4. */
export const Countdown: React.FC<{ from: number; frames: number; seconds: number; size?: number }> = ({ from, frames, seconds, size = 150 }) => {
  const frame = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (frame - from) / frames));
  const left = Math.ceil(seconds * (1 - t));
  const r = size / 2 - 10;
  const len = 2 * Math.PI * r;
  const col = left <= 3 ? '#ff3b30' : c.paper;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(5,4,7,0.7)" stroke="rgba(243,230,196,0.18)" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={10} strokeDasharray={len} strokeDashoffset={len * t} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEAD, fontSize: size * 0.5, color: col, paddingTop: 6 }}>
        {left}
      </div>
    </div>
  );
};
