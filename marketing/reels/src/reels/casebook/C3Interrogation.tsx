import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { Grain, Vignette } from '../../brand/casebook/Noir';
import { Bug, EASE, ED, Fact, Rise, Words } from '../../brand/casebook/Editorial';
import { FONT_SERIF, SAFE, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { EditorialCta } from './C5Trailer';

const FPS = VIDEO.fps;

const clip = z.object({ src: z.string(), sec: z.number().min(0.3).max(6) });
export const c3Schema = z.object({
  name: z.string().max(16),
  portrait: z.string(),
  q1: z.string(),
  a1: z.string(),
  evidence: z.object({ source: z.string(), text: z.string().max(64) }),
  q2: z.string(),
  a2: z.string(),
  /** q1, a1, q2, a2 */
  voices: z.array(clip).length(4),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
});
export type C3Props = z.infer<typeof c3Schema>;

const f = (sec: number) => Math.round(sec * FPS);

/** intro 1,3 s → Q1 → A1 → evidence 1,2 s → Q2 → silence 0,6 s → A2 → YALAN 1,3 s → CTA 2,5 s. */
export function interrogationBeats(v: { sec: number }[]) {
  const q1 = 40;
  const a1 = q1 + f(v[0]!.sec) + 6;
  const ev = a1 + f(v[1]!.sec) + 8;
  const q2 = ev + 36;
  const silence = q2 + f(v[2]!.sec) + 4;
  const a2 = silence + 18;
  const lie = a2 + f(v[3]!.sec) + 4;
  const cta = lie + 40;
  return { q1, a1, ev, q2, silence, a2, lie, cta, total: cta + 75 };
}

export const C3_META = {
  id: 'casebook-03-sorgu',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    name: 'Volkan',
    portrait: 'cases/koza-han-yangini/img/p-volkan.webp',
    q1: 'O gece neredeydin?',
    a1: 'Evdeydim. Onda yattım, sabaha kadar uyudum.',
    evidence: { source: 'Apartman kartlı geçiş kaydı', text: 'Daire 7, Volkan D. Çıkış: 23:47' },
    q2: 'O zaman 23:47’de senin kartınla kim çıktı?',
    a2: 'Avukatımı istiyorum.',
    voices: [
      { src: 'assets/voices/iv-volkan-q1.mp3', sec: 1.34 },
      { src: 'assets/voices/iv-volkan-a1.mp3', sec: 3.44 },
      { src: 'assets/voices/iv-volkan-q2.mp3', sec: 4.13 },
      { src: 'assets/voices/iv-volkan-a2.mp3', sec: 1.46 },
    ],
    music: 'assets/songs/3919656801.mp3',
    musicFrom: 0,
  } as C3Props,
} as const;

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

