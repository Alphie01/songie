import type { CSSProperties } from 'react';
import { clipShort } from './strings';

/** Her aşamanın çubuktaki bitiş noktası (%). Kısa aşamalar dar, uzunlar geniş. */
export const STOPS = [1.5, 5.5, 22, 55, 100];

export function ProgressBar({
  clips,
  unlocked,
  current,
  playing,
  onPick,
}: {
  clips: readonly number[];
  /** Açılmış en yüksek aşama; -1 hiçbiri. */
  unlocked: number;
  /** İşaretçinin duracağı aşama. */
  current: number;
  playing: { stage: number; duration: number; key: number } | null;
  /** Açılmış bir parçaya dokununca o parçayı çal. */
  onPick?(stage: number): void;
}) {
  const fill = unlocked >= 0 ? STOPS[unlocked]! : 0;
  const at = STOPS[Math.max(0, current)]!;
  return (
    <div className="pb" role="img" aria-label={`Açık klip: ${clipShort(clips[Math.max(0, unlocked)] ?? 0)}`}>
      <div className="pb-track">
        <div className="pb-fill" style={{ width: `${fill}%` }} />
        {STOPS.slice(0, -1).map((stop, i) => (
          <span key={i} className="pb-div" style={{ left: `${stop}%` }} />
        ))}
        {playing && (
          <span
            key={playing.key}
            className="pb-head"
            style={{ '--to': `${STOPS[playing.stage]}%`, '--dur': `${Math.max(playing.duration, 0.12)}s` } as CSSProperties}
          />
        )}
      </div>
      {onPick && (
        <div className="pb-hits">
          {STOPS.map((stop, i) => {
            const from = i === 0 ? 0 : STOPS[i - 1]!;
            if (i > unlocked) return null;
            return (
              <button
                key={i}
                type="button"
                className="pb-hit"
                style={{ left: `${from}%`, width: `${Math.max(stop - from, 4)}%` }}
                aria-label={`${clipShort(clips[i] ?? 0)} parçasını çal`}
                onClick={() => onPick(i)}
              />
            );
          })}
        </div>
      )}
      <div className="pb-marker" style={{ left: `${at}%` }}>
        <span className="pb-caret" />
        <span className="pb-label mono">{clipShort(clips[Math.max(0, current)] ?? 0)}</span>
      </div>
    </div>
  );
}
