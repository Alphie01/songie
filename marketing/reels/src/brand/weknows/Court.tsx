import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { hasStaticFile } from '../ClipCard';
import { Grain } from '../casebook/Noir';
import { EASE } from '../casebook/Editorial';
import { FONT_COURT, FONT_SANS } from '../fonts';

/**
 * Entrika look: a candlelit palace chamber (gold coins, two face-down cards), the game's own colours for roles,
 * Cormorant for the narrator, Inter Tight for facts.
 */
export const IN = { deep: '#0c0705', gold: '#ffd23f', ember: '#ffb46b', bone: '#f3ead8', dim: '#c7b9a0', red: '#ff6b6b', M: 72, W: 1080 - 144 } as const;
export const COURT_IMG = 'assets/weknows/in-court.png';

/** The chamber: slow push toward the table; the candles breathe. */
export const Court: React.FC<{ frames?: number; dim?: number; push?: [number, number] }> = ({ frames = 300, dim = 0.75, push = [1.04, 1.14] }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, frames], push, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const flick = 0.9 + 0.1 * Math.sin(frame / 3.1) * Math.sin(frame / 7.3);
  return (
    <AbsoluteFill style={{ backgroundColor: IN.deep, overflow: 'hidden' }}>
      {hasStaticFile(COURT_IMG) && (
        <Img
          src={staticFile(COURT_IMG)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 60%', transform: `scale(${s})`, transformOrigin: '55% 75%', filter: `brightness(${dim * flick})` }}
        />
      )}
      <AbsoluteFill style={{ opacity: 0.22 * flick, background: 'radial-gradient(circle at 55% 72%, rgba(255,180,107,0.5), transparent 30%)', mixBlendMode: 'screen' }} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

/** The narrator's line in Cormorant italic, words rising out of a mask. */
export const CourtLine: React.FC<{ text: string; at: number; frames: number; size?: number; color?: string; style?: React.CSSProperties }> = ({ text, at, frames, size = 76, color = IN.bone, style }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const step = Math.max(1, (frames * 0.85) / words.length);
  return (
    <div style={{ fontFamily: FONT_COURT, fontStyle: 'italic', fontWeight: 600, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.005, color, ...style }}>
      {words.map((w, i) => {
        const t = interpolate(frame, [at + i * step, at + i * step + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: size * 0.14, marginBottom: -size * 0.14 }}>
            <span style={{ display: 'inline-block', transform: `translateY(${(1 - t) * 105}%)` }}>{w}</span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};

export const InUi: React.FC<{ children: React.ReactNode; size?: number; weight?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 30, weight = 600, color = IN.bone, style }) => (
  <div style={{ fontFamily: FONT_SANS, fontWeight: weight, fontSize: size, lineHeight: 1.2, color, ...style }}>{children}</div>
);
