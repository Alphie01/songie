import { useEffect, useMemo, useState } from 'react';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { QuestionView } from '../shared/index.js';
import { KindGlyph } from './Bits';
import { s } from './strings';
import { Paras, splitAt, useDesk, type Desk } from './util';

type Opt = { id: string; text: string; kind?: Parameters<typeof KindGlyph>[0]['kind'] };

function optionsFor(q: QuestionView, d: Pick<Desk, 'view'>): Opt[] {
  if (q.options.length) return q.options;
  if (q.kind === 'suspect') return d.view.characters.filter((c) => c.suspect).map((c) => ({ id: c.id, text: c.name }));
  if (q.kind === 'evidence') return [...d.view.evidence].sort((a, b) => a.seq - b.seq).map((e) => ({ id: e.id, text: e.title, kind: e.kind }));
  return [];
}

function useLabel() {
  const d = useDesk();
  return (questionId: string, answer: string | null | undefined): string => {
    if (!answer) return s.result.noAnswer;
    const q = d.view.questions.find((x) => x.id === questionId);
    const o = q?.options.find((x) => x.id === answer);
    if (o) return o.text;
    return d.chars.get(answer)?.name ?? d.evidence.get(answer)?.title ?? answer;
  };
}

// ---------- Suçlama ----------

export function Accuse({ onBrowse }: { onBrowse: () => void }) {
  const d = useDesk();
  const { view, send, isHost, room } = d;
  const mine = view.accuse?.mine ?? null;
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...(mine ?? {}) }));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (mine) setAnswers((a) => ({ ...mine, ...a }));
  }, [mine]);

  const missing = view.questions.filter((q) => !answers[q.id]).length;
  const submitted = view.accuse?.submitted ?? [];
  const changed = !mine || view.questions.some((q) => mine[q.id] !== answers[q.id]);
  const players = room.players;

  return (
    <div className="dt-final">
      <header className="dt-final-head">
        <p className="dt-final-case">{view.case.title}</p>
        <h1 className="dt-final-title">{s.accuse.title}</h1>
        <p className="dt-final-lead">{s.accuse.lead}</p>
        <button type="button" className="btn btn-ghost" onClick={onBrowse}>
          {s.accuse.browse}
        </button>
      </header>

      <form
        className="dt-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await send({ type: 'answer', answers });
          setBusy(false);
        }}
      >
        {view.questions.map((q, i) => (
          <fieldset key={q.id} className="dt-q">
            <legend className="dt-q-head">
              <span className="dt-q-n">{i + 1}</span>
              <span className="dt-q-prompt">{q.prompt}</span>
              <span className="dt-q-pts">{s.accuse.points(q.points)}</span>
            </legend>
            {q.kind !== 'choice' && <p className="dt-small dim">{q.kind === 'suspect' ? s.accuse.pickSuspect : s.accuse.pickEvidence}</p>}
            <div className="dt-q-opts" data-kind={q.kind}>
              {optionsFor(q, d).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="option dt-q-opt"
                  aria-pressed={answers[q.id] === o.id}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                >
                  <span className="dt-q-opt-text">
                    {o.kind && <KindGlyph kind={o.kind} size={14} />}
                    {o.text}
                  </span>
                  {answers[q.id] === o.id && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="dt-form-foot">
          {mine && !changed ? <p className="dt-small dt-ok">{s.accuse.sent}</p> : missing > 0 && <p className="dt-small dim">{s.accuse.incomplete(missing)}</p>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !changed || Object.keys(answers).length === 0}>
            {mine ? s.accuse.update : s.accuse.submit}
          </button>
        </div>
      </form>

      <section className="dt-final-status" aria-labelledby="dt-submitted">
        <h2 id="dt-submitted" className="dt-sec-title">
          {s.accuse.submitted}
          <span className="dt-count">
            {submitted.length}/{players.length}
          </span>
        </h2>
        <ul className="dt-submitted">
          {players.map((p) => (
            <li key={p.id} data-done={submitted.includes(p.id) || undefined}>
              <Avatar avatar={p.avatar} nick={p.nick} size={28} dim={!submitted.includes(p.id)} />
              <span>{p.nick}</span>
              {submitted.includes(p.id) && <Icon name="check" size={14} />}
            </li>
          ))}
        </ul>
        {isHost ? (
          <div className="dt-host-actions">
            <p className="dt-small dim">{s.accuse.collectHint(submitted.length, players.length)}</p>
            <button type="button" className="btn btn-primary btn-block" disabled={submitted.length === 0} onClick={() => void send({ type: 'collect' })}>
              {s.accuse.collect}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'reopen' })}>
              {s.accuse.reopen}
            </button>
          </div>
        ) : (
          <p className="dt-small dim">{s.accuse.waitHost}</p>
        )}
      </section>
    </div>
  );
}

