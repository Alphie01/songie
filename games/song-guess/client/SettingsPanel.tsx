import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import {
  DIFFICULTIES,
  POOL_CATEGORIES,
  ROUND_OPTIONS,
  STAGE_CLIPS,
  TIMER_OPTIONS,
  type PoolInfo,
  type SongSettings,
} from '../shared/index.js';
import { usePools } from './pools';
import { clipShort, s } from './strings';

export const DIFFICULTY_COLOR = {
  easy: 'var(--accent)',
  medium: 'var(--yellow)',
  hard: 'var(--orange)',
  expert: 'var(--red)',
  impossible: 'var(--purple)',
} as const;

function Group({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <fieldset className="sgs-group">
      <legend className="eyebrow sgs-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

export function SettingsPanel({ settings, editable, onChange, api, section }: SettingsPanelProps<SongSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const [pools, setPools] = usePools(api, showPrimary, settings.pools);
  const [browsing, setBrowsing] = useState(false);
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState<null | 'deezer' | 'spotify'>(null);
  const [addMsg, setAddMsg] = useState<{ text: string; error: boolean } | null>(null);

  const grouped = useMemo(() => {
    const by = new Map<string, PoolInfo[]>();
    for (const p of pools ?? []) by.set(p.category, [...(by.get(p.category) ?? []), p]);
    return POOL_CATEGORIES.flatMap((c) => (by.get(c)?.length ? [[c, by.get(c)!] as const] : []));
  }, [pools]);
  const byId = new Map((pools ?? []).map((p) => [p.id, p]));
  const selected = new Set(settings.pools);
  const set = (patch: Partial<SongSettings>) => editable && onChange({ ...settings, ...patch });

  function togglePool(id: string) {
    const next = selected.has(id) ? settings.pools.filter((p) => p !== id) : [...settings.pools, id];
    if (next.length) set({ pools: next });
  }

  async function addPool(e: FormEvent) {
    e.preventDefault();
    const spotify = /spotify/i.test(url);
    setAdding(spotify ? 'spotify' : 'deezer');
    setAddMsg(null);
    try {
      const res = await api.post<{ pool: PoolInfo; matched?: number; total?: number }>('/pools', { url });
      setPools((ps) => [...(ps ?? []).filter((p) => p.id !== res.pool.id), res.pool]);
      // Yeni eklenen liste tek başına seçilir; diğer listeler istenirse katalogdan yeniden eklenir.
      set({ pools: [res.pool.id] });
      setAddMsg({
        text:
          res.total !== undefined
            ? s.settings.addedSpotify(res.pool.name, res.matched ?? res.pool.trackCount, res.total)
            : s.settings.added(res.pool.name, res.pool.trackCount),
        error: false,
      });
      setUrl('');
    } catch (err) {
      setAddMsg({ text: err instanceof Error ? err.message : 'Eklenemedi.', error: true });
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="sgs">
      {showPrimary && (
        <>
          {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}

          <Group title={s.settings.pools}>
            <div className="sgs-stack">
              {settings.pools.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="option"
                  aria-pressed="true"
                  disabled={!editable || settings.pools.length === 1}
                  onClick={() => togglePool(id)}
                  title={editable && settings.pools.length > 1 ? 'Listeyi çıkar' : undefined}
                >
                  <span className="sgs-pool-name">{byId.get(id)?.name ?? id}</span>
                  {editable && settings.pools.length > 1 && <Icon name="x" size={14} />}
                </button>
              ))}
            </div>
            {editable && (
              <button
                type="button"
                className="btn btn-ghost sgs-browse"
                aria-expanded={browsing}
                aria-controls="sgs-catalog"
                onClick={() => setBrowsing((b) => !b)}
              >
                <Icon name="chevron" size={14} style={{ transform: browsing ? 'rotate(180deg)' : undefined }} />
                {browsing ? s.settings.closeCatalog : s.settings.openCatalog}
              </button>
            )}
            {editable && browsing && (
              <div id="sgs-catalog" className="sgs-catalog">
                {pools === null || pools.length === 0 ? (
                  <p className="sgs-hint">{s.settings.poolsLoading}</p>
                ) : (
                  grouped.map(([cat, list]) => (
                    <div key={cat} className="sgs-cat">
                      <h3 className="sgs-cat-name">{s.categories[cat]}</h3>
                      <div className="chips">
                        {list.map((p) => (
                          <span key={p.id} className="sgs-chip-wrap">
                            <button type="button" className="chip" aria-pressed={selected.has(p.id)} onClick={() => togglePool(p.id)}>
                              {p.name}
                              <span className="chip-count">{p.trackCount}</span>
                            </button>
                            {p.custom && !selected.has(p.id) && (
                              <button
                                type="button"
                                className="sgs-chip-remove"
                                aria-label={s.settings.removeMine(p.name)}
                                title={s.settings.removeMine(p.name)}
                                onClick={async () => {
                                  await api.post(`/pools/${encodeURIComponent(p.id)}/remove`, {});
                                  setPools((ps) => (ps ?? []).filter((x) => x.id !== p.id));
                                }}
                              >
                                <Icon name="x" size={12} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <form className="sgs-add" onSubmit={addPool}>
                  <label className="sgs-cat-name" htmlFor="sgs-url">
                    {s.settings.addPool}
                  </label>
                  <div className="sgs-add-row">
                    <input
                      id="sgs-url"
                      className="input"
                      value={url}
                      inputMode="url"
                      placeholder={s.settings.addPoolPlaceholder}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <button className="btn btn-outline" disabled={!url.trim() || adding !== null}>
                      {adding ? s.settings.adding : s.settings.addPoolButton}
                    </button>
                  </div>
                  {adding === 'spotify' && <p className="sgs-hint">{s.settings.addingSpotify}</p>}
                  {!adding && !addMsg && <p className="sgs-hint">{s.settings.mineHint}</p>}
                  {addMsg && (
                    <p className={addMsg.error ? 'error-text' : 'sgs-hint'} role="status">
                      {addMsg.text}
                    </p>
                  )}
                </form>
              </div>
            )}
          </Group>

          <Group title={s.settings.difficulty} hint={s.difficultyHint[settings.difficulty]}>
            <div className="sgs-stack">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="option sgs-diff"
                  aria-pressed={settings.difficulty === d}
                  disabled={!editable}
                  style={{ '--c': DIFFICULTY_COLOR[d] } as CSSProperties}
                  onClick={() => set({ difficulty: d })}
                >
                  {s.difficulty[d]}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.rounds} hint={settings.rounds === 0 ? s.settings.unlimitedHint : undefined}>
            <div className="chips">
              {ROUND_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={settings.rounds === n}
                  disabled={!editable}
                  onClick={() => set({ rounds: n })}
                >
                  {n === 0 ? s.settings.unlimited : n}
                </button>
              ))}
            </div>
          </Group>
        </>
      )}

      {showSecondary && (
        <>
          <Group
            title={s.settings.timer}
            hint={settings.timer === 0 ? s.settings.timerHintOff : s.settings.timerHintOn(settings.timer)}
          >
            <div className="chips">
              {TIMER_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={settings.timer === n}
                  disabled={!editable}
                  onClick={() => set({ timer: n })}
                >
                  {n === 0 ? s.settings.timerOff : s.settings.timerSec(n)}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.playback}>
            <div className="sgs-stack">
              <button
                type="button"
                className="option"
                aria-pressed={settings.startAt === 'start'}
                disabled={!editable}
                onClick={() => set({ startAt: 'start' })}
              >
                <span className="sgs-opt-icon">
                  <Icon name="play" size={12} />
                  {s.settings.startBeginning}
                </span>
              </button>
              <button
                type="button"
                className="option"
                aria-pressed={settings.startAt === 'random'}
                disabled={!editable}
                onClick={() => set({ startAt: 'random' })}
              >
                <span className="sgs-opt-icon">
                  <Icon name="music" size={13} />
                  {s.settings.startRandom}
                </span>
              </button>
            </div>
          </Group>

          <Group title={s.settings.search} hint={s.settings.easySearchHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.easySearch}
              disabled={!editable}
              onClick={() => set({ easySearch: !settings.easySearch })}
            >
              <span className="sgs-opt-icon">
                <Icon name="search" size={13} />
                {s.settings.easySearch}
              </span>
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>

          <Group title={s.settings.guessAfter}>
            <div className="chips sgs-guess-after">
              {STAGE_CLIPS.map((sec, i) => (
                <button
                  key={sec}
                  type="button"
                  className="chip mono"
                  aria-pressed={settings.startStage === i}
                  disabled={!editable}
                  onClick={() => set({ startStage: i })}
                >
                  {clipShort(sec)}
                </button>
              ))}
            </div>
          </Group>

          <Group title={s.settings.artist} hint={s.settings.artistHint}>
            <button
              type="button"
              className="toggle"
              role="switch"
              aria-checked={settings.artistCredit}
              disabled={!editable}
              onClick={() => set({ artistCredit: !settings.artistCredit })}
            >
              {settings.artistCredit ? s.settings.on : s.settings.off}
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>
        </>
      )}
    </div>
  );
}
