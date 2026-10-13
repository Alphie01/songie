import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { BULLSEYE, DIAL_MAX, DIAL_MIN, type FrequencySettings, type FrequencyView, type RoundSummary, type TeamId } from '../shared/index.js';
import { Dial } from './Dial';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (a: Record<string, unknown>) => Promise<boolean>;

function useRemaining(view: FrequencyView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!view.endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [view.endsAt]);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

/** Yerel kadran: sürüklerken anında, sunucuya en fazla ~16/sn gönderir. */
function useLocalDial(view: FrequencyView, meId: string, act: PlayViewProps<FrequencyView>['act']) {
  const [local, setLocal] = useState<number | null>(null);
  const lastLocalAt = useRef(0);
  const lastSentAt = useRef(0);
  const pending = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const round = view.roundId;

  useEffect(() => {
    setLocal(null);
    pending.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, [round, view.phase]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function sendNow(v: number) {
    lastSentAt.current = Date.now();
    pending.current = null;
    void act({ type: 'dial', round, value: v });
  }

  function change(v: number, final: boolean) {
    setLocal(v);
    lastLocalAt.current = Date.now();
    const wait = 60 - (Date.now() - lastSentAt.current);
    if (final || wait <= 0) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      sendNow(v);
      return;
    }
    pending.current = v;
    if (!timer.current) {
      timer.current = setTimeout(() => {
        timer.current = null;
        if (pending.current !== null) sendNow(pending.current);
      }, wait);
    }
  }

  const mine = local !== null && (view.dialBy === meId || Date.now() - lastLocalAt.current < 700);
  return { value: mine ? local! : view.dial, change };
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<FrequencyView, FrequencySettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string | null) => (!id ? '?' : id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const isHost = room.hostId === meId;
  const remaining = useRemaining(view);
  const dial = useLocalDial(view, meId, act);
  const [error, setError] = useState<string | null>(null);

  const send: Send = async (action) => {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
    return res.ok;
  };

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: FrequencySettings) => void setSettings(n) };
  const canDial = view.phase === 'dial' && view.role === 'dialer';
  const revealed = view.phase === 'reveal';
  const curtain = revealed ? 'opening' : view.role === 'psychic' ? 'none' : 'closed';
  const psychic = members.get(view.psychicId);
  const psychicGone = !psychic?.connected;
  const otherTeam: TeamId = view.team === 'a' ? 'b' : 'a';
  const showClue = view.clue !== null || ['dial', 'side', 'reveal'].includes(view.phase);

  return (
    <div className="fq sg">
      <aside className="sg-side sg-left">
        <Rosters view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <section className="fq-play" data-phase={view.phase}>
          <header className="fq-top">
            <span className="fq-round">
              {s.name} · {s.play.round(view.phase === 'reveal' ? Math.max(0, view.completed - 1) : view.completed, view.totalRounds)}
            </span>
            <span className="fq-top-right">{view.targetScore !== null ? s.play.toWin(view.targetScore) : room.code}</span>
          </header>

          <Scores view={view} />

          <p className="fq-who">
            {psychic ? <Avatar avatar={psychic.avatar} nick={psychic.nick} size={30} dim={!psychic.connected} /> : null}
            <span>
              {s.play.psychicIs(psychic?.nick ?? '?')}
              {view.psychicId === meId && s.play.youTag}
            </span>
            {psychicGone && <span className="fq-off">{s.play.offline}</span>}
          </p>

          <Dial
            value={canDial ? dial.value : view.dial}
            card={view.card}
            target={view.target}
            curtain={curtain}
            curtainKey={view.roundId}
            editable={canDial}
            onChange={dial.change}
          />

          {showClue && (
            <div className="fq-clue">
              <span className="fq-clue-body">
                <span className="fq-clue-label">{s.play.clueLabel}</span>
                {view.clue ? <span className="fq-clue-text">“{view.clue}”</span> : <span className="fq-clue-text fq-clue-spoken">{s.play.clueSpoken}</span>}
              </span>
              {view.endsAt > 0 && (
                <span className="fq-timer" data-low={remaining < 10_000 || undefined} role="timer">
                  {Math.ceil(remaining / 1000)} {s.play.seconds}
                </span>
              )}
            </div>
          )}

          <PhasePanel view={view} meId={meId} nick={nick} send={send} otherTeam={otherTeam} dial={canDial ? dial : null} />

          {error && (
            <p className="error-text fq-center" role="alert">
              {error}
            </p>
          )}

          {isHost && psychicGone && view.phase !== 'reveal' && (
            <div className="fq-host">
              <p className="fq-small">{s.play.skipHint(nick(view.psychicId))}</p>
              <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skipPsychic', round: view.roundId })}>
                {s.play.skip}
              </button>
            </div>
          )}

          <div className="fq-spacer" />
          <ActionButton view={view} meId={meId} send={send} />
        </section>

        <div className="sg-mobile-only">
          <Rosters view={view} members={members} meId={meId} />
        </div>

        {view.history.length > 0 && <History view={view} nick={nick} />}

        <section className="howto" aria-labelledby="fq-howto">
          <h2 id="fq-howto" className="howto-title">
            {s.howto.title}
          </h2>
          <ol className="howto-list">
            {s.howto.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="howto-n mono">{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <aside className="sg-side sg-right">
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>
    </div>
  );
}

type LocalDial = ReturnType<typeof useLocalDial>;

/** Ekranın altındaki büyük düğme: kilitle / onayla / sıradaki tur. */
function ActionButton({ view, meId, send }: { view: FrequencyView; meId: string; send: Send }) {
  const r = view.roundId;
  if (view.phase === 'dial' && view.role === 'dialer') {
    const voted = view.lockVotes.includes(meId);
    const majority = view.votesNeeded > 1;
    if (voted) {
      return (
        <button type="button" className="fq-action" data-tone="dark" onClick={() => void send({ type: 'unlock', round: r })}>
          {s.play.unapprove}
        </button>
      );
    }
    return (
      <button type="button" className="fq-action" onClick={() => void send({ type: 'lock', round: r })}>
        {majority ? s.play.approve(view.lockVotes.length, view.votesNeeded) : s.play.lock}
      </button>
    );
  }
  if (view.phase === 'dial' && view.role === 'psychic') {
    return (
      <button type="button" className="fq-action" disabled>
        {s.play.dialPsychicBtn}
      </button>
    );
  }
  if (view.phase === 'reveal' && view.result) {
    return (
      <button type="button" className="fq-action fq-result" onClick={() => void send({ type: 'next', round: r })}>
        {view.winner !== null ? s.play.toPodium : s.play.next}
      </button>
    );
  }
  return null;
}

function PhasePanel({
  view,
  meId,
  nick,
  send,
  otherTeam,
  dial,
}: {
  view: FrequencyView;
  meId: string;
  nick: (id: string | null) => string;
  send: Send;
  otherTeam: TeamId;
  dial: LocalDial | null;
}) {
  const r = view.roundId;
  const teamName = s.team[view.team];
  const oppName = s.team[otherTeam];

  switch (view.phase) {
    case 'pick':
      if (view.role === 'psychic' && view.options) {
        return (
          <div className="fq-panel">
            <p className="fq-prompt">{s.play.pickTitle}</p>
            <div className="fq-options">
              {view.options.map((c) => (
                <button key={c.id} type="button" className="fq-option" onClick={() => void send({ type: 'pick', round: r, cardId: c.id })}>
                  <span className="fq-end fq-end-left">← {c.left}</span>
                  <span className="fq-end fq-end-right">{c.right} →</span>
                </button>
              ))}
            </div>
            <p className="fq-small fq-center">{s.play.pickHint}</p>
          </div>
        );
      }
      return <p className="fq-wait">{s.play.pickWait(nick(view.psychicId))}</p>;

    case 'clue':
      if (view.role === 'psychic') return <ClueForm round={r} send={send} />;
      return <p className="fq-wait">{s.play.clueWait(nick(view.psychicId))}</p>;

    case 'dial': {
      if (view.role === 'dialer' && dial) {
        const voted = view.lockVotes.includes(meId);
        const hint = [voted ? s.play.approved(view.lockVotes.length, view.votesNeeded) : s.play.dialYou, view.dialBy ? s.play.movedBy(nick(view.dialBy)) : null]
          .filter(Boolean)
          .join(' ');
        return (
          <div className="fq-dialing">
            <label htmlFor="fq-range" className="fq-dial-hint">
              {hint}
            </label>
            <input
              id="fq-range"
              className="fq-range"
              type="range"
              min={DIAL_MIN}
              max={DIAL_MAX}
              step={1}
              value={Math.round(dial.value)}
              aria-valuetext={view.card ? s.play.dialValue(view.card.left, view.card.right, dial.value) : undefined}
              onChange={(e) => dial.change(Number(e.target.value), false)}
              onPointerUp={(e) => dial.change(Number(e.currentTarget.value), true)}
              onKeyUp={(e) => dial.change(Number(e.currentTarget.value), true)}
            />
          </div>
        );
      }
      if (view.role === 'psychic') {
        return (
          <div className="fq-points">
            <span className="fq-points-num" data-tone="psychic">
              {s.play.targetHere}
            </span>
          </div>
        );
      }
      return <p className="fq-wait">{view.role === 'opponent' ? s.play.dialOpp(teamName) : s.play.dialSpectator}</p>;
    }

    case 'side':
      if (view.role === 'opponent') {
        return (
          <div className="fq-panel">
            <p className="fq-prompt">{s.play.sideTitle}</p>
            <div className="fq-sides">
              <button type="button" className="fq-side" data-side="left" onClick={() => void send({ type: 'side', round: r, side: 'left' })}>
                ← {s.play.sideLeft}
              </button>
              <button type="button" className="fq-side" data-side="right" onClick={() => void send({ type: 'side', round: r, side: 'right' })}>
                {s.play.sideRight} →
              </button>
            </div>
            <p className="fq-small fq-center">{s.play.sideHint}</p>
          </div>
        );
      }
      return <p className="fq-wait">{s.play.sideWait(oppName)}</p>;

    case 'reveal':
      return view.result ? <Reveal view={view} result={view.result} /> : null;

    default:
      return null;
  }
}

function ClueForm({ round, send }: { round: number; send: Send }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await send({ type: 'clue', round, text });
    setBusy(false);
  }
  return (
    <form className="fq-cluebox" onSubmit={submit}>
      <span className="fq-cluebox-title">{s.play.clueTitle}</span>
      <span className="fq-cluebox-hint">{s.play.clueHint}</span>
      <input
        className="fq-input"
        value={text}
        maxLength={80}
        placeholder={s.play.cluePlaceholder}
        aria-label={s.play.clueLabel}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="fq-dark-btn" disabled={busy}>
        {s.play.clueSend}
      </button>
    </form>
  );
}

