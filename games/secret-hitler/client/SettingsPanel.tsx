import { useId } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { ROLE_COUNTS, SKIP_AFTER_OPTIONS, fascistTrack, type SecretHitlerSettings } from '../shared/index.js';
import { PowerGlyph } from './Glyphs';
import { s } from './strings';

function Group({ title, hint, children, stack }: { title: string; hint?: string; children: React.ReactNode; stack?: boolean }) {
  const id = useId();
  const label = (
    <span id={id} className="sh-set-label">
      {title}
    </span>
  );
  return (
    <div className="sh-set" role="group" aria-labelledby={id}>
      {stack ? (
        <>
          {label}
          {children}
        </>
      ) : (
        <div className="sh-set-row">
          {label}
          {children}
        </div>
      )}
      {hint && <p className="sh-set-hint">{hint}</p>}
    </div>
  );
}

const COUNTS = [5, 6, 7, 8, 9, 10];

export function SettingsPanel({ settings, editable, onChange, section, players }: SettingsPanelProps<SecretHitlerSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const n = players.filter((p) => p.connected).length;

  return (
    <div className="sh-settings">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group stack title={s.settings.roles} hint={s.settings.rolesHint(n)}>
            <table className="sh-roles-table">
              <thead>
                <tr>
                  <th scope="col">{s.settings.players}</th>
                  <th scope="col" className="sh-c-lib">{s.role.liberal}</th>
                  <th scope="col" className="sh-c-fas">{s.role.fascist}</th>
                  <th scope="col" className="sh-c-fas">{s.role.hitler}</th>
                </tr>
              </thead>
              <tbody>
                {COUNTS.map((c) => (
                  <tr key={c} data-current={c === n || undefined}>
                    <th scope="row">{c}</th>
                    <td>{ROLE_COUNTS[c]!.liberal}</td>
                    <td>{ROLE_COUNTS[c]!.fascist}</td>
                    <td>1</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Group>
          <Group stack title={s.settings.track}>
            <div className="sh-track-mini-list">
              {(['5–6', '7–8', '9–10'] as const).map((label, i) => (
                <div key={label} className="sh-track-mini" data-current={(n <= 6 ? 0 : n <= 8 ? 1 : 2) === i || undefined}>
                  <span className="sh-track-mini-label">{label}</span>
                  <span className="sh-track-mini-slots">
                    {fascistTrack([5, 7, 9][i]!).map((p, k) => (
                      <span key={k} className="sh-track-mini-slot" title={p ? s.power[p] : undefined}>
                        {p && <PowerGlyph power={p} size={12} />}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </Group>
        </>
      )}

      {showSecondary && (
        <Group stack title={s.settings.skipAfter} hint={s.settings.skipHint}>
          <div className="chips">
            {SKIP_AFTER_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className="chip"
                aria-pressed={settings.skipAfter === v}
                disabled={!editable}
                onClick={() => editable && onChange({ ...settings, skipAfter: v })}
              >
                {s.settings.sec(v)}
              </button>
            ))}
          </div>
        </Group>
      )}
    </div>
  );
}
