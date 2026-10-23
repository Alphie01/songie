import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { BigCaps, CasePhoto, caps, Flash, NoirStage, PoliceLights, Stamp } from '../../brand/casebook/Noir';
import { FONT_BODY, FONT_HEAD, FONT_MONO, SAFE, VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { NOIR, casebookTheme } from '../../themes/casebook';
import { crew, solverSchema } from '../friends';
import { SQUAD_CHAT } from './adCases';
import { CasebookCta } from './C1Case';

const c = casebookTheme.colors;

export const c4Schema = z.object({
  solver: solverSchema,
  backdrop: z.string(),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
});
export type C4Props = z.infer<typeof c4Schema>;

/** hook 2 s → five chat messages (typing dots, then the bubble) → BULDUM flash → result card 2,7 s → CTA 2,5 s. */
export const SQ = {
  chat: 60,
  msgs: [0, 54, 128, 182, 236] as const,
  typing: 14,
  found: 236,
  result: 345,
  cta: 430,
  total: 505,
} as const;

export const C4_META = {
  id: 'casebook-04-ekip',
  durationInFrames: SQ.total,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    solver: 'Mert',
    backdrop: 'cases/sahnede-olum/img/scene-1.webp',
    music: 'assets/songs/3919638451.mp3',
    musicFrom: 0,
  } as C4Props,
} as const;

const NAME_COLORS = [c.pink, c.sky, c.mint, c.lilac];

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

const Dots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', gap: 10, padding: '22px 28px', background: NOIR.brown, borderRadius: 30, width: 'fit-content' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 9, background: c.paper, opacity: 0.35 + 0.65 * Math.abs(Math.sin(frame / 5 - i * 0.8)) }} />
      ))}
    </div>
  );
};

