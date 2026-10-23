import React from 'react';
import type { AppTheme } from '../../themes/types';
import { MLCanvas } from './mostLikelyParts';
import { PNBig, PNEnvelope, PNProgress, PNSub, PNTimer, PNTop } from './paranoiaParts';
import { PN_TEXT, envelopeFrom, pillLabel } from './paranoiaText';

export type ParanoiaEnvelopeProps = {
  theme: AppTheme;
  /** Who sent the question ("Deniz sana gönderdi…"); omitted = first question, hint only. */
  from?: string;
  /** Shown question number (answered + 1) and the question count: "4/10 soru", 3 mint segments + yellow. */
  index?: number;
  count?: number;
  /** Game name on the pill (s.name). */
  mode?: string;
  code?: string;
  /** Seal letter (PlayView passes "S"). */
  seal?: string;
  /** Think time left / total; omitted = untimed (05.png has no countdown). */
  seconds?: number;
  duration?: number;
  /** pr-wiggle on the tappable envelope (frame-driven 2.4 s loop). */
  wiggle?: boolean;
  /** 0..1 tap on the envelope (reels-only nudge; stops the wiggle). */
  openPress?: number;
  /** 0..1 through the 650 ms data-opening sequence: flap folds up, seal pops off, envelope slides away. */
  opened?: number;
};

/**
 * Gizlilik Esas "Sıra sende" closed envelope (games/paranoia/client PlayView MyTurn !opened + paranoia.css .pr-closed),
 * drawn at 393 px and scaled to the PhoneFrame screen. Matches App Store ItirafKosesi 05.png.
 */
export const ParanoiaEnvelopeScreen: React.FC<ParanoiaEnvelopeProps> = ({
  theme,
  from = 'Deniz',
  index = 4,
  count = 10,
  mode = PN_TEXT.name,
  code = 'ODAK',
  seal = 'S',
  seconds,
  duration = 40,
  wiggle = true,
  openPress = 0,
  opened = 0,
}) => (
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
        gap: 22,
        padding: '12px 0',
        textAlign: 'center',
      }}
    >
      <PNEnvelope theme={theme} seal={seal} wiggle={wiggle} press={openPress} open={opened} />
      <PNBig>{PN_TEXT.envelopeTitle}</PNBig>
      <PNSub>{from ? envelopeFrom(from) : PN_TEXT.envelopeHint}</PNSub>
      {seconds != null && duration > 0 && <PNTimer theme={theme} seconds={seconds} duration={duration} />}
    </div>
  </MLCanvas>
);
