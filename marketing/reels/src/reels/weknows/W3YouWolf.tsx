import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { EASE } from '../../brand/casebook/Editorial';
import { VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { AppPhone, Dark, Tale, Ui, Village, WkBug, WW } from '../../brand/weknows/Night';
import { KurtDiscuss, KurtNightWolf, KurtResult, KurtVerdict, KurtVote } from '../../brand/weknows/kurt/KurtScreens';
import { WkCta } from './W1Night';
import { WW_POV } from './werewolfAds';

const FPS = VIDEO.fps;
const clip = z.object({ src: z.string(), sec: z.number().min(0.3).max(6) });
export const w3Schema = z.object({ voices: z.array(clip).length(6), music: z.string(), musicFrom: z.number().min(0).max(25) });
export type W3Props = z.infer<typeof w3Schema>;

const f = (s: number) => Math.round(s * FPS);
/** role card → Ece, Can, you → the vote (Sen 3, Kimseyi asma 4) → "Bugün kimse asılmadı." → "Kurtlar kazandı." → CTA */
export function youBeats(v: { sec: number }[]) {
  const card = 0;
  const talk: number[] = [];
  let t = f(v[0]!.sec) + 34;
  for (let i = 1; i <= 3; i++) {
    talk.push(t);
    t += f(v[i]!.sec) + (i === 3 ? 16 : 8);
  }
  const vote = t;
  const spared = vote + 56;
  const win = spared + f(v[4]!.sec) + 10;
  const cta = win + f(v[5]!.sec) + 30;
  return { card, talk, vote, spared, win, cta, total: cta + 62 };
}

const vo = (id: string, sec: number) => ({ src: `assets/voices/${id}.el.mp3`, sec });
export const W3_META = {
  id: 'weknows-kurt-03-rolun-kurt',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    voices: [vo('ww-v0', 1.99), vo('ww-v1', 1.49), vo('ww-v2', 1.65), vo('ww-v3', 1.89), vo('ww-v4', 2.02), vo('ww-v5', 1.19)],
    music: 'assets/songs/3919552591.mp3',
    musicFrom: 0,
  } as W3Props,
} as const;

const L = WW_POV;
const VOTES = { you: 3, none: 4 } as const;
/** The table of this story (avatar colours from the artboard; you are white). */
const TABLE = [
  { name: 'Ece', color: '#FF7AC6' },
  { name: 'Mert', color: '#3EE0A8' },
  { name: 'Can', color: '#FF8A5B' },
  { name: 'Zeynep', color: '#FFD23F' },
  { name: 'Kaan', color: '#B794FF' },
  { name: 'Sen', color: '#FFFFFF' },
];

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);
const lin = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });

/** Your phone, first person: the real night screen, a thumb holds the role card, it opens as Kurt Adam. */
const RoleCard: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const press = lin(frame, 20, 28);
  const open = frame >= 28;
  return (
    <Dark>
      <Village dim={0.2} frames={len} />
      <div style={{ position: 'absolute', left: WW.M, top: 250, width: WW.W }}>
        <Tale text={L[0]!.text} at={6} frames={f(1.99)} size={66} />
      </div>
      <AppPhone glow={open ? WW.wolf : WW.lilac}>
        <KurtNightWolf players={TABLE.slice(0, 5).concat([{ name: 'Deniz', color: '#5AB8FF' }])} pick={null} timer={Math.max(1, 30 - Math.floor(frame / FPS) * 2)} cardOpen={open} nightNo={1} chat={null} />
      </AppPhone>
      {/* the thumb on the hold-to-reveal card */}
      <div
        style={{
          position: 'absolute',
          left: 480,
          top: 1372,
          width: 120,
          height: 120,
          borderRadius: 60,
          background: 'rgba(241,236,226,0.18)',
          border: `3px solid ${WW.bone}`,
          opacity: frame >= 12 ? 0.8 : 0,
          transform: `scale(${1.15 - press * 0.2})`,
        }}
      />
    </Dark>
  );
};

/** Day on the real discussion screen: Ece and Can nominate you; your answer (the lie) is in moon yellow. */
const Day: React.FC<{ b: ReturnType<typeof youBeats>; v: W3Props['voices'] }> = ({ b, v }) => {
  const frame = useCurrentFrame() + b.talk[0]!; // absolute
  const who = b.talk.reduce((k, t, i) => (frame >= t ? i : k), 0);
  const line = L[who + 1]!;
  const you = line.who === 'Sen';
  const by = ['Ece', 'Can'].slice(0, (frame >= b.talk[0]! + 20 ? 1 : 0) + (frame >= b.talk[1]! + 20 ? 1 : 0));
  return (
    <Dark>
      <Village dawn={1} dim={0.22} frames={b.vote - b.talk[0]!} push={[1.1, 1.18]} />
      <Sequence from={b.talk[who]! - b.talk[0]!} layout="none" key={who}>
        <div style={{ position: 'absolute', left: WW.M, top: 230, width: WW.W }}>
          <Ui size={30} color={you ? WW.moon : WW.lilac}>
            {line.who}
          </Ui>
          <Tale text={`“${line.text}”`} at={0} frames={f(v[who + 1]!.sec)} size={60} color={you ? WW.moon : WW.bone} />
        </div>
      </Sequence>
      <AppPhone glow={you ? WW.moon : WW.lilac}>
        <KurtDiscuss players={TABLE} dayNo={1} me="Sen" candidates={by.length ? [{ name: 'Sen', by }] : []} timer={Math.max(10, 120 - Math.floor((frame - b.talk[0]!) / FPS) * 3)} timerMax={120} readyCount={[by.length, 7]} />
      </AppPhone>
    </Dark>
  );
};

