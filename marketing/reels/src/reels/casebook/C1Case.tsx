import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../../brand/ClipCard';
import { caps, CaseFolder, CasebookLogo, CasePhoto, Flash, Note, NoirStage, Pin, Polaroid, Stamp, Typewriter } from '../../brand/casebook/Noir';
import { FONT_DISPLAY, FONT_HEAD, FONT_MONO, SAFE, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { NOIR, casebookTheme } from '../../themes/casebook';
import { crew, solverSchema } from '../friends';

const c = casebookTheme.colors;

/** Beats (frames at 30 fps): hook 2,8 s · scene 5,3 s · evidence 3,3 s · board 4 s · CTA 2,3 s ≈ 17,8 s. */
export const CB = {
  hook: 0,
  title: 26,
  gizli: 50,
  scene: 85,
  narrateAt: 8,
  maxTwistAt: 100,
  evidence: 245,
  photoAt: 4,
  reportAt: 20,
  markerAt: 40,
  noteAt: 58,
  board: 345,
  pinAt: 6,
  stringAt: 34,
  marksAt: [48, 62, 76] as const,
  askAt: 90,
  cta: 465,
  total: 535,
} as const;

const photoSchema = z.object({ image: z.string(), title: z.string(), stamp: z.string(), cam: z.boolean() });

export const c1Schema = z.object({
  title: z.string().min(2).max(28),
  subtitle: z.string().max(48),
  genre: z.string(),
  cover: z.string(),
  act: z.object({ label: z.string(), image: z.string(), line: z.string().max(120), narration: z.string(), narrationSec: z.number().min(0).max(6) }),
  twist: z.string().min(10).max(96),
  photo: photoSchema,
  report: z.object({ agency: z.string(), heading: z.string(), lead: z.string(), rest: z.string() }),
  suspects: z.array(z.object({ name: z.string(), image: z.string() })).length(6),
  /** Teammates' marks on the board; never the real culprit (no spoilers). */
  marks: z.array(z.object({ i: z.number().int().min(0).max(5), mark: z.enum(['suspect', 'clear']) })).length(3),
  question: z.string().min(8).max(90),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  solver: solverSchema,
});

export type C1Props = z.infer<typeof c1Schema>;

const B = 'cases/bodrum-zehir';
export const C1_META = {
  id: 'casebook-01-vaka',
  durationInFrames: CB.total,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    title: 'Son Tadım',
    subtitle: 'Gümüşlük, Bodrum — Eylül 2026',
    genre: 'zehirlenme',
    cover: `${B}/img/cover.webp`,
    act: {
      label: 'Bölüm 1 / 5: Onur konuğu',
      image: `${B}/img/scene-teras.webp`,
      line: 'Gece yarısını üç saat geçmişti.',
      narration: `${B}/audio/act-1.mp3`,
      narrationSec: 2.38,
    },
    twist: 'Ama kanında, hiç kullanmadığı bir kalp ilacı çıktı.',
    photo: { image: `${B}/img/obj-bohca.webp`, title: 'Bar dolabındaki peçete', stamp: 'OYİ-2026/1147 · F-09', cam: false },
    report: {
      agency: 'Bodrum Devlet Hastanesi, Acil Servis',
      heading: 'Acil servis epikrizi ve adli olgu bildirimi',
      lead: 'Hasta 23:41’de 112 ambulansıyla, Gümüşlük’teki bir otelden getirildi.',
      rest: 'Yanında asistanı olduğunu söyleyen İpek Uçar vardı.',
    },
    suspects: [
      { name: 'İpek Uçar', image: `${B}/img/p-ipek.webp` },
      { name: 'Doruk Ersoy', image: `${B}/img/p-doruk.webp` },
      { name: 'Selin Aksoy', image: `${B}/img/p-selin.webp` },
      { name: 'Levent Okay', image: `${B}/img/p-levent.webp` },
      { name: 'Tolga Erdem', image: `${B}/img/p-tolga.webp` },
      { name: 'Dr. Cemal Yavuz', image: `${B}/img/p-cemal.webp` },
    ],
    marks: [
      { i: 1, mark: 'suspect' },
      { i: 5, mark: 'clear' },
      { i: 2, mark: 'suspect' },
    ],
    question: 'Kurbanı kim zehirledi?',
    music: 'assets/songs/3919579631.mp3',
    musicFrom: 0,
    solver: 'Ece',
  } as C1Props,
} as const;

