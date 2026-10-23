import React from 'react';
import { SFX_VOLUME } from '../../brand/mix';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ColorStage } from '../../brand/ColorStage';
import { ColorWipe } from '../../brand/ColorWipe';
import { CtaCard } from '../../brand/CtaCard';
import { SAFE, VIDEO } from '../../brand/fonts';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { NightStage } from '../../brand/NightStage';
import { scenePalette, stickerOn } from '../../brand/palette';
import { PhoneFrame } from '../../brand/PhoneFrame';
import { Sticker } from '../../brand/Sticker';
import { ParanoiaAnswerScreen } from '../../brand/itiraf/ParanoiaAnswerScreen';
import { ParanoiaEnvelopeScreen } from '../../brand/itiraf/ParanoiaEnvelopeScreen';
import { ParanoiaRevealScreen } from '../../brand/itiraf/ParanoiaRevealScreen';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, solverSchema, type Crew } from '../friends';
import { FLIRT_ACCENTS } from './I2NeverFlirt';

export const i9Schema = z.object({
  /** A question from games/paranoia/server/content ("Aramızda kim …?"). */
  question: z.string().min(8).max(120),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  palette: z.number().int().min(0),
  /** Who you pick as the answer (normal: a friend; flirt: your date). */
  solver: solverSchema,
  /** Flirt (+18) design: night stage, +18 badge, flirty copy. */
  flirt: z.boolean(),
});

export type I9Props = z.infer<typeof i9Schema>;

/**
 * Paranoya (~17,5 sn): a sealed envelope arrives (only you see it), you open it, the secret question, you
 * pick a friend and confirm, then the reveal shows everyone the question, who was asked and your answer.
 */
export const PN = {
  openPress: 84,
  opened: [88, 108] as const,
  wipe1: 110,
  answer: 118,
  select: 76,
  confirm: 118,
  wipe2: 318,
  reveal: 326,
  steps: [0, 22, 46] as const,
  react: 52,
  /** The follow-up sticker replaces the first one. */
  after: 88,
  wipe3: 446,
  cta: 454,
} as const;

const meta = (id: string, flirt: boolean, question: string, music: string, solver: string) =>
  ({
    id,
    durationInFrames: 524,
    fps: VIDEO.fps,
    width: VIDEO.width,
    height: VIDEO.height,
    defaultProps: { question, music, musicFrom: 0, palette: flirt ? 1 : 3, solver, flirt } as I9Props,
  }) as const;

export const I9_META = meta('itiraf-09-paranoya', false, 'Aramızda kim zombi kıyametinde ilk ölür?', 'assets/songs/3919490151.mp3', 'Mert');
export const I10_META = meta(
  'itiraf-10-paranoya-flort',
  true,
  'Aramızda kiminle bir gece geçirmek isterdin?',
  'assets/songs/3919638401.mp3',
  'Zeynep',
);

const COPY = {
  normal: {
    envelope: 'Sana gizli bir soru geldi… 🤫',
    onlyYou: 'Sadece sen görüyorsun 👀',
    pickTop: 'Cevabın kim? 🤔',
    picked: (n: string) => `Tabii ki ${n} 😏`,
    reveal: (n: string) => `${n}: "NE?!" 😱`,
    after: 'Paranoya başladı 😂',
    cta: 'Gizli sor, gizli cevapla… sonunda hepsi açılır!',
  },
  flirt: {
    envelope: 'Gizli soru geldi 😏',
    onlyYou: 'Şimdilik sadece sen 😈',
    pickTop: 'Dürüst ol… 👀',
    picked: (n: string) => `${n}… 🙈`,
    reveal: (n: string) => `Herkes öğrendi: ${n} 🔥`,
    after: (n: string) => `${n} kızardı 😳`,
    cta: 'Gizli soru, açık cevap… bu gece kim kızaracak? 😈',
  },
} as const;

