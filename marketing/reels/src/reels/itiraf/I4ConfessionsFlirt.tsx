import React from 'react';
import { SFX_VOLUME } from '../../brand/mix';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ColorWipe } from '../../brand/ColorWipe';
import { CtaCard } from '../../brand/CtaCard';
import { FONT_BODY, FONT_DISPLAY, SAFE, VIDEO } from '../../brand/fonts';
import { Headline } from '../../brand/Headline';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { NightStage } from '../../brand/NightStage';
import { PhoneFrame } from '../../brand/PhoneFrame';
import { Sticker } from '../../brand/Sticker';
import { ConfessionsGuessScreen } from '../../brand/itiraf/ConfessionsGuessScreen';
import { ConfessionsRevealScreen } from '../../brand/itiraf/ConfessionsRevealScreen';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, solverSchema } from '../friends';
import { FLIRT_ACCENTS } from './I2NeverFlirt';
import { BigNote, reactionsAt } from './I3Confessions';

export const i4Schema = z.object({
  topic: z.string().min(3),
  confession: z.string().min(10).max(240),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  accent: z.number().int().min(0),
  /** Your date — who you suspect, and who really wrote it. */
  date: solverSchema,
});

export type I4Props = z.infer<typeof i4Schema>;

/**
 * İtiraf for flirts (+18), night look: "Odadaki biri hakkında isimsiz bir itiraf… 😳", a censored note that
 * peels open, the real guess screen where you pick your date, the reveal — they wrote it — and "Bahsettiği
 * kişi… sen misin? 😏". ~17,5 sn at the R2 pace.
 */
export const I4 = {
  card: 26,
  peel: 58,
  ask: 84,
  wipe1: 122,
  guess: 130,
  select: 96,
  wipe2: 318,
  reveal: 326,
  who: 30,
  aboutYou: 64,
  wipe3: 446,
  cta: 454,
} as const;

export const I4_META = {
  id: 'itiraf-04-itiraf-flort',
  durationInFrames: 524,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    topic: 'Bu odada çekici bulduğun biri hakkında bir itiraf',
    confession: 'Bu odada biri var… ilk tanıştığımız gece onu öpmemek için kendimi zor tuttum. Hâlâ aklımda. 😳',
    music: 'assets/songs/3919255051.mp3',
    musicFrom: 0,
    accent: 1,
    date: 'Zeynep',
  } as I4Props,
} as const;

export const CTA_TEXT = 'İsimsiz itiraf et… bakalım kim kızaracak 😏';

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

/** The room: you, your date, four friends. */
export const flirtRoom = (date: string) => {
  const c8 = crew(date);
  return ['Sen', c8.solver, c8.others[0], c8.others[1], c8.others[2], 'Bora'];
};