function Reveal({ view, result }: { view: FrequencyView; result: RoundSummary }) {
  const opp: TeamId = result.team === 'a' ? 'b' : 'a';
  const over = view.winner !== null;
  return (
    <div className="fq-panel fq-result" data-points={result.points}>
      <p className="fq-points">
        <span className="fq-points-num" data-tone={result.points ? 'hit' : 'miss'}>
          {s.play.points(result.points)}
        </span>
        {result.points === BULLSEYE && <span className="fq-points-tag">{s.play.bullseye}</span>}
      </p>
      {view.mode === 'teams' && (
        <p className="fq-small fq-center">
          {result.side
            ? s.play.sideRes(s.team[opp], result.side === 'left' ? s.play.sideLeft : s.play.sideRight, !!result.sidePoint)
            : s.play.noSide}
        </p>
      )}
      {result.again && <p className="fq-small fq-center fq-again">{view.mode === 'coop' ? s.play.againCoop : s.play.again(s.team[result.team])}</p>}
      {over && (
        <p className="fq-over">
          {view.winner === 'coop' ? s.play.coopDone : view.winner === 'a' || view.winner === 'b' ? s.play.winner(s.team[view.winner]) : s.podium.draw}
        </p>
      )}
    </div>
  );
}

function Scores({ view }: { view: FrequencyView }) {
  if (view.mode === 'coop') {
    return (
      <div className="fq-scores" data-mode="coop">
        <div className="fq-score" data-team="a" data-active>
          <span className="fq-score-head">
            {s.play.total}
            <span className="fq-score-pts">{view.scores.a}</span>
          </span>
          {view.totalRounds ? (
            <span className="fq-track" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (view.completed / view.totalRounds) * 100)}%` }} />
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  const goal = view.targetScore ?? 10;
  return (
    <div className="fq-scores">
      {(['a', 'b'] as TeamId[]).map((t) => (
        <div key={t} className="fq-score" data-team={t} data-active={view.team === t || undefined}>
          <span className="fq-score-head">
            <span>
              {s.teamShort[t]}
              {view.myTeam === t && s.play.youTag}
            </span>
            <span className="fq-score-pts">{view.scores[t]}</span>
          </span>
          <span className="fq-track" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (view.scores[t] / goal) * 100)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function History({ view, nick }: { view: FrequencyView; nick: (id: string | null) => string }) {
  return (
    <section className="fq-history" aria-labelledby="fq-history">
      <h2 id="fq-history" className="fq-box-title">
        {s.play.history}
      </h2>
      <ol>
        {view.history.map((h) => (
          <li key={h.id} data-team={view.mode === 'teams' ? h.team : undefined}>
            <span className="fq-hist-card">
              {h.card.left} / {h.card.right}
            </span>
            <span className="fq-hist-clue">
              <strong>{nick(h.psychicId)}:</strong> {h.clue ? `“${h.clue}”` : s.play.clueSpoken.toLocaleLowerCase('tr-TR')}
            </span>
            <span className="fq-hist-pts" data-points={h.points}>
              {s.play.points(h.points)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Rosters({ view, members, meId }: { view: FrequencyView; members: Map<string, RoomPlayer>; meId: string }) {
  const teams: TeamId[] = view.mode === 'coop' ? ['a'] : ['a', 'b'];
  return (
    <section className="fq-rosters" data-mode={view.mode}>
      {teams.map((t) => (
        <div key={t} className="fq-roster" data-team={view.mode === 'teams' ? t : undefined}>
          <h2 className="fq-roster-name" lang="tr">
            {view.mode === 'coop' ? s.settings.modeCoop : s.team[t]}
          </h2>
          <ul>
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              return (
                <li key={id} data-me={id === meId || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected} />
                  <span className="fq-roster-nick">
                    {m.nick}
                    {id === meId && s.play.youTag}
                  </span>
                  {view.psychicId === id && view.phase !== 'podium' && <span className="fq-badge">{s.play.psychic}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Crown() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true" className="fq-crown">
      <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" />
    </svg>
  );
}

function Confetti() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="fq-confetti" data-n={i} aria-hidden="true" />
      ))}
    </>
  );
}

function Podium({ view, members, meId, code }: { view: FrequencyView; members: Map<string, RoomPlayer>; meId: string; code: string }) {
  const { a, b } = view.scores;
  const head = (
    <>
      <Confetti />
      <div className="fq-end-top">
        <span>{s.name}</span>
        <span className="fq-end-code">{code}</span>
      </div>
    </>
  );
  const foot = (
    <>
      <div className="fq-spacer" />
      <div className="fq-end-foot">
        <span className="fq-end-bar" aria-hidden="true">
          <span style={{ animationDuration: `${view.podiumMs}ms` }} />
        </span>
        <p>{s.podium.back}</p>
      </div>
    </>
  );

  if (view.mode === 'coop') {
    const rating = view.rating ?? 0;
    return (
      <main className="col fq-endscreen">
        {head}
        <div className="fq-end-title">
          <span className="fq-end-tag" lang="tr">
            {s.podium.title}
          </span>
          <h1>{s.ratings[rating]}</h1>
        </div>
        <div className="fq-end-cards">
          <div className="fq-end-card" data-team="a" data-win>
            <Crown />
            <span className="fq-end-num">{a}</span>
            <span className="fq-end-label">{s.ratingHint(a, view.completed)}</span>
          </div>
        </div>
        <Rosters view={view} members={members} meId={meId} />
        {foot}
      </main>
    );
  }

  const winner = view.winner === 'a' || view.winner === 'b' ? view.winner : null;
  const order: TeamId[] = winner === 'b' ? ['b', 'a'] : ['a', 'b'];
  return (
    <main className="col fq-endscreen">
      {head}
      <div className="fq-end-title">
        <span className="fq-end-tag" lang="tr">
          {s.podium.title}
        </span>
        <h1>
          {winner ? (
            <>
              {s.team[winner]}
              <br />
              {s.podium.won}
            </>
          ) : (
            s.podium.draw
          )}
        </h1>
      </div>
      <div className="fq-end-cards">
        {order.map((t, i) => (
          <Fragment key={t}>
            {i === 1 && (
              <span className="fq-end-dash" aria-hidden="true">
                –
              </span>
            )}
            <div className="fq-end-card" data-team={t} data-win={winner === t || (!winner && i === 0) || undefined} data-draw={!winner || undefined}>
              {winner === t && <Crown />}
              <span className="fq-end-num">{t === 'a' ? a : b}</span>
              <span className="fq-end-label">{s.team[t]}</span>
            </div>
          </Fragment>
        ))}
      </div>
      <Rosters view={view} members={members} meId={meId} />
      {foot}
    </main>
  );
}
