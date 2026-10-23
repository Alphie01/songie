import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { Black, Bug, EASE, ED, Fact, Rise, Shot, useIn, Words } from '../../brand/casebook/Editorial';
import { FONT_SERIF, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { EditorialCta } from './C5Trailer';

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
    reveal: 'Kerem dokuzda nasıl ıslandı?',
    music: 'assets/songs/3919579631.mp3',
    musicFrom: 0,
  } as C2Props,
} as const;

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

/** Contact-sheet row of the three suspects, edge to edge on the grid. */
const COL = { y: 700, w: (ED.W - 12) / 3, h: 470 } as const;

/** Clue as a fact line: UV bar, source in sans, the fact in the serif. */
const Clue: React.FC<{ source: string; text: string; at: number; mark?: number }> = ({ source, text, at, mark = 0 }) => {
  const t = useIn(at, 16);
  return (
    <div style={{ display: 'flex', gap: 24, opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
      <div style={{ width: 6, background: ED.uv }} />
      <div>
        <Fact size={28}>{source}</Fact>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 62, lineHeight: 1.05, color: ED.bone, letterSpacing: -0.6 }}>
          <span style={{ backgroundImage: `linear-gradient(${ED.uv}, ${ED.uv})`, backgroundRepeat: 'no-repeat', backgroundPosition: '0 92%', backgroundSize: `${mark * 100}% 6px` }}>{text}</span>
        </div>
      </div>
    </div>
  );
};

const Board: React.FC<{ p: C2Props; b: ReturnType<typeof puzzleBeats> }> = ({ p, b }) => {
  const frame = useCurrentFrame() + b.board; // absolute frame
  const speaking = b.talk.findIndex((t) => frame >= t.at && frame < t.at + t.len);
  const last = b.talk.reduce((k, t, i) => (frame >= t.at ? i : k), -1);
  const paused = frame >= b.pauseAt;
  const local = (f: number) => f - b.board;
  const timer = interpolate(frame, [b.s0, b.reveal], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sub = speaking >= 0 ? speaking : last;
  return (
    <Black>
      <Bug />
      <div style={{ position: 'absolute', left: ED.M, top: 320, width: ED.W }}>
        <Words text={p.premise} at={2} frames={26} size={58} italic color={ED.dim} />
      </div>
      <div style={{ position: 'absolute', left: ED.M, top: 450, width: ED.W }}>
        <Clue source={p.clue.source} text={p.clue.text} at={b.clueAt} />
      </div>
      {p.suspects.map((s, i) => {
        const on = useInStatic(frame, b.board + b.clueAt + 18 + i * 4);
        const lit = speaking === i;
        return (
          <div key={i} style={{ position: 'absolute', left: ED.M + i * (COL.w + 6), top: COL.y, width: COL.w, height: COL.h, overflow: 'hidden', clipPath: `inset(${(1 - on) * 100}% 0 0 0)` }}>
            {hasStaticFile(s.portrait) && (
              <Img
                src={staticFile(s.portrait)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 22%',
                  filter: `grayscale(1) contrast(1.15) brightness(${speaking < 0 || lit ? 0.95 : 0.4})`,
                  transform: `scale(${lit ? 1.06 : 1})`,
                }}
              />
            )}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: lit ? ED.uv : 'transparent' }} />
            <Fact size={28} weight={600} color={ED.bone} style={{ position: 'absolute', left: 14, bottom: 14, textShadow: '0 1px 10px #000' }}>
              {s.name}
            </Fact>
          </div>
        );
      })}
      {/* what the speaker says, under the faces */}
      <div style={{ position: 'absolute', left: ED.M, top: COL.y + COL.h + 34, width: ED.W }}>
        {!paused && sub >= 0 && (
          <Sequence from={local(b.talk[sub]!.at)} layout="none" key={sub}>
            <Fact size={28} weight={600} color={ED.uv}>
              {p.suspects[sub]!.name}
            </Fact>
            <Words text={`“${p.suspects[sub]!.line}”`} at={0} frames={b.talk[sub]!.len - 8} size={60} italic />
          </Sequence>
        )}
        {paused && (
          <>
            <Words text="Sence kim?" at={local(b.pauseAt)} frames={10} size={110} />
            <Fact style={{ marginTop: 10 }}>Durdur, düşün, cevabını yorumlara yaz.</Fact>
          </>
        )}
      </div>
      {/* the timer is a hairline that runs out */}
      {frame >= b.s0 && (
        <div style={{ position: 'absolute', left: ED.M, top: 1500, width: ED.W, height: 3, background: ED.rule }}>
          <div style={{ width: `${timer * 100}%`, height: '100%', background: timer < 0.3 ? ED.uv : ED.bone }} />
        </div>
      )}
    </Black>
  );
};

