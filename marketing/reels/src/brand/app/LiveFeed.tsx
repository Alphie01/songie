import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from './appTokens';

export type FeedLine = { name: string; text: string; points?: number; color: string };

/** .feed: "Canlı akış" card on panel-2 with a 3 px ink border. */
export const LiveFeed: React.FC<{ theme: AppTheme; lines: FeedLine[] }> = ({ theme, lines }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: 12,
      border: `${APP.bw}px solid ${theme.colors.ink}`,
      borderRadius: 18,
      background: APP.panel2,
    }}
  >
    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: APP.text3 }}>
      Canlı akış
    </span>
    {lines.map((l, i) => (
      <span key={i} style={{ fontSize: 14, fontWeight: 700, color: theme.colors.paper }}>
        <b style={{ fontWeight: 800, color: l.color }}>{l.name}</b> {l.text}
        {l.points !== undefined && (
          <span style={{ color: theme.colors.yellow }}> +{l.points.toLocaleString('tr-TR')}</span>
        )}
      </span>
    ))}
  </div>
);
