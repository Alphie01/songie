import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { EASE } from '../../brand/casebook/Editorial';
import { FONT_FABLE, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { Dark, Glyph, PlayerRow, Tale, Ui, Village, WkBug, WW } from '../../brand/weknows/Night';
import { WkCta } from './W1Night';

const FPS = VIDEO.fps;
const clip = z.object({ src: z.string(), sec: z.number().min(0.3).max(6) });
const claim = z.enum(['seer', 'villager', 'doctor']);
export const w2Schema = z.object({
  dead: z.string(),
  rule: z.string().max(60),
  players: z.array(z.object({ name: z.string(), claim, line: z.string().max(64), wolf: z.boolean().optional() })).length(3),
  reveal: z.string().max(70),
  /** morning line, the three claims, the question */
  voices: z.array(clip).length(5),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
});
export type W2Props = z.infer<typeof w2Schema>;

const f = (s: number) => Math.round(s * FPS);
/** morning + rule → three claims → "Peki, kurt kim?" + 2 s to think → the wolf turns red → CTA. */
export function whoBeats(v: { sec: number }[]) {
  const talk: number[] = [];
  let t = f(v[0]!.sec) + 6 + 44; // the rule needs a beat to be read
  for (let i = 1; i <= 3; i++) {
    talk.push(t);
    t += f(v[i]!.sec) + 8;
  }
  const ask = t;
  const reveal = ask + f(v[4]!.sec) + 6 + 60;
  const cta = reveal + 70;
  return { talk, ask, reveal, cta, total: cta + 62 };
}

const vo = (id: string, sec: number) => ({ src: `assets/voices/${id}.el.mp3`, sec });
export const W2_META = {
  id: 'weknows-kurt-02-kim-kurt',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    dead: 'Ece',
    rule: 'Doktorun koruduğu kişiyi kurtlar öldüremez.',
    players: [
      { name: 'Mert', claim: 'seer', line: 'Ben kahinim. Dün gece Can’a baktım, kurt değil.' },
      { name: 'Can', claim: 'villager', line: 'Ben köylüyüm, hiçbir şey bilmiyorum.' },
      { name: 'Deniz', claim: 'doctor', line: 'Ben doktorum. Dün gece Ece’yi korudum.', wolf: true },
    ],
    reveal: 'Deniz Ece’yi koruduysa, Ece nasıl öldü?',
    voices: [vo('ww-p0', 1.75), vo('ww-p1', 2.94), vo('ww-p2', 1.71), vo('ww-p3', 2.51), vo('ww-p5', 1.44)],
    music: 'assets/songs/3919449671.mp3',
    musicFrom: 0,
  } as W2Props,
} as const;

const CLAIM: Record<z.infer<typeof claim>, { label: string; color: string }> = {
  seer: { label: 'Kahin', color: WW.seer },
  villager: { label: 'Köylü', color: WW.villager },
  doctor: { label: 'Doktor', color: WW.doctor },
};

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

const lin = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });

/**
 * Kurt Adam · "Kim kurt?": a morning in the game. Ece died; the rule says the doctor's patient cannot die; three
 * players claim roles (ElevenLabs voices); the viewer has two seconds; Deniz's card turns into the wolf.
 */
