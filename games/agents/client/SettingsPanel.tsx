import type { ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { PACKS, SECONDS_OPTIONS, TEAM_IDS, type AgentsSettings, type TeamId } from '../shared/index.js';
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

export function SettingsPanel({ settings, editable, onChange, section, players }: SettingsPanelProps<AgentsSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<AgentsSettings>) => editable && onChange({ ...settings, ...patch });

  const present = new Set(players.map((p) => p.id));
  const teamA = settings.teams.a.filter((id) => present.has(id));
  const teamB = settings.teams.b.filter((id) => present.has(id) && !teamA.includes(id));
  const teams: Record<TeamId, string[]> = { a: teamA, b: teamB };
  const unassigned = players.filter((p) => !teamA.includes(p.id) && !teamB.includes(p.id)).map((p) => p.id);
  const byId = new Map(players.map((p) => [p.id, p]));

  /** Takımsız → Yeşil → Mor → Takımsız. Takım değişince liderlik düşer. */
  function cycle(id: string) {
    const inA = teamA.includes(id);
    const inB = teamB.includes(id);
    const a = teamA.filter((x) => x !== id);
    const b = teamB.filter((x) => x !== id);
    if (!inA && !inB) a.push(id);
    else if (inA) b.push(id);
    const leaders = {
      a: settings.leaders.a === id ? null : settings.leaders.a,
      b: settings.leaders.b === id ? null : settings.leaders.b,
    };
    set({ teams: { a, b }, leaders });
  }

  function shuffleTeams() {
    const ids = [...players.map((p) => p.id)].sort(() => Math.random() - 0.5);
    const half = Math.ceil(ids.length / 2);
    set({ teams: { a: ids.slice(0, half), b: ids.slice(half) }, leaders: { a: null, b: null } });
  }

  function TeamBox({ team, ids }: { team: TeamId | null; ids: string[] }) {
    return (
      <div className="ag-teambox" data-team={team ?? 'none'}>
        <div className="ag-teambox-head">
          <span className="ag-team-name">{team ? s.team[team] : s.settings.unassigned}</span>
          <span className="mono dim">{ids.length}</span>
        </div>
        {ids.length === 0 ? (
          <p className="sgs-hint">{s.settings.empty}</p>
        ) : (
          <div className="ag-chips">
            {ids.map((id) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <button key={id} type="button" className="ag-player" disabled={!editable} onClick={() => cycle(id)}>
                  <Avatar avatar={p.avatar} nick={p.nick} size={22} />
                  {p.nick}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sgs">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.teams} hint={teamA.length < 2 || teamB.length < 2 ? `${s.settings.needTwo} ${s.settings.teamsHint}` : s.settings.teamsHint}>
            <TeamBox team="a" ids={teamA} />
            <TeamBox team="b" ids={teamB} />
            {unassigned.length > 0 && <TeamBox team={null} ids={unassigned} />}
            {editable && (
              <button type="button" className="btn btn-ghost sgs-browse" onClick={shuffleTeams}>
                <Icon name="shuffle" size={14} />
                {s.settings.shuffle}
              </button>
            )}
          </Group>

          <Group title={s.settings.leaders} hint={s.settings.leaderHint}>
            <div className="sgs-stack">
              {(['random', 'host'] as const).map((m) => (
                <button key={m} type="button" className="option" aria-pressed={settings.leaderPick === m} disabled={!editable} onClick={() => set({ leaderPick: m })}>
                  {s.settings.leaderPick[m]}
                </button>
              ))}
            </div>
            {settings.leaderPick === 'host' &&
              TEAM_IDS.map((t) => (
                <div key={t} className="ag-leaderpick" data-team={t}>
                  <span className="ag-team-name">{s.settings.pickLeader(s.teamShort[t])}</span>
                  {teams[t].length === 0 ? (
                    <p className="sgs-hint">{s.settings.noLeader}</p>
                  ) : (
                    <div className="ag-chips">
                      {teams[t].map((id) => {
                        const p = byId.get(id)!;
                        return (
                          <button
                            key={id}
                            type="button"
                            className="chip"
                            aria-pressed={settings.leaders[t] === id}
                            disabled={!editable}
                            onClick={() => set({ leaders: { ...settings.leaders, [t]: settings.leaders[t] === id ? null : id } })}
                          >
                            {p.nick}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
          </Group>

          <Group title={s.settings.packs} hint={s.settings.packHint}>
            <div className="chips">
              {PACKS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="chip"
                  aria-pressed={settings.packs.includes(p)}
                  disabled={!editable}
                  onClick={() => {
                    const has = settings.packs.includes(p);
                    const next = has ? settings.packs.filter((x) => x !== p) : [...settings.packs, p];
                    if (next.length) set({ packs: next });
                  }}
                >
                  {s.settings.pack[p]}
                </button>
              ))}
            </div>
          </Group>
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.reveal} hint={s.settings.revealHint[settings.revealMode]}>
            <div className="sgs-stack">
              {(['first', 'vote'] as const).map((m) => (
                <button key={m} type="button" className="option" aria-pressed={settings.revealMode === m} disabled={!editable} onClick={() => set({ revealMode: m })}>
                  {s.settings.revealMode[m]}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.timer} hint={s.settings.timerHint[settings.timer]}>
            <div className="sgs-stack">
              {(['off', 'split', 'total'] as const).map((m) => (
                <button key={m} type="button" className="option" aria-pressed={settings.timer === m} disabled={!editable} onClick={() => set({ timer: m })}>
                  {s.settings.timerMode[m]}
                </button>
              ))}
            </div>
            {settings.timer !== 'off' && (
              <div className="chips">
                {SECONDS_OPTIONS.map((n) => (
                  <button key={n} type="button" className="chip" aria-pressed={settings.seconds === n} disabled={!editable} onClick={() => set({ seconds: n })}>
                    {s.settings.sec(n)}
                  </button>
                ))}
              </div>
            )}
          </Group>
        </>
      )}
    </div>
  );
}
