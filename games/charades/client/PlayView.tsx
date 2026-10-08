import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { Card, CardResult, CharadesSettings, CharadesView, TeamId } from '../shared/index.js';
import { KindIcon } from './KindIcon';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

function useRemaining(view: CharadesView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, view.endsAt - (now + offset));
}

const RESULT_ICON: Record<CardResult, 'check' | 'skip' | 'x'> = { correct: 'check', pass: 'skip', foul: 'x' };

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<CharadesView, CharadesSettings>) {
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

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} nick={nick} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: CharadesSettings) => void setSettings(n) };

  return (
    <div className="ch sg">
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
          <p className="error-text ch-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Rosters view={view} members={members} meId={meId} />
        </div>

        <HowTo />
      </main>

      <aside className="sg-side sg-right">
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>
    </div>
  );
}

function HowTo() {
  return (
    <section className="howto" aria-labelledby="ch-howto">
      <h2 id="ch-howto" className="howto-title">
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
      <h3 className="ch-signs-title">{s.howto.signsTitle}</h3>
      <dl className="ch-signs">
        {s.howto.signs.map(([title, body]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Scores({ view }: { view: CharadesView }) {
  return (
    <div className="ch-scores">
      {(['a', 'b'] as TeamId[]).map((t) => (
        <div key={t} className="ch-score" data-team={t} data-active={view.team === t || undefined}>
          <span className="ch-score-name">
            {s.team[t]}
            {view.myTeam === t && <span className="dim"> ({s.play.you})</span>}
          </span>
          <span className="ch-score-pts mono">{view.scores[t]}</span>
        </div>
      ))}
    </div>
  );
}

function LastTurn({ summary, nick }: { summary: NonNullable<CharadesView['lastTurn']>; nick: (id: string) => string }) {
  return (
    <div className="ch-last card" data-team={summary.team}>
      <p className="ch-last-head">
        <span>{s.play.lastTurn(s.team[summary.team], summary.points)}</span>
        <span className="dim">{nick(summary.narratorId)}</span>
      </p>
      {summary.cards.length === 0 ? (
        <p className="dim ch-small">{s.play.noCards}</p>
      ) : (
        <ol className="ch-last-list">
          {summary.cards.map((c, i) => (
            <li key={i} data-result={c.result}>
              <Icon name={RESULT_ICON[c.result]} size={14} />
              <span className="ch-last-title">{c.title}</span>
              <span className="ch-last-kind" title={s.kind[c.kind]}>
                <KindIcon kind={c.kind} size={14} />
              </span>
            </li>
          ))}
        </ol>
      )}
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
  view: CharadesView;
  meId: string;
  isHost: boolean;
  nick: (id: string) => string;
  send: (a: unknown) => Promise<void>;
}) {
  const mine = view.narratorId === meId;
  return (
    <section className="ch-ready">
      {view.lastTurn && <LastTurn summary={view.lastTurn} nick={nick} />}

      <div className="ch-next" data-team={view.team}>
        <span className="ch-next-label">{s.play.next}</span>
        <p className="ch-next-name">{nick(view.narratorId)}</p>
        <p className="dim ch-small">{s.team[view.team]}</p>
      </div>

      {mine ? (
        <>
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'start' })}>
            {s.play.startMine}
          </button>
          <p className="dim ch-small ch-center">{s.play.startMineHint}</p>
        </>
      ) : (
        <>
          <p className="dim ch-small ch-center">{s.play.waitNarrator(nick(view.narratorId))}</p>
          {isHost && (
            <div className="ch-host">
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
  view: CharadesView;
  remaining: number;
  nick: (id: string) => string;
  send: (a: unknown) => Promise<void>;
}) {
  const secs = Math.ceil(remaining / 1000);
  const card = view.card;
  return (
    <section className="ch-turn" data-role={view.role}>
      <div className="ch-timer">
        <span className="ch-timer-num mono" data-low={remaining < 10_000 || undefined}>
          {secs}
        </span>
        <span className="ch-timer-bar" aria-hidden="true">
          <span style={{ width: `${(remaining / view.durationMs) * 100}%` }} />
        </span>
      </div>

      <p className="ch-who" data-team={view.team}>
        <b>{nick(view.narratorId)}</b> {s.play.narrating}
      </p>

      {card ? (
        <TitleCard card={card} flash={view.flash} />
      ) : view.role === 'guesser' ? (
        <div className="ch-guess card" data-team={view.team}>
          <p className="ch-guess-title">{s.play.guess(nick(view.narratorId))}</p>
          <p className="dim ch-small">{s.play.guessHint}</p>
          <p className="ch-guess-count mono" aria-label={s.play.guessCount}>
            {view.turnStats.correct}
          </p>
          <p className="dim ch-small">{s.play.guessCount}</p>
          {view.flash && (
            <p key={view.flash.id} className="ch-flash-text" data-kind={view.flash.kind}>
              {s.play.flash[view.flash.kind]}
            </p>
          )}
        </div>
      ) : (
        <p className="dim ch-center">{s.play.spectator}</p>
      )}

      {view.role === 'narrator' && card && (
        <div className="ch-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => void send({ type: 'correct', cardId: card.id })}>
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
            <button type="button" className="btn btn-ghost ch-undo" onClick={() => void send({ type: 'undo' })}>
              {s.play.undo}
            </button>
          )}
          <p className="dim ch-small ch-center ch-span">{s.play.narratorNote}</p>
        </div>
      )}

      {view.role === 'watcher' && card && (
        <div className="ch-actions">
          <p className="ch-small ch-center ch-span ch-watch">{s.play.watchHint}</p>
          <button type="button" className="btn btn-lg ch-foul ch-span" onClick={() => void send({ type: 'foul', cardId: card.id })}>
            {s.play.foul}
          </button>
          <p className="dim ch-small ch-center ch-span">{s.play.foulHint(view.foulPenalty)}</p>
        </div>
      )}

      <dl className="ch-stats">
        {(['correct', 'pass', 'foul'] as const).map((k) => (
          <div key={k} data-kind={k}>
            <dt>{s.play.stats[k]}</dt>
            <dd className="mono">{view.turnStats[k]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Anlatıcı ve rakip için kart: tür işareti, kelime sayısı ve kelimeler numaralı. */
function TitleCard({ card, flash }: { card: Card; flash: CharadesView['flash'] }) {
  const words = card.title.split(/\s+/).filter(Boolean);
  let n = 0;
  return (
    <div className="ch-card" key={card.id}>
      {flash && (
        <span key={flash.id} className="ch-flash" data-kind={flash.kind}>
          {s.play.flash[flash.kind]}
        </span>
      )}
      <div className="ch-card-head">
        <span className="ch-kind">
          <KindIcon kind={card.kind} size={22} />
          {s.kind[card.kind]}
        </span>
        <span className="ch-count mono">{s.words(card.words)}</span>
      </div>
      <p className="ch-title" aria-label={card.title}>
        {words.map((w, i) => {
          const counts = /[\p{L}\p{N}]/u.test(w);
          if (counts) n++;
          return (
            <span key={i} className="ch-word" aria-hidden="true">
              <span className="ch-word-text">{w}</span>
              {counts && (
                <span className="ch-word-n mono" title={s.play.wordN(n)}>
                  {n}
                </span>
              )}
            </span>
          );
        })}
      </p>
      <p className="ch-gesture">{s.kindGesture[card.kind]}</p>
    </div>
  );
}

function Rosters({ view, members, meId }: { view: CharadesView; members: Map<string, RoomPlayer>; meId: string }) {
  return (
    <section className="ch-rosters">
      {(['a', 'b'] as TeamId[]).map((t) => (
        <div key={t} className="ch-roster" data-team={t}>
          <h2 className="ch-roster-head">
            <span>{s.team[t]}</span>
            <span className="mono">{view.scores[t]}</span>
          </h2>
          <ul className="sg-score-list">
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              return (
                <li key={id} className="sg-score" data-me={id === meId || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />
                  <span className="sg-score-name">{m.nick}</span>
                  {view.phase !== 'podium' && view.narratorId === id && view.team === t && <span className="ch-tag">{s.play.narrating}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Podium({
  view,
  members,
  meId,
  nick,
}: {
  view: CharadesView;
  members: Map<string, RoomPlayer>;
  meId: string;
  nick: (id: string) => string;
}) {
  const { a, b } = view.scores;
  const winner: TeamId | null = a === b ? null : a > b ? 'a' : 'b';
  return (
    <main className="col podium ch">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="podium-kicker">{s.podium.title}</p>
      <div className="podium-winner">
        <h1 className="podium-name" data-team={winner ?? 'none'}>
          {winner ? s.podium.winner(s.team[winner]) : s.podium.draw}
        </h1>
        <p className="podium-score mono">
          {a} – {b}
        </p>
      </div>
      {view.lastTurn && <LastTurn summary={view.lastTurn} nick={nick} />}
      <Rosters view={view} members={members} meId={meId} />
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
