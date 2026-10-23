import React from 'react';
import { interpolate } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { usePop } from '../motion';
import { AVATAR_COLORS, NeverAvatar, NeverCanvas, NeverCta, NeverTop, StatementCard } from './neverParts';
import {
  NV_TEXT,
  doerLivesLabel,
  eliminatedLabel,
  leaderLabel,
  percent,
  revealHeadline,
  roundLabel,
  storytellerLabel,
  unansweredLabel,
  yourAnswerLabel,
  type NeverChoice,
} from './neverText';

export type NeverRevealProps = {
  theme: AppTheme;
  statement: string;
  category: string;
  /** Nicks that answered "Yaptım" / "Yapmadım" (answered = both together). */
  did: string[];
  didnt: string[];
  round?: string;
  /** My fingers after this round; maxLives omitted = room code instead. */
  lives?: number;
  maxLives?: number;
  code?: string;
  /** "Sen: yaptım" line; omitted = no line. */
  you?: NeverChoice;
  /** Active players who did not answer ("2 kişi cevap vermedi"). */
  unanswered?: number;
  /** Fingers left per doer (" · 2 parmak"); omitted = names only (lives off). */
  doerLives?: Record<string, number>;
  /** Doers whose last finger went down this round: red chip, " · elendi" and "X elendi." note. */
  eliminated?: string[];
  /** "Şu ana kadar en çok yapan: Ece (4 kez)". */
  leader?: { name: string; count: number };
  /** Yellow "Mert, hikâyeyi anlatma sırası sende!" sticker. */
  storyteller?: string;
  /** Avatar fill per nick; default cycles game-kit's avatar colors. */
  avatarColors?: Record<string, string>;
  /** Host gets the yellow "Sıradaki cümle"; guests the waiting note. */
  isHost?: boolean;
  nextLabel?: string;
  waitHostLabel?: string;
  /** 0..1 press-down of "Sıradaki cümle". */
  press?: number;
  /** Local frame the headline pops and the bar starts to grow; doers and notes follow. */
  enterAt?: number;
};

/**
 * Ben Hiç reveal phase (games/never/client PlayView Reveal + never.css): the card without its timer, headline,
 * pink % bar, your answer, doer chips with avatars, notes, storyteller sticker and the host's "Sıradaki cümle".
 */
export const NeverRevealScreen: React.FC<NeverRevealProps> = ({
  theme,
  statement,
  category,
  did,
  didnt,
  round = roundLabel(5, 20),
  lives,
  maxLives,
  code,
  you,
  unanswered = 0,
  doerLives,
  eliminated = [],
  leader,
  storyteller,
  avatarColors,
  isHost = true,
  nextLabel = NV_TEXT.next,
  waitHostLabel = NV_TEXT.waitHost,
  press = 0,
  enterAt = 0,
}) => {
  const c = theme.colors;
  const answered = did.length + didnt.length;
  const pct = percent(did.length, answered);
  const head = usePop(enterAt, 12);
  const grow = usePop(enterAt + 4, 20);
  const you2 = usePop(enterAt + 10, 14);
  const teller = usePop(enterAt + 14 + did.length * 3, 11);
  const colorOf = (nick: string, i: number) => avatarColors?.[nick] ?? AVATAR_COLORS[i % AVATAR_COLORS.length]!;
  const lines: string[] = [];
  if (eliminated.length > 0) lines.push(eliminatedLabel(eliminated));
  if (leader) lines.push(leaderLabel(leader.name, leader.count));
  return (
    <NeverCanvas theme={theme}>
      <NeverTop theme={theme} round={round} lives={lives} maxLives={maxLives} code={code} />
      <StatementCard theme={theme} statement={statement} category={category} />
      <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 12 }}>
        <p
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            fontWeight: 800,
            lineHeight: 1.1,
            textAlign: 'center',
            transform: `scale(${interpolate(head, [0, 1], [0.6, 1])})`,
            opacity: Math.min(1, head * 2),
          }}
        >
          {revealHeadline(did.length, answered)}
        </p>
        <div
          style={{
            position: 'relative',
            height: 40,
            flex: 'none',
            boxSizing: 'border-box',
            overflow: 'hidden',
            border: `${APP.bw}px solid ${c.ink}`,
            borderRadius: 14,
            background: APP.ink2,
          }}
        >
          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: c.pink, transform: `scaleX(${grow})`, transformOrigin: 'left' }} />
          <b
            style={{
              position: 'absolute',
              top: '50%',
              left: 12,
              transform: 'translateY(-50%)',
              color: pct < 18 ? c.paper : APP.ink2,
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            %{pct}
          </b>
        </div>
        {(you || unanswered > 0) && (
          <p
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '4px 12px',
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              color: c.yellow,
              opacity: you2,
            }}
          >
            {you ? yourAnswerLabel(you) : null}
            {unanswered > 0 && <span style={{ color: APP.text3 }}>{unansweredLabel(unanswered)}</span>}
          </p>
        )}
        {did.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {did.map((nick, i) => (
              <Doer
                key={nick}
                theme={theme}
                nick={nick}
                color={colorOf(nick, i)}
                out={eliminated.includes(nick)}
                lives={doerLives?.[nick]}
                enterAt={enterAt + 12 + i * 3}
              />
            ))}
          </div>
        )}
        {lines.length > 0 && (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: APP.text2, textAlign: 'left', opacity: teller }}>{lines.join(' ')}</p>
        )}
        {storyteller && (
          <p
            style={{
              margin: 0,
              padding: 12,
              border: `${APP.bw}px solid ${c.ink}`,
              borderRadius: 16,
              background: c.yellow,
              color: APP.ink2,
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.15,
              transform: `rotate(${interpolate(teller, [0, 1], [-6, -1])}deg) scale(${teller})`,
            }}
          >
            {storytellerLabel(storyteller)}
          </p>
        )}
        <div style={{ flex: 1 }} />
        {isHost ? (
          <NeverCta theme={theme} label={nextLabel} large press={press} />
        ) : (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: APP.text2, textAlign: 'center' }}>{waitHostLabel}</p>
        )}
      </div>
    </NeverCanvas>
  );
};

/** .nv-doer: panel chip (red when out) with the avatar and "Nick · 2 parmak". */
const Doer: React.FC<{ theme: AppTheme; nick: string; color: string; out: boolean; lives?: number; enterAt: number }> = ({
  theme,
  nick,
  color,
  out,
  lives,
  enterAt,
}) => {
  const c = theme.colors;
  const pop = usePop(enterAt, 11);
  const tail = out ? NV_TEXT.eliminatedTag : lives != null ? doerLivesLabel(lives) : null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
        padding: 8,
        border: `2px solid ${c.ink}`,
        borderRadius: 14,
        background: out ? APP.red : c.panel,
        color: out ? APP.ink2 : c.paper,
        fontSize: 14,
        fontWeight: 800,
        transform: `scale(${pop})`,
      }}
    >
      <NeverAvatar theme={theme} nick={nick} color={color} />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {nick}
        {tail && ` · ${tail}`}
      </span>
    </div>
  );
};
