import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { EASE } from '../../brand/casebook/Editorial';
import { FONT_FABLE, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { AppPhone, Dark, Tale, Ui, Village, WkBug, WW } from '../../brand/weknows/Night';
import { KurtNightSeer, KurtNightWolf } from '../../brand/weknows/kurt/KurtScreens';
import { WW_NIGHT } from './werewolfAds';

const FPS = VIDEO.fps;
const clip = z.object({ src: z.string(), sec: z.number().min(0.3).max(6) });
export const w1Schema = z.object({ voices: z.array(clip).length(6), music: z.string(), musicFrom: z.number().min(0).max(25) });
export type W1Props = z.infer<typeof w1Schema>;

/** One shot per moderator line: the line plus a breath (longer on the phone shots, which carry more to read). */
const BREATH = [10, 30, 20, 8, 18, 12];
export function nightBeats(v: { sec: number }[]) {
  let t = 0;
  const at = v.map((c, i) => {
    const s = t;
    t += Math.round(c.sec * FPS) + 6 + BREATH[i]!;
    return s;
  });
  return { at, cta: t, total: t + 66 };
}

const v = (id: string, sec: number) => ({ src: `assets/voices/${id}.el.mp3`, sec });
export const W1_META = {
  id: 'weknows-kurt-01-koy-uyusun',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    voices: [v('ww-n1', 2.22), v('ww-n2', 2.08), v('ww-n3', 2.07), v('ww-n4', 0.99), v('ww-n5', 1.99), v('ww-n6', 2.68)],
    music: 'assets/songs/3919656731.mp3',
    musicFrom: 0,
  } as W1Props,
} as const;

const T = WW_NIGHT.map((l) => l.text);

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

const useLin = (a: number, b: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
};

/** Phone shot: the village almost black behind, the moderator's line above, the real app screen in the phone. */
const PhoneShot: React.FC<{ line: string; len: number; glow: string; children: React.ReactNode }> = ({ line, len, glow, children }) => {
  const on = useLin(2, 14);
  return (
    <Dark>
      <Village dim={0.22} frames={len} />
      <div style={{ position: 'absolute', left: WW.M, top: 250, width: WW.W }}>
        <Tale text={line} at={4} frames={Math.min(40, len)} size={66} />
      </div>
      <AppPhone glow={glow} on={on}>
        {children}
      </AppPhone>
    </Dark>
  );
};

/** Wolves wake: the role card held open (Kurt Adam), then the hunt where the second wolf lands on Mert. */
const Wolves: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const pickAt = Math.round(len * 0.6);
  return (
    <PhoneShot line={T[1]!} len={len} glow={WW.wolf}>
      <KurtNightWolf
        pick={frame >= pickAt ? 1 : null}
        baseVotes={[0, 1, 0, 0, 0, 0]}
        timer={Math.max(1, 30 - Math.floor(frame / FPS) * 2)}
        chat={{ who: 'Kaan', text: 'Mert çok şüpheleniyor, onu alalım' }}
        cardOpen={frame >= 8 && frame < Math.round(len * 0.4)}
        nightNo={1}
      />
    </PhoneShot>
  );
};

/** The seer looks at Deniz: not a wolf. */
const Seer: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  return (
    <PhoneShot line={T[2]!} len={len} glow={WW.seer}>
      <KurtNightSeer
        pick={frame >= Math.round(len * 0.3) ? 2 : null}
        result={frame >= Math.round(len * 0.5) ? { name: 'Deniz', wolf: false } : null}
        timer={Math.max(1, 30 - Math.floor(frame / FPS) * 2)}
        nightNo={1}
      />
    </PhoneShot>
  );
};

const Caption: React.FC<{ text: string; len: number; top?: number; size?: number }> = ({ text, len, top = 1060, size = 112 }) => (
  <div style={{ position: 'absolute', left: WW.M, top, width: WW.W }}>
    <Tale text={text} at={4} frames={Math.min(36, len)} size={size} />
  </div>
);

/** The morning: dawn over the village, then the name of the dead struck through. */
const Dead: React.FC<{ len: number }> = ({ len }) => {
  const strike = useLin(Math.round(len * 0.45), Math.round(len * 0.45) + 14);
  const name = useLin(4, 18);
  return (
    <Dark>
      <Village dawn={1} dim={0.45} frames={len} push={[1.12, 1.16]} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(7,5,26,0.2), rgba(7,5,26,0.85) 70%)' }} />
      <div style={{ position: 'absolute', left: WW.M, top: 640 }}>
        <Ui size={32} color={WW.bone} weight={500} style={{ opacity: 0.75 }}>
          1. gecenin sabahı. Bu gece ölenler:
        </Ui>
        <div style={{ position: 'relative', display: 'inline-block', marginTop: 10, opacity: name }}>
          <div style={{ fontFamily: FONT_FABLE, fontSize: 300, lineHeight: 1, letterSpacing: -8, color: WW.bone }}>Mert</div>
          <div style={{ position: 'absolute', left: -10, top: '56%', height: 10, width: `calc(${strike * 100}% + 20px)`, background: WW.wolf }} />
        </div>
      </div>
      <Caption text={T[4]!} len={len} top={1180} size={84} />
      <WkBug />
    </Dark>
  );
};

