import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { z } from 'zod';
import { hasStaticFile } from '../brand/ClipCard';
import { FONT_BODY, FONT_DISPLAY, FONT_SANS, FONT_SERIF } from '../brand/fonts';
import { PhoneFrame } from '../brand/PhoneFrame';
import { demoFeed, demoScores } from '../BrandSheet';
import { RevealScreen } from '../brand/app/RevealScreen';
import { SongieHomeScreen } from '../brand/app/SongieHomeScreen';
import { SongPlayScreen } from '../brand/app/SongPlayScreen';
import { BottleTableScreen } from '../brand/itiraf/BottleTableScreen';
import { NeverAnswerScreen } from '../brand/itiraf/NeverAnswerScreen';
import { ParanoiaEnvelopeScreen } from '../brand/itiraf/ParanoiaEnvelopeScreen';
import { AG_OPEN, AgBoard } from '../brand/weknows/agents/AgScreens';
import { IN_HAND, IN_PLAYERS, InChallenge } from '../brand/weknows/intrigue/InScreens';
import { KURT_PLAYERS, KurtNightWolf, Screen390 } from '../brand/weknows/kurt/KurtScreens';
import { itirafTheme, ITIRAF_CORAL } from '../themes/itiraf';
import { songieTheme } from '../themes/songie';

/**
 * App Store header / search-result artwork for the four apps, one layout that adapts to 5244×2950 and 3840×1646:
 * the app's icon, name and one line on the left, three real app screens fanned on the right (Casebook: case-photo
 * collage in its editorial look). Everything important stays in the middle 86 % of the width.
 */
export const storeSchema = z.object({ app: z.enum(['songie', 'itiraf', 'casebook', 'weknows']) });
type App = z.infer<typeof storeSchema>['app'];

export const STORE_SIZES = [
  { id: 'wide', width: 5244, height: 2950 },
  { id: 'banner', width: 3840, height: 1646 },
] as const;

const S = songieTheme.colors;
const INK = '#120c2e';

type Spec = {
  bg: string;
  shapes: string[];
  icon: string;
  name: string;
  line: string;
  sub: string;
  ink: string;
  phones: React.ReactNode[];
};

const W390 = (node: React.ReactNode) => (
  <Screen390 width={788} height={1748}>
    {node}
  </Screen390>
);

const SPECS: Record<Exclude<App, 'casebook'>, Spec> = {
  songie: {
    bg: S.pink,
    shapes: [S.yellow, S.lilac],
    icon: 'songie-app/icon/icon.png',
    name: 'Songie',
    line: 'Şarkıyı 0,1 saniyeden bil.',
    sub: 'Tek başına ya da arkadaşlarınla, tamamen Türkçe.',
    ink: INK,
    phones: [
      <SongieHomeScreen key="h" name="Ece" />,
      <SongPlayScreen key="p" theme={songieTheme} stage={0} playing timer={14} feed={demoFeed(songieTheme)} scores={demoScores(songieTheme)} />,
      <RevealScreen
        key="r"
        theme={songieTheme}
        title="Olsun"
        artist="Pilli Bebek"
        album="Olsun"
        cover={hasStaticFile('assets/songs/80734172.jpg') ? 'assets/songs/80734172.jpg' : ''}
        won
        results={[{ name: 'Ece', how: '0.1s’de', points: 1000, color: S.mint }]}
        enterAt={-60}
      />,
    ],
  },
  itiraf: {
    bg: ITIRAF_CORAL,
    shapes: [S.yellow, S.sky],
    icon: 'itiraf-app/icon/icon.png',
    name: 'İtiraf Köşesi',
    line: 'Arkadaşlarınla en dürüst gece.',
    sub: 'Ben Hiç, Paranoya, Şişe Çevirmece ve daha fazlası.',
    ink: INK,
    phones: [<NeverAnswerScreen key="n" theme={itirafTheme} />, <ParanoiaEnvelopeScreen key="p" theme={itirafTheme} />, <BottleTableScreen key="b" theme={itirafTheme} />],
  },
  weknows: {
    bg: S.lilac,
    shapes: [S.mint, S.yellow],
    icon: 'weknows/icon/icon.png',
    name: 'We Knows',
    line: 'Gizli roller, takım oyunları.',
    sub: 'Kurt Adam, Entrika, Ajanlar ve 8 oyun daha.',
    ink: INK,
    phones: [
      W390(<KurtNightWolf players={KURT_PLAYERS} pick={1} timer={18} cardOpen={false} />),
      W390(<InChallenge players={IN_PLAYERS} {...IN_HAND} actor="Mert" action="Suikast" claim="assassin" target="Sen" countdown={5} passed={1} needed={3} />),
      W390(<AgBoard open={AG_OPEN} />),
    ],
  },
};

