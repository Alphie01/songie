import React, { createContext, useContext } from 'react';
import type { AppTheme } from '../themes/types';

/** Measured from App Store 02.png (phone 877 px wide there), scaled to an 840 px phone. */
export const PHONE = {
  width: 840,
  height: 1800,
  rim: 6, // panel-colored outer rim
  bezel: 20, // ink bezel inside the rim
  radius: 150,
  shadow: 20, // hard ink shadow to the bottom right
} as const;

export type ScreenSize = { width: number; height: number };
const ScreenContext = createContext<ScreenSize | null>(null);
/** Inner screen size of the surrounding PhoneFrame (null outside one). */
export const usePhoneScreen = () => useContext(ScreenContext);

type Props = {
  theme: AppTheme;
  tilt?: number;
  width?: number;
  height?: number;
  /** Corner radius (default PHONE.radius, sized for the 840 px phone; smaller phones need less). */
  radius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** The dark purple phone from the App Store shots: panel rim, thick ink bezel, hard ink shadow. */
export const PhoneFrame: React.FC<Props> = ({ theme, tilt = 0, width = PHONE.width, height = PHONE.height, radius = PHONE.radius, style, children }) => {
  const c = theme.colors;
  const inset = PHONE.rim + PHONE.bezel;
  const screen = { width: width - 2 * inset, height: height - 2 * inset };
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        boxSizing: 'border-box',
        borderRadius: radius,
        border: `${PHONE.rim}px solid ${c.panel}`,
        background: c.ink,
        boxShadow: `${PHONE.shadow}px ${PHONE.shadow}px 0 ${c.ink}`,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: PHONE.bezel,
          top: PHONE.bezel,
          width: screen.width,
          height: screen.height,
          borderRadius: radius - inset,
          overflow: 'hidden',
          background: c.bg,
        }}
      >
        <ScreenContext.Provider value={screen}>{children}</ScreenContext.Provider>
      </div>
    </div>
  );
};
