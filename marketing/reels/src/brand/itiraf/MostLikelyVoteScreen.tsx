import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { NeverAvatar } from './neverParts';
import { CheckIcon, MLCanvas, MLCta, MLGhost, MLQuestion, MLTimer, MLTop, SkipIcon, avatarColor } from './mostLikelyParts';
import { ML_TEXT, roundLabel, statusLine, tapToVote, tileTag } from './mostLikelyText';

export type MostLikelyVoteProps = {
  theme: AppTheme;
  /** The blank in "Aramızdaki en … kim?", e.g. "alarmı çok erteleyen". */
  question?: string;
  /** Candidates in the app's order (present players). */
  players?: string[];
  /** My nick: "sen" in the waiting list; blocked tile when selfVote is off. */
  me?: string;
  /** Who already voted (mint dot on their tile). */
  voted?: string[];
  /** Waiting list after "Beklenenler"; default = players not in `voted`. */
  waiting?: string[];
  /** Disconnected players: dimmed avatar (they still count once they voted). */
  offline?: string[];
  /** My vote / my guess: yellow pressed tile in their tab, "Oyun" / "Tahminin" tag and a check on the tab. */
  myVote?: string;
  myGuess?: string;
  /** 0..1 press of the tile `pressing` (default the current tab's pick) toward the pressed look. */
  votePress?: number;
  pressing?: string;
  /** Selected tab; "guess" switches the hint and which pick is yellow. */
  tab?: 'vote' | 'guess';
  /** Tahmin modu: the Oyum / Tahminim tabs (03.png shows them). */
  predict?: boolean;
  /** Kendine oy: changes the hint; off = my tile disabled in the vote tab. */
  selfVote?: boolean;
  /** İsimsiz oylar note vs. open-votes note. */
  anonymous?: boolean;
  /** "Soru 3/10"; count null = unlimited ("Soru 3"). */
  index?: number;
  count?: number | null;
  code?: string;
  /** Seconds left / vote time; seconds omitted = untimed (no strip, note adds "Herkes oy verince…"). */
  seconds?: number;
  duration?: number;
  /** Host: yellow "Sonuçları şimdi aç" (disabled until someone voted). */
  isHost?: boolean;
  /** Host's ghost "Soruyu atla" above the CTA (03.png leaves it out). */
  showSkip?: boolean;
  /** 0..1 press-down of the host CTA. */
  revealPress?: number;
  /** Avatar fill per nick; default = 03.png colors. */
  avatarColors?: Record<string, string>;
};

/**
 * Aramızdaki En vote phase (games/most-likely/client PlayView Vote + most-likely.css), drawn at 393 px and
 * scaled to the PhoneFrame screen. Matches App Store ItirafKosesi 03.png.
 */
export const MostLikelyVoteScreen: React.FC<MostLikelyVoteProps> = ({
  theme,
  question = 'alarmı çok erteleyen',
  players = ['Ece', 'Mert', 'Deniz', 'Kaan', 'Zeynep', 'Bora'],
  me = 'Ece',
  voted = ['Ece', 'Mert', 'Deniz', 'Kaan'],
  waiting,
  offline = [],
  myVote,
  myGuess,
  votePress = 0,
  pressing,
  tab = 'vote',
  predict = true,
  selfVote = true,
  anonymous = true,
  index = 3,
  count = 10,
  code = 'ODAK',
  seconds = 16,
  duration = 30,
  isHost = true,
  showSkip = false,
  revealPress = 0,
  avatarColors,
}) => {
  const c = theme.colors;
  const guessing = predict && tab === 'guess';
  const nick = (p: string) => (p === me ? ML_TEXT.you : p);
  const done = players.filter((p) => voted.includes(p)).length;
  const wait = waiting ?? players.filter((p) => !voted.includes(p) && !offline.includes(p));
  const voters = players.filter((p) => !offline.includes(p) || voted.includes(p)).length;
  const pick = guessing ? myGuess : myVote;
  const pressed = pressing ?? pick;
  const tabBtn = (label: string, on: boolean, checked: boolean) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        minHeight: 44,
        borderRadius: 12,
        background: on ? c.yellow : 'transparent',
        color: on ? APP.ink2 : APP.text2,
        fontFamily: FONT_DISPLAY,
        fontSize: 17,
        fontWeight: 800,
      }}
    >
      {label}
      {checked && <CheckIcon />}
    </div>
  );
  return (
    <MLCanvas theme={theme}>
      <MLTop theme={theme} label={roundLabel(index, count)} code={code} />
      {seconds != null && duration > 0 && <MLTimer theme={theme} seconds={seconds} duration={duration} />}
      <MLQuestion theme={theme} text={question} />

      <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 10 }}>
        {predict && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 6,
              padding: 4,
              border: `2px solid ${c.ink}`,
              borderRadius: 16,
              background: APP.panel2,
            }}
          >
            {tabBtn(ML_TEXT.modeVote, !guessing, !!myVote)}
            {tabBtn(ML_TEXT.modeGuess, guessing, !!myGuess)}
          </div>
        )}

        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, textAlign: 'center', color: APP.text2 }}>
          {guessing ? ML_TEXT.tapToGuess : tapToVote(selfVote)}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, paddingTop: 10 }}>
          {players.map((p, i) => {
            const blocked = !guessing && p === me && !selfVote;
            const on = p === pick;
            // .ml-tile[aria-pressed]: yellow, 2 px drop, translateY(3px) rotate(-2deg); votePress eases toward it.
            const t = on && p !== pressed ? 1 : p === pressed ? votePress : 0;
            const yellow = on || (p === pressed && votePress >= 0.5);
            const tag = tileTag(p === myVote, p === myGuess);
            return (
              <div
                key={p}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minHeight: 104,
                  boxSizing: 'border-box',
                  padding: '8px 6px',
                  border: `${APP.bw}px solid ${c.ink}`,
                  borderRadius: 18,
                  background: yellow ? c.yellow : c.panel,
                  color: yellow ? APP.ink2 : c.paper,
                  boxShadow: `0 ${5 - 3 * t}px 0 ${c.ink}`,
                  transform: t ? `translateY(${3 * t}px) rotate(${-2 * t}deg)` : undefined,
                  opacity: blocked && !on ? 0.5 : 1,
                }}
              >
                <span style={{ opacity: offline.includes(p) ? 0.45 : 1, display: 'inline-flex' }}>
                  <NeverAvatar theme={theme} nick={p} color={avatarColor(p, avatarColors, i)} size={50} />
                </span>
                <span style={{ maxWidth: '100%', overflow: 'hidden', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {p}
                </span>
                {tag && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -9,
                      left: '50%',
                      padding: '1px 8px',
                      borderRadius: APP.pill,
                      background: APP.ink2,
                      color: c.paper,
                      fontSize: 11,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {tag}
                  </span>
                )}
                {voted.includes(p) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 16,
                      height: 16,
                      boxSizing: 'border-box',
                      border: `2px solid ${c.ink}`,
                      borderRadius: '50%',
                      background: c.mint,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>{statusLine(done, voters, wait.map(nick))}</p>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: APP.text3 }}>
          {anonymous ? ML_TEXT.anonymousNote : ML_TEXT.openNote}
          {seconds == null && ` ${ML_TEXT.untimed}`}
        </p>

        {isHost && (
          <>
            {showSkip && <MLGhost label={ML_TEXT.skip} icon={<SkipIcon />} />}
            <MLCta theme={theme} label={ML_TEXT.revealNow} press={revealPress} disabled={voted.length === 0} />
          </>
        )}
      </div>
    </MLCanvas>
  );
};
