import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import type { DetectiveAction, DetectiveSettings, DetectiveView } from '../shared/index.js';
import { Board } from './Board';
import { Cabinet } from './Cabinet';
import { Accuse, Reconcile, Result } from './Final';
import { Leads } from './Leads';
import { Log, Notebook } from './Notebook';
import { NarrationPill, stopNarration } from './Bits';
import { Scene } from './Scene';
import { s } from './strings';
import { DeskProvider, useDocStore, useMedia, useSeen, type Desk, type Send, type Tab } from './util';

const TABS: Tab[] = ['board', 'cabinet', 'leads', 'notes'];

export function PlayView({ view, meId, room, act }: PlayViewProps<DetectiveView, DetectiveSettings>) {
  const isHost = room.hostId === meId;
  const wide = useMedia('(min-width: 1100px)');
  const [tab, setTabState] = useState<Tab>('cabinet');
  const [selected, setSelected] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [replay, setReplay] = useState<number | null>(null);
  const [browse, setBrowse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seen, markSeen] = useSeen(view.sessionId, meId);
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);

  const rawAct = useCallback((a: DetectiveAction) => act(a), [act]);
  const docs = useDocStore(rawAct, view.sessionId);

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (errTimer.current) clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => setError(null), 5000);
  }, []);
  useEffect(() => () => void (errTimer.current && clearTimeout(errTimer.current)), []);
  // Masadan çıkınca (lobi, başka oyun) anlatı da sussun.
  useEffect(() => () => stopNarration(), []);

  const send: Send = useCallback(
    async (a) => {
      try {
        const res = await act(a);
        if (!res.ok) showError(res.error);
        return res;
      } catch {
        showError(s.errors.generic);
        return { ok: false as const, error: s.errors.generic };
      }
    },
    [act, showError],
  );

  const final = view.phase === 'accuse' || view.phase === 'reconcile' || view.phase === 'result';
  // Aşama değişince inceleme modundan çık
  useEffect(() => setBrowse(false), [view.phase]);

  const setTab = useCallback(
    (t: Tab) => {
      setTabState(t);
      if (!wide) window.scrollTo({ top: 0 });
    },
    [wide],
  );

  const openEvidence = useCallback(
    (id: string) => {
      setSelected(id);
      markSeen(id);
      if (final) setBrowse(true);
      setTabState('cabinet');
      requestAnimationFrame(() => {
        const el = document.getElementById('dt-viewer-anchor');
        if (!el) return;
        if (wide) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        else window.scrollTo({ top: 0 });
      });
    },
    [markSeen, final, wide],
  );

  const showPerson = useCallback(
    (id: string) => {
      if (final) setBrowse(true);
      setTabState('board');
      setTimeout(() => {
        const el = document.getElementById(`dt-person-${id}`);
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }, 60);
    },
    [final],
  );

  // Seçili kanıt görünümden düşerse (başka oturum) temizle
  useEffect(() => {
    if (selected && !view.evidence.some((e) => e.id === selected)) setSelected(null);
  }, [selected, view.evidence]);

  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const chars = useMemo(() => new Map(view.characters.map((c) => [c.id, c])), [view.characters]);
  const evidence = useMemo(() => new Map(view.evidence.map((e) => [e.id, e])), [view.evidence]);

  const desk: Desk = {
    view,
    room,
    meId,
    isHost,
    send,
    player: (id) => members.get(id),
    nick: (id) => (!id ? '?' : id === meId ? s.you : (members.get(id)?.nick ?? '?')),
    chars,
    evidence,
    offset,
    selected,
    openEvidence,
    showPerson,
    personFilter,
    setPersonFilter,
    seen,
    docs,
    setTab,
    replayAct: setReplay,
    readOnly: view.phase === 'result',
  };

  const newCount = view.evidence.filter((e) => !seen.has(e.id)).length;

  let body: React.ReactNode;
  if (final && !browse) {
    body =
      view.phase === 'accuse' ? (
        <Accuse onBrowse={() => setBrowse(true)} />
      ) : view.phase === 'reconcile' ? (
        <Reconcile onBrowse={() => setBrowse(true)} />
      ) : (
<Result />
      );
  } else {
    body = (
      <>
        {final && (
          <div className="dt-banner" role="status">
            <p>{s.accuse.browsing}</p>
            <button type="button" className="btn btn-primary" onClick={() => setBrowse(false)}>
              {view.phase === 'result' ? s.result.stamp : s.accuse.backToForm}
            </button>
          </div>
        )}
        <div className="dt-desk" data-tab={tab}>
          <aside className="dt-col dt-col-left" data-pane="board" aria-label={s.tabs.board}>
            <Board />
          </aside>
          <main className="dt-col dt-col-center" data-pane="cabinet" aria-label={s.tabs.cabinet}>
            <span id="dt-viewer-anchor" />
            <Cabinet onClose={() => setSelected(null)} />
          </main>
          <aside className="dt-col dt-col-right">
            <div className="dt-pane" data-pane="leads" aria-label={s.tabs.leads}>
              <Leads />
            </div>
            <div className="dt-pane" data-pane="notes" aria-label={s.tabs.notes}>
              <Notebook />
              <Log />
            </div>
          </aside>
        </div>
        <nav className="dt-tabs" aria-label={s.name}>
          {TABS.map((t) => (
            <button key={t} type="button" className="dt-tab" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
              {s.tabs[t]}
              {t === 'cabinet' && newCount > 0 && <span className="dt-tab-badge">{newCount}</span>}
              {t === 'leads' && view.proposal && <span className="dt-tab-dot" aria-hidden="true" />}
            </button>
          ))}
        </nav>
      </>
    );
  }

  return (
    <DeskProvider value={desk}>
      <div className="dt" data-phase={view.phase}>
        <header className="dt-top">
          <div className="dt-top-case">
            <p className="dt-top-title">{view.case.title}</p>
            <p className="dt-top-sub">
              {view.phase === 'investigate' || view.phase === 'scene'
                ? `${s.top.act(view.act.index, view.act.total)}: ${view.act.title}`
                : s.top.phase[view.phase]}
            </p>
          </div>
          {!wide && !final && (
            <p className="dt-top-hours">
              {view.hours.spent}
              <span>/{view.hours.budget} sa</span>
            </p>
          )}
          <span className="dt-top-code">{room.code}</span>
        </header>
        {body}
        {view.phase === 'scene' && <Scene />}
        <NarrationPill hidden={view.phase === 'scene' || replay !== null} />
        {replay !== null && view.phase !== 'scene' && <Scene replay={replay} onClose={() => setReplay(null)} />}
        {error && (
          <p className="toast dt-toast" role="alert">
            {error}
          </p>
        )}
      </div>
    </DeskProvider>
  );
}
