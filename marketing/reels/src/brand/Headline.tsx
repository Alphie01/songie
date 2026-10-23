import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../themes/types';
import { fitText } from './fitText';
import { FONT_DISPLAY, SAFE, VIDEO } from './fonts';
import { useBrandFonts } from './motion';

type Props = {
  theme: AppTheme;
  text: string;
  enterAt?: number;
  maxWidth?: number;
  /** Start size; fitText shrinks it to fit two lines (never below minSize). */
  size?: number;
  minSize?: number;
  maxLines?: number;
  color?: string;
  /** Frames between words. */
  stagger?: number;
  style?: React.CSSProperties;
};

/** Baloo 2 ExtraBold headline, fitted to the safe width and popped in word by word. */
export const Headline: React.FC<Props> = ({
  theme,
  text,
  enterAt = 0,
  maxWidth = VIDEO.width - 2 * SAFE.side,
  size = 104,
  minSize = 48,
  maxLines = 2,
  color,
  stagger = 3,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useBrandFonts();
  const fit = ready ? fitText(text, maxWidth, size, minSize, { maxLines }) : { size, lines: [text] };
  let n = 0;
  return (
    <div
      style={{
        width: maxWidth,
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: fit.size,
        lineHeight: 1.02,
        letterSpacing: -0.5,
        color: color ?? theme.colors.ink,
        textAlign: 'center',
        visibility: ready ? 'visible' : 'hidden',
        ...style,
      }}
    >
      {fit.lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {line.split(' ').map((word, wi) => {
            const p = spring({ frame: frame - enterAt - stagger * n++, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  marginRight: wi < line.split(' ').length - 1 ? '0.25em' : 0,
                  opacity: Math.min(1, p * 1.5),
                  transform: `translateY(${interpolate(p, [0, 1], [0.45, 0])}em) scale(${interpolate(p, [0, 1], [0.7, 1])})`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
