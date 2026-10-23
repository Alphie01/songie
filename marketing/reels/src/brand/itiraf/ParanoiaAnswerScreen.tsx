import React from 'react';
import type { AppTheme } from '../../themes/types';
import { FONT_DISPLAY } from '../fonts';
import { MLCanvas, avatarColor } from './mostLikelyParts';
import { PNConfirm, PNHint, PNMine, PNPick, PNProgress, PNSecret, PNSecretNote, PNTimer, PNTop, useCssAnim, type PNMineEntry } from './paranoiaParts';
import { PN_TEXT, confirmPick, pickHint, pickable, pillLabel, revealHead } from './paranoiaText';

export type ParanoiaAnswerProps = {
  theme: AppTheme;
  /** The secret question only I see. */
  question?: string;
  /** Players in the room, app order. */
  players?: string[];
  /** My nick: "sen" note, disabled unless allowSelf. */
  me?: string;
  /** Who sent it: "sana gönderdi" note, disabled while noReturn. */
  from?: string;
  /** My pick: mint tile, "Kaan seçimini onayla". */
  selected?: string;
  /** 0..1 tap easing `selected` toward the checked look (and the CTA from off to on). */
  selectPress?: number;
  /** 0..1 press-down of "Seçimi onayla". */
  confirmPress?: number;
  /** "Gönderiliyor…" after the confirm. */
  sending?: boolean;
  /** Think time left / total; omitted = untimed (no countdown, no timeout line). */
  seconds?: number;
  duration?: number;
  /** Room settings (defaults = shared defaultSettings). */
  allowSelf?: boolean;
  noReturn?: boolean;
  onTimeout?: 'random' | 'pass';
  /** "Senin gizli cevapların" rows (my earlier answers); empty = hidden. */
  mine?: PNMineEntry[];
  /** Shown question number and count. */
  index?: number;
  count?: number;
  mode?: string;
  code?: string;
  avatarColors?: Record<string, string>;
  /** Local frame the secret card rises in (pr-secret-in, 400 ms); omitted = already in. */
  enterAt?: number;
};

/**
 * Gizlilik Esas secret question card + answer picker (games/paranoia/client PlayView MyTurn opened + paranoia.css),
 * drawn at 393 px and scaled to the PhoneFrame screen.
 */
export const ParanoiaAnswerScreen: React.FC<ParanoiaAnswerProps> = ({
  theme,
  question = 'Aramızda kim eski sevgilisinin profiline hâlâ bakıyor?',
  players = ['Ece', 'Mert', 'Deniz', 'Kaan', 'Zeynep', 'Bora'],
  me = 'Ece',
  from = 'Deniz',
  selected,
  selectPress,
  confirmPress = 0,
  sending = false,
  seconds = 28,
  duration = 40,
  allowSelf = false,
  noReturn = true,
  onTimeout = 'random',
  mine = [],
  index = 4,
  count = 10,
  mode = PN_TEXT.name,
  code = 'ODAK',
  avatarColors,
  enterAt,
}) => {
  const choices = pickable(players, me, from, allowSelf, noReturn);
  const sel = selected ? (selectPress ?? 1) : 0;
  const rise = useCssAnim(enterAt, 400);
  const timed = seconds != null && duration > 0;
  const note = (p: string) => (p === from ? PN_TEXT.sentYou : p === me ? PN_TEXT.you : undefined);
  const on = !!selected && sel >= 0.5;
  return (
    <MLCanvas theme={theme}>
      <PNTop theme={theme} label={pillLabel(Math.min(index, count), count, mode)} code={code} />
      <PNProgress theme={theme} done={index - 1} total={count} />

      <div style={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 12 }}>
        <PNSecret
          theme={theme}
          head={PN_TEXT.yourTurn}
          n={revealHead(index, count)}
          question={question}
          style={{
            opacity: rise,
            transform: `translateY(${(1 - rise) * 10}px) rotate(-1deg)`,
          }}
        >
          <PNSecretNote theme={theme} />
          {timed && <PNTimer theme={theme} seconds={seconds} duration={duration} />}
        </PNSecret>

        <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{PN_TEXT.pickTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {players.map((p, i) => (
            <PNPick
              key={p}
              theme={theme}
              nick={p}
              color={avatarColor(p, avatarColors, i)}
              note={note(p)}
              on={p === selected ? sel : 0}
              disabled={!choices.includes(p)}
            />
          ))}
        </div>
        <PNHint>{pickHint(allowSelf, noReturn)}</PNHint>
        <div style={{ flex: 1 }} />
        <PNConfirm
          theme={theme}
          on={on}
          disabled={sending}
          press={on ? confirmPress : 0}
          label={sending ? PN_TEXT.sending : on && selected ? confirmPick(selected) : PN_TEXT.confirm}
        />
        {timed && <PNHint center>{onTimeout === 'pass' ? PN_TEXT.timeoutPass : PN_TEXT.timeoutRandom}</PNHint>}
        <PNMine theme={theme} entries={mine} />
      </div>
    </MLCanvas>
  );
};

