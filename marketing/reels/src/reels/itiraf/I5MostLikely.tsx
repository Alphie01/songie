import React from 'react';
import { SFX_VOLUME } from '../../brand/mix';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ColorStage } from '../../brand/ColorStage';
import { ColorWipe } from '../../brand/ColorWipe';
import { CtaCard } from '../../brand/CtaCard';
import { FONT_DISPLAY, SAFE, VIDEO } from '../../brand/fonts';
import { Headline } from '../../brand/Headline';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { scenePalette, stickerOn } from '../../brand/palette';
import { PhoneFrame } from '../../brand/PhoneFrame';
import { Sticker } from '../../brand/Sticker';
import { MostLikelyResultScreen } from '../../brand/itiraf/MostLikelyResultScreen';
import { MostLikelyVoteScreen } from '../../brand/itiraf/MostLikelyVoteScreen';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, solverSchema, type Crew } from '../friends';

export const i5Schema = z.object({
  /** The trait from games/most-likely/server/content, without "Aramızdaki en" / "kim?" ("alarmı çok erteleyen"). */
  question: z.string().min(2).max(60),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  palette: z.number().int().min(0),
  /** The friend who takes the title. */
  solver: solverSchema,
});

export type I5Props = z.infer<typeof i5Schema>;

/**
 * Aramızdaki En, R2 pace (~17,5 sn): the question is put to the viewer, the real vote screen (check badges
 * tick in, you tap a friend), the results (that friend takes the title, you voted for them too), closing.
 */
export const ML = {
  card: 8,
  ask: 56,
  wipe1: 110,
  vote: 118,
  voters: [12, 30, 48],
  tap: 80,
  late: [104, 122],
  revealPress: 142,
  wipe2: 318,
  result: 326,
  title: 34,
  you: 72,
  wipe3: 446,
  cta: 454,
} as const;

export const I5_META = {
  id: 'itiraf-05-aramizdaki-en',
  durationInFrames: 524,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    question: 'alarmı çok erteleyen',
    music: 'assets/songs/2124184357.mp3',
    musicFrom: 0,
    palette: 4,
    solver: 'Kaan',
  } as I5Props,
} as const;

export const CTA_TEXT = 'Aramızdaki en… kim? Oyla, unvanı biri kapsın!';

/** Six players: you, the title holder and four friends; who has voted at a vote-scene frame. */
export function voteRoom(c: Crew) {
  const players = ['Sen', c.solver, c.others[0], c.others[1], c.others[2], 'Bora'];
  const order = [c.others[0], c.others[1], c.solver];
  return { players, order, late: [c.others[2], 'Bora'] };
}

export function votedAt(frame: number, c: Crew): string[] {
  const r = voteRoom(c);
  const v = r.order.filter((_, i) => frame >= ML.voters[i]!);
  if (frame >= ML.tap + 4) v.push('Sen');
  r.late.forEach((p, i) => frame >= ML.late[i]! && v.push(p));
  return v;
}

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;
const STICKER_Y = 1340;

/** The white question card with its yellow "Aramızdaki en…" sticker, at poster size. */
export const BigQuestion: React.FC<{ theme: AppTheme; question: string; enterAt: number; bg?: string; color?: string }> = ({
  theme,
  question,
  enterAt,
  bg,
  color,
}) => {
  const c = theme.colors;
  const pop = usePop(enterAt, 12);
  return (
    <div
      style={{
        position: 'relative',
        width: VIDEO.width - 2 * SAFE.side,
        boxSizing: 'border-box',
        padding: '84px 50px 60px',
        border: `6px solid ${c.ink}`,
        borderRadius: 40,
        background: bg ?? c.paper,
        boxShadow: `14px 14px 0 ${c.ink}`,
        transform: `translateY(${interpolate(pop, [0, 1], [300, 0])}px) rotate(${interpolate(pop, [0, 1], [6, -2])}deg)`,
        opacity: Math.min(1, pop * 2),
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -38,
          left: '50%',
          transform: 'translateX(-50%) rotate(-3deg)',
          padding: '10px 30px',
          border: `5px solid ${c.ink}`,
          borderRadius: 999,
          background: c.yellow,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 44,
          color: c.ink,
          whiteSpace: 'nowrap',
        }}
      >
        Aramızdaki en…
      </div>
      <Headline theme={theme} text={`${question} kim?`} enterAt={enterAt + 6} size={104} minSize={60} maxLines={3} maxWidth={860} color={color} />
    </div>
  );
};

const Hook: React.FC<{ theme: AppTheme; bg: string; p: I5Props }> = ({ theme, bg, p }) => (
  <ColorStage theme={theme} color={bg}>
    <Sticker
      theme={theme}
      text="Dürüst ol, kim? 👀"
      bg={theme.colors.paper}
      rotate={-5}
      size={80}
      style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 10 }}
    />
    <div style={{ position: 'absolute', left: SAFE.side, top: 560 }}>
      <BigQuestion theme={theme} question={p.question} enterAt={ML.card} />
    </div>
    <Sticker
      theme={theme}
      text="Sizin grupta kim? 👇"
      bg={stickerOn(theme, bg, ['pink', 'yellow', 'mint'])}
      rotate={4}
      enterAt={ML.ask}
      size={92}
      style={{ position: 'absolute', right: SAFE.side, top: STICKER_Y }}
    />
  </ColorStage>
);

