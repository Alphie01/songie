import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import { HINT_OPTIONS, type CategoryInfo, type WhoAmISettings } from '../shared/index.js';
import { s } from './strings';

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="sgs-legend wa-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<WhoAmISettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const set = (patch: Partial<WhoAmISettings>) => editable && onChange({ ...settings, ...patch });

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

  return (
    <div className="sgs">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.categories} hint={s.settings.categoriesHint}>
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
          <AddCard api={api} />
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.turnMode} hint={settings.turnMode === 'classic' ? s.settings.classicHint : s.settings.threeHint}>
            <div className="sgs-stack">
              {(['classic', 'three'] as const).map((m) => (
                <button key={m} type="button" className="option" aria-pressed={settings.turnMode === m} disabled={!editable} onClick={() => set({ turnMode: m })}>
                  {m === 'classic' ? s.settings.classic : s.settings.three}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.verify} hint={settings.groupVerify ? s.settings.groupHint : s.settings.autoHint}>
            <div className="sgs-stack">
              {([false, true] as const).map((g) => (
                <button key={String(g)} type="button" className="option" aria-pressed={settings.groupVerify === g} disabled={!editable} onClick={() => set({ groupVerify: g })}>
                  {g ? s.settings.group : s.settings.auto}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.hints} hint={s.settings.hintsHint(settings.hints)}>
            <div className="chips">
              {HINT_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.hints === n} disabled={!editable} onClick={() => set({ hints: n })}>
                  {n}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.typed} hint={s.settings.typedHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.typedQuestions}
              disabled={!editable}
              onClick={() => set({ typedQuestions: !settings.typedQuestions })}
            >
              {settings.typedQuestions ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>
        </>
      )}
    </div>
  );
}

/** Herkes kimlik ekleyebilir; eklenenler hiçbir ekranda listelenmez (sürpriz bozulmasın). */
function AddCard({ api }: { api: SettingsPanelProps<WhoAmISettings>['api'] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const list = aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      await api.post('/cards', { name, aliases: list });
      setMsg({ text: s.settings.saved(name.trim()), error: false });
      setName('');
      setAliases('');
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Eklenemedi. Tekrar dene.', error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Group title={s.settings.add} hint={s.settings.addHint}>
      <button type="button" className="btn btn-ghost sgs-browse" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="chevron" size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        {s.settings.add}
      </button>
      {open && (
        <form className="wa-addcard" onSubmit={submit}>
          <input className="input" value={name} maxLength={40} placeholder={s.settings.addName} aria-label={s.settings.addName} onChange={(e) => setName(e.target.value)} />
          <input
            className="input"
            value={aliases}
            maxLength={200}
            placeholder={s.settings.addAliases}
            aria-label={s.settings.addAliases}
            onChange={(e) => setAliases(e.target.value)}
          />
          <button className="btn btn-outline" disabled={busy || name.trim().length < 2}>
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
