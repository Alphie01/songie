import { useMemo, useState } from 'react';
import type { CharacterView, Mark } from '../shared/index.js';
import { IvGlyph, KindGlyph, NoteList, Picture } from './Bits';
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
          <h2 id="dt-victim" className="dt-label">
            {s.board.victim(view.case.genre)}
          </h2>
          {victims.map((c) => (
            <PersonCard key={c.id} c={c} variant="victim" />
          ))}
        </section>
      )}

      <section className="dt-sec" aria-labelledby="dt-suspects">
        <h2 id="dt-suspects" className="dt-label">
          {s.board.suspects}
          <span className="dt-count">{suspects.length}</span>
        </h2>
        <div className="dt-people">
          {suspects.map((c, i) => (
            <PersonCard key={c.id} c={c} variant="suspect" tone={i} />
          ))}
        </div>
      </section>

      {others.length > 0 && (
        <section className="dt-sec" aria-labelledby="dt-others">
          <h2 id="dt-others" className="dt-label">
            {s.board.others}
          </h2>
          <div className="dt-people">
            {others.map((c, i) => (
              <PersonCard key={c.id} c={c} variant="other" tone={i + suspects.length} />
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

const TONES = ['pink', 'sky', 'yellow', 'mint', 'coral', 'lilac'] as const;

function PersonCard({ c, variant, tone = 0 }: { c: CharacterView; variant: 'victim' | 'suspect' | 'other'; tone?: number }) {
  const { send, nick, view, setPersonFilter, setTab, readOnly, openInterview, ivUnread } = useDesk();
  const ivs = view.interviews.filter((i) => i.characterId === c.id);
  const [open, setOpen] = useState(false);
  const mentions = view.evidence.filter((e) => e.people.includes(c.id)).length;
  const setMark = (mark: Mark) => void send({ type: 'mark', characterId: c.id, mark: c.mark?.mark === mark ? null : mark });
  const ivBadge = ivs.reduce((n, iv) => n + (ivUnread.get(iv.id)?.count ?? 0), 0);
  const ivFresh = ivs.some((iv) => ivUnread.get(iv.id)?.fresh);

  return (
    <article id={`dt-person-${c.id}`} className="dt-person" data-variant={variant} data-mark={c.mark?.mark} data-open={open || undefined} tabIndex={-1} onFocus={(e) => e.target === e.currentTarget && setOpen(true)}>
      <div className="dt-person-top">
        <span className="dt-portrait" data-tone={variant === 'victim' ? 'victim' : TONES[tone % TONES.length]}>
          {c.portraitUrl ? (
            <img src={c.portraitUrl} alt={c.portraitAlt ?? c.name} loading="lazy" />
          ) : (
            <span className="dt-portrait-ph" title={c.portraitAlt ?? undefined}>
              {initials(c.name)}
            </span>
          )}
        </span>
        <button type="button" className="dt-person-id" aria-expanded={open} aria-label={s.board.details(c.name)} onClick={() => setOpen(!open)}>
          <span className="dt-person-name">{c.name}</span>
          <span className="dt-person-role">
            {c.role}
            {c.age != null && <>, {s.board.age(c.age)}</>}
          </span>
          {!open && c.notes.length > 0 && <span className="dt-person-notes">{s.notes.count(c.notes.length)}</span>}
        </button>
        <span className="dt-person-tags">
          {c.mark && (
            <span className="dt-mark-pill" data-tone={c.mark.mark}>
              {c.mark.mark === 'suspect' ? s.board.markSuspect : s.board.markClear}
            </span>
          )}
          {ivs.length > 0 && (
            <button type="button" className="dt-iv-pill" onClick={() => openInterview(ivs[ivs.length - 1]!.id)}>
              {s.interview.open}
              {ivBadge > 0 ? <span className="dt-tab-badge">{ivBadge}</span> : ivFresh && <span className="dt-tab-dot" aria-hidden="true" />}
            </button>
          )}
        </span>
      </div>

      {open && (
        <div className="dt-person-more">
          <p className="dt-person-rel">{c.relation}</p>
          <div className="dt-person-summary">
            <Paras text={c.summary} />
          </div>

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

          {ivs.length > 1 &&
            ivs.map((iv) => {
              const u = ivUnread.get(iv.id);
              return (
                <button key={iv.id} type="button" className="dt-person-iv" onClick={() => openInterview(iv.id)}>
                  <IvGlyph />
                  <span className="dt-person-iv-text">
                    {s.interview.open}
                    <span className="dim">, {iv.place}</span>
                  </span>
                  {u && u.count > 0 ? <span className="dt-tab-badge">{u.count}</span> : u?.fresh && <span className="dt-new">{s.interview.newQ}</span>}
                </button>
              );
            })}

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
        </div>
      )}
    </article>
  );
}

function Locations() {
  const { view } = useDesk();
  if (!view.locations.length) return null;
  return (
    <section className="dt-sec" aria-labelledby="dt-locs">
      <h2 id="dt-locs" className="dt-label">
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
      <h2 id="dt-tl" className="dt-label">
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
      <h2 id="dt-scenes" className="dt-label">
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
