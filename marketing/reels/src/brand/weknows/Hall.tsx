import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { hasStaticFile } from '../ClipCard';
import { Grain } from '../casebook/Noir';
import { EASE } from '../casebook/Editorial';
import { FONT_DRAMA, FONT_SANS } from '../fonts';

/**
 * Secret Hitler look: the game's own palette (SecretHitler.dc.html: #1A1240 ground, liberal #5AB8FF, fascist
 * #FF8A5B, Ja! white, Nein black), an empty assembly hall at night, Playfair Display for the drama.
 */
export const SH = {
  ground: '#1a1240',
  deep: '#08061a',
  liberal: '#5ab8ff',
  fascist: '#ff8a5b',
  red: '#ff6b6b',
  bone: '#f1ece2',
  dim: '#a79fd0',
  lamp: '#7dff9a',
  M: 72,
  W: 1080 - 144,
} as const;

export const HALL_IMG = 'assets/weknows/sh-hall.png';

/** The hall: slow push toward the speaker's desk; the green lamp breathes. */
export const Hall: React.FC<{ frames?: number; dim?: number; push?: [number, number]; tint?: string }> = ({ frames = 300, dim = 0.7, push = [1.04, 1.12], tint }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, frames], push, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lamp = 0.85 + 0.15 * Math.sin(frame / 9) * Math.sin(frame / 23);
  return (
    <AbsoluteFill style={{ backgroundColor: SH.deep, overflow: 'hidden' }}>
      {hasStaticFile(HALL_IMG) && (
        <Img
          src={staticFile(HALL_IMG)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 50%', transform: `scale(${s})`, transformOrigin: '65% 55%', filter: `brightness(${dim})` }}
        />
      )}
      <AbsoluteFill style={{ opacity: 0.25 * lamp, background: 'radial-gradient(circle at 66% 50%, rgba(125,255,154,0.45), transparent 22%)', mixBlendMode: 'screen' }} />
      {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: 'multiply' }} />}
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

/** The moderator's line in Playfair italic, words fading up one by one. */
export const Drama: React.FC<{ text: string; at: number; frames: number; size?: number; color?: string; italic?: boolean; style?: React.CSSProperties }> = ({
  text,
  at,
  frames,
  size = 80,
  color = SH.bone,
  italic = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const step = Math.max(1, (frames * 0.85) / words.length);
  return (
    <div style={{ fontFamily: FONT_DRAMA, fontStyle: italic ? 'italic' : 'normal', fontWeight: 500, fontSize: size, lineHeight: 1.08, letterSpacing: -size * 0.01, color, ...style }}>
      {words.map((w, i) => {
        const t = interpolate(frame, [at + i * step, at + i * step + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
        return (
          <span key={i} style={{ display: 'inline-block', opacity: t, transform: `translateY(${(1 - t) * 18}px)` }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};

export const ShUi: React.FC<{ children: React.ReactNode; size?: number; weight?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 30, weight = 600, color = SH.bone, style }) => (
  <div style={{ fontFamily: FONT_SANS, fontWeight: weight, fontSize: size, lineHeight: 1.2, color, ...style }}>{children}</div>
);