/** When the twist line lands: right after the narrator's first sentence, but never later than maxTwistAt. */
export const twistAt = (narrationSec: number, fps = VIDEO.fps) => Math.min(CB.narrateAt + Math.round(narrationSec * fps) + 8, CB.maxTwistAt);

/** Board grid: 3 × 2 polaroids, top-left corners. */
export const BOARD = { x: [60, 390, 720], y: [470, 905], w: 300, photo: 320 } as const;
const ROT = [-3, 2, -1.5, 2.5, -2, 1.5];
/** Red string between pins (card indexes). */
const STRINGS: [number, number][] = [
  [0, 4],
  [4, 2],
  [1, 3],
  [3, 5],
];
const pinXY = (i: number) => ({ x: BOARD.x[i % 3]! + BOARD.w / 2, y: BOARD.y[Math.floor(i / 3)]! + 4 });

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

/** Key clicks every 3 frames while a line types. */
const Typing: React.FC<{ at: number; chars: number; charsPerFrame: number }> = ({ at, chars, charsPerFrame }) => {
  const frames = Math.ceil(chars / charsPerFrame);
  return (
    <>
      {Array.from({ length: Math.floor(frames / 3) }, (_, k) => (
        <Sfx key={k} name="type" at={at + k * 3} frames={3} volume={0.7} />
      ))}
    </>
  );
};

const HOOK_LINE = 'Bu dosyayı ekibinle çözebilir misin?';

const Hook: React.FC<{ p: C1Props }> = ({ p }) => (
  <NoirStage lamp={false}>
    <CasePhoto src={p.cover} style={{ position: 'absolute', inset: 0 }} frames={CB.scene} dim={0.68} />
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,4,7,0.85) 0%, transparent 30%, transparent 55%, rgba(5,4,7,0.85) 85%)' }} />
    <Typewriter text={HOOK_LINE} enterAt={6} charsPerFrame={1.5} size={80} style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 10, width: 960 }} />
    <div style={{ position: 'absolute', left: SAFE.side, top: 1010 }}>
      <CaseFolder title={p.title} subtitle={p.subtitle} genre={p.genre} enterAt={CB.title}>
        <Stamp text="GİZLİ" enterAt={CB.gizli} size={78} style={{ position: 'absolute', right: 40, top: -50 }} />
      </CaseFolder>
    </div>
  </NoirStage>
);

const Scene: React.FC<{ p: C1Props }> = ({ p }) => {
  const frame = useCurrentFrame();
  const narr = Math.max(1, Math.round(p.act.narrationSec * VIDEO.fps));
  const tAt = twistAt(p.act.narrationSec);
  const rule = interpolate(frame, [tAt + 6, tAt + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const twist = usePop(tAt, 15);
  return (
    <NoirStage>
      <CasePhoto src={p.act.image} style={{ position: 'absolute', left: 0, top: SAFE.top - 40, width: 1080, height: 660 }} frames={160} zoom={[1.12, 1]} dim={0.7} />
      <div style={{ position: 'absolute', left: 0, top: SAFE.top - 40, width: 1080, height: 660, background: 'linear-gradient(180deg, transparent 60%, #0d0b10 100%)' }} />
      <div style={{ position: 'absolute', left: SAFE.side, top: 830, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, color: c.yellow }}>{p.act.label}</div>
      <Typewriter
        text={`“${p.act.line}”`}
        enterAt={CB.narrateAt}
        charsPerFrame={Math.max(0.6, (p.act.line.length + 2) / narr)}
        size={60}
        weight={400}
        style={{ position: 'absolute', left: SAFE.side, top: 920, width: 960 }}
      />
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          top: 1180,
          width: 960,
          opacity: Math.min(1, twist * 1.5),
          transform: `translateY(${interpolate(twist, [0, 1], [30, 0])}px)`,
        }}
      >
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 64, lineHeight: 1.18, color: c.paper }}>{p.twist}</div>
        <div style={{ marginTop: 18, height: 8, width: `${rule * 100}%`, background: c.coral }} />
      </div>
    </NoirStage>
  );
};

