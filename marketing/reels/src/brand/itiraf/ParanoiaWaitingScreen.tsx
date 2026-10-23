import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AppTheme } from '../../themes/types';
import { MLCanvas } from './mostLikelyParts';
import { PNBig, PNEnvelope, PNMine, PNProgress, PNSub, PNTimer, PNTop, type PNMineEntry } from './paranoiaParts';
import { PN_TEXT, pillLabel, waitHolder } from './paranoiaText';

export type ParanoiaWaitingProps = {
  theme: AppTheme;
  /** Who is thinking; omitted = hideHolder ("Şu an birine soru soruldu, düşünüyor…", the default setting). */
  holder?: string;
  /** Local frame the mint "Bir soru cevaplandı" flash starts (pr-fade-out, 2.6 s); omitted = no flash. */
  pulseAt?: number;
  seconds?: number;
  duration?: number;
  /** My earlier secret answers. */
  mine?: PNMineEntry[];
  index?: number;
  count?: number;
  mode?: string;
  code?: string;
};

/**
 * Gizlilik Esas waiting state (games/paranoia/client PlayView Waiting + .pr-wait): the small sealed envelope while
 * someone else answers their secret question.
 */
export const ParanoiaWaitingScreen: React.FC<ParanoiaWaitingProps> = ({
  theme,
  holder,
  pulseAt,
  seconds = 22,
  duration = 40,
  mine = [],
  index = 5,
  count = 10,
  mode = PN_TEXT.name,
  code = 'ODAK',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // pr-fade-out: opaque to 70 %, gone at 100 % of 2.6 s.
  const pulse =
    pulseAt == null || frame < pulseAt
      ? 0
      : interpolate(frame - pulseAt, [0, 0.7 * 2.6 * fps, 2.6 * fps], [1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <MLCanvas theme={theme}>
      <PNTop theme={theme} label={pillLabel(Math.min(index, count), count, mode)} code={code} />
      <PNProgress theme={theme} done={index - 1} total={count} />
      <div
        style={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '12px 0',
          textAlign: 'center',
        }}
      >
        <PNEnvelope theme={theme} small />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <PNBig>{holder ? waitHolder(holder) : PN_TEXT.waitHidden}</PNBig>
          <PNSub>{PN_TEXT.waitHint}</PNSub>
          {pulseAt != null && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: theme.colors.mint, opacity: pulse }}>{PN_TEXT.answeredFlash}</p>
          )}
        </div>
        {seconds != null && duration > 0 && <PNTimer theme={theme} seconds={seconds} duration={duration} />}
        <PNMine theme={theme} entries={mine} />
      </div>
    </MLCanvas>
  );
};
