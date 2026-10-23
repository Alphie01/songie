import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { NeverAvatar } from './neverParts';
import { MLCanvas, avatarColor } from './mostLikelyParts';
import { PN, PNConfirm, PNHint, PNLabel, PNProgress, PNSecret, PNTop, useCssAnim } from './paranoiaParts';
import { PN_TEXT, answerOf, askedTo, pillLabel, revealHead, voteLabel, votedLabel, type ParanoiaHow } from './paranoiaText';

export type ParanoiaHistoryEntry = { n: number; question: string; asked: string; answer: string | null };

export type ParanoiaRevealProps = {
  theme: AppTheme;
  question?: string;
  /** Who got the question ("Kaan'a soruldu"). */
  asked?: string;
  /** Their answer; null = "Cevap vermedi" (paper-2 card). */
  answer?: string | null;
  /** How the answer came (timeout / host notes under the name). */
  how?: ParanoiaHow;
  /** My nick: "(sen)" after the answer when it is me. */
  me?: string;
  /** Revealed number (this one) and the total. */
  n?: number;
  total?: number;
  mode?: string;
  code?: string;
  /**
   * How far the stage is: 0 = question card, 1 = + "Kaan'a soruldu", 2 = + the answer card.
   * Each part plays its own CSS entrance (pr-rise 500 ms / pr-rise 400 ms / pr-drop 500 ms) at enterAt,
   * toAt and answerAt (defaults: the app's 0 / 900 / 1900 ms after enterAt).
   */
  step?: 0 | 1 | 2;
  enterAt?: number;
  toAt?: number;
  answerAt?: number;
  /**
   * Footer: host = yellow "Sıradaki soruyu aç" (last = "Özeti göster"); vote = guest vote button
   * "Sıradakine geç (2/4)" (myVote = off "Oyun verildi"); guest = "Sıradaki soruyu oda sahibi açacak."
   */
  footer?: 'host' | 'vote' | 'guest';
  last?: boolean;
  votes?: number;
  votesNeeded?: number;
  myVote?: boolean;
  /** Host votes counter when revealBy = vote. */
  revealByVote?: boolean;
  /** Footer locked (0.6) until the stage is done; default = 2.9 s after enterAt (STAGE_MS), else ready. */
  ready?: boolean;
  nextPress?: number;
  /** "Açılan sorular" list (newest first) under the footer. */
  history?: ParanoiaHistoryEntry[];
  avatarColors?: Record<string, string>;
};

const DROP = Easing.bezier(0.2, 1.4, 0.4, 1);

/**
 * Gizlilik Esas reveal (games/paranoia/client PlayView Reveal + Stage + paranoia.css .pr-stage): the question card,
 * who it was asked to, then the answer drops in; next / vote footer and the history list.
 */
export const ParanoiaRevealScreen: React.FC<ParanoiaRevealProps> = ({
  theme,
  question = 'Aramızda kim eski sevgilisinin profiline hâlâ bakıyor?',
  asked = 'Kaan',
  answer = 'Zeynep',
  how = 'chosen',
  me = 'Ece',
  n = 3,
  total = 10,
  mode = PN_TEXT.name,
  code = 'ODAK',
  step = 2,
  enterAt,
  toAt,
  answerAt,
  footer = 'host',
  last = false,
  votes = 0,
  votesNeeded = 4,
  myVote = false,
  revealByVote = false,
  ready,
  nextPress = 0,
  history = [],
  avatarColors,
}) => {
  const c = theme.colors;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = (ms: number) => (enterAt == null ? undefined : enterAt + (ms / 1000) * fps);
  const qT = useCssAnim(enterAt, 500);
  const toT = useCssAnim(toAt ?? at(900), 400);
  const ansT = useCssAnim(answerAt ?? at(1900), 500, 0, DROP);
  const isReady = ready ?? (enterAt == null || frame >= enterAt + 2.9 * fps);
  const color = (nick: string) => avatarColor(nick, avatarColors, 0);
  const note = PN_TEXT.how[how];

  const footerEl =
    footer === 'host' ? (
      <PNConfirm
        theme={theme}
        on
        disabled={!isReady}
        press={isReady ? nextPress : 0}
        label={
          <>
            {last ? PN_TEXT.last : PN_TEXT.next}
            {revealByVote && votes > 0 && (
              <span style={{ fontSize: 16 }}>
                {' '}
                {votes}/{votesNeeded}
              </span>
            )}
          </>
        }
      />
    ) : footer === 'vote' ? (
      <PNConfirm
        theme={theme}
        on={!myVote}
        disabled={!isReady || myVote}
        press={isReady && !myVote ? nextPress : 0}
        label={myVote ? votedLabel(votes, votesNeeded) : voteLabel(votes, votesNeeded)}
      />
    ) : (
      <PNHint center>{PN_TEXT.hostWillOpen}</PNHint>
    );

  return (
    <MLCanvas theme={theme}>
      <PNTop theme={theme} label={pillLabel(n, total, mode)} code={code} />
      <PNProgress theme={theme} done={n - 1} total={total} />

      <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PNSecret
            theme={theme}
            head={revealHead(n, total)}
            question={question}
            style={{ opacity: qT, transform: `translateY(${(1 - qT) * 10}px) rotate(-1deg)` }}
          >
            {step >= 1 && (
              <p
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 800,
                  color: APP.text2,
                  opacity: toT,
                  transform: toT < 1 ? `translateY(${(1 - toT) * 10}px) rotate(${-(1 - toT)}deg)` : undefined,
                }}
              >
                <NeverAvatar theme={theme} nick={asked} color={color(asked)} size={28} />
                {askedTo(asked)}
              </p>
            )}
          </PNSecret>

          {step >= 2 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '16px 18px',
                border: `${APP.bw}px solid ${c.ink}`,
                borderRadius: 24,
                background: answer ? c.mint : PN.paper2,
                color: APP.ink2,
                boxShadow: `${PN.shadowLg}px ${PN.shadowLg}px 0 ${c.ink}`,
                opacity: interpolate(ansT, [0, 1], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(ansT, [0, 1], [-16, 0])}px) rotate(${interpolate(ansT, [0, 1], [-4, 1.5])}deg) scale(${interpolate(ansT, [0, 1], [0.9, 1])})`,
                flex: 'none',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800 }}>{answerOf(asked)}</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 34,
                  fontWeight: 800,
                  lineHeight: 1,
                  overflowWrap: 'anywhere',
                }}
              >
                {answer ? (
                  <>
                    <NeverAvatar theme={theme} nick={answer} color={color(answer)} size={44} />
                    <span>
                      {answer}
                      {answer === me && <span style={{ fontSize: 18 }}> ({PN_TEXT.you})</span>}
                    </span>
                  </>
                ) : (
                  PN_TEXT.noAnswer
                )}
              </span>
              {note && <span style={{ fontSize: 13, fontWeight: 700 }}>{note}</span>}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
        {footerEl}

        {history.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            <PNLabel>{PN_TEXT.history}</PNLabel>
            {history.map((e) => (
              <div
                key={e.n}
                style={{ display: 'flex', gap: 10, padding: '10px 12px', border: `2px solid ${c.ink}`, borderRadius: 16, background: APP.panel2 }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    flex: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    boxSizing: 'border-box',
                    border: `2px solid ${c.ink}`,
                    borderRadius: '50%',
                    background: c.yellow,
                    color: APP.ink2,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {e.n}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{e.question}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: APP.text3 }}>
                    {askedTo(e.asked)} → <strong style={{ color: c.yellow }}>{e.answer ?? PN_TEXT.noAnswer}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MLCanvas>
  );
};
