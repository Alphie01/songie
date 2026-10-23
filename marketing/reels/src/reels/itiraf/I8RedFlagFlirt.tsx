import React from 'react';
import { SFX_VOLUME } from '../../brand/mix';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ColorWipe } from '../../brand/ColorWipe';
import { CtaCard } from '../../brand/CtaCard';
import { SAFE, VIDEO } from '../../brand/fonts';
import { Headline } from '../../brand/Headline';
import { Music } from '../../brand/Music';
import { NightStage } from '../../brand/NightStage';
import { Sticker } from '../../brand/Sticker';
import type { RedFlagVote } from '../../brand/itiraf/redFlagText';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, solverSchema } from '../friends';
import { FLIRT_ACCENTS } from './I2NeverFlirt';
import { BigSituation, RF, RFRevealPhone, RFVotePhone } from './I7RedFlag';

export const i8Schema = z.object({
  situation: z.string().min(10).max(200),
  category: z.string(),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  accent: z.number().int().min(0),
  /** Your date: you say green, they say red. */
  date: solverSchema,
});

export type I8Props = z.infer<typeof i8Schema>;

/**
 * Red Flag for flirts (+18), night look: "Flörtün buna ne der? 👀", you raise green, the reveal shows your date
 * raised red — "Bu gece tartışma garanti 🔥". Same beats as the normal reel (RF).
 */
export const I8_META = {
  id: 'itiraf-08-red-flag-flort',
  durationInFrames: 524,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    situation: 'Sevgilin eski sevgilisinin hikâyelerini izliyor ama beğenmiyor.',
    category: 'Sosyal medya',
    music: 'assets/songs/3919255131.mp3',
    musicFrom: 0,
    accent: 2,
    date: 'Zeynep',
  } as I8Props,
} as const;

export const CTA_TEXT = 'Flörtünle oyna… bayraklar konuşsun 🚩💚';

/** You green, your date red, the room split. */
export function flirtBallots(date: string): { name: string; vote: RedFlagVote }[] {
  const c8 = crew(date);
  return [
    { name: 'Sen', vote: 'green' },
    { name: c8.solver, vote: 'red' },
    { name: c8.others[0], vote: 'red' },
    { name: c8.others[1], vote: 'green' },
    { name: 'Bora', vote: 'red' },
    { name: c8.others[2], vote: 'never' },
  ];
}

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

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

const Hook: React.FC<{ theme: AppTheme; accent: string; p: I8Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  return (
    <NightStage theme={theme} accent={accent}>
      <Badge18 theme={theme} side="left" />
      <Headline
        theme={theme}
        text="Flörtün buna ne der? 👀"
        size={88}
        maxLines={2}
        color={c.paper}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 140 }}
      />
      <div style={{ position: 'absolute', left: SAFE.side, top: 640 }}>
        <BigSituation theme={theme} text={p.situation} category={p.category} enterAt={RF.card} bg={accent} />
      </div>
      <Sticker
        theme={theme}
        text="Red mi, green mi? 🚩💚"
        bg={c.yellow}
        rotate={4}
        enterAt={RF.ask}
        size={84}
        style={{ position: 'absolute', right: SAFE.side, top: STICKER_Y + 40 }}
      />
    </NightStage>
  );
};

const Vote: React.FC<{ theme: AppTheme; accent: string; p: I8Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  return (
    <NightStage theme={theme} accent={accent}>
      <RFVotePhone theme={theme} situation={p.situation} category={p.category} mine="green" />
      {frame < RF.tap ? (
        <Sticker theme={theme} text="Kimse görmüyor 🤫" bg={c.paper} rotate={-4} enterAt={8} size={80} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
      ) : (
        <Sequence from={RF.tap} layout="none">
          <Sticker theme={theme} text="Bence sorun yok 💚" bg={c.mint} rotate={-4} size={86} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
        </Sequence>
      )}
    </NightStage>
  );
};

const Reveal: React.FC<{ theme: AppTheme; accent: string; p: I8Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const date = p.date.trim();
  return (
    <NightStage theme={theme} accent={accent}>
      <RFRevealPhone theme={theme} situation={p.situation} category={p.category} ballots={flirtBallots(date)} mine="green" />
      {frame < RF.you ? (
        <Sticker theme={theme} text={`${date}: red flag 🚩😳`} bg={c.coral} rotate={-4} enterAt={RF.verdict} size={86} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
      ) : (
        <Sequence from={RF.you} layout="none">
          <Sticker theme={theme} text="Bu gece tartışma garanti 🔥" bg={c.yellow} rotate={-3} size={72} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
        </Sequence>
      )}
    </NightStage>
  );
};

export const I8RedFlagFlirt: React.FC<I8Props> = (p) => {
  const theme = itirafTheme;
  const c = theme.colors;
  const accent = c[FLIRT_ACCENTS[((p.accent % FLIRT_ACCENTS.length) + FLIRT_ACCENTS.length) % FLIRT_ACCENTS.length]!];
  return (
    <AbsoluteFill style={{ backgroundColor: c.bgDeep }}>
      <Sequence durationInFrames={RF.wipe1} name="Hook">
        <Hook theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={RF.wipe1} durationInFrames={RF.vote - RF.wipe1} />
      <Sequence from={RF.vote} durationInFrames={RF.wipe2 - RF.vote} name="Vote">
        <Vote theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={c.coral} to={c.bgDeep} at={RF.wipe2} durationInFrames={RF.reveal - RF.wipe2} />
      <Sequence from={RF.reveal} durationInFrames={RF.wipe3 - RF.reveal} name="Reveal">
        <Reveal theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={RF.wipe3} durationInFrames={RF.cta - RF.wipe3} />
      <Sequence from={RF.cta} name="CTA">
        <NightStage theme={theme} accent={accent}>
          <Badge18 theme={theme} />
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </NightStage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="pop" at={RF.card} />
      <Sfx name="pop" at={RF.ask} />
      {[...RF.voters, ...RF.late].map((f) => (
        <Sfx key={f} name="tick" at={RF.vote + f} frames={4} />
      ))}
      <Sfx name="pop" at={RF.vote + RF.tap} />
      <Sfx name="ding" at={RF.vote + RF.revealPress} frames={30} />
      <Sfx name="pop" at={RF.reveal + RF.verdict} />
      <Sfx name="pop" at={RF.reveal + RF.you} />
      <Sfx name="pop" at={RF.cta + 18} />
    </AbsoluteFill>
  );
};
