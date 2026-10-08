import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { GameApi, SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import { LIVES_OPTIONS, ROUND_OPTIONS, SECONDS_OPTIONS, type CategoryInfo, type NeverSettings } from '../shared/index.js';
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

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<NeverSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const set = (patch: Partial<NeverSettings>) => editable && onChange({ ...settings, ...patch });

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

          <Group title={s.settings.lives} hint={s.settings.livesHint(settings.lives)}>
            <div className="chips">
              {LIVES_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={settings.lives === n}
                  disabled={!editable}
                  onClick={() => set(n > 0 ? { lives: n, anonymous: false } : { lives: 0 })}
                >
                  {n === 0 ? s.settings.off : n}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.anonymous} hint={s.settings.anonymousHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.anonymous}
              disabled={!editable}
              onClick={() => set(settings.anonymous ? { anonymous: false } : { anonymous: true, lives: 0 })}
            >
              {settings.anonymous ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.seconds} hint={s.settings.secondsHint(settings.seconds)}>
            <div className="chips">
              {SECONDS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.seconds === n} disabled={!editable} onClick={() => set({ seconds: n })}>
                  {s.settings.secondsOpt(n)}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.rounds} hint={settings.rounds === 0 ? s.settings.unlimitedHint : undefined}>
            <div className="chips">
              {ROUND_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.rounds === n} disabled={!editable} onClick={() => set({ rounds: n })}>
                  {s.settings.roundsOpt(n)}
                </button>
              ))}
            </div>
          </Group>

          <AddStatement api={api} />
        </>
      )}
    </div>
  );
}

/** Herkes cümle ekleyebilir; "Ben hiç" sabit, oyuncu devamını yazar. */
function AddStatement({ api }: { api: GameApi }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post<{ text: string }>('/statements', { text });
      setMsg({ text: s.settings.saved(res.text), error: false });
      setText('');
    } catch (err) {
      setMsg({ text: err instanceof Error && err.message ? err.message : s.settings.saveFailed, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Group title={s.settings.addTitle} hint={s.settings.addHint}>
      <button type="button" className="btn btn-ghost sgs-browse" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="chevron" size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        {s.settings.addOpen}
      </button>
      {open && (
        <form className="nv-add" onSubmit={submit}>
          <label className="nv-add-field">
            <span className="nv-add-prefix">{s.settings.prefix}</span>
            <input
              className="input"
              value={text}
              maxLength={120}
              placeholder={s.settings.placeholder}
              aria-label={`${s.settings.prefix}…`}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button className="btn btn-outline" disabled={busy || text.trim().length < 5}>
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
