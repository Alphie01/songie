import { useId, type ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { NOPE_OPTIONS, SINGLE_DECK_MAX, TURN_OPTIONS, type KittenSettings } from '../shared/index.js';
import { CardBack } from './CardArt';
import { s } from './strings';

/** Lobi tasarımındaki ayar satırı: solda ad, sağda seçenekler; altında kısa açıklama. */
function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="kt-set" role="group" aria-labelledby={id}>
      <div className="kt-set-row">
        <span id={id} className="kt-set-label">
          {title}
        </span>
        <div className="kt-set-opts">{children}</div>
      </div>
      {hint && <p className="kt-set-hint">{hint}</p>}
    </div>
  );
}

export function SettingsPanel({ settings, editable, onChange, section, players }: SettingsPanelProps<KittenSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<KittenSettings>) => editable && onChange({ ...settings, ...patch });

  return (
    <div className="kt-settings">
      {showPrimary && (
        <>
          {!editable && <p className="kt-set-readonly">{s.settings.readOnly}</p>}
          <Row title={s.settings.deck} hint={s.settings.deckHint(players.length)}>
            <span className="kt-deckinfo" aria-hidden="true">
              <CardBack small />
              {players.length > SINGLE_DECK_MAX && <CardBack small />}
            </span>
          </Row>
          <Row title={s.settings.five} hint={s.settings.fiveHint}>
            <button
              type="button"
              className="toggle kt-toggle"
              role="switch"
              aria-checked={settings.fiveCats}
              aria-label={s.settings.five}
              disabled={!editable}
              onClick={() => set({ fiveCats: !settings.fiveCats })}
            >
              {settings.fiveCats ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Row>
        </>
      )}

      {showSecondary && (
        <>
          <Row title={s.settings.nope} hint={s.settings.nopeHint}>
            {NOPE_OPTIONS.map((n) => (
              <button key={n} type="button" className="chip" aria-pressed={settings.nopeSeconds === n} aria-label={s.settings.sec(n)} disabled={!editable} onClick={() => set({ nopeSeconds: n })}>
                {n === NOPE_OPTIONS[NOPE_OPTIONS.length - 1] ? s.settings.sec(n) : n}
              </button>
            ))}
          </Row>
          <Row title={s.settings.turn} hint={s.settings.turnHint}>
            {TURN_OPTIONS.map((n) => (
              <button key={n} type="button" className="chip" aria-pressed={settings.turnSeconds === n} aria-label={n === 0 ? s.settings.unlimited : s.settings.sec(n)} disabled={!editable} onClick={() => set({ turnSeconds: n })}>
                {n === 0 ? s.settings.unlimited : n === TURN_OPTIONS[TURN_OPTIONS.length - 1] ? s.settings.sec(n) : n}
              </button>
            ))}
          </Row>
        </>
      )}
    </div>
  );
}
