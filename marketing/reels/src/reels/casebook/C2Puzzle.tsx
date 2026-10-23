import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { BigCaps, caps, CasePhoto, ClueCard, Countdown, Flash, NoirStage, PoliceLights, Stamp, Typewriter, Waveform } from '../../brand/casebook/Noir';
import { FONT_HEAD, FONT_MONO, SAFE, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { casebookTheme } from '../../themes/casebook';
import { CasebookCta } from './C1Case';

const c = casebookTheme.colors;
const FPS = VIDEO.fps;

const clip = z.object({ src: z.string(), sec: z.number().min(0.3).max(5) });
export const c2Schema = z.object({
  scene: z.string(),
  premise: z.string().max(60),
  clue: z.object({ source: z.string(), text: z.string().max(60) }),
  suspects: z.array(z.object({ name: z.string(), portrait: z.string(), line: z.string().max(60), liar: z.boolean().optional() })).length(3),
  voices: z.array(clip).length(3),
  reveal: z.string().max(80),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
});
export type C2Props = z.infer<typeof c2Schema>;

/**
 * Beats from the voice lengths: hook 1,8 s → premise + clue 2,8 s → three suspects (their line + a breath) →
 * "Durdur" pause so the timer covers ~10 s → reveal 2,6 s → "Bu sadece bir ipucuydu." over the logo 2,5 s.
 */
export function puzzleBeats(voices: { sec: number }[]) {
  const hook = 0;
  const board = 45;
  const clueAt = 24; // inside the board
  const s0 = board + 66;
  const talk: { at: number; len: number }[] = [];
  let t = s0;
  for (const v of voices) {
    const len = Math.round(v.sec * FPS) + 8;
    talk.push({ at: t, len });
    t += len;
  }
  const pause = Math.min(75, Math.max(45, 300 - (t - s0)));
  const reveal = t + pause;
  const cta = reveal + 78;
  return { hook, board, clueAt, s0, talk, pauseAt: t, reveal, cta, total: cta + 75, seconds: Math.round((reveal - s0) / FPS) };
}

const B = 'cases';
export const C2_META = {
  id: 'casebook-02-yalanci',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    scene: `${B}/yalida-son-aksam/img/scene-night.webp`,
    premise: 'Kurban 22:40’ta evinde ölü bulundu.',
    clue: { source: 'Meteoroloji kaydı', text: 'Yağmur 22:30’da başladı.' },
    suspects: [
      { name: 'Selin', portrait: `${B}/bodrum-zehir/img/p-selin.webp`, line: 'Bütün akşam spor salonundaydım.' },
      { name: 'Kerem', portrait: `${B}/ayvalik-miras/img/p-kerem.webp`, line: 'Dokuzda geldim, yağmurdan sırılsıklamdım.', liar: true },
      { name: 'Nur', portrait: `${B}/sahnede-olum/img/p-nur.webp`, line: 'Sekizden beri annemlerdeydim.' },
    ],
    voices: [
      { src: 'assets/voices/pz-yagmur-0.mp3', sec: 2.51 },
      { src: 'assets/voices/pz-yagmur-1.mp3', sec: 3.25 },
      { src: 'assets/voices/pz-yagmur-2.mp3', sec: 2.64 },
    ],
    reveal: 'Yağmur 22:30’da başladı. Kerem dokuzda nasıl ıslandı?',
    music: 'assets/songs/3919579631.mp3',
    musicFrom: 0,
  } as C2Props,
} as const;

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

const ROW = { y: 660, w: 300, h: 380, x: [60, 390, 720] } as const;

