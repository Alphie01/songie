import { useEffect, useState, type FormEvent } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import {
  PASS_OPTIONS,
  SECONDS_OPTIONS,
  TURN_OPTIONS,
  type CategoryInfo,
  type TabooSettings,
  type TeamId,
} from '../shared/index.js';
import { s } from './strings';

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="eyebrow sgs-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section, players }: SettingsPanelProps<TabooSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const set = (patch: Partial<TabooSettings>) => editable && onChange({ ...settings, ...patch });

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

  /** Takımsız → Yeşil → Mor → Takımsız döngüsü. */
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
      <div className="tb-teambox" data-team={team ?? 'none'}>
        <div className="tb-teambox-head">
          <span className="tb-team-name">{team ? s.team[team] : s.settings.unassigned}</span>
          <span className="mono dim">{ids.length}</span>
        </div>
        {ids.length === 0 ? (
          <p className="sgs-hint">{s.settings.empty}</p>
        ) : (
          <div className="tb-chips">
            {ids.map((id) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <button key={id} type="button" className="tb-player" disabled={!editable} onClick={() => cycle(id)}>
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
          <Group
            title={s.settings.teams}
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

          <Group title={s.settings.categories}>
            <div className="chips">
              {(categories ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
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

          <Group title={s.settings.passes}>
            <div className="chips">
              {PASS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.passes === n} disabled={!editable} onClick={() => set({ passes: n })}>
                  {n < 0 ? s.settings.unlimited : n}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.turns} hint={s.settings.turnsHint(settings.turns)}>
            <div className="chips">
              {TURN_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.turns === n} disabled={!editable} onClick={() => set({ turns: n })}>
                  {n === 0 ? s.settings.unlimited : n}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.penalty} hint={s.settings.penaltyHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.tabooPenalty}
              disabled={!editable}
              onClick={() => set({ tabooPenalty: !settings.tabooPenalty })}
            >
              {settings.tabooPenalty ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>

          <AddCard api={api} />
        </>
      )}
    </div>
  );
}

/** Her oyuncu kart ekleyebilir; kartlar hiçbir ekranda listelenmez (sürpriz bozulmasın). */
function AddCard({ api }: { api: SettingsPanelProps<TabooSettings>['api'] }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [taboo, setTaboo] = useState(['', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/cards', { word, taboo });
      setMsg({ text: s.settings.saved(word.trim()), error: false });
      setWord('');
      setTaboo(['', '', '', '', '']);
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Eklenemedi.', error: true });
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
        <form className="tb-addcard" onSubmit={submit}>
          <input className="input" value={word} maxLength={40} placeholder={s.settings.word} aria-label={s.settings.word} onChange={(e) => setWord(e.target.value)} />
          {taboo.map((t, i) => (
            <input
              key={i}
              className="input tb-addcard-taboo"
              value={t}
              maxLength={30}
              placeholder={s.settings.taboo(i + 1)}
              aria-label={s.settings.taboo(i + 1)}
              onChange={(e) => setTaboo((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          <button className="btn btn-outline" disabled={busy || !word.trim() || taboo.some((t) => !t.trim())}>
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
