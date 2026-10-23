import React from 'react';
import { interpolate } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { usePop } from '../motion';
import { MLCanvas } from './mostLikelyParts';
import { RFBar, RFBig, RFCard, RFNote, RFTop, voteColor } from './redFlagParts';
import {
  RF_TEXT,
  countVotes,
  labelsFor,
  majorityOf,
  nextInLabel,
  optionsFor,
  pct,
  readyCountLabel,
  roundLabel,
  verdictLabel,
  youLine,
  type RedFlagCounts,
  type RedFlagVote,
} from './redFlagText';

export type RedFlagBallot = { name: string; vote: RedFlagVote };

export type RedFlagRevealProps = {
  theme: AppTheme;
  situation?: string;
  category?: string;
  limit?: boolean;
  dealBreaker?: boolean;
  /** Open votes: who said what (names under each row; my nick reads "sen"). */
  ballots?: RedFlagBallot[];
  /** İsimsiz mod: counts only, no names, "İsimsiz mod…" note. Overrides ballots for the split. */
  counts?: RedFlagCounts;
  /** My nick in ballots ("sen"). */
  me?: string;
  myVote?: RedFlagVote | null;
  /** Tahmin modu + my guess (null = no guess): "Tahminin tuttu, +1" / "Tahminin … idi, tutmadı". */
  predict?: boolean;
  myGuess?: RedFlagVote | null;
  index?: number;
  count?: number | null;
  code?: string;
  /** Tartışma süresi left: pink "Tartışın… 12" sticker; omitted = untimed discussion. */
  discussSeconds?: number;
  /** "4/6 kişi hazır…" */
  ready?: number;
  voters?: number;
  /** Host: yellow "Sonraki durum" (locked = "Tartışın… 3", 0.6); guest: "Hazırım" / mint "Hazırsın". */
  isHost?: boolean;
  lockSeconds?: number;
  iAmReady?: boolean;
  nextPress?: number;
  /** Local frame the card comes in; bar, verdict, rows and the "Sen:" line pop after it. */
  enterAt?: number;
};

/**
 * Red Flag reveal phase (games/red-flag/client PlayView Reveal + Bar + red-flag.css): the card with the split bar,
 * the verdict in the majority's color, a row per option with count · %, names, my line and the next button.
 */
export const RedFlagRevealScreen: React.FC<RedFlagRevealProps> = ({
  theme,
  situation = 'Kardeşin senin kıyafetlerini sormadan giyiyor.',
  category = 'Aile',
  limit = false,
  dealBreaker = true,
  ballots = [
    { name: 'Ece', vote: 'red' },
    { name: 'Mert', vote: 'green' },
    { name: 'Deniz', vote: 'red' },
    { name: 'Kaan', vote: 'never' },
    { name: 'Zeynep', vote: 'red' },
    { name: 'Bora', vote: 'green' },
  ],
  counts,
  me = 'Ece',
  myVote = 'red',
  predict = true,
  myGuess = 'red',
  index = 7,
  count = 20,
  code = 'ODAK',
  discussSeconds = 18,
  ready = 2,
  voters = 6,
  isHost = true,
  lockSeconds = 0,
  iAmReady = false,
  nextPress = 0,
  enterAt = 0,
}) => {
  const c = theme.colors;
  const options = optionsFor(dealBreaker || limit);
  const labels = labelsFor(limit);
  const anonymous = counts != null;
  const split = counts ?? countVotes(ballots);
  const total = split.green + split.red + split.never;
  const majority = majorityOf(split);
  const top = majority.length === 1 ? majority[0] : undefined;
  const you = youLine(myVote, predict ? myGuess : null, majority, predict, labels);
  const nick = (n: string) => (n === me ? RF_TEXT.you : n);

  const verdictPop = usePop(enterAt + 12, 11);
  // One pop per possible row (fixed hook count), 4 frames apart.
  const rows = [usePop(enterAt + 16, 13), usePop(enterAt + 20, 13), usePop(enterAt + 24, 13)];
  const youPop = usePop(enterAt + 16 + options.length * 4 + 4, 12);
  const fade = (p: number) => Math.min(1, p * 1.5);

  return (
    <MLCanvas theme={theme}>
      <RFTop theme={theme} label={roundLabel(index, count)} code={code} />
      <RFCard theme={theme} situation={situation} category={category} enterAt={enterAt}>
        <RFBar theme={theme} counts={split} options={options} enterAt={enterAt + 6} />
      </RFCard>

      <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 10 }}>
        <p
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1,
            color: top ? voteColor(theme, top) : c.paper,
            opacity: fade(verdictPop),
            transform: `scale(${interpolate(verdictPop, [0, 1], [0.8, 1])})`,
            transformOrigin: 'left center',
          }}
        >
          {verdictLabel(split, options, labels)}
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          {options.map((v, i) => {
            const names = anonymous ? [] : ballots.filter((b) => b.vote === v).map((b) => nick(b.name));
            const isTop = v === top;
            return (
              <div
                key={v}
                style={{
                  padding: '8px 12px',
                  border: `2px solid ${c.ink}`,
                  borderRadius: 14,
                  background: isTop ? voteColor(theme, v) : c.panel,
                  color: isTop ? APP.ink2 : c.paper,
                  fontWeight: 800,
                  opacity: fade(rows[i]!),
                  transform: `translateY(${(1 - Math.min(1, rows[i]!)) * 12}px)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 'none', width: 14, height: 14, borderRadius: 4, background: isTop ? APP.ink2 : voteColor(theme, v) }} />
                  <span style={{ flex: 1 }}>{labels[v]}</span>
                  <span>
                    {split[v]} · %{pct(split[v], total)}
                  </span>
                </div>
                {names.length > 0 && (
                  <p style={{ margin: '4px 0 0 24px', fontSize: 13, fontWeight: 700, opacity: 0.85, overflowWrap: 'anywhere' }}>{names.join(', ')}</p>
                )}
              </div>
            );
          })}
        </div>

        {you && <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: c.yellow, opacity: fade(youPop) }}>{you}</p>}
        {anonymous && <RFNote>{RF_TEXT.anonNote}</RFNote>}

        <div style={{ flex: 1 }} />
        {discussSeconds != null && (
          <span
            style={{
              alignSelf: 'center',
              padding: '6px 14px',
              border: `2px solid ${c.ink}`,
              borderRadius: APP.pill,
              background: c.pink,
              color: APP.ink2,
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 800,
              transform: 'rotate(-2deg)',
            }}
          >
            {nextInLabel(Math.ceil(discussSeconds))}
          </span>
        )}
        <RFNote dim>{readyCountLabel(ready, voters, discussSeconds != null)}</RFNote>
        {isHost ? (
          <RFBig
            theme={theme}
            label={lockSeconds > 0 ? `${RF_TEXT.discussing} ${Math.ceil(lockSeconds)}` : RF_TEXT.next}
            disabled={lockSeconds > 0}
            press={nextPress}
          />
        ) : (
          <RFBig theme={theme} label={iAmReady ? RF_TEXT.readyDone : RF_TEXT.ready} done={iAmReady} press={nextPress} />
        )}
      </div>
    </MLCanvas>
  );
};