/** Room for the reel: you, the sender (who sent you the question), your answer and three friends. */
export function pnRoom(c: Crew) {
  const sender = c.others[0];
  return { sender, target: c.solver, players: ['Sen', sender, c.solver, c.others[1], c.others[2], 'Bora'] };
}

/** Reveal step (0 question → 1 who was asked → 2 the answer) at a reveal-scene frame. */
export const pnStep = (frame: number): 0 | 1 | 2 => (frame >= PN.steps[2] ? 2 : frame >= PN.steps[1] ? 1 : 0);

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;
const STICKER_Y = 1350;

type StageProps = { theme: AppTheme; bg: string; flirt: boolean; children?: React.ReactNode };
const Stage: React.FC<StageProps> = ({ theme, bg, flirt, children }) =>
  flirt ? (
    <NightStage theme={theme} accent={bg}>
      {children}
    </NightStage>
  ) : (
    <ColorStage theme={theme} color={bg}>
      {children}
    </ColorStage>
  );

const Phone: React.FC<{ children: React.ReactNode; from?: number; tilt?: number }> = ({ children, from = 900, tilt = 6 }) => {
  const enter = usePop(0, 14);
  return (
    <div
      style={{
        position: 'absolute',
        left: CX - PHONE_W / 2,
        top: SAFE.top + 20,
        transform: `translateY(${interpolate(enter, [0, 1], [from, 0])}px) rotate(${interpolate(enter, [0, 1], [tilt, -1.5])}deg)`,
      }}
    >
      <PhoneFrame theme={itirafTheme} width={PHONE_W} height={PHONE_H}>
        {children}
      </PhoneFrame>
    </div>
  );
};

const Badge18: React.FC<{ theme: AppTheme }> = ({ theme }) => (
  <Sticker theme={theme} text="+18 🔥" bg={theme.colors.coral} rotate={8} enterAt={2} size={76} style={{ position: 'absolute', right: SAFE.side, top: SAFE.top }} />
);

