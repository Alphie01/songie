import React from 'react';
import { SFX_VOLUME } from './mix';
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import type { AppTheme } from '../themes/types';

type Props = {
  theme: AppTheme;
  /** Stage color being left; fills the screen under the wipe. */
  from: string;
  /** Stage color of the next scene; the next scene should start at `at + durationInFrames` on this color. */
  to: string;
  /** Frame the wipe starts. */
  at: number;
  durationInFrames?: number;
};

/** public/sfx/whoosh.wav is 0.4 s = 12 frames at 30 fps. */
const WHOOSH_FRAMES = 12;

const Wipe: React.FC<{ theme: AppTheme; from: string; to: string; d: number }> = ({ theme, from, to, d }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, d - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  // A 25° edge that travels from off-screen left to off-screen right (covers 1080×1920 fully at p = 1).
  const slant = 1920 * Math.tan((25 * Math.PI) / 180);
  const x = interpolate(p, [0, 1], [-slant - 40, 1080 + 40]);
  const edge = `M${x + slant} 0L${x} 1920`;
  const area = `M-60 0H${x + slant}L${x} 1920H-60Z`;
  return (
    <AbsoluteFill style={{ backgroundColor: from }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" aria-hidden="true">
        <path d={area} transform="translate(18 0)" fill={theme.colors.ink} />
        <path d={area} fill={to} />
        <path d={edge} stroke={theme.colors.ink} strokeWidth={6} />
      </svg>
    </AbsoluteFill>
  );
};

/** Diagonal color wipe between two stages, with an ink edge and hard shadow, plus the whoosh sound. */
export const ColorWipe: React.FC<Props> = ({ theme, from, to, at, durationInFrames = 8 }) => (
  <>
    <Sequence from={at} durationInFrames={durationInFrames} layout="none" name="ColorWipe">
      <Wipe theme={theme} from={from} to={to} d={durationInFrames} />
    </Sequence>
    <Sequence from={at} durationInFrames={WHOOSH_FRAMES} layout="none" name="whoosh">
      <Audio src={staticFile('sfx/whoosh.wav')} volume={SFX_VOLUME} />
    </Sequence>
  </>
);
