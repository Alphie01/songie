import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../brand/ClipCard';
import { ColorStage } from '../brand/ColorStage';
import { ColorWipe } from '../brand/ColorWipe';
import { CtaCard } from '../brand/CtaCard';
import { FONT_DISPLAY, SAFE, VIDEO } from '../brand/fonts';
import { Headline } from '../brand/Headline';
import { usePop } from '../brand/motion';
import { PhoneFrame } from '../brand/PhoneFrame';
import { Sticker } from '../brand/Sticker';
import { APP, CLIPS, STOPS, clipShort, clipTr } from '../brand/app/appTokens';
import { RevealScreen } from '../brand/app/RevealScreen';
import { SongPlayScreen, type FeedLine, type ScoreRow } from '../brand/app/SongPlayScreen';
import { songieTheme } from '../themes/songie';
import type { AppTheme } from '../themes/types';

const nonEmpty = z.string().refine((s) => s.trim().length > 0, { message: 'must not be empty' });

export const r2Schema = z.object({
  title: nonEmpty,
  artist: nonEmpty,
  album: z.string(),
  /** Deezer preview and cover inside public/ (`pnpm song "<sorgu>"` downloads both). */
  song: z.string(),
  cover: z.string(),
  /** Second of the 30 s preview every stage clip starts from (the game cuts all stages from one offset). */
  songFrom: z.number().min(0).max(27),
});

export type R2Props = z.infer<typeof r2Schema>;

/** Storyboard frames (30 fps). Game-scene beats are local to `game`. */
export const R2 = {
  wipe1: 70,
  game: 78,
  wipe2: 243,
  reveal: 251,
  wipe3: 308,
  cta: 316,
  /** Countdown 3·2·1 on the hook. */
  counts: [10, 30, 50],
  /** Per stage: play press, clip start, "Pas" press (local frames in the game scene). */
  stages: [
    { play: 8, clip: 12, pass: 26 },
    { play: 38, clip: 42, pass: 66 },
    { play: 78, clip: 82, pass: 146 },
  ],
  /** Mert's 0,1 sn solve is revealed after the last pass. */
  mert: 150,
  songFadeOut: 20,
} as const;

export const R2_META = {
  id: 'songie-02-gercek-oyun',
  durationInFrames: 360,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    title: 'Şımarık',
    artist: 'Tarkan',
    album: 'Ölürüm Sana',
    song: 'assets/songs/16412330.mp3',
    cover: 'assets/songs/16412330.jpg',
    songFrom: 8,
  } as R2Props,
} as const;

export const CTA_TEXT = 'Sen de Songie ile arkadaşlarına meydan oku!';

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;

