import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { GameApi, SettingsPanelProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { ROUND_OPTIONS, SECONDS_OPTIONS, type CategoryInfo, type FiveSecondsSettings, type TeamId } from '../shared/index.js';
import { s } from './strings';

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="sgs-legend fs-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section, players }: SettingsPanelProps<FiveSecondsSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const set = (patch: Partial<FiveSecondsSettings>) => editable && onChange({ ...settings, ...patch });

  useEffect(() => {
    if (!showPrimary) return;
    let alive = true;
    void api
      .get<{ categories: CategoryInfo[] }>('/categories')
      .then((r) => alive && setCategories(r.categories))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [api, showPrimary]);

  const present = new Set(players.map((p) => p.id));
  const teamA = settings.teams.a.filter((id) => present.has(id));
  const teamB = settings.teams.b.filter((id) => present.has(id) && !teamA.includes(id));
  const unassigned = players.filter((p) => !teamA.includes(p.id) && !teamB.includes(p.id)).map((p) => p.id);
  const byId = new Map(players.map((p) => [p.id, p]));

  /** Takımsız, yeşil, mor, takımsız döngüsü. */
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
      <div className="fs-teambox" data-team={team ?? 'none'}>
        <div className="fs-teambox-head">
          <span className="fs-team-name">{team ? s.team[team] : s.settings.unassigned}</span>
          <span className="mono dim">{ids.length}</span>
        </div>
        {ids.length === 0 ? (
          <p className="sgs-hint">{s.settings.empty}</p>
        ) : (
          <div className="fs-chips">
            {ids.map((id) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <button key={id} type="button" className="fs-player" disabled={!editable} onClick={() => cycle(id)}>
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
          <Group title={s.settings.mode} hint={settings.teamMode ? undefined : s.settings.modeHint}>
            <div className="chips">
              <button type="button" className="chip" aria-pressed={!settings.teamMode} disabled={!editable} onClick={() => set({ teamMode: false })}>
                {s.settings.solo}
              </button>
              <button type="button" className="chip" aria-pressed={settings.teamMode} disabled={!editable} onClick={() => set({ teamMode: true })}>
                {s.settings.teams}
              </button>
            </div>
          </Group>

          {settings.teamMode && (
            <Group
              title={s.settings.teamsTitle}
              hint={teamA.length < 2 || teamB.length < 2 ? `${s.settings.needTwo} ${s.settings.teamsHint}` : s.settings.teamsHint}
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

          <Group title={s.settings.categories} hint={s.settings.categoriesHint}>
            <div className="chips">
              {(categories ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  data-bold={c.id === 'cesur' || undefined}
                  aria-pressed={settings.categories.includes(c.id)}
                  disabled={!editable}
                  onClick={() => {
                    const has = settings.categories.includes(c.id);
                    const next = has ? settings.categories.filter((x) => x !== c.id) : [...settings.categories, c.id];
                    if (next.length) set({ categories: next });
                  }}
                >
                  {c.name}
                  <span className="chip-count">{c.count}</span>
                </button>
              ))}
            </div>
          </Group>
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.seconds}>
            <div className="chips">
              {SECONDS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.seconds === n} disabled={!editable} onClick={() => set({ seconds: n })}>
                  {s.settings.sec(n)}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.rounds} hint={s.settings.roundsHint(settings.rounds)}>
            <div className="chips">
              {ROUND_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.rounds === n} disabled={!editable} onClick={() => set({ rounds: n })}>
                  {n === 0 ? s.settings.unlimited : n}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.steal} hint={s.settings.stealHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.steal}
              disabled={!editable}
              onClick={() => set({ steal: !settings.steal })}
            >
              {settings.steal ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>

          <AddPrompt api={api} />
        </>
      )}
    </div>
  );
}

/** Her oyuncu görev ekleyebilir; eklenen görevler hiçbir ekranda listelenmez. */
function AddPrompt({ api }: { api: GameApi }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/prompts', { text });
      setMsg({ text: s.settings.saved, error: false });
      setText('');
    } catch (err) {
      setMsg({ text: err instanceof Error && err.message ? err.message : s.settings.failed, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Group title={s.settings.addPrompt} hint={s.settings.addPromptHint}>
      <button type="button" className="btn btn-ghost sgs-browse" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="chevron" size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        {s.settings.addPrompt}
      </button>
      {open && (
        <form className="fs-addprompt" onSubmit={submit}>
          <input
            className="input"
            value={text}
            maxLength={120}
            placeholder={s.settings.promptPlaceholder}
            aria-label={s.settings.promptLabel}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-outline" disabled={busy || text.trim().length < 8}>
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
