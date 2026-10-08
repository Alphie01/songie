import type { ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { NOPE_OPTIONS, TURN_OPTIONS, type KittenSettings } from '../shared/index.js';
import { s } from './strings';

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="eyebrow sgs-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

export function SettingsPanel({ settings, editable, onChange, section, players }: SettingsPanelProps<KittenSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<KittenSettings>) => editable && onChange({ ...settings, ...patch });

  return (
    <div className="sgs">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.deck} hint={s.settings.deckHint(players.length)}>
            <div className="kt-deckinfo" aria-hidden="true">
              <span className="kt-back kt-back-sm" />
              {players.length > 5 && <span className="kt-back kt-back-sm" />}
            </div>
          </Group>
          <Group title={s.settings.five} hint={s.settings.fiveHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.fiveCats}
              disabled={!editable}
              onClick={() => set({ fiveCats: !settings.fiveCats })}
            >
              {settings.fiveCats ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.nope} hint={s.settings.nopeHint}>
            <div className="chips">
              {NOPE_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.nopeSeconds === n} disabled={!editable} onClick={() => set({ nopeSeconds: n })}>
                  {s.settings.sec(n)}
                </button>
              ))}
            </div>
          </Group>
          <Group title={s.settings.turn} hint={s.settings.turnHint}>
            <div className="chips">
              {TURN_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.turnSeconds === n} disabled={!editable} onClick={() => set({ turnSeconds: n })}>
                  {n === 0 ? s.settings.unlimited : s.settings.sec(n)}
                </button>
              ))}
            </div>
          </Group>
        </>
      )}
    </div>
  );
}
