import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP, CLIPS, STOPS, clipShort } from './appTokens';

/** Progress bar (ProgressBar.tsx + .pb-*): pink fill up to the open stage, dividers, yellow stage label. */
export const StageBar: React.FC<{ theme: AppTheme; stage: number; fill?: number }> = ({ theme, stage, fill }) => {
  const c = theme.colors;
  const at = STOPS[stage]!;
  const width = fill ?? at;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          position: 'relative',
          height: 22,
          overflow: 'hidden',
          border: `${APP.bw}px solid ${c.ink}`,
          borderRadius: APP.pill,
          background: APP.ink2,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${width}%`, background: c.pink }} />
        {STOPS.slice(0, -1).map((stop) => (
          <span key={stop} style={{ position: 'absolute', top: 0, bottom: 0, left: `${stop}%`, width: 2, background: c.bg }} />
        ))}
      </div>
      <div style={{ position: 'relative', height: 22 }}>
        {/* The shipped app lets the first label hang left of the bar (App Store 02.png), so no lower clamp. */}
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: `min(calc(${at}% - 22px), calc(100% - 52px))`,
            padding: '2px 8px',
            borderRadius: 8,
            background: c.yellow,
            color: APP.ink2,
            fontSize: 13,
            fontWeight: 800,
            lineHeight: '18px',
            whiteSpace: 'nowrap',
          }}
        >
          {clipShort(CLIPS[stage]!)}
        </span>
      </div>
    </div>
  );
};