/** Three phones fanned: left and right tilted out and lower, the middle one in front. */
const Phones: React.FC<{ phones: React.ReactNode[]; h: number; theme: typeof songieTheme }> = ({ phones, h, theme }) => {
  const scale = (h * 0.74) / 1800;
  const pos = [
    { x: -0.62, y: 0.07, r: -9, z: 1 },
    { x: 0.62, y: 0.07, r: 9, z: 1 },
    { x: 0, y: 0, r: 0, z: 2 },
  ];
  const order = [0, 2, 1];
  return (
    <div style={{ position: 'relative', width: 840 * scale * 2.3, height: h * 0.8, marginTop: -h * 0.04 }}>
      {order.map((i) => {
        const p = pos[i]!;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              zIndex: p.z,
              transform: `translateX(-50%) translateX(${p.x * 840 * scale}px) translateY(${p.y * h}px) rotate(${p.r}deg) scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            <PhoneFrame theme={theme}>{phones[i === 2 ? 1 : i === 1 ? 2 : 0]}</PhoneFrame>
          </div>
        );
      })}
    </div>
  );
};

const Bright: React.FC<{ spec: Spec; w: number; h: number }> = ({ spec, w, h }) => {
  const u = h / 1000;
  const wide = w / h > 2;
  return (
    <AbsoluteFill style={{ backgroundColor: spec.bg, overflow: 'hidden' }}>
      {/* two soft brand shapes behind the phones */}
      <div style={{ position: 'absolute', right: w * 0.04, top: -h * 0.18, width: h * 0.9, height: h * 0.9, borderRadius: '50%', background: spec.shapes[0], opacity: 0.55, border: `${8 * u}px solid ${INK}` }} />
      <div style={{ position: 'absolute', right: w * 0.3, bottom: -h * 0.3, width: h * 0.75, height: h * 0.75, borderRadius: 120 * u, transform: 'rotate(18deg)', background: spec.shapes[1], opacity: 0.5, border: `${8 * u}px solid ${INK}` }} />
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: w * (wide ? 0.05 : 0.03), padding: `0 ${w * 0.07}px` }}>
        <div style={{ flex: '0 0 auto', width: w * (wide ? 0.36 : 0.4), display: 'flex', flexDirection: 'column', gap: 26 * u, color: spec.ink }}>
          {hasStaticFile(spec.icon) && (
            <Img src={staticFile(spec.icon)} style={{ width: 190 * u, height: 190 * u, borderRadius: 52 * u, border: `${8 * u}px solid ${INK}`, boxShadow: `${14 * u}px ${14 * u}px 0 ${INK}`, transform: 'rotate(-6deg)' }} />
          )}
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: (spec.name.length > 6 ? 128 : 170) * u, lineHeight: 0.9, letterSpacing: -2 * u, whiteSpace: 'nowrap' }}>{spec.name}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 80 * u, lineHeight: 1 }}>{spec.line}</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40 * u, lineHeight: 1.25, opacity: 0.85 }}>{spec.sub}</div>
          <div style={{ alignSelf: 'flex-start', padding: `${12 * u}px ${30 * u}px`, borderRadius: 999, background: S.yellow, border: `${6 * u}px solid ${INK}`, boxShadow: `${8 * u}px ${8 * u}px 0 ${INK}`, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 44 * u, transform: 'rotate(-3deg)' }}>
            Ücretsiz · reklamsız
          </div>
        </div>
        <Phones phones={spec.phones} h={h} theme={spec.name === 'İtiraf Köşesi' ? itirafTheme : songieTheme} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Casebook in its editorial look: black, bone, the UV accent, three real case covers as a collage. */
const CASES = [
  { img: 'cases/bodrum-zehir/img/cover.webp', title: 'Son Tadım', place: 'Gümüşlük, Bodrum' },
  { img: 'cases/yalida-son-aksam/img/cover.webp', title: 'Yalıda Son Akşam', place: 'Kandilli, İstanbul' },
  { img: 'cases/sahnede-olum/img/cover.webp', title: 'Sahnede Ölüm', place: 'Beyoğlu, İstanbul' },
];
const Casebook: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const u = h / 1000;
  const wide = w / h > 2;
  const cardW = Math.min(h * 0.42, w * 0.145);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: w * 0.05, padding: `0 ${w * 0.07}px` }}>
        <div style={{ flex: '0 0 auto', width: w * (wide ? 0.34 : 0.36), display: 'flex', flexDirection: 'column', gap: 30 * u, color: '#ede8df' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 30 * u }}>
            {hasStaticFile('casebook/icon/icon.png') && <Img src={staticFile('casebook/icon/icon.png')} style={{ width: 170 * u, height: 170 * u, borderRadius: 40 * u }} />}
            <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 96 * u, letterSpacing: -2 * u }}>Casebook</div>
          </div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 210 * u, lineHeight: 0.92, letterSpacing: -5 * u }}>Dosya açık.</div>
          <div style={{ width: 160 * u, height: 8 * u, background: '#8f72ff' }} />
          <div style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 50 * u, lineHeight: 1.25 }}>Gerçek vakaları ekibinle çöz: ifadeler, raporlar, kamera kayıtları.</div>
          <div style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 36 * u, color: 'rgba(237,232,223,0.6)' }}>15 vaka · 1–8 dedektif · ücretsiz</div>
        </div>
        <div style={{ display: 'flex', gap: 30 * u, alignItems: 'flex-start' }}>
          {CASES.map((c, i) => (
            <div key={c.title} style={{ width: cardW, marginTop: i === 1 ? -h * 0.06 : h * 0.04 }}>
              <div style={{ width: cardW, height: cardW * 1.5, overflow: 'hidden', background: '#111' }}>
                {hasStaticFile(c.img) && <Img src={staticFile(c.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.6) contrast(1.08) brightness(0.92)' }} />}
              </div>
              <div style={{ marginTop: 18 * u, fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 64 * u, color: '#ede8df', lineHeight: 1 }}>{c.title}</div>
              <div style={{ marginTop: 8 * u, fontFamily: FONT_SANS, fontWeight: 500, fontSize: 30 * u, color: 'rgba(237,232,223,0.6)' }}>{c.place}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const StoreArt: React.FC<{ app: App; w: number; h: number }> = ({ app, w, h }) =>
  app === 'casebook' ? <Casebook w={w} h={h} /> : <Bright spec={SPECS[app]} w={w} h={h} />;
