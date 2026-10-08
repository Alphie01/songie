import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { BULLSEYE, type FrequencySettings, type FrequencyView, type RoundSummary, type TeamId } from '../shared/index.js';
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

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: FrequencySettings) => void setSettings(n) };
  const canDial = view.phase === 'dial' && view.role === 'dialer';
  const revealed = view.phase === 'reveal';
  const curtain = revealed ? 'opening' : view.role === 'psychic' ? 'none' : 'closed';
  const psychic = members.get(view.psychicId);
  const psychicGone = !psychic?.connected;
  const otherTeam: TeamId = view.team === 'a' ? 'b' : 'a';

  return (
    <div className="fq sg">
      <aside className="sg-side sg-left">
        <Rosters view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.round(view.completed, view.totalRounds)}</span>
          {view.targetScore !== null && <span className="dim">{s.play.toWin(view.targetScore)}</span>}
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Scores view={view} />

        <section className="fq-stage" data-phase={view.phase} data-team={view.mode === 'teams' ? view.team : undefined}>
          <p className="fq-who">
            {psychic && <Avatar avatar={psychic.avatar} nick={psychic.nick} size={22} dim={!psychic.connected} />}
            <span>{s.play.psychicIs(nick(view.psychicId))}</span>
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

          {view.clue !== null || ['dial', 'side', 'reveal'].includes(view.phase) ? (
            <div className="fq-clue">
              <span className="fq-clue-label">{s.play.clueLabel}</span>
              {view.clue ? <q className="fq-clue-text">{view.clue}</q> : <span className="fq-clue-spoken">{s.play.clueSpoken}</span>}
            </div>
          ) : null}

          {view.endsAt > 0 && (
            <div className="fq-timer" data-low={remaining < 10_000 || undefined}>
              <span className="fq-timer-bar" aria-hidden="true">
                <span style={{ width: `${(remaining / Math.max(1, view.durationMs)) * 100}%` }} />
              </span>
              <span className="mono fq-timer-num">
                {Math.ceil(remaining / 1000)} {s.play.seconds}
              </span>
            </div>
          )}

          <PhasePanel view={view} meId={meId} nick={nick} send={send} otherTeam={otherTeam} />

          {error && (
            <p className="error-text fq-center" role="alert">
              {error}
            </p>
          )}

          {isHost && psychicGone && view.phase !== 'reveal' && (
            <div className="fq-host">
              <p className="dim fq-small">{s.play.skipHint(nick(view.psychicId))}</p>
              <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skipPsychic', round: view.roundId })}>
                {s.play.skip}
              </button>
            </div>
          )}
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

function PhasePanel({
  view,
  meId,
  nick,
  send,
  otherTeam,
}: {
  view: FrequencyView;
  meId: string;
  nick: (id: string | null) => string;
  send: Send;
  otherTeam: TeamId;
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
                  <span className="fq-option-l">{c.left}</span>
                  <span className="fq-option-bar" aria-hidden="true" />
                  <span className="fq-option-r">{c.right}</span>
                </button>
              ))}
            </div>
            <p className="dim fq-small">{s.play.pickHint}</p>
          </div>
        );
      }
      return <p className="fq-wait">{s.play.pickWait(nick(view.psychicId))}</p>;

    case 'clue':
      if (view.role === 'psychic') return <ClueForm round={r} send={send} />;
      return <p className="fq-wait">{s.play.clueWait(nick(view.psychicId))}</p>;

    case 'dial': {
      if (view.role === 'dialer') {
        const voted = view.lockVotes.includes(meId);
        const majority = view.votesNeeded > 1;
        return (
          <div className="fq-panel">
            <p className="fq-prompt">{s.play.dialYou}</p>
            {voted ? (
              <>
                <button type="button" className="btn btn-outline btn-block btn-lg" onClick={() => void send({ type: 'unlock', round: r })}>
                  {s.play.unapprove}
                </button>
                <p className="dim fq-small fq-center">{s.play.approved(view.lockVotes.length, view.votesNeeded)}</p>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'lock', round: r })}>
                {majority ? s.play.approve(view.lockVotes.length, view.votesNeeded) : s.play.lock}
              </button>
            )}
            {view.dialBy && <p className="dim fq-small fq-center">{s.play.movedBy(nick(view.dialBy))}</p>}
          </div>
        );
      }
      const text = view.role === 'psychic' ? s.play.dialPsychic : view.role === 'opponent' ? s.play.dialOpp(teamName) : s.play.dialSpectator;
      return <p className="fq-wait">{text}</p>;
    }

    case 'side':
      if (view.role === 'opponent') {
        return (
          <div className="fq-panel">
            <p className="fq-prompt">{s.play.sideTitle}</p>
            <div className="fq-sides">
              <button type="button" className="btn btn-outline btn-lg" onClick={() => void send({ type: 'side', round: r, side: 'left' })}>
                <ArrowGlyph dir="left" />
                {s.play.sideLeft}
              </button>
              <button type="button" className="btn btn-outline btn-lg" onClick={() => void send({ type: 'side', round: r, side: 'right' })}>
                {s.play.sideRight}
                <ArrowGlyph dir="right" />
              </button>
            </div>
            <p className="dim fq-small fq-center">{s.play.sideHint}</p>
          </div>
        );
      }
      return <p className="fq-wait">{s.play.sideWait(oppName)}</p>;

    case 'reveal':
      return view.result ? <Reveal view={view} result={view.result} send={send} /> : null;

    default:
      return null;
  }
}

