import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { ParanoiaSettings, ParanoiaView, RevealedEntry } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (action: unknown) => Promise<boolean>;
type Who = { nick: (id: string) => string; player: (id: string) => RoomPlayer };

/** Sunucu saatine göre şimdiki an (istemci saat farkı düzeltilmiş). */
function useServerNow(serverNow: number): number {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return now + offset;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<ParanoiaView, ParanoiaSettings>) {
  const isHost = room.hostId === meId;
  const now = useServerNow(view.serverNow);
  const [error, setError] = useState<string | null>(null);

  const who: Who = useMemo(() => {
    const members = new Map(room.players.map((p) => [p.id, p]));
    const nick = (id: string) => members.get(id)?.nick ?? view.names[id] ?? '?';
    return {
      nick,
      player: (id: string) =>
        members.get(id) ?? { id, nick: nick(id), avatar: { shape: 'circle', color: 'paper' }, connected: false, ready: false },
    };
  }, [room.players, view.names]);

  const send: Send = async (action) => {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
    return res.ok;
  };

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: ParanoiaSettings) => void setSettings(n) };
  const roster = <Roster view={view} meId={meId} who={who} />;

  return (
    <div className="pr sg">
      <aside className="sg-side sg-left">{roster}</aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">
            {view.phase === 'reveal' || view.phase === 'summary'
              ? s.play.progress(view.revealed.length, view.revealTotal)
              : s.play.progress(view.answered, view.total)}
          </span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.phase === 'pickFirst' && <PickFirst view={view} isHost={isHost} who={who} send={send} />}
        {view.phase === 'asking' &&
          (view.myTurn ? (
            <MyTurn key={view.seq} view={view} now={now} settings={settings} who={who} send={send} />
          ) : (
            <Waiting view={view} now={now} isHost={isHost} who={who} send={send} />
          ))}
        {view.phase === 'reveal' && <Reveal view={view} meId={meId} isHost={isHost} settings={settings} who={who} send={send} />}
        {view.phase === 'summary' && <Summary view={view} now={now} isHost={isHost} who={who} send={send} />}

        {error && (
          <p className="error-text pr-error" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">{roster}</div>

        <section className="howto" aria-labelledby="pr-howto">
          <h2 id="pr-howto" className="howto-title">
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

/* ---------- Ortak parçalar ---------- */

function Roster({ view, meId, who }: { view: ParanoiaView; meId: string; who: Who }) {
  const picked = new Map(view.stats.map((x) => [x.playerId, x.picked]));
  return (
    <section className="pr-roster" aria-labelledby="pr-roster-title">
      <h2 id="pr-roster-title" className="pr-h">
        {s.play.players}
      </h2>
      <ul className="sg-score-list">
        {view.players.map((id) => {
          const p = who.player(id);
          return (
            <li key={id} className="sg-score" data-me={id === meId || undefined}>
              <Avatar avatar={p.avatar} nick={p.nick} size={26} dim={!p.connected} />
              <span className="sg-score-name">
                {p.nick}
                {id === meId && <span className="dim"> ({s.you})</span>}
              </span>
              {view.phase === 'asking' && view.holderId === id && id !== meId && <span className="pr-tag">{s.play.thinking}</span>}
              {view.phase === 'summary' && <span className="sg-score-pts mono">{picked.get(id) ?? 0}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="pr-progress" role="img" aria-label={s.play.progress(done, total)}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} data-done={i < done || undefined} data-now={i === done || undefined} />
      ))}
    </div>
  );
}

function Countdown({ endsAt, now, durationMs }: { endsAt: number | null; now: number; durationMs: number }) {
  if (endsAt === null) return null;
  const left = Math.max(0, endsAt - now);
  const secs = Math.ceil(left / 1000);
  return (
    <div className="pr-timer" data-low={left < 8000 || undefined}>
      <span className="pr-timer-bar" aria-hidden="true">
        <span style={{ width: `${durationMs ? (left / durationMs) * 100 : 0}%` }} />
      </span>
      <span className="pr-timer-num mono" aria-live="off">
        {s.play.secondsLeft(secs)}
      </span>
    </div>
  );
}

/** Oyuncu seçici: avatar satırları; seçilemeyenler sönük. */
function PlayerPicker({
  ids,
  choices,
  selected,
  onSelect,
  who,
}: {
  ids: string[];
  choices: string[];
  selected: string | null;
  onSelect: (id: string) => void;
  who: Who;
}) {
  return (
    <ul className="pr-picker" role="radiogroup">
      {ids.map((id) => {
        const p = who.player(id);
        const ok = choices.includes(id);
        return (
          <li key={id}>
            <button
              type="button"
              role="radio"
              className="pr-pick"
              aria-checked={selected === id}
              disabled={!ok}
              onClick={() => onSelect(id)}
            >
              <Avatar avatar={p.avatar} nick={p.nick} size={30} dim={!p.connected} />
              <span className="pr-pick-name">{p.nick}</span>
              <span className="pr-pick-dot" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- İlk seçim ---------- */

function PickFirst({ view, isHost, who, send }: { view: ParanoiaView; isHost: boolean; who: Who; send: Send }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!isHost) {
    return (
      <section className="pr-wait">
        <Progress done={0} total={view.total} />
        <p className="pr-wait-title">{s.play.pickFirstWait}</p>
      </section>
    );
  }
  return (
    <section className="pr-turn">
      <div className="pr-pick-head">
        <h2 className="pr-pick-title">{s.play.pickFirstTitle}</h2>
        <p className="dim pr-small">{s.play.pickFirstHint}</p>
      </div>
      <PlayerPicker ids={view.choices} choices={view.choices} selected={selected} onSelect={setSelected} who={who} />
      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={!selected}
        onClick={() => selected && void send({ type: 'pickFirst', targetId: selected })}
      >
        {s.play.pickFirstConfirm}
      </button>
    </section>
  );
}

/* ---------- Sıra sende: gizli soru kartı ---------- */

function MyTurn({ view, now, settings, who, send }: { view: ParanoiaView; now: number; settings: ParanoiaSettings; who: Who; send: Send }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    const ok = await send({ type: 'choose', seq: view.seq, targetId: selected });
    if (!ok) setBusy(false);
  }

  return (
    <section className="pr-turn">
      <article className="pr-secret" aria-labelledby="pr-secret-q">
        <header className="pr-secret-top">
          <span className="pr-secret-who">{s.play.yourTurn}</span>
          <span className="mono pr-secret-n">{s.play.revealHead(view.answered + 1, view.total)}</span>
        </header>
        <p id="pr-secret-q" className="pr-secret-q">
          {view.question}
        </p>
        <p className="pr-secret-note">
          <LockGlyph />
          {s.play.secretNote}
        </p>
      </article>

      <Countdown endsAt={view.endsAt} now={now} durationMs={view.durationMs} />

      <div className="pr-pick-head">
        <h2 className="pr-pick-title">{s.play.pickTitle}</h2>
        <p className="dim pr-small">{s.play.pickHint(settings.allowSelf, settings.noReturn)}</p>
      </div>
      <PlayerPicker ids={view.players} choices={view.choices} selected={selected} onSelect={setSelected} who={who} />

      <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!selected || busy} onClick={() => void confirm()}>
        {busy ? s.play.sending : selected ? s.play.confirmPick(who.nick(selected)) : s.play.confirm}
      </button>
      {view.endsAt !== null && (
        <p className="dim pr-small pr-center">{settings.onTimeout === 'pass' ? s.play.timeoutPass : s.play.timeoutRandom}</p>
      )}
      <Mine view={view} who={who} />
    </section>
  );
}

function LockGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

/* ---------- Bekleme ---------- */

function Waiting({ view, now, isHost, who, send }: { view: ParanoiaView; now: number; isHost: boolean; who: Who; send: Send }) {
  return (
    <section className="pr-wait">
      <Progress done={view.answered} total={view.total} />
      <div className="pr-wait-card" aria-live="polite">
        <span className="pr-envelope" aria-hidden="true">
          <span />
        </span>
        <p className="pr-wait-title">{view.holderId ? s.play.waitHolder(who.nick(view.holderId)) : s.play.waitHidden}</p>
        <p className="dim pr-small">{s.play.waitHint}</p>
        {view.pulse > 0 && (
          <p key={view.pulse} className="pr-pulse">
            {s.play.answeredFlash}
          </p>
        )}
      </div>
      <Countdown endsAt={view.endsAt} now={now} durationMs={view.durationMs} />

      {isHost && view.holderOffline && (
        <div className="pr-stuck" role="status">
          <p className="pr-stuck-title">{s.play.stuckTitle}</p>
          <p className="dim pr-small">{s.play.stuckHint}</p>
          <div className="pr-stuck-actions">
            <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'skip', seq: view.seq, mode: 'random' })}>
              {s.play.skipRandom}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skip', seq: view.seq, mode: 'reassign' })}>
              {s.play.skipReassign}
            </button>
          </div>
        </div>
      )}
      <Mine view={view} who={who} />
    </section>
  );
}

function Mine({ view, who }: { view: ParanoiaView; who: Who }) {
  if (!view.mine.length) return null;
  return (
    <section className="pr-mine" aria-labelledby="pr-mine-title">
      <h2 id="pr-mine-title" className="pr-h">
        {s.play.mine}
      </h2>
      <ul>
        {view.mine.map((m, i) => (
          <li key={i}>
            <span className="pr-mine-q">{m.question}</span>
            <span className="pr-mine-a">{m.answerId ? who.nick(m.answerId) : s.play.passed}</span>
          </li>
        ))}
      </ul>
      <p className="sgs-hint">{s.play.mineHint}</p>
    </section>
  );
}

/* ---------- Açıklama: sahne ---------- */

const STAGE_MS = 2900;

function Reveal({
  view,
  meId,
  isHost,
  settings,
  who,
  send,
}: {
  view: ParanoiaView;
  meId: string;
  isHost: boolean;
  settings: ParanoiaSettings;
  who: Who;
  send: Send;
}) {
  const current = view.revealed.at(-1)!;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setReady(true);
      return;
    }
    setReady(false);
    const t = setTimeout(() => setReady(true), STAGE_MS);
    return () => clearTimeout(t);
  }, [current.n]);

  const isLast = view.revealed.length >= view.revealTotal;
  const vote = settings.revealBy === 'vote' && !isHost;
  const history = view.revealed.slice(0, -1).reverse();

  return (
    <section className="pr-reveal">
      <Stage key={current.n} entry={current} total={view.revealTotal} meId={meId} who={who} />

      {isHost ? (
        <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!ready} onClick={() => void send({ type: 'next', shown: view.revealed.length })}>
          {isLast ? s.play.last : s.play.next}
          {settings.revealBy === 'vote' && view.votes > 0 && <span className="mono pr-votes"> {view.votes}/{view.votesNeeded}</span>}
        </button>
      ) : vote ? (
        <button
          type="button"
          className="btn btn-outline btn-lg btn-block"
          disabled={!ready || view.myVote}
          onClick={() => void send({ type: 'next', shown: view.revealed.length })}
        >
          {view.myVote ? s.play.voted(view.votes, view.votesNeeded) : s.play.vote(view.votes, view.votesNeeded)}
        </button>
      ) : (
        <p className="dim pr-small pr-center">{s.play.hostWillOpen}</p>
      )}

      {history.length > 0 && (
        <section className="pr-history" aria-labelledby="pr-history-title">
          <h2 id="pr-history-title" className="pr-h">
            {s.play.history}
          </h2>
          <EntryList entries={history} who={who} />
        </section>
      )}
    </section>
  );
}

