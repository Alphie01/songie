import React from 'react';
import { Easing } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_DISPLAY } from '../fonts';
import { MLCanvas } from './mostLikelyParts';
import { useCssAnim } from './paranoiaParts';
import { BTButton, BTCard, BTHeadline, BTHint, BTPass, BTTable, BTTop } from './bottleParts';
import {
  BT_TEXT,
  bottleAngleFor,
  doing,
  passLeft,
  pointed as pointedLine,
  roundLabel,
  secsLabel,
  voteFill,
  votedLabel,
  type BottleKind,
} from './bottleText';

export type BottleVotes = {
  yes: number;
  no: number;
  /** Players who may vote (everyone but the target). */
  voters: number;
  /** My ballot: pressed outline on it, the other fades. */
  myVote?: boolean | null;
  /** false = "Diğerleri oyluyor…" (the target's view). Default: true unless I am the target. */
  canVote?: boolean;
  /** Seconds left on the 'vote' countdown. */
  seconds?: number;
};

export type BottleTaskProps = {
  theme: AppTheme;
  kind?: BottleKind;
  text?: string;
  /** Target (the pointed player). */
  player?: string;
  players?: string[];
  me?: string;
  angle?: number;
  /** Phase 'vote' when given ("Görevi yaptı mı?" + Evet / Hayır + progress); else phase 'task'. */
  votes?: BottleVotes;
  /** Which button is being tapped and its 0..1 press-down. */
  tap?: 'done' | 'pass' | 'yes' | 'no';
  press?: number;
  /** Pas hakkı left (null = unlimited) and the pass penalty line. */
  passesLeft?: number | null;
  passPenalty?: boolean;
  index?: number;
  count?: number | null;
  code?: string;
  avatarColors?: Record<string, string>;
  /** Local frame the card plays bt-card-in (280 ms); omitted = already in. */
  enterAt?: number;
};

/**
 * Şişe Çevirmece task / vote (PlayView Stage 'task' + Vote + bottle.css .bt-card / .bt-actions / .bt-vote):
 * the table, "Şişe durdu: Mert", the sky (doğruluk) or red (cesaret) card, then either the target's
 * "Yaptım / Pas" row, the others' "Mert görevi yapıyor" line, or the "Yaptı mı?" vote with its 10 px bar.
 */
export const BottleTaskScreen: React.FC<BottleTaskProps> = ({
  theme,
  kind = 'dare',
  text = 'En son çektiğin fotoğrafı gruba göster.',
  player = 'Mert',
  players = ['Ece', 'Mert', 'Deniz', 'Selin', 'Zeynep', 'Bora'],
  me = 'Selin',
  angle,
  votes,
  tap,
  press = 0,
  passesLeft = 2,
  passPenalty = true,
  index = 5,
  count = 20,
  code = 'ODAK',
  avatarColors,
  enterAt,
}) => {
  const c = theme.colors;
  const iAm = player === me;
  const rise = useCssAnim(enterAt, 280, 0, Easing.bezier(0.2, 0.8, 0.2, 1));
  const noPass = passesLeft !== null && passesLeft <= 0;
  const p = (k: NonNullable<BottleTaskProps['tap']>) => (tap === k ? press : 0);
  const canVote = votes ? (votes.canVote ?? !iAm) : false;
  return (
    <MLCanvas theme={theme}>
      <BTTop theme={theme} label={roundLabel(index, count)} code={code} />
      <BTTable theme={theme} players={players} me={me} angle={angle ?? bottleAngleFor(player, players, 4, 0, 7)} pointed={player} avatarColors={avatarColors} />
      <BTHeadline>{iAm ? BT_TEXT.pointedYou : pointedLine(player)}</BTHeadline>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto' }}>
        <BTCard theme={theme} kind={kind} text={text} rise={rise} />
        <div style={{ flex: '1 1 auto' }} />

        {!votes &&
          (iAm ? (
            <>
              {passPenalty && !noPass && <BTHint>{BT_TEXT.passCost}</BTHint>}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <BTButton theme={theme} size="done" bg={c.mint} label={BT_TEXT.done[kind]} press={p('done')} />
                <BTPass theme={theme} sub={noPass ? BT_TEXT.noPass : passLeft(passesLeft)} disabled={noPass} press={p('pass')} />
              </div>
            </>
          ) : (
            <BTHint strong>{doing(kind, player)}</BTHint>
          ))}

        {votes && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, lineHeight: 1.1, textAlign: 'center' }}>{BT_TEXT.voteTitle[kind]}</p>
            {canVote ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {([true, false] as const).map((yes) => {
                  const mine = votes.myVote === yes;
                  const faded = votes.myVote != null && !mine;
                  return (
                    <BTButton
                      key={String(yes)}
                      theme={theme}
                      size="done"
                      bg={yes ? c.mint : APP.red}
                      label={yes ? BT_TEXT.yes : BT_TEXT.no}
                      press={p(yes ? 'yes' : 'no')}
                      style={{
                        outline: mine ? `4px solid ${c.paper}` : undefined,
                        outlineOffset: 2,
                        opacity: faded ? 0.55 : 1,
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <BTHint strong>{BT_TEXT.voteWait}</BTHint>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 800 }}>
              <span style={{ flex: 1, height: 10, overflow: 'hidden', borderRadius: APP.pill, background: APP.ink2 }}>
                <span style={{ display: 'block', height: '100%', width: `${voteFill(votes.yes, votes.no, votes.voters)}%`, background: c.mint }} />
              </span>
              <span>
                {votedLabel(votes.yes + votes.no, votes.voters)} · {secsLabel(Math.max(0, Math.ceil(votes.seconds ?? 20)))}
              </span>
            </div>
          </div>
        )}
      </section>
    </MLCanvas>
  );
};
