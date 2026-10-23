import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { AppTheme } from '../themes/types';

/** Deterministic 0..1 from an integer (no Math.random, so every render is identical). */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const HEART = 'M50 88C20 66 4 50 4 31 4 16 16 6 29 6c9 0 16 5 21 12 5-7 12-12 21-12 13 0 25 10 25 25 0 19-16 35-46 57Z';

/** Hearts drifting up through the frame, tinted with the brand pinks. */
const Hearts: React.FC<{ theme: AppTheme; count?: number }> = ({ theme, count = 14 }) => {
  const frame = useCurrentFrame();
  const c = theme.colors;
  const tints = [c.pink, c.coral, c.lilac];
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const size = 40 + rand(i) * 70;
        const speed = 1.6 + rand(i + 40) * 2.2;
        const y = 2000 - ((frame * speed + rand(i + 80) * 2100) % 2200);
        const x = 40 + rand(i + 120) * 1000 + Math.sin((frame + i * 20) / 22) * 24;
        const s = size / 100;
        return (
          <path
            key={i}
            d={HEART}
            fill={tints[i % tints.length]}
            fillOpacity={0.18 + rand(i + 160) * 0.3}
            transform={`translate(${x} ${y}) rotate(${Math.sin((frame + i * 13) / 30) * 18}) scale(${s})`}
          />
        );
      })}
    </svg>
  );
};

/**
 * Night version of the stage for +18 reels: deep purple (bgDeep) with soft neon glows in the accent color,
 * drifting hearts and an outlined star — still only brand tokens.
 */
export const NightStage: React.FC<{ theme: AppTheme; accent: string; hearts?: boolean; children?: React.ReactNode }> = ({
  theme,
  accent,
  hearts = true,
  children,
}) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const pulse = 0.85 + Math.sin(frame / 18) * 0.15;
  return (
    <AbsoluteFill style={{ backgroundColor: c.bgDeep, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 38% at 18% 22%, ${accent}${Math.round(0x66 * pulse).toString(16).padStart(2, '0')} 0%, transparent 70%),
            radial-gradient(55% 35% at 85% 78%, ${c.coral}55 0%, transparent 70%),
            radial-gradient(70% 45% at 50% 105%, ${c.pink}44 0%, transparent 70%)`,
        }}
      />
      {hearts && <Hearts theme={theme} />}
      <svg width={64} height={64} viewBox="0 0 64 64" style={{ position: 'absolute', left: 50, top: 58 }} aria-hidden="true">
        <path
          d="M32 4l8 18 19 2-14 13 4 19-17-10-17 10 4-19L5 24l19-2z"
          fill="none"
          stroke={c.paper}
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </AbsoluteFill>
  );
};