/** 0–70: pink, "Sen ne kadar hızlı bilebilirsin?" and "Hazır ol" with a 3·2·1 countdown underneath. */
const Hook: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const idx = R2.counts.filter((f) => frame >= f).length - 1;
  const at = R2.counts[Math.max(0, idx)]!;
  const pop = usePop(at, 9);
  return (
    <ColorStage theme={theme} color={c.pink}>
      <Headline
        theme={theme}
        text="Sen ne kadar hızlı bilebilirsin?"
        size={132}
        maxLines={3}
        stagger={2}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 40 }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', justifyContent: 'center' }}>
        <Sticker theme={theme} text="Hazır ol" bg={c.paper} rotate={-4} enterAt={4} size={92} />
      </div>
      {idx >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: CX - 150,
            top: 1150,
            width: 300,
            height: 300,
            boxSizing: 'border-box',
            borderRadius: '50%',
            border: `8px solid ${c.ink}`,
            background: c.yellow,
            boxShadow: `12px 12px 0 ${c.ink}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 220,
            lineHeight: 1,
            color: c.ink,
            transform: `scale(${pop}) rotate(${interpolate(pop, [0, 1], [-25, 6])}deg)`,
          }}
        >
          {3 - idx}
        </div>
      )}
    </ColorStage>
  );
};

const scores = (t: AppTheme): ScoreRow[] => [
  { name: 'Mert', score: 2420, color: t.colors.mint },
  { name: 'Sen', score: 2150, color: t.colors.yellow, me: true },
  { name: 'Deniz', score: 1780, color: t.colors.panel },
  { name: 'Ece', score: 920, color: t.colors.panel },
];

/** 0..1 press curve around `at`. */
const pressAt = (frame: number, at: number) =>
  interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Game state at a local frame: open stage, progress fill, playing, feed. */
export function gameState(frame: number) {
  const passed = R2.stages.filter((s) => frame >= s.pass + 4).length;
  const stage = Math.min(passed, 2);
  const s = R2.stages[stage]!;
  // The bar slides to the next stop right after "Pas".
  const prev = R2.stages[stage - 1];
  const fill =
    prev && stage === passed
      ? interpolate(frame, [prev.pass + 4, prev.pass + 10], [STOPS[stage - 1]!, STOPS[stage]!], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : STOPS[stage]!;
  const clipFrames = Math.round(CLIPS[stage]! * VIDEO.fps);
  const playing = frame >= s.clip && frame < s.clip + Math.max(clipFrames, 6);
  const feed: FeedLine[] = [];
  for (let i = 0; i < passed; i++) feed.push({ name: 'Sen', text: 'pas geçti', color: APP.red });
  if (frame >= R2.mert) feed.unshift({ name: 'Mert', text: `${clipShort(CLIPS[0]!)}’de bildi`, points: 1000, color: songieTheme.colors.mint });
  return { stage, fill, playing, feed: feed.slice(0, 3), passed };
}

/** 78–243: yellow, the real play screen; 0,1 → Pas → 0,5 → Pas → 2 sn → Pas, then Mert's 0,1 sn solve. */
const Game: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const { stage, fill, playing, feed, passed } = gameState(frame);
  const cur = R2.stages[stage]!;
  const lastPass = R2.stages[Math.max(0, passed - 1)]!.pass;
  return (
    <ColorStage theme={theme} color={c.yellow}>
      <div
        style={{
          position: 'absolute',
          left: CX - PHONE_W / 2,
          top: SAFE.top + 20,
          transform: `translateY(${interpolate(enter, [0, 1], [900, 0])}px) rotate(${interpolate(enter, [0, 1], [6, -1.5])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
          <SongPlayScreen
            theme={theme}
            stage={stage}
            fill={fill}
            playing={playing}
            press={pressAt(frame, cur.play)}
            skipPress={R2.stages.reduce((m, s) => Math.max(m, pressAt(frame, s.pass)), 0)}
            feed={feed}
            scores={scores(theme)}
            status="Mert, Deniz ve Ece dinliyor."
          />
        </PhoneFrame>
      </div>
      {/* Open stage, re-popping on every new stage. */}
      <Sequence from={stage === 0 ? 0 : R2.stages[stage - 1]!.pass + 4} layout="none" key={`stage${stage}`}>
        <Sticker
          theme={theme}
          text={`${clipTr(CLIPS[stage]!)} SN`}
          bg={c.pink}
          rotate={7}
          enterAt={stage === 0 ? 6 : 0}
          size={96}
          style={{ position: 'absolute', right: SAFE.side, top: SAFE.top }}
        />
      </Sequence>
      {passed > 0 && frame < R2.mert && frame < lastPass + 22 && (
        <Sequence from={lastPass} layout="none" key={`miss${passed}`}>
          <Sticker
            theme={theme}
            text="Bilemedin 😅"
            bg={c.coral}
            rotate={-6}
            size={84}
            style={{ position: 'absolute', left: SAFE.side, top: 1300 }}
          />
        </Sequence>
      )}
      {frame >= R2.mert && (
        <Sequence from={R2.mert} layout="none">
          <Sticker
            theme={theme}
            text="Ama Mert 0,1 sn'de bildi! +1000"
            bg={c.mint}
            rotate={-4}
            size={64}
            style={{ position: 'absolute', left: SAFE.side, top: 1340 }}
          />
        </Sequence>
      )}
    </ColorStage>
  );
};

/** 251–308: mint, the app's reveal screen with the cover; the song plays underneath. */
const Reveal: React.FC<{ theme: AppTheme; p: R2Props }> = ({ theme, p }) => {
  const c = theme.colors;
  const enter = usePop(0, 14);
  return (
    <ColorStage theme={theme} color={c.mint}>
      <div
        style={{
          position: 'absolute',
          left: CX - PHONE_W / 2,
          top: SAFE.top + 20,
          transform: `translateY(${interpolate(enter, [0, 1], [700, 0])}px) rotate(${interpolate(enter, [0, 1], [-6, 1.5])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
          <RevealScreen
            theme={theme}
            title={p.title}
            artist={p.artist}
            album={p.album}
            cover={hasStaticFile(p.cover) ? p.cover : ''}
            won={false}
            results={[{ name: 'Mert', how: `${clipShort(CLIPS[0]!)}’de`, points: 1000, color: c.mint }]}
            enterAt={6}
          />
        </PhoneFrame>
      </div>
      <Sticker
        theme={theme}
        text="Şarkı buydu! 🎶"
        bg={c.yellow}
        rotate={-5}
        enterAt={14}
        size={84}
        style={{ position: 'absolute', left: SAFE.side, top: 1340 }}
      />
    </ColorStage>
  );
};

/** The real song: each stage clip from the same offset (like the game), then the song from the reveal. */
const Song: React.FC<{ src: string; from: number }> = ({ src, from }) => {
  if (!hasStaticFile(src)) return null;
  const start = Math.round(from * VIDEO.fps);
  const bgFrom = R2.wipe2;
  const bgFrames = R2_META.durationInFrames - bgFrom;
  return (
    <>
      {R2.stages.map((s, i) => (
        <Sequence key={i} from={R2.game + s.clip} durationInFrames={Math.round(CLIPS[i]! * VIDEO.fps)} layout="none" name={`${clipTr(CLIPS[i]!)} sn`}>
          <Audio src={staticFile(src)} trimBefore={start} />
        </Sequence>
      ))}
      <Sequence from={bgFrom} durationInFrames={bgFrames} layout="none" name="şarkı">
        <Audio
          src={staticFile(src)}
          trimBefore={start}
          volume={(f) =>
            0.85 *
            interpolate(f, [0, 6, bgFrames - R2.songFadeOut, bgFrames], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      </Sequence>
    </>
  );
};

export const R2RealGame: React.FC<R2Props> = (p) => {
  const theme = songieTheme;
  const c = theme.colors;
  return (
    <AbsoluteFill style={{ backgroundColor: c.pink }}>
      <Sequence durationInFrames={R2.wipe1} name="Hook">
        <Hook theme={theme} />
      </Sequence>
      <ColorWipe theme={theme} from={c.pink} to={c.yellow} at={R2.wipe1} durationInFrames={R2.game - R2.wipe1} />
      <Sequence from={R2.game} durationInFrames={R2.wipe2 - R2.game} name="Game">
        <Game theme={theme} />
      </Sequence>
      <ColorWipe theme={theme} from={c.yellow} to={c.mint} at={R2.wipe2} durationInFrames={R2.reveal - R2.wipe2} />
      <Sequence from={R2.reveal} durationInFrames={R2.wipe3 - R2.reveal} name="Reveal">
        <Reveal theme={theme} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={c.mint} to={c.lilac} at={R2.wipe3} durationInFrames={R2.cta - R2.wipe3} />
      <Sequence from={R2.cta} name="CTA">
        <ColorStage theme={theme} color={c.lilac}>
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </ColorStage>
      </Sequence>

      <Song src={p.song} from={p.songFrom} />
      {R2.counts.map((f) => (
        <Sfx key={f} name="tick" at={f} />
      ))}
      {R2.stages.map((s) => (
        <Sfx key={s.pass} name="buzz" at={R2.game + s.pass + 2} frames={10} />
      ))}
      <Sfx name="ding" at={R2.game + R2.mert} frames={30} />
      <Sfx name="pop" at={R2.cta + 18} />
    </AbsoluteFill>
  );
};
