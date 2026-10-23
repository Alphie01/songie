import React from 'react';
import { interpolate } from 'remotion';
import type { AppTheme } from '../themes/types';
import { FONT_DISPLAY } from './fonts';
import { usePop } from './motion';

type Props = {
  theme: AppTheme;
  text: string;
  bg?: string;
  color?: string;
  rotate?: number;
  enterAt?: number;
  /** Font size in px; padding and radius follow it. */
  size?: number;
  style?: React.CSSProperties;
};

/** Tilted pill sticker ("Kulağını aç", "+880"): 6 px ink outline, 8 px hard shadow, springs in with a bounce. */
export const Sticker: React.FC<Props> = ({ theme, text, bg, color, rotate = -6, enterAt = 0, size = 56, style }) => {
  const { ink } = theme.colors;
  const pop = usePop(enterAt);
  return (
    <div
      style={{
        display: 'inline-block',
        padding: `${Math.round(size * 0.22)}px ${Math.round(size * 0.5)}px ${Math.round(size * 0.16)}px`,
        border: `6px solid ${ink}`,
        borderRadius: 999,
        background: bg ?? theme.colors.pink,
        boxShadow: `8px 8px 0 ${ink}`,
        color: color ?? ink,
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        transform: `rotate(${interpolate(pop, [0, 1], [rotate - 14, rotate])}deg) scale(${pop})`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