const Hook: React.FC<{ theme: AppTheme; accent: string; p: I4Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const peel = interpolate(frame, [I4.peel, I4.peel + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <NightStage theme={theme} accent={accent}>
      <Badge18 theme={theme} side="left" />
      <Headline
        theme={theme}
        text="Odadaki biri hakkında isimsiz bir itiraf… 😳"
        size={92}
        maxLines={3}
        color={c.paper}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 140 }}
      />
      <div style={{ position: 'absolute', left: SAFE.side, top: 720 }}>
        <BigNote theme={theme} text={p.confession} enterAt={I4.card} tint={accent}>
          <div
            style={{
              position: 'absolute',
              left: -30,
              right: -30,
              top: 120,
              height: 160,
              background: c.ink,
              transform: `translateX(${peel * 1250}px) rotate(-4deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 84,
              letterSpacing: 8,
              color: accent,
            }}
          >
            SANSÜRLÜ 🔞
          </div>
        </BigNote>
      </div>
      <Sticker
        theme={theme}
        text="Sence kim yazdı? 👀"
        bg={c.yellow}
        rotate={4}
        enterAt={I4.ask}
        size={92}
        style={{ position: 'absolute', right: SAFE.side, top: STICKER_Y + 60 }}
      />
    </NightStage>
  );
};

const Guess: React.FC<{ theme: AppTheme; accent: string; p: I4Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const players = flirtRoom(p.date);
  const date = p.date.trim();
  const press = interpolate(frame, [I4.select, I4.select + 3, I4.select + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
          <ConfessionsGuessScreen
            theme={theme}
            confession={p.confession}
            topic={p.topic}
            players={players}
            me="Sen"
            selected={frame >= I4.select + 4 ? date : undefined}
            selectPress={press}
            pressing={frame >= I4.select && frame < I4.select + 8 ? date : undefined}
            reactions={reactionsAt(frame)}
            myReactions={frame >= 44 ? ['bende'] : []}
            chosen={Math.min(6, 4 + (frame >= 120 ? 1 : 0) + (frame >= 140 ? 1 : 0))}
            total={6}
            seconds={Math.max(1, 28 - Math.floor(frame / 30))}
          />
        </PhoneFrame>
      </div>
      {frame < I4.select && (
        <Sticker theme={theme} text="Kalbin hızlandı mı? 💓" bg={c.paper} rotate={-4} enterAt={10} size={76} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
      )}
      {frame >= I4.select + 4 && (
        <Sequence from={I4.select + 4} layout="none">
          <Sticker theme={theme} text={`Bence ${date}… 👀`} bg={accent} rotate={-4} size={90} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
        </Sequence>
      )}
    </NightStage>
  );
};

const Reveal: React.FC<{ theme: AppTheme; accent: string; p: I4Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const players = flirtRoom(p.date);
  const date = p.date.trim();
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
          <ConfessionsRevealScreen
            theme={theme}
            confession={p.confession}
            author={date}
            topic={p.topic}
            players={players}
            me="Sen"
            selected={date}
            votes={{ [date]: 2, [players[2]!]: 2, [players[3]!]: 1, Bora: 0, [players[4]!]: 0, Sen: 0 }}
            correct={['Sen', players[3]!]}
            fooled={3}
            reactions={reactionsAt(999)}
            myReactions={['bende']}
            enterAt={6}
          />
        </PhoneFrame>
      </div>
      {frame < I4.aboutYou ? (
        <Sticker theme={theme} text={`${date} yazmış… 🙈`} bg={c.yellow} rotate={-4} enterAt={I4.who} size={92} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
      ) : (
        <Sequence from={I4.aboutYou} layout="none">
          <Sticker theme={theme} text="Bahsettiği kişi… sen misin? 😏" bg={accent} rotate={-3} size={60} style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }} />
        </Sequence>
      )}
    </NightStage>
  );
};

export const I4ConfessionsFlirt: React.FC<I4Props> = (p) => {
  const theme = itirafTheme;
  const c = theme.colors;
  const accent = c[FLIRT_ACCENTS[((p.accent % FLIRT_ACCENTS.length) + FLIRT_ACCENTS.length) % FLIRT_ACCENTS.length]!];
  return (
    <AbsoluteFill style={{ backgroundColor: c.bgDeep }}>
      <Sequence durationInFrames={I4.wipe1} name="Hook">
        <Hook theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={I4.wipe1} durationInFrames={I4.guess - I4.wipe1} />
      <Sequence from={I4.guess} durationInFrames={I4.wipe2 - I4.guess} name="Guess">
        <Guess theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={c.coral} to={c.bgDeep} at={I4.wipe2} durationInFrames={I4.reveal - I4.wipe2} />
      <Sequence from={I4.reveal} durationInFrames={I4.wipe3 - I4.reveal} name="Reveal">
        <Reveal theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={I4.wipe3} durationInFrames={I4.cta - I4.wipe3} />
      <Sequence from={I4.cta} name="CTA">
        <NightStage theme={theme} accent={accent}>
          <Badge18 theme={theme} />
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </NightStage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="pop" at={I4.card} />
      <Sfx name="whoosh" at={I4.peel} frames={12} />
      <Sfx name="pop" at={I4.ask} />
      <Sfx name="pop" at={I4.guess + I4.select} />
      <Sfx name="ding" at={I4.reveal + 12} frames={30} />
      <Sfx name="pop" at={I4.reveal + I4.who} />
      <Sfx name="pop" at={I4.reveal + I4.aboutYou} />
      <Sfx name="pop" at={I4.cta + 18} />
    </AbsoluteFill>
  );
};
