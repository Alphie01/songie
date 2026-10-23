import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { Black, Bug, EASE, ED, Fact, Rise, useIn, Words } from '../../brand/casebook/Editorial';
import { FONT_SANS, FONT_SERIF, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { EditorialCta } from './C5Trailer';

const row = z.object({ name: z.string(), car: z.string(), portrait: z.string(), quote: z.string().max(48), from: z.number(), to: z.number(), liar: z.boolean().optional() });
export const c6Schema = z.object({
  /** The moment the case turns on, minutes after `start` (e.g. 74 → 22:14 when start is 21:00). */
  at: z.number().min(0).max(120),
  start: z.number().int().min(0).max(23),
  premise: z.string().max(60),
  rows: z.array(row).length(3),
  evidence: z.object({ image: z.string(), text: z.string().max(80) }),
  reveal: z.string().max(80),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
});
export type C6Props = z.infer<typeof c6Schema>;

/** hook 1,6 s → premise + axis → three statements (1,7 s each) → camera → "Kim?" 3 s → the bar breaks → CTA. */
export const TL = { premise: 48, rows: [104, 156, 208] as const, evidence: 262, line: 286, ask: 330, reveal: 420, cta: 492, total: 567 } as const;

export const C6_META = {
  id: 'casebook-06-saat',
  durationInFrames: TL.total,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    at: 74,
    start: 21,
    premise: 'Kuyumcu, dükkânında ölü bulundu.',
    rows: [
      { name: 'Can', car: 'aracı yok', portrait: 'cases/eskisehir-laboratuvar/img/p-can.webp', quote: 'Bütün akşam evdeydim.', from: 0, to: 120 },
      { name: 'Sevgi', car: 'kırmızı hatchback', portrait: 'cases/uludag-firtina/img/p-sevgi.webp', quote: 'Onda kadar spor salonundaydım.', from: 0, to: 60 },
      { name: 'Burak', car: 'beyaz minibüs', portrait: 'cases/eskisehir-laboratuvar/img/p-burak.webp', quote: 'Dokuz buçuktan beri Ankara yolundaydım.', from: 30, to: 120, liar: true },
    ],
    evidence: { image: 'cases/pera-gecesi/img/cam-street.webp', text: 'Dükkânın karşısındaki kamera. Kuyumcunun önünde beyaz bir minibüs.' },
    reveal: 'Saat 22:14’te Burak’ın minibüsü dükkânın önündeydi.',
    music: 'assets/songs/3919579631.mp3',
    musicFrom: 9.5,
  } as C6Props,
} as const;

