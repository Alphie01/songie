import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from './appTokens';

export type ScoreRow = { name: string; score: number; color: string; me?: boolean };

/** .song-strip: bottom score cards, 2 px ink border, radius 12; `color` is the card fill (leader mint, you yellow, rest panel). */
export const Scoreboard: React.FC<{ theme: AppTheme; rows: ScoreRow[] }> = ({ theme, rows }) => {
  const c = theme.colors;
  const dark = new Set([c.panel, c.bg, c.bgDeep, c.ink]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`, gap: 6 }}>
      {rows.map((r) => (
        <div
          key={r.name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 0,
            padding: '7px 4px',
            border: `2px solid ${c.ink}`,
            borderRadius: 12,
            background: r.color,
            color: dark.has(r.color) ? c.paper : APP.ink2,
            fontSize: 12,
            fontWeight: 800,
            textAlign: 'center',
          }}
        >
          <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 16, lineHeight: 1.2 }}>
            {r.score.toLocaleString('tr-TR')}
          </span>
        </div>
      ))}
    </div>
  );
};