/** Closing card: the question in Fraunces, the invite, the app mark. */
export const WkCta: React.FC<{ line: string; sub: string; dawn?: number }> = ({ line, sub, dawn = 0 }) => {
  const a = useLin(2, 16);
  const b = useLin(12, 26);
  const c2 = useLin(20, 34);
  return (
    <Dark>
      <Village dawn={dawn} dim={0.32} frames={80} push={[1.1, 1.13]} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(7,5,26,0.3), rgba(7,5,26,0.9) 75%)' }} />
      <div style={{ position: 'absolute', left: WW.M, top: 620, width: WW.W }}>
        <div style={{ fontFamily: FONT_FABLE, fontSize: 170, lineHeight: 0.95, letterSpacing: -4, color: WW.bone, opacity: a, filter: `blur(${(1 - a) * 10}px)` }}>{line}</div>
        <Ui size={46} weight={500} style={{ marginTop: 26, opacity: b }}>
          {sub}
        </Ui>
      </div>
      <div style={{ position: 'absolute', left: WW.M, top: 1230, display: 'flex', alignItems: 'center', gap: 26, opacity: c2 }}>
        {hasStaticFile('weknows/icon/icon.png') && <Img src={staticFile('weknows/icon/icon.png')} style={{ width: 128, height: 128, borderRadius: 30 }} />}
        <div>
          <Ui size={64} weight={700} style={{ letterSpacing: -1.5 }}>
            We Knows
          </Ui>
          <Ui size={30} weight={500} color={WW.dim}>
            App Store ve Google Play’de ücretsiz
          </Ui>
        </div>
      </div>
    </Dark>
  );
};

/**
 * Kurt Adam · "Köy uyusun": the moderator (ElevenLabs) runs one night and one morning: the village sleeps, the
 * wolves pick Mert on a phone in the dark, the seer checks Deniz, dawn, Mert is dead, the wolves are still here.
 */
export const W1Night: React.FC<W1Props> = (p) => {
  const b = nightBeats(p.voices);
  const len = (i: number) => (b.at[i + 1] ?? b.cta) - b.at[i]!;
  return (
    <AbsoluteFill style={{ backgroundColor: WW.deep }}>
      <Sequence durationInFrames={len(0)} name="Köy uyusun">
        <Dark>
          <Village frames={len(0)} push={[1.0, 1.08]} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(7,5,26,0.85) 80%)' }} />
          <Caption text={T[0]!} len={len(0)} />
          <WkBug />
        </Dark>
      </Sequence>
      <Sequence from={b.at[1]} durationInFrames={len(1)} name="Kurtlar">
        <Wolves len={len(1)} />
      </Sequence>
      <Sequence from={b.at[2]} durationInFrames={len(2)} name="Kahin">
        <Seer len={len(2)} />
      </Sequence>
      <Sequence from={b.at[3]} durationInFrames={len(3)} name="Sabah">
        <DawnShot len={len(3)} />
      </Sequence>
      <Sequence from={b.at[4]} durationInFrames={len(4)} name="Ölen">
        <Dead len={len(4)} />
      </Sequence>
      <Sequence from={b.at[5]} durationInFrames={len(5)} name="Hâlâ aramızda">
        <Dark>
          <Village dim={0.55} frames={len(5)} push={[1.16, 1.22]} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(7,5,26,0.9) 78%)' }} />
          <Caption text={T[5]!} len={len(5)} size={104} />
          <WkBug />
        </Dark>
      </Sequence>
      <Sequence from={b.cta} name="CTA">
        <WkCta line="Kurt kim?" sub="Bu gece arkadaşlarınla bul." />
      </Sequence>

      <Music src={p.music} from={p.musicFrom} volume={0.9} duck={{ from: 0, to: b.cta - 6, level: 0.4 }} />
      {p.voices.map((c, i) =>
        hasStaticFile(c.src) ? (
          <Sequence key={i} from={b.at[i]! + 6} durationInFrames={Math.round(c.sec * FPS) + 8} layout="none" name={`anlatıcı ${i + 1}`}>
            <Audio src={staticFile(c.src)} volume={1.1} />
          </Sequence>
        ) : null,
      )}
      <Sfx name="heart" at={b.at[1]!} frames={18} volume={1.4} />
      <Sfx name="tick" at={b.at[1]! + Math.round(len(1) * 0.62)} frames={3} volume={1.4} />
      <Sfx name="tick" at={b.at[2]! + Math.round(len(2) * 0.35)} frames={3} volume={1.4} />
      <Sfx name="ding" at={b.at[2]! + Math.round(len(2) * 0.55)} frames={18} volume={0.8} />
      <Sfx name="heart" at={b.at[4]!} frames={18} volume={1.6} />
    </AbsoluteFill>
  );
};

/** Night turns to dawn on the same village. */
const DawnShot: React.FC<{ len: number }> = ({ len }) => {
  const d = useLin(0, Math.min(24, len));
  return (
    <Dark>
      <Village dawn={d} frames={len} push={[1.08, 1.12]} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(7,5,26,0.75) 80%)' }} />
      <Caption text={T[3]!} len={len} />
      <WkBug />
    </Dark>
  );
};
