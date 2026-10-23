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
import { BottleChoiceScreen } from '../../brand/itiraf/BottleChoiceScreen';
import { BottleTableScreen } from '../../brand/itiraf/BottleTableScreen';
import { BottleTaskScreen } from '../../brand/itiraf/BottleTaskScreen';
import { bottleAngleFor, spinAt, type BottleKind } from '../../brand/itiraf/bottleText';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, deDa, solverSchema, type Crew } from '../friends';
import { FLIRT_ACCENTS } from './I2NeverFlirt';

export const i11Schema = z.object({
  kind: z.enum(['truth', 'dare']),
  /** A truth question or a dare from games/bottle/server/content. */
  text: z.string().min(8).max(160),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  palette: z.number().int().min(0),
  /** Who spins the bottle (flirt: your date). */
  solver: solverSchema,
  flirt: z.boolean(),
});

export type I11Props = z.infer<typeof i11Schema>;

/**
 * Şişe (~17,5 sn): your friend spins, the bottle stops on you, you pick, the truth/dare card, the room votes
 * "yaptı mı?", closing. Flirt: your date spins, the night look, a cheeky dare.
 */
export const BT = {
  spinFrom: 18,
  spinTo: 92,
  wipe1: 130,
  choice: 138,
  pick: 62,
  wipe2: 268,
  task: 276,
  votes: [40, 60, 80, 100],
  react: 58,
  wipe3: 446,
  cta: 454,
} as const;

const meta = (id: string, flirt: boolean, kind: BottleKind, text: string, music: string, solver: string) =>
  ({
    id,
    durationInFrames: 524,
    fps: VIDEO.fps,
    width: VIDEO.width,
    height: VIDEO.height,
    defaultProps: { kind, text, music, musicFrom: 0, palette: flirt ? 0 : 2, solver, flirt } as I11Props,
  }) as const;

export const I11_META = meta('itiraf-11-sise', false, 'dare', 'Bir dakika boyunca robot gibi konuş.', 'assets/songs/3919518101.mp3', 'Mert');
export const I12_META = meta(
  'itiraf-12-sise-flort',
  true,
  'dare',
  'Kabul eden birinin kulağına onunla ilgili ateşli bir düşünceni fısılda.',
  'assets/songs/3919657691.mp3',
  'Zeynep',
);

/** The table: you, the spinner and four friends. */
export const btPlayers = (c: Crew) => ['Sen', c.solver, c.others[0], c.others[1], c.others[2], 'Bora'];

