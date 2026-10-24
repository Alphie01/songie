import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../brand/ClipCard';
import { EASE } from '../brand/casebook/Editorial';
import { ColorStage } from '../brand/ColorStage';
import { CtaCard } from '../brand/CtaCard';
import { FONT_BODY, FONT_DISPLAY, SAFE, VIDEO } from '../brand/fonts';
import { SFX_VOLUME } from '../brand/mix';
import { Music } from '../brand/Music';
import { PhoneFrame } from '../brand/PhoneFrame';
import { RevealScreen } from '../brand/app/RevealScreen';
import { SongieHomeScreen } from '../brand/app/SongieHomeScreen';
import { SongPlayScreen } from '../brand/app/SongPlayScreen';
import { songieTheme } from '../themes/songie';

/**
 * Songie · "Olsun": the group is busy tonight — olsun. You open Songie, tap "Tek başına oyna", guess the song in
 * 0,5 s (the reel's own music, Pilli Bebek – Olsun), the streak climbs to ×7: no race, just you.
 */
export const r4Schema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  cover: z.string(),
  decoys: z.array(z.string()).max(3),
  music: z.string(),
  musicFrom: z.number().min(0).max(28),
  name: z.string().max(12),
});
export type R4Props = z.infer<typeof r4Schema>;

/** chat + "Olsun." 3,2 s → home, tap 3 s → solo play 3,7 s → reveal 2 s → streak 2,5 s → CTA 2,3 s ≈ 17 s */
export const R4 = { home: 96, play: 186, reveal: 296, streak: 356, cta: 432, total: 502 } as const;

export const R4_META = {
  id: 'songie-04-olsun',
  durationInFrames: R4.total,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    title: 'Olsun',
    artist: 'Pilli Bebek',
    album: 'Olsun',
    cover: 'assets/songs/80734172.jpg',
    decoys: ['Pilli Bebek – Olan Biten', 'Pilli Bebek – Bak'],
    music: 'assets/songs/80734172.mp3',
    musicFrom: 0,
    name: 'Ece',
  } as R4Props,
} as const;

const t = songieTheme;
const C = t.colors;
const PHONE_W = 640;
const PHONE_H = 1168;
const PHONE_X = (VIDEO.width - PHONE_W) / 2;
const PHONE_Y = 470;

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

const useIn = (at: number, frames = 14) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
};

/** Big left-aligned Baloo line that rises in; the one type move of this reel. */
const Big: React.FC<{ text: string; at: number; size?: number; color?: string; top: number }> = ({ text, at, size = 96, color = C.paper, top }) => {
  const k = useIn(at, 16);
  return (
    <div style={{ position: 'absolute', left: SAFE.side, top, width: VIDEO.width - 2 * SAFE.side, overflow: 'hidden' }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.95, letterSpacing: -size * 0.015, color, transform: `translateY(${(1 - k) * 105}%)` }}>{text}</div>
    </div>
  );
};

const Phone: React.FC<{ children: React.ReactNode; enterAt?: number }> = ({ children, enterAt = 0 }) => {
  const k = useIn(enterAt, 18);
  return (
    <div style={{ position: 'absolute', left: PHONE_X, top: PHONE_Y, transform: `translateY(${(1 - k) * 900}px)` }}>
      <PhoneFrame theme={t} width={PHONE_W} height={PHONE_H}>
        {children}
      </PhoneFrame>
    </div>
  );
};

/** The group says no, one by one. */
const CHAT = [
  { who: 'Mert', text: 'bu akşam olmaz ya 😕', at: 8 },
  { who: 'Zeynep', text: 'yarın erken kalkıcam', at: 22 },
  { who: 'Kaan', text: 'ben yokum', at: 36 },
];

const Chat: React.FC = () => (
  <ColorStage theme={t} color={C.bg} shapes={false}>
    <div style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 10 }}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 30, color: '#c9bef5' }}>Cuma ekibi</div>
    </div>
    <div style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 70, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {CHAT.map((m) => (
        <Bubble key={m.who} {...m} />
      ))}
    </div>
    <Big text="Olsun." at={54} size={300} color={C.yellow} top={880} />
    <Big text="Bu akşam kafamı dinliyorum." at={68} size={62} top={1200} />
  </ColorStage>
);

const Bubble: React.FC<{ who: string; text: string; at: number }> = ({ who, text, at }) => {
  const k = useIn(at, 10);
  return (
    <div style={{ opacity: k, transform: `translateY(${(1 - k) * 24}px)`, alignSelf: 'flex-start', padding: '16px 26px 18px', borderRadius: 30, borderBottomLeftRadius: 8, background: '#3a2a8c', border: '3px solid #0d0828' }}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 26, color: C.pink }}>{who}</div>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 40, color: C.paper }}>{text}</div>
    </div>
  );
};