/** The vote on the real screen: Sen 3 against Kimseyi asma 4, then the verdict: nobody hangs. */
const Vote: React.FC<{ b: ReturnType<typeof youBeats>; v: W3Props['voices'] }> = ({ b, v }) => {
  const frame = useCurrentFrame() + b.vote;
  const count = (n: number, start: number) => Math.min(n, Math.max(0, Math.floor((frame - start) / 7)));
  const you = count(VOTES.you, b.vote + 8);
  const none = count(VOTES.none, b.vote + 12);
  const done = frame >= b.spared;
  const youBy = ['Ece', 'Can', 'Zeynep'].slice(0, you);
  const noneBy = ['Sen', 'Kaan', 'Mert', 'Deniz'].slice(0, none);
  return (
    <Dark>
      <Village dawn={1} dim={0.22} frames={b.win - b.vote} push={[1.18, 1.22]} />
      <div style={{ position: 'absolute', left: WW.M, top: 250, width: WW.W }}>
        {done ? <Tale text={L[4]!.text} at={b.spared - b.vote} frames={f(v[4]!.sec)} size={66} /> : <Tale text="Oylar sana dönüyor…" at={0} frames={16} size={66} />}
      </div>
      <AppPhone glow={done ? WW.bone : WW.wolf}>
        {done ? (
          <KurtVerdict hanged={null} tally={[{ name: 'Sen', votes: VOTES.you, by: youBy }]} dayNo={1} alive={6} />
        ) : (
          <KurtVote players={TABLE} options={[{ name: 'Sen', votes: you, by: youBy }]} noneVotes={none} noneBy={noneBy} mine="none" progress={[you + none, 7]} dayNo={1} />
        )}
      </AppPhone>
    </Dark>
  );
};

/**
 * Kurt Adam · "Rolün: Kurt": first person. You press and hold, you are the wolf; Ece and Can turn on you; you lie;
 * the vote falls one short; the wolves win. Voices: ElevenLabs (moderator + players).
 */
export const W3YouWolf: React.FC<W3Props> = (p) => {
  const b = youBeats(p.voices);
  const at = [6, b.talk[0]!, b.talk[1]!, b.talk[2]!, b.spared, b.win + 4];
  return (
    <AbsoluteFill style={{ backgroundColor: WW.deep }}>
      <Sequence durationInFrames={b.talk[0]!} name="Rol kartı">
        <RoleCard len={b.talk[0]!} />
      </Sequence>
      <Sequence from={b.talk[0]!} durationInFrames={b.vote - b.talk[0]!} name="Gündüz">
        <Day b={b} v={p.voices} />
      </Sequence>
      <Sequence from={b.vote} durationInFrames={b.win - b.vote} name="Oylama">
        <Vote b={b} v={p.voices} />
      </Sequence>
      <Sequence from={b.win} durationInFrames={b.cta - b.win} name="Kurtlar kazandı">
        <Dark>
          <Village dim={0.6} frames={b.cta - b.win} push={[1.0, 1.06]} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(7,5,26,0.9) 75%)' }} />
          <div style={{ position: 'absolute', left: WW.M, top: 250, width: WW.W }}>
            <Tale text={L[5]!.text} at={4} frames={f(p.voices[5]!.sec)} size={66} />
          </div>
          <AppPhone glow={WW.wolf}>
            <KurtResult
              players={TABLE}
              winner="wolves"
              reason="wolvesParity"
              roles={[
                { name: 'Sen', role: 'wolf' },
                { name: 'Kaan', role: 'wolf' },
                { name: 'Ece', role: 'seer' },
                { name: 'Can', role: 'villager' },
                { name: 'Zeynep', role: 'doctor', dead: true },
                { name: 'Mert', role: 'villager', dead: true },
              ]}
            />
          </AppPhone>
        </Dark>
      </Sequence>
      <Sequence from={b.cta} name="CTA">
        <WkCta line="Sen de yalan söyleyebilir misin?" sub="Kurt Adam, We Knows’ta. Arkadaşlarınla oyna." />
      </Sequence>

      <Music src={p.music} from={p.musicFrom} volume={0.9} duck={{ from: 0, to: b.cta - 6, level: 0.4 }} />
      {at.map((s, i) =>
        hasStaticFile(p.voices[i]!.src) ? (
          <Sequence key={i} from={s} durationInFrames={f(p.voices[i]!.sec) + 8} layout="none" name={`ses ${i}`}>
            <Audio src={staticFile(p.voices[i]!.src)} volume={1.1} />
          </Sequence>
        ) : null,
      )}
      <Sfx name="tick" at={22} frames={3} volume={1.4} />
      <Sfx name="heart" at={30} frames={18} volume={1.6} />
      <Sfx name="pop" at={b.talk[0]! + 20} frames={6} volume={1.2} />
      <Sfx name="pop" at={b.talk[1]! + 20} frames={6} volume={1.2} />
      {Array.from({ length: 7 }, (_, k) => (
        <Sfx key={k} name="tick" at={b.vote + 8 + k * 4} frames={3} volume={1.2} />
      ))}
      <Sfx name="heart" at={b.spared - 8} frames={18} volume={1.6} />
      <Sfx name="stamp" at={b.win} frames={10} volume={1.4} />
    </AbsoluteFill>
  );
};
