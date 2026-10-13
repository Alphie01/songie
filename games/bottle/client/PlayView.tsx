import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { seatAngle, type BottleSettings, type BottleView, type PromptKind } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** Sunucu saati ile yerel saat farkı (ms). */
function useOffset(serverNow: number): number {
  return useMemo(() => serverNow - Date.now(), [serverNow]);
}

function useTick(active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/**
 * Şişeyi sunucunun verdiği parametrelerle döndürür. Herkes aynı başlangıç zamanını ve son açıyı
 * aldığı için şişe bütün ekranlarda aynı anda aynı yerde durur.
 */
function useBottle(view: BottleView, offset: number) {
  const ref = useRef<HTMLDivElement>(null);
  const spin = view.spin;
  const spinning = view.phase === 'spinning' && spin !== null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const put = (deg: number) => {
      el.style.transform = `rotate(${deg}deg)`;
    };
    if (!spinning || !spin) {
      put(view.restDeg);
      return;
    }
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const serverNow = () => Date.now() + offset;
    if (reduce) {
      put(spin.fromDeg);
      const t = setTimeout(() => put(spin.toDeg), Math.max(0, spin.startAt + spin.durationMs - serverNow()));
      return () => clearTimeout(t);
    }
    let raf = 0;
    const frame = () => {
      const t = Math.min(1, Math.max(0, (serverNow() - spin.startAt) / spin.durationMs));
      put(spin.fromDeg + (spin.toDeg - spin.fromDeg) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [spinning, spin, view.restDeg, offset]);

  return ref;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<BottleView, BottleSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const name = (id: string) => members.get(id)?.nick ?? '?';
  const online = (id: string) => members.get(id)?.connected ?? false;
  const isHost = room.hostId === meId;
  const offset = useOffset(view.serverNow);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(action: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await act({ ...action, round: view.round });
      if (!res.ok) setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => setError(null), [view.round, view.phase]);

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: BottleSettings) => void setSettings(n) };

  return (
    <div className="bt sg">
      <aside className="sg-side sg-left">
        <Scores view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center bt-center-col">
        <div className="bt-screen">
          <header className="bt-top">
            <span className="bt-pill">{s.play.round(view.turnNumber, view.totalRounds)}</span>
            <span className="bt-code">{room.code}</span>
          </header>

          <Table view={view} members={members} meId={meId} offset={offset} />

          <Stage view={view} meId={meId} isHost={isHost} busy={busy} nick={nick} name={name} online={online} offset={offset} send={send} />

          {error && (
            <p className="error-text bt-center" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="sg-mobile-only">
          <Scores view={view} members={members} meId={meId} />
        </div>

        <section className="howto bt-howto" aria-labelledby="bt-howto">
          <h2 id="bt-howto" className="howto-title">
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
        <div className="bt-side-card">
          <h2 className="bt-legend">{s.play.settings}</h2>
          <SettingsPanel {...panelProps} section="secondary" />
        </div>
      </aside>
    </div>
  );
}

function Table({ view, members, meId, offset }: { view: BottleView; members: Map<string, RoomPlayer>; meId: string; offset: number }) {
  const bottle = useBottle(view, offset);
  const n = view.seats.length;
  const showTarget = view.phase !== 'spin' && view.phase !== 'spinning';
  return (
    <div className="bt-table" data-n={n > 10 ? 'many' : n > 7 ? 'mid' : 'few'} data-phase={view.phase}>
      <div className="bt-felt" aria-hidden="true" />
      <ul className="bt-seats">
        {view.seats.map((id, i) => {
          const a = (seatAngle(i, n) * Math.PI) / 180;
          const p = members.get(id);
          const isTarget = showTarget && view.targetId === id;
          return (
            <li
              key={id}
              className="bt-seat"
              style={{ left: `${50 + 42.4 * Math.sin(a)}%`, top: `${50 - 42.4 * Math.cos(a)}%` }}
              data-target={isTarget || undefined}
              data-spinner={view.spinnerId === id || undefined}
              data-me={id === meId || undefined}
              data-off={!p?.connected || undefined}
            >
              <span className="bt-seat-ring">
                {p ? <Avatar avatar={p.avatar} nick={p.nick} size={50} dim={!p.connected} /> : <span className="bt-seat-empty" />}
              </span>
              <span className="bt-seat-name">{p ? (id === meId ? s.play.you : p.nick) : '?'}</span>
            </li>
          );
        })}
      </ul>
      <div className="bt-bottle" ref={bottle}>
        <BottleSvg />
      </div>
    </div>
  );
}

function BottleSvg() {
  return (
    <svg viewBox="0 0 54 170" width="100%" height="100%" aria-hidden="true">
      <rect x="19" y="4" width="16" height="14" rx="3" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" />
      <path
        d="M21 18h12v26c0 6 15 14 15 30v82a10 10 0 0 1-10 10H16a10 10 0 0 1-10-10V74c0-16 15-24 15-30z"
        fill="var(--mint)"
        stroke="var(--ink)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <rect x="12" y="96" width="30" height="34" rx="4" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
    </svg>
  );
}

function Stage({
  view,
  meId,
  isHost,
  busy,
  nick,
  name,
  online,
  offset,
  send,
}: {
  view: BottleView;
  meId: string;
  isHost: boolean;
  busy: boolean;
  nick: (id: string) => string;
  name: (id: string) => string;
  online: (id: string) => boolean;
  offset: number;
  send: (a: Record<string, unknown>) => Promise<void>;
}) {
  const target = view.targetId;
  const iAmTarget = target === meId;

  if (view.phase === 'spin') {
    const mine = view.spinnerId === meId;
    const away = !online(view.spinnerId);
    return (
      <>
        <h1 className="bt-headline" aria-live="polite">
          {view.lastResult
            ? s.play.spunBy(name(view.lastResult.spinnerId), view.lastResult.spinnerId === meId, mine, name(view.spinnerId))
            : mine
              ? s.play.yourTurn
              : s.play.waitSpinner(name(view.spinnerId))}
        </h1>
        <section className="bt-stage">
          {view.lastResult && <LastResult view={view} name={name} />}
          <div className="bt-grow" />
          {mine ? (
            <>
              <p className="bt-hint">{s.play.spinHint}</p>
              <button type="button" className="btn btn-yellow btn-block bt-big" disabled={busy} onClick={() => void send({ type: 'spin' })}>
                {s.play.spin}
              </button>
            </>
          ) : (
            <>
              {away && <p className="bt-hint">{s.play.offline(name(view.spinnerId))}</p>}
              {isHost && (
                <div className="bt-host">
                  <button type="button" className="btn btn-yellow btn-block bt-mid" disabled={busy} onClick={() => void send({ type: 'spin' })}>
                    {s.play.spinFor(name(view.spinnerId))}
                  </button>
                  <button type="button" className="btn btn-ghost btn-block bt-ghost" disabled={busy} onClick={() => void send({ type: 'skipSpinner' })}>
                    {s.play.skipSpinner}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </>
    );
  }

  if (view.phase === 'spinning') {
    return (
      <>
        <h1 className="bt-headline" aria-live="polite">
          {s.play.spinning}
        </h1>
        <section className="bt-stage" />
      </>
    );
  }

  if (!target) return null;
  const targetAway = !online(target);
  const hostSkip = isHost && targetAway && (
    <div className="bt-host">
      <p className="bt-hint">{s.play.targetOffline(name(target))}</p>
      <button type="button" className="btn btn-ghost btn-block bt-ghost" disabled={busy} onClick={() => void send({ type: 'skipTurn' })}>
        {s.play.skipTurn}
      </button>
    </div>
  );

  const headline = (
    <h1 className="bt-headline" aria-live="polite">
      {iAmTarget ? s.play.pointedYou : s.play.pointed(name(target))}
    </h1>
  );

  if (view.phase === 'choose') {
    return (
      <>
        {headline}
        <section className="bt-stage bt-stage-end">
          {iAmTarget ? (
            <>
              <p className="bt-hint bt-hint-2">{s.play.chooseHint}</p>
              <div className="bt-choose">
                {(['truth', 'dare'] as const).map((k) => (
                  <button key={k} type="button" className="bt-choice" data-kind={k} disabled={busy} onClick={() => void send({ type: 'choose', kind: k })}>
                    {s.kind[k]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="bt-hint bt-hint-2">{s.play.choosing(name(target))}</p>
          )}
          {hostSkip}
        </section>
      </>
    );
  }

  const kind = view.kind as PromptKind;
  const noPass = view.passesLeft !== null && view.passesLeft <= 0;
  return (
    <>
      {headline}
      <section className="bt-stage">
        {view.prompt && (
          <article className="bt-card" data-kind={kind} key={view.prompt.id}>
            <span className="bt-card-kind">{s.kind[kind]}</span>
            <p className="bt-card-text">{view.prompt.text}</p>
          </article>
        )}

        <div className="bt-grow" />

        {view.phase === 'task' &&
          (iAmTarget ? (
            <>
              {view.passPenalty && !noPass && <p className="bt-hint">{s.play.passCost}</p>}
              <div className="bt-actions">
                <button type="button" className="btn btn-primary bt-done" disabled={busy} onClick={() => void send({ type: 'done' })}>
                  {s.play.done[kind]}
                </button>
                <button type="button" className="btn btn-light bt-pass" disabled={busy || noPass} onClick={() => void send({ type: 'pass' })}>
                  <span>{s.play.pass}</span>
                  <small>{noPass ? s.play.noPass : s.play.passLeft(view.passesLeft)}</small>
                </button>
              </div>
            </>
          ) : (
            <p className="bt-hint bt-hint-2">{s.play.doing[kind](nick(target))}</p>
          ))}

        {view.phase === 'vote' && view.vote && <Vote view={view} kind={kind} busy={busy} offset={offset} send={send} />}
        {hostSkip}
      </section>
    </>
  );
}

function Vote({
  view,
  kind,
  busy,
  offset,
  send,
}: {
  view: BottleView;
  kind: PromptKind;
  busy: boolean;
  offset: number;
  send: (a: Record<string, unknown>) => Promise<void>;
}) {
  const vote = view.vote!;
  const now = useTick(true);
  const left = Math.max(0, Math.ceil((vote.endsAt - (now + offset)) / 1000));
  const total = vote.voters || 1;
  return (
    <div className="bt-vote">
      <p className="bt-vote-title">{s.play.voteTitle[kind]}</p>
      {vote.canVote ? (
        <div className="bt-actions bt-actions-even">
          {([true, false] as const).map((yes) => (
            <button
              key={String(yes)}
              type="button"
              className={`btn bt-done ${yes ? 'btn-primary' : 'bt-no'}`}
              aria-pressed={vote.myVote === yes}
              data-faded={(vote.myVote !== null && vote.myVote !== yes) || undefined}
              disabled={busy}
              onClick={() => void send({ type: 'vote', yes })}
            >
              {yes ? s.play.yes : s.play.no}
            </button>
          ))}
        </div>
      ) : (
        <p className="bt-hint bt-hint-2">{s.play.voteWait}</p>
      )}
      <div className="bt-progress">
        <div className="bt-progress-bar" aria-hidden="true">
          <span style={{ width: `${Math.round(((vote.yes + vote.no) / total) * 100)}%` }} />
        </div>
        <span>
          {s.play.voted(vote.yes + vote.no, vote.voters)} · {s.play.seconds(left)}
        </span>
      </div>
    </div>
  );
}

function LastResult({ view, name }: { view: BottleView; name: (id: string) => string }) {
  const r = view.lastResult!;
  return (
    <div className="bt-last" data-outcome={r.outcome}>
      <p className="bt-last-head">
        {s.play.last[r.outcome](name(r.targetId))}
        {r.votes && ` (${s.play.votes(r.votes.yes, r.votes.no)})`}
      </p>
      {r.text && (
        <p className="bt-last-text">
          {s.kind[r.kind]}: {r.text}
        </p>
      )}
    </div>
  );
}

function ranked(view: BottleView) {
  return Object.entries(view.scores).sort(([, a], [, b]) => b.points - a.points || b.done - a.done);
}

function Scores({ view, members, meId }: { view: BottleView; members: Map<string, RoomPlayer>; meId: string }) {
  const rows = ranked(view).filter(([id]) => members.has(id) || view.seats.includes(id));
  return (
    <section className="bt-scores">
      <h2 className="bt-legend">{s.play.scores}</h2>
      <ol className="bt-score-list">
        {rows.map(([id, sc], i) => {
          const m = members.get(id);
          return (
            <li key={id} className="bt-score" data-me={id === meId || undefined} data-first={(i === 0 && sc.points > 0) || undefined}>
              {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected} />}
              <span className="bt-score-name">{id === meId ? `${m?.nick ?? '?'} (${s.play.you})` : (m?.nick ?? '?')}</span>
              <span className="bt-score-pts">{sc.points}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Sunucunun podyumda beklediği süre (server/game.ts podiumMs). */
const PODIUM_MS = 8000;

function Podium({ view, members, meId, code }: { view: BottleView; members: Map<string, RoomPlayer>; meId: string; code: string }) {
  const rows = ranked(view).filter(([id]) => members.has(id));
  const [first, second] = rows;
  const rest = rows.slice(2);
  const half = Math.ceil(rest.length / 2);
  const tie = !!first && !!second && second[1].points === first[1].points;
  const nickOf = (id: string) => members.get(id)?.nick ?? '?';
  return (
    <main className="col bt-podium">
      <span className="bt-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="bt-podium-top">
        <span>{s.name}</span>
        <span className="bt-code">{code}</span>
      </div>
      <div className="bt-podium-head">
        <span className="bt-sticker">{s.podium.title}</span>
        <h1 className="bt-podium-title">{!first || tie ? s.podium.tie : s.podium.winner(nickOf(first[0]))}</h1>
      </div>
      {first && (
        <div className="bt-podium-cards">
          <div className="bt-podium-card bt-podium-first" data-me={first[0] === meId || undefined}>
            {!tie && (
              <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
                <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            )}
            <span className="bt-podium-score">{first[1].points}</span>
            <span className="bt-podium-name">{nickOf(first[0])}</span>
            <span className="bt-podium-sub">{s.podium.done(first[1].done)}</span>
          </div>
          {second && (
            <>
              <span className="bt-podium-dash" aria-hidden="true">
                –
              </span>
              <div className="bt-podium-card bt-podium-second" data-me={second[0] === meId || undefined}>
                <span className="bt-podium-score">{second[1].points}</span>
                <span className="bt-podium-name">{nickOf(second[0])}</span>
                <span className="bt-podium-sub">{s.podium.done(second[1].done)}</span>
              </div>
            </>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="bt-rosters">
          {[rest.slice(0, half), rest.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="bt-roster" start={3 + i * half}>
                  {col.map(([id, sc]) => {
                    const m = members.get(id);
                    return (
                      <li key={id} data-me={id === meId || undefined}>
                        {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                        <span className="bt-roster-name">{nickOf(id)}</span>
                        <span className="bt-roster-score">{sc.points}</span>
                      </li>
                    );
                  })}
                </ol>
              ),
          )}
        </div>
      )}
      <div className="bt-grow" />
      <div className="bt-podium-foot">
        <div className="bt-podium-bar" aria-hidden="true">
          <div style={{ animationDuration: `${PODIUM_MS}ms` }} />
        </div>
        <p className="bt-podium-note">
          {s.podium.back} · {s.podium.saved}
        </p>
      </div>
    </main>
  );
}