/** One suspect card: portrait, name; lit and lifted while talking, dimmed while the others talk. */
const SuspectCard: React.FC<{ s: C2Props['suspects'][number]; x: number; enterAt: number; talking: boolean; dim: boolean }> = ({ s, x, enterAt, talking, dim }) => {
  const p = usePop(enterAt, 13);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: ROW.y,
        width: ROW.w,
        opacity: Math.min(1, p * 2),
        transform: `translateY(${interpolate(p, [0, 1], [80, 0])}px) scale(${talking ? 1.07 : 1})`,
        filter: dim ? 'brightness(0.45)' : 'none',
        transition: 'none',
      }}
    >
      <div style={{ border: `6px solid ${talking ? c.yellow : 'rgba(243,230,196,0.25)'}`, boxShadow: talking ? `0 0 60px rgba(255,210,63,0.35)` : '0 20px 40px rgba(0,0,0,0.6)' }}>
        <CasePhoto src={s.portrait} style={{ width: '100%', height: ROW.h }} dim={0.95} zoom={[1, 1]} position="center 25%" />
      </div>
      <div style={{ marginTop: 10, fontFamily: FONT_HEAD, fontSize: 64, color: talking ? c.yellow : c.paper, textAlign: 'center' }}>{caps(s.name)}</div>
    </div>
  );
};

const Board: React.FC<{ p: C2Props; b: ReturnType<typeof puzzleBeats> }> = ({ p, b }) => {
  const frame = useCurrentFrame() + b.board; // absolute frame
  const speaking = b.talk.findIndex((t) => frame >= t.at && frame < t.at + t.len);
  const last = b.talk.reduce((k, t, i) => (frame >= t.at ? i : k), -1);
  const paused = frame >= b.pauseAt;
  const dimAll = interpolate(frame, [b.pauseAt, b.pauseAt + 8], [0, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sub = speaking >= 0 ? speaking : last;
  const subLine = sub >= 0 && !paused ? p.suspects[sub]! : null;
  const subIn = sub >= 0 ? interpolate(frame, [b.talk[sub]!.at, b.talk[sub]!.at + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <NoirStage>
      <CasePhoto src={p.scene} style={{ position: 'absolute', inset: 0 }} dim={0.28} frames={b.reveal - b.board} zoom={[1.15, 1]} />
      <Typewriter text={p.premise} enterAt={4} charsPerFrame={1.8} size={48} style={{ position: 'absolute', left: SAFE.side, top: SAFE.top - 20, width: 960 }} />
      <div style={{ position: 'absolute', left: SAFE.side, top: 350 }}>
        <ClueCard source={p.clue.source} text={p.clue.text} enterAt={b.clueAt} width={960} size={52} />
      </div>
      {p.suspects.map((s, i) => (
        <SuspectCard key={i} s={s} x={ROW.x[i]!} enterAt={b.clueAt + 22 + i * 6 - 0} talking={speaking === i} dim={speaking >= 0 && speaking !== i} />
      ))}
      {subLine && (
        <div style={{ position: 'absolute', left: SAFE.side, top: 1185, width: 960, opacity: subIn }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 52, color: c.yellow }}>{caps(subLine.name)}</div>
            <Waveform active={speaking >= 0} />
          </div>
          <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 54, lineHeight: 1.15, color: c.paper }}>“{subLine.line}”</div>
        </div>
      )}
      <AbsoluteFill style={{ backgroundColor: `rgba(5,4,7,${dimAll})` }} />
      {frame >= b.s0 && (
        <div style={{ position: 'absolute', right: SAFE.side, top: 1370 }}>
          <Countdown from={b.s0 - b.board} frames={b.reveal - b.s0} seconds={b.seconds} />
        </div>
      )}
      {paused && (
        <>
          <BigCaps text={'DURDUR.\nSENCE KİM?'} enterAt={b.pauseAt - b.board} size={150} style={{ position: 'absolute', left: SAFE.side, top: 1150 }} />
          <div style={{ position: 'absolute', left: SAFE.side, top: 1440, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 46, color: c.yellow }}>Cevabını yorumlara yaz.</div>
        </>
      )}
    </NoirStage>
  );
};

