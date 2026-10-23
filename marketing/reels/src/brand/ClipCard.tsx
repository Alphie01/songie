import React from 'react';
import { getStaticFiles, interpolate, OffthreadVideo, staticFile } from 'remotion';
import type { AppTheme } from '../themes/types';
import { FONT_DISPLAY } from './fonts';
import { usePop } from './motion';

/** True when `src` (a path inside public/) was bundled. Studio and render list public/; elsewhere the list is empty. */
export function hasStaticFile(src: string | undefined): src is string {
  if (!src) return false;
  const files = getStaticFiles() ?? [];
  const name = src.replace(/^\/+/, '');
  return files.some((f) => f.name === name);
}

type Props = {
  theme: AppTheme;
  /** Path inside public/, e.g. "assets/r1-react.mp4" (public/assets → ../assets). */
  src?: string;
  rotate?: number;
  enterAt?: number;
  /** Source frame to start the clip from. */
  from?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

/** AI clip in a thick ink frame with a hard shadow. Missing clip → lilac "KLİP" placeholder, so renders never break. */
export const ClipCard: React.FC<Props> = ({
  theme,
  src,
  rotate = -3,
  enterAt = 0,
  from = 0,
  width = 640,
  height = 1000,
  style,
}) => {
  const { ink, lilac } = theme.colors;
  const pop = usePop(enterAt, 13);
  const ok = hasStaticFile(src);
  return (
    <div
      style={{
        width,
        height,
        boxSizing: 'border-box',
        border: `6px solid ${ink}`,
        borderRadius: 40,
        boxShadow: `12px 12px 0 ${ink}`,
        overflow: 'hidden',
        background: lilac,
        transform: `translateY(${interpolate(pop, [0, 1], [160, 0])}px) rotate(${rotate}deg) scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
        opacity: Math.min(1, pop * 2),
        ...style,
      }}
    >
      {ok ? (
        <OffthreadVideo
          src={staticFile(src)}
          trimBefore={from || undefined}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 120,
            color: ink,
          }}
        >
          KLİP
        </div>
      )}
    </div>
  );
};
