import React from 'react';
import { SFX_VOLUME } from '../../brand/mix';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ColorStage } from '../../brand/ColorStage';
import { ColorWipe } from '../../brand/ColorWipe';
import { CtaCard } from '../../brand/CtaCard';
import { FONT_BODY, FONT_DISPLAY, SAFE, VIDEO } from '../../brand/fonts';
import { Headline } from '../../brand/Headline';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { scenePalette, stickerOn } from '../../brand/palette';
import { PhoneFrame } from '../../brand/PhoneFrame';
import { Sticker } from '../../brand/Sticker';
import { ConfessionsGuessScreen } from '../../brand/itiraf/ConfessionsGuessScreen';
import { ConfessionsRevealScreen } from '../../brand/itiraf/ConfessionsRevealScreen';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, solverSchema, type Crew } from '../friends';

export const i3Schema = z.object({
  /** A topic from games/confessions/server/content. */
  topic: z.string().min(3),
  /** A player's confession (10–240 characters, like the game). */
  confession: z.string().min(10).max(240),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  palette: z.number().int().min(0),
  /** Who you suspect (wrongly). The real author is the next friend in the room. */
  solver: solverSchema,
});

export type I3Props = z.infer<typeof i3Schema>;

/**
 * İtiraf, R2 pace (~17,5 sn): an anonymous confession is put to the viewer ("Sence kim yazdı?"), the real
 * guess screen (reactions tick up, you pick a friend), the reveal (someone else wrote it), the closing.
 */
export const I3 = {
  card: 8,
  ask: 56,
  wipe1: 110,
  guess: 118,
  hush: 6,
  reacts: [30, 44, 58],
  select: 90,
  chosen: [0, 110, 130],
  wipe2: 318,
  reveal: 326,
  who: 34,
  wipe3: 446,
  cta: 454,
} as const;

export const I3_META = {
  id: 'itiraf-03-itiraf',
  durationInFrames: 524,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    topic: 'Bir ilk buluşmada yaşadığın en garip an',
    confession: 'İlk buluşmada garson "afiyet olsun" dedi, ben de heyecandan "sen de" dedim. Sonra bütün akşam aynı garsondan kaçtım.',
    music: 'assets/songs/3919449451.mp3',
    musicFrom: 0,
    palette: 5,
    solver: 'Mert',
  } as I3Props,
} as const;

export const CTA_TEXT = 'İsimsiz itiraf et, kim yazdı bil!';

/** The room: you, the suspect, the real author and three more friends (six, like 02.png). */
export function room(c: Crew) {
  const author = c.others[0];
  return { players: ['Sen', c.solver, author, c.others[1], c.others[2], 'Bora'], author, suspect: c.solver };
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

/** The yellow taped note from the guess screen, at poster size. */
export const BigNote: React.FC<{ theme: AppTheme; text: string; enterAt: number; tint?: string; children?: React.ReactNode }> = ({
  theme,
  text,
  enterAt,
  tint,
  children,
}) => {
  const c = theme.colors;
  const pop = usePop(enterAt, 12);
  return (
    <div
      style={{
        position: 'relative',
        width: VIDEO.width - 2 * SAFE.side,
        boxSizing: 'border-box',
        padding: '70px 56px 56px',
        border: `6px solid ${c.ink}`,
        borderRadius: 18,
        background: tint ?? c.cream,
        boxShadow: `14px 14px 0 ${c.ink}`,
        transform: `translateY(${interpolate(pop, [0, 1], [300, 0])}px) rotate(${interpolate(pop, [0, 1], [6, -2])}deg)`,
        opacity: Math.min(1, pop * 2),
        color: c.ink,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -24,
          left: '50%',
          width: 200,
          height: 48,
          marginLeft: -100,
          background: c.paper,
          opacity: 0.7,
          transform: 'rotate(-3deg)',
          border: `3px solid ${c.ink}33`,
        }}
      />
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 110, lineHeight: 0.6, color: c.yellow, WebkitTextStroke: `4px ${c.ink}` }}>
        “
      </div>
      <Headline theme={theme} text={text} enterAt={enterAt + 6} size={64} minSize={44} maxLines={6} maxWidth={840} style={{ textAlign: 'left' }} />
      {children}
    </div>
  );
};

/** 0–110: "İsimsiz bir itiraf geldi…", the note, "Sence kim yazdı? 🤔". */
const Hook: React.FC<{ theme: AppTheme; bg: string; p: I3Props }> = ({ theme, bg, p }) => (
  <ColorStage theme={theme} color={bg}>
    <Headline
      theme={theme}
      text="İsimsiz bir itiraf geldi… ✍️"
      size={96}
      maxLines={2}
      style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 10 }}
    />
    <div style={{ position: 'absolute', left: SAFE.side, top: 560 }}>
      <BigNote theme={theme} text={p.confession} enterAt={I3.card} />
    </div>
    <Sticker
      theme={theme}
      text="Sence kim yazdı? 🤔"
      bg={stickerOn(theme, bg, ['pink', 'yellow', 'mint'])}
      rotate={4}
      enterAt={I3.ask}
      size={96}
      style={{ position: 'absolute', right: SAFE.side, top: STICKER_Y + 30 }}
    />
  </ColorStage>
);