const press = (frame: number, at: number) =>
  interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Vote: React.FC<{ theme: AppTheme; bg: string; p: I5Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const r = voteRoom(c8);
  return (
    <ColorStage theme={theme} color={bg}>
      <div
        style={{
          position: 'absolute',
          left: CX - PHONE_W / 2,
          top: SAFE.top + 20,
          transform: `translateY(${interpolate(enter, [0, 1], [900, 0])}px) rotate(${interpolate(enter, [0, 1], [6, -1.5])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
          <MostLikelyVoteScreen
            theme={theme}
            question={p.question}
            players={r.players}
            me="Sen"
            voted={votedAt(frame, c8)}
            myVote={frame >= ML.tap + 4 ? c8.solver : undefined}
            votePress={press(frame, ML.tap)}
            pressing={frame >= ML.tap && frame < ML.tap + 8 ? c8.solver : undefined}
            seconds={Math.max(1, 20 - Math.floor(frame / 30))}
            revealPress={press(frame, ML.revealPress)}
          />
        </PhoneFrame>
      </div>
      {frame < ML.tap ? (
        <Sticker
          theme={theme}
          text="Oylar isimsiz 🤫"
          bg={stickerOn(theme, bg, ['paper', 'yellow'])}
          rotate={-4}
          enterAt={8}
          size={84}
          style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
        />
      ) : (
        <Sequence from={ML.tap} layout="none">
          <Sticker
            theme={theme}
            text={`Tabii ki ${c8.solver} 😂`}
            bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
            rotate={-4}
            size={90}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </ColorStage>
  );
};

/** Votes and open ballots on the results: the title holder gets 3 incl. yours. */
export function results(c: Crew) {
  return {
    votes: { [c.solver]: 3, [c.others[0]]: 2, Bora: 1 } as Record<string, number>,
    ballots: [
      { voter: 'Sen', target: c.solver },
      { voter: c.others[0], target: c.solver },
      { voter: c.others[1], target: c.solver },
      { voter: c.solver, target: c.others[0] },
      { voter: 'Bora', target: c.others[0] },
      { voter: c.others[2], target: 'Bora' },
    ],
  };
}

const Result: React.FC<{ theme: AppTheme; bg: string; p: I5Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const r = results(c8);
  return (
    <ColorStage theme={theme} color={bg}>
      <div
        style={{
          position: 'absolute',
          left: CX - PHONE_W / 2,
          top: SAFE.top + 20,
          transform: `translateY(${interpolate(enter, [0, 1], [700, 0])}px) rotate(${interpolate(enter, [0, 1], [-6, 1.5])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
          <MostLikelyResultScreen
            theme={theme}
            question={p.question}
            players={voteRoom(c8).players}
            me="Sen"
            votes={r.votes}
            ballots={r.ballots}
            enterAt={6}
          />
        </PhoneFrame>
      </div>
      {frame < ML.you ? (
        <Sticker
          theme={theme}
          text={`${c8.solver} unvanı kaptı! 🏆`}
          bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
          rotate={-4}
          enterAt={ML.title}
          size={88}
          style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
        />
      ) : (
        <Sequence from={ML.you} layout="none">
          <Sticker
            theme={theme}
            text="Sen de ona oy verdin 😂"
            bg={stickerOn(theme, bg, ['pink', 'yellow', 'mint'])}
            rotate={-3}
            size={78}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </ColorStage>
  );
};

export const I5MostLikely: React.FC<I5Props> = (p) => {
  const theme = itirafTheme;
  const [A, B, C, D] = scenePalette(theme, p.palette);
  const c8 = crew(p.solver);
  return (
    <AbsoluteFill style={{ backgroundColor: A }}>
      <Sequence durationInFrames={ML.wipe1} name="Hook">
        <Hook theme={theme} bg={A} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={A} to={B} at={ML.wipe1} durationInFrames={ML.vote - ML.wipe1} />
      <Sequence from={ML.vote} durationInFrames={ML.wipe2 - ML.vote} name="Vote">
        <Vote theme={theme} bg={B} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={B} to={C} at={ML.wipe2} durationInFrames={ML.result - ML.wipe2} />
      <Sequence from={ML.result} durationInFrames={ML.wipe3 - ML.result} name="Result">
        <Result theme={theme} bg={C} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={C} to={D} at={ML.wipe3} durationInFrames={ML.cta - ML.wipe3} />
      <Sequence from={ML.cta} name="CTA">
        <ColorStage theme={theme} color={D}>
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </ColorStage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="pop" at={ML.card} />
      <Sfx name="pop" at={ML.ask} />
      {[...ML.voters, ...ML.late].map((f) => (
        <Sfx key={f} name="tick" at={ML.vote + f} frames={4} />
      ))}
      <Sfx name="pop" at={ML.vote + ML.tap} />
      <Sfx name="ding" at={ML.vote + ML.revealPress} frames={30} />
      <Sfx name="pop" at={ML.result + ML.title} />
      <Sfx name="pop" at={ML.result + ML.you} />
      <Sfx name="pop" at={ML.cta + 18} />
    </AbsoluteFill>
  );
};
