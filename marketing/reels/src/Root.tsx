import React from 'react';
import { AbsoluteFill, Composition, Still } from 'remotion';
import { BrandSheet, StoreShot } from './BrandSheet';
import { ColorStage } from './brand/ColorStage';
import { CtaCard } from './brand/CtaCard';
import { loadBrandFonts, VIDEO } from './brand/fonts';
import { songieTheme } from './themes/songie';
import { SongPlayScreen } from './brand/app/SongPlayScreen';
import { PhoneFrame } from './brand/PhoneFrame';
import { demoFeed, demoScores } from './BrandSheet';
import { R1Challenge, R1_META, r1Schema } from './reels/R1Challenge';
import { R2RealGame, R2_META, r2Schema } from './reels/R2RealGame';

// Load Baloo 2 / Nunito once for every composition (holds the render until they are ready).
void loadBrandFonts();

const Hello: React.FC = () => <AbsoluteFill style={{ backgroundColor: songieTheme.colors.bg }} />;

/** The play screen alone in the phone, for side-by-side checks against App Store 02.png / 03.png. */
const PlayScreenPreview: React.FC<{ stage?: number; guess?: string; suggestions?: string[]; selected?: number; bg?: string }> = ({
  stage = 0,
  bg = songieTheme.colors.yellow,
  ...rest
}) => (
  <AbsoluteFill style={{ backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <PhoneFrame theme={songieTheme}>
      <SongPlayScreen theme={songieTheme} stage={stage} playing={false} timer={14} feed={demoFeed(songieTheme)} scores={demoScores(songieTheme)} {...rest} />
    </PhoneFrame>
  </AbsoluteFill>
);

const video = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Hello" component={Hello} durationInFrames={VIDEO.fps} {...video} />
    <Composition id="BrandSheet" component={BrandSheet} durationInFrames={3 * VIDEO.fps} defaultProps={{ theme: songieTheme }} {...video} />
    <Composition id="StoreShot" component={StoreShot} durationInFrames={VIDEO.fps} defaultProps={{ theme: songieTheme }} {...video} />
    <Composition
      id={R1_META.id}
      component={R1Challenge}
      schema={r1Schema}
      defaultProps={R1_META.defaultProps}
      durationInFrames={R1_META.durationInFrames}
      {...video}
    />
    <Composition
      id={R2_META.id}
      component={R2RealGame}
      schema={r2Schema}
      defaultProps={R2_META.defaultProps}
      durationInFrames={R2_META.durationInFrames}
      {...video}
    />
    <Still id="SongPlayScreen" component={PlayScreenPreview} width={VIDEO.width} height={VIDEO.height} />
    <Still
      id="SongPlayScreenGuess"
      component={PlayScreenPreview}
      defaultProps={{ stage: 1, guess: 'Tarkan', suggestions: ['Tarkan – Şımarık', 'Tarkan – Kuzu Kuzu', 'Tarkan – Dudu'], selected: 1, bg: songieTheme.colors.mint }}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Still
      id="CtaCard"
      component={() => (
        <ColorStage theme={songieTheme} color={songieTheme.colors.pink}>
          <CtaCard theme={songieTheme} enterAt={-60} />
        </ColorStage>
      )}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
