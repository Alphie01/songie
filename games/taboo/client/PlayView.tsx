import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { Card, TabooSettings, TabooView, TeamId } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

const TEAMS: TeamId[] = ['a', 'b'];

function useRemaining(view: TabooView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, view.endsAt - (now + offset));
}

/** Tasarım: Tabu.dc.html (oyun), Sonuclar.dc.html (oyun sonu). */
export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<TabooView, TabooSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const realNick = (id: string) => members.get(id)?.nick ?? '?';
  const isHost = room.hostId === meId;
  const remaining = useRemaining(view);
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: TabooSettings) => void setSettings(n) };

  return (
    <main className="tb">
      <header className="tb-top">
        <span className="tb-pill">{s.play.pill(s.play.turn(view.turnNumber, view.totalTurns))}</span>
        <span className="tb-code">{room.code}</span>
      </header>

      <Scores view={view} />

      {view.phase === 'ready' ? (
        <Ready view={view} meId={meId} isHost={isHost} nick={nick} send={send} members={members} panelProps={panelProps} />
      ) : (
        <Turn view={view} remaining={remaining} realNick={realNick} send={send} />
      )}
      {error && (
        <p className="error-text tb-center" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

function Scores({ view }: { view: TabooView }) {
  return (
    <div className="tb-scores">
      {TEAMS.map((t) => (
        <div key={t} className="tb-score" data-team={t} data-active={view.team === t || undefined}>
          <span className="tb-score-name">
            {s.team[t]}
            {view.myTeam === t && ` (${s.play.you})`}
          </span>
          <span className="tb-score-pts">{view.scores[t]}</span>
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
  members,
  panelProps,
}: {
  view: TabooView;
  meId: string;
  isHost: boolean;
  nick: (id: string) => string;
  send: (a: unknown) => Promise<void>;
  members: Map<string, RoomPlayer>;
  panelProps: React.ComponentProps<typeof SettingsPanel>;
}) {
  const mine = view.narratorId === meId;
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <section className="tb-ready">
      <div className="tb-next" data-team={view.team}>
        <span className="tb-label">{s.play.nextLabel}</span>
        <span className="tb-next-name">{nick(view.narratorId)}</span>
        <span className="tb-next-team">{s.team[view.team]}</span>
      </div>

      {mine ? (
        <>
          <button type="button" className="tb-btn tb-btn-correct" onClick={() => void send({ type: 'start' })}>
            <Icon name="play" size={22} />
            {s.play.startMine}
          </button>
          <p className="tb-hint">{s.play.startMineHint}</p>
        </>
      ) : (
        <>
          <p className="tb-hint">{s.play.waitNarrator(nick(view.narratorId))}</p>
          {isHost && (
            <div className="tb-grid2">
              <button type="button" className="tb-btn tb-btn-white" onClick={() => void send({ type: 'start' })}>
                {s.play.startForThem(nick(view.narratorId))}
              </button>
              <button type="button" className="tb-btn tb-btn-panel" onClick={() => void send({ type: 'skipNarrator' })}>
                {s.play.skipNarrator}
              </button>
            </div>
          )}
        </>
      )}

      {view.lastTurn && (
        <div className="tb-last">
          <p className="tb-last-head">
            <span>{s.play.lastTurn(s.team[view.lastTurn.team], view.lastTurn.points)}</span>
            <span className="tb-last-who">{nick(view.lastTurn.narratorId)}</span>
          </p>
          {view.lastTurn.cards.length === 0 ? (
            <p className="tb-hint">{s.play.noCards}</p>
          ) : (
            <ol className="tb-last-list">
              {view.lastTurn.cards.map((c, i) => (
                <li key={i} data-result={c.result}>
                  <span className="tb-last-icon" aria-label={s.play.stats[c.result]}>
                    <Icon name={c.result === 'correct' ? 'check' : c.result === 'taboo' ? 'x' : 'skip'} size={14} />
                  </span>
                  <span className="tb-last-word">{c.word}</span>
                  <span className="tb-last-taboo">{c.taboo.join(', ')}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <Rosters view={view} members={members} meId={meId} />

      {isHost && (
        <section className="tb-settings">
          <button type="button" className="tb-settings-head" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((o) => !o)}>
            <span>{s.play.settingsTitle}</span>
            <Icon name="chevron" size={16} style={{ transform: settingsOpen ? 'rotate(180deg)' : undefined }} />
          </button>
          {settingsOpen && <SettingsPanel {...panelProps} section="secondary" />}
        </section>
      )}
    </section>
  );
}

function Turn({
  view,
  remaining,
  realNick,
  send,
}: {
  view: TabooView;
  remaining: number;
  realNick: (id: string) => string;
  send: (a: unknown) => Promise<void>;
}) {
  const secs = Math.ceil(remaining / 1000);
  const card = view.card;
  const narrator = realNick(view.narratorId);
  const headline =
    view.role === 'narrator'
      ? s.play.headNarrator(narrator)
      : view.role === 'guesser'
        ? s.play.guess(narrator)
        : view.role === 'watcher'
          ? s.play.headWatcher(narrator)
          : s.play.headSpectator(narrator);
  return (
    <section className="tb-turn" data-role={view.role}>
      <div className="tb-timer">
        <span className="tb-timer-num" data-low={remaining < 10_000 || undefined} aria-label={s.play.timeLeft(secs)}>
          {secs}
        </span>
        <span className="tb-timer-bar" aria-hidden="true">
          <span style={{ width: `${(remaining / view.durationMs) * 100}%` }} />
        </span>
      </div>
      <p className="tb-headline">{headline}</p>

      <div className="tb-stage">
        {card ? (
          <CardView card={card} />
        ) : view.role === 'guesser' ? (
          <div className="tb-guess">
            <span className="tb-label">{s.play.guessedLabel}</span>
            <span className="tb-guess-count">{view.turnStats.correct}</span>
            <span className="tb-guess-hint">{s.play.guessHint}</span>
          </div>
        ) : (
          <div className="tb-guess">
            <span className="tb-guess-hint">{s.play.spectator}</span>
          </div>
        )}
        {view.flash && (
          <span key={view.flash.id} className="tb-flash" data-kind={view.flash.kind} role="status">
            {s.play.flash[view.flash.kind]}
          </span>
        )}
      </div>

      <p className="tb-stats">
        {(['correct', 'pass', 'taboo'] as const).map((k) => (
          <span key={k} data-kind={k}>
            {s.play.stats[k]} {view.turnStats[k]}
          </span>
        ))}
      </p>

      {view.role === 'narrator' && card && (
        <div className="tb-actions">
          <button type="button" className="tb-btn tb-btn-correct" onClick={() => void send({ type: 'correct', cardId: card.id })}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
            {s.play.correct}
          </button>
          <div className="tb-grid2">
            <button
              type="button"
              className="tb-btn tb-btn-white"
              disabled={view.passesLeft !== null && view.passesLeft <= 0}
              onClick={() => void send({ type: 'pass', cardId: card.id })}
            >
              {s.play.pass(view.passesLeft)}
            </button>
            <button type="button" className="tb-btn tb-btn-panel" disabled={!view.canUndo} onClick={() => void send({ type: 'undo' })}>
              {s.play.undo}
            </button>
          </div>
        </div>
      )}

      {view.role === 'watcher' && card && (
        <div className="tb-actions">
          <button type="button" className="tb-btn tb-btn-taboo" onClick={() => void send({ type: 'taboo', cardId: card.id })}>
            {s.play.taboo}
          </button>
          <p className="tb-hint">{s.play.tabooHint}</p>
        </div>
      )}
    </section>
  );
}

function CardView({ card }: { card: Card }) {
  return (
    <div className="tb-deck">
      <span className="tb-deck-back tb-deck-pink" aria-hidden="true" />
      <span className="tb-deck-back tb-deck-sky" aria-hidden="true" />
      <div className="tb-card" key={card.id}>
        <p className="tb-word">{card.word}</p>
        <ul className="tb-taboo">
          {card.taboo.map((t) => (
            <li key={t}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M5.6 5.6l12.8 12.8" />
              </svg>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Rosters({ view, members, meId, end = false }: { view: TabooView; members: Map<string, RoomPlayer>; meId: string; end?: boolean }) {
  return (
    <div className="tb-rosters" data-end={end || undefined}>
      {TEAMS.map((t) => (
        <section key={t} className="tb-roster" data-team={t} aria-label={s.team[t]}>
          <h2 className="tb-roster-name">{end ? s.team[t].toLocaleUpperCase('tr-TR') : s.team[t]}</h2>
          <ul>
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              return (
                <li key={id} data-off={!m.connected || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={end ? 28 : 26} />
                  <span className="tb-roster-nick">
                    {m.nick}
                    {id === meId && ` (${s.play.you})`}
                  </span>
                  {!end && view.narratorId === id && view.team === t && <span className="tb-roster-tag">{s.play.narrating}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Podium({ view, members, meId, code }: { view: TabooView; members: Map<string, RoomPlayer>; meId: string; code: string }) {
  const { a, b } = view.scores;
  const winner: TeamId | null = a === b ? null : a > b ? 'a' : 'b';
  const order: TeamId[] = winner === 'b' ? ['b', 'a'] : ['a', 'b'];
  return (
    <main className="tb tb-end podium">
      <span className="tb-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="tb-end-top">
        <span>{s.name}</span>
        <span className="tb-code">{code}</span>
      </div>
      <div className="tb-end-head">
        <span className="tb-end-sticker">{s.podium.title}</span>
        <h1 className="tb-end-title">
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
      <div className="tb-end-scores">
        {order.map((t, i) => (
          <div key={t} className="tb-end-card" data-team={t} data-first={(i === 0 && winner !== null) || undefined}>
            {i === 0 && winner && (
              <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
                <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            )}
            <span className="tb-end-pts">{view.scores[t]}</span>
            <span className="tb-end-team">{s.team[t]}</span>
          </div>
        )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, <span key="dash" className="tb-end-dash" aria-hidden="true">–</span>, el] : [el]), [])}
      </div>
      <Rosters view={view} members={members} meId={meId} end />
      <div className="tb-end-spacer" />
      <div className="tb-end-foot">
        <span className="tb-end-bar" aria-hidden="true">
          <span />
        </span>
        <span className="tb-end-back">{s.podium.back}</span>
      </div>
    </main>
  );
}
