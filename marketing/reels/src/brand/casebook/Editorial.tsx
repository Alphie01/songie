import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { hasStaticFile } from '../ClipCard';
import { FONT_SANS, FONT_SERIF } from '../fonts';
import { Grain } from './Noir';

/**
 * Casebook editorial system for the ads: black, bone, one forensic-UV accent; Instrument Serif for the voice of
 * the case, Inter Tight for facts. A 72 px margin grid, left-aligned type, hard cuts, masked reveals, no bounce.
 */
export const ED = {
  black: '#000000',
  bone: '#ede8df',
  dim: 'rgba(237,232,223,0.58)',
  rule: 'rgba(237,232,223,0.22)',
  uv: '#8f72ff',
  M: 72,
  W: 1080 - 144,
} as const;

/** Expo-out: fast start, long settle (the only curve in the system). */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 over `frames` from `at` with the system curve. */
export function useIn(at: number, frames = 16): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
}

/** Full-bleed case photo: cool, low-saturation grade, a slow 4 % push. `pos` picks the crop of a landscape shot. */
export const Shot: React.FC<{ src: string; frames: number; pos?: string; from?: number; to?: number; bw?: boolean; origin?: string; style?: React.CSSProperties }> = ({
  src,
  frames,
  pos = 'center',
  from = 1,
  to = 1.05,
  bw = false,
  origin = 'center',
  style,
}) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, frames], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (!hasStaticFile(src)) return <AbsoluteFill style={{ background: '#111', ...style }} />;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: pos,
          transform: `scale(${s})`,
          transformOrigin: origin,
          filter: bw ? 'grayscale(1) contrast(1.15) brightness(0.9)' : 'saturate(0.55) contrast(1.1) brightness(0.95)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Bottom scrim so captions sit on black without a visible box. */
export const Scrim: React.FC<{ from?: number }> = ({ from = 52 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent ${from}%, rgba(0,0,0,0.88) ${from + 22}%, #000 100%)` }} />
);

/**
 * Words rise out of a mask one after another across `frames` (in step with a voice), set in the serif.
 * Words are laid out from the start, so line breaks never jump.
 */
export const Words: React.FC<{
  text: string;
  at: number;
  frames: number;
  size?: number;
  italic?: boolean;
  color?: string;
  font?: string;
  weight?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
}> = ({ text, at, frames, size = 68, italic = false, color = ED.bone, font = FONT_SERIF, weight = 400, lineHeight = 1.08, style }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const step = Math.max(1, (frames * 0.85) / words.length);
  return (
    <div style={{ fontFamily: font, fontStyle: italic ? 'italic' : 'normal', fontWeight: weight, fontSize: size, lineHeight, color, letterSpacing: font === FONT_SERIF ? -size * 0.01 : -size * 0.02, ...style }}>
      {words.map((w, i) => {
        const t = interpolate(frame, [at + i * step, at + i * step + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
            <span style={{ display: 'inline-block', transform: `translateY(${(1 - t) * 105}%)` }}>{w}</span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};

/** A single block that slides up out of a mask (labels, facts). */
export const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const t = useIn(at, 14);
  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <div style={{ transform: `translateY(${(1 - t) * 110}%)` }}>{children}</div>
    </div>
  );
};

/** Small fact line in Inter Tight (place, role, time): the "metadata" voice of the system. */
export const Fact: React.FC<{ children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties }> = ({
  children,
  size = 32,
  color = ED.dim,
  weight = 500,
  style,
}) => <div style={{ fontFamily: FONT_SANS, fontWeight: weight, fontSize: size, lineHeight: 1.25, color, letterSpacing: -size * 0.005, ...style }}>{children}</div>;

/** A hairline that draws from left to right. */
export const Rule: React.FC<{ at: number; width?: number; color?: string; thick?: number; style?: React.CSSProperties }> = ({ at, width = ED.W, color = ED.rule, thick = 2, style }) => {
  const t = useIn(at, 20);
  return <div style={{ width: width * t, height: thick, background: color, ...style }} />;
};

/** Brand bug in the top-left corner: UV square + "Casebook". */
export const Bug: React.FC = () => (
  <div style={{ position: 'absolute', left: ED.M, top: 236, display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 18, height: 18, background: ED.uv }} />
    <Fact size={30} weight={600} color={ED.bone}>
      Casebook
    </Fact>
  </div>
);

/** Black frame with a whisper of grain: the base of every editorial scene. */
export const Black: React.FC<{ children?: React.ReactNode; grain?: boolean }> = ({ children, grain = true }) => (
  <AbsoluteFill style={{ backgroundColor: ED.black, overflow: 'hidden' }}>
    {children}
    {grain && <Grain opacity={0.07} />}
  </AbsoluteFill>
);
