import React from 'react';
import type { AppTheme } from '../../themes/types';
import { MLCanvas } from './mostLikelyParts';
import { BTButton, BTHeadline, BTHint, BTLast, BTTable, BTTop } from './bottleParts';
import { BT_TEXT, roundLabel, spunBy, waitSpinner } from './bottleText';

export { bottleAngleFor } from './bottleText';

export type BottleTableProps = {
  theme: AppTheme;
  /** Seats in table order (seat 0 at the top, clockwise). */
  players?: string[];
  /** My nick: seat reads "sen", decides whose turn the copy speaks to. */
  me?: string;
  /** Bottle rotation in deg; use bottleAngleFor / spinAt to aim it. */
  angle?: number;
  /** Phase spinning: "Şişe dönüyor…", empty stage, no highlighted seat. */
  spinning?: boolean;
  /** Seat the bottle stopped on (highlight). */
  pointed?: string;
  /** Who spins next (yellow dot); defaults to me. Omit the dot with `spinnerDot={false}`. */
  spinner?: string;
  spinnerDot?: boolean;
  /** Who spun last time (for "Şişeyi Mert çevirdi, sıra sende"); omitted = "Sıra sende" / "Şişeyi X çevirecek." */
  lastSpinner?: string;
  /** Override the headline / hint lines. */
  headline?: string;
  status?: string;
  /** LastResult box: head ("Mert +1 puan aldı (4 evet, 1 hayır)") and "Cesaret: …" line. */
  log?: { head: string; text?: string };
  /** Finished spins and the total ("Çevirme 6/20" = index 5 of 20); count null = unlimited. */
  index?: number;
  count?: number | null;
  code?: string;
  /** 0..1 press-down of "Şişeyi çevir". */
  spinPress?: number;
  avatarColors?: Record<string, string>;
  /** Local frame the pointed seat pops (420 ms). */
  popAt?: number;
};

/**
 * Şişe Çevirmece table phase (games/bottle/client PlayView Table + Stage 'spin' / 'spinning' + bottle.css),
 * drawn at 393 px and scaled to the PhoneFrame screen. Matches ItirafKosesi 06.png by default.
 */
export const BottleTableScreen: React.FC<BottleTableProps> = ({
  theme,
  players = ['Ece', 'Mert', 'Deniz', 'Selin', 'Zeynep', 'Bora'],
  me = 'Selin',
  angle = 0,
  spinning = false,
  pointed,
  spinner,
  spinnerDot = false,
  lastSpinner = 'Mert',
  headline,
  status,
  log = { head: 'Mert +1 puan aldı (4 evet, 1 hayır)', text: 'Cesaret: En son çektiğin fotoğrafı gruba göster.' },
  index = 5,
  count = 20,
  code = 'ODAK',
  spinPress = 0,
  avatarColors,
  popAt,
}) => {
  const next = spinner ?? me;
  const mine = next === me;
  const head =
    headline ??
    (spinning
      ? BT_TEXT.spinning
      : lastSpinner
        ? spunBy(lastSpinner, lastSpinner === me, mine, next)
        : mine
          ? BT_TEXT.yourTurn
          : waitSpinner(next));
  return (
    <MLCanvas theme={theme}>
      <BTTop theme={theme} label={roundLabel(index, count)} code={code} />
      <BTTable
        theme={theme}
        players={players}
        me={me}
        angle={angle}
        pointed={spinning ? undefined : pointed}
        spinner={spinnerDot ? next : undefined}
        avatarColors={avatarColors}
        popAt={popAt}
      />
      <BTHeadline>{head}</BTHeadline>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto' }}>
        {!spinning && (
          <>
            {log && <BTLast theme={theme} head={log.head} text={log.text} />}
            <div style={{ flex: '1 1 auto' }} />
            {mine ? (
              <>
                <BTHint>{status ?? BT_TEXT.spinHint}</BTHint>
                <BTButton theme={theme} size="big" bg={theme.colors.yellow} label={BT_TEXT.spin} press={spinPress} />
              </>
            ) : (
              status && <BTHint>{status}</BTHint>
            )}
          </>
        )}
      </section>
    </MLCanvas>
  );
};
