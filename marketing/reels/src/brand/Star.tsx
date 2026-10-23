import React from 'react';
import type { AppTheme } from '../themes/types';

/** Outlined five-point star from the App Store shots' top-left corner: paper fill, thick ink line. */
export const Star: React.FC<{ theme: AppTheme; size?: number; fill?: string; rotate?: number; style?: React.CSSProperties }> = ({
  theme,
  size = 84,
  fill,
  rotate = -6,
  style,
}) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 44 : 19;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${53 + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden="true">
      <polygon points={pts} fill={fill ?? theme.colors.paper} stroke={theme.colors.ink} strokeWidth={7} strokeLinejoin="round" />
    </svg>
  );
};
