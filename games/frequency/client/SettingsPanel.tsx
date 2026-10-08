import { useState, type FormEvent, type ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import {
  MIN_TEAM,
  ROUND_OPTIONS,
  SECONDS_OPTIONS,
  TARGET_SCORE_OPTIONS,
  type FrequencySettings,
  type TeamId,
} from '../shared/index.js';
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

function Toggle({ on, editable, onClick }: { on: boolean; editable: boolean; onClick(): void }) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={on} disabled={!editable} onClick={onClick}>
      {on ? s.settings.on : s.settings.off}
      <span className="toggle-knob" aria-hidden="true" />
    </button>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section, players }: SettingsPanelProps<FrequencySettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<FrequencySettings>) => editable && onChange({ ...settings, ...patch });

  const present = new Set(players.map((p) => p.id));
  const teamA = settings.teams.a.filter((id) => present.has(id));
  const teamB = settings.teams.b.filter((id) => present.has(id) && !teamA.includes(id));
  const unassigned = players.filter((p) => !teamA.includes(p.id) && !teamB.includes(p.id)).map((p) => p.id);
  const byId = new Map(players.map((p) => [p.id, p]));
  const teams = settings.mode === 'teams';

  /** Takımsız, Yeşil, Mor döngüsü. */
  function cycle(id: string) {
    const inA = teamA.includes(id);
    const inB = teamB.includes(id);
    const a = teamA.filter((x) => x !== id);
    const b = teamB.filter((x) => x !== id);
    if (!inA && !inB) a.push(id);
    else if (inA) b.push(id);
    set({ teams: { a, b } });
  }

  function shuffleTeams() {
    const ids = [...players.map((p) => p.id)].sort(() => Math.random() - 0.5);
    const half = Math.ceil(ids.length / 2);
    set({ teams: { a: ids.slice(0, half), b: ids.slice(half) } });
  }

  function TeamBox({ team, ids }: { team: TeamId | null; ids: string[] }) {
    return (
      <div className="fq-teambox" data-team={team ?? undefined}>
        <div className="fq-teambox-head">
          <span className="fq-team-name">{team ? s.team[team] : s.settings.unassigned}</span>
          <span className="mono dim">{ids.length}</span>
        </div>
        {ids.length === 0 ? (
          <p className="sgs-hint">{s.settings.empty}</p>
        ) : (
          <div className="fq-chips">
            {ids.map((id) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <button key={id} type="button" className="fq-player" disabled={!editable} onClick={() => cycle(id)}>
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
          <Group title={s.settings.mode} hint={teams ? s.settings.modeTeamsHint : s.settings.modeCoopHint}>
            <div className="sgs-stack">
              <button type="button" className="option" aria-pressed={teams} disabled={!editable} onClick={() => set({ mode: 'teams' })}>
                {s.settings.modeTeams}
              </button>
              <button type="button" className="option" aria-pressed={!teams} disabled={!editable} onClick={() => set({ mode: 'coop' })}>
                {s.settings.modeCoop}
              </button>
            </div>
          </Group>

          {teams && (
            <Group
              title={s.settings.teams}
              hint={teamA.length < MIN_TEAM || teamB.length < MIN_TEAM ? `${s.settings.needTwo} ${s.settings.teamsHint}` : s.settings.teamsHint}
            >
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
          )}

          {teams ? (
            <Group title={s.settings.targetScore}>
              <div className="chips">
                {TARGET_SCORE_OPTIONS.map((n) => (
                  <button key={n} type="button" className="chip" aria-pressed={settings.targetScore === n} disabled={!editable} onClick={() => set({ targetScore: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </Group>
          ) : (
            <Group title={s.settings.rounds}>
              <div className="chips">
                {ROUND_OPTIONS.map((n) => (
                  <button key={n} type="button" className="chip" aria-pressed={settings.rounds === n} disabled={!editable} onClick={() => set({ rounds: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </Group>
          )}
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.seconds} hint={s.settings.secondsHint}>
            <div className="chips">
              {SECONDS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.seconds === n} disabled={!editable} onClick={() => set({ seconds: n })}>
                  {n === 0 ? s.settings.untimed : s.settings.sec(n)}
                </button>
              ))}
            </div>
          </Group>
          <Group title={s.settings.cardChoice} hint={s.settings.cardChoiceHint}>
            <Toggle on={settings.cardChoice} editable={editable} onClick={() => set({ cardChoice: !settings.cardChoice })} />
          </Group>
          <Group title={s.settings.majorityLock} hint={s.settings.majorityLockHint}>
            <Toggle on={settings.majorityLock} editable={editable} onClick={() => set({ majorityLock: !settings.majorityLock })} />
          </Group>
          <Group title={s.settings.catchUp} hint={s.settings.catchUpHint}>
            <Toggle on={settings.catchUp} editable={editable} onClick={() => set({ catchUp: !settings.catchUp })} />
          </Group>
          <Group title={s.settings.friendCards} hint={s.settings.friendCardsHint}>
            <Toggle on={settings.friendCards} editable={editable} onClick={() => set({ friendCards: !settings.friendCards })} />
          </Group>
          <AddCard api={api} />
        </>
      )}
    </div>
  );
}

/** Her oyuncu kart ekleyebilir; kartlar hiçbir ekranda listelenmez. */
function AddCard({ api }: { api: SettingsPanelProps<FrequencySettings>['api'] }) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/cards', { left, right });
      setMsg({ text: s.settings.saved(left.trim(), right.trim()), error: false });
      setLeft('');
      setRight('');
    } catch (err) {
      setMsg({ text: err instanceof Error && err.message ? err.message : s.settings.failed, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Group title={s.settings.addCard} hint={s.settings.addCardHint}>
      <button type="button" className="btn btn-ghost sgs-browse" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="chevron" size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        {s.settings.addCard}
      </button>
      {open && (
        <form className="fq-addcard" onSubmit={submit}>
          <input className="input" value={left} maxLength={40} placeholder={s.settings.left} aria-label={s.settings.left} onChange={(e) => setLeft(e.target.value)} />
          <input className="input" value={right} maxLength={40} placeholder={s.settings.right} aria-label={s.settings.right} onChange={(e) => setRight(e.target.value)} />
          <button className="btn btn-outline" disabled={busy || left.trim().length < 2 || right.trim().length < 2}>
            {busy ? s.settings.saving : s.settings.save}
          </button>
          {msg && (
            <p className={msg.error ? 'error-text' : 'sgs-hint'} role="status">
              {msg.text}
            </p>
          )}
        </form>
      )}
    </Group>
  );
}
