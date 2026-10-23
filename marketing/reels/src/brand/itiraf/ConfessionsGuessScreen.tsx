import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { ConfAsk, ConfCanvas, ConfFoot, ConfGrid, ConfHead, ConfNote, ConfPick, ConfReactions, ConfTimer, GhostButton, HostBox, TopicSmall } from './confessionsParts';
import { CF_TEXT, confessionOf, myPickLabel, pickedLabel, type ReactionCounts, type ReactionKey } from './confessionsText';

export type { ReactionCounts, ReactionKey } from './confessionsText';

export type ConfessionsGuessProps = {
  theme: AppTheme;
  confession?: string;
  /** Round topic above the note; omitted = free mode (no line). */
  topic?: string;
  /** Candidates in the app's order; `me` among them is labelled "Bu benim". */
  players?: string[];
  me?: string;
  /** My pick (yellow); the foot switches to "Seçimin: Mert. 4/6 kişi seçti." */
  selected?: string;
  /** 0..1 press-down of the `selected` button (or of `pressing` when given). */
  selectPress?: number;
  /** Nick of the button being pressed before it becomes `selected`. */
  pressing?: string;
  reactions?: ReactionCounts;
  /** Reactions I have pressed (pink); `reactionPress` is one more being pressed now. */
  myReactions?: ReactionKey[];
  reactionPress?: ReactionKey;
  /** How many picked / online count ("4/6 kişi seçti"). */
  chosen?: number;
  total?: number;
  /** "İtiraf 3/6". */
  index?: number;
  count?: number;
  code?: string;
  /** Seconds left / guess time; seconds omitted = untimed. */
  seconds?: number;
  duration?: number;
  /** The "Herkes bir seçim yapar…" hint under the question (App Store 02.png leaves it out). */
  showHint?: boolean;
  /** Host's ghost "Tahmini bitir" / "İtirafı gizle" (02.png is a guest view). */
  isHost?: boolean;
  /** Push the foot to the bottom of the screen like 02.png; false = right under the grid like the web column. */
  footAtBottom?: boolean;
};

/**
 * Gizli İtiraflar guess phase (games/confessions/client PlayView Confession + confessions.css), drawn at 393 px
 * and scaled to the PhoneFrame screen. Matches App Store ItirafKosesi 02.png.
 */
export const ConfessionsGuessScreen: React.FC<ConfessionsGuessProps> = ({
  theme,
  confession = 'Yatmadan önce kapının kilitli olduğunu üç kez kontrol etmeden uyuyamıyorum.',
  topic = 'Yatmadan önce yaptığın garip bir ritüel',
  players = ['Sen', 'Mert', 'Deniz', 'Kaan', 'Zeynep', 'Bora'],
  me = 'Sen',
  selected,
  selectPress = 0,
  pressing,
  reactions = { yok: 2, bende: 3, efsane: 1, olamaz: 0 },
  myReactions = [],
  reactionPress,
  chosen = 4,
  total = 6,
  index = 3,
  count = 6,
  code = 'ODAK',
  seconds = 28,
  duration = 50,
  showHint = false,
  isHost = false,
  footAtBottom = true,
}) => {
  const label = (nick: string) => (nick === me ? CF_TEXT.me : nick);
  const pressed = pressing ?? selected;
  const mine = reactionPress && !myReactions.includes(reactionPress) ? [...myReactions, reactionPress] : myReactions;
  return (
    <ConfCanvas theme={theme}>
      <ConfHead theme={theme} label={confessionOf(index, count)} code={code} />
      <ConfTimer theme={theme} seconds={seconds} duration={duration} />
      {topic && <TopicSmall text={topic} />}
      <ConfNote theme={theme} text={confession} />
      <ConfReactions theme={theme} counts={reactions} mine={mine} />
      <ConfAsk text={CF_TEXT.whoWrote} />
      {showHint && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: APP.text3 }}>{CF_TEXT.whoWroteHint}</p>}
      <ConfGrid>
        {players.map((p) => (
          <ConfPick key={p} theme={theme} label={label(p)} state={selected === p ? 'chosen' : 'idle'} press={pressed === p ? selectPress : 0} />
        ))}
      </ConfGrid>
      {footAtBottom && <div style={{ flex: 1 }} />}
      <ConfFoot
        theme={theme}
        line={selected ? myPickLabel(label(selected), chosen, total) : pickedLabel(chosen, total)}
        sub={selected ? CF_TEXT.changePick : undefined}
      />
      {isHost && (
        <HostBox>
          <GhostButton label={CF_TEXT.closeGuess} />
          <GhostButton label={CF_TEXT.hide} />
        </HostBox>
      )}
    </ConfCanvas>
  );
};
