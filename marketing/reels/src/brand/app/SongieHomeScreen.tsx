import React from 'react';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { usePhoneScreen } from '../PhoneFrame';

/**
 * Songie home (SongieHome.dc.html in the "Songie Arayüz" canvas), values copied 1:1 at 390 px: header, pink hero
 * "Şarkıyı 0,1 saniyeden bil.", the two big buttons, the join box. `press` (0–1) pushes "Tek başına oyna" down
 * like a tap (its 7 px shadow shrinks to 2 px).
 */
const W = 390;
const INK = '#0D0828';
const T = '#120C2E';

const Note: React.FC = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const BAR_H = [26, 60, 40, 100, 70, 88, 35, 64, 48, 22, 58, 30];

const BigButton: React.FC<{ bg: string; title: string; sub: string; icon: React.ReactNode; press?: number }> = ({ bg, title, sub, icon, press = 0 }) => (
  <div
    style={{
      minHeight: 72,
      boxSizing: 'border-box',
      borderRadius: 22,
      background: bg,
      color: T,
      border: `3px solid ${INK}`,
      boxShadow: `0 ${7 - press * 5}px 0 ${INK}`,
      transform: `translateY(${press * 5}px)`,
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '0 18px',
    }}
  >
    <span style={{ width: 44, height: 44, borderRadius: '50%', background: T, color: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{icon}</span>
    <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
      {title}
      <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700 }}>{sub}</span>
    </span>
  </div>
);

export const SongieHomeScreen: React.FC<{ name?: string; press?: number }> = ({ name = 'Ece', press = 0 }) => {
  const screen = usePhoneScreen() ?? { width: W, height: 844 };
  const scale = screen.width / W;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#2A1B6E', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: screen.height / scale,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          boxSizing: 'border-box',
          padding: '20px 18px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          fontFamily: FONT_BODY,
          color: '#FFFFFF',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 40 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: '#3A2A8C', border: `3px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: '#FF7AC6', border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)', color: T, boxSizing: 'border-box' }}>
              <Note />
            </span>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>songie</span>
          </span>
          <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#3EE0A8', border: `3px solid ${INK}`, color: T, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, boxSizing: 'border-box' }}>
            {name[0]}
          </span>
        </header>

        <section style={{ position: 'relative', background: '#FF7AC6', color: T, border: `3px solid ${INK}`, borderRadius: 30, boxShadow: `7px 7px 0 ${INK}`, padding: '26px 20px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          <span style={{ position: 'absolute', top: 14, right: 14, padding: '5px 12px', borderRadius: 999, background: '#FFD23F', border: `3px solid ${INK}`, fontWeight: 800, fontSize: 13, transform: 'rotate(8deg)' }}>Ücretsiz</span>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1.5 }}>SELAM, {name.toLocaleUpperCase('tr-TR')}</span>
          <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 46, lineHeight: 0.92, letterSpacing: -0.5 }}>Şarkıyı 0,1 saniyeden bil.</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 56 }}>
            {BAR_H.map((h, i) => (
              <span key={i} style={{ display: 'block', flex: 1, height: Math.round((h / 100) * 56), background: i === 3 ? '#FFFFFF' : T, border: i === 3 ? `2px solid ${T}` : 'none', borderRadius: 4, boxSizing: 'border-box' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, fontWeight: 800, fontSize: 12, textAlign: 'center' }}>
            {['0,1 sn', '0,5 sn', '2 sn', '8 sn', '15 sn'].map((l, i) => (
              <span key={l} style={{ padding: '4px 0', borderRadius: 8, background: i === 0 ? T : 'rgba(18,12,46,0.18)', color: i === 0 ? '#FFD23F' : T }}>
                {l}
              </span>
            ))}
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>Her “Pas”ta parça biraz daha uzar. Ne kadar erken bilirsen o kadar çok puan.</span>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <BigButton
            bg="#FFD23F"
            title="Tek başına oyna"
            sub="Hemen başla, serini büyüt"
            press={press}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4l13 8-13 8z" />
              </svg>
            }
          />
          <BigButton
            bg="#3EE0A8"
            title="Arkadaşlarla oyna"
            sub="Oda kur, linki gruba at"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.1.7 3.5 2.6 3.5 5.7" />
              </svg>
            }
          />
        </div>

        <section style={{ background: '#1F145A', border: `3px solid ${INK}`, borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>Odaya katıl</span>
          <div style={{ display: 'flex', alignItems: 'stretch', background: '#FFFFFF', border: `3px solid ${INK}`, borderRadius: 16, overflow: 'hidden' }}>
            <span style={{ flex: 1, padding: '0 16px', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: 10, color: '#B9B3D6', display: 'flex', alignItems: 'center' }}>ABCD</span>
            <span style={{ borderLeft: `3px solid ${INK}`, background: '#FF7AC6', color: T, padding: '0 20px', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, minHeight: 54, display: 'flex', alignItems: 'center' }}>Katıl</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#C9BEF5' }}>Arkadaşının paylaştığı 4 harfli kodu yaz.</span>
        </section>
      </div>
    </div>
  );
};