/** One chat bubble; mine on the right in yellow, the others left with their name color. */
const Bubble: React.FC<{ who: string; text: string; mine: boolean; color: string; photo?: string; big?: boolean }> = ({ who, text, mine, color, photo, big }) => {
  const p = usePop(0, 13);
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`, transformOrigin: mine ? 'right bottom' : 'left bottom', opacity: Math.min(1, p * 2) }}>
      <div
        style={{
          maxWidth: 800,
          padding: photo ? '12px 12px 22px' : '20px 30px 24px',
          borderRadius: 34,
          borderBottomRightRadius: mine ? 8 : 34,
          borderBottomLeftRadius: mine ? 34 : 8,
          background: mine ? c.yellow : NOIR.brown,
          color: mine ? c.ink : c.paper,
          fontFamily: FONT_BODY,
          fontWeight: 800,
          fontSize: big ? 96 : 46,
          lineHeight: 1.18,
          boxShadow: '0 14px 30px rgba(0,0,0,0.5)',
        }}
      >
        {!mine && <div style={{ fontSize: 32, color, marginBottom: 4, padding: photo ? '6px 18px 0' : 0 }}>{who}</div>}
        {photo && <CasePhoto src={photo} style={{ width: 760, height: 430, borderRadius: 24 }} dim={0.85} zoom={[1, 1]} />}
        <div style={{ padding: photo ? '12px 18px 0' : 0 }}>{text}</div>
      </div>
    </div>
  );
};

const Chat: React.FC<{ p: C4Props }> = ({ p }) => {
  const frame = useCurrentFrame();
  const cr = crew(p.solver);
  const names = [cr.solver, cr.others[0], cr.others[1]];
  const lines = SQUAD_CHAT('Sen', names[0]!, names[1]!, names[2]!);
  const color = (who: string) => NAME_COLORS[Math.max(0, names.indexOf(who))]!;
  const shown = SQ.msgs.map((at, i) => ({ at, i })).filter((m) => frame >= m.at + SQ.typing);
  const typing = SQ.msgs.findIndex((at) => frame >= at && frame < at + SQ.typing);
  return (
    <NoirStage>
      <CasePhoto src={p.backdrop} style={{ position: 'absolute', inset: 0 }} dim={0.22} zoom={[1.1, 1]} frames={SQ.result - SQ.chat} />
      {/* chat header */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: SAFE.top - 60, padding: `0 ${SAFE.side}px 18px`, borderBottom: '2px solid rgba(243,230,196,0.15)', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 84, height: 84, borderRadius: 42, background: c.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46 }}>🔎</div>
        <div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 44, color: c.paper }}>Dedektifler</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 30, color: NOIR.dim }}>
            {names.join(', ')}, sen · {typing >= 0 ? `${lines[typing]!.who === 'Sen' ? 'sen' : lines[typing]!.who} yazıyor…` : 'çevrim içi'}
          </div>
        </div>
      </div>
      {/* newest message at the bottom, older ones pushed up like a real chat */}
      <div style={{ position: 'absolute', left: SAFE.side, right: SAFE.side, top: 330, height: 1190, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {shown.map(({ at, i }) => (
            <Sequence key={i} from={at + SQ.typing} layout="none">
              <Bubble who={lines[i]!.who} text={lines[i]!.text} mine={lines[i]!.who === 'Sen'} color={color(lines[i]!.who)} photo={lines[i]!.photo} big={i === 4} />
            </Sequence>
          ))}
          {typing >= 0 && (
            <div style={{ display: 'flex', justifyContent: lines[typing]!.who === 'Sen' ? 'flex-end' : 'flex-start' }}>
              <Dots />
            </div>
          )}
        </div>
      </div>
    </NoirStage>
  );
};

/** The game's result screen, redrawn as a case-folder card: DOSYA KAPANDI, rank, the three answers. */
const Result: React.FC = () => {
  const p = usePop(0, 14);
  const rows = ['Fail', 'Yöntem', 'Neden'];
  return (
    <NoirStage>
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 520,
          width: 900,
          padding: '56px 56px 60px',
          boxSizing: 'border-box',
          background: c.paper,
          border: `5px solid ${c.ink}`,
          borderRadius: 26,
          boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
          transform: `rotate(${interpolate(p, [0, 1], [8, -2])}deg) translateY(${interpolate(p, [0, 1], [400, 0])}px)`,
        }}
      >
        <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, color: NOIR.brown, opacity: 0.7 }}>Ekip cevabı teslim edildi</div>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 150, lineHeight: 0.95, color: NOIR.brown, marginTop: 10 }}>{caps('Başkomiser')}</div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r, i) => (
            <Sequence key={r} from={14 + i * 7} layout="none">
              <Row label={r} />
            </Sequence>
          ))}
        </div>
        <div style={{ marginTop: 26, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, color: NOIR.brown }}>3 sa 12 dk, 1 ipucu, 94 puan</div>
        <Stamp text="DOSYA KAPANDI" enterAt={36} size={70} rotate={-10} color={c.mint} style={{ position: 'absolute', right: 10, bottom: -110, background: 'rgba(243,230,196,0.9)', mixBlendMode: 'normal' }} />
      </div>
    </NoirStage>
  );
};

const Row: React.FC<{ label: string }> = ({ label }) => {
  const p = usePop(0, 14);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 52, color: NOIR.brown, opacity: Math.min(1, p * 2) }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: c.mint, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, transform: `scale(${p})` }}>✓</div>
      {label}
    </div>
  );
};

const Hook: React.FC<{ p: C4Props }> = ({ p }) => (
  <NoirStage lamp={false}>
    <CasePhoto src={p.backdrop} style={{ position: 'absolute', inset: 0 }} dim={0.45} zoom={[1.2, 1.1]} frames={60} />
    <PoliceLights strength={0.6} />
    <BigCaps text={'Arkadaş grubunun\ndedektifi kim?'} enterAt={3} size={176} style={{ position: 'absolute', left: SAFE.side, top: 700 }} />
  </NoirStage>
);

/** "Ekip gecesi": the team's case chat at night, you crack it, the case closes as Başkomiser. */
export const C4Squad: React.FC<C4Props> = (p) => (
  <AbsoluteFill style={{ backgroundColor: c.bgDeep }}>
    <Sequence durationInFrames={SQ.chat} name="Hook">
      <Hook p={p} />
    </Sequence>
    <Sequence from={SQ.chat} durationInFrames={SQ.result - SQ.chat} name="Sohbet">
      <Chat p={p} />
    </Sequence>
    <Sequence from={SQ.result} durationInFrames={SQ.cta - SQ.result} name="Sonuç">
      <Result />
    </Sequence>
    <Sequence from={SQ.cta} name="CTA">
      <CasebookCta kicker="Grubun dedektifi sen ol." tagline="15 vaka, 1–8 dedektif, herkes aynı ekipte" />
    </Sequence>
    <Flash at={SQ.chat + SQ.found + SQ.typing} frames={8} />
    <Flash at={SQ.result} />
    <Flash at={SQ.cta} />

    <Music src={p.music} from={p.musicFrom} />
    <Sfx name="siren" at={0} frames={27} volume={1.2} />
    <Sfx name="stamp" at={3} frames={10} volume={1.4} />
    {SQ.msgs.map((at, i) => (
      <Sfx key={i} name="msg" at={SQ.chat + at + SQ.typing} frames={9} volume={1.4} />
    ))}
    <Sfx name="stamp" at={SQ.chat + SQ.found + SQ.typing} frames={10} volume={2} />
    <Sfx name="whoosh" at={SQ.result} />
    {[14, 21, 28].map((d) => (
      <Sfx key={d} name="tick" at={SQ.result + d} frames={3} volume={1.5} />
    ))}
    <Sfx name="stamp" at={SQ.result + 36} frames={10} volume={2} />
    <Sfx name="stamp" at={SQ.cta + 2} frames={10} />
  </AbsoluteFill>
);
