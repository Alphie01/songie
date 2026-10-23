import React from 'react';
import type { AppTheme } from '../../themes/types';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { usePhoneScreen } from '../PhoneFrame';
import { APP, APP_W, CLIPS, GUTTER, clipTr } from './appTokens';
import { GuessBox } from './GuessBox';
import { LiveFeed, type FeedLine } from './LiveFeed';
import { PlayButton } from './PlayButton';
import { Scoreboard, type ScoreRow } from './Scoreboard';
import { StageBar } from './StageBar';
import { Waveform } from './Waveform';

export type { FeedLine } from './LiveFeed';
export type { ScoreRow } from './Scoreboard';

type Props = {
  theme: AppTheme;
  /** Open stage 0..4 (0,1 / 0,5 / 2 / 8 / 15 sn). */
  stage: number;
  feed: FeedLine[];
  scores: ScoreRow[];
  guess?: string;
  playing: boolean;
  suggestions?: string[];
  selected?: number;
  caret?: boolean;
  /** Seconds left (yellow number next to the waveform); omitted = untimed room. */
  timer?: number;
  /** Line under the search box. */
  status?: string;
  round?: string;
  code?: string;
  /** 0..1 press-down of the play button. */
  press?: number;
};

/** iOS status bar as in the App Store shots: 9:41, dynamic island, signal / wifi / battery. */
const StatusBar: React.FC<{ color: string; island: string }> = ({ color, island }) => (
  <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 54 }}>
    <span style={{ position: 'absolute', left: 40, top: 21, fontSize: 17, fontWeight: 800, lineHeight: '22px', color }}>
      9:41
    </span>
    <span style={{ position: 'absolute', left: (APP_W - 126) / 2, top: 12, width: 126, height: 37, borderRadius: 20, background: island }} />
    <svg style={{ position: 'absolute', right: 34, top: 25 }} width={72} height={14} viewBox="0 0 72 14" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={10 - i * 3} width={3.2} height={4 + i * 3} rx={0.8} fill={color} />
      ))}
      <path d="M29 4.2a10 10 0 0 1 13 0M31.3 7a6.6 6.6 0 0 1 8.4 0M33.6 9.8a3 3 0 0 1 3.8 0" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      <rect x={46.5} y={1.5} width={22} height={11} rx={3.2} stroke={color} strokeOpacity={0.45} fill="none" />
      <rect x={48.5} y={3.5} width={18} height={7} rx={1.8} fill={color} />
      <rect x={69.5} y={5} width={1.6} height={4} rx={0.8} fill={color} fillOpacity={0.45} />
    </svg>
  </div>
);

/**
 * The song-guess play screen (PlayView.tsx + song.css, mobile column), drawn at 393 CSS px wide with the
 * app's own numbers and scaled to fill the PhoneFrame screen. Matches App Store 02.png / 03.png.
 */
export const SongPlayScreen: React.FC<Props> = ({
  theme,
  stage,
  feed,
  scores,
  guess,
  playing,
  suggestions,
  selected,
  caret,
  timer,
  status = '2 kişi bekleniyor. Açılmış parçalara çubuktan dokunup tekrar dinleyebilirsin.',
  round = 'Tur 4/10',
  code = 'ODAK',
  press = 0,
}) => {
  const c = theme.colors;
  const screen = usePhoneScreen() ?? { width: 798, height: 1746 };
  const scale = screen.width / APP_W;
  const height = screen.height / scale;
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
            gap: 14,
            height: '100%',
            boxSizing: 'border-box',
            padding: `72px ${GUTTER}px 24px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                padding: '7px 14px',
                border: `${APP.bw}px solid ${c.ink}`,
                borderRadius: APP.pill,
                background: c.pink,
                color: APP.ink2,
                fontFamily: FONT_DISPLAY,
                fontSize: 16,
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              {round}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: APP.text3 }}>{code}</span>
          </div>

          <StageBar theme={theme} stage={stage} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <PlayButton theme={theme} playing={playing} press={press} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Waveform theme={theme} playing={playing} />
              {timer !== undefined && (
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, lineHeight: 1, color: c.yellow }}>
                  {timer}
                </span>
              )}
            </div>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: APP.pill,
                background: APP.ink2,
                color: c.yellow,
                fontSize: 13,
                fontWeight: 800,
                textAlign: 'center',
              }}
            >
              Sadece {clipTr(CLIPS[stage]!)} saniye! Kulağını aç.
            </span>
          </div>

          <GuessBox theme={theme} guess={guess} suggestions={suggestions} selected={selected} caret={caret} />

          {status && (
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: APP.text2, textAlign: 'center' }}>{status}</p>
          )}

          <LiveFeed theme={theme} lines={feed} />

          <div style={{ flex: 1 }} />

          <Scoreboard theme={theme} rows={scores} />
        </div>
      </div>
    </div>
  );
};
