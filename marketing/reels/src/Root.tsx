import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import { VIDEO } from './brand/fonts';
import { songieTheme } from './themes/songie';

const Hello: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: songieTheme.colors.bg }} />
);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Hello"
    component={Hello}
    durationInFrames={VIDEO.fps}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
  />
);
