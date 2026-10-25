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
import { R4Solo, R4_META, r4Schema } from './reels/R4Solo';
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
import { C5Trailer, C5_META, c5Schema, trailerBeats } from './reels/casebook/C5Trailer';
import { C6Timeline, C6_META, c6Schema } from './reels/casebook/C6Timeline';
import { W1Night, W1_META, nightBeats, w1Schema } from './reels/weknows/W1Night';
import { W2WhoWolf, W2_META, w2Schema, whoBeats } from './reels/weknows/W2WhoWolf';
import { W3YouWolf, W3_META, w3Schema, youBeats } from './reels/weknows/W3YouWolf';
import { AG1Clue, AG1_META, AG2Assassin, AG2_META, AG3Leader, AG3_META, AG_SHOTS, agSchema } from './reels/weknows/A1Agents';
import { brightBeats } from './brand/weknows/Bright';
import { STORE_SIZES, StoreArt } from './store/StoreArt';
import { EN1Block, EN1_META, EN2Bluff, EN2_META, EN3Count, EN3_META, EN_SHOTS, en1Schema, en2Schema, en3Schema } from './reels/weknows/I1Intrigue';
import { H1Vote, H1_META, H2Liar, H2_META, H3You, H3_META, H_SHOTS, h1Schema, h2Schema, h3Schema, shotBeats } from './reels/weknows/H1Hitler';
import {
  KURT_PLAYERS,
  KurtDawn,
  KurtDiscuss,
  KurtNightSeer,
  KurtNightSleep,
  KurtNightWolf,
  KurtResult,
  KurtVerdict,
  KurtVote,
  Screen390,
} from './brand/weknows/kurt/KurtScreens';
import {
  ShChancellorEnact,
  ShEnacted,
  ShExecution,
  ShInvestigate,
  ShPresidentDraw,
  ShResult,
  ShVote,
  ShVoteResult,
} from './brand/weknows/hitler/ShScreens';
import { IN_HAND, IN_PLAYERS, InChallenge, InLoseCard, InPickAction, InResult, InReveal } from './brand/weknows/intrigue/InScreens';
import { AG_OPEN, AgBoard, AgGiveClue, AgResult } from './brand/weknows/agents/AgScreens';

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

/** Kurt Adam ad screens at the artboard's 390×844 (render with --scale=2 for checks against KurtAdam.dc.html). */
const KurtPreview: React.FC<{ screen: string }> = ({ screen }) => {
  const P = KURT_PLAYERS;
  const body =
    screen === 'wolf' ? (
      <KurtNightWolf players={P} pick={null} timer={18} cardOpen={false} />
    ) : screen === 'wolfPick' ? (
      <KurtNightWolf players={P} pick={2} timer={18} cardOpen />
    ) : screen === 'sleep' ? (
      <KurtNightSleep players={P} timer={18} cardOpen={false} />
    ) : screen === 'seer' ? (
      <KurtNightSeer players={P} pick={null} result={null} timer={21} />
    ) : screen === 'seerResult' ? (
      <KurtNightSeer players={P} pick={2} result={{ name: 'Deniz', wolf: false }} timer={12} cardOpen />
    ) : screen === 'dawn' ? (
      <KurtDawn nightNo={2} dead={['Deniz']} players={P} roles={{ Deniz: 'villager' }} />
    ) : screen === 'discuss' ? (
      <KurtDiscuss
        dayNo={2}
        players={P}
        me="Sude"
        myNomination="Bora"
        candidates={[
          { name: 'Bora', by: ['Sude', 'Ece'] },
          { name: 'Mert', by: ['Zeynep'] },
        ]}
        timer={74}
        readyCount={[2, 6]}
      />
    ) : screen === 'vote' ? (
      <KurtVote
        options={[
          { name: 'Bora', votes: 3, by: ['Ece', 'Sude', 'Zeynep'] },
          { name: 'Mert', votes: 1, by: ['Deniz'] },
        ]}
        noneVotes={0}
        mine="Bora"
        progress={[4, 6]}
      />
    ) : screen === 'verdict' ? (
      <KurtVerdict
        hanged="Bora"
        role="wolf"
        tally={[
          { name: 'Bora', votes: 4 },
          { name: 'Mert', votes: 1 },
          { name: 'Kimseyi asma', votes: 1 },
        ]}
      />
    ) : screen === 'spared' ? (
      <KurtVerdict hanged={null} spared="tie" tally={[{ name: 'Bora', votes: 3 }, { name: 'Mert', votes: 3 }]} />
    ) : screen === 'resultWolves' ? (
      <KurtResult winner="wolves" reason="wolvesParity" />
    ) : (
      <KurtResult
        winner="village"
        reason="wolvesDead"
        roles={[
          { name: 'Kaan', role: 'wolf', dead: true },
          { name: 'Bora', role: 'wolf', dead: true },
          { name: 'Ece', role: 'seer' },
          { name: 'Mert', role: 'doctor' },
          { name: 'Deniz', role: 'villager', dead: true },
          { name: 'Zeynep', role: 'witch' },
          { name: 'Sude', role: 'villager' },
        ]}
      />
    );
  return (
    <Screen390 width={390} height={844}>
      {body}
    </Screen390>
  );
};

