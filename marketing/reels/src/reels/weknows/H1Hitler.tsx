import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { EASE } from '../../brand/casebook/Editorial';
import { FONT_DRAMA, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { Drama, Hall, SH, ShUi } from '../../brand/weknows/Hall';
import { AppPhone } from '../../brand/weknows/Night';
import { type ShPlayer, SH_PLAYERS, ShChancellorEnact, ShEnacted, ShPresidentDraw, ShResult, ShVote, ShVoteResult } from '../../brand/weknows/hitler/ShScreens';
import { SH_LIAR, SH_POV, SH_VOTE } from './hitlerAds';

const FPS = VIDEO.fps;
const f = (s: number) => Math.round(s * FPS);
const clip = z.object({ src: z.string(), sec: z.number().min(0.3).max(6) });
const schemaOf = (n: number) => z.object({ voices: z.array(clip).length(n), music: z.string(), musicFrom: z.number().min(0).max(25) });
export const h1Schema = schemaOf(5);
export const h2Schema = schemaOf(4);
export const h3Schema = schemaOf(4);
type Props = z.infer<typeof h1Schema>;
type Clip = Props['voices'][number];

const vo = (id: string, sec: number) => ({ src: `assets/voices/${id}.el.mp3`, sec });
const LOOK = 'web' as const;

/** A shot = one moderator/player line (voice index) plus a breath, or a silent hold. */
type Shot = { voice?: number; hold: number; render: (len: number) => React.ReactNode };
export function shotBeats(shots: { voice?: number; hold: number }[], v: { sec: number }[]) {
  let t = 0;
  const at = shots.map((s) => {
    const a = t;
    t += (s.voice !== undefined ? f(v[s.voice]!.sec) + 6 : 0) + s.hold;
    return a;
  });
  return { at, cta: t, total: t + 66 };
}

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

/** Shot frame: the hall behind, the line above, the real game screen in the phone. */
const PhoneShot: React.FC<{ line?: string; who?: string; len: number; glow?: string; lineColor?: string; children: React.ReactNode }> = ({ line, who, len, glow = SH.liberal, lineColor = SH.bone, children }) => (
  <AbsoluteFill>
    <Hall dim={0.32} frames={len} />
    {line && (
      <div style={{ position: 'absolute', left: SH.M, top: 228, width: SH.W }}>
        {who && (
          <ShUi size={30} color={lineColor}>
            {who}
          </ShUi>
        )}
        <Drama text={line} at={4} frames={Math.min(40, len)} size={60} color={lineColor} />
      </div>
    )}
    <AppPhone glow={glow}>{children}</AppPhone>
  </AbsoluteFill>
);

/** Closing frame in the hall: the question in Playfair, the app mark. */
const ShCta: React.FC<{ line: string; sub: string }> = ({ line, sub }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [2, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const b = interpolate(frame, [14, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return (
    <AbsoluteFill>
      <Hall dim={0.4} frames={70} push={[1.12, 1.16]} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,6,26,0.2), rgba(8,6,26,0.9) 70%)' }} />
      <div style={{ position: 'absolute', left: SH.M, top: 600, width: SH.W, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        <div style={{ fontFamily: FONT_DRAMA, fontStyle: 'italic', fontWeight: 500, fontSize: 150, lineHeight: 0.98, letterSpacing: -2, color: SH.bone }}>{line}</div>
        <ShUi size={44} weight={500} style={{ marginTop: 24 }}>
          {sub}
        </ShUi>
      </div>
      <div style={{ position: 'absolute', left: SH.M, top: 1230, display: 'flex', alignItems: 'center', gap: 26, opacity: b }}>
        {hasStaticFile('weknows/icon/icon.png') && <Img src={staticFile('weknows/icon/icon.png')} style={{ width: 128, height: 128, borderRadius: 30 }} />}
        <div>
          <ShUi size={64} weight={700}>
            We Knows
          </ShUi>
          <ShUi size={30} weight={500} color={SH.dim}>
            App Store ve Google Play’de ücretsiz
          </ShUi>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Runs the shots, their voices and the music; `extra` adds per-reel sound effects. */
const Reel: React.FC<{ p: Props; shots: Shot[]; cta: { line: string; sub: string }; extra?: (b: ReturnType<typeof shotBeats>) => React.ReactNode }> = ({ p, shots, cta, extra }) => {
  const b = shotBeats(shots, p.voices);
  return (
    <AbsoluteFill style={{ backgroundColor: SH.deep }}>
      {shots.map((s, i) => {
        const len = (b.at[i + 1] ?? b.cta) - b.at[i]!;
        const v: Clip | undefined = s.voice !== undefined ? p.voices[s.voice] : undefined;
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
        <ShCta {...cta} />
      </Sequence>
      <Music src={p.music} from={p.musicFrom} volume={0.9} duck={{ from: 0, to: b.cta - 6, level: 0.38 }} />
      {extra?.(b)}
    </AbsoluteFill>
  );
};

/** A countdown hairline under the question. */
const Think: React.FC<{ len: number; text: string }> = ({ len, text }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [10, len], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: SH.M, top: 1560, width: SH.W }}>
      <ShUi size={28} weight={500} color={SH.dim}>
        {text}
      </ShUi>
      <div style={{ marginTop: 10, height: 3, background: 'rgba(241,236,226,0.2)' }}>
        <div style={{ width: `${t * 100}%`, height: '100%', background: t < 0.35 ? SH.red : SH.bone }} />
      </div>
    </div>
  );
};

const step = (frame: number, n: number, every: number, from = 0) => Math.max(0, Math.min(n, Math.floor((frame - from) / every)));

// ---------------------------------------------------------------- H1 "Ja! mı, Nein mi?"

const VOTERS = ['Ece', 'Deniz', 'Kaan', 'Zeynep', 'Sude', 'Mert'];
const H1_VOTES = [
  { name: 'Ece', ja: true },
  { name: 'Mert', ja: true },
  { name: 'Deniz', ja: false },
  { name: 'Kaan', ja: true },
  { name: 'Zeynep', ja: true },
  { name: 'Sude', ja: false },
];

export const H1_META = {
  id: 'weknows-hitler-01-ja-nein',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: { voices: [vo('sh-v1', 1.53), vo('sh-v2', 3.07), vo('sh-v3', 2.58), vo('sh-v4', 0.98), vo('sh-v5', 2.35)], music: 'assets/songs/3919554391.mp3', musicFrom: 0 } as Props,
} as const;

const H1_SHOTS: Shot[] = [
  { voice: 0, hold: 14, render: (len) => <PhoneShot line={SH_VOTE[0]!.text} len={len} glow={SH.fascist}><ShEnacted look={LOOK} liberal={2} fascist={3} tracker={0} policy="fascist" power={null} president="Kaan" chancellor="Zeynep" /></PhoneShot> },
  { voice: 1, hold: 10, render: (len) => <PhoneShot line={SH_VOTE[1]!.text} len={len}><ShVote look={LOOK} liberal={2} fascist={3} tracker={0} president="Ece" nominee="Mert" mine={null} voted={0} total={6} /></PhoneShot> },
  {
    voice: 2,
    hold: 64,
    render: (len) => <H1Decide len={len} />,
  },
  { voice: 3, hold: 30, render: (len) => <PhoneShot line={SH_VOTE[3]!.text} len={len}><ShVoteResult look={LOOK} liberal={2} fascist={3} tracker={0} president="Ece" nominee="Mert" votes={H1_VOTES} passed /></PhoneShot> },
  {
    voice: 4,
    hold: 26,
    render: (len) => (
      <PhoneShot line={SH_VOTE[4]!.text} len={len} glow={SH.red} lineColor={SH.bone}>
        <ShResult winner="fascist" reason="hitlerChancellor" liberal={2} fascist={3} roles={[{ name: 'Mert', role: 'hitler' }, { name: 'Kaan', role: 'fascist' }, { name: 'Ece', role: 'liberal' }, { name: 'Deniz', role: 'liberal' }, { name: 'Zeynep', role: 'fascist' }, { name: 'Sude', role: 'liberal' }, { name: 'Bora', role: 'liberal' }]} />
      </PhoneShot>
    ),
  },
];

/** The warning, then the viewer's turn: votes trickle in, your thumb hovers between Ja! and Nein. */
const H1Decide: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const ask = len - 64;
  const voted = step(frame, 4, 9, 6);
  return (
    <AbsoluteFill>
      <PhoneShot line={frame < ask ? SH_VOTE[2]!.text : 'Sen olsan: Ja! mı, Nein mi?'} len={len} glow={frame < ask ? SH.red : SH.liberal}>
        <ShVote look={LOOK} liberal={2} fascist={3} tracker={0} president="Ece" nominee="Mert" mine={null} voted={voted} total={6} votedBy={VOTERS.slice(0, voted)} />
      </PhoneShot>
      {frame >= ask && <Think len={len - ask} text="Durdur, karar ver, oyunu yorumlara yaz." />}
    </AbsoluteFill>
  );
};

export const H1Vote: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={H1_SHOTS}
    cta={{ line: 'Kime güveneceksin?', sub: 'Secret Hitler, We Knows’ta. Arkadaşlarınla oyna.' }}
    extra={(b) => (
      <>
        <Sfx name="stamp" at={b.at[0]! + 4} frames={10} volume={1.4} />
        <Sfx name="heart" at={b.at[2]! + 4} frames={18} volume={1.5} />
        {[0, 30].map((d) => (
          <Sfx key={d} name="clock" at={b.at[3]! - 50 + d} frames={3} volume={1.2} />
        ))}
        <Sfx name="whoosh" at={b.at[3]!} />
        <Sfx name="stamp" at={b.at[4]!} frames={10} volume={1.8} />
      </>
    )}
  />
);

// ---------------------------------------------------------------- H2 "Kim yalan söylüyor?"

export const H2_META = {
  id: 'weknows-hitler-02-kim-yalan',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: { voices: [vo('sh-l1', 2.28), vo('sh-l2', 2.45), vo('sh-l3', 2.66), vo('sh-l4', 1.87)], music: 'assets/songs/3919655981.mp3', musicFrom: 0 } as Props,
} as const;

const HAND = SH_LIAR.hand;
const PASSED = HAND.filter((_, i) => i !== SH_LIAR.discarded);

/** The president's real hand (only the viewer sees it): Ece throws away the liberal. */
const H2Draw: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const thrown = frame >= Math.round(len * 0.55);
  return (
    <PhoneShot line={SH_LIAR.lines[0]!.text} len={len} glow={SH.fascist}>
      <ShPresidentDraw look={LOOK} liberal={2} fascist={3} tracker={0} president="Ece" chancellor="Mert" cards={HAND} discarded={thrown ? SH_LIAR.discarded : null} />
    </PhoneShot>
  );
};

const H2Enact: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  return (
    <PhoneShot line="Şansölyeye iki kart gitti." len={len} glow={SH.fascist}>
      <ShChancellorEnact look={LOOK} liberal={2} fascist={3} tracker={0} president="Ece" chancellor="Mert" cards={PASSED} enacted={frame >= Math.round(len * 0.5) ? 0 : null} />
    </PhoneShot>
  );
};

const H2Reveal: React.FC<{ len: number }> = ({ len }) => (
  <AbsoluteFill>
    <Hall dim={0.3} frames={len} push={[1.12, 1.18]} />
    <AbsoluteFill style={{ background: 'rgba(8,6,26,0.55)' }} />
    <div style={{ position: 'absolute', left: SH.M, top: 520, width: SH.W }}>
      <ShUi size={32} color={SH.red}>
        Ece faşist.
      </ShUi>
      <Drama text="Liberal kartı kendisi attı. Yalan söyleyen başkan." at={4} frames={30} size={92} />
    </div>
    <div style={{ position: 'absolute', left: SH.M, top: 1060, display: 'flex', gap: 22 }}>
      {HAND.map((c, i) => (
        <div
          key={i}
          style={{
            width: 190,
            height: 260,
            borderRadius: 22,
            border: '4px solid #000',
            background: c === 'liberal' ? SH.liberal : SH.fascist,
            opacity: i === SH_LIAR.discarded ? 1 : 0.35,
            transform: `rotate(${(i - 1) * 5}deg)`,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 18,
            boxSizing: 'border-box',
            outline: i === SH_LIAR.discarded ? `5px solid ${SH.bone}` : 'none',
            outlineOffset: 6,
          }}
        >
          <ShUi size={30} weight={800} color="#120c2e">
            {c === 'liberal' ? 'Liberal' : 'Faşist'}
          </ShUi>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const H2_SHOTS: Shot[] = [
  { voice: 0, hold: 24, render: (len) => <H2Draw len={len} /> },
  { hold: 40, render: (len) => <H2Enact len={len} /> },
  { voice: 1, hold: 8, render: (len) => <PhoneShot who="Ece, başkan" line={`“${SH_LIAR.lines[1]!.text}”`} len={len} glow={SH.liberal}><ShEnacted look={LOOK} liberal={2} fascist={4} tracker={0} policy="fascist" power={null} president="Ece" chancellor="Mert" /></PhoneShot> },
  { voice: 2, hold: 8, render: (len) => <PhoneShot who="Mert, şansölye" line={`“${SH_LIAR.lines[2]!.text}”`} len={len} glow={SH.red}><ShEnacted look={LOOK} liberal={2} fascist={4} tracker={0} policy="fascist" power={null} president="Ece" chancellor="Mert" /></PhoneShot> },
  {
    voice: 3,
    hold: 60,
    render: (len) => (
      <AbsoluteFill>
        <Hall dim={0.35} frames={len} push={[1.08, 1.14]} />
        <AbsoluteFill style={{ background: 'rgba(8,6,26,0.5)' }} />
        <div style={{ position: 'absolute', left: SH.M, top: 640, width: SH.W }}>
          <Drama text={SH_LIAR.lines[3]!.text} at={4} frames={30} size={120} />
        </div>
        <Think len={len} text="Kartları gördün. Durdur, cevabını yorumlara yaz." />
      </AbsoluteFill>
    ),
  },
  { hold: 64, render: (len) => <H2Reveal len={len} /> },
];

export const H2Liar: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={H2_SHOTS}
    cta={{ line: 'Masada kime güvenirsin?', sub: 'Secret Hitler, We Knows’ta. Arkadaşlarınla oyna.' }}
    extra={(b) => (
      <>
        <Sfx name="whoosh" at={b.at[0]! + 6} />
        <Sfx name="tick" at={b.at[0]! + 50} frames={3} volume={1.4} />
        <Sfx name="tick" at={b.at[1]! + 25} frames={3} volume={1.4} />
        <Sfx name="heart" at={b.at[4]!} frames={18} volume={1.5} />
        <Sfx name="stamp" at={b.at[5]!} frames={10} volume={1.8} />
      </>
    )}
  />
);

// ---------------------------------------------------------------- H3 "Rolün: Hitler"

const ME = 'Sen';
const TABLE: ShPlayer[] = [
  { name: 'Ece', color: '#FF7AC6' },
  { name: 'Mert', color: '#3EE0A8' },
  { name: 'Deniz', color: '#5AB8FF' },
  { name: 'Kaan', color: '#B794FF' },
  { name: 'Bora', color: '#FF8A5B', dead: true },
  { name: 'Zeynep', color: '#FFD23F' },
  { name: ME, color: '#FFFFFF' },
];
const H3_VOTES = [
  { name: 'Ece', ja: true },
  { name: 'Mert', ja: true },
  { name: 'Deniz', ja: false },
  { name: 'Kaan', ja: true },
  { name: 'Zeynep', ja: true },
  { name: ME, ja: true },
];

export const H3_META = {
  id: 'weknows-hitler-03-rolun-hitler',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: { voices: [vo('sh-p1', 2.03), vo('sh-p2', 1.98), vo('sh-p3', 2.13), vo('sh-p4', 2.9)], music: 'assets/songs/3919490171.mp3', musicFrom: 0 } as Props,
} as const;

/** First person: a thumb holds the role card on the real vote screen; it opens as Hitler. */
const H3Card: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const open = frame >= 26;
  const press = interpolate(frame, [18, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <PhoneShot line={SH_POV[0]!.text} len={len} glow={open ? SH.red : SH.liberal}>
        <ShVote look={LOOK} players={TABLE} liberal={1} fascist={3} tracker={0} president="Deniz" nominee="Kaan" mine={null} voted={2} total={6} cardOpen={open} role="hitler" me={ME} />
      </PhoneShot>
      <div style={{ position: 'absolute', left: 480, top: 1400, width: 120, height: 120, borderRadius: 60, background: 'rgba(241,236,226,0.18)', border: `3px solid ${SH.bone}`, opacity: frame >= 10 ? 0.8 : 0, transform: `scale(${1.15 - press * 0.2})` }} />
    </AbsoluteFill>
  );
};

const H3Elect: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const voted = step(frame, 6, 7, 14);
  const done = frame >= len - 22;
  return (
    <PhoneShot line={SH_POV[2]!.text} len={len} glow={done ? SH.red : SH.liberal}>
      {done ? (
        <ShVoteResult look={LOOK} players={TABLE} liberal={1} fascist={3} tracker={0} president="Ece" nominee={ME} votes={H3_VOTES} passed me={ME} role="hitler" />
      ) : (
        <ShVote look={LOOK} players={TABLE} liberal={1} fascist={3} tracker={0} president="Ece" nominee={ME} mine="ja" voted={voted} total={6} votedBy={H3_VOTES.slice(0, voted).map((v) => v.name)} me={ME} role="hitler" />
      )}
    </PhoneShot>
  );
};

const H3_SHOTS: Shot[] = [
  { voice: 0, hold: 22, render: (len) => <H3Card len={len} /> },
  {
    voice: 1,
    hold: 14,
    render: (len) => (
      <PhoneShot who="Zeynep" line={`“${SH_POV[1]!.text}”`} len={len} glow={SH.liberal}>
        <ShVote look={LOOK} players={TABLE} liberal={1} fascist={3} tracker={0} president="Deniz" nominee="Kaan" mine="nein" voted={6} total={6} me={ME} role="hitler" />
      </PhoneShot>
    ),
  },
  { voice: 2, hold: 52, render: (len) => <H3Elect len={len} /> },
  {
    voice: 3,
    hold: 24,
    render: (len) => (
      <PhoneShot line={SH_POV[3]!.text} len={len} glow={SH.red}>
        <ShResult players={TABLE} winner="fascist" reason="hitlerChancellor" liberal={1} fascist={3} roles={[{ name: ME, role: 'hitler' }, { name: 'Kaan', role: 'fascist' }, { name: 'Ece', role: 'fascist' }, { name: 'Mert', role: 'liberal' }, { name: 'Deniz', role: 'liberal' }, { name: 'Zeynep', role: 'liberal' }, { name: 'Bora', role: 'liberal' }]} />
      </PhoneShot>
    ),
  },
];

export const H3You: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={H3_SHOTS}
    cta={{ line: 'Yüzün hiç kızarmaz mı?', sub: 'Secret Hitler, We Knows’ta. Arkadaşlarınla oyna.' }}
    extra={(b) => (
      <>
        <Sfx name="tick" at={18} frames={3} volume={1.4} />
        <Sfx name="heart" at={26} frames={18} volume={1.6} />
        {Array.from({ length: 6 }, (_, k) => (
          <Sfx key={k} name="tick" at={b.at[2]! + 14 + k * 7} frames={3} volume={1.2} />
        ))}
        <Sfx name="stamp" at={b.at[3]!} frames={10} volume={1.8} />
      </>
    )}
  />
);

export const H_SHOTS = { h1: H1_SHOTS, h2: H2_SHOTS, h3: H3_SHOTS } as const;
