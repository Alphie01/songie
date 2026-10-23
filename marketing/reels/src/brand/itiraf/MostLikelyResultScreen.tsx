import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { usePop } from '../motion';
import { NeverAvatar } from './neverParts';
import { ML, MLCanvas, MLCta, MLQuestion, MLTop, avatarColor } from './mostLikelyParts';
import { ML_TEXT, barWidth, correctGuessLabel, joinNames, roundLabel, tally, titleOf, winnerLine } from './mostLikelyText';

export type MLBallot = { voter: string; target: string };
export type MLTitle = { text: string; winners: string[] };

export type MostLikelyResultProps = {
  theme: AppTheme;
  question?: string;
  /** Present players in the app's order (everyone gets a bar, 0 included). */
  players?: string[];
  /** My nick: "sen" in the "Oy verenler" / guessers lines. */
  me?: string;
  /** Votes per nick; winners = everyone on the top count (tie = shared title). */
  votes?: Record<string, number>;
  /** Open votes only: who voted whom ("Oy verenler: Ece ve sen" under each bar); omitted = anonymous room. */
  ballots?: MLBallot[];
  /** Tahmin modu: who guessed the winner (mint line, [] = "Kimse doğru tahmin etmedi."); omitted = predict off. */
  correctGuessers?: string[];
  index?: number;
  count?: number | null;
  code?: string;
  /** Host: yellow "Sıradaki soru" ("Sonuçları gör" on the last question); guest: "Oda sahibi sıradaki…". */
  isHost?: boolean;
  /** 0..1 press-down of the host CTA. */
  nextPress?: number;
  /** "Unvan geçmişi" panel under the stage (.ml-more), newest first; omitted = not shown. */
  history?: MLTitle[];
  avatarColors?: Record<string, string>;
  /** Local frame the winner card pops; the bars grow after it, then the guessers line. */
  enterAt?: number;
};

/**
 * Aramızdaki En results (games/most-likely/client PlayView Reveal + most-likely.css): yellow winner card with
 * the title, a bar per player in their avatar color, open-vote voters, guessers and the host's next button.
 */
export const MostLikelyResultScreen: React.FC<MostLikelyResultProps> = ({
  theme,
  question = 'alarmı çok erteleyen',
  players = ['Ece', 'Mert', 'Deniz', 'Kaan', 'Zeynep', 'Bora'],
  me = 'Ece',
  votes = { Kaan: 3, Mert: 2, Bora: 1 },
  ballots,
  correctGuessers,
  index = 3,
  count = 10,
  code = 'ODAK',
  isHost = true,
  nextPress = 0,
  history,
  avatarColors,
  enterAt = 0,
}) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nick = (p: string) => (p === me ? ML_TEXT.you : p);
  const color = (p: string) => avatarColor(p, avatarColors, Math.max(0, players.indexOf(p)));
  const r = tally(players, votes);
  const last = count != null && index >= count;
  const tie = r.winners.length > 1;
  const pop = usePop(enterAt, 11);
  const barStart = (i: number) => enterAt + 10 + i * 3;
  const guessPop = usePop(barStart(r.rows.length) + 6, 12);
  // .ml-bar-fill: ml-grow 500 ms ease-out from scaleX(0).
  const grow = (i: number) =>
    interpolate(frame - barStart(i), [0, 0.5 * fps], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    });

  return (
    <MLCanvas theme={theme}>
      <MLTop theme={theme} label={roundLabel(index, count)} code={code} />
      <MLQuestion theme={theme} text={question} />

      <div style={{ display: 'flex', flex: history ? 'none' : '1 1 auto', flexDirection: 'column', gap: 10 }}>
        {r.winners.length ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 14,
              border: `${APP.bw}px solid ${c.ink}`,
              borderRadius: 22,
              background: c.yellow,
              color: APP.ink2,
              boxShadow: `0 6px 0 ${c.ink}`,
              transform: `rotate(-1.5deg) scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
              opacity: Math.min(1, pop * 1.5),
            }}
          >
            <span style={{ display: 'flex', flex: 'none' }}>
              {r.winners.map((w, i) => (
                <span key={w} style={{ marginLeft: i ? -14 : 0, display: 'inline-flex' }}>
                  <NeverAvatar theme={theme} nick={w} color={color(w)} size={tie ? 52 : 68} />
                </span>
              ))}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5 }}>
                {/* text-transform: uppercase under lang="tr" */}
                {(tie ? ML_TEXT.winnerTie : ML_TEXT.winnerOne).toLocaleUpperCase('tr-TR')}
              </span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, lineHeight: 1, overflowWrap: 'anywhere' }}>
                {joinNames(r.winners)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{winnerLine(titleOf(question), r.max)}</span>
            </span>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              padding: 14,
              border: `${APP.bw}px dashed ${ML.violet}`,
              borderRadius: 18,
              fontWeight: 800,
              textAlign: 'center',
              color: APP.text2,
              opacity: Math.min(1, pop * 1.5),
            }}
          >
            {ML_TEXT.noVotes}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {r.rows.map((row, i) => {
            const voters = (ballots ?? []).filter((b) => b.target === row.id).map((b) => b.voter);
            const zero = row.votes === 0;
            return (
              <div key={row.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: zero ? APP.text3 : undefined }}>
                  <span style={{ flex: 'none', width: 56, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.id}</span>
                  <span style={{ flex: 1, height: 16, borderRadius: APP.pill, background: APP.panel2 }}>
                    {!zero && (
                      <span
                        style={{
                          display: 'block',
                          height: '100%',
                          width: `${barWidth(row.votes, r.total)}%`,
                          borderRadius: APP.pill,
                          background: color(row.id),
                          transform: `scaleX(${grow(i)})`,
                          transformOrigin: 'left',
                        }}
                      />
                    )}
                  </span>
                  <span style={{ flex: 'none', width: 18 }}>{row.votes}</span>
                </div>
                {ballots && voters.length > 0 && (
                  <p style={{ margin: 0, paddingLeft: 64, fontSize: 12, fontWeight: 700, color: APP.text3 }}>
                    {ML_TEXT.votedBy}: {joinNames(voters.map(nick))}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {correctGuessers && (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: c.mint, opacity: Math.min(1, guessPop * 1.5) }}>
            {correctGuessers.length ? correctGuessLabel(joinNames(correctGuessers.map(nick))) : ML_TEXT.nobodyGuessed}
          </p>
        )}

        <div style={{ flex: 1 }} />

        {isHost ? (
          <MLCta theme={theme} label={last ? ML_TEXT.finish : ML_TEXT.next} press={nextPress} />
        ) : (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: APP.text3, textAlign: 'center' }}>{ML_TEXT.waitHost}</p>
        )}
      </div>

      {history && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 16,
            padding: '12px 14px',
            border: `${APP.bw}px solid ${c.ink}`,
            borderRadius: 20,
            background: APP.panel2,
            flex: 'none',
          }}
        >
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{ML_TEXT.history}</h2>
          {history.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: APP.text3 }}>{ML_TEXT.historyEmpty}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: 14, fontWeight: 800 }}>
                  <span>{joinNames(h.winners)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: APP.text2 }}>{titleOf(h.text)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </MLCanvas>
  );
};
