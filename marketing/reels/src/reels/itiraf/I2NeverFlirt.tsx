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
import { NeverAnswerScreen } from '../../brand/itiraf/NeverAnswerScreen';
import { NeverRevealScreen } from '../../brand/itiraf/NeverRevealScreen';
import { splitStatement } from '../../brand/itiraf/neverText';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme, ColorToken } from '../../themes/types';
import { solverSchema } from '../friends';

/** Accent glow per variant (brand pinks only). */
export const FLIRT_ACCENTS: ColorToken[] = ['pink', 'coral', 'lilac'];

export const i2Schema = z.object({
  /** A real "Ben hiç …" card from the game's +18 packs (Instagram-safe wording). */
  statement: z.string().refine((s) => /^Ben hiç\s+\S/u.test(s.trim()), { message: 'must start with "Ben hiç"' }),
  category: z.string(),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  /** Index into FLIRT_ACCENTS. */
  accent: z.number().int().min(0),
  /** Your date's name. */
  date: solverSchema,
});

export type I2Props = z.infer<typeof i2Schema>;

/**
 * Ben Hiç for flirts (+18): a night look (deep purple, neon glow, drifting hearts). "İlk buluşmada bunu
 * oynadık…", a censored card that peels open, your phone next to your date's (their answer stays hidden),
 * the reveal "İkiniz de yapmışsınız 🔥", closing. ~17,5 sn at the R2 pace.
 */
export const I2 = {
  card: 26,
  peel: 58,
  ask: 82,
  wipe1: 120,
  duo: 128,
  youPress: 30,
  datePress: 72,
  peek: 92,
  revealPress: 132,
  wipe2: 318,
  reveal: 326,
  both: 30,
  wipe3: 446,
  cta: 454,
} as const;

export const I2_META = {
  id: 'itiraf-02-ben-hic-flort',
  durationInFrames: 524,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    statement: 'Ben hiç barda tanıştığım biriyle aynı gece onun evine gitmedim.',
    category: 'Cesur (+18)',
    music: 'assets/songs/3919255111.mp3',
    musicFrom: 0,
    accent: 0,
    date: 'Zeynep',
  } as I2Props,
} as const;

export const CTA_TEXT = 'Flörtünle oyna… en cesur gece 😈';

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

const press = (frame: number, at: number) =>
  interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Badge18: React.FC<{ theme: AppTheme; enterAt?: number; side?: 'left' | 'right' }> = ({ theme, enterAt = 0, side = 'right' }) => (
  <Sticker
    theme={theme}
    text="+18 🔥"
    bg={theme.colors.coral}
    rotate={side === 'left' ? -6 : 8}
    enterAt={enterAt}
    size={76}
    style={{ position: 'absolute', [side]: SAFE.side, top: SAFE.top }}
  />
);

