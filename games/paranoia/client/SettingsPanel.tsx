import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import { QUESTION_COUNT_OPTIONS, THINK_OPTIONS, type CategoryInfo, type ParanoiaSettings } from '../shared/index.js';
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

function Toggle({ on, disabled, onClick }: { on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={on} disabled={disabled} onClick={onClick}>
      {on ? s.settings.on : s.settings.off}
      <span className="toggle-knob" aria-hidden="true" />
    </button>
  );
}

function Choice<T extends string | number>({
  options,
  value,
  label,
  disabled,
  onPick,
}: {
  options: readonly T[];
  value: T;
  label: (v: T) => string;
  disabled: boolean;
  onPick: (v: T) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={String(o)} type="button" className="chip" aria-pressed={value === o} disabled={disabled} onClick={() => onPick(o)}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<ParanoiaSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const set = (patch: Partial<ParanoiaSettings>) => editable && onChange({ ...settings, ...patch });
  const off = !editable;

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
          <Group title={s.settings.count} hint={s.settings.countHint(settings.questionCount)}>
            <Choice options={QUESTION_COUNT_OPTIONS} value={settings.questionCount as (typeof QUESTION_COUNT_OPTIONS)[number]} label={String} disabled={off} onPick={(n) => set({ questionCount: n })} />
          </Group>

          <Group title={s.settings.categories} hint={s.settings.categoriesHint}>
            <div className="chips">
              {(categories ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={settings.categories.includes(c.id)}
                  disabled={off}
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
          <Group title={s.settings.think}>
            <Choice
              options={THINK_OPTIONS}
              value={settings.thinkSeconds as (typeof THINK_OPTIONS)[number]}
              label={(n) => (n === 0 ? s.settings.unlimited : s.settings.sec(n))}
              disabled={off}
              onPick={(n) => set({ thinkSeconds: n })}
            />
          </Group>

          {settings.thinkSeconds > 0 && (
            <Group title={s.settings.onTimeout}>
              <Choice
                options={['random', 'pass'] as const}
                value={settings.onTimeout}
                label={(v) => (v === 'random' ? s.settings.timeoutRandom : s.settings.timeoutPass)}
                disabled={off}
                onPick={(v) => set({ onTimeout: v })}
              />
            </Group>
          )}

          <Group title={s.settings.hideHolder} hint={s.settings.hideHolderHint}>
            <Toggle on={settings.hideHolder} disabled={off} onClick={() => set({ hideHolder: !settings.hideHolder })} />
          </Group>

          <Group title={s.settings.noReturn} hint={s.settings.noReturnHint}>
            <Toggle on={settings.noReturn} disabled={off} onClick={() => set({ noReturn: !settings.noReturn })} />
          </Group>

          <Group title={s.settings.allowSelf} hint={s.settings.allowSelfHint}>
            <Toggle on={settings.allowSelf} disabled={off} onClick={() => set({ allowSelf: !settings.allowSelf })} />
          </Group>

          <Group title={s.settings.first}>
            <Choice
              options={['random', 'host'] as const}
              value={settings.firstHolder}
              label={(v) => (v === 'random' ? s.settings.firstRandom : s.settings.firstHost)}
              disabled={off}
              onPick={(v) => set({ firstHolder: v })}
            />
          </Group>

          <Group title={s.settings.revealBy}>
            <Choice
              options={['host', 'vote'] as const}
              value={settings.revealBy}
              label={(v) => (v === 'host' ? s.settings.revealHost : s.settings.revealVote)}
              disabled={off}
              onPick={(v) => set({ revealBy: v })}
            />
          </Group>

          <AddQuestion api={api} />
        </>
      )}
    </div>
  );
}

/** Herkes soru ekleyebilir; sorular hiçbir yerde listelenmez (sürpriz bozulmasın). */
function AddQuestion({ api }: { api: SettingsPanelProps<ParanoiaSettings>['api'] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/questions', { text });
      setMsg({ text: s.settings.saved, error: false });
      setText('');
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : s.settings.addFailed, error: true });
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
        <form className="pr-add" onSubmit={submit}>
          <textarea
            className="input pr-add-text"
            value={text}
            maxLength={140}
            rows={3}
            placeholder={s.settings.addPlaceholder}
            aria-label={s.settings.addLabel}
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
