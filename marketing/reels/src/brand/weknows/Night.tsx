import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { hasStaticFile } from '../ClipCard';
import { Grain } from '../casebook/Noir';
import { EASE } from '../casebook/Editorial';
import { FONT_DISPLAY, FONT_FABLE, FONT_SANS } from '../fonts';
import { Screen390 } from './kurt/KurtScreens';

/**
 * We Knows hidden-role look (Kurt Adam first): the game's own night palette (werewolf.css: sky #0F0A2A, card
 * #221A4D, moon #FFE680) and role colours, Fraunces for the moderator's voice, Inter Tight for the app.
 */
export const WW = {
  night: '#0f0a2a',
  deep: '#07051a',
  card: '#221a4d',
  line: '#3a2e80',
  dim: '#8a80b8',
  moon: '#ffe680',
  bone: '#f1ece2',
  lilac: '#b794ff',
  wolf: '#ff6b6b',
  seer: '#b794ff',
  doctor: '#3ee0a8',
  villager: '#f3e6c4',
  M: 72,
  W: 1080 - 144,
} as const;

export const NIGHT_IMG = 'assets/weknows/ww-night.png';
export const DAWN_IMG = 'assets/weknows/ww-dawn.png';

/** The village: night photo, cross-fading to dawn by `dawn` (0–1), slow push, two mist banks drifting. */
export const Village: React.FC<{ dawn?: number; frames?: number; dim?: number; push?: [number, number] }> = ({ dawn = 0, frames = 300, dim = 1, push = [1.04, 1.12] }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, frames], push, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const drift = (frame % 600) / 600;
  const img = (src: string, o: number) =>
    hasStaticFile(src) && o > 0 ? (
      <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', opacity: o, transform: `scale(${s})`, filter: `brightness(${dim})` }} />
    ) : null;
  return (
    <AbsoluteFill style={{ backgroundColor: WW.deep, overflow: 'hidden' }}>
      {img(NIGHT_IMG, 1)}
      {img(DAWN_IMG, dawn)}
      <AbsoluteFill
        style={{
          opacity: 0.35 * (1 - dawn * 0.5),
          background: `radial-gradient(ellipse 60% 14% at ${20 + drift * 60}% 52%, rgba(200,210,255,0.35), transparent 70%), radial-gradient(ellipse 50% 10% at ${90 - drift * 70}% 66%, rgba(200,210,255,0.28), transparent 70%)`,
          filter: 'blur(18px)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Role glyphs from games/werewolf/client/Glyphs.tsx (24×24 line icons). */
const GLYPH: Record<'wolf' | 'villager' | 'seer' | 'doctor', React.ReactNode> = {
  wolf: (
    <>
      <path d="M4 3.5l4.2 5h7.6l4.2-5-.8 9.2-2.7 3.6L12 20.5l-4.5-4.2-2.7-3.6z" />
      <path d="M9 12.2l1.4.8M15 12.2l-1.4.8M10.6 16.4L12 17.4l1.4-1" />
    </>
  ),
  villager: (
    <>
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  seer: (
    <>
      <path d="M2.5 13.5s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5-9.5-5.5-9.5-5.5z" />
      <circle cx="12" cy="13.5" r="2.5" />
      <path d="M12 2.5v2.5M6.5 4.5l1.3 1.8M17.5 4.5l-1.3 1.8" />
    </>
  ),
  doctor: (
    <>
      <path d="M12 3l7 2.8v5.4c0 4.7-3 8.2-7 9.8-4-1.6-7-5.1-7-9.8V5.8z" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
};

export const Glyph: React.FC<{ role: keyof typeof GLYPH; size?: number; color?: string; stroke?: number }> = ({ role, size = 48, color = WW.bone, stroke = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    {GLYPH[role]}
  </svg>
);

/** A phone in the dark: thin black body, the screen lights its own glow. Content is drawn at 1:1 inside. */
export const Phone: React.FC<{ children?: React.ReactNode; glow?: string; on?: number; style?: React.CSSProperties }> = ({ children, glow = WW.lilac, on = 1, style }) => (
  <div
    style={{
      position: 'absolute',
      left: 210,
      top: 330,
      width: 660,
      height: 1180,
      borderRadius: 86,
      background: '#000',
      padding: 16,
      boxSizing: 'border-box',
      boxShadow: `0 0 ${160 * on}px ${40 * on}px ${glow}33, 0 40px 80px rgba(0,0,0,0.8)`,
      ...style,
    }}
  >
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 72, overflow: 'hidden', background: WW.night, opacity: on }}>{children}</div>
  </div>
);

/** Brand bug: lilac square + "We Knows". */
export const WkBug: React.FC<{ color?: string }> = ({ color = WW.bone }) => (
  <div style={{ position: 'absolute', left: WW.M, top: 236, display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 18, height: 18, background: WW.lilac }} />
    <div style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 30, color }}>We Knows</div>
  </div>
);

/** Small UI text inside the phone (Inter Tight, like the app). */
export const Ui: React.FC<{ children: React.ReactNode; size?: number; weight?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 30, weight = 600, color = WW.bone, style }) => (
  <div style={{ fontFamily: FONT_SANS, fontWeight: weight, fontSize: size, lineHeight: 1.2, color, letterSpacing: -size * 0.01, ...style }}>{children}</div>
);

/** Avatar colours of the KurtAdam.dc.html artboard (Can takes the sixth slot). */
export const AVATAR: Record<string, string> = { Ece: '#ff7ac6', Mert: '#3ee0a8', Deniz: '#5ab8ff', Zeynep: '#ffd23f', Can: '#ff8a5b', Bora: '#ff8a5b', Sude: '#ffffff', Kaan: '#b794ff' };

/** A player row: the game's avatar (colour disc, 3 px black ring, Baloo initial), name, optional trailing element. */
export const PlayerRow: React.FC<{ name: string; pick?: number; color?: string; right?: React.ReactNode; dead?: boolean }> = ({ name, pick = 0, color = WW.wolf, right, dead }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '18px 22px',
      borderRadius: 26,
      background: pick > 0 ? `color-mix(in srgb, ${color} ${Math.round(pick * 22)}%, ${WW.card})` : WW.card,
      border: `3px solid ${pick > 0 ? color : WW.line}`,
      opacity: dead ? 0.45 : 1,
    }}
  >
    <div style={{ width: 62, height: 62, borderRadius: 31, boxSizing: 'border-box', background: AVATAR[name] ?? WW.lilac, border: '4px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, color: '#120c2e' }}>{name[0]}</div>
    <Ui size={34} style={{ flex: 1, textDecoration: dead ? 'line-through' : 'none' }}>
      {name}
    </Ui>
    {right}
  </div>
);

/** The moderator's line, word by word in Fraunces italic (soft, folk-tale). */
export const Tale: React.FC<{ text: string; at: number; frames: number; size?: number; color?: string; style?: React.CSSProperties }> = ({ text, at, frames, size = 92, color = WW.bone, style }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const step = Math.max(1, (frames * 0.85) / words.length);
  return (
    <div style={{ fontFamily: FONT_FABLE, fontStyle: 'italic', fontWeight: 400, fontSize: size, lineHeight: 1.04, letterSpacing: -size * 0.015, color, fontVariationSettings: '"SOFT" 100, "opsz" 144', ...style }}>
      {words.map((w, i) => {
        const t = interpolate(frame, [at + i * step, at + i * step + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
        return (
          <span key={i} style={{ display: 'inline-block', opacity: t, filter: `blur(${(1 - t) * 8}px)`, transform: `translateY(${(1 - t) * 14}px)` }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};

/** Night frame: deep base + grain. */
export const Dark: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: WW.deep, overflow: 'hidden' }}>
    {children}
    <Grain opacity={0.06} />
  </AbsoluteFill>
);

/** Phone at the game's 390×844 proportion with a real app screen (kurt/KurtScreens) drawn at 390 px inside. */
export const APP_PHONE = { left: 280, top: 440, width: 520, height: 1088, pad: 16 } as const;
export const AppPhone: React.FC<{ children: React.ReactNode; glow?: string; on?: number; left?: number; top?: number }> = ({ children, glow, on = 1, left = APP_PHONE.left, top = APP_PHONE.top }) => {
  const iw = APP_PHONE.width - 2 * APP_PHONE.pad;
  const ih = APP_PHONE.height - 2 * APP_PHONE.pad;
  return (
    <Phone glow={glow} on={on} style={{ left, top, width: APP_PHONE.width, height: APP_PHONE.height, borderRadius: 74, padding: APP_PHONE.pad }}>
      <Screen390 width={iw} height={ih}>
        {children}
      </Screen390>
    </Phone>
  );
};