const Reveal: React.FC<{ p: C2Props }> = ({ p }) => {
  const liar = p.suspects.find((s) => s.liar) ?? p.suspects[0]!;
  const card = usePop(0, 14);
  return (
    <NoirStage>
      <div
        style={{
          position: 'absolute',
          left: 250,
          top: SAFE.top,
          width: 580,
          padding: 16,
          background: c.paper,
          boxShadow: '0 30px 60px rgba(0,0,0,0.75)',
          transform: `rotate(-3deg) scale(${interpolate(card, [0, 1], [1.25, 1])})`,
          opacity: Math.min(1, card * 2),
        }}
      >
        <CasePhoto src={liar.portrait} style={{ width: '100%', height: 620 }} dim={0.9} zoom={[1.05, 1.12]} frames={84} position="center 25%" />
        <div style={{ fontFamily: FONT_HEAD, fontSize: 80, color: c.ink, textAlign: 'center', paddingTop: 8 }}>{caps(liar.name)}</div>
        <Stamp text="YALANCI" enterAt={10} size={110} rotate={-14} style={{ position: 'absolute', left: 40, top: 300, background: 'rgba(243,230,196,0.85)', mixBlendMode: 'normal' }} />
      </div>
      <div style={{ position: 'absolute', left: SAFE.side, top: 1110 }}>
        <ClueCard source={p.clue.source} text={p.clue.text} enterAt={18} markAt={26} width={960} size={46} rotate={1} />
      </div>
      <Typewriter text={p.reveal} enterAt={34} charsPerFrame={2.2} size={48} style={{ position: 'absolute', left: SAFE.side, top: 1330, width: 960 }} />
    </NoirStage>
  );
};

const Hook: React.FC<{ p: C2Props }> = ({ p }) => (
  <NoirStage lamp={false}>
    <CasePhoto src={p.scene} style={{ position: 'absolute', inset: 0 }} dim={0.55} frames={60} zoom={[1.2, 1.1]} />
    <PoliceLights strength={0.75} />
    <BigCaps text={'BİRİ YALAN\nSÖYLÜYOR.'} enterAt={3} size={200} style={{ position: 'absolute', left: SAFE.side, top: 640 }} />
    <div style={{ position: 'absolute', left: SAFE.side, top: 1050 }}>
      <Typewriter text="Bulabilir misin?" enterAt={20} charsPerFrame={1.4} size={64} color={c.yellow} />
    </div>
  </NoirStage>
);

/** "10 saniyelik vaka": three voiced alibis, one clue, a timer, then the liar. Ad-only cases (adCases.ts). */
export const C2Puzzle: React.FC<C2Props> = (p) => {
  const b = puzzleBeats(p.voices);
  return (
    <AbsoluteFill style={{ backgroundColor: c.bgDeep }}>
      <Sequence durationInFrames={b.board} name="Hook">
        <Hook p={p} />
      </Sequence>
      <Sequence from={b.board} durationInFrames={b.reveal - b.board} name="Board">
        <Board p={p} b={b} />
      </Sequence>
      <Sequence from={b.reveal} durationInFrames={b.cta - b.reveal} name="Reveal">
        <Reveal p={p} />
      </Sequence>
      <Sequence from={b.cta} name="CTA">
        <CasebookCta kicker="Bu sadece bir ipucuydu." tagline="Her vakada onlarca belge, 8 şüpheli, 1 ekip" />
      </Sequence>
      <Flash at={b.board} />
      <Flash at={b.reveal} frames={9} />
      <Flash at={b.cta} />

      <Music src={p.music} from={p.musicFrom} duck={{ from: b.s0, to: b.pauseAt, level: 0.35 }} />
      {p.voices.map((v, i) =>
        hasStaticFile(v.src) ? (
          <Sequence key={i} from={b.talk[i]!.at} durationInFrames={b.talk[i]!.len} layout="none" name={`ses ${i}`}>
            <Audio src={staticFile(v.src)} volume={1.1} />
          </Sequence>
        ) : null,
      )}
      <Sfx name="siren" at={0} frames={27} volume={1.4} />
      <Sfx name="stamp" at={3} frames={10} volume={1.6} />
      <Sfx name="stamp" at={b.board + b.clueAt} frames={10} volume={1.4} />
      {Array.from({ length: Math.floor((b.reveal - b.pauseAt) / 15) }, (_, k) => (
        <Sfx key={k} name="clock" at={b.pauseAt + k * 15} frames={3} volume={1.6} />
      ))}
      <Sfx name="heart" at={b.pauseAt + 4} frames={18} volume={1.5} />
      <Sfx name="shutter" at={b.reveal} />
      <Sfx name="stamp" at={b.reveal + 10} frames={10} volume={2} />
      <Sfx name="stamp" at={b.cta + 2} frames={10} />
    </AbsoluteFill>
  );
};
