import type { SettingsPanelProps } from '@songie/game-kit/client';
import {
  DISCUSS_SECONDS_OPTIONS,
  ROLE_SECONDS_OPTIONS,
  SPECIAL_ROLES,
  VOTE_SECONDS_OPTIONS,
  recommendedRoles,
  roleCountsSchema,
  rolesProblem,
  villagerCount,
  type RoleCounts,
  type WerewolfSettings,
} from '../shared/index.js';
import { RoleGlyph } from './Glyphs';
import { s } from './strings';

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="sgs-legend ww-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

function Chips<T extends string | number>({
  options,
  value,
  label,
  editable,
  onPick,
}: {
  options: readonly T[];
  value: T;
  label: (v: T) => string;
  editable: boolean;
  onPick: (v: T) => void;
}) {
  return (
    <div className="chips">
      {options.map((v) => (
        <button key={String(v)} type="button" className="chip" aria-pressed={value === v} disabled={!editable} onClick={() => editable && onPick(v)}>
          {label(v)}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, on, editable, onChange }: { label: string; on: boolean; editable: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={on} disabled={!editable} onClick={() => editable && onChange(!on)}>
      <span>{label}</span>
      <span className="toggle-knob" aria-hidden="true" />
    </button>
  );
}

const WOLF_MAX = roleCountsSchema.shape.wolf.maxValue ?? 5;

export function SettingsPanel({ settings, editable, onChange, section, players }: SettingsPanelProps<WerewolfSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const n = players.filter((p) => p.connected).length;
  const set = (patch: Partial<WerewolfSettings>) => editable && onChange({ ...settings, ...patch });
  const setRoles = (patch: Partial<RoleCounts>) => set({ roles: { ...settings.roles, ...patch } });
  const villagers = villagerCount(settings.roles, n);
  const problem = rolesProblem(settings.roles, n);
  const rec = recommendedRoles(n);
  const isRec = JSON.stringify(rec) === JSON.stringify(settings.roles);

  return (
    <div className="sgs ww-settings">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.roles} hint={s.settings.rolesHint}>
            <div className="ww-rolepick">
              <div className="ww-rolerow" data-role="wolf">
                <span className="ww-rolerow-icon">
                  <RoleGlyph role="wolf" size={18} />
                </span>
                <span className="ww-rolerow-name">{s.role.wolf}</span>
                <span className="ww-stepper">
                  <button
                    type="button"
                    className="ww-stepper-btn"
                    disabled={!editable || settings.roles.wolf <= 1}
                    aria-label={s.settings.less(s.role.wolf)}
                    onClick={() => setRoles({ wolf: settings.roles.wolf - 1 })}
                  >
                    −
                  </button>
                  <span className="mono ww-stepper-n">{settings.roles.wolf}</span>
                  <button
                    type="button"
                    className="ww-stepper-btn"
                    disabled={!editable || settings.roles.wolf >= WOLF_MAX}
                    aria-label={s.settings.more(s.role.wolf)}
                    onClick={() => setRoles({ wolf: settings.roles.wolf + 1 })}
                  >
                    +
                  </button>
                </span>
              </div>
              {SPECIAL_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="ww-rolerow ww-rolerow-toggle"
                  data-role={r}
                  role="switch"
                  aria-checked={settings.roles[r] > 0}
                  disabled={!editable}
                  onClick={() => setRoles({ [r]: settings.roles[r] > 0 ? 0 : 1 })}
                >
                  <span className="ww-rolerow-icon">
                    <RoleGlyph role={r} size={18} />
                  </span>
                  <span className="ww-rolerow-name">{s.role[r]}</span>
                  <span className="toggle-knob" aria-hidden="true" />
                </button>
              ))}
              <div className="ww-rolerow" data-role="villager" data-off={villagers < 1 || undefined}>
                <span className="ww-rolerow-icon">
                  <RoleGlyph role="villager" size={18} />
                </span>
                <span className="ww-rolerow-name">{s.settings.villagers(villagers)}</span>
              </div>
            </div>
            {problem && n > 0 && <p className="error-text ww-settings-problem">{problem}</p>}
            {editable && (
              <button type="button" className="btn btn-outline btn-block" disabled={isRec} onClick={() => set({ roles: rec })}>
                {n >= 5 ? s.settings.recommend(n) : s.settings.recommendShort}
              </button>
            )}
          </Group>
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.roleSeconds} hint={s.settings.roleSecondsHint}>
            <Chips options={ROLE_SECONDS_OPTIONS} value={settings.roleSeconds as never} label={s.settings.sec} editable={editable} onPick={(v) => set({ roleSeconds: v })} />
          </Group>
          <Group title={s.settings.discussSeconds} hint={s.settings.discussHint}>
            <Chips
              options={DISCUSS_SECONDS_OPTIONS}
              value={settings.discussSeconds as never}
              label={s.settings.sec}
              editable={editable}
              onPick={(v) => set({ discussSeconds: v })}
            />
          </Group>
          <Group title={s.settings.voteSeconds}>
            <Chips options={VOTE_SECONDS_OPTIONS} value={settings.voteSeconds as never} label={s.settings.sec} editable={editable} onPick={(v) => set({ voteSeconds: v })} />
          </Group>
          <Group title={s.settings.dayTie}>
            <Chips
              options={['runoff', 'none'] as const}
              value={settings.dayTie}
              label={(v) => s.settings.dayTieOpts[v]}
              editable={editable}
              onPick={(v) => set({ dayTie: v })}
            />
          </Group>
          <Group title={s.settings.wolfTie}>
            <Chips
              options={['random', 'none'] as const}
              value={settings.wolfTie}
              label={(v) => s.settings.wolfTieOpts[v]}
              editable={editable}
              onPick={(v) => set({ wolfTie: v })}
            />
          </Group>
          <Group title={s.settings.rules}>
            <div className="sgs-stack">
              <Toggle label={s.settings.revealRoles} on={settings.revealRoles} editable={editable} onChange={(v) => set({ revealRoles: v })} />
              <Toggle label={s.settings.openVotes} on={settings.openVotes} editable={editable} onChange={(v) => set({ openVotes: v })} />
              <Toggle label={s.settings.doctorNoRepeat} on={settings.doctorNoRepeat} editable={editable} onChange={(v) => set({ doctorNoRepeat: v })} />
              <Toggle label={s.settings.ghostsSeeRoles} on={settings.ghostsSeeRoles} editable={editable} onChange={(v) => set({ ghostsSeeRoles: v })} />
            </div>
          </Group>
        </>
      )}
    </div>
  );
}
