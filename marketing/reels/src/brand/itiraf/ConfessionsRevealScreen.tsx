import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { usePop } from '../motion';
import {
  ConfAsk,
  ConfBox,
  ConfCanvas,
  ConfFoot,
  ConfGrid,
  ConfHead,
  ConfNote,
  ConfPick,
  ConfReactions,
  ConfTimer,
  GhostButton,
  HostBox,
  TopicSmall,
  type PickState,
} from './confessionsParts';
import {
  CF_TEXT,
  authorLabel,
  confessionOf,
  detailLabel,
  fooledCount,
  revealFoot,
  votesLabel,
  type ReactionCounts,
  type ReactionKey,
} from './confessionsText';

export type ConfessionScore = { nick: string; score: number; correct: number; fooled: number };

export type ConfessionsRevealProps = {
  theme: AppTheme;
  confession: string;
  /** The writer (mint button, "Yazan: Mert"). */
  author: string;
  topic?: string;
  /** Candidates in the app's order; `me` among them is "Bu benim" and the headline says "Yazan: Sen". */
  players?: string[];
  me?: string;
  /** My guess: red when wrong, the foot says "Bildin!" / "Bilemedin.". */
  selected?: string;
  /** Votes per candidate ("2 oy"); missing = 0. */
  votes?: Record<string, number>;
  /** Who guessed right ("Bilenler: Deniz, sen"); default = nobody. */
  correct?: string[];
  /** People the author fooled (= the author's points); default = all votes on someone else. */
  fooled?: number;
  reactions?: ReactionCounts;
  myReactions?: ReactionKey[];
  index?: number;
  count?: number;
  code?: string;
  /** Auto-advance countdown (violet strip, no number); omitted = untimed. */
  seconds?: number;
  duration?: number;
  /** Host's ghost "Sıradaki itiraf" (or "Sonraki tura geç" on the last one) + "İtirafı gizle". */
  isHost?: boolean;
  /** Score box under the column (.cf-after Puanlar, mobile only); omitted = not shown. */
  scores?: ConfessionScore[];
  /** Push the foot/host to the bottom like the guess screen in 02.png. */
  footAtBottom?: boolean;
  /** Local frame the headline unmasks; votes, the author button and the foot follow. */
  enterAt?: number;
};

/**
 * Gizli İtiraflar reveal of one confession (games/confessions/client PlayView Confession in the reveal phase +
 * confessions.css): "Yazan: X" unmasks from a blur, the author's button turns mint, my wrong pick red, each
 * button shows its votes, and the foot says who guessed right and how many the author fooled.
 */
export const ConfessionsRevealScreen: React.FC<ConfessionsRevealProps> = ({
  theme,
  confession,
  author,
  topic,
  players = ['Sen', 'Mert', 'Deniz', 'Kaan', 'Zeynep', 'Bora'],
  me = 'Sen',
  selected,
  votes = {},
  correct = [],
  fooled,
  reactions = { yok: 0, bende: 0, efsane: 0, olamaz: 0 },
  myReactions = [],
  index = 3,
  count = 6,
  code = 'ODAK',
  seconds,
  duration = 8,
  isHost = false,
  scores,
  footAtBottom = true,
  enterAt = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // .cf-ask[data-reveal]: 900 ms blur(10px) → 0 and fade in, cubic-bezier(0.2, 0.7, 0.1, 1).
  const unmask = interpolate(frame - enterAt, [0, 0.9 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.7, 0.1, 1),
  });
  const label = (nick: string) => (nick === me ? CF_TEXT.me : nick);
  const headline = authorLabel(author === me ? 'Sen' : author);
  const foot = revealFoot({ author, me, pick: selected, fooled: fooled ?? fooledCount(votes, author), correct });
  const footPop = usePop(enterAt + 12 + players.length * 2, 12);
  const stateOf = (nick: string): PickState => (nick === author ? 'author' : nick === selected ? 'wrong' : 'idle');
  return (
    <ConfCanvas theme={theme}>
      <ConfHead theme={theme} label={confessionOf(index, count)} code={code} />
      <ConfTimer theme={theme} seconds={seconds} duration={duration} quiet />
      {topic && <TopicSmall text={topic} />}
      <ConfNote theme={theme} text={confession} />
      <ConfReactions theme={theme} counts={reactions} mine={myReactions} />
      <ConfAsk text={headline} style={{ opacity: unmask, filter: unmask < 1 ? `blur(${10 * (1 - unmask)}px)` : undefined }} />
      <ConfGrid>
        {players.map((p, i) => (
          <RevealPick key={p} theme={theme} label={label(p)} state={stateOf(p)} votes={votes[p] ?? 0} enterAt={enterAt + 8 + i * 2} />
        ))}
      </ConfGrid>
      {footAtBottom && <div style={{ flex: 1 }} />}
      <ConfFoot
        theme={theme}
        line={foot.line}
        sub={foot.sub}
        tone={foot.tone}
        style={{ transform: `scale(${interpolate(footPop, [0, 1], [0.85, 1])})`, opacity: Math.min(1, footPop * 1.5) }}
      />
      {isHost && (
        <HostBox>
          <GhostButton label={index >= count ? CF_TEXT.nextRound : CF_TEXT.next} />
          <GhostButton label={CF_TEXT.hide} />
        </HostBox>
      )}
      {scores && scores.length > 0 && (
        <div style={{ marginTop: 10, flex: 'none' }}>
          <ConfBox theme={theme} title={CF_TEXT.scores} radius={18} padding={12}>
            <div style={{ display: 'grid', gap: 6 }}>
              {[...scores]
                .sort((a, b) => b.score - a.score)
                .map((s, i) => (
                  <div
                    key={s.nick}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: 14,
                      fontWeight: 800,
                      color: s.nick === me ? theme.colors.yellow : theme.colors.paper,
                    }}
                  >
                    <span style={{ display: 'grid', minWidth: 0 }}>
                      {i + 1}. {s.nick === me ? 'Sen' : s.nick}
                      <small style={{ fontSize: 11, fontWeight: 700, color: APP.text3 }}>{detailLabel(s.correct, s.fooled)}</small>
                    </span>
                    <span>{s.score}</span>
                  </div>
                ))}
            </div>
          </ConfBox>
        </div>
      )}
    </ConfCanvas>
  );
};

/** A reveal pick: its colour lands with a small pop, then the "2 oy" line. */
const RevealPick: React.FC<{ theme: AppTheme; label: string; state: PickState; votes: number; enterAt: number }> = ({
  theme,
  label,
  state,
  votes,
  enterAt,
}) => {
  const pop = usePop(enterAt, 11);
  const on = pop > 0.5;
  return (
    <ConfPick
      theme={theme}
      label={label}
      state={on ? state : 'idle'}
      votes={votesLabel(votes)}
      style={{
        transform: state === 'idle' ? undefined : `scale(${interpolate(pop, [0, 1], [0.9, 1])})`,
        fontFamily: FONT_DISPLAY,
      }}
    />
  );
};
