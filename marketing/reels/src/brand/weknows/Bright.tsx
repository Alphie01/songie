import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { hasStaticFile } from '../ClipCard';
import { EASE } from '../casebook/Editorial';
import { ColorStage } from '../ColorStage';
import { FONT_BODY, FONT_DISPLAY, SAFE, VIDEO } from '../fonts';
import { usePop } from '../motion';
import { PhoneFrame } from '../PhoneFrame';
import { Sticker } from '../Sticker';
import { songieTheme } from '../../themes/songie';
import { Screen390 } from './kurt/KurtScreens';

/**
 * The bright We Knows look (user, 2026-10-24: "karanlık yapma, renkli yap, dikkat çeksin"): Songie's stage colours,
 * big ink Baloo lines, the brand phone with the game's real screen inside, music only.
 */
export const BT = songieTheme;
const C = BT.colors;
/** Stage colours, one per shot in turn. */
export const STAGES = [C.yellow, C.pink, C.mint, C.sky, C.lilac, '#ff8a5b'];

/** Brand phone sized to the game's 390×844 screen: 520 wide → screen 468×1013. */
const PH = { w: 520, h: 1065, top: 470 } as const;
const SCREEN = { w: PH.w - 52, h: PH.h - 52 } as const;

export const BrandPhone: React.FC<{ children: React.ReactNode; tilt?: number; enterAt?: number }> = ({ children, tilt = -1.5, enterAt }) => {
  const frame = useCurrentFrame();
  const k = enterAt === undefined ? 1 : interpolate(frame, [enterAt, enterAt + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return (
    <div style={{ position: 'absolute', left: (VIDEO.width - PH.w) / 2, top: PH.top, transform: `translateY(${(1 - k) * 900}px) rotate(${tilt}deg)` }}>
      <PhoneFrame theme={BT} width={PH.w} height={PH.h} radius={88}>
        <Screen390 width={SCREEN.w} height={SCREEN.h}>
          {children}
        </Screen390>
      </PhoneFrame>
    </div>
  );
};

/** Big ink Baloo line, words rising one by one, left-aligned on the safe margin. */
export const BigLine: React.FC<{ text: string; at?: number; frames?: number; size?: number; color?: string; top?: number }> = ({ text, at = 2, frames = 20, size = 74, color = C.ink, top = SAFE.top - 10 }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const step = Math.max(1, (frames * 0.8) / words.length);
  return (
    <div style={{ position: 'absolute', left: SAFE.side, top, width: VIDEO.width - 2 * SAFE.side, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.98, letterSpacing: -size * 0.012, color }}>
      {words.map((w, i) => {
        const t = interpolate(frame, [at + i * step, at + i * step + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
            <span style={{ display: 'inline-block', transform: `translateY(${(1 - t) * 105}%)` }}>{w}</span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};

/** One shot: a colour field, the line on top (who said it as a small sticker), the real screen in the phone. */
export const BrightShot: React.FC<{ color: string; line?: string; who?: string; len: number; children: React.ReactNode; phoneEnter?: number }> = ({ color, line, who, len, children, phoneEnter }) => (
  <ColorStage theme={BT} color={color}>
    {who && (
      <Sticker theme={BT} text={who} bg={C.paper} rotate={-4} enterAt={0} size={40} style={{ position: 'absolute', left: SAFE.side, top: SAFE.top - 70 }} />
    )}
    {line && <BigLine text={line} frames={Math.min(26, len)} size={line.length > 40 ? 62 : 74} />}
    <BrandPhone enterAt={phoneEnter}>{children}</BrandPhone>
  </ColorStage>
);

/** Think-time hairline (ink) with the prompt under the phone. */
export const BrightThink: React.FC<{ len: number; text: string; frames?: number }> = ({ len, text, frames = 52 }) => {
  const frame = useCurrentFrame();
  if (frame < len - frames - 2) return null;
  const t = interpolate(frame, [len - frames, len], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: SAFE.side, top: 1556, width: VIDEO.width - 2 * SAFE.side }}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 30, color: C.ink }}>{text}</div>
      <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: 'rgba(18,12,46,0.18)', border: `3px solid ${C.ink}` }}>
        <div style={{ width: `${t * 100}%`, height: '100%', borderRadius: 3, background: t < 0.35 ? C.coral : C.ink }} />
      </div>
    </div>
  );
};

/** Closing card: paper card with the We Knows icon, name, invite and the stores sticker. */
export const WkBrightCta: React.FC<{ cta: string; color?: string }> = ({ cta, color = C.yellow }) => {
  const card = usePop(0, 12);
  const logo = usePop(4, 9);
  return (
    <ColorStage theme={BT} color={color}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div
          style={{
            position: 'relative',
            width: 880,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            padding: '56px 40px 84px',
            boxSizing: 'border-box',
            border: `6px solid ${C.ink}`,
            borderRadius: 48,
            background: C.paper,
            boxShadow: `14px 14px 0 ${C.ink}`,
            transform: `translateY(${interpolate(card, [0, 1], [240, 0])}px) rotate(${interpolate(card, [0, 1], [-8, -2])}deg)`,
            opacity: Math.min(1, card * 2),
          }}
        >
          <div style={{ transform: `scale(${logo}) rotate(${interpolate(logo, [0, 1], [-20, 0])}deg)` }}>
            {hasStaticFile('weknows/icon/icon.png') && <Img src={staticFile('weknows/icon/icon.png')} style={{ width: 230, height: 230, borderRadius: 52, border: `6px solid ${C.ink}`, display: 'block' }} />}
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 140, lineHeight: 0.9, color: C.ink }}>We Knows</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 60, lineHeight: 1.05, color: C.ink, textAlign: 'center', maxWidth: 760 }}>{cta}</div>
          <Sticker theme={BT} text={BT.stores} bg={C.yellow} rotate={-4} enterAt={18} size={42} style={{ position: 'absolute', bottom: -44 }} />
        </div>
      </AbsoluteFill>
    </ColorStage>
  );
};
