import type { ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { TURN_OPTIONS, type ColorCardsSettings } from '../shared/index.js';
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

function Toggle({ label, hint, on, disabled, onClick }: { label: string; hint: string; on: boolean; disabled: boolean; onClick(): void }) {
  return (
    <div className="cc-rule">
      <button type="button" className="toggle" role="switch" aria-checked={on} disabled={disabled} onClick={onClick}>
        {label}
        <span className="toggle-knob" aria-hidden="true" />
      </button>
      <p className="sgs-hint">{hint}</p>
    </div>
  );
}

export function SettingsPanel({ settings, editable, onChange, section }: SettingsPanelProps<ColorCardsSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<ColorCardsSettings>) => editable && onChange({ ...settings, ...patch });

  return (
    <div className="sgs">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.mode} hint={s.settings.modeHint(settings.mode === 'single')}>
            <div className="chips">
              {(['single', 'points'] as const).map((m) => (
                <button key={m} type="button" className="chip" aria-pressed={settings.mode === m} disabled={!editable} onClick={() => set({ mode: m })}>
                  {m === 'single' ? s.settings.single : s.settings.points}
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

      {showSecondary && (
        <Group title={s.settings.house} hint={s.settings.houseHint}>
          <div className="sgs-stack cc-rules">
            <Toggle
              label={s.settings.stacking}
              hint={s.settings.stackingHint}
              on={settings.stacking}
              disabled={!editable}
              onClick={() => set({ stacking: !settings.stacking })}
            />
            <Toggle
              label={s.settings.sevenZero}
              hint={s.settings.sevenZeroHint}
              on={settings.sevenZero}
              disabled={!editable}
              onClick={() => set({ sevenZero: !settings.sevenZero })}
            />
            <Toggle
              label={s.settings.drawUntil}
              hint={s.settings.drawUntilHint}
              on={settings.drawUntilPlayable}
              disabled={!editable}
              onClick={() => set({ drawUntilPlayable: !settings.drawUntilPlayable })}
            />
          </div>
        </Group>
      )}
    </div>
  );
}
