import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { NV, NeverCanvas, NeverCta, NeverTop, StatementCard } from './neverParts';
import { NV_TEXT, answeredLabel, percent, roundLabel, skipLabel, type NeverChoice } from './neverText';

export type { NeverChoice } from './neverText';

export type NeverAnswerProps = {
  theme: AppTheme;
  /** Full statement; a leading "Ben hiç" is dropped (the card shows "Ben hiç…" above it). */
  statement?: string;
  category?: string;
  round?: string;
  /** Raised fingers / finger count; maxLives omitted = room code instead of fingers. */
  lives?: number;
  maxLives?: number;
  code?: string;
  /** Seconds left and answer time; seconds omitted = untimed room (no strip, no "18 sn"). */
  seconds?: number;
  duration?: number;
  /** My (hidden) answer: pressed button, the other one dimmed, note switches to answeredNote. */
  choice?: NeverChoice;
  /** 0..1 press-down of each answer button (:active). */
  pressDid?: number;
  pressDidnt?: number;
  answered?: number;
  total?: number;
  /** Fill of the answered bar in % (default answered/total), for animating. */
  fill?: number;
  skipVotes?: number;
  skipNeeded?: number;
  /** Host's "Başka cümle getir" ghost next to skip (App Store 01.png leaves it out). */
  showNextStatement?: boolean;
  /** Host's yellow "Cevapları şimdi aç"; false = guest view. */
  isHost?: boolean;
  /** 0..1 press-down of the host button. */
  revealPress?: number;
  didLabel?: string;
  didNotLabel?: string;
  askNote?: string;
  answeredNote?: string;
  revealLabel?: string;
  nextStatementLabel?: string;
};

/**
 * Ben Hiç question phase (games/never/client PlayView Question + never.css), drawn at 393 px and scaled to the
 * PhoneFrame screen. Matches App Store ItirafKosesi 01.png.
 */
export const NeverAnswerScreen: React.FC<NeverAnswerProps> = ({
  theme,
  statement = 'Ben hiç eski sevgilimin sosyal medyasını gizlice incelemedim.',
  category = 'Aşk ve ilişki',
  round = roundLabel(5, 20),
  lives = 3,
  maxLives = 5,
  code,
  seconds = 18,
  duration = 30,
  choice,
  pressDid = 0,
  pressDidnt = 0,
  answered = 4,
  total = 6,
  fill,
  skipVotes = 1,
  skipNeeded = 4,
  showNextStatement = false,
  isHost = true,
  revealPress = 0,
  didLabel = NV_TEXT.did,
  didNotLabel = NV_TEXT.didNot,
  askNote = NV_TEXT.askNote,
  answeredNote = NV_TEXT.answeredNote,
  revealLabel = NV_TEXT.revealNow,
  nextStatementLabel = NV_TEXT.nextStatement,
}) => {
  const c = theme.colors;
  const pct = fill ?? percent(answered, total);
  const answer = (kind: NeverChoice, label: string, press: number) => {
    const pressed = choice === kind;
    // .nv-answer[aria-pressed]: 2 px drop, 5 px down; :active: 1 px drop, 4 px down.
    const drop = pressed ? 2 : 7 - 6 * press;
    const down = pressed ? 5 : 4 * press;
    return (
      <div
        style={{
          minHeight: 120,
          boxSizing: 'border-box',
          border: `${APP.bw}px solid ${c.ink}`,
          borderRadius: 24,
          background: kind === 'did' ? c.pink : c.paper,
          boxShadow: `0 ${drop}px 0 ${c.ink}`,
          transform: down ? `translateY(${down}px)` : undefined,
          outline: pressed ? `4px solid ${c.paper}` : undefined,
          outlineOffset: 2,
          opacity: choice && !pressed ? 0.55 : 1,
          color: APP.ink2,
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {label}
      </div>
    );
  };
  const ghost: React.CSSProperties = {
    minHeight: 46,
    boxSizing: 'border-box',
    padding: '0 10px',
    border: `2px solid ${NV.violet}`,
    borderRadius: 14,
    color: APP.text2,
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  };
  return (
    <NeverCanvas theme={theme}>
      <NeverTop theme={theme} round={round} lives={lives} maxLives={maxLives} code={code} />
      <StatementCard theme={theme} statement={statement} category={category} seconds={seconds} duration={duration} />
      <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 6 }}>
          {answer('did', didLabel, pressDid)}
          {answer('didnt', didNotLabel, pressDidnt)}
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: APP.text2, textAlign: 'center' }}>{choice ? answeredNote : askNote}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 800 }}>
          <div style={{ flex: 1, height: 10, overflow: 'hidden', borderRadius: APP.pill, background: APP.ink2 }}>
            <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: c.mint }} />
          </div>
          <span>{answeredLabel(answered, total)}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)', gap: 8 }}>
          <div style={ghost}>{skipLabel(skipVotes, skipNeeded)}</div>
          {isHost && showNextStatement && <div style={ghost}>{nextStatementLabel}</div>}
        </div>
        {isHost && answered > 0 && <NeverCta theme={theme} label={revealLabel} press={revealPress} />}
      </div>
    </NeverCanvas>
  );
};
