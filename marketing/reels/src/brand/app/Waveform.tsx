import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../../themes/types';

/** Bar heights from PlayView.tsx (EQ); the fourth bar is yellow. */
const EQ = [30, 70, 45, 100, 55, 85, 35, 60];
/** .song-eq[data-on] animation periods (ms, alternate). */
const PERIOD = (i: number) => ((i + 1) % 3 === 0 ? 860 : (i + 1) % 2 === 0 ? 520 : 700);

/** .song-eq: 120×30, gap 4, radius 3. While playing each bar breathes between 1 and 0.45 scaleY. */
export const Waveform: React.FC<{ theme: AppTheme; playing: boolean }> = ({ theme, playing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, width: 120, height: 30 }}>
      {EQ.map((h, i) => {
        // ease-in-out alternate: 1 → 0.45 → 1 over two periods
        const phase = (ms / PERIOD(i)) % 2;
        const t = phase < 1 ? phase : 2 - phase;
        const eased = (1 - Math.cos(Math.PI * t)) / 2;
        const scale = playing ? 1 - 0.55 * eased : 1;
        return (
          <i
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              borderRadius: 3,
              background: i === 3 ? theme.colors.yellow : theme.colors.pink,
              transform: `scaleY(${scale})`,
            }}
          />
        );
      })}
    </span>
  );
};