export const W2WhoWolf: React.FC<W2Props> = (p) => {
  const frame = useCurrentFrame();
  const b = whoBeats(p.voices);
  const speaking = b.talk.findIndex((t, i) => frame >= t && frame < t + f(p.voices[i + 1]!.sec) + 8);
  const last = b.talk.reduce((k, t, i) => (frame >= t ? i : k), -1);
  const shown = speaking >= 0 ? speaking : frame < b.ask ? last : -1;
  const revealed = lin(frame, b.reveal, b.reveal + 14);
  const think = interpolate(frame, [b.ask + f(p.voices[4]!.sec) + 6, b.reveal], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dead = lin(frame, 6, 20);
  const strike = lin(frame, 26, 40);
  const rule = lin(frame, f(p.voices[0]!.sec) + 8, f(p.voices[0]!.sec) + 22);
  const wolf = p.players.find((x) => x.wolf) ?? p.players[2]!;
  return (
    <AbsoluteFill style={{ backgroundColor: WW.deep }}>
      <Sequence durationInFrames={b.cta} name="Sabah">
        <Dark>
          <Village dawn={1} dim={0.3} frames={b.cta} push={[1.05, 1.15]} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(7,5,26,0.35), rgba(7,5,26,0.92) 60%)' }} />
          <WkBug />
          {/* the dead */}
          <div style={{ position: 'absolute', left: WW.M, top: 380, opacity: dead }}>
            <Ui size={30} weight={500} color={WW.dim}>
              Bu gece ölen
            </Ui>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{ fontFamily: FONT_FABLE, fontSize: 150, lineHeight: 1, letterSpacing: -4, color: WW.bone }}>{p.dead}</div>
              <div style={{ position: 'absolute', left: -6, top: '56%', height: 8, width: `calc(${strike * 100}% + 12px)`, background: WW.wolf }} />
            </div>
          </div>
          {/* the rule of the game */}
          <div style={{ position: 'absolute', left: WW.M, top: 620, width: WW.W, display: 'flex', gap: 22, opacity: rule, transform: `translateY(${(1 - rule) * 20}px)` }}>
            <div style={{ width: 6, background: WW.doctor }} />
            <div>
              <Ui size={26} weight={500} color={WW.dim}>
                Oyunun kuralı
              </Ui>
              <div style={{ fontFamily: FONT_FABLE, fontSize: 50, lineHeight: 1.1, color: WW.bone }}>{p.rule}</div>
            </div>
          </div>
          {/* the table */}
          <div style={{ position: 'absolute', left: WW.M, top: 830, width: WW.W, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {p.players.map((pl, i) => {
              const on = lin(frame, b.talk[i]! - 4, b.talk[i]! + 8);
              const isWolf = pl.wolf && revealed > 0;
              const c = CLAIM[pl.claim];
              return (
                <div key={pl.name} style={{ opacity: Math.max(0.25, on) * (revealed > 0 && !pl.wolf ? 0.5 : 1) }}>
                  <PlayerRow
                    name={pl.name}
                    pick={isWolf ? 1 : speaking === i ? 1 : 0}
                    color={isWolf ? WW.wolf : WW.lilac}
                    right={
                      on > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Glyph role={isWolf ? 'wolf' : pl.claim} size={40} color={isWolf ? WW.wolf : c.color} stroke={1.8} />
                          <Ui size={28} color={isWolf ? WW.wolf : c.color}>
                            {isWolf ? 'Kurt Adam' : `“${c.label}”`}
                          </Ui>
                        </div>
                      ) : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
          {/* what is said */}
          <div style={{ position: 'absolute', left: WW.M, top: 1210, width: WW.W }}>
            {shown >= 0 && frame < b.ask && (
              <Sequence from={b.talk[shown]!} layout="none" key={shown}>
                <Ui size={28} color={WW.lilac}>
                  {p.players[shown]!.name}
                </Ui>
                <Tale text={`“${p.players[shown]!.line}”`} at={0} frames={f(p.voices[shown + 1]!.sec)} size={62} />
              </Sequence>
            )}
            {frame >= b.ask && frame < b.reveal && (
              <>
                <Tale text="Peki, kurt kim?" at={b.ask} frames={20} size={110} />
                <Ui size={30} weight={500} color={WW.dim} style={{ marginTop: 14 }}>
                  Durdur, düşün, cevabını yorumlara yaz.
                </Ui>
                <div style={{ marginTop: 26, height: 3, background: 'rgba(241,236,226,0.2)' }}>
                  <div style={{ width: `${think * 100}%`, height: '100%', background: think < 0.35 ? WW.wolf : WW.bone }} />
                </div>
              </>
            )}
            {frame >= b.reveal && (
              <>
                <Ui size={30} color={WW.wolf}>
                  {wolf.name} kurt.
                </Ui>
                <Tale text={p.reveal} at={b.reveal + 4} frames={30} size={62} />
              </>
            )}
          </div>
        </Dark>
      </Sequence>
      <Sequence from={b.cta} name="CTA">
        <WkCta line="Kurtları sen bul." sub="Kurt Adam, We Knows’ta. Arkadaşlarınla oyna." dawn={0} />
      </Sequence>

      <Music src={p.music} from={p.musicFrom} volume={0.9} duck={{ from: 0, to: b.reveal, level: 0.38 }} />
      {[6, ...b.talk, b.ask].map((at, i) =>
        hasStaticFile(p.voices[i]!.src) ? (
          <Sequence key={i} from={at} durationInFrames={f(p.voices[i]!.sec) + 8} layout="none" name={`ses ${i}`}>
            <Audio src={staticFile(p.voices[i]!.src)} volume={1.1} />
          </Sequence>
        ) : null,
      )}
      <Sfx name="heart" at={4} frames={18} volume={1.4} />
      <Sfx name="tick" at={f(p.voices[0]!.sec) + 8} frames={3} volume={1.4} />
      {[0, 30].map((d) => (
        <Sfx key={d} name="clock" at={b.ask + f(p.voices[4]!.sec) + 6 + d} frames={3} volume={1.3} />
      ))}
      <Sfx name="stamp" at={b.reveal} frames={10} volume={1.6} />
    </AbsoluteFill>
  );
};