function ArrowGlyph({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
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
    <form className="fq-panel" onSubmit={submit}>
      <p className="fq-prompt">{s.play.clueTitle}</p>
      <input
        className="input"
        value={text}
        maxLength={80}
        placeholder={s.play.cluePlaceholder}
        aria-label={s.play.clueLabel}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
        {s.play.clueSend}
      </button>
      <p className="dim fq-small">{s.play.clueHint}</p>
    </form>
  );
}

function Reveal({ view, result, send }: { view: FrequencyView; result: RoundSummary; send: Send }) {
  const opp: TeamId = result.team === 'a' ? 'b' : 'a';
  const over = view.winner !== null;
  return (
    <div className="fq-panel fq-result" data-points={result.points}>
      <p className="fq-points">
        <span className="fq-points-num">{s.play.points(result.points)}</span>
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
      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'next', round: view.roundId })}>
        {over ? s.play.toPodium : s.play.next}
      </button>
    </div>
  );
}

function Scores({ view }: { view: FrequencyView }) {
  if (view.mode === 'coop') {
    return (
      <div className="fq-scores" data-mode="coop">
        <div className="fq-score">
          <span className="fq-score-name">{s.play.total}</span>
          <span className="fq-score-pts mono">{view.scores.a}</span>
        </div>
      </div>
    );
  }
  const goal = view.targetScore ?? 10;
  return (
    <div className="fq-scores">
      {(['a', 'b'] as TeamId[]).map((t) => (
        <div key={t} className="fq-score" data-team={t} data-active={view.team === t || undefined}>
          <span className="fq-score-name">
            {s.team[t]}
            {view.myTeam === t && <span className="dim"> ({s.play.you})</span>}
          </span>
          <span className="fq-score-pts mono">{view.scores[t]}</span>
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
      <h2 id="fq-history" className="fq-h2">
        {s.play.history}
      </h2>
      <ol>
        {view.history.map((h) => (
          <li key={h.id} data-team={view.mode === 'teams' ? h.team : undefined}>
            <span className="fq-hist-card">
              {h.card.left} / {h.card.right}
            </span>
            <span className="fq-hist-clue dim">
              {nick(h.psychicId)}: {h.clue ? `“${h.clue}”` : s.play.clueSpoken.toLowerCase()}
            </span>
            <span className="fq-hist-pts mono" data-points={h.points}>
              {h.points}
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
    <section className="fq-rosters">
      {teams.map((t) => (
        <div key={t} className="fq-roster" data-team={view.mode === 'teams' ? t : undefined}>
          <h2 className="fq-h2">
            {view.mode === 'coop' ? s.settings.modeCoop : s.team[t]} <span className="mono">{view.scores[t]}</span>
          </h2>
          <ul className="sg-score-list">
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              return (
                <li key={id} className="sg-score" data-me={id === meId || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />
                  <span className="sg-score-name">{m.nick}</span>
                  {view.psychicId === id && <span className="fq-badge">{s.play.psychic}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Podium({ view, members, meId }: { view: FrequencyView; members: Map<string, RoomPlayer>; meId: string }) {
  const { a, b } = view.scores;
  if (view.mode === 'coop') {
    const rating = view.rating ?? 0;
    return (
      <main className="col podium fq-podium">
        <span className="wordmark" aria-hidden="true">
          songie
        </span>
        <p className="podium-kicker dim">{s.podium.title}</p>
        <div className="podium-winner">
          <h1 className="podium-name">{s.ratings[rating]}</h1>
          <p className="podium-score">{s.ratingHint(a, view.completed)}</p>
        </div>
        <Rosters view={view} members={members} meId={meId} />
        <p className="dim podium-back">{s.podium.back}</p>
      </main>
    );
  }
  const winner = view.winner === 'a' || view.winner === 'b' ? view.winner : null;
  return (
    <main className="col podium fq-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="podium-kicker dim">{s.podium.title}</p>
      <div className="podium-winner">
        <h1 className="podium-name" data-team={winner ?? undefined}>
          {winner ? s.play.winner(s.team[winner]) : s.podium.draw}
        </h1>
        <p className="podium-score mono">
          {a} – {b}
        </p>
      </div>
      <Rosters view={view} members={members} meId={meId} />
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
