import { useEffect, useRef, useState } from 'react';
import { continueRender, delayRender, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadBrandFonts } from './fonts';

/** Bouncy sticker pop: 0 → 1 with a little overshoot, starting at `enterAt`. */
export function usePop(enterAt = 0, damping = 11): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - enterAt, fps, config: { damping, stiffness: 180, mass: 0.7 } });
}

/**
 * True once the brand fonts are in document.fonts. Holds the render until the component has re-rendered
 * with them, so text measured by fitText uses Baloo 2, not the fallback (measureText caches by name).
 */
export function useBrandFonts(): boolean {
  const [ready, setReady] = useState(false);
  const release = useRef<(() => void) | null>(null);
  useEffect(() => {
    const handle = delayRender('Brand fonts for text fitting');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    release.current = finish;
    loadBrandFonts().then(() => setReady(true), finish);
    return finish; // unmounted before fonts loaded: never leave the handle open
  }, []);
  useEffect(() => {
    if (ready) release.current?.();
  }, [ready]);
  return ready;
}
