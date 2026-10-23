import React from 'react';
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
import { NeverAnswerScreen } from '../../brand/itiraf/NeverAnswerScreen';
import { NeverRevealScreen } from '../../brand/itiraf/NeverRevealScreen';
import { splitStatement } from '../../brand/itiraf/neverText';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, deDa, solverSchema, type Crew } from '../friends';

export const i1Schema = z.object({
  /** A real "Ben hiç …" card from games/never/server/content. */
  statement: z.string().refine((s) => /^Ben hiç\s+\S/u.test(s.trim()), { message: 'must start with "Ben hiç"' }),
  category: z.string(),
  /** Background music (Deezer preview inside public/), from this second. */
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  palette: z.number().int().min(0),
  /** The friend whose turn it is to tell the story. */
  solver: solverSchema,
});

export type I1Props = z.infer<typeof i1Schema>;

/**
 * Ben Hiç, R2 pace (~16 sn): the statement is put to the viewer ("Sen yaptın mı?"), then the real answer
 * screen (you press "Yaptım", answers tick in, "Cevapları şimdi aç"), the reveal, the closing. Game beats are
 * local to `game`.
 */
export const I1 = {
  card: 8,
  ask: 50,
  wipe1: 105,
  game: 113,
  press: 30,
  answers: [0, 60, 82, 104, 120],
  revealPress: 134,
  wipe2: 268,
  reveal: 276,
  youToo: 28,
  wipe3: 386,
  cta: 394,
} as const;

export const I1_META = {
  id: 'itiraf-01-ben-hic',
  durationInFrames: 469,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    statement: 'Ben hiç eski sevgilimin sosyal medyasını gizlice incelemedim.',
    category: 'Aşk ve ilişki',
    music: 'assets/songs/2124280777.mp3',
    musicFrom: 0,
    palette: 2,
    solver: 'Mert',
  } as I1Props,
} as const;

export const CTA_TEXT = 'Arkadaşlarınla en dürüst gece!';
const TOTAL = 6;

/** Who did it on the reveal: you, the storyteller and one friend; three did not. */
export const roster = (c: Crew) => ({
  did: ['Sen', c.solver, c.others[1]],
  didnt: [c.others[0], c.others[2], 'Bora'],
});

/** Answered count at a local game frame: 2 when the scene opens, you at `press`, then the rest tick in. */
export function answeredAt(frame: number): number {
  let n = 2;
  if (frame >= I1.press) n++;
  for (const at of I1.answers.slice(1)) if (frame >= at) n++;
  return Math.min(n, TOTAL);
}

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={0.9} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;
const STICKER_Y = 1340;

/** 0–105: "Dürüst ol", the statement on a big mint card, "Sen yaptın mı?". */
const Hook: React.FC<{ theme: AppTheme; bg: string; statement: string; category: string }> = ({ theme, bg, statement, category }) => {
  const c = theme.colors;
  const card = usePop(I1.card, 12);
  const cardBg = stickerOn(theme, bg, ['mint', 'yellow', 'sky']);
  return (
    <ColorStage theme={theme} color={bg}>
      <Sticker
        theme={theme}
        text="Dürüst ol 🤫"
        bg={c.paper}
        rotate={-5}
        size={84}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 10 }}
      />
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          top: 470,
          width: VIDEO.width - 2 * SAFE.side,
          boxSizing: 'border-box',
          padding: '56px 52px 48px',
          border: `6px solid ${c.ink}`,
          borderRadius: 44,
          background: cardBg,
          boxShadow: `14px 14px 0 ${c.ink}`,
          transform: `translateY(${interpolate(card, [0, 1], [300, 0])}px) rotate(${interpolate(card, [0, 1], [6, -2])}deg)`,
          opacity: Math.min(1, card * 2),
          color: c.ink,
        }}
      >
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 64, lineHeight: 1, marginBottom: 14 }}>Ben hiç…</div>
        <Headline theme={theme} text={splitStatement(statement)} enterAt={I1.card + 6} size={88} minSize={52} maxLines={4} maxWidth={850} style={{ textAlign: 'left' }} />
        <div style={{ marginTop: 22, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 34, opacity: 0.8 }}>{category}</div>
      </div>
      <Sticker
        theme={theme}
        text="Sen yaptın mı?"
        bg={stickerOn(theme, bg, ['pink', 'yellow', 'lilac'])}
        rotate={4}
        enterAt={I1.ask}
        size={104}
        style={{ position: 'absolute', right: SAFE.side, top: STICKER_Y - 20 }}
      />
    </ColorStage>
  );
};

