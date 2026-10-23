import React from 'react';
import { Audio, interpolate, Sequence, staticFile, useVideoConfig } from 'remotion';
import { hasStaticFile } from './ClipCard';
import { MUSIC_VOLUME } from './mix';

/**
 * Background music under the whole reel (Deezer preview inside public/): soft fade in, fade out at the end.
 * Missing file → silent, so a render never breaks.
 */
export const Music: React.FC<{ src: string; from?: number; volume?: number; fadeOut?: number }> = ({
  src,
  from = 0,
  volume = MUSIC_VOLUME,
  fadeOut = 24,
}) => {
  const { durationInFrames, fps } = useVideoConfig();
  if (!hasStaticFile(src)) return null;
  return (
    <Sequence durationInFrames={durationInFrames} layout="none" name="müzik">
      <Audio
        src={staticFile(src)}
        trimBefore={Math.round(from * fps)}
        volume={(f) =>
          volume *
          interpolate(f, [0, 8, durationInFrames - fadeOut, durationInFrames], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    </Sequence>
  );
};
