import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { AppTheme } from '../themes/types';
import { Star } from './Star';

type Props = {
  theme: AppTheme;
  color: string;
  /** Hide the lower shapes (e.g. when a phone covers them anyway). */
  shapes?: boolean;
  children?: React.ReactNode;
};

/** Tinted shape with a 6 px ink outline drawn last, so the tint never covers the line. */
const Shape: React.FC<{ d: string; color: string; tint: string; alpha: number; ink: string; transform?: string }> = ({
  d,
  color,
  tint,
  alpha,
  ink,
  transform,
}) => (
  <g transform={transform}>
    <path d={d} fill={color} />
    <path d={d} fill={tint} fillOpacity={alpha} />
    <path d={d} fill="none" stroke={ink} strokeWidth={6} strokeLinejoin="round" />
  </g>
);

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const roundRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
const WAVE = 'M-20 1790C120 1730 230 1730 360 1785S600 1850 740 1790 960 1730 1100 1780V1940H-20Z';

/**
 * Flat stage color like the App Store shots: outlined star top left; lower down a light blob on the left,
 * a darker tilted block on the right, a squiggle, and a wavy band along the bottom, all with 6 px ink lines.
 * Tints are the stage color under paper 28% / ink 13% (sampled from 02.png), so only brand tokens are used.
 */
export const ColorStage: React.FC<Props> = ({ theme, color, shapes = true, children }) => {
  const { ink, paper } = theme.colors;
  const light = { color, tint: paper, alpha: 0.28, ink };
  return (
    <AbsoluteFill style={{ backgroundColor: color, overflow: 'hidden' }}>
      {shapes && (
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <Shape d={circle(70, 1190, 215)} {...light} />
          <Shape d={roundRect(900, 1440, 360, 420, 40)} color={color} tint={ink} alpha={0.13} ink={ink} transform="rotate(14 1010 1640)" />
          <path d="M958 1188c14-30 26-30 34 0s20 30 34-2" fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" />
          <Shape d={WAVE} {...light} />
        </svg>
      )}
      <Star theme={theme} style={{ position: 'absolute', left: 50, top: 58 }} />
      {children}
    </AbsoluteFill>
  );
};
