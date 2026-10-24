import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { silent, voiced } from './silent';
import { hasStaticFile } from '../../brand/ClipCard';
import { VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { BT, BrightShot, BrightThink, STAGES, WkBrightCta } from '../../brand/weknows/Bright';
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

type Shot = { voice?: number; hold: number; render: (len: number, color: string) => React.ReactNode };

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

/** Music only since 2026-10-24 (user: no voice-over from Entrika on); lines stay on screen for their reading time. */

/** Shot frame: a colour field, the line on top, the game's real screen in the brand phone. */
const PhoneShot: React.FC<{ line?: string; who?: string; len: number; color: string; glow?: string; lineColor?: string; children: React.ReactNode }> = ({ line, who, len, color, children }) => (
  <BrightShot color={color} line={line} who={who} len={len}>
    {children}
  </BrightShot>
);

const Think: React.FC<{ len: number; text: string }> = ({ len, text }) => <BrightThink len={len} text={text} />;

const Reel: React.FC<{ p: Props; shots: Shot[]; cta: { line: string; sub: string }; extra?: (b: ReturnType<typeof shotBeats>) => React.ReactNode }> = ({ p, shots, cta, extra }) => {
  const b = shotBeats(shots, p.voices);
  return (
    <AbsoluteFill style={{ backgroundColor: BT.colors.bg }}>
      {shots.map((s, i) => {
        const len = (b.at[i + 1] ?? b.cta) - b.at[i]!;
        const v = s.voice !== undefined ? p.voices[s.voice] : undefined;
        return (
          <Sequence key={i} from={b.at[i]} durationInFrames={len} name={`shot ${i + 1}`}>
            {s.render(len, STAGES[i % STAGES.length]!)}
            {v && hasStaticFile(v.src) && (
              <Sequence from={4} durationInFrames={f(v.sec) + 8} layout="none">
                <Audio src={staticFile(v.src)} volume={1.1} />
              </Sequence>
            )}
          </Sequence>
        );
      })}
      <Sequence from={b.cta} name="CTA">
        <WkBrightCta cta={cta.line} />
      </Sequence>
      <Music src={p.music} from={p.musicFrom} duck={voiced(p.voices) ? { from: 0, to: b.cta - 6, level: 0.38 } : undefined} />
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
  defaultProps: { voices: silent(IN_BLOCK.map((l) => l.text)), music: 'assets/songs/3919489751.mp3', musicFrom: 0 } as Props,
} as const;

const EN1_SHOTS: Shot[] = [
  { voice: 0, hold: 2, render: (len, color) => <PhoneShot color={color} line={IN_BLOCK[0]!.text} len={len}><Ch1 mine={null} from={8} /></PhoneShot> },
  { voice: 1, hold: 6, render: (len, color) => <PhoneShot color={color} who="Mert" line={`“${IN_BLOCK[1]!.text}”`} len={len}><Ch1 mine={null} from={6} /></PhoneShot> },
  {
    voice: 2,
    hold: 52,
    render: (len, color) => (
      <AbsoluteFill>
        <PhoneShot color={color} line={IN_BLOCK[2]!.text} len={len}>
          <Ch1 mine={null} from={5} />
        </PhoneShot>
        <Think len={len} text="Yalan mı dersin, engeller misin, geçer misin? Yorumlara yaz." />
      </AbsoluteFill>
    ),
  },
  { voice: 3, hold: 6, render: (len, color) => <PhoneShot color={color} who="Sen" line={`“${IN_BLOCK[3]!.text}”`} len={len}><Ch1 mine="block" from={2} /></PhoneShot> },
  { voice: 4, hold: 10, render: (len, color) => <PhoneShot color={color} who="Mert" line={`“${IN_BLOCK[4]!.text}”`} len={len}><Ch1 mine="block" from={2} /></PhoneShot> },
  {
    voice: 5,
    hold: 12,
    render: (len, color) => (
      <PhoneShot color={color} line={IN_BLOCK[5]!.text} len={len}>
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
  defaultProps: { voices: silent(IN_BLUFF.map((l) => l.text)), music: 'assets/songs/2124280777.mp3', musicFrom: 0 } as Props,
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
  { voice: 0, hold: 10, render: (len, color) => <PhoneShot color={color} line={IN_BLUFF[0]!.text} len={len}><InPickAction players={TABLE2()} {...BLUFF_HAND(2)} /></PhoneShot> },
  { voice: 1, hold: 8, render: (len, color) => <PhoneShot color={color} who="Sen" line={`“${IN_BLUFF[1]!.text}”`} len={len}><InPickAction players={TABLE2()} {...BLUFF_HAND(2)} selected="Vergi" /></PhoneShot> },
  { voice: 2, hold: 40, render: (len, color) => <PhoneShot color={color} line={IN_BLUFF[2]!.text} len={len}><NobodyCalls len={len} /></PhoneShot> },
  { voice: 3, hold: 12, render: (len, color) => <PhoneShot color={color} line={IN_BLUFF[3]!.text} len={len}><InPickAction players={TABLE2(true)} {...BLUFF_HAND(8)} selected="Darbe" target="Mert" timerFill={0.4} /></PhoneShot> },
  {
    voice: 4,
    hold: 18,
    render: (len, color) => (
      <PhoneShot color={color} line={IN_BLUFF[4]!.text} len={len}>
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
  defaultProps: { voices: silent(IN_COUNT.lines.map((l) => l.text)), music: 'assets/songs/2124184357.mp3', musicFrom: 0 } as Props,
} as const;

const Ch3: React.FC<{ mine: 'lie' | null; from: number }> = ({ mine, from }) => {
  const frame = useCurrentFrame();
  const n = countdown(frame, from);
  return <InChallenge players={TABLE3} {...HAND3} actor="Mert" action="Suikast" claim="assassin" target="Sen" countdown={n} countdownFill={n / 8} passed={0} needed={3} mine={mine} />;
};

const EN3_SHOTS: Shot[] = [
  { voice: 0, hold: 10, render: (len, color) => <PhoneShot color={color} line={IN_COUNT.lines[0]!.text} len={len}><Ch3 mine={null} from={12} /></PhoneShot> },
  { voice: 1, hold: 16, render: (len, color) => <PhoneShot color={color} line={IN_COUNT.lines[1]!.text} len={len}><Ch3 mine={null} from={11} /></PhoneShot> },
  { voice: 2, hold: 6, render: (len, color) => <PhoneShot color={color} who="Mert" line={`“${IN_COUNT.lines[2]!.text}”`} len={len}><Ch3 mine={null} from={7} /></PhoneShot> },
  {
    voice: 3,
    hold: 52,
    render: (len, color) => (
      <AbsoluteFill>
        <PhoneShot color={color} line={IN_COUNT.lines[3]!.text} len={len}>
          <Ch3 mine={null} from={5} />
        </PhoneShot>
        <Think len={len} text="Kartları say. Durdur, cevabını yorumlara yaz." />
      </AbsoluteFill>
    ),
  },
  {
    hold: 64,
    render: (len, color) => (
      <PhoneShot color={color} line="Üç Fedai’nin üçü de görünüyordu. Mert blöf yaptı." len={len}>
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
