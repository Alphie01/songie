import React from 'react';
import type { AppTheme } from '../../themes/types';
import { ITIRAF_CORAL } from '../../themes/itiraf';

const CORAL_BUBBLE = 'M26 30H70Q80 30 80 40V62Q80 72 70 72H43L31 87L32.5 72H26Q16 72 16 62V40Q16 30 26 30Z';
const HEART =
  'M48 61C40.5 55.6 36.5 51.4 36.5 46.6C36.5 43.1 39 40.6 42.2 40.6C44.6 40.6 46.6 41.9 48 44C49.4 41.9 51.4 40.6 53.8 40.6C57 40.6 59.5 43.1 59.5 46.6C59.5 51.4 55.5 55.6 48 61Z';

/**
 * App icon (apps/itiraf_kosesi/assets/icon/icon.png) redrawn on a transparent ground: small mint bubble with three
 * dots behind a coral speech bubble holding a yellow heart, thick ink outline and a hard ink shadow.
 */
export const ItirafLogo: React.FC<{ theme: AppTheme; size?: number }> = ({ theme, size = 260 }) => {
  const c = theme.colors;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(-7 70 22)">
        <rect x={54} y={12} width={33} height={22} rx={6} fill={c.ink} stroke={c.ink} strokeWidth={5} transform="translate(3.5 4.5)" />
        <rect x={54} y={12} width={33} height={22} rx={6} fill={c.mint} stroke={c.ink} strokeWidth={5} />
        {[63, 70.5, 78].map((x) => (
          <circle key={x} cx={x} cy={23} r={2.6} fill={c.ink} />
        ))}
      </g>
      <g transform="rotate(-6 48 56)">
        <path d={CORAL_BUBBLE} fill={c.ink} stroke={c.ink} strokeWidth={5} strokeLinejoin="round" transform="translate(3.5 4.5)" />
        <path d={CORAL_BUBBLE} fill={ITIRAF_CORAL} stroke={c.ink} strokeWidth={5} strokeLinejoin="round" />
        <path d={HEART} fill={c.yellow} stroke={c.ink} strokeWidth={3.2} strokeLinejoin="round" transform="translate(48 51) scale(1.25) translate(-48 -51)" />
      </g>
    </svg>
  );
};
