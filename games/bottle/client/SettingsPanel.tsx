import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import { PASS_OPTIONS, ROUND_OPTIONS, type BottleSettings, type CategoryInfo, type PromptKind } from '../shared/index.js';
import { s } from './strings';

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="sgs-legend bt-legend">{title}</legend>
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

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<BottleSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const [reload, setReload] = useState(0);
  const set = (patch: Partial<BottleSettings>) => editable && onChange({ ...settings, ...patch });

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
            <div className="sgs-stack">
              {(categories ?? []).map((c) => {
                const on = settings.categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="option bt-cat"
                    aria-pressed={on}
                    disabled={!editable}
                    data-bold={c.id === 'cesur' || undefined}
                    onClick={() => {
                      const next = on ? settings.categories.filter((x) => x !== c.id) : [...settings.categories, c.id];
                      if (next.length) set({ categories: next });
                    }}
                  >
                    <span>{c.name}</span>
                    <span className="mono bt-cat-count">{s.settings.truthDare(c.truth, c.dare)}</span>
                  </button>
                );
              })}
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

      {showSecondary && (
        <>
          <Group title={s.settings.choice}>
            <div className="chips">
              {(['player', 'random'] as const).map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={settings.choice === c} disabled={!editable} onClick={() => set({ choice: c })}>
                  {c === 'player' ? s.settings.choicePlayer : s.settings.choiceRandom}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.order}>
            <div className="chips">
              {(['target', 'round'] as const).map((o) => (
                <button key={o} type="button" className="chip" aria-pressed={settings.order === o} disabled={!editable} onClick={() => set({ order: o })}>
                  {o === 'target' ? s.settings.orderTarget : s.settings.orderRound}
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

          <Group title={s.settings.passPenalty} hint={s.settings.passPenaltyHint}>
            <Toggle on={settings.passPenalty} editable={editable} onClick={() => set({ passPenalty: !settings.passPenalty })} />
          </Group>

          <Group title={s.settings.vote} hint={s.settings.voteHint}>
            <Toggle on={settings.vote} editable={editable} onClick={() => set({ vote: !settings.vote })} />
          </Group>

          <Group title={s.settings.fair} hint={s.settings.fairHint}>
            <Toggle on={settings.fairSpin} editable={editable} onClick={() => set({ fairSpin: !settings.fairSpin })} />
          </Group>

          <AddPrompt api={api} onAdded={() => setReload((n) => n + 1)} />
        </>
      )}
    </div>
  );
}

function AddPrompt({ api, onAdded }: { api: SettingsPanelProps<BottleSettings>['api']; onAdded(): void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PromptKind>('truth');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/prompts', { kind, text });
      setMsg({ text: s.settings.saved, error: false });
      setText('');
      onAdded();
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
        <form className="bt-add" onSubmit={submit}>
          <div className="chips">
            {(['truth', 'dare'] as const).map((k) => (
              <button key={k} type="button" className="chip" data-kind={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
                {s.kind[k]}
              </button>
            ))}
          </div>
          <textarea
            className="input bt-add-text"
            value={text}
            maxLength={200}
            rows={3}
            placeholder={s.settings.addPlaceholder[kind]}
            aria-label={s.settings.add}
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