function Stage({ entry, total, meId, who }: { entry: RevealedEntry; total: number; meId: string; who: Who }) {
  const asked = who.player(entry.askedId);
  const answer = entry.answerId ? who.player(entry.answerId) : null;
  const note = s.play.how[entry.how];
  return (
    <article className="pr-stage" aria-live="polite">
      <p className="pr-stage-n mono">{s.play.revealHead(entry.n, total)}</p>
      <p className="pr-stage-q">{entry.question}</p>
      <div className="pr-stage-to">
        <Avatar avatar={asked.avatar} nick={asked.nick} size={26} />
        <span>{s.play.askedTo(asked.nick)}</span>
      </div>
      <div className="pr-stage-ans" data-none={!answer || undefined}>
        <span className="pr-stage-ans-label">{s.play.answerOf(asked.nick)}</span>
        {answer ? (
          <span className="pr-stage-ans-name">
            <Avatar avatar={answer.avatar} nick={answer.nick} size={40} />
            {answer.nick}
            {entry.answerId === meId && <span className="pr-stage-you">({s.you})</span>}
          </span>
        ) : (
          <span className="pr-stage-ans-name">{s.play.noAnswer}</span>
        )}
        {note && <span className="dim pr-small">{note}</span>}
      </div>
    </article>
  );
}

