import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { Card, TabooSettings, TabooView, TeamId } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

function useRemaining(view: TabooView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, view.endsAt - (now + offset));
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<TabooView, TabooSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const isHost = room.hostId === meId;
  const remaining = useRemaining(view);
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: TabooSettings) => void setSettings(n) };

  return (
    <div className="tb sg">
      <aside className="sg-side sg-left">
        <Rosters view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.turn(view.turnNumber, view.totalTurns)}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Scores view={view} />

        {view.phase === 'ready' ? (
          <Ready view={view} meId={meId} isHost={isHost} nick={nick} send={send} />
        ) : (
          <Turn view={view} remaining={remaining} nick={nick} send={send} />
        )}
        {error && (
          <p className="error-text tb-error" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Rosters view={view} members={members} meId={meId} />
        </div>

        <section className="howto" aria-labelledby="tb-howto">
          <h2 id="tb-howto" className="howto-title">
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

function Scores({ view }: { view: TabooView }) {
  return (
    <div className="tb-scores">
      {(['a', 'b'] as TeamId[]).map((t) => (
        <div key={t} className="tb-score" data-team={t} data-active={view.team === t || undefined} data-mine={view.myTeam === t || undefined}>
          <span className="tb-score-name">
            {s.team[t]}
            {view.myTeam === t && <span className="dim"> ({s.play.you})</span>}
          </span>
          <span className="tb-score-pts mono">{view.scores[t]}</span>
        </div>
      ))}
    </div>
  );
}

function Ready({
  view,
  meId,
  isHost,
  nick,
  send,
}: {
  view: TabooView;
  meId: string;
  isHost: boolean;
  nick: (id: string) => string;
  send: (a: unknown) => Promise<void>;
}) {
  const mine = view.narratorId === meId;
  return (
    <section className="tb-ready">
      {view.lastTurn && (
        <div className="tb-last card">
          <p className="tb-last-head">
            <span>{s.play.lastTurn(s.team[view.lastTurn.team], view.lastTurn.points)}</span>
            <span className="dim">{nick(view.lastTurn.narratorId)}</span>
          </p>
          {view.lastTurn.cards.length === 0 ? (
            <p className="dim tb-small">{s.play.noCards}</p>
          ) : (
            <ol className="tb-last-list">
              {view.lastTurn.cards.map((c, i) => (
                <li key={i} data-result={c.result}>
                  <Icon name={c.result === 'correct' ? 'check' : c.result === 'taboo' ? 'x' : 'skip'} size={14} />
                  <span className="tb-last-word">{c.word}</span>
                  <span className="dim tb-last-taboo">{c.taboo.join(', ')}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="tb-next">
        <span className="eyebrow">{s.play.next}</span>
        <p className="tb-next-name" data-team={view.team}>
          {nick(view.narratorId)}
        </p>
        <p className="dim tb-small">{s.team[view.team]}</p>
      </div>

      {mine ? (
        <>
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'start' })}>
            {s.play.startMine}
          </button>
          <p className="dim tb-small tb-center">{s.play.startMineHint}</p>
        </>
      ) : (
        <>
          <p className="dim tb-small tb-center">{s.play.waitNarrator(nick(view.narratorId))}</p>
          {isHost && (
            <div className="tb-host">
              <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'start' })}>
                {s.play.startForThem(nick(view.narratorId))}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skipNarrator' })}>
                {s.play.skipNarrator}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Turn({
  view,
  remaining,
  nick,
  send,
}: {
  view: TabooView;
  remaining: number;
  nick: (id: string) => string;
  send: (a: unknown) => Promise<void>;
}) {
  const secs = Math.ceil(remaining / 1000);
  const card = view.card;
  return (
    <section className="tb-turn" data-role={view.role}>
      <div className="tb-timer">
        <span className="tb-timer-num mono" data-low={remaining < 10_000 || undefined}>
          {secs}
        </span>
        <span className="tb-timer-bar" aria-hidden="true">
          <span style={{ width: `${(remaining / view.durationMs) * 100}%` }} />
        </span>
      </div>

      <p className="tb-who">
        <b data-team={view.team}>{nick(view.narratorId)}</b> {s.play.narrating}
      </p>

      {card ? (
        <CardView card={card} flash={view.flash} />
      ) : view.role === 'guesser' ? (
        <div className="tb-guess card">
          <p className="tb-guess-title">{s.play.guess(nick(view.narratorId))}</p>
          <p className="dim tb-small">{s.play.guessHint}</p>
          <p className="tb-guess-count mono">{view.turnStats.correct}</p>
          {view.flash && (
            <p key={view.flash.id} className="tb-flash-text" data-kind={view.flash.kind}>
              {s.play.flash[view.flash.kind]}
            </p>
          )}
        </div>
      ) : (
        <p className="dim tb-center">{s.play.spectator}</p>
      )}

      {view.role === 'narrator' && card && (
        <div className="tb-actions">
          <button type="button" className="btn btn-primary btn-lg tb-correct" onClick={() => void send({ type: 'correct', cardId: card.id })}>
            <Icon name="check" size={18} />
            {s.play.correct}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-lg"
            disabled={view.passesLeft !== null && view.passesLeft <= 0}
            onClick={() => void send({ type: 'pass', cardId: card.id })}
          >
            <Icon name="skip" size={14} />
            {s.play.pass(view.passesLeft)}
          </button>
          {view.canUndo && (
            <button type="button" className="btn btn-ghost tb-undo" onClick={() => void send({ type: 'undo' })}>
              {s.play.undo}
            </button>
          )}
          <p className="dim tb-small tb-center tb-span">{s.play.narratorNote}</p>
        </div>
      )}

      {view.role === 'watcher' && card && (
        <div className="tb-actions">
          <button type="button" className="btn btn-lg tb-taboo-btn tb-span" onClick={() => void send({ type: 'taboo', cardId: card.id })}>
            {s.play.taboo}
          </button>
          <p className="dim tb-small tb-center tb-span">{s.play.tabooHint}</p>
        </div>
      )}

      <dl className="tb-stats">
        {(['correct', 'pass', 'taboo'] as const).map((k) => (
          <div key={k} data-kind={k}>
            <dt>{s.play.stats[k]}</dt>
            <dd className="mono">{view.turnStats[k]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CardView({ card, flash }: { card: Card; flash: TabooView['flash'] }) {
  return (
    <div className="tb-card" key={card.id}>
      {flash && (
        <span key={flash.id} className="tb-flash" data-kind={flash.kind}>
          {s.play.flash[flash.kind]}
        </span>
      )}
      <p className="tb-word">{card.word}</p>
      <ul className="tb-taboo">
        {card.taboo.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

function Rosters({ view, members, meId }: { view: TabooView; members: Map<string, RoomPlayer>; meId: string }) {
  return (
    <section className="tb-rosters">
      {(['a', 'b'] as TeamId[]).map((t) => (
        <div key={t} className="tb-roster" data-team={t}>
          <h2 className="eyebrow">
            {s.team[t]} <span className="mono">{view.scores[t]}</span>
          </h2>
          <ul className="sg-score-list">
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              return (
                <li key={id} className="sg-score" data-me={id === meId || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />
                  <span className="sg-score-name">{m.nick}</span>
                  {view.narratorId === id && view.team === t && <span className="tag tag-ready">{s.play.narrating}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Podium({ view, members, meId }: { view: TabooView; members: Map<string, RoomPlayer>; meId: string }) {
  const { a, b } = view.scores;
  const winner: TeamId | null = a === b ? null : a > b ? 'a' : 'b';
  return (
    <main className="col podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="eyebrow podium-kicker">{s.podium.title}</p>
      <div className="podium-winner">
        <h1 className="podium-name" data-team={winner ?? 'none'}>
          {winner ? s.podium.winner(s.team[winner]) : s.podium.draw}
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