/** Secret Hitler ad screens at the artboard's 390×844 (render with --scale=2 for checks against SecretHitler.dc.html). */
const SH_VOTES = [
  { name: 'Ece', ja: true },
  { name: 'Mert', ja: true },
  { name: 'Deniz', ja: false },
  { name: 'Kaan', ja: true },
  { name: 'Zeynep', ja: true },
  { name: 'Sude', ja: false },
];
const ShPreview: React.FC<{ screen: string }> = ({ screen }) => {
  const board = { liberal: 2, fascist: 3, tracker: 1 };
  const body =
    screen === 'vote' ? (
      <ShVote {...board} president="Ece" nominee="Mert" mine={null} voted={4} total={7} />
    ) : screen === 'voteJa' ? (
      <ShVote {...board} president="Ece" nominee="Mert" mine="ja" voted={5} total={7} cardOpen />
    ) : screen === 'voteNein' ? (
      <ShVote {...board} president="Ece" nominee="Mert" mine="nein" voted={5} total={7} cardOpen role="hitler" />
    ) : screen === 'voteFascist' ? (
      <ShVote {...board} president="Ece" nominee="Mert" mine="ja" voted={5} total={7} cardOpen role="fascist" me="Sude" team={[{ name: 'Kaan', role: 'fascist' }, { name: 'Zeynep', role: 'hitler' }]} />
    ) : screen === 'votePassed' ? (
      <ShVoteResult {...board} president="Ece" nominee="Mert" votes={SH_VOTES} passed />
    ) : screen === 'voteFailed' ? (
      <ShVoteResult {...board} tracker={2} president="Ece" nominee="Mert" votes={SH_VOTES.map((v) => ({ ...v, ja: !v.ja }))} passed={false} />
    ) : screen === 'president' ? (
      <ShPresidentDraw {...board} cards={['fascist', 'liberal', 'fascist']} discarded={null} votes={SH_VOTES} />
    ) : screen === 'presidentPick' ? (
      <ShPresidentDraw {...board} cards={['fascist', 'liberal', 'fascist']} discarded={0} votes={SH_VOTES} />
    ) : screen === 'chancellor' ? (
      <ShChancellorEnact {...board} deck={6} cards={['liberal', 'fascist']} enacted={1} votes={SH_VOTES} />
    ) : screen === 'enactedLiberal' ? (
      <ShEnacted liberal={3} fascist={3} tracker={0} deck={6} discard={5} policy="liberal" votes={SH_VOTES} />
    ) : screen === 'enactedFascist' ? (
      <ShEnacted liberal={2} fascist={4} tracker={0} deck={6} discard={5} policy="fascist" votes={SH_VOTES} />
    ) : screen === 'investigate' ? (
      <ShInvestigate liberal={2} fascist={2} tracker={0} target="Deniz" result={null} />
    ) : screen === 'investigateResult' ? (
      <ShInvestigate liberal={2} fascist={2} tracker={0} target="Deniz" result="liberal" />
    ) : screen === 'execution' ? (
      <ShExecution liberal={2} fascist={4} tracker={0} target="Mert" role="liberal" />
    ) : screen === 'executionDone' ? (
      <ShExecution liberal={2} fascist={4} tracker={0} target="Mert" done />
    ) : screen === 'resultFascist' ? (
      <ShResult winner="fascist" reason="hitlerChancellor" />
    ) : (
      <ShResult
        winner="liberal"
        reason="hitlerExecuted"
        liberal={3}
        fascist={4}
        players={[
          { name: 'Ece', color: '#FF7AC6' },
          { name: 'Mert', color: '#3EE0A8', dead: true },
          { name: 'Deniz', color: '#5AB8FF' },
          { name: 'Kaan', color: '#B794FF' },
          { name: 'Bora', color: '#FF8A5B', dead: true },
          { name: 'Zeynep', color: '#FFD23F' },
          { name: 'Sude', color: '#FFFFFF' },
        ]}
      />
    );
  return (
    <Screen390 width={390} height={844}>
      {body}
    </Screen390>
  );
};