function EntryList({ entries, who }: { entries: RevealedEntry[]; who: Who }) {
  return (
    <ol className="pr-entries">
      {entries.map((e) => (
        <li key={e.n}>
          <span className="pr-entry-n mono">{e.n}</span>
          <div>
            <p className="pr-entry-q">{e.question}</p>
            <p className="pr-entry-meta">
              <span className="dim">{s.play.askedTo(who.nick(e.askedId))}</span>
              <b>{e.answerId ? who.nick(e.answerId) : s.play.noAnswer}</b>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Özet ---------- */

function Summary({ view, now, isHost, who, send }: { view: ParanoiaView; now: number; isHost: boolean; who: Who; send: Send }) {
  const max = Math.max(1, ...view.stats.map((x) => x.picked));
  const secs = Math.max(0, Math.ceil((view.closesAt - now) / 1000));
  return (
    <section className="pr-summary">
      <h1 className="pr-summary-title">{s.play.summaryTitle}</h1>

      <section aria-labelledby="pr-stats-title" className="pr-stats">
        <h2 id="pr-stats-title" className="pr-h">
          {s.play.statsTitle}
        </h2>
        <ul>
          {view.stats.map((x, i) => {
            const p = who.player(x.playerId);
            return (
              <li key={x.playerId} data-top={(i === 0 && x.picked > 0) || undefined}>
                <Avatar avatar={p.avatar} nick={p.nick} size={26} />
                <span className="pr-stat-name">{p.nick}</span>
                <span className="pr-stat-bar" aria-hidden="true">
                  <span style={{ width: `${(x.picked / max) * 100}%` }} />
                </span>
                <span className="pr-stat-n mono">{s.play.times(x.picked)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {isHost ? (
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void send({ type: 'finish' })}>
          {s.play.finish}
        </button>
      ) : (
        <p className="dim pr-small pr-center">{s.play.waitHostFinish}</p>
      )}
      <p className="dim pr-small pr-center">{s.play.closes(secs)}</p>

      {view.revealed.length > 0 && (
        <section aria-labelledby="pr-all-title" className="pr-history">
          <h2 id="pr-all-title" className="pr-h">
            {s.play.allTitle}
          </h2>
          <EntryList entries={view.revealed} who={who} />
        </section>
      )}
    </section>
  );
}