/** Reaction counts at a guess frame: "Yok artık", then your "Ben de!", then "Efsane". */
export function reactionsAt(frame: number) {
  const [a, b, c] = I3.reacts;
  return {
    yok: 1 + (frame >= a ? 1 : 0),
    bende: 2 + (frame >= b ? 1 : 0),
    efsane: frame >= c ? 1 : 0,
    olamaz: 0,
  };
}

/** 118–318: the guess screen. Reactions tick up, you press "Ben de!", then pick your suspect. */
const Guess: React.FC<{ theme: AppTheme; bg: string; p: I3Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const r = room(c8);
  const press = (at: number) => interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chosen = 3 + I3.chosen.filter((f) => frame >= f).length - (frame >= I3.select ? 0 : 0);
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
          <ConfessionsGuessScreen
            theme={theme}
            confession={p.confession}
            topic={p.topic}
            players={r.players}
            me="Sen"
            selected={frame >= I3.select + 4 ? r.suspect : undefined}
            selectPress={press(I3.select)}
            pressing={frame >= I3.select && frame < I3.select + 8 ? r.suspect : undefined}
            reactions={reactionsAt(frame)}
            myReactions={frame >= I3.reacts[1] ? ['bende'] : []}
            reactionPress={frame >= I3.reacts[1] && frame < I3.reacts[1] + 8 ? 'bende' : undefined}
            chosen={Math.min(6, chosen)}
            total={6}
            seconds={Math.max(1, 28 - Math.floor(frame / 30))}
          />
        </PhoneFrame>
      </div>
      {frame < I3.select && (
        <Sticker
          theme={theme}
          text="Yazanı kimse bilmiyor 🤫"
          bg={stickerOn(theme, bg, ['paper', 'yellow'])}
          rotate={-4}
          enterAt={I3.hush}
          size={76}
          style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
        />
      )}
      {frame >= I3.select + 4 && (
        <Sequence from={I3.select + 4} layout="none">
          <Sticker
            theme={theme}
            text={`Bence ${r.suspect}! 🕵️`}
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

/** 326–446: the author is revealed; it was not your suspect. */
const Reveal: React.FC<{ theme: AppTheme; bg: string; p: I3Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const enter = usePop(0, 14);
  const r = room(c8);
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
          <ConfessionsRevealScreen
            theme={theme}
            confession={p.confession}
            author={r.author}
            topic={p.topic}
            players={r.players}
            me="Sen"
            selected={r.suspect}
            votes={{ [r.suspect]: 3, [r.author]: 1, [r.players[3]!]: 1, Bora: 0, [r.players[4]!]: 0, Sen: 0 }}
            correct={[r.players[3]!]}
            fooled={4}
            reactions={reactionsAt(999)}
            myReactions={['bende']}
            enterAt={6}
          />
        </PhoneFrame>
      </div>
      <Sticker
        theme={theme}
        text={`${r.author} yazmış!! 😱`}
        bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
        rotate={-4}
        enterAt={I3.who}
        size={92}
        style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
      />
    </ColorStage>
  );
};

export const I3Confessions: React.FC<I3Props> = (p) => {
  const theme = itirafTheme;
  const [A, B, C, D] = scenePalette(theme, p.palette);
  const c8 = crew(p.solver);
  return (
    <AbsoluteFill style={{ backgroundColor: A }}>
      <Sequence durationInFrames={I3.wipe1} name="Hook">
        <Hook theme={theme} bg={A} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={A} to={B} at={I3.wipe1} durationInFrames={I3.guess - I3.wipe1} />
      <Sequence from={I3.guess} durationInFrames={I3.wipe2 - I3.guess} name="Guess">
        <Guess theme={theme} bg={B} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={B} to={C} at={I3.wipe2} durationInFrames={I3.reveal - I3.wipe2} />
      <Sequence from={I3.reveal} durationInFrames={I3.wipe3 - I3.reveal} name="Reveal">
        <Reveal theme={theme} bg={C} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={C} to={D} at={I3.wipe3} durationInFrames={I3.cta - I3.wipe3} />
      <Sequence from={I3.cta} name="CTA">
        <ColorStage theme={theme} color={D}>
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </ColorStage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="pop" at={I3.card} />
      <Sfx name="pop" at={I3.ask} />
      {I3.reacts.map((f) => (
        <Sfx key={f} name="tick" at={I3.guess + f} frames={4} />
      ))}
      <Sfx name="pop" at={I3.guess + I3.select} />
      <Sfx name="ding" at={I3.reveal + 12} frames={30} />
      <Sfx name="pop" at={I3.reveal + I3.who} />
      <Sfx name="pop" at={I3.cta + 18} />
    </AbsoluteFill>
  );
};
