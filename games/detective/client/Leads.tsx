import { Avatar, Icon } from '@songie/game-kit/ui';
import type { LeadView, OpenedLeadView } from '../shared/index.js';
import { HINT_PENALTY } from '../shared/index.js';
import { ConfirmButton } from './Bits';
import { s } from './strings';
import { useDesk } from './util';

export function Leads() {
  const { view } = useDesk();
  const active = view.phase === 'investigate';
  return (
    <div className="dt-leads">
      <Hours />
      {active && view.proposal && <Proposal />}
      {active && <Available />}
      {active && view.hints.enabled && <Hint />}
      {active && <Close />}
      <Opened />
    </div>
  );
}

function Hours() {
  const { view } = useDesk();
  const { spent, budget, target, actSpent, actLimit } = view.hours;
  const out = spent >= budget;
  return (
    <section className="dt-hours" aria-labelledby="dt-hours-t" data-out={out || undefined} data-over={spent > target || undefined}>
      <h2 id="dt-hours-t" className="dt-label">
        {s.leads.hours}
      </h2>
      <p className="dt-hours-big">
        <span className="dt-hours-n">{spent}</span>
        <span className="dt-hours-of">/ {budget} sa</span>
      </p>
      <div className="dt-hours-bar" role="meter" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={spent} aria-label={s.leads.hoursOf(spent, budget)}>
        {Array.from({ length: budget }, (_, i) => (
          <span key={i} data-on={i < spent || undefined} data-target={i === target - 1 || undefined} />
        ))}
      </div>
      <p className="dt-hours-note">{out ? s.leads.budgetOut : s.leads.target(target)}</p>
      <p className="dt-hours-act">{s.leads.actSpent(actSpent, actLimit)}</p>
    </section>
  );
}

function Proposal() {
  const { view, meId, isHost, send, nick, player } = useDesk();
  const p = view.proposal!;
  const lead = p.leadId ? view.leads.find((l) => l.id === p.leadId) : null;
  const yes = Object.values(p.votes).filter(Boolean).length;
  const mine = p.votes[meId];
  const voting = view.leadMode === 'vote';
  return (
    <section className="dt-proposal" aria-live="polite">
      <p className="dt-proposal-by">{p.kind === 'lead' ? s.proposal.lead(nick(p.by)) : s.proposal.close(nick(p.by))}</p>
      {lead && (
        <div className="dt-proposal-lead">
          <p className="dt-lead-title">{lead.title}</p>
          <span className="dt-cost">{s.leads.cost(lead.hours)}</span>
        </div>
      )}
      {voting ? (
        <>
          <div className="dt-tally">
            <span className="dt-tally-n">{s.proposal.tally(yes, p.needed)}</span>
            <span className="dt-tally-bar">
              <i style={{ width: `${Math.min(100, (yes / Math.max(1, p.needed)) * 100)}%` }} />
            </span>
          </div>
          <ul className="dt-voters">
            {Object.entries(p.votes).map(([id, v]) => {
              const pl = player(id);
              return (
                <li key={id} data-vote={v ? 'yes' : 'no'} title={nick(id)}>
                  {pl && <Avatar avatar={pl.avatar} nick={pl.nick} size={24} />}
                  <span className="dt-voter-mark">
                    <Icon name={v ? 'check' : 'x'} size={10} />
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="dt-vote-row">
            <button type="button" className="btn btn-outline dt-vote" data-on={mine === true || undefined} onClick={() => void send({ type: 'vote', yes: true })}>
              <Icon name="check" size={14} />
              {s.proposal.yes}
            </button>
            <button type="button" className="btn btn-outline dt-vote" data-on={mine === false || undefined} onClick={() => void send({ type: 'vote', yes: false })}>
              <Icon name="x" size={14} />
              {s.proposal.no}
            </button>
          </div>
        </>
      ) : (
        !isHost && <p className="dt-small dim">{s.proposal.waitHost}</p>
      )}
      <div className="dt-proposal-actions">
        {isHost && p.kind === 'lead' && p.leadId && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => void send({ type: 'open', leadId: p.leadId! })}>
            {s.proposal.hostOpen}
          </button>
        )}
        {isHost && p.kind === 'close' && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => void send({ type: 'close' })}>
            {s.proposal.hostClose}
          </button>
        )}
        {(p.by === meId || isHost) && (
          <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'cancelProposal' })}>
            {p.by === meId ? s.proposal.cancel : s.proposal.reject}
          </button>
        )}
      </div>
    </section>
  );
}

