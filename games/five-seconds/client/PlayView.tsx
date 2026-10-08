import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { FiveSecondsSettings, FiveSecondsView, Prompt, TeamId } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Members = Map<string, RoomPlayer>;
type Send = (a: unknown) => Promise<void>;

const CATEGORY_LABEL: Record<string, string> = {
  genel: 'Genel',
  ask: 'Aşk ve ilk buluşma',
  'is-okul': 'İş ve okul',
  yemek: 'Yemek',
  turkiye: 'Türkiye',
  'pop-kultur': 'Pop kültür',
  sacma: 'Saçma sapan',
  cesur: 'Cesur',
  arkadas: 'Arkadaş görevi',
};

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Sunucu saatine göre kalan süre; animasyon karesinde güncellenir (halka akıcı dönsün). */
function useRemaining(endsAt: number, serverNow: number, active: boolean): number {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return Math.max(0, endsAt - (now + offset));
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<FiveSecondsView, FiveSecondsSettings>) {
  const members: Members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const isHost = room.hostId === meId;
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: FiveSecondsSettings) => void setSettings(n) };
  const mine = view.performerId === meId;

  return (
    <div className="fs sg">
      <aside className="sg-side sg-left">
        <Scoreboard view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.round(view.round, view.totalRounds)}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.lastResult && view.phase === 'ready' && <LastResult view={view} nick={nick} />}
        {view.phase === 'ready' && <Ready view={view} mine={mine} isHost={isHost} nick={nick} send={send} />}
        {view.phase === 'countdown' && <Countdown view={view} mine={mine} isHost={isHost} nick={nick} send={send} />}
        {view.phase === 'vote' && <Vote view={view} meId={meId} mine={mine} nick={nick} send={send} />}

        {isHost && (
          <div className="fs-host">
            {view.prompt && (
              <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'swap', attemptId: view.attemptId })}>
                {s.play.swap}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skip', attemptId: view.attemptId })}>
              {s.play.skip}
            </button>
          </div>
        )}

        {error && (
          <p className="error-text fs-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Scoreboard view={view} members={members} meId={meId} />
        </div>

        <section className="howto" aria-labelledby="fs-howto">
          <h2 id="fs-howto" className="howto-title">
            {s.howto.title}
          </h2>
          <ol className="howto-list">
            {s.howto.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="howto-n mono">{String(i + 1).padStart(2, '0')}</span>
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

function PromptCard({ prompt, dim = false }: { prompt: Prompt; dim?: boolean }) {
  return (
    <div className="fs-prompt" data-dim={dim || undefined}>
      <span className="fs-prompt-cat">{CATEGORY_LABEL[prompt.category] ?? prompt.category}</span>
      <p className="fs-prompt-text">{prompt.text}</p>
    </div>
  );
}

function Ready({ view, mine, isHost, nick, send }: { view: FiveSecondsView; mine: boolean; isHost: boolean; nick: (id: string) => string; send: Send }) {
  const seconds = Math.round(view.durationMs / 1000);
  const start = () => void send({ type: 'ready', attemptId: view.attemptId });
  return (
    <section className="fs-ready">
      {view.stealFrom && view.prompt ? (
        <>
          <div className="fs-steal">
            <p className="fs-steal-title">{s.play.stealTitle}</p>
            <p className="fs-small dim">{s.play.stealBody(nick(view.stealFrom), nick(view.performerId))}</p>
          </div>
          <PromptCard prompt={view.prompt} dim />
        </>
      ) : (
        <div className="fs-next">
          <p className="fs-next-label">{mine ? s.play.yourTurn : s.play.next}</p>
          {!mine && <p className="fs-next-name">{nick(view.performerId)}</p>}
        </div>
      )}

      {/* Görev açılmadan önce halka dolu ve sakin bekler. */}
      <Ring fraction={1} label={String(seconds)} low={false} />

      {mine ? (
        <>
          <button type="button" className="btn btn-primary btn-block btn-lg fs-go" onClick={start}>
            {s.play.ready}
          </button>
          <p className="dim fs-small fs-center">{s.play.readyHint(seconds)}</p>
        </>
      ) : (
        <>
          <p className="dim fs-small fs-center">{s.play.waiting(nick(view.performerId))}</p>
          {isHost && (
            <button type="button" className="btn btn-outline fs-self-center" onClick={start}>
              {s.play.readyFor(nick(view.performerId))}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Ring({ fraction, label, low, sub }: { fraction: number; label: string; low: boolean; sub?: string }) {
  const R = 92;
  const C = 2 * Math.PI * R;
  return (
    <div className="fs-ring" data-low={low || undefined} role="timer" aria-live="off" aria-label={`${label} ${s.play.seconds}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="fs-ring-track" cx="100" cy="100" r={R} />
        <circle
          className="fs-ring-fill"
          cx="100"
          cy="100"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.max(0, Math.min(1, fraction)))}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <span className="fs-ring-num mono">{label}</span>
      {sub && <span className="fs-ring-sub">{sub}</span>}
    </div>
  );
}

/** Yalnızca görsel yardımcı: söylenen her şey için dokun. Sunucuya gitmez. */
function ThreeCounter({ resetKey }: { resetKey: string }) {
  const [n, setN] = useState(0);
  useEffect(() => setN(0), [resetKey]);
  return (
    <button type="button" className="fs-three" onClick={() => setN((x) => (x >= 3 ? 0 : x + 1))} aria-label={s.play.counterLabel(n)}>
      <span className="fs-three-pips" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="fs-pip" data-on={i < n || undefined}>
            {i + 1}
          </span>
        ))}
      </span>
      <span className="fs-three-label">{s.play.counter}</span>
    </button>
  );
}

function Countdown({ view, mine, isHost, nick, send }: { view: FiveSecondsView; mine: boolean; isHost: boolean; nick: (id: string) => string; send: Send }) {
  const remaining = useRemaining(view.endsAt, view.serverNow, true);
  const secs = Math.ceil(remaining / 1000);
  const low = remaining <= Math.max(2000, view.durationMs * 0.3);
  const lastBuzz = useRef<number | null>(null);

  // Son saniyelerde telefonda kısa titreşim (hareket azaltma açıksa yok).
  useEffect(() => {
    if (!low || secs <= 0 || lastBuzz.current === secs || reducedMotion()) return;
    lastBuzz.current = secs;
    try {
      navigator.vibrate?.(40);
    } catch {
      /* desteklenmiyor */
    }
  }, [low, secs]);

  return (
    <section className="fs-turn">
      <p className="fs-who">
        {view.stealFrom && <span className="fs-steal-tag">{s.play.stealTitle}</span>}
        {s.play.speak(nick(view.performerId))}
      </p>
      {view.prompt && <PromptCard key={view.prompt.id} prompt={view.prompt} />}
      <Ring fraction={remaining / view.durationMs} label={String(secs)} low={low} />
      <ThreeCounter resetKey={`${view.attemptId}:${view.prompt?.id ?? ''}`} />
      {(mine || isHost) && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => void send({ type: 'done', attemptId: view.attemptId })}>
          {s.play.done}
        </button>
      )}
    </section>
  );
}

function Vote({ view, meId, mine, nick, send }: { view: FiveSecondsView; meId: string; mine: boolean; nick: (id: string) => string; send: Send }) {
  const remaining = useRemaining(view.voteEndsAt, view.serverNow, true);
  const total = view.voters.length;
  const count = view.voted.filter((id) => view.voters.includes(id)).length;
  const canVote = !mine && view.order.includes(meId);
  const vote = (success: boolean) => void send({ type: 'vote', attemptId: view.attemptId, success });
  return (
    <section className="fs-turn">
      {view.prompt && <PromptCard prompt={view.prompt} dim />}
      <p className="fs-vote-title">{mine ? s.play.voteWait : s.play.voteTitle(nick(view.performerId))}</p>
      {canVote && (
        <div className="fs-vote">
          <button type="button" className="btn btn-lg fs-yes" aria-pressed={view.myVote === true} onClick={() => vote(true)}>
            {s.play.voteYes}
          </button>
          <button type="button" className="btn btn-lg fs-no" aria-pressed={view.myVote === false} onClick={() => vote(false)}>
            {s.play.voteNo}
          </button>
        </div>
      )}
      <div className="fs-vote-meta">
        <span className="mono">{s.play.voteCount(count, total)}</span>
        <span className="fs-vote-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (remaining / Math.max(1, view.voteMs)) * 100)}%` }} />
        </span>
      </div>
      <p className="dim fs-small fs-center">{view.myVote !== null ? s.play.voteChange : s.play.voteHint}</p>
    </section>
  );
}

function LastResult({ view, nick }: { view: FiveSecondsView; nick: (id: string) => string }) {
  const r = view.lastResult!;
  // Çalma bekleniyorsa sonuç zaten çalma kutusunda anlatılıyor.
  if (view.stealFrom) return null;
  const title = r.skipped
    ? s.play.result.skipped(nick(r.performerId))
    : r.success
      ? r.steal
        ? s.play.result.stolen(nick(r.performerId))
        : s.play.result.success(nick(r.performerId))
      : s.play.result.fail(nick(r.performerId));
  return (
    <div className="fs-last" data-ok={r.success || undefined}>
      <p className="fs-last-head">
        <span>{title}</span>
        {r.success && <span className="fs-last-pts mono">+1</span>}
      </p>
      {r.prompt && <p className="fs-small dim">{r.prompt}</p>}
      {!r.skipped && <p className="fs-small mono dim">{s.play.votes(r.yes, r.no)}</p>}
    </div>
  );
}

function ranking(view: FiveSecondsView): string[] {
  return [...view.order].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0));
}

function PlayerRow({ id, view, members, meId, rank }: { id: string; view: FiveSecondsView; members: Members; meId: string; rank?: number }) {
  const m = members.get(id);
  if (!m) return null;
  const active = view.phase !== 'podium' && view.performerId === id;
  return (
    <li className="sg-score fs-row" data-me={id === meId || undefined} data-active={active || undefined}>
      {rank !== undefined && <span className="fs-rank mono">{rank}</span>}
      <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />
      <span className="sg-score-name">{m.nick}</span>
      <span className="sg-score-pts mono">{view.scores[id] ?? 0}</span>
    </li>
  );
}

function Scoreboard({ view, members, meId }: { view: FiveSecondsView; members: Members; meId: string }) {
  if (view.teamMode && view.teams && view.teamScores) {
    return (
      <section className="fs-board">
        {(['a', 'b'] as TeamId[]).map((t) => (
          <div key={t} className="fs-team" data-team={t}>
            <h2 className="fs-team-head">
              <span>{s.team[t]}</span>
              <span className="mono">{view.teamScores![t]}</span>
            </h2>
            <ul className="sg-score-list">
              {view.teams![t].map((id) => (
                <PlayerRow key={id} id={id} view={view} members={members} meId={meId} />
              ))}
            </ul>
          </div>
        ))}
      </section>
    );
  }
  const ranked = ranking(view);
  return (
    <section className="fs-board">
      <h2 className="fs-board-head">{s.play.scoreboard}</h2>
      <ul className="sg-score-list">
        {ranked.map((id) => (
          <PlayerRow key={id} id={id} view={view} members={members} meId={meId} rank={1 + ranked.findIndex((x) => (view.scores[x] ?? 0) === (view.scores[id] ?? 0))} />
        ))}
      </ul>
    </section>
  );
}

function Podium({ view, members, meId }: { view: FiveSecondsView; members: Members; meId: string }) {
  const ranked = ranking(view);
  const top = ranked.slice(0, 3);
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  const ts = view.teamScores;
  const winnerTeam: TeamId | null = ts ? (ts.a === ts.b ? null : ts.a > ts.b ? 'a' : 'b') : null;
  return (
    <main className="col podium fs-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <h1 className="fs-podium-title">{s.podium.title}</h1>
      {ts && (
        <div className="podium-winner">
          <p className="podium-name" data-team={winnerTeam ?? 'none'}>
            {winnerTeam ? s.podium.winnerTeam(s.team[winnerTeam]) : s.podium.draw}
          </p>
          <p className="podium-score mono">
            {ts.a} – {ts.b}
          </p>
        </div>
      )}
      <ol className="fs-steps">
        {top.map((id, i) => {
          const m = members.get(id);
          return (
            <li key={id} className="fs-step" data-place={i + 1} data-me={id === meId || undefined}>
              {m && <Avatar avatar={m.avatar} nick={m.nick} size={i === 0 ? 56 : 44} />}
              <span className="fs-step-name">{nick(id)}</span>
              <span className="fs-step-pts mono">
                {view.scores[id] ?? 0} {s.play.points}
              </span>
              <span className="fs-step-block mono" aria-hidden="true">
                {s.podium.place(i + 1)}
              </span>
            </li>
          );
        })}
      </ol>
      <Scoreboard view={view} members={members} meId={meId} />
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
