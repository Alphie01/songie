import React from 'react';
import { MUSIC_VOLUME, SFX_VOLUME } from '../brand/mix';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../brand/ClipCard';
import { ColorStage } from '../brand/ColorStage';
import { ColorWipe } from '../brand/ColorWipe';
import { CtaCard } from '../brand/CtaCard';
import { SAFE, VIDEO } from '../brand/fonts';
import { Headline } from '../brand/Headline';
import { usePop } from '../brand/motion';
import { scenePalette, stickerOn } from '../brand/palette';
import { PhoneFrame } from '../brand/PhoneFrame';
import { Sticker } from '../brand/Sticker';
import { APP, CLIPS, STOPS, clipShort, clipTr } from '../brand/app/appTokens';
import { RevealScreen } from '../brand/app/RevealScreen';
import { SongPlayScreen, type FeedLine, type ScoreRow } from '../brand/app/SongPlayScreen';
import { songieTheme } from '../themes/songie';
import type { AppTheme } from '../themes/types';
import { crew, listening, solverSchema, type Crew } from './friends';

const nonEmpty = z.string().refine((s) => s.trim().length > 0, { message: 'must not be empty' });

export const r3Schema = z.object({
  title: nonEmpty,
  artist: nonEmpty,
  album: z.string(),
  song: z.string(),
  cover: z.string(),
  songFrom: z.number().min(0).max(27),
  palette: z.number().int().min(0),
  /** The friend who was leading before you (and gets it at 2 sn on the reveal). */
  solver: solverSchema,
  /** Other songs by the artist, shown around the answer in the search list. */
  decoys: z.array(z.string()).max(2),
});

export type R3Props = z.infer<typeof r3Schema>;

/**
 * "Arkadaş grubunda şarkıyı ilk kim bilir?": this time YOU win. Same readable pace as R2 (~17 sn):
 * friends pop in, 0,1 sn → pass, 0,5 sn → you type, pick the song, +880, you overtake the leader,
 * reveal with "Bildin!", closing. Game beats are local to `game`.
 */
export const R3 = {
  names: [30, 42, 54, 66],
  wipe1: 100,
  game: 108,
  stages: [
    { play: 8, clip: 12, pass: 30 },
    { play: 46, clip: 50 },
  ],
  friendPass: 20,
  typeFrom: 72,
  typeEvery: 8,
  list: 100,
  select: 108,
  tap: 118,
  climbTo: 140,
  lead: 150,
  wipe2: 338,
  reveal: 346,
  wipe3: 431,
  cta: 439,
  songFadeOut: 24,
} as const;

export const R3_META = {
  id: 'songie-03-kazan',
  durationInFrames: 509,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    title: 'Şımarık',
    artist: 'Tarkan',
    album: 'Ölürüm Sana',
    song: 'assets/songs/16412330.mp3',
    cover: 'assets/songs/16412330.jpg',
    songFrom: 12,
    palette: 3,
    solver: 'Mert',
    decoys: ['Tarkan – Kuzu Kuzu', 'Tarkan – Dudu'],
  } as R3Props,
} as const;

export const CTA_TEXT = 'Arkadaşlarını topla, kim daha hızlı görelim!';
const WIN_POINTS = 880;

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;
/** Game stickers sit over the play button, so the search list, feed and score cards stay visible. */
const STICKER_Y = 560;

/** 0–100: the question, then the four players pop in, "Sen" last and biggest. */
const Hook: React.FC<{ theme: AppTheme; bg: string; c8: Crew }> = ({ theme, bg, c8 }) => {
  const chips: { name: string; prefs: Parameters<typeof stickerOn>[2]; x: number; y: number; rot: number; size: number }[] = [
    { name: c8.solver, prefs: ['mint', 'sky', 'yellow'], x: 140, y: 930, rot: -6, size: 84 },
    { name: c8.others[0], prefs: ['sky', 'lilac', 'pink'], x: 600, y: 900, rot: 5, size: 84 },
    { name: c8.others[1], prefs: ['lilac', 'pink', 'mint'], x: 170, y: 1150, rot: 4, size: 84 },
    { name: 'Sen?', prefs: ['yellow', 'pink', 'mint'], x: 560, y: 1120, rot: -4, size: 120 },
  ];
  return (
    <ColorStage theme={theme} color={bg}>
      <Headline
        theme={theme}
        text="Arkadaş grubunda şarkıyı ilk kim bilir?"
        size={124}
        maxLines={3}
        stagger={2}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 40 }}
      />
      {chips.map((ch, i) => (
        <Sticker
          key={ch.name}
          theme={theme}
          text={ch.name}
          bg={stickerOn(theme, bg, ch.prefs)}
          rotate={ch.rot}
          enterAt={R3.names[i]}
          size={ch.size}
          style={{ position: 'absolute', left: ch.x, top: ch.y }}
        />
      ))}
    </ColorStage>
  );
};

const pressAt = (frame: number, at: number) =>
  interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Typed letters of the artist's name, one every `typeEvery` frames (3 letters, like a real search). */
