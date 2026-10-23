import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from './appTokens';

/** .sg-play: 150 px pink disc, 4 px ink border, 0 9px 0 ink shadow, 62 px play/pause icon. `press` 0..1 sinks it like :active. */
export const PlayButton: React.FC<{ theme: AppTheme; playing: boolean; press?: number }> = ({ theme, playing, press = 0 }) => {
  const c = theme.colors;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 150,
        height: 150,
        border: `4px solid ${c.ink}`,
        borderRadius: '50%',
        boxShadow: `0 ${9 - 6 * press}px 0 ${c.ink}`,
        transform: `translateY(${6 * press}px)`,
        boxSizing: 'border-box',
        background: c.pink,
        color: APP.ink2,
      }}
    >
      <svg width={62} height={62} viewBox="0 0 24 24" aria-hidden="true">
        {playing ? (
          <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
        ) : (
          <path d="M8 5.5v13a.6.6 0 0 0 .9.5l10.4-6.5a.6.6 0 0 0 0-1L8.9 5a.6.6 0 0 0-.9.5z" fill="currentColor" />
        )}
      </svg>
    </div>
  );
};