/** Entrika ad screens at the artboard's 390×844 (render with --scale=2 for checks against Entrika.dc.html). */
const IN_WINDOW = { actor: 'Mert', action: 'assassinate', claim: 'assassin' as const, target: 'Sen', countdown: 5, passed: 1, needed: 3 };
const InPreview: React.FC<{ screen: string }> = ({ screen }) => {
  const t = { players: IN_PLAYERS, ...IN_HAND };
  const body =
    screen === 'pick' ? (
      <InPickAction {...t} />
    ) : screen === 'pickTarget' ? (
      <InPickAction {...t} selected="assassinate" target="Mert" />
    ) : screen === 'pickCoup' ? (
      <InPickAction {...t} gold={8} selected="coup" target="Zeynep" />
    ) : screen === 'challenge' ? (
      <InChallenge {...t} {...IN_WINDOW} />
    ) : screen === 'challengePassed' ? (
      <InChallenge {...t} {...IN_WINDOW} passed={2} mine="pass" />
    ) : screen === 'challengeSteal' ? (
      <InChallenge {...t} actor="Mert" action="steal" claim="pirate" target="Sen" countdown={6} countdownFill={0.75} passed={0} needed={3} />
    ) : screen === 'challengeOther' ? (
      <InChallenge {...t} actor="Mert" action="steal" claim="pirate" target="Zeynep" countdown={4} passed={1} needed={3} mine="lie" />
    ) : screen === 'reveal' ? (
      <InReveal {...t} who="Mert" role="assassin" truthful loser="Sen" under={IN_WINDOW} />
    ) : screen === 'revealBluff' ? (
      <InReveal {...t} who="Mert" role="assassin" truthful={false} loser="Mert" under={IN_WINDOW} />
    ) : screen === 'lose' ? (
      <InLoseCard {...t} reason="assassinate" picked={null} />
    ) : screen === 'losePicked' ? (
      <InLoseCard {...t} reason="challenge" picked={1} />
    ) : (
      <InResult winner="Zeynep" me="Sen" ranking={[{ name: 'Zeynep' }, { name: 'Sen' }, { name: 'Mert' }, { name: 'Deniz' }]} />
    );
  return (
    <Screen390 width={390} height={844}>
      {body}
    </Screen390>
  );
};
const IN_STILLS = ['pick', 'pickTarget', 'pickCoup', 'challenge', 'challengePassed', 'challengeSteal', 'challengeOther', 'reveal', 'revealBluff', 'lose', 'losePicked', 'result'];

/** Ajanlar ad screens at the artboard's 390×844 (render with --scale=2 for checks against Ajanlar.dc.html). */
const AgPreview: React.FC<{ screen: string }> = ({ screen }) => {
  const body =
    screen === 'member' ? (
      <AgBoard open={AG_OPEN} />
    ) : screen === 'leader' ? (
      <AgBoard open={AG_OPEN} leader />
    ) : screen === 'pressing' ? (
      <AgBoard open={AG_OPEN} pressing={22} />
    ) : screen === 'clue' ? (
      <AgGiveClue open={AG_OPEN} word="su" count={2} />
    ) : screen === 'error' ? (
      <AgGiveClue open={AG_OPEN} word="balıkçı" count={2} />
    ) : screen === 'resultAgents' ? (
      <AgResult winner="g" reason="agents" open={[...AG_OPEN, 0, 3, 6, 7, 10, 13, 18, 5, 12]} />
    ) : (
      <AgResult winner="g" reason="assassin" open={[...AG_OPEN, 0, 3, 6, 5, 12, 11]} />
    );
  return (
    <Screen390 width={390} height={844}>
      {body}
    </Screen390>
  );
};
const AG_STILLS = ['member', 'leader', 'pressing', 'clue', 'error', 'resultAgents', 'resultAssassin'];

const SH_STILLS = [
  'vote',
  'voteJa',
  'voteNein',
  'voteFascist',
  'votePassed',
  'voteFailed',
  'president',
  'presidentPick',
  'chancellor',
  'enactedLiberal',
  'enactedFascist',
  'investigate',
  'investigateResult',
  'execution',
  'executionDone',
  'resultFascist',
  'resultLiberal',
];