export const typedAt = (frame: number, artist: string) => {
  const prefix = [...artist.trim()].slice(0, 3).join('');
  const n = Math.max(0, Math.min([...prefix].length, Math.floor((frame - R3.typeFrom) / R3.typeEvery) + 1));
  return [...prefix].slice(0, n).join('');
};

/** Answer second in the list, like App Store 03.png. */
export const suggestionList = (answer: string, decoys: string[]) => {
  const [a, b] = decoys;
  return [a, answer, b].filter((x): x is string => !!x);
};

export function gameState(frame: number, p: Pick<R3Props, 'artist' | 'title' | 'decoys'>, c8: Crew) {
  const answer = `${p.artist} – ${p.title}`;
  const passed = frame >= R3.stages[0].pass + 4;
  const stage = passed ? 1 : 0;
  const fill = passed
    ? interpolate(frame, [R3.stages[0].pass + 4, R3.stages[0].pass + 10], [STOPS[0]!, STOPS[1]!], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : STOPS[0]!;
  const s = R3.stages[stage]!;
  const playing = frame >= s.clip && frame < s.clip + Math.max(Math.round(CLIPS[stage]! * VIDEO.fps), 6);
  const won = frame >= R3.tap;
  const list = suggestionList(answer, p.decoys);
  const guess = won ? answer : frame >= R3.typeFrom ? typedAt(frame, p.artist) : undefined;
  const suggestions = !won && frame >= R3.list ? list : undefined;
  const selected = frame >= R3.select && suggestions ? list.indexOf(answer) : undefined;

  const feed: FeedLine[] = [];
  if (won) feed.push({ name: 'Sen', text: `${clipShort(CLIPS[1]!)}’de bildi`, points: WIN_POINTS, color: songieTheme.colors.yellow });
  if (passed) feed.push({ name: 'Sen', text: 'pas geçti', color: APP.red });
  if (frame >= R3.friendPass) feed.push({ name: c8.others[0], text: 'pas geçti', color: APP.red });

  const climb = interpolate(frame, [R3.tap + 2, R3.climbTo], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const me = Math.round(2150 + WIN_POINTS * climb);
  const lead = me > 2420;
  const t = songieTheme.colors;
  const rows: ScoreRow[] = [
    { name: c8.solver, score: 2420, color: lead ? t.panel : t.mint },
    { name: 'Sen', score: me, color: lead ? t.mint : t.yellow, me: true },
    { name: c8.others[0], score: 1780, color: t.panel },
    { name: c8.others[1], score: 920, color: t.panel },
  ].sort((a, b) => b.score - a.score);

  return { stage, fill, playing, guess, suggestions, selected, won, feed: feed.slice(0, 3), scores: rows, lead };
}

/** 108–338: the play screen; you miss 0,1 sn, then type and pick the song at 0,5 sn and overtake the leader. */
const Game: React.FC<{ theme: AppTheme; bg: string; c8: Crew; p: R3Props }> = ({ theme, bg, c8, p }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const g = gameState(frame, p, c8);
  const cur = R3.stages[g.stage]!;
  return (
    <ColorStage theme={theme} color={bg}>
      <div
        style={{
          position: 'absolute',
          left: CX - PHONE_W / 2,
          top: SAFE.top + 20,
          transform: `translateY(${interpolate(enter, [0, 1], [900, 0])}px) rotate(${interpolate(enter, [0, 1], [-6, 1.5])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
          <SongPlayScreen
            theme={theme}
            stage={g.stage}
            fill={g.fill}
            playing={g.playing}
            press={pressAt(frame, cur.play)}
            skipPress={pressAt(frame, R3.stages[0].pass)}
            guess={g.guess}
            caret={!g.won && frame >= R3.typeFrom && Math.floor(frame / 8) % 2 === 0}
            suggestions={g.suggestions}
            selected={g.selected}
            feed={g.feed}
            scores={g.scores}
            status={listening(c8)}
          />
        </PhoneFrame>
      </div>
      <Sequence from={g.stage === 0 ? 0 : R3.stages[0].pass + 4} layout="none" key={`stage${g.stage}`}>
        <Sticker
          theme={theme}
          text={`${clipTr(CLIPS[g.stage]!)} SN`}
          bg={stickerOn(theme, bg, ['pink', 'yellow', 'mint'])}
          rotate={7}
          enterAt={g.stage === 0 ? 6 : 0}
          size={96}
          style={{ position: 'absolute', right: SAFE.side, top: SAFE.top }}
        />
      </Sequence>
      {frame >= R3.typeFrom && frame < R3.tap && (
        <Sequence from={R3.typeFrom} layout="none">
          <Sticker
            theme={theme}
            text="Tanıdık geldi… 👀"
            bg={stickerOn(theme, bg, ['paper', 'yellow'])}
            rotate={-5}
            size={76}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
      {frame >= R3.tap && frame < R3.lead && (
        <Sequence from={R3.tap} layout="none">
          <Sticker
            theme={theme}
            text={`Bildin! +${WIN_POINTS}`}
            bg={stickerOn(theme, bg, ['mint', 'yellow', 'sky'])}
            rotate={-4}
            size={96}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y - 10 }}
          />
        </Sequence>
      )}
      {frame >= R3.lead && (
        <Sequence from={R3.lead} layout="none">
          <Sticker
            theme={theme}
            text="Liderliğe yükseldin! 🏆"
            bg={stickerOn(theme, bg, ['yellow', 'mint', 'pink'])}
            rotate={-3}
            size={76}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </ColorStage>
  );
};

/** 346–431: the reveal, this time "Bildin!", with your result above the leader's. */
const Reveal: React.FC<{ theme: AppTheme; p: R3Props; bg: string; c8: Crew }> = ({ theme, p, bg, c8 }) => {
  const c = theme.colors;
  const enter = usePop(0, 14);
  return (
    <ColorStage theme={theme} color={bg}>
      <div
        style={{
          position: 'absolute',
          left: CX - PHONE_W / 2,
          top: SAFE.top + 20,
          transform: `translateY(${interpolate(enter, [0, 1], [700, 0])}px) rotate(${interpolate(enter, [0, 1], [6, -1.5])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
          <RevealScreen
            theme={theme}
            title={p.title}
            artist={p.artist}
            album={p.album}
            cover={hasStaticFile(p.cover) ? p.cover : ''}
            won
            results={[
              { name: 'Sen', how: `${clipShort(CLIPS[1]!)}’de`, points: WIN_POINTS, color: c.yellow },
              { name: c8.solver, how: `${clipShort(CLIPS[2]!)}’de`, points: 450, color: c.mint },
            ]}
            enterAt={6}
          />
        </PhoneFrame>
      </div>
      <Sticker
        theme={theme}
        text="Şarkı buydu! 🎶"
        bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
        rotate={-5}
        enterAt={14}
        size={84}
        style={{ position: 'absolute', left: SAFE.side, top: 1340 }}
      />
    </ColorStage>
  );
};

const Song: React.FC<{ src: string; from: number }> = ({ src, from }) => {
  if (!hasStaticFile(src)) return null;
  const start = Math.round(from * VIDEO.fps);
  const bgFrom = R3.wipe2;
  const bgFrames = R3_META.durationInFrames - bgFrom;
  return (
    <>
      {R3.stages.map((s, i) => (
        <Sequence key={i} from={R3.game + s.clip} durationInFrames={Math.round(CLIPS[i]! * VIDEO.fps)} layout="none" name={`${clipTr(CLIPS[i]!)} sn`}>
          <Audio src={staticFile(src)} trimBefore={start} />
        </Sequence>
      ))}
      <Sequence from={bgFrom} durationInFrames={bgFrames} layout="none" name="şarkı">
        <Audio
          src={staticFile(src)}
          trimBefore={start}
          volume={(f) =>
            MUSIC_VOLUME *
            interpolate(f, [0, 6, bgFrames - R3.songFadeOut, bgFrames], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      </Sequence>
    </>
  );
};

export const R3Winner: React.FC<R3Props> = (p) => {
  const theme = songieTheme;
  const [A, B, C, D] = scenePalette(theme, p.palette);
  const c8 = crew(p.solver);
  const typed = [...p.artist.trim()].slice(0, 3).length;
  return (
    <AbsoluteFill style={{ backgroundColor: A }}>
      <Sequence durationInFrames={R3.wipe1} name="Hook">
        <Hook theme={theme} bg={A} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={A} to={B} at={R3.wipe1} durationInFrames={R3.game - R3.wipe1} />
      <Sequence from={R3.game} durationInFrames={R3.wipe2 - R3.game} name="Game">
        <Game theme={theme} bg={B} c8={c8} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={B} to={C} at={R3.wipe2} durationInFrames={R3.reveal - R3.wipe2} />
      <Sequence from={R3.reveal} durationInFrames={R3.wipe3 - R3.reveal} name="Reveal">
        <Reveal theme={theme} p={p} bg={C} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={C} to={D} at={R3.wipe3} durationInFrames={R3.cta - R3.wipe3} />
      <Sequence from={R3.cta} name="CTA">
        <ColorStage theme={theme} color={D}>
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </ColorStage>
      </Sequence>

      <Song src={p.song} from={p.songFrom} />
      {R3.names.map((f) => (
        <Sfx key={f} name="pop" at={f} />
      ))}
      <Sfx name="buzz" at={R3.game + R3.stages[0].pass + 2} frames={10} />
      {Array.from({ length: typed }, (_, i) => (
        <Sfx key={`k${i}`} name="tick" at={R3.game + R3.typeFrom + i * R3.typeEvery} frames={4} />
      ))}
      <Sfx name="pop" at={R3.game + R3.list} />
      <Sfx name="ding" at={R3.game + R3.tap} frames={30} />
      <Sfx name="pop" at={R3.game + R3.lead} />
      <Sfx name="pop" at={R3.cta + 18} />
    </AbsoluteFill>
  );
};
