import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ClipCard, hasStaticFile } from '../brand/ClipCard';
import { ColorStage } from '../brand/ColorStage';
import { ColorWipe } from '../brand/ColorWipe';
import { CtaCard } from '../brand/CtaCard';
import { FONT_DISPLAY, SAFE, VIDEO } from '../brand/fonts';
import { Headline } from '../brand/Headline';
import { usePop } from '../brand/motion';
import { scenePalette, stickerOn } from '../brand/palette';
import { PhoneFrame } from '../brand/PhoneFrame';
import { Sticker } from '../brand/Sticker';
import { APP, CLIPS, clipTr } from '../brand/app/appTokens';
import { SongPlayScreen, type FeedLine, type ScoreRow } from '../brand/app/SongPlayScreen';
import { songieTheme } from '../themes/songie';
import type { AppTheme } from '../themes/types';
import { crew, crewScores, listening, solverSchema, type Crew } from './friends';

/** Points per stage in song-guess (0,1 / 0,5 / 2 / 8 / 15 sn). */
const POINTS = [1000, 700, 450, 250, 100] as const;

export const r1Schema = z.object({
  /** Song shown on the answer card; fitted with fitText. */
  answer: z.string().refine((s) => s.trim().length > 0, { message: 'answer must not be empty' }),
  /** Stage Mert solved it at (0 = 0,1 sn). */
  solveStage: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  /** Deezer önizlemesi, public/ içinde (`pnpm song "<sorgu>"` indirir). Boşsa şarkısız. */
  song: z.string(),
  /** Önizlemede 0,1 sn'lik kesitin ve arka plan şarkısının başladığı saniye. */
  songFrom: z.number().min(0).max(29),
  /** Scene color order (see PALETTES); `pnpm reel` picks one per song. */
  palette: z.number().int().min(0),
  /** The friend who knows it (the one jumping up in the clip). */
  solver: solverSchema,
});

export type R1Props = z.infer<typeof r1Schema>;

export const R1_META = {
  id: 'songie-01-challenge',
  durationInFrames: 330,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: { answer: 'Tarkan – Kuzu Kuzu', solveStage: 0, song: 'assets/songs/16412320.mp3', songFrom: 15.5, palette: 0, solver: 'Mert' } as R1Props,
} as const;

/** "Mert 0,1 sn'de bildi +1000": the app's live-feed wording with tr-TR seconds. */
export const solveLabel = (stage: R1Props['solveStage'], solver = 'Mert') =>
  `${solver.trim()} ${clipTr(CLIPS[stage]!)} sn'de bildi +${POINTS[stage]}`;

/** Storyboard frames (30 fps). Each wipe ends where the next scene starts on the new color. */
export const R1 = {
  hookEnd: 30,
  wipe1: 105,
  clip: 115,
  wipe2: 220,
  answer: 230,
  wipe3: 275,
  cta: 283,
  /** The reaction clip plays from its first frame (3,5 of its 4 sn); Mert jumps ~1,5 sn in. */
  clipFrom: 0,
  solve: 160,
  cheat: 178,
  /** Play press in the phone (Play scene frame 6) → the 0,1 sn snippet; replayed after "3·2". */
  snippets: [36, 70],
  songFadeOut: 20,
} as const;

/** 0,1 sn = 3 kare. */
const SNIPPET_FRAMES = 3;

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} />
  </Sequence>
);

const CX = VIDEO.width / 2;

/** 0–30: pink hook. */
const Hook: React.FC<{ theme: AppTheme; bg: string }> = ({ theme, bg }) => {
  return (
    <ColorStage theme={theme} color={bg}>
      <Headline
        theme={theme}
        text="Bu şarkıyı 0,1 saniyede bilebilir misin?"
        size={132}
        maxLines={3}
        stagger={2}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 40 }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 900, display: 'flex', justifyContent: 'center' }}>
        <Sticker theme={theme} text="0,1 SN!" bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])} rotate={-7} enterAt={10} size={190} />
      </div>
    </ColorStage>
  );
};