// ---------- Karşılaştırma ----------

export function Reconcile({ onBrowse }: { onBrowse: () => void }) {
  const d = useDesk();
  const { view, send, isHost, player, nick } = d;
  const rec = view.reconcile;
  if (!rec) return null;
  const missing = view.questions.some((q) => !rec.final[q.id]);

  return (
    <div className="dt-final">
      <header className="dt-final-head">
        <p className="dt-final-case">{view.case.title}</p>
        <h1 className="dt-final-title">{s.reconcile.title}</h1>
        <p className="dt-final-lead">{s.reconcile.lead}</p>
        <button type="button" className="btn btn-ghost" onClick={onBrowse}>
          {s.accuse.browse}
        </button>
      </header>

      <div className="dt-form">
        {view.questions.map((q, i) => {
          const tally = rec.tallies[q.id] ?? {};
          const final = rec.final[q.id] ?? null;
          const total = Object.values(tally).reduce((t, v) => t + v.length, 0);
          const opts = optionsFor(q, d);
          // Oylanan seçenekler önce, sonra (oda sahibi için) diğerleri
          const voted = opts.filter((o) => (tally[o.id]?.length ?? 0) > 0).sort((a, b) => (tally[b.id]?.length ?? 0) - (tally[a.id]?.length ?? 0));
          const extra = Object.keys(tally).filter((k) => !opts.some((o) => o.id === k));
          const rest = isHost ? opts.filter((o) => !(tally[o.id]?.length ?? 0)) : [];
          return (
            <fieldset key={q.id} className="dt-q">
              <legend className="dt-q-head">
                <span className="dt-q-n">{i + 1}</span>
                <span className="dt-q-prompt">{q.prompt}</span>
                <span className="dt-q-pts">{s.accuse.points(q.points)}</span>
              </legend>
              {total === 0 && <p className="dt-small dim">{s.reconcile.noVotes}</p>}
              <div className="dt-q-opts">
                {[...voted, ...extra.map((id) => ({ id, text: id }) as Opt), ...rest].map((o) => {
                  const voters = tally[o.id] ?? [];
                  const isFinal = final === o.id;
                  return (
                    <div key={o.id} className="dt-tally-row" data-final={isFinal || undefined}>
                      <button
                        type="button"
                        className="option dt-q-opt"
                        aria-pressed={isFinal}
                        disabled={!isHost}
                        title={isHost ? s.reconcile.hostPick : undefined}
                        onClick={() => isHost && void send({ type: 'final', questionId: q.id, answer: o.id })}
                      >
                        <span className="dt-q-opt-text">
                          {o.kind && <KindGlyph kind={o.kind} size={14} />}
                          {o.text}
                        </span>
                        {isFinal && <span className="dt-final-tag">{s.reconcile.teamAnswer}</span>}
                      </button>
                      {voters.length > 0 && (
                        <div className="dt-tally-voters">
                          <span className="dt-tally-bar">
                            <i style={{ width: `${(voters.length / Math.max(1, total)) * 100}%` }} />
                          </span>
                          <ul>
                            {voters.map((id) => {
                              const p = player(id);
                              return <li key={id}>{p ? <Avatar avatar={p.avatar} nick={p.nick} size={20} /> : nick(id)}</li>;
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        <div className="dt-form-foot">
          {isHost ? (
            <>
              {missing && <p className="dt-small dim">{s.reconcile.missing}</p>}
              <button type="button" className="btn btn-primary btn-lg btn-block" disabled={missing} onClick={() => void send({ type: 'submit' })}>
                {s.reconcile.submit}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'reopen' })}>
                {s.accuse.reopen}
              </button>
            </>
          ) : (
            <p className="dt-small dim">{s.reconcile.waitHost}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Sonuç ----------

export function Result() {
  const d = useDesk();
  const { view, player, nick, evidence, openEvidence, isHost } = d;
  const label = useLabel();
  const r = view.result;
  const timeline = useMemo(() => (r ? [...r.timeline].sort((a, b) => a.at.localeCompare(b.at)) : []), [r]);
  if (!r) return null;
  const culprits = r.culprits.map((c) => d.chars.get(c)?.name ?? c);

  return (
    <div className="dt-final dt-result">
      <header className="dt-result-head">
        <p className="dt-final-case">{view.case.title}</p>
        <span className="dt-result-stamp" data-solved={r.solved || undefined}>
          {s.result.stamp}
        </span>
        <h1 className="dt-result-title">{r.solved ? s.result.solved : s.result.unsolved}</h1>
        <div className="dt-result-score">
          <div className="dt-result-card" data-tone="score">
            <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
              <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <p className="dt-result-pts">
              {r.score}
              <span>/ {r.maxScore}</span>
            </p>
            <p className="dt-result-cap">{s.result.score}</p>
          </div>
          <div className="dt-result-card" data-tone="rank">
            <p className="dt-result-rank">{r.rank}</p>
            <p className="dt-result-cap">{s.result.rank}</p>
          </div>
        </div>
        {culprits.length > 0 && (
          <p className="dt-result-culprit">
            <span className="dt-result-culprit-k">{s.result.culprits}</span> {culprits.join(', ')}
          </p>
        )}
        <p className="dt-result-end">{isHost ? s.result.endHost : s.result.endGuest}</p>
      </header>

      <section className="dt-sec" aria-labelledby="dt-r-q">
        <h2 id="dt-r-q" className="dt-sec-title">
          {s.result.questions}
        </h2>
        <ol className="dt-r-questions">
          {r.questions.map((q) => (
            <li key={q.id} className="dt-r-q" data-ok={q.ok || undefined}>
              <div className="dt-r-q-top">
                <span className="dt-r-q-mark">
                  <Icon name={q.ok ? 'check' : 'x'} size={14} />
                  <span className="sr-only">{q.ok ? s.result.ok : s.result.wrong}</span>
                </span>
                <p className="dt-r-q-prompt">{q.prompt}</p>
                <span className="dt-r-q-pts">{s.result.pts(q.points)}</span>
              </div>
              <dl className="dt-r-q-ans">
                <div>
                  <dt>{s.result.team}</dt>
                  <dd>{label(q.id, q.team)}</dd>
                </div>
                {!q.ok && (
                  <div>
                    <dt>{s.result.correct}</dt>
                    <dd>{q.correct.map((c) => label(q.id, c)).join(' / ')}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <div className="dt-result-grid">
        <section className="dt-sec" aria-labelledby="dt-r-b">
          <h2 id="dt-r-b" className="dt-sec-title">
            {s.result.breakdown}
          </h2>
          <ul className="dt-breakdown">
            {r.breakdown.map((b, i) => (
              <li key={i} data-neg={b.points < 0 || undefined}>
                <span>{b.label}</span>
                <span className="dt-mono">{s.result.pts(b.points)}</span>
              </li>
            ))}
            <li className="dt-breakdown-total">
              <span>{s.result.score}</span>
              <span className="dt-mono">{r.score}</span>
            </li>
          </ul>
        </section>
        {r.individual.length > 1 && (
          <section className="dt-sec" aria-labelledby="dt-r-i">
            <h2 id="dt-r-i" className="dt-sec-title">
              {s.result.individual}
            </h2>
            <ul className="sg-score-list">
              {[...r.individual]
                .sort((a, b) => b.correct - a.correct)
                .map((p) => {
                  const pl = player(p.playerId);
                  return (
                    <li key={p.playerId} className="sg-score">
                      {pl && <Avatar avatar={pl.avatar} nick={pl.nick} size={26} />}
                      <span className="sg-score-name">{nick(p.playerId)}</span>
                      <span className="sg-score-pts dt-mono">{s.result.individualOf(p.correct, p.total)}</span>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}
      </div>

      <section className="dt-sec" aria-labelledby="dt-r-story">
        <h2 id="dt-r-story" className="dt-sec-title">
          {s.result.story}
        </h2>
        <article className="dt-paper dt-story">
          <Paras text={r.story} />
        </article>
      </section>

      <section className="dt-sec" aria-labelledby="dt-r-tl">
        <h2 id="dt-r-tl" className="dt-sec-title">
          {s.result.timeline}
        </h2>
        <ol className="dt-tl-list dt-r-tl">
          {timeline.map((e, i) => {
            const [day, time] = splitAt(e.at);
            const prevDay = i > 0 ? splitAt(timeline[i - 1]!.at)[0] : null;
            return (
              <li key={i}>
                {day !== prevDay && <p className="dt-tl-date">{day}</p>}
                <div className="dt-tl-item dt-tl-static">
                  <span className="dt-tl-time">{time}</span>
                  <span className="dt-tl-text">{e.text}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="dt-sec" aria-labelledby="dt-r-chain">
        <h2 id="dt-r-chain" className="dt-sec-title">
          {s.result.chain}
        </h2>
        <ol className="dt-chain">
          {r.chain.map((c, i) => (
            <li key={i} className="dt-chain-step">
              <span className="dt-chain-n">{i + 1}</span>
              <div>
                <p className="dt-chain-text">{c.step}</p>
                <ul className="dt-chain-ev">
                  {c.evidence.map((e) => (
                    <li key={e.id} data-found={e.found || undefined}>
                      {e.found && evidence.has(e.id) ? (
                        <button type="button" className="dt-chain-chip" onClick={() => openEvidence(e.id)}>
                          {e.title}
                        </button>
                      ) : (
                        <span className="dt-chain-chip">{e.title}</span>
                      )}
                      <span className="dt-chain-state">{e.found ? s.result.found : s.result.missed}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {r.redHerrings.length > 0 && (
        <section className="dt-sec" aria-labelledby="dt-r-rh">
          <h2 id="dt-r-rh" className="dt-sec-title">
            {s.result.herrings}
          </h2>
          <ul className="dt-herrings">
            {r.redHerrings.map((h, i) => (
              <li key={i}>
                <p className="dt-herring-title">{h.title}</p>
                <p className="dt-herring-text">{h.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.characters.length > 0 && (
        <section className="dt-sec" aria-labelledby="dt-r-ch">
          <h2 id="dt-r-ch" className="dt-sec-title">
            {s.result.characters}
          </h2>
          <div className="dt-secrets">
            {r.characters.map((c) => (
              <article key={c.name} className="dt-secret">
                <h3 className="dt-secret-name">{c.name}</h3>
                <p className="dt-secret-text">{c.secret}</p>
                <p className="dt-secret-where">
                  <span className="dt-label">{s.result.whereabouts}</span> {c.whereabouts}
                </p>
                {c.lies.length > 0 && (
                  <div className="dt-secret-lies">
                    <p className="dt-label">{s.result.lies}</p>
                    <ul>
                      {c.lies.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
