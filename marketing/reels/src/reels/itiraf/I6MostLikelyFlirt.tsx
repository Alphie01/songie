import React from 'react';
import { SFX_VOLUME } from '../../brand/mix';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ColorWipe } from '../../brand/ColorWipe';
import { CtaCard } from '../../brand/CtaCard';
import { SAFE, VIDEO } from '../../brand/fonts';
import { Headline } from '../../brand/Headline';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { NightStage } from '../../brand/NightStage';
import { PhoneFrame } from '../../brand/PhoneFrame';
import { Sticker } from '../../brand/Sticker';
import { MostLikelyResultScreen } from '../../brand/itiraf/MostLikelyResultScreen';
import { MostLikelyVoteScreen } from '../../brand/itiraf/MostLikelyVoteScreen';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, dative, deDa, solverSchema } from '../friends';
import { FLIRT_ACCENTS } from './I2NeverFlirt';
import { BigQuestion, ML, voteRoom, votedAt } from './I5MostLikely';

export const i6Schema = z.object({
  question: z.string().min(2).max(60),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  accent: z.number().int().min(0),
  /** Your date: you vote for them, they take the title — and they voted for you. */
  date: solverSchema,
});

export type I6Props = z.infer<typeof i6Schema>;

/**
 * Aramızdaki En for flirts (+18), night look. "Aramızdaki en çekici kim? 😏", you secretly vote for your date,
 * they take the title, and the open votes show they voted for you: "Zeynep de sana oy vermiş 💘". Uses the same
 * beats as the normal reel (ML).
 */
export const I6_META = {
  id: 'itiraf-06-aramizdaki-en-flort',
  durationInFrames: 524,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    question: 'çekici',
    music: 'assets/songs/3919449411.mp3',
    musicFrom: 0,
    accent: 0,
    date: 'Zeynep',
  } as I6Props,
} as const;

export const CTA_TEXT = 'Gizlice oy ver… bakalım kim kime 💘';

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;
const STICKER_Y = 1350;

const Badge18: React.FC<{ theme: AppTheme; side?: 'left' | 'right' }> = ({ theme, side = 'right' }) => (
  <Sticker
    theme={theme}
    text="+18 🔥"
    bg={theme.colors.coral}
    rotate={side === 'left' ? -6 : 8}
    enterAt={2}
    size={76}
    style={{ position: 'absolute', [side]: SAFE.side, top: SAFE.top }}
  />
);

/** Open ballots: your date wins with 3 (yours included) and the one vote you got is theirs. */
export function flirtResults(date: string) {
  const c8 = crew(date);
  return {
    votes: { [c8.solver]: 3, [c8.others[0]]: 2, Sen: 1 } as Record<string, number>,
    ballots: [
      { voter: 'Sen', target: c8.solver },
      { voter: c8.others[0], target: c8.solver },
      { voter: c8.others[1], target: c8.solver },
      { voter: c8.solver, target: 'Sen' },
      { voter: 'Bora', target: c8.others[0] },
      { voter: c8.others[2], target: c8.others[0] },
    ],
  };
}

const press = (frame: number, at: number) =>
  interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Hook: React.FC<{ theme: AppTheme; accent: string; p: I6Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  return (
    <NightStage theme={theme} accent={accent}>
      <Badge18 theme={theme} side="left" />
      <Headline
        theme={theme}
        text="Gizli oylama başladı 😏"
        size={84}
        maxLines={2}
        color={c.paper}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 140 }}
      />
      <div style={{ position: 'absolute', left: SAFE.side, top: 680 }}>
        <BigQuestion theme={theme} question={p.question} enterAt={ML.card} bg={accent} />
      </div>
      <Sticker
        theme={theme}
        text="Sen kime verirdin? 👀"
        bg={c.yellow}
        rotate={4}
        enterAt={ML.ask}
        size={88}
        style={{ position: 'absolute', right: SAFE.side, top: STICKER_Y + 40 }}
      />
    </NightStage>
  );
};

const Vote: React.FC<{ theme: AppTheme; accent: string; p: I6Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const c8 = crew(p.date);
  return (
    <NightStage theme={theme} accent={accent}>
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
            players={voteRoom(c8).players}
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
        <Sticker theme={theme} text="Kimse görmeyecek 🤫" bg={c.paper} rotate={-4} enterAt={8} size={80} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
      ) : (
        <Sequence from={ML.tap} layout="none">
          <Sticker theme={theme} text={`Oyum ${dative(c8.solver)} 🙈`} bg={accent} rotate={-4} size={86} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
        </Sequence>
      )}
    </NightStage>
  );
};

const Result: React.FC<{ theme: AppTheme; accent: string; p: I6Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const c8 = crew(p.date);
  const r = flirtResults(p.date);
  return (
    <NightStage theme={theme} accent={accent}>
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
        <Sticker theme={theme} text={`${c8.solver} unvanı kaptı 😍`} bg={c.yellow} rotate={-4} enterAt={ML.title} size={86} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
      ) : (
        <Sequence from={ML.you} layout="none">
          <Sticker theme={theme} text={`${c8.solver} ${deDa(c8.solver)} sana oy vermiş 💘`} bg={accent} rotate={-3} size={64} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
        </Sequence>
      )}
    </NightStage>
  );
};

export const I6MostLikelyFlirt: React.FC<I6Props> = (p) => {
  const theme = itirafTheme;
  const c = theme.colors;
  const accent = c[FLIRT_ACCENTS[((p.accent % FLIRT_ACCENTS.length) + FLIRT_ACCENTS.length) % FLIRT_ACCENTS.length]!];
  return (
    <AbsoluteFill style={{ backgroundColor: c.bgDeep }}>
      <Sequence durationInFrames={ML.wipe1} name="Hook">
        <Hook theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={ML.wipe1} durationInFrames={ML.vote - ML.wipe1} />
      <Sequence from={ML.vote} durationInFrames={ML.wipe2 - ML.vote} name="Vote">
        <Vote theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={c.coral} to={c.bgDeep} at={ML.wipe2} durationInFrames={ML.result - ML.wipe2} />
      <Sequence from={ML.result} durationInFrames={ML.wipe3 - ML.result} name="Result">
        <Result theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={ML.wipe3} durationInFrames={ML.cta - ML.wipe3} />
      <Sequence from={ML.cta} name="CTA">
        <NightStage theme={theme} accent={accent}>
          <Badge18 theme={theme} />
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </NightStage>
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