const Evidence: React.FC<{ p: C1Props }> = ({ p }) => {
  const frame = useCurrentFrame();
  const photo = usePop(CB.photoAt, 14);
  const report = usePop(CB.reportAt, 14);
  const marker = interpolate(frame, [CB.markerAt, CB.markerAt + 18], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rec = Math.floor(frame / 10) % 2 === 0;
  const c3 = crew(p.solver);
  return (
    <NoirStage>
      <Typewriter text="Kanıtları ekipçe incele." enterAt={0} charsPerFrame={2} size={64} style={{ position: 'absolute', left: SAFE.side, top: SAFE.top, width: 960 }} />
      {/* photo evidence */}
      <div
        style={{
          position: 'absolute',
          left: 70,
          top: 380,
          width: 780,
          padding: 16,
          background: c.paper,
          boxShadow: '0 24px 50px rgba(0,0,0,0.7)',
          opacity: Math.min(1, photo * 2),
          transform: `rotate(${interpolate(photo, [0, 1], [-10, -3])}deg) scale(${interpolate(photo, [0, 1], [1.3, 1])})`,
        }}
      >
        <div style={{ position: 'relative' }}>
          <CasePhoto src={p.photo.image} style={{ width: '100%', height: 460 }} zoom={[1, 1.06]} frames={100} dim={0.82} />
          {p.photo.cam && (
            <>
              <div style={{ position: 'absolute', left: 22, top: 18, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, color: '#fff', opacity: rec ? 1 : 0.3 }}>
                <span style={{ color: '#ff3b30' }}>●</span> REC
              </div>
              <div style={{ position: 'absolute', right: 22, bottom: 16, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, color: '#fff' }}>{p.photo.stamp}</div>
            </>
          )}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, color: NOIR.brown, padding: '14px 4px 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.photo.cam ? p.photo.title : `${p.photo.title}`}
        </div>
      </div>
      {/* report paper */}
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 1010,
          width: 820,
          padding: '34px 40px 40px',
          boxSizing: 'border-box',
          background: NOIR.doc,
          color: NOIR.docInk,
          fontFamily: FONT_MONO,
          boxShadow: '0 24px 50px rgba(0,0,0,0.7)',
          opacity: Math.min(1, report * 2),
          transform: `translateY(${interpolate(report, [0, 1], [300, 0])}px) rotate(2.5deg)`,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.65 }}>{p.report.agency}</div>
        <div style={{ marginTop: 10, fontSize: 36, fontWeight: 700, lineHeight: 1.12, borderBottom: `3px solid ${NOIR.docInk}`, paddingBottom: 14 }}>{p.report.heading}</div>
        <div style={{ marginTop: 16, fontSize: 32, fontWeight: 400, lineHeight: 1.3 }}>
          <span
            style={{
              backgroundImage: `linear-gradient(${c.yellow}, ${c.yellow})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${marker}% 100%`,
              boxDecorationBreak: 'clone',
              WebkitBoxDecorationBreak: 'clone',
            }}
          >
            {p.report.lead}
          </span>{' '}
          {p.report.rest}
        </div>
      </div>
      <Note text={`${c3.others[0]}: Bu saat tutmuyor…`} enterAt={CB.noteAt} rotate={6} width={380} style={{ position: 'absolute', right: 50, top: 700 }} />
    </NoirStage>
  );
};