const feed = (c8: Crew): FeedLine[] => [{ name: c8.others[2], text: 'pas geçti', color: APP.red }];

const PHONE_W = 680;
const PHONE_H = 1240;

/** 30–105: the play screen at stage 0 with the waveform playing, a 3·2·1 countdown and the comments prompt. */
const Play: React.FC<{ theme: AppTheme; stage: number; bg: string; c8: Crew }> = ({ theme, stage, bg, c8 }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const count = frame < 30 ? '3' : frame < 50 ? '3·2' : '3·2·1';
  const tickAt = frame < 30 ? 10 : frame < 50 ? 30 : 50;
  // One sticker that pops in on the first tick and gives a little bump on each later one (no blank frame).
  const bump = 1 + 0.18 * (1 - usePop(tickAt, 9)) * (tickAt > 10 ? 1 : 0);
  return (
    <ColorStage theme={theme} color={bg}>
      <div
        style={{
          position: 'absolute',
          left: CX - PHONE_W / 2,
          top: SAFE.top + 10,
          transform: `translateY(${interpolate(enter, [0, 1], [900, 0])}px) rotate(${interpolate(enter, [0, 1], [6, -2])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
          <SongPlayScreen
            theme={theme}
            stage={stage}
            playing
            press={interpolate(frame, [4, 8, 14], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
            timer={Math.max(1, 15 - Math.floor(frame / 30))}
            feed={feed(c8)}
            scores={crewScores(theme, c8)}
            status={listening(c8)}
          />
        </PhoneFrame>
      </div>
      <div style={{ position: 'absolute', right: SAFE.side + 10, top: SAFE.top + 10, transform: `scale(${bump})`, transformOrigin: 'right top' }}>
        <Sticker theme={theme} text={count} bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])} rotate={8} enterAt={10} size={110} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1360, display: 'flex', justifyContent: 'center' }}>
        <Sticker theme={theme} text="Yorumlara yaz 👇" bg={c.paper} rotate={-4} enterAt={20} size={76} />
      </div>
    </ColorStage>
  );
};

const CLIP_W = 560;
const CLIP_H = Math.round((CLIP_W * 1280) / 720);

/** 115–190: yellow, the AI reaction clip; Mert jumps up at R1.solve, the others cry foul at R1.cheat. */
const Reaction: React.FC<{ theme: AppTheme; stage: R1Props['solveStage']; bg: string; solver: string }> = ({ theme, stage, bg, solver }) => {
  const c = theme.colors;
  const solve = R1.solve - R1.clip;
  const cheat = R1.cheat - R1.clip;
  return (
    <ColorStage theme={theme} color={bg}>
      <div style={{ position: 'absolute', left: CX - CLIP_W / 2, top: SAFE.top + 120 }}>
        <ClipCard theme={theme} src="assets/r1-react.mp4" from={R1.clipFrom} rotate={-3} width={CLIP_W} height={CLIP_H} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: SAFE.top + 10, display: 'flex', justifyContent: 'center' }}>
        <Sticker theme={theme} text={solveLabel(stage, solver)} bg={stickerOn(theme, bg, ['mint', 'yellow', 'sky'])} rotate={-4} enterAt={solve} size={58} />
      </div>
      <Sticker
        theme={theme}
        text="HİLE!"
        bg={c.coral}
        rotate={9}
        enterAt={cheat}
        size={110}
        style={{ position: 'absolute', right: SAFE.side + 40, top: 1385 }}
      />
    </ColorStage>
  );
};

/** 200–245: mint, the answer on a paper card plus "Sen kaçta bildin?". */
const Answer: React.FC<{ theme: AppTheme; answer: string; bg: string }> = ({ theme, answer, bg }) => {
  const c = theme.colors;
  const card = usePop(0, 12);
  const label = usePop(2);
  return (
    <ColorStage theme={theme} color={bg}>
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          top: 600,
          width: VIDEO.width - 2 * SAFE.side,
          boxSizing: 'border-box',
          padding: '70px 40px 90px',
          border: `6px solid ${c.ink}`,
          borderRadius: 48,
          background: c.paper,
          boxShadow: `14px 14px 0 ${c.ink}`,
          transform: `translateY(${interpolate(card, [0, 1], [260, 0])}px) rotate(${interpolate(card, [0, 1], [6, -2])}deg)`,
          opacity: Math.min(1, card * 2),
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Headline theme={theme} text={answer} enterAt={4} size={150} minSize={64} maxWidth={860} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.side + 30,
          top: 470,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 76,
          color: c.ink,
          transform: `rotate(-3deg) scale(${label})`,
          transformOrigin: 'left center',
        }}
      >
        Cevap:
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1170, display: 'flex', justifyContent: 'center' }}>
        <Sticker theme={theme} text="Sen kaçta bildin?" bg={stickerOn(theme, bg, ['pink', 'yellow', 'mint'])} rotate={5} enterAt={15} size={84} />
      </div>
    </ColorStage>
  );
};

/** The real song: 0,1 sn snippets while the phone plays, then the song from Mert's solve to the end. */
const Song: React.FC<{ src: string; from: number }> = ({ src, from }) => {
  if (!hasStaticFile(src)) return null;
  const start = Math.round(from * VIDEO.fps);
  const bgFrames = R1_META.durationInFrames - R1.solve;
  return (
    <>
      {R1.snippets.map((at) => (
        <Sequence key={at} from={at} durationInFrames={SNIPPET_FRAMES} layout="none" name="0,1 sn">
          <Audio src={staticFile(src)} trimBefore={start} />
        </Sequence>
      ))}
      <Sequence from={R1.solve} durationInFrames={bgFrames} layout="none" name="şarkı">
        <Audio
          src={staticFile(src)}
          trimBefore={start}
          volume={(f) =>
            0.85 *
            interpolate(f, [0, 8, bgFrames - R1.songFadeOut, bgFrames], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      </Sequence>
    </>
  );
};

export const R1Challenge: React.FC<R1Props> = ({ answer, solveStage, song, songFrom, palette, solver }) => {
  const theme = songieTheme;
  const [A, B, C, D] = scenePalette(theme, palette);
  return (
    <AbsoluteFill style={{ backgroundColor: A }}>
      <Sequence durationInFrames={R1.hookEnd} name="Hook">
        <Hook theme={theme} bg={A} />
      </Sequence>
      <Sequence from={R1.hookEnd} durationInFrames={R1.wipe1 - R1.hookEnd} name="Play">
        <Play theme={theme} stage={solveStage} bg={A} c8={crew(solver)} />
      </Sequence>
      <ColorWipe theme={theme} from={A} to={B} at={R1.wipe1} durationInFrames={R1.clip - R1.wipe1} />
      <Sequence from={R1.clip} durationInFrames={R1.wipe2 - R1.clip} name="Reaction">
        <Reaction theme={theme} stage={solveStage} bg={B} solver={solver} />
      </Sequence>
      <ColorWipe theme={theme} from={B} to={C} at={R1.wipe2} durationInFrames={R1.answer - R1.wipe2} />
      <Sequence from={R1.answer} durationInFrames={R1.wipe3 - R1.answer} name="Answer">
        <Answer theme={theme} answer={answer} bg={C} />
      </Sequence>
      <ColorWipe theme={theme} from={C} to={D} at={R1.wipe3} durationInFrames={R1.cta - R1.wipe3} />
      <Sequence from={R1.cta} name="CTA">
        <ColorStage theme={theme} color={D}>
          <CtaCard theme={theme} />
        </ColorStage>
      </Sequence>

      <Song src={song} from={songFrom} />
      <Sfx name="bip" at={20} />
      <Sfx name="tick" at={R1.hookEnd + 10} />
      <Sfx name="tick" at={R1.hookEnd + 30} />
      <Sfx name="tick" at={R1.hookEnd + 50} />
      <Sfx name="ding" at={R1.solve} frames={30} />
      <Sfx name="buzz" at={R1.cheat} frames={20} />
      <Sfx name="pop" at={R1.answer + 15} />
      <Sfx name="pop" at={R1.cta + 18} />
    </AbsoluteFill>
  );
};