const press = (frame: number, at: number) =>
  interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Envelope: React.FC<{ theme: AppTheme; bg: string; p: I9Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const t = p.flirt ? COPY.flirt : COPY.normal;
  const r = pnRoom(c8);
  const c = theme.colors;
  return (
    <Stage theme={theme} bg={bg} flirt={p.flirt}>
      <Phone>
        <ParanoiaEnvelopeScreen
          theme={theme}
          from={r.sender}
          openPress={press(frame, PN.openPress)}
          opened={interpolate(frame, [...PN.opened], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      </Phone>
      {p.flirt && <Badge18 theme={theme} />}
      <Sticker
        theme={theme}
        text={t.envelope}
        bg={p.flirt ? c.yellow : stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
        rotate={-4}
        enterAt={4}
        size={62}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top }}
      />
      <Sticker
        theme={theme}
        text={t.onlyYou}
        bg={p.flirt ? bg : stickerOn(theme, bg, ['paper', 'mint'])}
        rotate={3}
        enterAt={30}
        size={60}
        style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
      />
    </Stage>
  );
};

const Answer: React.FC<{ theme: AppTheme; bg: string; p: I9Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const t = p.flirt ? COPY.flirt : COPY.normal;
  const r = pnRoom(c8);
  const c = theme.colors;
  return (
    <Stage theme={theme} bg={bg} flirt={p.flirt}>
      <Phone>
        <ParanoiaAnswerScreen
          theme={theme}
          question={p.question}
          players={r.players}
          me="Sen"
          from={r.sender}
          selected={frame >= PN.select + 4 ? r.target : undefined}
          selectPress={press(frame, PN.select)}
          confirmPress={press(frame, PN.confirm)}
          seconds={Math.max(1, 30 - Math.floor(frame / 30))}
        />
      </Phone>
      {frame < PN.select ? (
        <Sticker
          theme={theme}
          text={t.pickTop}
          bg={p.flirt ? c.paper : stickerOn(theme, bg, ['paper', 'yellow'])}
          rotate={-4}
          enterAt={8}
          size={84}
          style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
        />
      ) : (
        <Sequence from={PN.select} layout="none">
          <Sticker
            theme={theme}
            text={t.picked(r.target)}
            bg={p.flirt ? bg : stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
            rotate={-4}
            size={90}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </Stage>
  );
};

const Reveal: React.FC<{ theme: AppTheme; bg: string; p: I9Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const t = p.flirt ? COPY.flirt : COPY.normal;
  const r = pnRoom(c8);
  const c = theme.colors;
  const after = p.flirt ? COPY.flirt.after(r.target) : COPY.normal.after;
  return (
    <Stage theme={theme} bg={bg} flirt={p.flirt}>
      <Phone from={700} tilt={-6}>
        <ParanoiaRevealScreen theme={theme} question={p.question} asked="Sen" answer={r.target} me="Sen" step={pnStep(frame)} />
      </Phone>
      {frame >= PN.react && frame < PN.after && (
        <Sequence from={PN.react} layout="none">
          <Sticker
            theme={theme}
            text={t.reveal(r.target)}
            bg={p.flirt ? c.coral : stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
            rotate={-4}
            size={80}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
      {frame >= PN.after && (
        <Sequence from={PN.after} layout="none">
          <Sticker
            theme={theme}
            text={after}
            bg={p.flirt ? c.yellow : stickerOn(theme, bg, ['pink', 'yellow', 'mint'])}
            rotate={-3}
            size={84}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </Stage>
  );
};

export const I9Paranoia: React.FC<I9Props> = (p) => {
  const theme = itirafTheme;
  const c = theme.colors;
  const c8 = crew(p.solver);
  const pal = scenePalette(theme, p.palette);
  const accent = c[FLIRT_ACCENTS[((p.palette % FLIRT_ACCENTS.length) + FLIRT_ACCENTS.length) % FLIRT_ACCENTS.length]!];
  const [A, B, C, D] = p.flirt ? [accent, accent, accent, accent] : pal;
  const wipeFrom = (x: string) => (p.flirt ? x : x);
  const wipeTo = (x: string) => (p.flirt ? c.bgDeep : x);
  const t = p.flirt ? COPY.flirt : COPY.normal;
  return (
    <AbsoluteFill style={{ backgroundColor: p.flirt ? c.bgDeep : A }}>
      <Sequence durationInFrames={PN.wipe1} name="Envelope">
        <Envelope theme={theme} bg={A} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={wipeFrom(A)} to={wipeTo(B)} at={PN.wipe1} durationInFrames={PN.answer - PN.wipe1} />
      <Sequence from={PN.answer} durationInFrames={PN.wipe2 - PN.answer} name="Answer">
        <Answer theme={theme} bg={B} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={p.flirt ? c.coral : B} to={wipeTo(C)} at={PN.wipe2} durationInFrames={PN.reveal - PN.wipe2} />
      <Sequence from={PN.reveal} durationInFrames={PN.wipe3 - PN.reveal} name="Reveal">
        <Reveal theme={theme} bg={C} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={wipeFrom(C)} to={wipeTo(D)} at={PN.wipe3} durationInFrames={PN.cta - PN.wipe3} />
      <Sequence from={PN.cta} name="CTA">
        <Stage theme={theme} bg={D} flirt={p.flirt}>
          {p.flirt && <Badge18 theme={theme} />}
          <CtaCard theme={theme} cta={t.cta} />
        </Stage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="pop" at={4} />
      <Sfx name="pop" at={PN.openPress} />
      <Sfx name="whoosh" at={PN.opened[0]} frames={12} />
      <Sfx name="pop" at={PN.answer + PN.select} />
      <Sfx name="ding" at={PN.answer + PN.confirm} frames={30} />
      {PN.steps.slice(1).map((f) => (
        <Sfx key={f} name="tick" at={PN.reveal + f} frames={4} />
      ))}
      <Sfx name="pop" at={PN.reveal + PN.react} />
      <Sfx name="pop" at={PN.reveal + PN.after} />
      <Sfx name="pop" at={PN.cta + 18} />
    </AbsoluteFill>
  );
};
