import type { ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { TURN_OPTIONS, type ColorCardsSettings } from '../shared/index.js';
import { s } from './strings';

/** Lobi tasarımındaki ayar satırı: solda ad, sağda seçenekler; altında kısa açıklama. */
function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="cc-set" role="group" aria-label={title}>
      <div className="cc-set-row">
        <span className="cc-set-label">{title}</span>
        {children}
      </div>
      {hint && <p className="cc-set-hint">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, on, disabled, onClick }: { label: string; hint: string; on: boolean; disabled: boolean; onClick(): void }) {
  return (
    <div className="cc-rule">
      <button type="button" className="toggle" role="switch" aria-checked={on} disabled={disabled} onClick={onClick}>
        {label}
        <span className="toggle-knob" aria-hidden="true" />
      </button>
      <p className="cc-set-hint">{hint}</p>
    </div>
  );
}

export function SettingsPanel({ settings, editable, onChange, section }: SettingsPanelProps<ColorCardsSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<ColorCardsSettings>) => editable && onChange({ ...settings, ...patch });

  return (
    <div className="cc-settings">
      {showPrimary && (
        <>
          {!editable && <p className="cc-set-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.mode} hint={s.settings.modeHint(settings.mode === 'single')}>
            <div className="cc-set-chips">
              {(['single', 'points'] as const).map((m) => (
                <button key={m} type="button" className="chip" aria-pressed={settings.mode === m} disabled={!editable} onClick={() => set({ mode: m })}>
                  {m === 'single' ? s.settings.single : s.settings.points}
                </button>
              ))}
            </div>
          </Group>
          <Group title={s.settings.turn} hint={s.settings.turnHint}>
            <div className="cc-set-chips">
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
        <div className="cc-set">
          <span className="cc-set-label">{s.settings.house}</span>
          <p className="cc-set-hint">{s.settings.houseHint}</p>
          <div className="cc-rules">
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
        </div>
      )}
    </div>
  );
}
