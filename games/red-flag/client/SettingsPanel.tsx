import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import { ROUND_OPTIONS, SECONDS_OPTIONS, type CategoryInfo, type RedFlagSettings } from '../shared/index.js';
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

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<RedFlagSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const set = (patch: Partial<RedFlagSettings>) => editable && onChange({ ...settings, ...patch });

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
    <div className="sgs rf-settings">
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
          <AddItem api={api} />
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.dealBreaker} hint={s.settings.dealBreakerHint}>
            <Toggle on={settings.dealBreaker} editable={editable} onClick={() => set({ dealBreaker: !settings.dealBreaker })} />
          </Group>

          <Group title={s.settings.names} hint={s.settings.namesHint(settings.anonymous)}>
            <div className="chips">
              <button type="button" className="chip" aria-pressed={!settings.anonymous} disabled={!editable} onClick={() => set({ anonymous: false })}>
                {s.settings.open}
              </button>
              <button type="button" className="chip" aria-pressed={settings.anonymous} disabled={!editable} onClick={() => set({ anonymous: true })}>
                {s.settings.anonymous}
              </button>
            </div>
          </Group>

          <Group title={s.settings.predict} hint={s.settings.predictHint}>
            <Toggle on={settings.predict} editable={editable} onClick={() => set({ predict: !settings.predict })} />
          </Group>

          <Group title={s.settings.seconds} hint={s.settings.secondsHint(settings.seconds)}>
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
        </>
      )}
    </div>
  );
}

/** Her oyuncu durum ekleyebilir; eklenenler hiçbir ekranda listelenmez. */
function AddItem({ api }: { api: SettingsPanelProps<RedFlagSettings>['api'] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/items', { text });
      setMsg({ text: s.settings.addSaved, error: false });
      setText('');
    } catch (err) {
      setMsg({ text: err instanceof Error && err.message ? err.message : s.settings.addFailed, error: true });
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
        <form className="rf-add" onSubmit={submit}>
          <textarea
            className="input rf-add-text"
            value={text}
            rows={3}
            maxLength={160}
            placeholder={s.settings.addPlaceholder}
            aria-label={s.settings.add}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="rf-add-row">
            <span className="mono dim rf-small">{text.trim().length}/160</span>
            <button className="btn btn-outline" disabled={busy || text.trim().length < 10}>
              {busy ? s.settings.addSaving : s.settings.addSave}
            </button>
          </div>
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
