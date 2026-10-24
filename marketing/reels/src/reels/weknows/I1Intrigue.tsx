import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { EASE } from '../../brand/casebook/Editorial';
import { FONT_COURT, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { Court, CourtLine, IN, InUi } from '../../brand/weknows/Court';
import { AppPhone } from '../../brand/weknows/Night';
import { type InPlayer, InChallenge, InPickAction, InResult, InReveal } from '../../brand/weknows/intrigue/InScreens';
import { shotBeats } from './H1Hitler';
import { IN_BLOCK, IN_BLUFF, IN_COUNT } from './intrigueAds';

const FPS = VIDEO.fps;
const f = (s: number) => Math.round(s * FPS);
const clip = z.object({ src: z.string(), sec: z.number().min(0.3).max(6) });
const schemaOf = (n: number) => z.object({ voices: z.array(clip).length(n), music: z.string(), musicFrom: z.number().min(0).max(25) });
export const en1Schema = schemaOf(6);
export const en2Schema = schemaOf(5);
export const en3Schema = schemaOf(4);
type Props = z.infer<typeof en1Schema>;
const vo = (id: string, sec: number) => ({ src: `assets/voices/${id}.el.mp3`, sec });

type Shot = { voice?: number; hold: number; render: (len: number) => React.ReactNode };

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

/** Shot frame: the candlelit chamber, the line above, the real game screen in the phone. */
const PhoneShot: React.FC<{ line?: string; who?: string; len: number; glow?: string; lineColor?: string; children: React.ReactNode }> = ({ line, who, len, glow = IN.ember, lineColor = IN.bone, children }) => (
  <AbsoluteFill>
    <Court dim={0.42} frames={len} />
    {line && (
      <div style={{ position: 'absolute', left: IN.M, top: 222, width: IN.W }}>
        {who && (
          <InUi size={30} color={IN.gold}>
            {who}
          </InUi>
        )}
        <CourtLine text={line} at={4} frames={Math.min(40, len)} size={66} color={lineColor} />
      </div>
    )}
    <AppPhone glow={glow}>{children}</AppPhone>
  </AbsoluteFill>
);

const Think: React.FC<{ len: number; text: string }> = ({ len, text }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [len - 52, len], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (frame < len - 54) return null;
  return (
    <div style={{ position: 'absolute', left: IN.M, top: 1560, width: IN.W }}>
      <InUi size={28} weight={500} color={IN.dim}>
        {text}
      </InUi>
      <div style={{ marginTop: 10, height: 3, background: 'rgba(243,234,216,0.2)' }}>
        <div style={{ width: `${t * 100}%`, height: '100%', background: t < 0.35 ? IN.red : IN.gold }} />
      </div>
    </div>
  );
};

const InCta: React.FC<{ line: string; sub: string }> = ({ line, sub }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [2, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const b = interpolate(frame, [14, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return (
    <AbsoluteFill>
      <Court dim={0.5} frames={70} push={[1.14, 1.18]} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(12,7,5,0.25), rgba(12,7,5,0.9) 70%)' }} />
      <div style={{ position: 'absolute', left: IN.M, top: 600, width: IN.W, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        <div style={{ fontFamily: FONT_COURT, fontStyle: 'italic', fontWeight: 600, fontSize: 160, lineHeight: 0.92, color: IN.bone }}>{line}</div>
        <InUi size={44} weight={500} style={{ marginTop: 24 }}>
          {sub}
        </InUi>
      </div>
      <div style={{ position: 'absolute', left: IN.M, top: 1230, display: 'flex', alignItems: 'center', gap: 26, opacity: b }}>
        {hasStaticFile('weknows/icon/icon.png') && <Img src={staticFile('weknows/icon/icon.png')} style={{ width: 128, height: 128, borderRadius: 30 }} />}
        <div>
          <InUi size={64} weight={700}>
            We Knows
          </InUi>
          <InUi size={30} weight={500} color={IN.dim}>
            App Store ve Google Play’de ücretsiz
          </InUi>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Reel: React.FC<{ p: Props; shots: Shot[]; cta: { line: string; sub: string }; extra?: (b: ReturnType<typeof shotBeats>) => React.ReactNode }> = ({ p, shots, cta, extra }) => {
  const b = shotBeats(shots, p.voices);
  return (
    <AbsoluteFill style={{ backgroundColor: IN.deep }}>
      {shots.map((s, i) => {
        const len = (b.at[i + 1] ?? b.cta) - b.at[i]!;
        const v = s.voice !== undefined ? p.voices[s.voice] : undefined;
        return (
          <Sequence key={i} from={b.at[i]} durationInFrames={len} name={`shot ${i + 1}`}>
            {s.render(len)}
            {v && hasStaticFile(v.src) && (
              <Sequence from={4} durationInFrames={f(v.sec) + 8} layout="none">
                <Audio src={staticFile(v.src)} volume={1.1} />
              </Sequence>
            )}
          </Sequence>
        );
      })}
      <Sequence from={b.cta} name="CTA">
        <InCta {...cta} />
      </Sequence>
      <Music src={p.music} from={p.musicFrom} volume={0.9} duck={{ from: 0, to: b.cta - 6, level: 0.38 }} />
      {extra?.(b)}
    </AbsoluteFill>
  );
};

const CTA = { sub: 'Entrika, We Knows’ta. Arkadaşlarınla oyna.' };
const countdown = (frame: number, from: number) => Math.max(1, from - Math.floor(frame / FPS));

// ---------------------------------------------------------------- I1 "Sen ne yapardın?"

const TABLE: InPlayer[] = [
  { name: 'Mert', gold: 6, cards: [null, null], turn: true },
  { name: 'Deniz', gold: 2, cards: [null, 'pirate'] },
  { name: 'Zeynep', gold: 3, cards: [null, null] },
];
const MY_HAND = { hand: [{ role: 'guard' as const }, { role: 'treasurer' as const }], gold: 4 };
const ATTACK = { actor: 'Mert', action: 'Suikast', claim: 'assassin' as const, target: 'Sen', needed: 3 };

export const EN1_META = {
  id: 'weknows-entrika-01-ne-yapardin',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: { voices: [vo('in-b1', 3.5), vo('in-b2', 1.64), vo('in-b3', 1.57), vo('in-b4', 1.89), vo('in-b5', 0.86), vo('in-b6', 4.37)], music: 'assets/songs/3919656801.mp3', musicFrom: 0 } as Props,
} as const;

const EN1_SHOTS: Shot[] = [
  { voice: 0, hold: 2, render: (len) => <PhoneShot line={IN_BLOCK[0]!.text} len={len} glow={IN.red}><Ch1 mine={null} from={8} /></PhoneShot> },
  { voice: 1, hold: 6, render: (len) => <PhoneShot who="Mert" line={`“${IN_BLOCK[1]!.text}”`} len={len} glow={IN.red}><Ch1 mine={null} from={6} /></PhoneShot> },
  {
    voice: 2,
    hold: 52,
    render: (len) => (
      <AbsoluteFill>
        <PhoneShot line={IN_BLOCK[2]!.text} len={len} glow={IN.gold}>
          <Ch1 mine={null} from={5} />
        </PhoneShot>
        <Think len={len} text="Yalan mı dersin, engeller misin, geçer misin? Yorumlara yaz." />
      </AbsoluteFill>
    ),
  },
  { voice: 3, hold: 6, render: (len) => <PhoneShot who="Sen" line={`“${IN_BLOCK[3]!.text}”`} len={len} glow={'#5ab8ff'}><Ch1 mine="block" from={2} /></PhoneShot> },
  { voice: 4, hold: 10, render: (len) => <PhoneShot who="Mert" line={`“${IN_BLOCK[4]!.text}”`} len={len} glow={IN.red}><Ch1 mine="block" from={2} /></PhoneShot> },
  {
    voice: 5,
    hold: 12,
    render: (len) => (
      <PhoneShot line={IN_BLOCK[5]!.text} len={len} glow={'#5ab8ff'}>
        <InReveal players={TABLE} {...MY_HAND} who="Sen" role="guard" truthful loser="Mert" />
      </PhoneShot>
    ),
  },
];

const Ch1: React.FC<{ mine: 'block' | null; from: number }> = ({ mine, from }) => {
  const frame = useCurrentFrame();
  const n = countdown(frame, from);
  return <InChallenge players={TABLE} {...MY_HAND} {...ATTACK} countdown={n} countdownFill={n / 8} passed={1} mine={mine} />;
};

export const EN1Block: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={EN1_SHOTS}
    cta={{ line: 'Kime inanırsın?', ...CTA }}
    extra={(b) => (
      <>
        <Sfx name="heart" at={b.at[2]! + 4} frames={18} volume={1.5} />
        {[0, 30].map((d) => (
          <Sfx key={d} name="clock" at={b.at[3]! - 50 + d} frames={3} volume={1.2} />
        ))}
        <Sfx name="tick" at={b.at[3]! + 4} frames={3} volume={1.4} />
        <Sfx name="stamp" at={b.at[5]!} frames={10} volume={1.8} />
      </>
    )}
  />
);

// ---------------------------------------------------------------- I2 "Kartın yoktu"

const BLUFF_HAND = (gold: number) => ({ hand: [{ role: 'pirate' as const }, { role: 'spy' as const }], gold });
/** Early: everyone is in. Late (the coup): Deniz and Zeynep are out, Mert is down to one card. */
const TABLE2 = (late = false): InPlayer[] =>
  late
    ? [
        { name: 'Mert', gold: 3, cards: [null, 'assassin'] },
        { name: 'Deniz', gold: 0, cards: ['pirate', 'treasurer'] },
        { name: 'Zeynep', gold: 0, cards: ['spy', 'guard'] },
      ]
    : [
        { name: 'Mert', gold: 3, cards: [null, null] },
        { name: 'Deniz', gold: 1, cards: [null, null] },
        { name: 'Zeynep', gold: 2, cards: [null, null] },
      ];

export const EN2_META = {
  id: 'weknows-entrika-02-kartin-yoktu',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: { voices: [vo('in-f1', 2.41), vo('in-f2', 2.19), vo('in-f3', 1.73), vo('in-f4', 2.24), vo('in-f5', 3.31)], music: 'assets/songs/3919655981.mp3', musicFrom: 0 } as Props,
} as const;

/** "Kimse yalan demedi.": the window closes 3/3, then the gold climbs to 8 over two more taxes. */
const NobodyCalls: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const passed = Math.min(3, Math.floor(frame / 8));
  const gold = frame < len * 0.5 ? 2 : frame < len * 0.75 ? 5 : 8;
  return frame < len * 0.5 ? (
    <InChallenge players={TABLE2()} {...BLUFF_HAND(2)} actor="Sen" action="Vergi" claim="treasurer" countdown={Math.max(1, 5 - Math.floor(frame / 10))} passed={passed} needed={3} mine="pass" />
  ) : (
    <InPickAction players={TABLE2(gold >= 8)} {...BLUFF_HAND(gold)} timer={38} />
  );
};

const EN2_SHOTS: Shot[] = [
  { voice: 0, hold: 10, render: (len) => <PhoneShot line={IN_BLUFF[0]!.text} len={len}><InPickAction players={TABLE2()} {...BLUFF_HAND(2)} /></PhoneShot> },
  { voice: 1, hold: 8, render: (len) => <PhoneShot who="Sen" line={`“${IN_BLUFF[1]!.text}”`} len={len} glow={IN.gold}><InPickAction players={TABLE2()} {...BLUFF_HAND(2)} selected="Vergi" /></PhoneShot> },
  { voice: 2, hold: 40, render: (len) => <PhoneShot line={IN_BLUFF[2]!.text} len={len} glow={IN.gold}><NobodyCalls len={len} /></PhoneShot> },
  { voice: 3, hold: 12, render: (len) => <PhoneShot line={IN_BLUFF[3]!.text} len={len} glow={IN.red}><InPickAction players={TABLE2(true)} {...BLUFF_HAND(8)} selected="Darbe" target="Mert" timerFill={0.4} /></PhoneShot> },
  {
    voice: 4,
    hold: 18,
    render: (len) => (
      <PhoneShot line={IN_BLUFF[4]!.text} len={len} glow={IN.gold}>
        <InResult winner="Sen" me="Sen" ranking={[{ name: 'Sen' }, { name: 'Mert' }, { name: 'Zeynep' }, { name: 'Deniz' }]} />
      </PhoneShot>
    ),
  },
];

export const EN2Bluff: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={EN2_SHOTS}
    cta={{ line: 'Kartın yoktu. Cesaretin vardı.', ...CTA }}
    extra={(b) => (
      <>
        <Sfx name="tick" at={b.at[1]! + 10} frames={3} volume={1.4} />
        {[0.5, 0.75].map((k) => (
          <Sfx key={k} name="ding" at={b.at[2]! + Math.round((b.at[3]! - b.at[2]!) * k)} frames={18} volume={0.8} />
        ))}
        <Sfx name="stamp" at={b.at[3]! + 8} frames={10} volume={1.8} />
        <Sfx name="whoosh" at={b.at[4]!} />
      </>
    )}
  />
);

// ---------------------------------------------------------------- I3 "Kart say"

const TABLE3: InPlayer[] = [
  { name: 'Mert', gold: 5, cards: [null, null], turn: true },
  { name: 'Deniz', gold: 2, cards: [null, 'assassin'] },
  { name: 'Zeynep', gold: 3, cards: ['assassin', null] },
];
const HAND3 = { hand: [{ role: 'assassin' as const }, { role: 'treasurer' as const }], gold: 3 };

export const EN3_META = {
  id: 'weknows-entrika-03-kart-say',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: { voices: [vo('in-c1', 2.64), vo('in-c2', 4.2), vo('in-c3', 2.14), vo('in-c4', 2.57)], music: 'assets/songs/3919638451.mp3', musicFrom: 0 } as Props,
} as const;

const Ch3: React.FC<{ mine: 'lie' | null; from: number }> = ({ mine, from }) => {
  const frame = useCurrentFrame();
  const n = countdown(frame, from);
  return <InChallenge players={TABLE3} {...HAND3} actor="Mert" action="Suikast" claim="assassin" target="Sen" countdown={n} countdownFill={n / 8} passed={0} needed={3} mine={mine} />;
};

const EN3_SHOTS: Shot[] = [
  { voice: 0, hold: 10, render: (len) => <PhoneShot line={IN_COUNT.lines[0]!.text} len={len}><Ch3 mine={null} from={12} /></PhoneShot> },
  { voice: 1, hold: 16, render: (len) => <PhoneShot line={IN_COUNT.lines[1]!.text} len={len} glow={IN.red}><Ch3 mine={null} from={11} /></PhoneShot> },
  { voice: 2, hold: 6, render: (len) => <PhoneShot who="Mert" line={`“${IN_COUNT.lines[2]!.text}”`} len={len} glow={IN.red}><Ch3 mine={null} from={7} /></PhoneShot> },
  {
    voice: 3,
    hold: 52,
    render: (len) => (
      <AbsoluteFill>
        <PhoneShot line={IN_COUNT.lines[3]!.text} len={len} glow={IN.gold}>
          <Ch3 mine={null} from={5} />
        </PhoneShot>
        <Think len={len} text="Kartları say. Durdur, cevabını yorumlara yaz." />
      </AbsoluteFill>
    ),
  },
  {
    hold: 64,
    render: (len) => (
      <PhoneShot line="Üç Fedai’nin üçü de görünüyordu. Mert blöf yaptı." len={len} glow={IN.red}>
        <InReveal players={TABLE3} {...HAND3} who="Mert" role="assassin" truthful={false} loser="Mert" />
      </PhoneShot>
    ),
  },
];

export const EN3Count: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={EN3_SHOTS}
    cta={{ line: 'Kartları sayan kazanır.', ...CTA }}
    extra={(b) => (
      <>
        <Sfx name="tick" at={b.at[1]! + 30} frames={3} volume={1.4} />
        <Sfx name="heart" at={b.at[3]! + 4} frames={18} volume={1.5} />
        <Sfx name="stamp" at={b.at[4]!} frames={10} volume={1.8} />
      </>
    )}
  />
);

export const EN_SHOTS = { i1: EN1_SHOTS, i2: EN2_SHOTS, i3: EN3_SHOTS } as const;
