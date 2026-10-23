import React from 'react';
import { AbsoluteFill, Composition, Still } from 'remotion';
import { BrandSheet, StoreShot } from './BrandSheet';
import { ColorStage } from './brand/ColorStage';
import { CtaCard } from './brand/CtaCard';
import { loadBrandFonts, VIDEO } from './brand/fonts';
import { songieTheme } from './themes/songie';
import { SongPlayScreen } from './brand/app/SongPlayScreen';
import { PhoneFrame } from './brand/PhoneFrame';
import { NeverAnswerScreen } from './brand/itiraf/NeverAnswerScreen';
import { NeverRevealScreen } from './brand/itiraf/NeverRevealScreen';
import { ConfessionsWriteScreen } from './brand/itiraf/ConfessionsWriteScreen';
import { ConfessionsGuessScreen } from './brand/itiraf/ConfessionsGuessScreen';
import { ConfessionsRevealScreen } from './brand/itiraf/ConfessionsRevealScreen';
import { ITIRAF_CORAL, itirafTheme } from './themes/itiraf';
import { demoFeed, demoScores } from './BrandSheet';
import { R1Challenge, R1_META, r1Schema } from './reels/R1Challenge';
import { R2RealGame, R2_META, r2Schema } from './reels/R2RealGame';
import { R3Winner, R3_META, r3Schema } from './reels/R3Winner';
import { I1Never, I1_META, i1Schema } from './reels/itiraf/I1Never';
import { I2NeverFlirt, I2_META, i2Schema } from './reels/itiraf/I2NeverFlirt';
import { I3Confessions, I3_META, i3Schema } from './reels/itiraf/I3Confessions';
import { I4ConfessionsFlirt, I4_META, i4Schema } from './reels/itiraf/I4ConfessionsFlirt';

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

/** Ben Hiç screens alone in the phone on the coral App Store stage, for checks against ItirafKosesi 01.png. */
const NeverPreview: React.FC<{ phase: 'answer' | 'reveal' }> = ({ phase }) => (
  <AbsoluteFill style={{ backgroundColor: ITIRAF_CORAL, alignItems: 'center', justifyContent: 'center' }}>
    <PhoneFrame theme={itirafTheme}>
      {phase === 'answer' ? (
        <NeverAnswerScreen theme={itirafTheme} />
      ) : (
        <NeverRevealScreen
          theme={itirafTheme}
          statement="Ben hiç eski sevgilimin sosyal medyasını gizlice incelemedim."
          category="Aşk ve ilişki"
          did={['Ece', 'Mert', 'Selin']}
          didnt={['Deniz', 'Burak', 'Onur']}
          lives={3}
          maxLives={5}
          you="didnt"
          doerLives={{ Ece: 2, Mert: 3, Selin: 0 }}
          eliminated={['Selin']}
          leader={{ name: 'Ece', count: 4 }}
          storyteller="Mert"
          avatarColors={{ Ece: '#3ee0a8', Mert: '#ffd23f', Selin: '#5ab8ff' }}
          enterAt={-60}
        />
      )}
    </PhoneFrame>
  </AbsoluteFill>
);

/** Gizli İtiraflar screens in the phone on the yellow App Store stage, for checks against ItirafKosesi 02.png. */
const ConfPreview: React.FC<{ phase: 'write' | 'guess' | 'reveal' }> = ({ phase }) => (
  <AbsoluteFill style={{ backgroundColor: itirafTheme.colors.yellow, alignItems: 'center', justifyContent: 'center' }}>
    <PhoneFrame theme={itirafTheme}>
      {phase === 'write' ? (
        <ConfessionsWriteScreen theme={itirafTheme} text="Yatmadan önce kapının kilitli olduğunu üç kez" caret isHost />
      ) : phase === 'guess' ? (
        <ConfessionsGuessScreen theme={itirafTheme} />
      ) : (
        <ConfessionsRevealScreen
          theme={itirafTheme}
          confession="Yatmadan önce kapının kilitli olduğunu üç kez kontrol etmeden uyuyamıyorum."
          topic="Yatmadan önce yaptığın garip bir ritüel"
          author="Kaan"
          selected="Mert"
          votes={{ Mert: 2, Deniz: 1, Kaan: 2, Bora: 1 }}
          correct={['Deniz', 'Zeynep']}
          reactions={{ yok: 2, bende: 3, efsane: 1, olamaz: 0 }}
          seconds={5}
          isHost
          enterAt={-60}
        />
      )}
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
    <Composition
      id={R3_META.id}
      component={R3Winner}
      schema={r3Schema}
      defaultProps={R3_META.defaultProps}
      durationInFrames={R3_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I1_META.id}
      component={I1Never}
      schema={i1Schema}
      defaultProps={I1_META.defaultProps}
      durationInFrames={I1_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I2_META.id}
      component={I2NeverFlirt}
      schema={i2Schema}
      defaultProps={I2_META.defaultProps}
      durationInFrames={I2_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I3_META.id}
      component={I3Confessions}
      schema={i3Schema}
      defaultProps={I3_META.defaultProps}
      durationInFrames={I3_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I4_META.id}
      component={I4ConfessionsFlirt}
      schema={i4Schema}
      defaultProps={I4_META.defaultProps}
      durationInFrames={I4_META.durationInFrames}
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
    <Still id="NeverAnswer" component={NeverPreview} defaultProps={{ phase: 'answer' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="NeverReveal" component={NeverPreview} defaultProps={{ phase: 'reveal' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="ConfWrite" component={ConfPreview} defaultProps={{ phase: 'write' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="ConfGuess" component={ConfPreview} defaultProps={{ phase: 'guess' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="ConfReveal" component={ConfPreview} defaultProps={{ phase: 'reveal' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still
      id="ItirafCtaCard"
      component={() => (
        <ColorStage theme={itirafTheme} color={ITIRAF_CORAL}>
          <CtaCard theme={itirafTheme} enterAt={-60} />
        </ColorStage>
      )}
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