const useInStatic = (frame: number, at: number, frames = 16) =>
  interpolate(frame, [at, at + frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });

const Reveal: React.FC<{ p: C2Props; len: number }> = ({ p, len }) => {
  const liar = p.suspects.find((s) => s.liar) ?? p.suspects[0]!;
  const frame = useCurrentFrame();
  const mark = interpolate(frame, [22, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return (
    <Black>
      <Shot src={liar.portrait} frames={len} bw from={1.04} to={1.12} pos="center 18%" />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 60%, #000 66%)' }} />
      <div style={{ position: 'absolute', left: ED.M, top: 930, width: ED.W }}>
        <Words text={liar.name} at={2} frames={8} size={200} italic color={ED.uv} />
        <Rise at={10} style={{ marginTop: 4 }}>
          <Fact size={36} color={ED.bone}>
            yalan söylüyor.
          </Fact>
        </Rise>
      </div>
      <div style={{ position: 'absolute', left: ED.M, top: 1230, width: ED.W }}>
        <Clue source={p.clue.source} text={p.clue.text} at={16} mark={mark} />
        <Words text={p.reveal} at={34} frames={30} size={46} italic color={ED.dim} style={{ marginTop: 16 }} />
      </div>
      <Bug />
    </Black>
  );
};

const Hook: React.FC<{ p: C2Props }> = ({ p }) => (
  <Black>
    <Shot src={p.scene} frames={45} from={1.15} to={1.08} />
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.9) 75%)' }} />
    <div style={{ position: 'absolute', left: ED.M, top: 900, width: ED.W }}>
      <Words text="Biri yalan söylüyor." at={2} frames={16} size={150} />
      <Rise at={18} style={{ marginTop: 18 }}>
        <Fact size={40} color={ED.bone}>
          Üç ifade, tek ipucu. Bulabilir misin?
        </Fact>
      </Rise>
    </div>
    <Bug />
  </Black>
);

/** "10 saniyelik vaka": three voiced alibis, one clue, a timer, then the liar. Ad-only cases (adCases.ts). */
export const C2Puzzle: React.FC<C2Props> = (p) => {
  const b = puzzleBeats(p.voices);
  return (
    <AbsoluteFill style={{ backgroundColor: ED.black }}>
      <Sequence durationInFrames={b.board} name="Hook">
        <Hook p={p} />
      </Sequence>
      <Sequence from={b.board} durationInFrames={b.reveal - b.board} name="Board">
        <Board p={p} b={b} />
      </Sequence>
      <Sequence from={b.reveal} durationInFrames={b.cta - b.reveal} name="Reveal">
        <Reveal p={p} len={b.cta - b.reveal} />
      </Sequence>
      <Sequence from={b.cta} name="CTA">
        <EditorialCta line="Bu sadece bir ipucuydu." sub="Casebook’ta her vaka onlarca belge ve senin ekibin." />
      </Sequence>

      <Music src={p.music} from={p.musicFrom} duck={{ from: b.s0, to: b.pauseAt, level: 0.35 }} />
      {p.voices.map((v, i) =>
        hasStaticFile(v.src) ? (
          <Sequence key={i} from={b.talk[i]!.at} durationInFrames={b.talk[i]!.len} layout="none" name={`ses ${i}`}>
            <Audio src={staticFile(v.src)} volume={1.1} />
          </Sequence>
        ) : null,
      )}
      <Sfx name="tick" at={b.board + b.clueAt} frames={3} volume={1.4} />
      {Array.from({ length: Math.floor((b.reveal - b.pauseAt) / 15) }, (_, k) => (
        <Sfx key={k} name="clock" at={b.pauseAt + k * 15} frames={3} volume={1.6} />
      ))}
      <Sfx name="heart" at={b.pauseAt + 4} frames={18} volume={1.5} />
      <Sfx name="stamp" at={b.reveal} frames={10} volume={1.6} />
    </AbsoluteFill>
  );
};
