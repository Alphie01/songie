import { useEffect, useState } from 'react';
import type { SettingsPanelProps } from '@songie/game-kit/client';
import type { CaseCard, CasesResponse, DetectiveSettings, SessionCard } from '../shared/index.js';
import { s } from './strings';
import { ago } from './util';

const DIFF_COLOR: Record<string, string> = { orta: 'var(--yellow)', zor: 'var(--orange)', 'çok zor': 'var(--red)' };

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="sgs-group">
      <legend className="sgs-legend dt-legend">{title}</legend>
      {children}
      {hint && <p className="sgs-hint">{hint}</p>}
    </fieldset>
  );
}

function useCases(api: SettingsPanelProps<DetectiveSettings>['api']) {
  const [data, setData] = useState<CasesResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    api
      .get<CasesResponse>('/cases')
      .then((d) => live && setData(d))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [api]);
  return { data, error };
}

export function SettingsPanel({ settings, editable, onChange, section, api }: SettingsPanelProps<DetectiveSettings>) {
  const showPrimary = section !== 'secondary';
  const showSecondary = section !== 'primary';
  const set = (patch: Partial<DetectiveSettings>) => editable && onChange({ ...settings, ...patch });

  return (
    <div className="sgs dt-settings">
      {showPrimary && <Shelf settings={settings} editable={editable} set={set} api={api} />}
      {showSecondary && (
        <>
          {!showPrimary && !editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
          <Group title={s.settings.leadMode} hint={s.settings.leadModeHint[settings.leadMode]}>
            <div className="chips">
              {(['vote', 'host'] as const).map((m) => (
                <button key={m} type="button" className="chip" aria-pressed={settings.leadMode === m} disabled={!editable} onClick={() => set({ leadMode: m })}>
                  {s.settings.leadModes[m]}
                </button>
              ))}
            </div>
          </Group>
          <Group title={s.settings.hints} hint={s.settings.hintsHint}>
            <button type="button" className="toggle" role="switch" aria-checked={settings.hints} disabled={!editable} onClick={() => set({ hints: !settings.hints })}>
              <span>{s.settings.hints}</span>
              <span className="toggle-knob" aria-hidden="true" />
            </button>
          </Group>
        </>
      )}
    </div>
  );
}

function Shelf({
  settings,
  editable,
  set,
  api,
}: {
  settings: DetectiveSettings;
  editable: boolean;
  set: (p: Partial<DetectiveSettings>) => void;
  api: SettingsPanelProps<DetectiveSettings>['api'];
}) {
  const { data, error } = useCases(api);

  return (
    <>
      {!editable && <p className="sgs-readonly">{s.settings.readOnly}</p>}
      <Group title={s.settings.shelf} hint={editable ? s.settings.shelfHint : undefined}>
        {error ? (
          <p className="error-text">{s.settings.loadError}</p>
        ) : !data ? (
          <p className="sgs-hint">{s.settings.loading}</p>
        ) : data.cases.length === 0 ? (
          <p className="sgs-hint">{s.settings.empty}</p>
        ) : (
          <ul className="dt-shelf">
            {data.cases.map((c) => (
              <li key={c.slug}>
                <CaseCover c={c} selected={settings.caseSlug === c.slug && !settings.resume} editable={editable} onPick={() => set({ caseSlug: c.slug, resume: null })} />
              </li>
            ))}
          </ul>
        )}
      </Group>
      {data && data.sessions.length > 0 && (
        <Group title={s.settings.sessions} hint={s.settings.sessionsHint}>
          <ul className="dt-sessions">
            {data.sessions.map((ss) => (
              <li key={ss.id}>
                <SessionRow ss={ss} selected={settings.resume === ss.id} editable={editable} onPick={() => set({ resume: ss.id, caseSlug: ss.slug })} />
              </li>
            ))}
          </ul>
        </Group>
      )}
    </>
  );
}

function CaseCover({ c, selected, editable, onPick }: { c: CaseCard; selected: boolean; editable: boolean; onPick: () => void }) {
  return (
    <button type="button" className="dt-case" aria-pressed={selected} disabled={!editable && !selected} onClick={() => editable && onPick()}>
      <span className="dt-case-cover" data-img={c.coverUrl ? true : undefined}>
        {c.coverUrl && <img src={c.coverUrl} alt="" loading="lazy" />}
        <span className="dt-case-genre">{c.genre}</span>
        <span className="dt-case-title">{c.title}</span>
        <span className="dt-case-sub">{c.subtitle}</span>
        {c.solved && <span className="dt-case-solved">{s.settings.solved(c.solved.rank)}</span>}
      </span>
      <span className="dt-case-info">
        <span className="dt-case-meta">
          <span style={{ color: DIFF_COLOR[c.difficulty] ?? 'var(--text-2)' }}>{s.difficulty[c.difficulty] ?? c.difficulty}</span>
          <span className="dt-mono">{s.settings.minutes(c.minutes)}</span>
          <span>{s.settings.acts(c.acts)}</span>
          <span>{s.settings.evidence(c.evidenceCount)}</span>
        </span>
        <span className="dt-case-teaser">{c.teaser.split(/\n\s*\n/)[0]}</span>
      </span>
    </button>
  );
}

function SessionRow({ ss, selected, editable, onPick }: { ss: SessionCard; selected: boolean; editable: boolean; onPick: () => void }) {
  return (
    <button type="button" className="dt-session" aria-pressed={selected} disabled={!editable && !selected} onClick={() => editable && onPick()}>
      <span className="dt-session-title">{ss.title}</span>
      <span className="dt-session-meta">
        {s.settings.sessionAct(ss.act, ss.acts)}, {s.settings.sessionHours(ss.hoursSpent)}, {ago(ss.updatedAt)}
      </span>
      {ss.members.length > 0 && <span className="dt-session-members">{ss.members.join(', ')}</span>}
    </button>
  );
}
