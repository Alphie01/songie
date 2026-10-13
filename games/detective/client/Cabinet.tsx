import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@songie/game-kit/ui';
import type { EvidenceView } from '../shared/index.js';
import { KindGlyph, NoteList } from './Bits';
import { DocumentView } from './Docs';
import { s } from './strings';
import { useDesk } from './util';

type Filter = 'all' | 'pinned' | number;
const ZOOMS = [0.8, 1, 1.25, 1.5, 2] as const;

export function Cabinet({ onClose }: { onClose: () => void }) {
  const { view, selected, openEvidence, personFilter, setPersonFilter, chars, seen } = useDesk();
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    let l = [...view.evidence];
    if (filter === 'pinned') l = l.filter((e) => e.pinned);
    else if (typeof filter === 'number') l = l.filter((e) => e.act === filter);
    if (personFilter) l = l.filter((e) => e.people.includes(personFilter));
    return l.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.seq - a.seq);
  }, [view.evidence, filter, personFilter]);

  const actsWithEvidence = useMemo(() => [...new Set(view.evidence.map((e) => e.act))].sort((a, b) => a - b), [view.evidence]);
  const person = personFilter ? chars.get(personFilter) : undefined;

  return (
    <div className="dt-cabinet" data-viewing={selected ? true : undefined}>
      <div className="dt-drawer">
        <div className="dt-drawer-head">
          <h2 className="dt-label dt-drawer-title">
            {s.cabinet.title}
            <span className="dt-count">{view.evidence.length}</span>
          </h2>
          <div className="chips dt-filters" role="group">
            <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              {s.cabinet.all}
            </button>
            <button type="button" className="chip" aria-pressed={filter === 'pinned'} onClick={() => setFilter('pinned')}>
              {s.cabinet.pinned}
            </button>
            {actsWithEvidence.length > 1 &&
              actsWithEvidence.map((a) => (
                <button key={a} type="button" className="chip" aria-pressed={filter === a} onClick={() => setFilter(a)}>
                  {s.cabinet.act(a)}
                </button>
              ))}
          </div>
          {person && (
            <button type="button" className="dt-person-filter" onClick={() => setPersonFilter(null)} aria-label={s.cabinet.clearPerson}>
              {s.cabinet.person(person.name)}
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
        {list.length === 0 ? (
          <p className="dt-empty">{s.cabinet.empty}</p>
        ) : (
          <ul className="dt-files">
            {list.map((e) => (
              <li key={e.id}>
                <FileTab e={e} active={selected === e.id} isNew={!seen.has(e.id)} onOpen={() => openEvidence(e.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dt-viewer-slot">{selected ? <Viewer id={selected} list={list} onClose={onClose} /> : <p className="dt-viewer-empty">{s.cabinet.pick}</p>}</div>
    </div>
  );
}

function FileTab({ e, active, isNew, onOpen }: { e: EvidenceView; active: boolean; isNew: boolean; onOpen: () => void }) {
  return (
    <button type="button" className="dt-file" aria-current={active || undefined} data-new={isNew || undefined} onClick={onOpen}>
      <span className="dt-file-title">{e.title}</span>
      <span className="dt-file-meta">
        <span className="dt-file-glyph" data-kind={e.kind}>
          <KindGlyph kind={e.kind} size={12} />
        </span>
        <span className="dt-file-src">
          {s.kind[e.kind]} · {e.source ? s.cabinet.source(e.source) : s.cabinet.sourceStart}
        </span>
        {e.pinned && (
          <span className="dt-pin-dot" title={s.cabinet.pinned}>
            <PinIcon />
          </span>
        )}
        {e.notes.length > 0 && <span className="dt-file-notes">{s.notes.count(e.notes.length)}</span>}
      </span>
      {isNew && <span className="dt-new">{s.cabinet.new}</span>}
    </button>
  );
}

function PinIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7" />
    </svg>
  );
}

function Viewer({ id, list, onClose }: { id: string; list: EvidenceView[]; onClose: () => void }) {
  const { evidence, docs, send, chars, view, showPerson, openEvidence } = useDesk();
  const [zoom, setZoom] = useState(1);
  const e = evidence.get(id);
  const entry = docs.get(id);

  useEffect(() => {
    docs.load(id);
  }, [id, docs]);

  if (!e) return null;
  const idx = list.findIndex((x) => x.id === id);
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;
  const zi = ZOOMS.indexOf(zoom as (typeof ZOOMS)[number]);
  const people = e.people.map((p) => chars.get(p)).filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <section className="dt-viewer" aria-labelledby="dt-viewer-title">
      <button type="button" className="btn btn-ghost dt-viewer-back" onClick={onClose}>
        <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} />
        {s.cabinet.back}
      </button>

      <header className="dt-viewer-head">
        <p className="dt-viewer-kind">
          <KindGlyph kind={e.kind} size={14} /> {s.kind[e.kind]}, {e.source ? s.cabinet.source(e.source) : s.cabinet.sourceStart}
        </p>
        <h2 id="dt-viewer-title" className="dt-viewer-title">
          {e.title}
        </h2>
        <p className="dt-viewer-sum">{e.summary}</p>
        <div className="dt-viewer-tools">
          <div className="dt-zoom" role="group">
            <button type="button" className="dt-icon-btn" aria-label={s.cabinet.zoomOut} title={s.cabinet.zoomOut} disabled={zi <= 0} onClick={() => setZoom(ZOOMS[zi - 1] ?? zoom)}>
              <span aria-hidden="true">−</span>
            </button>
            <button type="button" className="dt-zoom-val" title={s.cabinet.zoomReset} onClick={() => setZoom(1)}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="dt-icon-btn" aria-label={s.cabinet.zoomIn} title={s.cabinet.zoomIn} disabled={zi >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[zi + 1] ?? zoom)}>
              <span aria-hidden="true">+</span>
            </button>
          </div>
          <button type="button" className="chip dt-pin-btn" aria-pressed={e.pinned} onClick={() => void send({ type: 'pin', evidenceId: e.id, pinned: !e.pinned })}>
            <PinIcon size={13} />
            {e.pinned ? s.cabinet.unpin : s.cabinet.pin}
          </button>
          <div className="dt-viewer-nav">
            <button type="button" className="dt-icon-btn" disabled={!prev} aria-label={s.cabinet.prev} title={s.cabinet.prev} onClick={() => prev && openEvidence(prev.id)}>
              <Icon name="chevron" size={16} style={{ transform: 'rotate(90deg)' }} />
            </button>
            <button type="button" className="dt-icon-btn" disabled={!next} aria-label={s.cabinet.next} title={s.cabinet.next} onClick={() => next && openEvidence(next.id)}>
              <Icon name="chevron" size={16} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
        </div>
      </header>

      <div className="dt-stage" style={{ ['--z' as string]: zoom }}>
        {!entry || entry.status === 'loading' ? (
          <p className="dt-stage-msg" role="status">
            {s.cabinet.loading}
          </p>
        ) : entry.status === 'error' ? (
          <div className="dt-stage-msg">
            <p className="error-text">{entry.error}</p>
            <button type="button" className="btn btn-outline" onClick={() => docs.load(id, true)}>
              {s.cabinet.retry}
            </button>
          </div>
        ) : (
          <div className="dt-sheet">
            <DocumentView data={entry.data} chars={chars} locations={view.locations} onPerson={showPerson} />
          </div>
        )}
      </div>

      {people.length > 0 && (
        <div className="dt-viewer-people">
          <p className="dt-label">{s.cabinet.people}</p>
          <div className="chips">
            {people.map((c) => (
              <button key={c.id} type="button" className="chip dt-person-chip" data-mark={c.mark?.mark} onClick={() => showPerson(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <NoteList notes={e.notes} onAdd={async (text) => (await send({ type: 'note', target: { kind: 'evidence', id: e.id }, text })).ok} />
    </section>
  );
}
