import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import type { DetectiveAction, DetectiveSettings, DetectiveView } from '../shared/index.js';
import { Board } from './Board';
import { Cabinet } from './Cabinet';
import { Interviews } from './Interviews';
import { Accuse, Reconcile, Result } from './Final';
import { Leads } from './Leads';
import { Log, Notebook } from './Notebook';
import { NarrationPill, stopNarration } from './Bits';
import { Scene } from './Scene';
import { s } from './strings';
import { DeskProvider, useDocStore, useIvSeen, useMedia, useSeen, type Desk, type Send, type Tab } from './util';

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
  const [ivSeen, markIvSeen] = useIvSeen(view.sessionId, meId);
  const [interview, setInterview] = useState<string | null>(null);
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

  const openInterview = useCallback(
    (id: string) => {
      setInterview(id);
      if (final) setBrowse(true);
      setTabState('interviews');
      requestAnimationFrame(() => {
        const el = document.getElementById('dt-iv-anchor');
        if (!el) return;
        if (wide) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        else window.scrollTo({ top: 0 });
      });
    },
    [final, wide],
  );

  // Açık sorgu yoksa ya da düştüyse ilkini seç (en son açılan en üstte durur).
  const ivIds = view.interviews.map((i) => i.id).join('|');
  useEffect(() => {
    if (interview && view.interviews.some((i) => i.id === interview)) return;
    setInterview(view.interviews.length ? view.interviews[view.interviews.length - 1]!.id : null);
  }, [ivIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const ivUnread = useMemo(() => {
    const m = new Map<string, { count: number; fresh: boolean }>();
    for (const iv of view.interviews) {
      const read = ivSeen[iv.id];
      const count = iv.transcript.slice(read ?? 0).filter((e) => e.by !== meId).length;
      m.set(iv.id, { count, fresh: read === undefined });
    }
    return m;
  }, [view.interviews, ivSeen, meId]);

  // Sorgu odası ekrandayken açık sorgunun tutanağı okunmuş sayılır.
  const ivVisible = tab === 'interviews' && (!final || browse);
  const curIvLen = view.interviews.find((i) => i.id === interview)?.transcript.length;
  useEffect(() => {
    if (ivVisible && interview && curIvLen !== undefined) markIvSeen(interview, curIvLen);
  }, [ivVisible, interview, curIvLen, markIvSeen]);

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
    interview,
    openInterview,
    ivUnread,
    replayAct: setReplay,
    readOnly: view.phase === 'result',
  };

  const newCount = view.evidence.filter((e) => !seen.has(e.id)).length;
  const tabs: Tab[] = ['board', 'cabinet', 'interviews', 'leads', 'notes'];
  const online = room.players.filter((p) => p.connected).length;
  const genre = view.case.genre ? view.case.genre.charAt(0).toLocaleUpperCase('tr') + view.case.genre.slice(1) : '';
  // Yer: alt başlığın tarihten önceki kısmı ("Uludağ, Bursa — Aralık 2025")
  const place = view.case.subtitle.split(/\s+[—–-]\s+/)[0]?.trim() ?? '';
  let ivCount = 0;
  let ivFresh = false;
  for (const [id, u] of ivUnread) {
    if (id === interview && ivVisible) continue;
    ivCount += u.count;
    if (u.fresh) ivFresh = true;
  }

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
          <main className="dt-col dt-col-center">
              <div className="dt-center-tabs" role="group" aria-label={s.name}>
                <button type="button" className="dt-center-tab" aria-pressed={tab !== 'interviews'} onClick={() => setTab('cabinet')}>
                  {s.cabinet.title}
                  {newCount > 0 ? <span className="dt-tab-badge">{newCount}</span> : <span className="dt-count">{view.evidence.length}</span>}
                </button>
                <button type="button" className="dt-center-tab" aria-pressed={tab === 'interviews'} onClick={() => setTab('interviews')}>
                  {s.interview.title}
                  {ivCount > 0 ? (
                    <span className="dt-tab-badge" data-tone="iv">{ivCount}</span>
                  ) : (
                    <>
                      <span className="dt-count">{view.interviews.length}</span>
                      {ivFresh && <span className="dt-tab-dot" aria-hidden="true" />}
                    </>
                  )}
                </button>
              </div>
            <div className="dt-pane" data-pane="cabinet" aria-label={s.tabs.cabinet}>
              <span id="dt-viewer-anchor" />
              <Cabinet onClose={() => setSelected(null)} />
            </div>
            <div className="dt-pane" data-pane="interviews" aria-label={s.tabs.interviews}>
              <span id="dt-iv-anchor" />
              <Interviews />
            </div>
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
          {tabs.map((t) => (
            <button key={t} type="button" className="dt-tab" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
              <span className="dt-tab-label">{s.tabs[t]}</span>
              {tab !== t && t === 'cabinet' && newCount > 0 && <span className="dt-tab-badge">{newCount}</span>}
              {tab !== t &&
                t === 'interviews' &&
                (ivCount > 0 ? <span className="dt-tab-badge">{ivCount}</span> : ivFresh && <span className="dt-tab-dot" aria-hidden="true" />)}
              {tab !== t && t === 'leads' && view.proposal && <span className="dt-tab-badge">1</span>}
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
          <div className="dt-top-row">
            <p className="dt-top-title">{view.case.title}</p>
            <span className="dt-top-code" aria-label={`${s.top.code}: ${room.code}`}>
              {room.code}
            </span>
            <span className="dt-top-stamp" aria-hidden="true">
              {s.top.secret}
            </span>
          </div>
          <div className="dt-top-row">
            <p className="dt-top-sub">
              {view.phase === 'investigate' || view.phase === 'scene'
                ? `${s.top.act(view.act.index, view.act.total)}: ${view.act.title}`
                : s.top.phase[view.phase]}
            </p>
            <span className="dt-top-hours">{s.leads.hoursOf(view.hours.spent, view.hours.budget)}</span>
          </div>
          <div className="dt-top-chips">
            <span className="dt-top-chip" data-tone="online">
              <i aria-hidden="true" />
              {s.top.online(online)}
            </span>
            {genre && <span className="dt-top-chip">{genre}</span>}
            {place && <span className="dt-top-chip">{place}</span>}
          </div>
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
