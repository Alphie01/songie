import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { GameApi, SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import {
  GUESS_OPTIONS,
  PROMPT_MAX,
  PROMPT_MIN,
  ROUND_OPTIONS,
  WRITE_OPTIONS,
  type CategoryInfo,
  type ConfessionsSettings,
} from '../shared/index.js';
import { s } from './strings';

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="sgs-legend cf-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<ConfessionsSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const set = (patch: Partial<ConfessionsSettings>) => editable && onChange({ ...settings, ...patch });

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
          <Group title={s.settings.mode} hint={s.settings.modeHint[settings.mode]}>
            <div className="sgs-stack">
              {(['topics', 'free'] as const).map((m) => (
                <button key={m} type="button" className="option" aria-pressed={settings.mode === m} disabled={!editable} onClick={() => set({ mode: m })}>
                  {m === 'topics' ? s.settings.modeTopics : s.settings.modeFree}
                  {settings.mode === m && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          </Group>

          {settings.mode === 'topics' && (
            <Group title={s.settings.categories} hint={settings.categories.includes('cesur') ? s.settings.cesurHint : undefined}>
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
          )}

          <AddPrompt api={api} onAdded={() => void api.get<{ categories: CategoryInfo[] }>('/categories').then((r) => setCategories(r.categories)).catch(() => {})} />
        </>
      )}

      {showSecondary && (
        <>
          <Group title={s.settings.write}>
            <div className="chips">
              {WRITE_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.writeSeconds === n} disabled={!editable} onClick={() => set({ writeSeconds: n })}>
                  {n === 0 ? s.settings.untimed : s.settings.sec(n)}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.guess}>
            <div className="chips">
              {GUESS_OPTIONS.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={settings.guessSeconds === n} disabled={!editable} onClick={() => set({ guessSeconds: n })}>
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

          <Group title={s.settings.hidden} hint={s.settings.hiddenHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.hiddenAuthor}
              disabled={!editable}
              onClick={() => set({ hiddenAuthor: !settings.hiddenAuthor })}
            >
              {settings.hiddenAuthor ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>
        </>
      )}
    </div>
  );
}

/** Her oyuncu konu ekleyebilir; konular sürpriz kalsın diye listelenmez. */
function AddPrompt({ api, onAdded }: { api: GameApi; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const len = text.trim().length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/prompts', { text });
      setMsg({ text: s.settings.saved, error: false });
      setText('');
      onAdded();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Konu eklenemedi. Tekrar dene.', error: true });
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
        <form className="cf-addprompt" onSubmit={submit}>
          <input
            className="input"
            value={text}
            maxLength={PROMPT_MAX}
            placeholder={s.settings.promptPlaceholder}
            aria-label={s.settings.addPrompt}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-outline" disabled={busy || len < PROMPT_MIN}>
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