/** 113–268: the answer screen. You press "Yaptım"; nobody sees it; everyone answers; "Cevapları şimdi aç". */
const Game: React.FC<{ theme: AppTheme; bg: string; p: I1Props }> = ({ theme, bg, p }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  const n = answeredAt(frame);
  const press = interpolate(frame, [I1.press, I1.press + 3, I1.press + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const revealPress = interpolate(frame, [I1.revealPress, I1.revealPress + 3, I1.revealPress + 8], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const all = frame >= I1.answers[I1.answers.length - 1]!;
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
          <NeverAnswerScreen
            theme={theme}
            statement={p.statement}
            category={p.category}
            seconds={Math.max(1, 18 - Math.floor(frame / 30))}
            choice={frame >= I1.press + 4 ? 'did' : undefined}
            pressDid={press}
            answered={n}
            total={TOTAL}
            revealPress={revealPress}
          />
        </PhoneFrame>
      </div>
      {frame >= I1.press + 6 && !all && (
        <Sequence from={I1.press + 6} layout="none">
          <Sticker
            theme={theme}
            text="Kimse görmüyor… 🤫"
            bg={stickerOn(theme, bg, ['paper', 'yellow'])}
            rotate={-5}
            size={84}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
      {all && (
        <Sequence from={I1.answers[I1.answers.length - 1]!} layout="none">
          <Sticker
            theme={theme}
            text="Herkes cevapladı!"
            bg={stickerOn(theme, bg, ['mint', 'yellow', 'sky'])}
            rotate={-4}
            size={84}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </ColorStage>
  );
};

/** 276–386: who did it. You too. */
const Reveal: React.FC<{ theme: AppTheme; bg: string; p: I1Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const enter = usePop(0, 14);
  const r = roster(c8);
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
          <NeverRevealScreen
            theme={theme}
            statement={p.statement}
            category={p.category}
            did={r.did}
            didnt={r.didnt}
            you="did"
            storyteller={c8.solver}
            enterAt={6}
          />
        </PhoneFrame>
      </div>
      <Sticker
        theme={theme}
        text={`${c8.solver} ${deDa(c8.solver)} yapmış! 😂`}
        bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
        rotate={-4}
        enterAt={I1.youToo}
        size={84}
        style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
      />
    </ColorStage>
  );
};

export const I1Never: React.FC<I1Props> = (p) => {
  const theme = itirafTheme;
  const [A, B, C, D] = scenePalette(theme, p.palette);
  const c8 = crew(p.solver);
  return (
    <AbsoluteFill style={{ backgroundColor: A }}>
      <Sequence durationInFrames={I1.wipe1} name="Hook">
        <Hook theme={theme} bg={A} statement={p.statement} category={p.category} />
      </Sequence>
      <ColorWipe theme={theme} from={A} to={B} at={I1.wipe1} durationInFrames={I1.game - I1.wipe1} />
      <Sequence from={I1.game} durationInFrames={I1.wipe2 - I1.game} name="Game">
        <Game theme={theme} bg={B} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={B} to={C} at={I1.wipe2} durationInFrames={I1.reveal - I1.wipe2} />
      <Sequence from={I1.reveal} durationInFrames={I1.wipe3 - I1.reveal} name="Reveal">
        <Reveal theme={theme} bg={C} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={C} to={D} at={I1.wipe3} durationInFrames={I1.cta - I1.wipe3} />
      <Sequence from={I1.cta} name="CTA">
        <ColorStage theme={theme} color={D}>
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </ColorStage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} volume={0.45} />
      <Sfx name="pop" at={I1.card} />
      <Sfx name="pop" at={I1.ask} />
      <Sfx name="pop" at={I1.game + I1.press} />
      {I1.answers.slice(1).map((f) => (
        <Sfx key={f} name="tick" at={I1.game + f} frames={4} />
      ))}
      <Sfx name="ding" at={I1.game + I1.revealPress} frames={30} />
      <Sfx name="pop" at={I1.reveal + I1.youToo} />
      <Sfx name="pop" at={I1.cta + 18} />
    </AbsoluteFill>
  );
};
