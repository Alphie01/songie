import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { MLCanvas } from './mostLikelyParts';
import { RFBig, RFCard, RFNote, RFTimer, RFTop, VoteIcon, voteColor } from './redFlagParts';
import { RF_TEXT, labelsFor, optionsFor, roundLabel, waitingLabel, type RedFlagVote } from './redFlagText';

export type { RedFlagVote } from './redFlagText';

export type RedFlagVoteProps = {
  theme: AppTheme;
  situation?: string;
  /** Category name on the pink chip. */
  category?: string;
  /** Sınır testi card: choices read Varım / Hayır / Sınırım. */
  limit?: boolean;
  /** Third option "Asla olmaz" (04.png shows it). */
  dealBreaker?: boolean;
  /** My (hidden) vote: pressed flag with a white ring, the others at 0.5, note switches to "Oyun gizli…". */
  myVote?: RedFlagVote;
  /** 0..1 press of flag `pressing` (default myVote) toward the pressed look. */
  votePress?: number;
  pressing?: RedFlagVote;
  /** Tahmin modu: the "Çoğunluk ne diyecek?" row (locked at 0.5 until I voted). */
  predict?: boolean;
  /** My majority guess: yellow option; guessPress 0..1 fades it in (the tap). */
  guess?: RedFlagVote;
  guessPress?: number;
  /** "5/6 kişi oy verdi". */
  voted?: number;
  total?: number;
  /** "Durum 7/20" (shown number); count null = unlimited. */
  index?: number;
  count?: number | null;
  code?: string;
  /** Seconds left / vote time; seconds omitted = untimed ("Süresiz"). */
  seconds?: number;
  duration?: number;
  /** Host: yellow "Oyları şimdi aç". */
  isHost?: boolean;
  /** Host's ghost "Durumu atla" under the CTA (04.png leaves it out). */
  showSkip?: boolean;
  /** 0..1 press-down of the host CTA. */
  revealPress?: number;
  /** Plays rf-card-in from this local frame; omitted = card already in. */
  enterAt?: number;
};

/** PlayView TILT: the flag cards' tilt in the design. */
const TILT = [-3, 1, 3];

/**
 * Red Flag vote phase (games/red-flag/client PlayView VotePanel + red-flag.css), drawn at 393 px and scaled to
 * the PhoneFrame screen. Matches App Store ItirafKosesi 04.png.
 */
export const RedFlagVoteScreen: React.FC<RedFlagVoteProps> = ({
  theme,
  situation = 'Kardeşin senin kıyafetlerini sormadan giyiyor.',
  category = 'Aile',
  limit = false,
  dealBreaker = true,
  myVote,
  votePress = 0,
  pressing,
  predict = true,
  guess,
  guessPress,
  voted = 5,
  total = 6,
  index = 7,
  count = 20,
  code = 'ODAK',
  seconds = 19,
  duration = 30,
  isHost = true,
  showSkip = false,
  revealPress = 0,
  enterAt,
}) => {
  const c = theme.colors;
  const options = optionsFor(dealBreaker || limit);
  const labels = labelsFor(limit);
  const short = limit ? RF_TEXT.limitVote : RF_TEXT.voteShort;
  const pressed = pressing ?? myVote;
  const guessFill = guessPress ?? (guess ? 1 : 0);

  return (
    <MLCanvas theme={theme}>
      <RFTop theme={theme} label={roundLabel(index, count)} code={code} />
      {seconds != null && duration > 0 ? (
        <RFTimer theme={theme} seconds={seconds} duration={duration} />
      ) : (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: APP.text3 }}>{RF_TEXT.untimed}</p>
      )}
      <RFCard theme={theme} situation={situation} category={category} enterAt={enterAt} />

      <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, lineHeight: 1.05 }}>{RF_TEXT.pick}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 10 }}>
          {options.map((v, i) => {
            // .rf-flag[aria-pressed]: 2 px drop, 4 px down, 4 px white outline (offset 2).
            const p = v === myVote ? 1 : v === pressed ? votePress : 0;
            return (
              <div
                key={v}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 128,
                  boxSizing: 'border-box',
                  padding: 6,
                  border: `${APP.bw}px solid ${c.ink}`,
                  borderRadius: 22,
                  background: voteColor(theme, v),
                  color: APP.ink2,
                  boxShadow: `0 ${6 - 4 * p}px 0 ${c.ink}`,
                  outline: p > 0 ? `4px solid rgba(255,255,255,${p})` : undefined,
                  outlineOffset: 2,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 17,
                  fontWeight: 800,
                  lineHeight: 1,
                  textAlign: 'center',
                  transform: `rotate(${TILT[i]}deg) translateY(${4 * p}px)`,
                  opacity: myVote && v !== myVote ? 0.5 : 1,
                }}
              >
                <VoteIcon vote={v} size={40} />
                <span>{labels[v]}</span>
              </div>
            );
          })}
        </div>

        <RFNote>{myVote ? RF_TEXT.picked : RF_TEXT.pickHint}</RFNote>

        {predict && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '10px 12px',
              border: `2px solid ${c.ink}`,
              borderRadius: 16,
              background: APP.panel2,
              opacity: myVote ? 1 : 0.5,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
              {RF_TEXT.guessTitle}{' '}
              <span style={{ fontSize: 12, fontWeight: 700, color: APP.text3 }}>{myVote ? RF_TEXT.guessHint : RF_TEXT.guessFirst}</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 6 }}>
              {options.map((v) => {
                const on = v === guess ? guessFill : 0;
                return (
                  <div
                    key={v}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 40,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      border: `2px solid ${c.ink}`,
                      borderRadius: 12,
                      background: c.panel,
                      color: on > 0.5 ? APP.ink2 : c.paper,
                      fontSize: 14,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {on > 0 && <span style={{ position: 'absolute', inset: 0, background: c.yellow, opacity: on }} />}
                    <span style={{ position: 'relative' }}>{short[v]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, textAlign: 'center' }}>{waitingLabel(voted, total)}</p>

        {isHost && (
          <>
            <RFBig theme={theme} label={RF_TEXT.revealNow} press={revealPress} />
            {showSkip && (
              <div
                style={{
                  alignSelf: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 44,
                  boxSizing: 'border-box',
                  padding: '0 14px',
                  border: '2px solid #6e5fc4',
                  borderRadius: 14,
                  color: APP.text2,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {RF_TEXT.skip}
              </div>
            )}
          </>
        )}
      </div>
    </MLCanvas>
  );
};
