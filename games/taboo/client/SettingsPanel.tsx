import { useEffect, useId, useState, type FormEvent } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import {
  PASS_OPTIONS,
  isAdultCategory,
  SECONDS_OPTIONS,
  TURN_OPTIONS,
  type CategoryInfo,
  type TabooSettings,
  type TeamId,
} from '../shared/index.js';
import { s } from './strings';

function Group({ title, hint, row = false, children }: { title: string; hint?: string; row?: boolean; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="tbs-group" data-row={row || undefined}>
      <span id={id} className="tbs-legend">
        {title}
      </span>
      <div className="tbs-body">{children}</div>
      {hint && <p className="tbs-hint">{hint}</p>}
    </div>
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
      <div className="tbs-team tb-teambox" data-team={team ?? 'none'}>
        <span className="tbs-team-name">
          {team ? s.team[team] : s.settings.unassigned}
          <span className="tbs-team-count">{ids.length}</span>
        </span>
        {ids.length === 0 ? (
          <span className="tbs-team-empty">{s.settings.empty}</span>
        ) : (
          ids.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <button key={id} type="button" className="tbs-player tb-player" data-off={!p.connected || undefined} disabled={!editable} onClick={() => cycle(id)}>
                <Avatar avatar={p.avatar} nick={p.nick} size={26} />
                <span className="tbs-player-nick">{p.nick}</span>
              </button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="sgs tbs">
      {showPrimary && (
        <>
          {!editable && <p className="tbs-readonly">{s.settings.readOnly}</p>}
          <div className="tbs-teams-head">
            <span className="tbs-legend">{s.settings.teams}</span>
            {editable && (
              <button type="button" className="tbs-shuffle" onClick={shuffleTeams}>
                <Icon name="shuffle" size={14} />
                {s.settings.shuffle}
              </button>
            )}
          </div>
          <div className="tbs-teams">
            <TeamBox team="a" ids={teamA} />
            <TeamBox team="b" ids={teamB} />
            {unassigned.length > 0 && <TeamBox team={null} ids={unassigned} />}
          </div>
          <p className="tbs-hint">{teamA.length < 2 || teamB.length < 2 ? `${s.settings.needTwo} ${s.settings.teamsHint}` : s.settings.teamsHint}</p>

          <Group title={s.settings.categories} hint={settings.categories.some(isAdultCategory) ? s.settings.adultHint : undefined}>
            <div className="chips">
              {(categories ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  data-bold={isAdultCategory(c.id) || undefined}
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
          <Group row title={s.settings.seconds}>
            <div className="chips">
              {SECONDS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.seconds === n} disabled={!editable} onClick={() => set({ seconds: n })}>
                  {s.settings.sec(n)}
                </button>
              ))}
            </div>
          </Group>

          <Group row title={s.settings.passes}>
            <div className="chips">
              {PASS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.passes === n} disabled={!editable} onClick={() => set({ passes: n })}>
                  {n < 0 ? s.settings.unlimited : n}
                </button>
              ))}
            </div>
          </Group>

          <Group row title={s.settings.turns} hint={s.settings.turnsHint(settings.turns)}>
            <div className="chips">
              {TURN_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.turns === n} disabled={!editable} onClick={() => set({ turns: n })}>
                  {n === 0 ? s.settings.unlimited : n}
                </button>
              ))}
            </div>
          </Group>

          <Group row title={s.settings.penalty} hint={s.settings.penaltyHint}>
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
      <button type="button" className="tbs-shuffle tbs-addcard-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
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
          <button className="btn btn-yellow" disabled={busy || !word.trim() || taboo.some((t) => !t.trim())}>
            {busy ? s.settings.saving : s.settings.save}
          </button>
          {msg && (
            <p className={msg.error ? 'error-text' : 'tbs-hint'} role="status">
              {msg.text}
            </p>
          )}
        </form>
      )}
    </Group>
  );
}
