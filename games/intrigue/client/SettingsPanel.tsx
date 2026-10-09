import type { ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { CHALLENGE_OPTIONS, ROLES, SMALL_TABLE_MAX, TURN_OPTIONS, cardsPerRole, type IntrigueSettings } from '../shared/index.js';
import { RoleCard } from './RoleArt';
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

export function SettingsPanel({ settings, editable, onChange, section, players }: SettingsPanelProps<IntrigueSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<IntrigueSettings>) => editable && onChange({ ...settings, ...patch });
  const n = players.length;
  const forced = n > SMALL_TABLE_MAX;

  return (
    <div className="sgs">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.deck} hint={s.settings.deckHint(n, settings.bigDeck)}>
            <div className="ig-deckinfo" aria-hidden="true">
              {ROLES.map((r) => (
                <span key={r} className="ig-deckinfo-role">
                  <RoleCard role={r} size="mini" />
                  <span className="mono dim">×{cardsPerRole(n, settings.bigDeck)}</span>
                </span>
              ))}
            </div>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.bigDeck || forced}
              disabled={!editable || forced}
              onClick={() => set({ bigDeck: !settings.bigDeck })}
            >
              {s.settings.bigDeck}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.challenge} hint={s.settings.challengeHint}>
            <div className="chips">
              {CHALLENGE_OPTIONS.map((v) => (
                <button key={v} type="button" className="chip" aria-pressed={settings.challengeSeconds === v} disabled={!editable} onClick={() => set({ challengeSeconds: v })}>
                  {s.settings.sec(v)}
                </button>
              ))}
            </div>
          </Group>
          <Group title={s.settings.turn} hint={s.settings.turnHint}>
            <div className="chips">
              {TURN_OPTIONS.map((v) => (
                <button key={v} type="button" className="chip" aria-pressed={settings.turnSeconds === v} disabled={!editable} onClick={() => set({ turnSeconds: v })}>
                  {v === 0 ? s.settings.unlimited : s.settings.sec(v)}
                </button>
              ))}
            </div>
          </Group>
        </>
      )}
    </div>
  );
}
