import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { GameApi, SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import { ROUND_OPTIONS, SECONDS_OPTIONS, type CategoryInfo, type MostLikelySettings } from '../shared/index.js';
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

function Toggle({ on, label, disabled, onClick }: { on: boolean; label: string; disabled: boolean; onClick(): void }) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={on} disabled={disabled} onClick={onClick}>
      {label}
      <span className="toggle-knob" aria-hidden="true" />
    </button>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<MostLikelySettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const [reload, setReload] = useState(0);
  const set = (patch: Partial<MostLikelySettings>) => editable && onChange({ ...settings, ...patch });

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
  }, [api, showPrimary, reload]);

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

          <Group title={s.settings.rounds} hint={s.settings.roundsHint(settings.rounds)}>
            <div className="chips">
              {ROUND_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.rounds === n} disabled={!editable} onClick={() => set({ rounds: n })}>
                  {n === 0 ? s.settings.unlimited : n}
                </button>
              ))}
            </div>
          </Group>

          <AddPrompt api={api} onAdded={() => setReload((n) => n + 1)} />
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.seconds} hint={s.settings.secondsHint(settings.seconds)}>
            <div className="chips">
              {SECONDS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.seconds === n} disabled={!editable} onClick={() => set({ seconds: n })}>
                  {s.settings.sec(n)}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.anonymous} hint={s.settings.anonymousHint(settings.anonymous)}>
            <Toggle
              on={settings.anonymous}
              label={settings.anonymous ? s.settings.on : s.settings.off}
              disabled={!editable}
              onClick={() => set({ anonymous: !settings.anonymous })}
            />
          </Group>

          <Group title={s.settings.selfVote} hint={s.settings.selfVoteHint}>
            <Toggle
              on={settings.selfVote}
              label={settings.selfVote ? s.settings.allowed : s.settings.notAllowed}
              disabled={!editable}
              onClick={() => set({ selfVote: !settings.selfVote })}
            />
          </Group>

          <Group title={s.settings.predict} hint={s.settings.predictHint}>
            <Toggle
              on={settings.predict}
              label={settings.predict ? s.settings.on : s.settings.off}
              disabled={!editable}
              onClick={() => set({ predict: !settings.predict })}
            />
          </Group>
        </>
      )}
    </div>
  );
}

/** Her oyuncu soru ekleyebilir; "Aramızdaki en … kim?" kalıbının boşluğunu yazar. */
function AddPrompt({ api, onAdded }: { api: GameApi; onAdded(): void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post<{ text: string }>('/prompts', { text });
      setMsg({ text: s.settings.saved(res.text), error: false });
      setText('');
      onAdded();
    } catch (err) {
      setMsg({ text: err instanceof Error && err.message ? err.message : s.settings.saveFailed, error: true });
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
        <form className="ml-add" onSubmit={submit}>
          <label className="ml-add-frame">
            <span className="dim">{s.prefix}</span>
            <input
              className="input"
              value={text}
              maxLength={80}
              placeholder={s.settings.promptPlaceholder}
              aria-label={s.settings.promptLabel}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="dim">{s.suffix}</span>
          </label>
          <button className="btn btn-outline" disabled={busy || text.trim().length < 3}>
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