const Board: React.FC<{ p: C1Props }> = ({ p }) => {
  const frame = useCurrentFrame();
  const c3 = crew(p.solver);
  const by = [p.solver.trim(), c3.others[0], c3.others[1]];
  const string = interpolate(frame, [CB.stringAt, CB.stringAt + 24], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dim = interpolate(frame, [CB.askAt - 4, CB.askAt + 6], [0, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <NoirStage>
      <Typewriter text={p.question} enterAt={0} charsPerFrame={1.8} size={p.question.length > 40 ? 52 : 66} style={{ position: 'absolute', left: SAFE.side, top: SAFE.top, width: 960 }} />
      {p.suspects.map((s, i) => {
        const mark = p.marks.findIndex((m) => m.i === i);
        return (
          <div key={i} style={{ position: 'absolute', left: BOARD.x[i % 3], top: BOARD.y[Math.floor(i / 3)] }}>
            <Polaroid src={s.image} caption={s.name} width={BOARD.w} photoHeight={BOARD.photo} rotate={ROT[i]} enterAt={CB.pinAt + i * 4}>
              {mark >= 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Stamp
                    text={p.marks[mark]!.mark === 'suspect' ? 'ŞÜPHELİ' : 'TEMİZ'}
                    color={p.marks[mark]!.mark === 'suspect' ? c.coral : c.mint}
                    enterAt={CB.marksAt[mark]!}
                    size={44}
                    rotate={mark % 2 ? 10 : -12}
                    style={{ background: 'rgba(243,230,196,0.82)', mixBlendMode: 'normal' }}
                  />
                  {frame >= CB.marksAt[mark]! + 6 && (
                    <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 26, color: c.paper, background: 'rgba(5,4,7,0.75)', padding: '2px 10px' }}>{by[mark]}</div>
                  )}
                </div>
              )}
            </Polaroid>
          </div>
        );
      })}
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STRINGS.map(([a, b], k) => {
          const A = pinXY(a);
          const Bp = pinXY(b);
          const len = Math.hypot(Bp.x - A.x, Bp.y - A.y);
          return (
            <path
              key={k}
              d={`M${A.x} ${A.y} Q${(A.x + Bp.x) / 2} ${(A.y + Bp.y) / 2 + 60} ${Bp.x} ${Bp.y}`}
              fill="none"
              stroke={NOIR.string}
              strokeWidth={5}
              strokeDasharray={len * 1.2}
              strokeDashoffset={len * 1.2 * string}
            />
          );
        })}
      </svg>
      {p.suspects.map((_, i) => (
        <Pin key={i} style={{ left: pinXY(i).x - 15, top: pinXY(i).y - 15, opacity: frame >= CB.pinAt + i * 4 ? 1 : 0 }} />
      ))}
      <AbsoluteFill style={{ backgroundColor: `rgba(5,4,7,${dim})` }} />
      <Note
        text="Sence kim? Yorumlara yaz."
        enterAt={CB.askAt}
        rotate={-3}
        width={760}
        style={{ position: 'absolute', left: 160, top: 1360, fontSize: 52, textAlign: 'center' }}
      />
    </NoirStage>
  );
};

