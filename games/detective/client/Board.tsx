import { useMemo, useState } from 'react';
import type { CharacterView, Mark } from '../shared/index.js';
import { KindGlyph, NoteList, Picture } from './Bits';
import { FloorPlan } from './FloorPlan';
import { s } from './strings';
import { initials, Paras, splitAt, useDesk } from './util';

export function Board() {
  const { view } = useDesk();
  const victims = view.characters.filter((c) => c.victim);
  const suspects = view.characters.filter((c) => c.suspect && !c.victim);
  const others = view.characters.filter((c) => !c.suspect && !c.victim);

  return (
    <div className="dt-board">
      {victims.length > 0 && (
        <section className="dt-sec" aria-labelledby="dt-victim">
          <h2 id="dt-victim" className="dt-sec-title">
            {s.board.victim(view.case.genre)}
          </h2>
          {victims.map((c) => (
            <PersonCard key={c.id} c={c} variant="victim" />
          ))}
        </section>
      )}

      <section className="dt-sec" aria-labelledby="dt-suspects">
        <h2 id="dt-suspects" className="dt-sec-title">
          {s.board.suspects}
          <span className="dt-count">{suspects.length}</span>
        </h2>
        <div className="dt-people">
          {suspects.map((c) => (
            <PersonCard key={c.id} c={c} variant="suspect" />
          ))}
        </div>
      </section>

      {others.length > 0 && (
        <section className="dt-sec" aria-labelledby="dt-others">
          <h2 id="dt-others" className="dt-sec-title">
            {s.board.others}
          </h2>
          <div className="dt-people">
            {others.map((c) => (
              <PersonCard key={c.id} c={c} variant="other" />
            ))}
          </div>
        </section>
      )}

      <Locations />
      <Timeline />
      <Scenes />
    </div>
  );
}

function PersonCard({ c, variant }: { c: CharacterView; variant: 'victim' | 'suspect' | 'other' }) {
  const { send, nick, view, setPersonFilter, setTab, readOnly } = useDesk();
  const [open, setOpen] = useState(false);
  const mentions = view.evidence.filter((e) => e.people.includes(c.id)).length;
  const setMark = (mark: Mark) => void send({ type: 'mark', characterId: c.id, mark: c.mark?.mark === mark ? null : mark });

  return (
    <article id={`dt-person-${c.id}`} className="dt-person" data-variant={variant} data-mark={c.mark?.mark} tabIndex={-1}>
      <div className="dt-person-top">
        <div className="dt-portrait">
          {c.portraitUrl ? (
            <img src={c.portraitUrl} alt={c.portraitAlt ?? c.name} loading="lazy" />
          ) : (
            <span className="dt-portrait-ph" title={c.portraitAlt ?? undefined}>
              {initials(c.name)}
            </span>
          )}
          {c.mark && <span className="dt-portrait-mark">{c.mark.mark === 'suspect' ? s.board.markSuspect : s.board.markClear}</span>}
        </div>
        <div className="dt-person-id">
          <h3 className="dt-person-name">{c.name}</h3>
          <p className="dt-person-role">
            {c.role}
            {c.age != null && <span className="dim">, {s.board.age(c.age)}</span>}
          </p>
          <p className="dt-person-rel">{c.relation}</p>
        </div>
      </div>

      <div className="dt-person-summary" data-open={open || undefined}>
        <Paras text={c.summary} />
      </div>
      <button type="button" className="dt-link" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? s.board.less : s.board.more}
      </button>

      {variant === 'suspect' && (
        <div className="dt-mark-row">
          <div className="dt-seg" role="group">
            <button type="button" className="dt-seg-btn" data-tone="suspect" aria-pressed={c.mark?.mark === 'suspect'} disabled={readOnly} onClick={() => setMark('suspect')}>
              {s.board.markSuspect}
            </button>
            <button type="button" className="dt-seg-btn" data-tone="clear" aria-pressed={c.mark?.mark === 'clear'} disabled={readOnly} onClick={() => setMark('clear')}>
              {s.board.markClear}
            </button>
          </div>
          {c.mark && <p className="dt-mark-by">{s.board.markedBy(c.mark.mark === 'suspect' ? s.board.markSuspect : s.board.markClear, nick(c.mark.by))}</p>}
        </div>
      )}

      <button
        type="button"
        className="dt-mentions"
        disabled={mentions === 0}
        onClick={() => {
          setPersonFilter(c.id);
          setTab('cabinet');
        }}
      >
        {s.board.mentions(mentions)}
      </button>

      <NoteList
        compact
        notes={c.notes}
        onAdd={async (text) => (await send({ type: 'note', target: { kind: 'character', id: c.id }, text })).ok}
      />
    </article>
  );
}

function Locations() {
  const { view } = useDesk();
  if (!view.locations.length) return null;
  return (
    <section className="dt-sec" aria-labelledby="dt-locs">
      <h2 id="dt-locs" className="dt-sec-title">
        {s.board.locations}
      </h2>
      {view.locations.map((l) => (
        <article key={l.id} className="dt-loc">
          <h3 className="dt-loc-name">{l.name}</h3>
          <Picture url={l.imageUrl} alt={l.imageAlt ?? l.name} className="dt-loc-pic" tone="dark" />
          <div className="dt-loc-desc">
            <Paras text={l.description} />
          </div>
          {l.plan && (
            <div className="dt-loc-plan">
              <FloorPlan plan={l.plan} title={l.name} compact />
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function Timeline() {
  const { view, evidence, openEvidence } = useDesk();
  const days = useMemo(() => {
    const sorted = [...view.timeline].sort((a, b) => a.at.localeCompare(b.at));
    const out: { day: string; items: typeof sorted }[] = [];
    for (const e of sorted) {
      const [day] = splitAt(e.at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [view.timeline]);

  return (
    <section className="dt-sec" aria-labelledby="dt-tl">
      <h2 id="dt-tl" className="dt-sec-title">
        {s.board.timeline}
      </h2>
      {days.length === 0 ? (
        <p className="dt-empty">{s.board.timelineEmpty}</p>
      ) : (
        <div className="dt-tl">
          {days.map((d) => (
            <div key={d.day} className="dt-tl-day">
              <p className="dt-tl-date">{d.day}</p>
              <ol className="dt-tl-list">
                {d.items.map((e, i) => {
                  const ev = evidence.get(e.evidenceId);
                  return (
                    <li key={`${e.at}-${i}`}>
                      <button type="button" className="dt-tl-item" onClick={() => openEvidence(e.evidenceId)}>
                        <span className="dt-tl-time">{splitAt(e.at)[1]}</span>
                        <span className="dt-tl-text">
                          {e.text}
                          {ev && (
                            <span className="dt-tl-src">
                              <KindGlyph kind={ev.kind} size={12} /> {ev.title}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Scenes() {
  const { view, replayAct } = useDesk();
  if (!view.acts.length) return null;
  return (
    <section className="dt-sec" aria-labelledby="dt-scenes">
      <h2 id="dt-scenes" className="dt-sec-title">
        {s.scene.replay}
      </h2>
      <ol className="dt-scene-list">
        {view.acts.map((a) => (
          <li key={a.index}>
            <button type="button" className="option" onClick={() => replayAct(a.index)}>
              <span>
                <span className="dt-mono dim">{a.index + 1}</span> {a.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