const KURT_STILLS = ['wolf', 'wolfPick', 'sleep', 'seer', 'seerResult', 'dawn', 'discuss', 'vote', 'verdict', 'spared', 'resultWolves', 'resultVillage'];

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
      id={R4_META.id}
      component={R4Solo}
      schema={r4Schema}
      defaultProps={R4_META.defaultProps}
      durationInFrames={R4_META.durationInFrames}
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
    <Composition
      id={C5_META.id}
      component={C5Trailer}
      schema={c5Schema}
      defaultProps={C5_META.defaultProps}
      durationInFrames={trailerBeats(C5_META.defaultProps.shots).total}
      calculateMetadata={({ props }) => ({ durationInFrames: trailerBeats(props.shots).total })}
      {...video}
    />
    <Composition
      id={C6_META.id}
      component={C6Timeline}
      schema={c6Schema}
      defaultProps={C6_META.defaultProps}
      durationInFrames={C6_META.durationInFrames}
      {...video}
    />
    <Composition
      id={W1_META.id}
      component={W1Night}
      schema={w1Schema}
      defaultProps={W1_META.defaultProps}
      durationInFrames={nightBeats(W1_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: nightBeats(props.voices).total })}
      {...video}
    />
    <Composition
      id={W2_META.id}
      component={W2WhoWolf}
      schema={w2Schema}
      defaultProps={W2_META.defaultProps}
      durationInFrames={whoBeats(W2_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: whoBeats(props.voices).total })}
      {...video}
    />
    <Composition
      id={W3_META.id}
      component={W3YouWolf}
      schema={w3Schema}
      defaultProps={W3_META.defaultProps}
      durationInFrames={youBeats(W3_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: youBeats(props.voices).total })}
      {...video}
    />
    <Composition
      id={H1_META.id}
      component={H1Vote}
      schema={h1Schema}
      defaultProps={H1_META.defaultProps}
      durationInFrames={shotBeats(H_SHOTS.h1, H1_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: shotBeats(H_SHOTS.h1, props.voices).total })}
      {...video}
    />
    <Composition
      id={H2_META.id}
      component={H2Liar}
      schema={h2Schema}
      defaultProps={H2_META.defaultProps}
      durationInFrames={shotBeats(H_SHOTS.h2, H2_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: shotBeats(H_SHOTS.h2, props.voices).total })}
      {...video}
    />
    <Composition
      id={H3_META.id}
      component={H3You}
      schema={h3Schema}
      defaultProps={H3_META.defaultProps}
      durationInFrames={shotBeats(H_SHOTS.h3, H3_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: shotBeats(H_SHOTS.h3, props.voices).total })}
      {...video}
    />
    <Composition
      id={EN1_META.id}
      component={EN1Block}
      schema={en1Schema}
      defaultProps={EN1_META.defaultProps}
      durationInFrames={shotBeats(EN_SHOTS.i1, EN1_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: shotBeats(EN_SHOTS.i1, props.voices).total })}
      {...video}
    />
    <Composition
      id={EN2_META.id}
      component={EN2Bluff}
      schema={en2Schema}
      defaultProps={EN2_META.defaultProps}
      durationInFrames={shotBeats(EN_SHOTS.i2, EN2_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: shotBeats(EN_SHOTS.i2, props.voices).total })}
      {...video}
    />
    <Composition
      id={EN3_META.id}
      component={EN3Count}
      schema={en3Schema}
      defaultProps={EN3_META.defaultProps}
      durationInFrames={shotBeats(EN_SHOTS.i3, EN3_META.defaultProps.voices).total}
      calculateMetadata={({ props }) => ({ durationInFrames: shotBeats(EN_SHOTS.i3, props.voices).total })}
      {...video}
    />
    <Composition
      id={AG1_META.id}
      component={AG1Clue}
      schema={agSchema}
      defaultProps={AG1_META.defaultProps}
      durationInFrames={brightBeats(AG_SHOTS.a1).total}
      {...video}
    />
    <Composition
      id={AG2_META.id}
      component={AG2Assassin}
      schema={agSchema}
      defaultProps={AG2_META.defaultProps}
      durationInFrames={brightBeats(AG_SHOTS.a2).total}
      {...video}
    />
    <Composition
      id={AG3_META.id}
      component={AG3Leader}
      schema={agSchema}
      defaultProps={AG3_META.defaultProps}
      durationInFrames={brightBeats(AG_SHOTS.a3).total}
      {...video}
    />
    {(['songie', 'itiraf', 'casebook', 'weknows'] as const).flatMap((app) =>
      STORE_SIZES.map((sz) => (
        <Still key={`${app}-${sz.id}`} id={`Store-${app}-${sz.id}`} component={() => <StoreArt app={app} w={sz.width} h={sz.height} />} width={sz.width} height={sz.height} />
      )),
    )}
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
    {KURT_STILLS.map((k) => (
      <Still key={k} id={`Kurt-${k}`} component={KurtPreview} defaultProps={{ screen: k }} width={390} height={844} />
    ))}
    {SH_STILLS.map((k) => (
      <Still key={k} id={`Sh-${k}`} component={ShPreview} defaultProps={{ screen: k }} width={390} height={844} />
    ))}
    {IN_STILLS.map((k) => (
      <Still key={k} id={`In-${k}`} component={InPreview} defaultProps={{ screen: k }} width={390} height={844} />
    ))}
    {AG_STILLS.map((k) => (
      <Still key={k} id={`Ag-${k}`} component={AgPreview} defaultProps={{ screen: k }} width={390} height={844} />
    ))}
  </>
);
