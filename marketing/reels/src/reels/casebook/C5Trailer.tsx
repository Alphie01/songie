import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { Black, Bug, ED, Fact, Rise, Rule, Scrim, Shot, useIn, Words } from '../../brand/casebook/Editorial';
import { FONT_SANS, FONT_SERIF, VIDEO } from '../../brand/fonts';
import { Music } from '../../brand/Music';

const FPS = VIDEO.fps;

const clip = z.object({ start: z.number().min(0), end: z.number().min(0) });
const shot = z.object({
  kind: z.enum(['photo', 'portrait', 'grid', 'title']),
  /** The narrator's sentence, as written in the case file. */
  text: z.string(),
  clip,
  image: z.string().optional(),
  pos: z.string().optional(),
  zoom: z.tuple([z.number(), z.number()]).optional(),
  /** `wide`: a landscape photo shown whole across the width (no crop), pushing in toward `origin`. */
  wide: z.boolean().optional(),
  origin: z.string().optional(),
  fact: z.string().optional(),
});
export const c5Schema = z.object({
  title: z.string(),
  place: z.string(),
  narration: z.string(),
  shots: z.array(shot).min(3).max(7),
  suspects: z.array(z.object({ name: z.string(), image: z.string() })).length(6),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
});
export type C5Props = z.infer<typeof c5Schema>;

/** Each shot holds its sentence plus a half-second breath; the title shot holds 1 s more; CTA 2,5 s. */
export function trailerBeats(shots: { kind: string; clip: { start: number; end: number } }[]) {
  let t = 0;
  const at = shots.map((s) => {
    const start = t;
    t += Math.round((s.clip.end - s.clip.start) * FPS) + (s.kind === 'title' ? 34 : 14);
    return start;
  });
  return { at, cta: t, total: t + 75 };
}

const B = 'cases/bodrum-zehir/img';
export const C5_META = {
  id: 'casebook-05-fragman',
  fps: FPS,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    title: 'Son Tadım',
    place: 'Gümüşlük, Bodrum. Eylül 2026',
    narration: 'cases/bodrum-zehir/audio/act-1.mp3',
    shots: [
      { kind: 'photo', image: `${B}/cover.webp`, text: 'Gece yarısını üç saat geçmişti.', clip: { start: 0, end: 2.45 }, pos: 'center 70%', zoom: [1.12, 1.04], fact: 'Gümüşlük, Bodrum' },
      { kind: 'photo', image: `${B}/scene-teras.webp`, text: 'Baş uçtaki sandalye yere devrilmişti.', clip: { start: 19.7, end: 22.1 }, wide: true, zoom: [1, 1.12], origin: '28% 82%' },
      { kind: 'portrait', image: `${B}/p-gulseren.webp`, text: 'Kanında dijoksin çıktı.', clip: { start: 58.52, end: 60.1 }, fact: 'Gülseren Tanyeli, 57. Yemek eleştirmeni.' },
      { kind: 'grid', text: 'Masada yedi kişi vardı.', clip: { start: 81.35, end: 83.05 } },
      { kind: 'title', text: 'Ve o gece herkes, bir an için, başka bir yere bakmıştı.', clip: { start: 87.88, end: 91.92 } },
    ],
    suspects: [
      { name: 'İpek Uçar', image: `${B}/p-ipek.webp` },
      { name: 'Doruk Ersoy', image: `${B}/p-doruk.webp` },
      { name: 'Selin Aksoy', image: `${B}/p-selin.webp` },
      { name: 'Levent Okay', image: `${B}/p-levent.webp` },
      { name: 'Tolga Erdem', image: `${B}/p-tolga.webp` },
      { name: 'Dr. Cemal Yavuz', image: `${B}/p-cemal.webp` },
    ],
    music: 'assets/songs/3919579631.mp3',
    musicFrom: 9.5,
  } as C5Props,
} as const;

type ShotT = C5Props['shots'][number];

/** Caption block above the Instagram UI: the narrator's sentence in the serif, rising word by word. */
const Caption: React.FC<{ s: ShotT; len: number; top?: number }> = ({ s, len, top = 1150 }) => (
  <div style={{ position: 'absolute', left: ED.M, top, width: ED.W }}>
    {s.fact && (
      <Rise at={4} style={{ marginBottom: 22 }}>
        <Fact>{s.fact}</Fact>
      </Rise>
    )}
    <Words text={s.text} at={2} frames={len} size={84} italic />
  </div>
);

const PhotoShot: React.FC<{ s: ShotT; len: number }> = ({ s, len }) => (
  <Black>
    {s.wide ? (
      <Shot src={s.image!} frames={len} from={s.zoom?.[0] ?? 1} to={s.zoom?.[1] ?? 1.08} origin={s.origin} style={{ top: 330, height: 720, bottom: 'auto' }} />
    ) : (
      <>
        <Shot src={s.image!} frames={len} pos={s.pos} from={s.zoom?.[0] ?? 1} to={s.zoom?.[1] ?? 1.05} origin={s.origin} bw={s.kind === 'portrait'} />
        <Scrim from={s.kind === 'portrait' ? 46 : 50} />
      </>
    )}
    <Caption s={s} len={len} />
    <Bug />
  </Black>
);

