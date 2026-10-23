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
import { MostLikelyVoteScreen } from './brand/itiraf/MostLikelyVoteScreen';
import { MostLikelyResultScreen } from './brand/itiraf/MostLikelyResultScreen';
import { RedFlagVoteScreen } from './brand/itiraf/RedFlagVoteScreen';
import { RedFlagRevealScreen } from './brand/itiraf/RedFlagRevealScreen';
import { ParanoiaEnvelopeScreen } from './brand/itiraf/ParanoiaEnvelopeScreen';
import { ParanoiaAnswerScreen } from './brand/itiraf/ParanoiaAnswerScreen';
import { ParanoiaRevealScreen } from './brand/itiraf/ParanoiaRevealScreen';
import { ParanoiaWaitingScreen } from './brand/itiraf/ParanoiaWaitingScreen';
import { BottleTableScreen } from './brand/itiraf/BottleTableScreen';
import { BottleChoiceScreen } from './brand/itiraf/BottleChoiceScreen';
import { BottleTaskScreen } from './brand/itiraf/BottleTaskScreen';
import { ITIRAF_CORAL, itirafTheme } from './themes/itiraf';
import { demoFeed, demoScores } from './BrandSheet';
import { R1Challenge, R1_META, r1Schema } from './reels/R1Challenge';
import { R2RealGame, R2_META, r2Schema } from './reels/R2RealGame';
import { R3Winner, R3_META, r3Schema } from './reels/R3Winner';
import { I1Never, I1_META, i1Schema } from './reels/itiraf/I1Never';
import { I2NeverFlirt, I2_META, i2Schema } from './reels/itiraf/I2NeverFlirt';
import { I3Confessions, I3_META, i3Schema } from './reels/itiraf/I3Confessions';
import { I4ConfessionsFlirt, I4_META, i4Schema } from './reels/itiraf/I4ConfessionsFlirt';
import { I5MostLikely, I5_META, i5Schema } from './reels/itiraf/I5MostLikely';
import { I6MostLikelyFlirt, I6_META, i6Schema } from './reels/itiraf/I6MostLikelyFlirt';
import { I7RedFlag, I7_META, i7Schema } from './reels/itiraf/I7RedFlag';
import { I8RedFlagFlirt, I8_META, i8Schema } from './reels/itiraf/I8RedFlagFlirt';
import { I9Paranoia, I9_META, I10_META, i9Schema } from './reels/itiraf/I9Paranoia';
import { I11Bottle, I11_META, I12_META, i11Schema } from './reels/itiraf/I11Bottle';
import { C1Case, C1_META, c1Schema } from './reels/casebook/C1Case';
import { C2Puzzle, C2_META, c2Schema, puzzleBeats } from './reels/casebook/C2Puzzle';
import { C3Interrogation, C3_META, c3Schema, interrogationBeats } from './reels/casebook/C3Interrogation';
import { C4Squad, C4_META, c4Schema } from './reels/casebook/C4Squad';

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

/** Aramızdaki En screens in the phone on the mint App Store stage, for checks against ItirafKosesi 03.png. */
const MostLikelyPreview: React.FC<{ phase: 'vote' | 'result' }> = ({ phase }) => (
  <AbsoluteFill style={{ backgroundColor: itirafTheme.colors.mint, alignItems: 'center', justifyContent: 'center' }}>
    <PhoneFrame theme={itirafTheme}>
      {phase === 'vote' ? (
        <MostLikelyVoteScreen theme={itirafTheme} />
      ) : (
        <MostLikelyResultScreen
          theme={itirafTheme}
          votes={{ Kaan: 3, Mert: 2, Bora: 1 }}
          ballots={[
            { voter: 'Ece', target: 'Kaan' },
            { voter: 'Deniz', target: 'Kaan' },
            { voter: 'Zeynep', target: 'Kaan' },
            { voter: 'Kaan', target: 'Mert' },
            { voter: 'Bora', target: 'Mert' },
            { voter: 'Mert', target: 'Bora' },
          ]}
          correctGuessers={['Ece', 'Deniz']}
          enterAt={-60}
        />
      )}
    </PhoneFrame>
  </AbsoluteFill>
);

/** Red Flag screens in the phone on the pink App Store stage, for checks against ItirafKosesi 04.png. */
const RedFlagPreview: React.FC<{ phase: 'vote' | 'reveal' }> = ({ phase }) => (
  <AbsoluteFill style={{ backgroundColor: itirafTheme.colors.pink, alignItems: 'center', justifyContent: 'center' }}>
    <PhoneFrame theme={itirafTheme}>
      {phase === 'vote' ? <RedFlagVoteScreen theme={itirafTheme} /> : <RedFlagRevealScreen theme={itirafTheme} enterAt={-60} />}
    </PhoneFrame>
  </AbsoluteFill>
);

