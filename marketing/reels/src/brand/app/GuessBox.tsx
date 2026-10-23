import React from 'react';
import type { AppTheme } from '../../themes/types';
import { FONT_DISPLAY } from '../fonts';
import { APP } from './appTokens';

type Props = {
  theme: AppTheme;
  guess?: string;
  /** Search hits shown above the box (03.png); `selected` gets the cream row. */
  suggestions?: string[];
  selected?: number;
  /** Caret blink: pass false on odd beats. */
  caret?: boolean;
  skipLabel?: string;
};

/** .sg-answer: white search box ("Şarkıyı bul") + yellow "Pas" button, with the suggestion list (.guess-list). */
export const GuessBox: React.FC<Props> = ({ theme, guess, suggestions, selected, caret = false, skipLabel = 'Pas' }) => {
  const c = theme.colors;
  const box: React.CSSProperties = {
    minHeight: 58,
    border: `${APP.bw}px solid ${c.ink}`,
    borderRadius: 18,
    boxSizing: 'border-box',
    fontFamily: FONT_DISPLAY,
    fontSize: 19,
    display: 'flex',
    alignItems: 'center',
  };
  const list = suggestions && suggestions.length > 0 && (
    <div
      style={{
        position: 'absolute',
        zIndex: 40,
        left: 0,
        right: 0,
        bottom: 64,
        border: `${APP.bw}px solid ${c.ink}`,
        borderRadius: 16,
        overflow: 'hidden',
        background: c.paper,
        color: APP.ink2,
        boxShadow: `0 6px 0 ${c.ink}`,
      }}
    >
      {suggestions.map((s, i) => (
        <div
          key={s}
          style={{
            padding: '10px 14px',
            borderBottom: i === suggestions.length - 1 ? 0 : `2px solid ${APP.rowLine}`,
            background: i === selected ? c.cream : undefined,
            fontSize: 15,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {s}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div style={{ ...box, padding: '0 16px', background: c.paper, fontWeight: 700 }}>
          <span style={{ color: guess ? APP.ink2 : APP.placeholder, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {guess || 'Şarkıyı bul'}
          </span>
          {caret && <span style={{ width: 2, height: 24, marginLeft: 2, background: APP.ink2 }} />}
        </div>
        {list}
      </div>
      <div
        style={{
          ...box,
          flex: 'none',
          minWidth: 86,
          padding: '0 14px',
          justifyContent: 'center',
          background: c.yellow,
          color: APP.ink2,
          boxShadow: `0 5px 0 ${c.ink}`,
          fontWeight: 800,
        }}
      >
        {skipLabel}
      </div>
    </div>
  );
};