/** The room: one bare bulb swinging over the suspect; the light on the face sways with it. */
const Room: React.FC<{ p: C3Props; b: ReturnType<typeof interrogationBeats> }> = ({ p, b }) => {
  const frame = useCurrentFrame();
  const swing = Math.sin(frame / 20) * 9;
  const lightX = 50 + swing * 1.6;
  const reveal = interpolate(frame, [0, 30], [0.05, 1], { extrapolateRight: 'clamp' });
  const push = interpolate(frame, [0, b.a2, b.lie, b.cta], [1.0, 1.1, 1.24, 1.26], { extrapolateRight: 'clamp' });
  const lit = frame >= b.lie ? 0.55 : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: '#030304', overflow: 'hidden' }}>
      {hasStaticFile(p.portrait) && (
        <Img
          src={staticFile(p.portrait)}
          style={{
            position: 'absolute',
            left: 0,
            top: 150,
            width: 1080,
            height: 1400,
            objectFit: 'cover',
            objectPosition: 'center 22%',
            transform: `scale(${push})`,
            transformOrigin: '50% 30%',
            filter: `brightness(${0.75 * reveal * lit}) contrast(1.25) saturate(0.55)`,
            maskImage: 'linear-gradient(180deg, transparent 0%, #000 12%, #000 62%, transparent 92%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 12%, #000 62%, transparent 92%)',
          }}
        />
      )}
      {/* light pool from the bulb, swaying */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 42% at ${lightX}% 30%, rgba(255,214,140,0.20) 0%, transparent 60%), radial-gradient(ellipse 80% 70% at ${lightX}% 32%, transparent 35%, rgba(0,0,0,0.85) 100%)`,
        }}
      />
      {/* bulb + cord */}
      <div style={{ position: 'absolute', left: 540, top: -20, width: 0, height: 0, transform: `rotate(${swing}deg)`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: -2, top: 0, width: 4, height: 190, background: '#1a1a1a' }} />
        <div style={{ position: 'absolute', left: -26, top: 186, width: 52, height: 64, borderRadius: '50% 50% 46% 46%', background: '#fff3cf', boxShadow: '0 0 60px 30px rgba(255,214,140,0.55), 0 0 160px 80px rgba(255,190,90,0.18)' }} />
      </div>
      <Vignette strength={0.7} />
      <Grain opacity={0.13} />
    </AbsoluteFill>
  );
};

/** Evidence lands as a fact line across the frame: UV bar, source, the record in the serif with a UV underline. */
const Evidence: React.FC<{ source: string; text: string }> = ({ source, text }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp', easing: EASE });
  const u = interpolate(frame, [14, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return (
    <div style={{ position: 'absolute', left: 0, top: 960, width: 1080, padding: `26px ${ED.M}px 30px`, boxSizing: 'border-box', background: 'rgba(0,0,0,0.78)', clipPath: `inset(0 ${(1 - t) * 100}% 0 0)` }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ width: 6, background: ED.uv }} />
        <div>
          <Fact size={28}>{source}</Fact>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 60, lineHeight: 1.05, color: ED.bone }}>
            <span style={{ backgroundImage: `linear-gradient(${ED.uv}, ${ED.uv})`, backgroundRepeat: 'no-repeat', backgroundPosition: '0 92%', backgroundSize: `${u * 100}% 5px` }}>{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Subtitle block: who speaks (Sen = you, the detective, in UV), the line rising word by word with the voice. */
const Line: React.FC<{ who: string; text: string; at: number; sec: number; you?: boolean; struck?: number }> = ({ who, text, at, sec, you, struck = 0 }) => (
  <div style={{ position: 'absolute', left: ED.M, top: 1250, width: ED.W }}>
    <Fact size={30} weight={600} color={you ? ED.uv : ED.bone}>
      {who}
    </Fact>
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Words text={`“${text}”`} at={at} frames={f(sec)} size={64} italic color={you ? ED.dim : ED.bone} />
      {struck > 0 && <div style={{ position: 'absolute', left: 0, top: '55%', height: 4, width: `${struck * 100}%`, background: ED.uv }} />}
    </div>
  </div>
);

/** "Sorgu odası": you question a suspect, evidence lands, the suspect breaks. Ad-only (adCases.ts). */
export const C3Interrogation: React.FC<C3Props> = (p) => {
  const b = interrogationBeats(p.voices);
  const v = p.voices;
  return (
    <AbsoluteFill style={{ backgroundColor: '#030304' }}>
      <Sequence durationInFrames={b.cta} name="Sorgu">
        <Room p={p} b={b} />
        <Bug />
        <div style={{ position: 'absolute', left: ED.M, top: 300 }}>
          <Rise at={4}>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 96, lineHeight: 1, color: ED.bone }}>Sorgu odası</div>
          </Rise>
          <Rise at={10}>
            <Fact size={30}>Gece 23:52. Kayıt açık.</Fact>
          </Rise>
        </div>
        <Sequence from={b.q1} durationInFrames={b.a1 - b.q1} layout="none">
          <Line who="Sen" text={p.q1} at={0} sec={v[0]!.sec} you />
        </Sequence>
        <Sequence from={b.a1} durationInFrames={b.q2 - b.a1} layout="none">
          <Line who={p.name} text={p.a1} at={0} sec={v[1]!.sec} />
        </Sequence>
        <Sequence from={b.ev} layout="none">
          <Evidence source={p.evidence.source} text={p.evidence.text} />
        </Sequence>
        <Sequence from={b.q2} durationInFrames={b.a2 - b.q2} layout="none">
          <Line who="Sen" text={p.q2} at={0} sec={v[2]!.sec} you />
        </Sequence>
        <Sequence from={b.a2} durationInFrames={b.cta - b.a2} layout="none">
          <Line who={p.name} text={p.a2} at={0} sec={v[3]!.sec} />
        </Sequence>
        <Sequence from={b.lie} layout="none">
          <div style={{ position: 'absolute', left: ED.M, top: 700 }}>
            <Words text="Yalan." at={0} frames={6} size={220} italic color={ED.uv} />
          </div>
        </Sequence>
      </Sequence>
      <Sequence from={b.cta} name="CTA">
        <EditorialCta line="Herkes bir şey saklıyor." sub="Sorguyu sen yönet, ekibinle çöz." />
      </Sequence>

      <Music src={p.music} from={p.musicFrom} volume={0.75} duck={{ from: b.q1, to: b.lie, level: 0.35 }} />
      {[b.q1, b.a1, b.q2, b.a2].map((at, i) =>
        hasStaticFile(v[i]!.src) ? (
          <Sequence key={i} from={at} durationInFrames={f(v[i]!.sec) + 6} layout="none" name={`ses ${i}`}>
            <Audio src={staticFile(v[i]!.src)} volume={1.1} />
          </Sequence>
        ) : null,
      )}
      <Sfx name="heart" at={4} frames={18} volume={1.6} />
      <Sfx name="stamp" at={b.ev} frames={10} volume={1.6} />
      <Sfx name="heart" at={b.silence} frames={18} volume={2} />
      <Sfx name="stamp" at={b.lie} frames={10} volume={2.2} />
    </AbsoluteFill>
  );
};