/** Closing card; `kicker` is a line above the logo ("Bu sadece bir ipucuydu."), `tagline` replaces the case count. */
export const CasebookCta: React.FC<{ kicker?: string; tagline?: string }> = ({ kicker, tagline = '15 vaka, 1–8 dedektif, herkes aynı ekipte' }) => {
  const kick = usePop(0, 16);
  const logo = usePop(4, 12);
  const name = usePop(10, 14);
  const stores = usePop(30, 12);
  return (
    <NoirStage>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom - 120}px`, gap: 26 }}>
        {kicker && (
          <div style={{ fontFamily: FONT_HEAD, fontSize: 104, lineHeight: 0.95, color: c.yellow, textAlign: 'center', marginBottom: 20, opacity: Math.min(1, kick * 2), transform: `scale(${interpolate(kick, [0, 1], [1.3, 1])})` }}>
            {caps(kicker)}
          </div>
        )}
        <div style={{ transform: `scale(${logo}) rotate(${interpolate(logo, [0, 1], [-14, 0])}deg)` }}>
          <CasebookLogo size={kicker ? 240 : 300} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: c.paper, opacity: Math.min(1, name * 2), transform: `translateY(${interpolate(name, [0, 1], [40, 0])}px)` }}>
          {casebookTheme.name}
        </div>
        <Typewriter text={casebookTheme.cta} enterAt={14} charsPerFrame={1.6} size={60} style={{ textAlign: 'center', width: 960 }} />
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 36, color: NOIR.dim }}>{tagline}</div>
        <div
          style={{
            marginTop: 20,
            padding: '12px 34px 8px',
            borderRadius: 999,
            background: c.yellow,
            color: c.ink,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 44,
            transform: `scale(${stores}) rotate(-3deg)`,
          }}
        >
          {casebookTheme.stores}
        </div>
      </AbsoluteFill>
    </NoirStage>
  );
};

/**
 * Casebook "gel oyna" reel, noir: the case cover with a GİZLİ stamp → the first act photo with the game's own
 * narrator → evidence your team reads → the suspect board with teammates' marks → "Sence kim?" → logo.
 * Never shows the solution.
 */
export const C1Case: React.FC<C1Props> = (p) => {
  const tAt = CB.scene + twistAt(p.act.narrationSec);
  const narrFrames = Math.round(p.act.narrationSec * VIDEO.fps) + 6;
  return (
    <AbsoluteFill style={{ backgroundColor: c.bgDeep }}>
      <Sequence durationInFrames={CB.scene} name="Hook">
        <Hook p={p} />
      </Sequence>
      <Sequence from={CB.scene} durationInFrames={CB.evidence - CB.scene} name="Scene">
        <Scene p={p} />
      </Sequence>
      <Sequence from={CB.evidence} durationInFrames={CB.board - CB.evidence} name="Evidence">
        <Evidence p={p} />
      </Sequence>
      <Sequence from={CB.board} durationInFrames={CB.cta - CB.board} name="Board">
        <Board p={p} />
      </Sequence>
      <Sequence from={CB.cta} name="CTA">
        <CasebookCta />
      </Sequence>
      <Flash at={CB.scene} />
      <Flash at={CB.evidence} />
      <Flash at={CB.board} />

      <Music src={p.music} from={p.musicFrom} duck={hasStaticFile(p.act.narration) ? { from: CB.scene + CB.narrateAt, to: CB.scene + CB.narrateAt + narrFrames, level: 0.3 } : undefined} />
      {hasStaticFile(p.act.narration) && (
        <Sequence from={CB.scene + CB.narrateAt} durationInFrames={narrFrames} layout="none" name="anlatıcı">
          <Audio src={staticFile(p.act.narration)} volume={(f) => interpolate(f, [narrFrames - 6, narrFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
        </Sequence>
      )}
      <Typing at={6} chars={HOOK_LINE.length} charsPerFrame={1.5} />
      <Sfx name="whoosh" at={CB.title} />
      <Sfx name="stamp" at={CB.gizli} frames={10} volume={2} />
      <Sfx name="shutter" at={CB.scene} />
      <Sfx name="stamp" at={tAt} frames={10} volume={1.2} />
      <Sfx name="shutter" at={CB.evidence + CB.photoAt} />
      <Sfx name="whoosh" at={CB.evidence + CB.reportAt} />
      <Sfx name="pop" at={CB.evidence + CB.noteAt} />
      <Sfx name="shutter" at={CB.board} />
      {p.suspects.map((_, i) => (
        <Sfx key={i} name="tick" at={CB.board + CB.pinAt + i * 4} frames={3} />
      ))}
      {CB.marksAt.map((f) => (
        <Sfx key={f} name="stamp" at={CB.board + f} frames={10} volume={1.6} />
      ))}
      <Sfx name="pop" at={CB.board + CB.askAt} />
      <Sfx name="stamp" at={CB.cta + 4} frames={10} />
    </AbsoluteFill>
  );
};
