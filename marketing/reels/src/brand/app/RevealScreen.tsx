import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { usePop } from '../motion';
import { usePhoneScreen } from '../PhoneFrame';
import { APP, APP_W, GUTTER } from './appTokens';
import { StatusBar } from './SongPlayScreen';

export type RevealResult = { name: string; how: string; points: number; color: string };

type Props = {
  theme: AppTheme;
  title: string;
  artist: string;
  album?: string;
  /** Cover inside public/ (Deezer cover_xl); empty → pink tile with a note. */
  cover?: string;
  /** "Bildin!" / "Bilemedin" pill (.rv-verdict). */
  won: boolean;
  results: RevealResult[];
  /** Local frame the cover pops in. */
  enterAt?: number;
};

/**
 * The song-guess reveal (PlayView Reveal + song.css .rv-*): tilted cover, "ŞARKI BUYDU" sticker, title,
 * artist · album, verdict pill, results card and the mint "Sonraki şarkı" button. Drawn at 393 px and scaled.
 */
export const RevealScreen: React.FC<Props> = ({ theme, title, artist, album, cover, won, results, enterAt = 0 }) => {
  const c = theme.colors;
  const screen = usePhoneScreen() ?? { width: 798, height: 1746 };
  const scale = screen.width / APP_W;
  const height = screen.height / scale;
  const pop = usePop(enterAt, 12);
  const late = usePop(enterAt + 10, 12);
  const pill: React.CSSProperties = {
    border: `${APP.bw}px solid ${c.ink}`,
    borderRadius: APP.pill,
    color: APP.ink2,
    fontWeight: 800,
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: c.bg }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: APP_W,
          height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          fontFamily: FONT_BODY,
          color: c.paper,
        }}
      >
        <StatusBar color={c.paper} island={c.ink} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            textAlign: 'center',
            boxSizing: 'border-box',
            padding: `96px ${GUTTER}px 24px`,
          }}
        >
          <div
            style={{
              width: 180,
              height: 180,
              margin: '4px 0 8px',
              overflow: 'hidden',
              border: `4px solid ${c.ink}`,
              borderRadius: 26,
              background: c.pink,
              boxShadow: `6px 6px 0 ${c.ink}`,
              transform: `rotate(${interpolate(pop, [0, 1], [-14, -3])}deg) scale(${interpolate(pop, [0, 1], [0.4, 1])})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
            }}
          >
            {cover ? <Img src={staticFile(cover)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '♪'}
          </div>
          <span
            style={{
              ...pill,
              padding: '5px 14px',
              background: c.yellow,
              fontSize: 13,
              letterSpacing: 2,
              textTransform: 'uppercase',
              transform: `rotate(-3deg) scale(${late})`,
            }}
          >
            Şarkı buydu
          </span>
          <h2 style={{ margin: '4px 0 0', fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: APP.text2 }}>
            {artist}
            {album ? ` · ${album}` : ''}
          </p>
          <p
            style={{
              ...pill,
              margin: '4px 0',
              padding: '6px 16px',
              background: won ? c.mint : APP.red,
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              transform: `rotate(2deg) scale(${late})`,
            }}
          >
            {won ? 'Bildin!' : 'Bilemedin'}
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              width: '100%',
              boxSizing: 'border-box',
              marginTop: 4,
              padding: 12,
              border: `${APP.bw}px solid ${c.ink}`,
              borderRadius: 18,
              background: APP.panel2,
            }}
          >
            {results.map((r) => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 14, fontWeight: 700, textAlign: 'left' }}>
                <span style={{ fontWeight: 800, color: r.color }}>{r.name}</span>
                <span style={{ color: APP.text2 }}>{r.how}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, color: c.yellow }}>+{r.points.toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              width: '100%',
              marginTop: 8,
              minHeight: 64,
              boxSizing: 'border-box',
              border: `${APP.bw}px solid ${c.ink}`,
              borderRadius: 20,
              background: c.mint,
              boxShadow: `0 6px 0 ${c.ink}`,
              color: APP.ink2,
              fontFamily: FONT_DISPLAY,
              fontSize: 24,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Sonraki şarkı
          </div>
        </div>
      </div>
    </div>
  );
};