const Home: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const press = interpolate(frame, [44, 50, 58, 64], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <ColorStage theme={t} color={C.lilac} shapes={false}>
      <Big text="Kendi kafana göre." at={2} size={92} color={C.ink} top={SAFE.top + 20} />
      <Phone enterAt={0}>
        <SongieHomeScreen name={name} press={press} />
      </Phone>
      {/* the thumb on "Tek başına oyna" (its centre ≈ y 474 of the 844-px home → phone screen) */}
      <div
        style={{
          position: 'absolute',
          left: PHONE_X + 300,
          top: PHONE_Y + 26 + Math.round((474 / 844) * (PHONE_H - 52)) - 50,
          width: 100,
          height: 100,
          borderRadius: 50,
          background: 'rgba(255,255,255,0.35)',
          border: `4px solid ${C.ink}`,
          opacity: frame >= 34 && frame < 70 ? 1 : 0,
          transform: `scale(${1.1 - press * 0.2})`,
        }}
      />
    </ColorStage>
  );
};

/** Solo game: the 0,5 s clip plays, you type, pick the song. No feed, one score card: you. */
const Play: React.FC<{ p: R4Props }> = ({ p }) => {
  const frame = useCurrentFrame();
  const typed = 'pilli bebek'.slice(0, Math.max(0, Math.floor((frame - 34) / 2)));
  const answer = `${p.artist} – ${p.title}`;
  const showSug = frame >= 50;
  return (
    <ColorStage theme={t} color={C.pink} shapes={false}>
      <Big text="Kimseyle yarışmadan." at={2} size={86} color={C.ink} top={SAFE.top + 20} />
      <Phone>
        <SongPlayScreen
          theme={t}
          stage={1}
          playing={frame >= 8 && frame < 24}
          fill={interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          press={frame >= 6 && frame < 12 ? 1 : 0}
          guess={typed}
          caret={frame >= 30 && frame < 90}
          suggestions={showSug ? [answer, ...p.decoys] : undefined}
          selected={frame >= 74 ? 0 : undefined}
          feed={[]}
          scores={[{ name: 'Sen', score: 5240, color: C.yellow, me: true }]}
          status="Tek başına oynuyorsun. Tur sınırı yok, serini büyüt."
          round="Şarkı 7 ×6"
          code="SOLO"
        />
      </Phone>
    </ColorStage>
  );
};

const Reveal: React.FC<{ p: R4Props }> = ({ p }) => (
  <ColorStage theme={t} color={C.mint} shapes={false}>
    <Big text="Sadece sen ve şarkı." at={2} size={86} color={C.ink} top={SAFE.top + 20} />
    <Phone>
      <RevealScreen theme={t} title={p.title} artist={p.artist} album={p.album} cover={hasStaticFile(p.cover) ? p.cover : ''} won results={[{ name: 'Sen', how: '0.5s’de', points: 880, color: C.yellow }]} enterAt={4} />
    </Phone>
  </ColorStage>
);

/** The streak climbs ×2 → ×7. */
const Streak: React.FC = () => {
  const frame = useCurrentFrame();
  const n = Math.min(7, 2 + Math.floor(frame / 7));
  const k = useIn(0, 12);
  return (
    <ColorStage theme={t} color={C.yellow} shapes={false}>
      <div style={{ position: 'absolute', left: SAFE.side, top: 560, opacity: k }}>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, color: C.ink }}>Seri</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 420, lineHeight: 0.85, letterSpacing: -12, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>×{n}</div>
      </div>
      <Big text="Rakibin sensin." at={40} size={96} color={C.ink} top={1130} />
    </ColorStage>
  );
};

export const R4Solo: React.FC<R4Props> = (p) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <Sequence durationInFrames={R4.home} name="Grup meşgul">
      <Chat />
    </Sequence>
    <Sequence from={R4.home} durationInFrames={R4.play - R4.home} name="Ana ekran">
      <Home name={p.name} />
    </Sequence>
    <Sequence from={R4.play} durationInFrames={R4.reveal - R4.play} name="Tek başına">
      <Play p={p} />
    </Sequence>
    <Sequence from={R4.reveal} durationInFrames={R4.streak - R4.reveal} name="Bildin">
      <Reveal p={p} />
    </Sequence>
    <Sequence from={R4.streak} durationInFrames={R4.cta - R4.streak} name="Seri">
      <Streak />
    </Sequence>
    <Sequence from={R4.cta} name="CTA">
      <ColorStage theme={t} color={C.lilac} shapes={false}>
        <CtaCard theme={t} cta="Tek başına da çalar." />
      </ColorStage>
    </Sequence>

    <Music src={p.music} from={p.musicFrom} />
    {[8, 22, 36].map((f) => (
      <Sfx key={f} name="pop" at={f} frames={6} volume={1.2} />
    ))}
    <Sfx name="whoosh" at={54} />
    <Sfx name="tick" at={R4.home + 50} frames={3} volume={1.4} />
    <Sfx name="ding" at={R4.reveal + 4} frames={18} />
    {Array.from({ length: 6 }, (_, k) => (
      <Sfx key={k} name="tick" at={R4.streak + k * 7} frames={3} volume={1.2} />
    ))}
  </AbsoluteFill>
);
