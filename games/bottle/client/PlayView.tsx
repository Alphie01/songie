import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
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

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: BottleSettings) => void setSettings(n) };

  return (
    <div className="bt sg">
      <aside className="sg-side sg-left">
        <Scores view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.round(view.turnNumber, view.totalRounds)}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Table view={view} members={members} meId={meId} offset={offset} />

        <Stage view={view} meId={meId} isHost={isHost} busy={busy} nick={nick} name={name} online={online} offset={offset} send={send} />

        {error && (
          <p className="error-text bt-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Scores view={view} members={members} meId={meId} />
        </div>

        <section className="howto" aria-labelledby="bt-howto">
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
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>
    </div>
  );
}

function Table({ view, members, meId, offset }: { view: BottleView; members: Map<string, RoomPlayer>; meId: string; offset: number }) {
  const bottle = useBottle(view, offset);
  const n = view.seats.length;
  return (
    <div className="bt-table" data-n={n > 10 ? 'many' : 'few'} data-phase={view.phase}>
      <div className="bt-felt" aria-hidden="true" />
      <ul className="bt-seats">
        {view.seats.map((id, i) => {
          const a = (seatAngle(i, n) * Math.PI) / 180;
          const p = members.get(id);
          const isTarget = view.targetId === id;
          return (
            <li
              key={id}
              className="bt-seat"
              style={{ left: `${50 + 41 * Math.sin(a)}%`, top: `${50 - 41 * Math.cos(a)}%` }}
              data-target={isTarget || undefined}
              data-spinner={view.spinnerId === id || undefined}
              data-me={id === meId || undefined}
              data-off={!p?.connected || undefined}
            >
              <span className="bt-seat-ring">
                {p ? <Avatar avatar={p.avatar} nick={p.nick} size={36} dim={!p.connected} /> : <span className="bt-seat-empty" />}
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
    <svg viewBox="0 0 60 200" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="bt-glass" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0d5a2f" />
          <stop offset="0.45" stopColor="#19df70" stopOpacity="0.85" />
          <stop offset="1" stopColor="#0a3d20" />
        </linearGradient>
      </defs>
      <path
        d="M24 6h12v4h-1v40c0 10 17 18 17 34v100c0 6-4 10-10 10H18c-6 0-10-4-10-10V84c0-16 17-24 17-34V10h-1z"
        fill="url(#bt-glass)"
        stroke="rgb(255 255 255 / 0.35)"
        strokeWidth="1.5"
      />
      <rect x="22" y="1" width="16" height="10" rx="2.5" fill="#ffd234" />
      <rect x="12" y="112" width="36" height="42" rx="4" fill="#04160b" opacity="0.55" />
      <path d="M15 92v84" stroke="rgb(255 255 255 / 0.45)" strokeWidth="3" strokeLinecap="round" />
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
      <section className="bt-stage">
        {view.lastResult && <LastResult view={view} name={name} />}
        {mine ? (
          <>
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={() => void send({ type: 'spin' })}>
              <Icon name="shuffle" size={18} />
              {s.play.spin}
            </button>
            <p className="dim bt-small bt-center">{s.play.spinHint}</p>
          </>
        ) : (
          <>
            <p className="bt-status">{away ? s.play.offline(name(view.spinnerId)) : s.play.waitSpinner(name(view.spinnerId))}</p>
            {isHost && (
              <div className="bt-host">
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => void send({ type: 'spin' })}>
                  {s.play.spinFor(name(view.spinnerId))}
                </button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void send({ type: 'skipSpinner' })}>
                  {s.play.skipSpinner}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    );
  }

  if (view.phase === 'spinning') {
    return (
      <section className="bt-stage">
        <p className="bt-status bt-status-spin" aria-live="polite">
          {s.play.spinning}
        </p>
      </section>
    );
  }

  if (!target) return null;
  const targetAway = !online(target);
  const hostSkip = isHost && targetAway && (
    <div className="bt-host">
      <p className="dim bt-small">{s.play.targetOffline(name(target))}</p>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void send({ type: 'skipTurn' })}>
        {s.play.skipTurn}
      </button>
    </div>
  );

  const headline = (
    <p className="bt-pointed" aria-live="polite">
      {iAmTarget ? s.play.pointedYou : s.play.pointed(name(target))}
    </p>
  );

  if (view.phase === 'choose') {
    return (
      <section className="bt-stage">
        {headline}
        {iAmTarget ? (
          <>
            <div className="bt-choose">
              {(['truth', 'dare'] as const).map((k) => (
                <button key={k} type="button" className="bt-choice" data-kind={k} disabled={busy} onClick={() => void send({ type: 'choose', kind: k })}>
                  {s.kind[k]}
                </button>
              ))}
            </div>
            <p className="dim bt-small bt-center">{s.play.chooseHint}</p>
          </>
        ) : (
          <p className="bt-status">{s.play.choosing(name(target))}</p>
        )}
        {hostSkip}
      </section>
    );
  }

  const kind = view.kind as PromptKind;
  return (
    <section className="bt-stage">
      {headline}
      {view.prompt && (
        <article className="bt-card" data-kind={kind} key={view.prompt.id}>
          <span className="bt-card-kind">{s.kind[kind]}</span>
          <p className="bt-card-text">{view.prompt.text}</p>
        </article>
      )}

      {view.phase === 'task' &&
        (iAmTarget ? (
          <div className="bt-actions">
            <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => void send({ type: 'done' })}>
              <Icon name="check" size={18} />
              {s.play.done[kind]}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-lg"
              disabled={busy || (view.passesLeft !== null && view.passesLeft <= 0)}
              onClick={() => void send({ type: 'pass' })}
            >
              <Icon name="skip" size={14} />
              {view.passesLeft !== null && view.passesLeft <= 0 ? s.play.noPass : s.play.pass(view.passesLeft)}
            </button>
            {view.passPenalty && <p className="dim bt-small bt-center bt-span">{s.play.passCost}</p>}
          </div>
        ) : (
          <p className="bt-status">{s.play.doing[kind](nick(target))}</p>
        ))}

      {view.phase === 'vote' && view.vote && <Vote view={view} kind={kind} busy={busy} offset={offset} send={send} />}
      {hostSkip}
    </section>
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
  return (
    <div className="bt-vote">
      <p className="bt-vote-title">{s.play.voteTitle[kind]}</p>
      {vote.canVote ? (
        <div className="bt-actions">
          {([true, false] as const).map((yes) => (
            <button
              key={String(yes)}
              type="button"
              className={`btn btn-lg ${yes ? 'btn-primary' : 'btn-outline'}`}
              aria-pressed={vote.myVote === yes}
              disabled={busy}
              onClick={() => void send({ type: 'vote', yes })}
            >
              {yes ? <Icon name="check" size={16} /> : <Icon name="x" size={16} />}
              {yes ? s.play.yes : s.play.no}
            </button>
          ))}
        </div>
      ) : (
        <p className="dim bt-small bt-center">{s.play.voteWait}</p>
      )}
      <p className="mono dim bt-small bt-center">
        {s.play.voted(vote.yes + vote.no, vote.voters)}, {s.play.seconds(left)}
      </p>
    </div>
  );
}

function LastResult({ view, name }: { view: BottleView; name: (id: string) => string }) {
  const r = view.lastResult!;
  return (
    <div className="bt-last" data-outcome={r.outcome}>
      <p className="bt-last-head">
        {s.play.last[r.outcome](name(r.targetId))}
        {r.votes && <span className="dim"> ({s.play.votes(r.votes.yes, r.votes.no)})</span>}
      </p>
      {r.text && (
        <p className="bt-last-text">
          <span data-kind={r.kind}>{s.kind[r.kind]}:</span> {r.text}
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
    <section className="sg-scores">
      <h2 className="bt-legend">{s.play.scores}</h2>
      <ul className="sg-score-list">
        {rows.map(([id, sc], i) => {
          const m = members.get(id);
          return (
            <li key={id} className="sg-score" data-me={id === meId || undefined} data-first={(i === 0 && sc.points > 0) || undefined}>
              {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />}
              <span className="sg-score-name">{m?.nick ?? '?'}</span>
              <span className="sg-score-pts mono">{sc.points}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Podium({ view, members, meId }: { view: BottleView; members: Map<string, RoomPlayer>; meId: string }) {
  const rows = ranked(view).filter(([id]) => members.has(id));
  const top = rows[0];
  const tie = rows.length > 1 && rows[1]![1].points === top?.[1].points;
  return (
    <main className="col podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="podium-kicker bt-legend">{s.podium.title}</p>
      <div className="podium-winner">
        <h1 className="podium-name">{!top || tie ? s.podium.tie : s.podium.winner(members.get(top[0])?.nick ?? '?')}</h1>
        {top && <p className="podium-score mono">{s.play.points(top[1].points)}</p>}
      </div>
      <ol className="sg-score-list">
        {rows.map(([id, sc], i) => {
          const m = members.get(id);
          return (
            <li key={id} className="sg-score" data-me={id === meId || undefined} data-first={i === 0 || undefined}>
              <span className="mono dim">{i + 1}</span>
              {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} />}
              <span className="sg-score-name">{m?.nick ?? '?'}</span>
              <span className="dim bt-small">{s.play.doneCount(sc.done)}</span>
              <span className="sg-score-pts mono">{sc.points}</span>
            </li>
          );
        })}
      </ol>
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
