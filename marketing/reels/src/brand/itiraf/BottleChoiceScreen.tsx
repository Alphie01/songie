import React from 'react';
import type { AppTheme } from '../../themes/types';
import { MLCanvas } from './mostLikelyParts';
import { BTChoice, BTHeadline, BTHint, BTTable, BTTop } from './bottleParts';
import { BT_TEXT, bottleAngleFor, choosing, pointed as pointedLine, roundLabel, type BottleKind } from './bottleText';

export type BottleChoiceProps = {
  theme: AppTheme;
  players?: string[];
  me?: string;
  /** The seat the bottle points at; me = the two choice tiles, anyone else = "Ece seçiyor: …". */
  player?: string;
  /** Bottle rotation; default aims at `player` (bottleAngleFor, 4 turns, slight jitter). */
  angle?: number;
  /** Tile being tapped and its 0..1 press-down. */
  choice?: BottleKind;
  press?: number;
  index?: number;
  count?: number | null;
  code?: string;
  avatarColors?: Record<string, string>;
  /** Local frame the pointed seat pops (420 ms). */
  popAt?: number;
};

/**
 * Şişe Çevirmece "Doğruluk mu cesaret mi?" (PlayView Stage 'choose' + bottle.css .bt-choose / .bt-choice):
 * the table with the pointed seat lifted, headline, hint and the two tilted tiles at the bottom.
 */
export const BottleChoiceScreen: React.FC<BottleChoiceProps> = ({
  theme,
  players = ['Ece', 'Mert', 'Deniz', 'Selin', 'Zeynep', 'Bora'],
  me = 'Selin',
  player = me,
  angle,
  choice,
  press = 0,
  index = 6,
  count = 20,
  code = 'ODAK',
  avatarColors,
  popAt,
}) => {
  const iAm = player === me;
  return (
    <MLCanvas theme={theme}>
      <BTTop theme={theme} label={roundLabel(index, count)} code={code} />
      <BTTable
        theme={theme}
        players={players}
        me={me}
        angle={angle ?? bottleAngleFor(player, players, 4, 0, -6)}
        pointed={player}
        avatarColors={avatarColors}
        popAt={popAt}
      />
      <BTHeadline>{iAm ? BT_TEXT.pointedYou : pointedLine(player)}</BTHeadline>
      <section style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10, flex: '1 1 auto' }}>
        {iAm ? (
          <>
            <BTHint strong>{BT_TEXT.chooseHint}</BTHint>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {(['truth', 'dare'] as const).map((k) => (
                <BTChoice key={k} theme={theme} kind={k} press={choice === k ? press : 0} />
              ))}
            </div>
          </>
        ) : (
          <BTHint strong>{choosing(player)}</BTHint>
        )}
      </section>
    </MLCanvas>
  );
};