const AX = { y: 690, x0: ED.M, w: ED.W, span: 120 } as const;
const xOf = (min: number) => AX.x0 + (min / AX.span) * AX.w;
const ROW_Y = (i: number) => 760 + i * 196;
const clock = (start: number, min: number) => `${String(start + Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

/** Hook: a clock rolls from the start hour to the moment, then the line. */
const Hook: React.FC<{ p: C6Props }> = ({ p }) => {
  const frame = useCurrentFrame();
  const m = interpolate(frame, [0, 26], [0, p.at], { extrapolateRight: 'clamp', easing: EASE });
  return (
    <Black>
      <div style={{ position: 'absolute', left: ED.M - 10, top: 560, fontFamily: FONT_SERIF, fontSize: 330, lineHeight: 0.9, letterSpacing: -10, color: ED.bone, fontVariantNumeric: 'tabular-nums' }}>
        {clock(p.start, m)}
      </div>
      <div style={{ position: 'absolute', left: ED.M, top: 900, width: ED.W }}>
        <Words text="Bu saatte biri yalan söylüyor." at={14} frames={26} size={76} italic />
      </div>
      <Bug />
    </Black>
  );
};

/** One statement row: square portrait, name, quote in the serif, and the claimed interval as a bar on the axis. */
const Row: React.FC<{ p: C6Props; i: number; enter: number; dim: number; broken: number }> = ({ p, i, enter, dim, broken }) => {
  const frame = useCurrentFrame();
  const r = p.rows[i]!;
  const t = useIn(enter, 14);
  const bar = interpolate(frame, [enter + 18, enter + 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  if (frame < enter) return null;
  const y = ROW_Y(i);
  const x1 = xOf(r.from);
  const x2 = x1 + (xOf(r.to) - x1) * bar;
  const cut = xOf(p.at);
  const isBroken = r.liar && broken > 0;
  return (
    <div style={{ opacity: 1 - dim * 0.7 }}>
      <div style={{ position: 'absolute', left: ED.M, top: y, width: 112, height: 112, overflow: 'hidden', opacity: t }}>
        {hasStaticFile(r.portrait) && (
          <Img src={staticFile(r.portrait)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', filter: 'grayscale(1) contrast(1.15)' }} />
        )}
      </div>
      <div style={{ position: 'absolute', left: ED.M + 136, top: y - 4, width: ED.W - 136 }}>
        <Rise at={enter + 2}>
          <Fact size={30} weight={600} color={isBroken ? ED.uv : ED.bone}>
            {r.name}
            <span style={{ fontWeight: 500, color: ED.dim }}>, {r.car}</span>
          </Fact>
        </Rise>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Words text={`“${r.quote}”`} at={enter + 6} frames={22} size={44} italic />
          {isBroken && <div style={{ position: 'absolute', left: 0, top: '52%', height: 3, width: `${broken * 100}%`, background: ED.uv }} />}
        </div>
      </div>
      {/* claimed interval */}
      {isBroken ? (
        <>
          <div style={{ position: 'absolute', left: x1, top: y + 146, width: cut - x1 - 6, height: 12, border: `2px solid ${ED.uv}`, boxSizing: 'border-box' }} />
          <div
            style={{
              position: 'absolute',
              left: cut + 6 + broken * 60,
              top: y + 146 + broken * 30,
              width: Math.max(0, xOf(r.to) - cut - 6),
              height: 12,
              border: `2px solid ${ED.uv}`,
              boxSizing: 'border-box',
              opacity: 1 - broken * 0.8,
              transform: `rotate(${broken * 6}deg)`,
              transformOrigin: 'left center',
            }}
          />
        </>
      ) : (
        <div style={{ position: 'absolute', left: x1, top: y + 146, width: x2 - x1, height: 12, background: ED.bone }} />
      )}
    </div>
  );
};

const Board: React.FC<{ p: C6Props }> = ({ p }) => {
  const frame = useCurrentFrame() + TL.premise; // absolute frame
  const axis = interpolate(frame, [TL.premise + 8, TL.premise + 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const ev = interpolate(frame, [TL.evidence, TL.evidence + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const line = interpolate(frame, [TL.line, TL.line + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const broken = interpolate(frame, [TL.reveal, TL.reveal + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  const ask = interpolate(frame, [TL.ask, TL.reveal], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cut = xOf(p.at);
  const local = (f: number) => f - TL.premise;
  return (
    <Black>
      <Bug />
      {/* top: premise, then the camera still takes its place */}
      {frame < TL.evidence + 4 ? (
        <div style={{ position: 'absolute', left: ED.M, top: 360, width: ED.W, opacity: 1 - ev }}>
          <Words text={p.premise} at={2} frames={30} size={72} italic />
        </div>
      ) : null}
      {frame >= TL.evidence && (
        <div style={{ position: 'absolute', left: 0, top: 300, width: 1080 }}>
          <div style={{ position: 'relative', height: 300, overflow: 'hidden', clipPath: `inset(0 ${(1 - ev) * 100}% 0 0)` }}>
            {hasStaticFile(p.evidence.image) && (
              <Img src={staticFile(p.evidence.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 55%', filter: 'grayscale(0.6) contrast(1.15) brightness(0.9)' }} />
            )}
            <div style={{ position: 'absolute', right: ED.M, top: 20, fontFamily: FONT_SANS, fontWeight: 600, fontSize: 28, color: ED.bone, fontVariantNumeric: 'tabular-nums' }}>
              {clock(p.start, p.at)}
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))' }} />
            <div style={{ position: 'absolute', left: ED.M, right: ED.M, bottom: 16 }}>
              <Rise at={local(TL.evidence + 10)}>
                <Fact size={28} color={ED.bone}>
                  {p.evidence.text}
                </Fact>
              </Rise>
            </div>
          </div>
        </div>
      )}
      {/* axis */}
      <div style={{ position: 'absolute', left: AX.x0, top: AX.y, width: AX.w * axis, height: 2, background: ED.rule }} />
      {[0, 30, 60, 90, 120].map((m) => (
        <div key={m} style={{ position: 'absolute', left: xOf(m) - (m === 120 ? 74 : m === 0 ? 0 : 37), top: AX.y - 44, opacity: axis, fontFamily: FONT_SANS, fontWeight: 500, fontSize: 26, color: ED.dim, fontVariantNumeric: 'tabular-nums' }}>
          {clock(p.start, m)}
        </div>
      ))}
      {p.rows.map((_, i) => (
        <Row key={i} p={p} i={i} enter={local(TL.rows[i]!)} dim={p.rows[i]!.liar ? 0 : broken} broken={broken} />
      ))}
      {/* the camera moment cuts through every row */}
      {frame >= TL.line && (
        <>
          <div style={{ position: 'absolute', left: cut - 1, top: AX.y - 6, width: 2, height: (ROW_Y(2) + 170 - AX.y) * line, background: ED.uv, opacity: 0.35 }} />
          {p.rows.map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: cut - 3, top: ROW_Y(i) + 128, width: 6, height: 48, background: ED.uv, boxShadow: `0 0 18px ${ED.uv}`, opacity: line }} />
          ))}
          <div style={{ position: 'absolute', left: cut - 54, top: AX.y - 52, padding: '4px 12px', background: ED.uv, color: ED.black, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 28, fontVariantNumeric: 'tabular-nums', opacity: line }}>
            {clock(p.start, p.at)}
          </div>
        </>
      )}
      {/* question, then the answer, under the rows */}
      <div style={{ position: 'absolute', left: ED.M, top: 1380, width: ED.W }}>
        {frame >= TL.ask && frame < TL.reveal && (
          <>
            <Words text="Kim yalan söylüyor?" at={local(TL.ask)} frames={16} size={84} />
            <div style={{ marginTop: 18, width: ED.W, height: 3, background: ED.rule }}>
              <div style={{ width: `${(1 - ask) * 100}%`, height: '100%', background: ED.bone }} />
            </div>
            <Fact style={{ marginTop: 14 }}>Durdur, düşün, cevabını yaz.</Fact>
          </>
        )}
        {frame >= TL.reveal && <Words text={p.reveal} at={local(TL.reveal) + 6} frames={30} size={58} italic />}
      </div>
    </Black>
  );
};

/** "Saat 22:14": three alibis drawn as bars on one evening; a camera time cuts through them and one breaks. */
export const C6Timeline: React.FC<C6Props> = (p) => (
  <AbsoluteFill style={{ backgroundColor: ED.black }}>
    <Sequence durationInFrames={TL.premise} name="Hook">
      <Hook p={p} />
    </Sequence>
    <Sequence from={TL.premise} durationInFrames={TL.cta - TL.premise} name="Zaman çizelgesi">
      <Board p={p} />
    </Sequence>
    <Sequence from={TL.cta} name="CTA">
      <EditorialCta line="Saatler yalan söylemez." sub="Ekibinle zaman çizelgesini kur, yalanı bul." />
    </Sequence>
    <Music src={p.music} from={p.musicFrom} volume={0.95} />
    {Array.from({ length: 9 }, (_, k) => (
      <Sfx key={k} name="tick" at={k * 3} frames={3} volume={0.9} />
    ))}
    {TL.rows.map((f) => (
      <Sfx key={f} name="tick" at={f + 18} frames={3} />
    ))}
    <Sfx name="shutter" at={TL.evidence} />
    <Sfx name="whoosh" at={TL.line} />
    <Sfx name="heart" at={TL.ask} frames={18} volume={1.4} />
    {[0, 30, 60].map((d) => (
      <Sfx key={d} name="clock" at={TL.ask + 20 + d} frames={3} volume={1.2} />
    ))}
    <Sfx name="stamp" at={TL.reveal} frames={10} volume={1.6} />
  </AbsoluteFill>
);