/** 0–120: "İlk buluşmada bunu oynadık… 😏", the censored card peels open, "Sen yaptın mı? 👀". */
const Hook: React.FC<{ theme: AppTheme; accent: string; p: I2Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const card = usePop(I2.card, 12);
  const peel = interpolate(frame, [I2.peel, I2.peel + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <NightStage theme={theme} accent={accent}>
      <Badge18 theme={theme} enterAt={2} side="left" />
      <Headline
        theme={theme}
        text="İlk buluşmada bunu oynadık… 😏"
        size={104}
        maxLines={2}
        color={c.paper}
        style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 150 }}
      />
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          top: 680,
          width: VIDEO.width - 2 * SAFE.side,
          boxSizing: 'border-box',
          padding: '52px 52px 44px',
          border: `6px solid ${c.ink}`,
          borderRadius: 44,
          background: accent,
          boxShadow: `0 0 80px ${accent}aa, 14px 14px 0 ${c.ink}`,
          transform: `translateY(${interpolate(card, [0, 1], [320, 0])}px) rotate(${interpolate(card, [0, 1], [-7, 2])}deg)`,
          opacity: Math.min(1, card * 2),
          color: c.ink,
          overflow: 'hidden',
        }}
      >
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 60, lineHeight: 1, marginBottom: 14 }}>Ben hiç…</div>
        <Headline
          theme={theme}
          text={splitStatement(p.statement)}
          enterAt={I2.peel + 4}
          size={84}
          minSize={50}
          maxLines={4}
          maxWidth={850}
          style={{ textAlign: 'left' }}
        />
        <div style={{ marginTop: 20, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 34, opacity: 0.85 }}>{p.category}</div>
        {/* Censor tape that slides off to the right. */}
        <div
          style={{
            position: 'absolute',
            left: -40,
            right: -40,
            top: 150,
            height: 170,
            background: c.ink,
            transform: `translateX(${peel * 1200}px) rotate(-4deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 88,
            letterSpacing: 8,
            color: accent,
          }}
        >
          SANSÜRLÜ 🔞
        </div>
      </div>
      <Sticker
        theme={theme}
        text="Sen yaptın mı? 👀"
        bg={c.yellow}
        rotate={-4}
        enterAt={I2.ask}
        size={96}
        style={{ position: 'absolute', right: SAFE.side, top: 1350 }}
      />
    </NightStage>
  );
};

const DUO_W = 470;
const DUO_H = 960;

/** Answered count on both phones: nobody, then you, then your date. */
export const duoAnswered = (frame: number) => (frame >= I2.datePress ? 2 : frame >= I2.youPress ? 1 : 0);

/** 128–318: your phone and your date's, side by side. You press "Yaptım"; their answer stays hidden. */
const Duo: React.FC<{ theme: AppTheme; accent: string; p: I2Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const enterL = usePop(0, 14);
  const enterR = usePop(8, 14);
  const n = duoAnswered(frame);
  const secs = Math.max(1, 20 - Math.floor(frame / 30));
  const hidden = frame >= I2.datePress + 4;
  const common = { theme, statement: p.statement, category: p.category, seconds: secs, answered: n, total: 2, round: 'Ben Hiç · Tur 3/10' };
  return (
    <NightStage theme={theme} accent={accent}>
      <Sticker theme={theme} text="Sen" bg={c.yellow} rotate={-6} enterAt={4} size={72} style={{ position: 'absolute', left: SAFE.side + 20, top: SAFE.top }} />
      <Sticker
        theme={theme}
        text={`${p.date.trim()} 💘`}
        bg={accent}
        rotate={6}
        enterAt={12}
        size={72}
        style={{ position: 'absolute', right: SAFE.side + 10, top: SAFE.top }}
      />
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: SAFE.top + 120,
          transform: `translateY(${interpolate(enterL, [0, 1], [900, 0])}px) rotate(-4deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={DUO_W} height={DUO_H}>
          <NeverAnswerScreen
            {...common}
            choice={frame >= I2.youPress + 4 ? 'did' : undefined}
            pressDid={press(frame, I2.youPress)}
            revealPress={press(frame, I2.revealPress)}
          />
        </PhoneFrame>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: SAFE.top + 170,
          transform: `translateY(${interpolate(enterR, [0, 1], [900, 0])}px) rotate(4deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={DUO_W} height={DUO_H}>
          <NeverAnswerScreen {...common} isHost={false} choice={frame >= I2.datePress + 4 ? 'did' : undefined} pressDid={press(frame, I2.datePress)} />
          {hidden && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `${c.bgDeep}e6`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                color: c.paper,
              }}
            >
              <div style={{ fontSize: 150, transform: `scale(${usePopSafe(frame, I2.datePress + 4)})` }}>🙈</div>
              <div style={{ fontSize: 46 }}>Cevabı gizli</div>
            </div>
          )}
        </PhoneFrame>
      </div>
      {frame >= I2.youPress + 6 && frame < I2.peek && (
        <Sequence from={I2.youPress + 6} layout="none">
          <Sticker theme={theme} text="Sen: Yaptım 🙈" bg={c.paper} rotate={-5} size={80} style={{ position: 'absolute', left: SAFE.side, top: 1360 }} />
        </Sequence>
      )}
      {frame >= I2.peek && (
        <Sequence from={I2.peek} layout="none">
          <Sticker
            theme={theme}
            text={`Peki ya ${p.date.trim()}? 👀`}
            bg={c.yellow}
            rotate={-4}
            size={84}
            style={{ position: 'absolute', left: SAFE.side, top: 1360 }}
          />
        </Sequence>
      )}
    </NightStage>
  );
};

/** Pop scale without a hook (used inside a conditional branch). */
const usePopSafe = (frame: number, at: number) =>
  interpolate(frame, [at, at + 6, at + 10], [0, 1.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** 326–446: the reveal — both of you did it. */
const Reveal: React.FC<{ theme: AppTheme; accent: string; p: I2Props }> = ({ theme, accent, p }) => {
  const c = theme.colors;
  const enter = usePop(0, 14);
  return (
    <NightStage theme={theme} accent={accent}>
      <div
        style={{
          position: 'absolute',
          left: VIDEO.width / 2 - 340,
          top: SAFE.top + 20,
          transform: `translateY(${interpolate(enter, [0, 1], [700, 0])}px) rotate(${interpolate(enter, [0, 1], [-6, 1.5])}deg)`,
        }}
      >
        <PhoneFrame theme={theme} width={680} height={1240}>
          <NeverRevealScreen
            theme={theme}
            statement={p.statement}
            category={p.category}
            did={['Sen', p.date.trim()]}
            didnt={[]}
            you="did"
            round="Ben Hiç · Tur 3/10"
            storyteller={p.date.trim()}
            enterAt={6}
          />
        </PhoneFrame>
      </div>
      <Sticker
        theme={theme}
        text="İkiniz de yapmışsınız 🔥"
        bg={c.yellow}
        rotate={-4}
        enterAt={I2.both}
        size={80}
        style={{ position: 'absolute', left: SAFE.side, top: 1360 }}
      />
    </NightStage>
  );
};

export const I2NeverFlirt: React.FC<I2Props> = (p) => {
  const theme = itirafTheme;
  const c = theme.colors;
  const accent = c[FLIRT_ACCENTS[((p.accent % FLIRT_ACCENTS.length) + FLIRT_ACCENTS.length) % FLIRT_ACCENTS.length]!];
  return (
    <AbsoluteFill style={{ backgroundColor: c.bgDeep }}>
      <Sequence durationInFrames={I2.wipe1} name="Hook">
        <Hook theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={I2.wipe1} durationInFrames={I2.duo - I2.wipe1} />
      <Sequence from={I2.duo} durationInFrames={I2.wipe2 - I2.duo} name="Duo">
        <Duo theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={c.coral} to={c.bgDeep} at={I2.wipe2} durationInFrames={I2.reveal - I2.wipe2} />
      <Sequence from={I2.reveal} durationInFrames={I2.wipe3 - I2.reveal} name="Reveal">
        <Reveal theme={theme} accent={accent} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={accent} to={c.bgDeep} at={I2.wipe3} durationInFrames={I2.cta - I2.wipe3} />
      <Sequence from={I2.cta} name="CTA">
        <NightStage theme={theme} accent={accent}>
          <Badge18 theme={theme} />
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </NightStage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="pop" at={I2.card} />
      <Sfx name="whoosh" at={I2.peel} frames={12} />
      <Sfx name="pop" at={I2.ask} />
      <Sfx name="pop" at={I2.duo + I2.youPress} />
      <Sfx name="pop" at={I2.duo + I2.datePress} />
      <Sfx name="ding" at={I2.duo + I2.revealPress} frames={30} />
      <Sfx name="pop" at={I2.reveal + I2.both} />
      <Sfx name="pop" at={I2.cta + 18} />
    </AbsoluteFill>
  );
};