/** Bottle angle at a spin-scene frame: three turns, ease-out, stopping on you. */
export function btAngle(frame: number, c: Crew): number {
  const to = bottleAngleFor('Sen', btPlayers(c), 3, 0, 4);
  const t = interpolate(frame, [BT.spinFrom, BT.spinTo], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return spinAt(0, to, t);
}

const COPY = {
  normal: {
    spin: 'Şişe dönüyor… 🍾',
    you: 'Sıra sende! 😱',
    ask: 'Doğruluk mu, cesaret mi? 🤔',
    picked: (k: BottleKind) => (k === 'dare' ? 'Cesaret! 💪' : 'Doğruluk! 🙈'),
    task: (k: BottleKind) => (k === 'dare' ? 'Yaparsın! 😂' : 'Dürüst ol! 😂'),
    done: '+1 puan 🏆',
    cta: 'Şişeyi çevir: doğruluk mu, cesaret mi?',
  },
  flirt: {
    spin: (n: string) => `${n} çeviriyor… 😏`,
    you: 'Şişe seni gösterdi 😳',
    ask: 'Doğruluk mu, cesaret mi? 😈',
    picked: (k: BottleKind) => (k === 'dare' ? 'Cesaret… 😏' : 'Doğruluk… 🙈'),
    task: () => 'Kime fısıldarsın? 👀',
    done: (n: string) => `${n} ${deDa(n)} kabul etti 🔥`,
    cta: 'Şişeyi çevir… bu gece kim cesur? 😈',
  },
} as const;

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;
const STICKER_Y = 1350;

const Stage: React.FC<{ theme: AppTheme; bg: string; flirt: boolean; children?: React.ReactNode }> = ({ theme, bg, flirt, children }) =>
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

const Spin: React.FC<{ theme: AppTheme; bg: string; p: I11Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const c = theme.colors;
  const stopped = frame >= BT.spinTo;
  return (
    <Stage theme={theme} bg={bg} flirt={p.flirt}>
      <Phone>
        <BottleTableScreen
          theme={theme}
          players={btPlayers(c8)}
          me="Sen"
          angle={btAngle(frame, c8)}
          spinning={frame >= BT.spinFrom && !stopped}
          pointed={stopped ? 'Sen' : undefined}
          spinner={c8.solver}
          lastSpinner={c8.others[0]}
          log={{ head: `${c8.others[0]} +1 puan aldı (4 evet, 1 hayır)`, text: 'Doğruluk: Telefonunda en son arattığın şey neydi?' }}
          headline={stopped ? 'Şişe seni gösterdi' : `Şişeyi ${c8.solver} çevirdi`}
          popAt={BT.spinTo}
        />
      </Phone>
      {p.flirt && <Badge18 theme={theme} />}
      {!stopped ? (
        <Sticker
          theme={theme}
          text={p.flirt ? COPY.flirt.spin(c8.solver) : COPY.normal.spin}
          bg={p.flirt ? c.yellow : stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
          rotate={-4}
          enterAt={6}
          size={78}
          style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
        />
      ) : (
        <Sequence from={BT.spinTo} layout="none">
          <Sticker
            theme={theme}
            text={p.flirt ? COPY.flirt.you : COPY.normal.you}
            bg={p.flirt ? c.coral : stickerOn(theme, bg, ['pink', 'yellow', 'mint'])}
            rotate={-4}
            size={88}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </Stage>
  );
};

const Choice: React.FC<{ theme: AppTheme; bg: string; p: I11Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const c = theme.colors;
  const t = p.flirt ? COPY.flirt : COPY.normal;
  return (
    <Stage theme={theme} bg={bg} flirt={p.flirt}>
      <Phone>
        <BottleChoiceScreen
          theme={theme}
          players={btPlayers(c8)}
          me="Sen"
          player="Sen"
          choice={frame >= BT.pick + 4 ? p.kind : undefined}
          press={press(frame, BT.pick)}
        />
      </Phone>
      {frame < BT.pick ? (
        <Sticker
          theme={theme}
          text={t.ask}
          bg={p.flirt ? c.paper : stickerOn(theme, bg, ['paper', 'yellow'])}
          rotate={-4}
          enterAt={8}
          size={74}
          style={{ position: 'absolute', left: SAFE.side, top: SAFE.top - 0 }}
        />
      ) : (
        <Sequence from={BT.pick} layout="none">
          <Sticker
            theme={theme}
            text={t.picked(p.kind)}
            bg={p.flirt ? bg : stickerOn(theme, bg, ['coral', 'yellow', 'pink'])}
            rotate={-4}
            size={96}
            style={{ position: 'absolute', left: SAFE.side, top: SAFE.top }}
          />
        </Sequence>
      )}
    </Stage>
  );
};

/** Yes votes on the task at a task-scene frame (the room of 5 voters says "Evet"). */
export const btYes = (frame: number) => BT.votes.filter((f) => frame >= f).length;

const Task: React.FC<{ theme: AppTheme; bg: string; p: I11Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  const c = theme.colors;
  const yes = btYes(frame);
  const first = p.flirt ? COPY.flirt.task() : COPY.normal.task(p.kind);
  const second = p.flirt ? COPY.flirt.done(c8.solver) : COPY.normal.done;
  return (
    <Stage theme={theme} bg={bg} flirt={p.flirt}>
      <Phone from={700} tilt={-6}>
        <BottleTaskScreen
          theme={theme}
          players={btPlayers(c8)}
          me="Sen"
          kind={p.kind}
          text={p.text}
          player="Sen"
          votes={{ yes, no: 0, voters: 5, canVote: false, seconds: Math.max(1, 20 - Math.floor(frame / 30)) }}
          enterAt={6}
        />
      </Phone>
      {frame < BT.react + 40 ? (
        <Sticker
          theme={theme}
          text={first}
          bg={p.flirt ? c.yellow : stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
          rotate={-4}
          enterAt={BT.react - 30}
          size={84}
          style={{ position: 'absolute', left: SAFE.side, top: SAFE.top }}
        />
      ) : (
        <Sequence from={BT.react + 40} layout="none">
          <Sticker
            theme={theme}
            text={second}
            bg={p.flirt ? bg : stickerOn(theme, bg, ['mint', 'yellow', 'sky'])}
            rotate={-3}
            size={84}
            style={{ position: 'absolute', left: SAFE.side, top: SAFE.top }}
          />
        </Sequence>
      )}
    </Stage>
  );
};

export const I11Bottle: React.FC<I11Props> = (p) => {
  const theme = itirafTheme;
  const c = theme.colors;
  const c8 = crew(p.solver);
  const accent = c[FLIRT_ACCENTS[((p.palette % FLIRT_ACCENTS.length) + FLIRT_ACCENTS.length) % FLIRT_ACCENTS.length]!];
  const [A, B, C, D] = p.flirt ? [accent, accent, accent, accent] : scenePalette(theme, p.palette);
  const to = (x: string) => (p.flirt ? c.bgDeep : x);
  return (
    <AbsoluteFill style={{ backgroundColor: p.flirt ? c.bgDeep : A }}>
      <Sequence durationInFrames={BT.wipe1} name="Spin">
        <Spin theme={theme} bg={A} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={A} to={to(B)} at={BT.wipe1} durationInFrames={BT.choice - BT.wipe1} />
      <Sequence from={BT.choice} durationInFrames={BT.wipe2 - BT.choice} name="Choice">
        <Choice theme={theme} bg={B} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={p.flirt ? c.coral : B} to={to(C)} at={BT.wipe2} durationInFrames={BT.task - BT.wipe2} />
      <Sequence from={BT.task} durationInFrames={BT.wipe3 - BT.task} name="Task">
        <Task theme={theme} bg={C} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={C} to={to(D)} at={BT.wipe3} durationInFrames={BT.cta - BT.wipe3} />
      <Sequence from={BT.cta} name="CTA">
        <Stage theme={theme} bg={D} flirt={p.flirt}>
          {p.flirt && <Badge18 theme={theme} />}
          <CtaCard theme={theme} cta={p.flirt ? COPY.flirt.cta : COPY.normal.cta} />
        </Stage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="whoosh" at={BT.spinFrom} frames={12} />
      <Sfx name="ding" at={BT.spinTo} frames={30} />
      <Sfx name="pop" at={BT.choice + BT.pick} />
      {BT.votes.map((f) => (
        <Sfx key={f} name="tick" at={BT.task + f} frames={4} />
      ))}
      <Sfx name="pop" at={BT.task + BT.react + 40} />
      <Sfx name="pop" at={BT.cta + 18} />
    </AbsoluteFill>
  );
};