/** Contact sheet of the six faces at the table: tiles cut in one after another, then the sentence. */
const GridShot: React.FC<{ s: ShotT; len: number; suspects: C5Props['suspects'] }> = ({ s, len, suspects }) => {
  const frame = useCurrentFrame();
  const W = (ED.W - 12) / 3;
  const H = W * 1.3;
  return (
    <Black>
      <div style={{ position: 'absolute', left: ED.M, top: 330, width: ED.W, display: 'grid', gridTemplateColumns: `repeat(3, ${W}px)`, gap: 6 }}>
        {suspects.map((p, i) => (
          <div key={i} style={{ width: W, height: H, position: 'relative', background: '#111', opacity: frame >= i * 3 ? 1 : 0 }}>
            {hasStaticFile(p.image) && (
              <Img src={staticFile(p.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%', filter: 'grayscale(1) contrast(1.15) brightness(0.85)' }} />
            )}
            <Fact size={24} color={ED.bone} weight={600} style={{ position: 'absolute', left: 12, bottom: 10, textShadow: '0 1px 8px #000' }}>
              {p.name}
            </Fact>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: ED.M, top: 1250, width: ED.W }}>
        <Words text={s.text} at={8} frames={len} size={84} italic />
      </div>
      <Bug />
    </Black>
  );
};

/** The narrator's last line, then the case title set big in the serif with place and date. */
const TitleShot: React.FC<{ s: ShotT; len: number; title: string; place: string }> = ({ s, len, title, place }) => {
  const t = useIn(Math.round(len * 0.55), 22);
  return (
    <Black>
      <div style={{ position: 'absolute', left: ED.M, top: 330, width: ED.W }}>
        <Words text={s.text} at={2} frames={len - 34} size={64} italic color={ED.dim} />
      </div>
      <div style={{ position: 'absolute', left: ED.M, top: 860, width: ED.W, overflow: 'hidden' }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 230, lineHeight: 0.95, letterSpacing: -6, color: ED.bone, transform: `translateY(${(1 - t) * 100}%)` }}>{title}</div>
      </div>
      <div style={{ position: 'absolute', left: ED.M, top: 1120 }}>
        <Rule at={Math.round(len * 0.55) + 8} width={180} color={ED.uv} thick={6} />
        <Rise at={Math.round(len * 0.55) + 12} style={{ marginTop: 22 }}>
          <Fact size={36} color={ED.bone}>
            {place}
          </Fact>
        </Rise>
      </div>
    </Black>
  );
};

/** Closing frame on the grid: "Dosya açık." in the serif, the invite in sans, the app mark small. */
export const EditorialCta: React.FC<{ line?: string; sub?: string }> = ({ line = 'Dosya açık.', sub = 'Ekibini topla, birlikte çöz.' }) => (
  <Black>
    <div style={{ position: 'absolute', left: ED.M, top: 640, width: ED.W }}>
      <Rise at={2}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 168, lineHeight: 0.95, letterSpacing: -4, color: ED.bone }}>{line}</div>
      </Rise>
      <Rise at={10} style={{ marginTop: 26 }}>
        <Fact size={46} color={ED.bone} weight={500}>
          {sub}
        </Fact>
      </Rise>
    </div>
    <div style={{ position: 'absolute', left: ED.M, top: 1210, display: 'flex', alignItems: 'center', gap: 26 }}>
      <Rise at={18}>
        <Img src={staticFile('casebook/icon/icon.png')} style={{ width: 128, height: 128, borderRadius: 30, display: 'block' }} />
      </Rise>
      <div>
        <Rise at={20}>
          <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 64, letterSpacing: -1.5, color: ED.bone }}>Casebook</div>
        </Rise>
        <Rise at={24}>
          <Fact size={30}>App Store ve Google Play’de ücretsiz</Fact>
        </Rise>
      </div>
    </div>
  </Black>
);

/**
 * Case trailer: the game's own narrator reads five sentences of the first act; each sentence is one hard cut
 * (case cover, the scene, the victim, the six faces, the title). Built from a real case, shows no solution.
 */
export const C5Trailer: React.FC<C5Props> = (p) => {
  const b = trailerBeats(p.shots);
  return (
    <AbsoluteFill style={{ backgroundColor: ED.black }}>
      {p.shots.map((s, i) => {
        const len = (b.at[i + 1] ?? b.cta) - b.at[i]!;
        return (
          <Sequence key={i} from={b.at[i]} durationInFrames={len} name={`${i + 1} ${s.kind}`}>
            {s.kind === 'grid' ? (
              <GridShot s={s} len={len} suspects={p.suspects} />
            ) : s.kind === 'title' ? (
              <TitleShot s={s} len={len} title={p.title} place={p.place} />
            ) : (
              <PhotoShot s={s} len={len} />
            )}
            {hasStaticFile(p.narration) && (
              <Audio src={staticFile(p.narration)} trimBefore={Math.round(s.clip.start * FPS)} trimAfter={Math.round(s.clip.end * FPS)} volume={1.15} />
            )}
          </Sequence>
        );
      })}
      <Sequence from={b.cta} name="CTA">
        <EditorialCta />
      </Sequence>
      <Music src={p.music} from={p.musicFrom} volume={0.9} duck={{ from: 0, to: b.cta - 10, level: 0.32 }} />
    </AbsoluteFill>
  );
};