/** Gizlilik Esas (Paranoya) screens in the phone on the sky App Store stage, for checks against ItirafKosesi 05.png. */
const ParanoiaPreview: React.FC<{ phase: 'envelope' | 'answer' | 'waiting' | 'reveal' }> = ({ phase }) => (
  <AbsoluteFill style={{ backgroundColor: itirafTheme.colors.sky, alignItems: 'center', justifyContent: 'center' }}>
    <PhoneFrame theme={itirafTheme}>
      {phase === 'envelope' ? (
        <ParanoiaEnvelopeScreen theme={itirafTheme} />
      ) : phase === 'answer' ? (
        <ParanoiaAnswerScreen theme={itirafTheme} selected="Kaan" />
      ) : phase === 'waiting' ? (
        <ParanoiaWaitingScreen theme={itirafTheme} mine={[{ question: 'Aramızda kim eski sevgilisinin profiline hâlâ bakıyor?', answer: 'Kaan' }]} />
      ) : (
        <ParanoiaRevealScreen theme={itirafTheme} />
      )}
    </PhoneFrame>
  </AbsoluteFill>
);

/** Şişe Çevirmece screens in the phone on the lilac App Store stage, for checks against ItirafKosesi 06.png. */
const BottlePreview: React.FC<{ phase: 'table' | 'choice' | 'task' }> = ({ phase }) => (
  <AbsoluteFill style={{ backgroundColor: itirafTheme.colors.lilac, alignItems: 'center', justifyContent: 'center' }}>
    <PhoneFrame theme={itirafTheme}>
      {phase === 'table' ? (
        <BottleTableScreen theme={itirafTheme} />
      ) : phase === 'choice' ? (
        <BottleChoiceScreen theme={itirafTheme} />
      ) : (
        <BottleTaskScreen theme={itirafTheme} votes={{ yes: 3, no: 1, voters: 5, myVote: true, seconds: 14 }} />
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
    <Composition
      id={I5_META.id}
      component={I5MostLikely}
      schema={i5Schema}
      defaultProps={I5_META.defaultProps}
      durationInFrames={I5_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I6_META.id}
      component={I6MostLikelyFlirt}
      schema={i6Schema}
      defaultProps={I6_META.defaultProps}
      durationInFrames={I6_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I7_META.id}
      component={I7RedFlag}
      schema={i7Schema}
      defaultProps={I7_META.defaultProps}
      durationInFrames={I7_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I8_META.id}
      component={I8RedFlagFlirt}
      schema={i8Schema}
      defaultProps={I8_META.defaultProps}
      durationInFrames={I8_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I9_META.id}
      component={I9Paranoia}
      schema={i9Schema}
      defaultProps={I9_META.defaultProps}
      durationInFrames={I9_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I10_META.id}
      component={I9Paranoia}
      schema={i9Schema}
      defaultProps={I10_META.defaultProps}
      durationInFrames={I10_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I11_META.id}
      component={I11Bottle}
      schema={i11Schema}
      defaultProps={I11_META.defaultProps}
      durationInFrames={I11_META.durationInFrames}
      {...video}
    />
    <Composition
      id={I12_META.id}
      component={I11Bottle}
      schema={i11Schema}
      defaultProps={I12_META.defaultProps}
      durationInFrames={I12_META.durationInFrames}
      {...video}
    />
    <Composition
      id={C1_META.id}
      component={C1Case}
      schema={c1Schema}
      defaultProps={C1_META.defaultProps}
      durationInFrames={C1_META.durationInFrames}
      {...video}
    />
    <Composition
      id={C2_META.id}
      component={C2Puzzle}
      schema={c2Schema}
      defaultProps={C2_META.defaultProps}
      durationInFrames={puzzleBeats(C2_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: puzzleBeats(props.voices).total })}
      {...video}
    />
    <Composition
      id={C3_META.id}
      component={C3Interrogation}
      schema={c3Schema}
      defaultProps={C3_META.defaultProps}
      durationInFrames={interrogationBeats(C3_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: interrogationBeats(props.voices).total })}
      {...video}
    />
    <Composition
      id={C4_META.id}
      component={C4Squad}
      schema={c4Schema}
      defaultProps={C4_META.defaultProps}
      durationInFrames={C4_META.durationInFrames}
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
    <Still id="MLVote" component={MostLikelyPreview} defaultProps={{ phase: 'vote' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="MLResult" component={MostLikelyPreview} defaultProps={{ phase: 'result' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="RFVote" component={RedFlagPreview} defaultProps={{ phase: 'vote' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="RFReveal" component={RedFlagPreview} defaultProps={{ phase: 'reveal' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="PNEnvelope" component={ParanoiaPreview} defaultProps={{ phase: 'envelope' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="PNAnswer" component={ParanoiaPreview} defaultProps={{ phase: 'answer' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="PNWaiting" component={ParanoiaPreview} defaultProps={{ phase: 'waiting' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="PNReveal" component={ParanoiaPreview} defaultProps={{ phase: 'reveal' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="BTTable" component={BottlePreview} defaultProps={{ phase: 'table' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="BTChoice" component={BottlePreview} defaultProps={{ phase: 'choice' as const }} width={VIDEO.width} height={VIDEO.height} />
    <Still id="BTTask" component={BottlePreview} defaultProps={{ phase: 'task' as const }} width={VIDEO.width} height={VIDEO.height} />
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