function Available() {
  const { view } = useDesk();
  return (
    <section className="dt-sec" aria-labelledby="dt-avail">
      <h2 id="dt-avail" className="dt-sec-title">
        {s.leads.available}
        <span className="dt-count">{view.leads.length}</span>
      </h2>
      {view.leadMode === 'host' && <p className="dt-small dim">{s.leads.hostOnly}</p>}
      {view.leads.length === 0 ? (
        <p className="dt-empty">{s.leads.none}</p>
      ) : (
        <ul className="dt-lead-list">
          {view.leads.map((l) => (
            <li key={l.id}>
              <LeadCard l={l} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LeadCard({ l }: { l: LeadView }) {
  const { view, isHost, send } = useDesk();
  const left = view.hours.budget - view.hours.spent;
  const tooMuch = l.hours > left;
  const busy = !!view.proposal;
  const proposed = view.proposal?.leadId === l.id;
  const voting = view.leadMode === 'vote';
  const busyTitle = busy && !proposed ? s.proposal.busy : undefined;

  return (
    <article className="dt-lead" data-proposed={proposed || undefined} data-off={tooMuch || undefined}>
      <div className="dt-lead-top">
        <h3 className="dt-lead-title">{l.title}</h3>
        <span className="dt-cost">{s.leads.cost(l.hours)}</span>
      </div>
      <p className="dt-lead-desc">{l.description}</p>
      {tooMuch ? (
        <p className="dt-small dt-warn">{s.leads.tooExpensive}</p>
      ) : (
        !proposed && (
          <div className="dt-lead-actions">
            {isHost && !voting ? (
              <button type="button" className="btn btn-outline dt-lead-btn" onClick={() => void send({ type: 'open', leadId: l.id })}>
                {s.leads.open}
              </button>
            ) : (
              <button type="button" className="btn btn-outline dt-lead-btn" disabled={busy} title={busyTitle} onClick={() => void send({ type: 'propose', leadId: l.id })}>
                {s.leads.propose}
              </button>
            )}
            {isHost && voting && (
              <button type="button" className="btn btn-ghost dt-lead-btn" onClick={() => void send({ type: 'open', leadId: l.id })}>
                {s.leads.openNow}
              </button>
            )}
          </div>
        )
      )}
    </article>
  );
}

function Opened() {
  const { view } = useDesk();
  if (!view.opened.length) return null;
  const list = [...view.opened].reverse();
  return (
    <section className="dt-sec" aria-labelledby="dt-opened">
      <h2 id="dt-opened" className="dt-sec-title">
        {s.leads.opened}
        <span className="dt-count">{view.opened.length}</span>
      </h2>
      <ul className="dt-opened-list">
        {list.map((o) => (
          <li key={o.id}>
            <OpenedCard o={o} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OpenedCard({ o }: { o: OpenedLeadView }) {
  const { evidence, openEvidence, nick } = useDesk();
  return (
    <article className="dt-opened">
      <div className="dt-lead-top">
        <h3 className="dt-opened-title">{o.title}</h3>
        <span className="dt-cost dt-cost-spent">{s.leads.cost(o.hours)}</span>
      </div>
      <p className="dt-opened-outcome">{o.outcome}</p>
      <p className="dt-opened-meta">{s.leads.openedMeta(o.act, o.by ? nick(o.by) : null)}</p>
      {o.evidence.length > 0 && (
        <ul className="dt-opened-ev" aria-label={s.leads.brought}>
          {o.evidence.map((id) => {
            const e = evidence.get(id);
            return (
              <li key={id}>
                <button type="button" className="dt-link" onClick={() => openEvidence(id)}>
                  {e?.title ?? id}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function Hint() {
  const { view, send } = useDesk();
  const { used, left } = view.hints;
  return (
    <section className="dt-sec dt-hint" aria-labelledby="dt-hint">
      <h2 id="dt-hint" className="dt-sec-title">
        {s.hint.title}
      </h2>
      <p className="dt-small dim">{s.hint.left(left)}</p>
      <ConfirmButton
        label={s.hint.askCost(HINT_PENALTY)}
        confirm={s.hint.confirm}
        yes={s.hint.confirmYes}
        disabled={left <= 0 || view.phase !== 'investigate'}
        onConfirm={() => void send({ type: 'hint' })}
      />
      {used.length > 0 && (
        <ol className="dt-hint-list">
          {used.map((h, i) => (
            <li key={i}>
              <span className="dt-hint-act">{s.hint.used(h.act)}</span>
              <p>{h.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Close() {
  const { view, isHost, send } = useDesk();
  const voting = view.leadMode === 'vote';
  return (
    <section className="dt-sec dt-close" aria-labelledby="dt-close">
      <h2 id="dt-close" className="dt-sec-title">
        {s.close.title}
      </h2>
      <p className="dt-small dim">{view.canClose ? s.close.hint : s.close.notYet}</p>
      {view.canClose &&
        (isHost ? (
          <ConfirmButton label={s.close.direct} confirm={s.close.confirm} yes={s.close.confirmYes} onConfirm={() => void send({ type: 'close' })} />
        ) : voting ? (
          <button type="button" className="btn btn-outline btn-block" disabled={!!view.proposal} onClick={() => void send({ type: 'proposeClose' })}>
            {s.close.propose}
          </button>
        ) : (
          <p className="dt-small dim">{s.close.hostOnly}</p>
        ))}
    </section>
  );
}
