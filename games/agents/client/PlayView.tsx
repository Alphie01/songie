import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { TEAM_IDS, UNLIMITED, clueProblem, type AgentsCard, type AgentsSettings, type AgentsView, type CardColor, type TeamId } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (action: unknown) => Promise<boolean>;
type Members = Map<string, RoomPlayer>;

function useRemaining(view: AgentsView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!view.endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [view.endsAt]);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<AgentsView, AgentsSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const isHost = room.hostId === meId;
  const [error, setError] = useState<string | null>(null);

  const send: Send = async (action) => {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
    return res.ok;
  };

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: AgentsSettings) => void setSettings(n) };
  const teamsPanel = <Teams view={view} members={members} meId={meId} isHost={isHost} send={send} />;
  const history = <History view={view} nick={nick} />;

  return (
    <div className="ag sg">
      <aside className="sg-side sg-left">{teamsPanel}</aside>

      <main className="sg-center ag-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.board(view.board)}</span>
          {(view.wins.a > 0 || view.wins.b > 0) && (
            <span className="ag-wins" title={s.play.wins}>
              <b data-team="a">{view.wins.a}</b>
              <span className="dim">–</span>
              <b data-team="b">{view.wins.b}</b>
            </span>
          )}
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Counters view={view} />
        <Status view={view} isHost={isHost} nick={nick} members={members} send={send} />
        {error && (
          <p className="error-text ag-error" role="alert">
            {error}
          </p>
        )}
        <Board view={view} meId={meId} members={members} send={send} />
        <GuessBar view={view} send={send} />

        <div className="sg-mobile-only">
          {history}
          {teamsPanel}
        </div>

        <section className="howto" aria-labelledby="ag-howto">
          <h2 id="ag-howto" className="howto-title">
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
        {history}
        <SettingsPanel {...panelProps} section="secondary" />
        {isHost && <p className="sgs-hint">{s.settings.liveHint}</p>}
      </aside>
    </div>
  );
}

/* ---------- Kalan ajanlar ---------- */

function Counters({ view }: { view: AgentsView }) {
  return (
    <div className="ag-counters">
      {TEAM_IDS.map((t) => (
        <div
          key={t}
          className="ag-counter"
          data-team={t}
          data-active={(view.phase !== 'over' && view.team === t) || undefined}
          data-won={view.winner === t || undefined}
        >
          <span className="ag-counter-name">
            {s.team[t]}
            {view.myTeam === t && <span className="dim"> ({s.play.you})</span>}
          </span>
          <span className="ag-counter-num mono">{view.remaining[t]}</span>
          <span className="ag-pips" aria-label={s.play.left(view.remaining[t])}>
            {Array.from({ length: view.total[t] }, (_, i) => (
              <span key={i} data-on={i < view.total[t] - view.remaining[t] || undefined} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Durum: ipucu formu, ipucu, tablo sonu ---------- */

function Status({
  view,
  isHost,
  nick,
  members,
  send,
}: {
  view: AgentsView;
  isHost: boolean;
  nick: (id: string) => string;
  members: Members;
  send: Send;
}) {
  const remaining = useRemaining(view);
  const leaderId = view.leaders[view.team];
  const leaderOnline = members.get(leaderId)?.connected ?? false;
  const timer = view.endsAt > 0 && view.phase !== 'over' && <Timer remaining={remaining} duration={view.durationMs} />;

  if (view.phase === 'over') return <Over view={view} isHost={isHost} send={send} />;

  if (view.phase === 'clue') {
    const mine = view.role === 'leader' && view.myTeam === view.team;
    return (
      <section className="ag-status" data-team={view.team}>
        <p className="ag-turn">{s.play.turnOf(s.team[view.team])}</p>
        {timer}
        {mine ? (
          <ClueForm view={view} send={send} />
        ) : (
          <>
            <p className="ag-wait">{view.myTeam === view.team ? s.play.waitClueMine : s.play.waitClue(nick(leaderId))}</p>
            {!leaderOnline && <p className="dim ag-small">{s.play.leaderOffline(nick(leaderId))}</p>}
          </>
        )}
        {view.role === 'leader' && !mine && <KeyMap view={view} />}
      </section>
    );
  }

  // Tahmin
  const clue = view.clue!;
  return (
    <section className="ag-status" data-team={view.team}>
      <p className="ag-turn">{s.play.turnOf(s.team[view.team])}</p>
      {timer}
      <div className="ag-clue" aria-live="polite">
        <span className="ag-clue-word">{clue.word}</span>
        <span className="ag-clue-num mono">{clue.number === UNLIMITED ? '∞' : clue.number}</span>
      </div>
      <p className="ag-small ag-clue-meta">
        <span>{s.play.guessesLeft(view.guessesLeft)}</span>
        {view.myTeam === view.team && view.role === 'guesser' ? (
          <span className="dim">{s.play.tapHint[view.revealMode]}</span>
        ) : view.role === 'leader' && view.myTeam === view.team ? (
          <span className="dim">{s.play.leaderGuessing}</span>
        ) : view.role === 'spectator' ? (
          <span className="dim">{s.play.spectator}</span>
        ) : (
          <span className="dim">{s.play.opponentGuessing(s.team[view.team])}</span>
        )}
      </p>
      {view.role === 'leader' && <KeyMap view={view} />}
    </section>
  );
}

function Timer({ remaining, duration }: { remaining: number; duration: number }) {
  const secs = Math.ceil(remaining / 1000);
  return (
    <div className="ag-timer">
      <span className="ag-timer-bar" aria-hidden="true">
        <span style={{ width: `${duration ? (remaining / duration) * 100 : 0}%` }} />
      </span>
      <span className="ag-timer-num mono" data-low={remaining < 10_000 || undefined}>
        {secs} {s.play.seconds}
      </span>
    </div>
  );
}

function ClueForm({ view, send }: { view: AgentsView; send: Send }) {
  const [word, setWord] = useState('');
  const [count, setCount] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const hidden = view.cards.filter((c) => !c.revealed).map((c) => c.word);
  const problem = word.trim() ? clueProblem(word, hidden) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (problem || !word.trim()) return;
    setBusy(true);
    const ok = await send({ type: 'clue', word: word.trim(), number: count });
    setBusy(false);
    if (ok) setWord('');
  }

  return (
    <div className="ag-leader">
      <KeyMap view={view} />
      <form className="ag-clueform" onSubmit={submit}>
        <label className="ag-label" htmlFor="ag-clue-input">
          {s.play.clueLabel}
        </label>
        <input
          id="ag-clue-input"
          className="input ag-clue-input"
          value={word}
          maxLength={24}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={s.play.cluePlaceholder}
          aria-invalid={!!problem}
          aria-describedby="ag-clue-hint"
          onChange={(e) => setWord(e.target.value.replace(/\s/g, ''))}
        />
        <span className="ag-label">{s.play.count}</span>
        <div className="ag-counts" role="group" aria-label={s.play.count}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, UNLIMITED].map((n) => (
            <button key={n} type="button" className="chip ag-count" aria-pressed={count === n} onClick={() => setCount(n)} title={n === UNLIMITED ? s.play.unlimited : undefined}>
              {n === UNLIMITED ? '∞' : n}
            </button>
          ))}
        </div>
        <p id="ag-clue-hint" className={problem ? 'error-text ag-small' : 'dim ag-small'}>
          {problem ?? s.play.clueHint}
        </p>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !word.trim() || !!problem}>
          {s.play.giveClue}
        </button>
      </form>
    </div>
  );
}

/** Liderin gizli anahtarı: 5×5 küçük harita. */
function KeyMap({ view }: { view: AgentsView }) {
  if (!view.keyVisible) return null;
  return (
    <figure className="ag-key" aria-label={s.play.key}>
      <div className="ag-key-grid">
        {view.cards.map((c, i) => (
          <span key={i} data-color={c.color ?? undefined} data-revealed={c.revealed || undefined} title={`${c.word}: ${c.color ? s.color[c.color] : ''}`} />
        ))}
      </div>
      <figcaption className="dim">
        {s.play.key}. {s.play.keyHint}
      </figcaption>
    </figure>
  );
}

function Over({ view, isHost, send }: { view: AgentsView; isHost: boolean; send: Send }) {
  return (
    <section className="ag-over" data-team={view.winner ?? 'none'}>
      <h1 className="ag-over-title">{view.winner ? s.over.won(s.team[view.winner]) : s.over.ended}</h1>
      <p className="ag-small muted">
        {view.reason ? s.over.reason[view.reason] : ''} {s.over.keyShown}
      </p>
      {view.closing ? (
        <p className="dim ag-small">{s.over.closing}</p>
      ) : isHost ? (
        <div className="ag-over-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => void send({ type: 'newBoard' })}>
            {s.over.newBoard}
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={() => void send({ type: 'toLobby' })}>
            {s.over.toLobby}
          </button>
          <p className="dim ag-small ag-span">{s.over.newBoardHint}</p>
        </div>
      ) : (
        <p className="dim ag-small">{s.over.waitHost}</p>
      )}
    </section>
  );
}

/* ---------- Tablo ---------- */

function AgentMark() {
  // Özgün ajan simgesi: şapka ve omuzlar.
  return (
    <svg className="ag-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 13.5h18" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10.5 13l1.6-6.2a1 1 0 0 1 1-.8h5.8a1 1 0 0 1 1 .8l1.6 6.2z" fill="currentColor" stroke="none" />
      <circle cx="16" cy="17.5" r="3.4" fill="currentColor" stroke="none" />
      <path d="M8 28c.6-4.4 3.8-6.6 8-6.6s7.4 2.2 8 6.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AssassinMark() {
  return (
    <svg className="ag-mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="8.5" strokeWidth="2" fill="none" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" />
      <path d="M16 3.5v6M16 22.5v6M3.5 16h6M22.5 16h6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function KeyGlyph({ color }: { color: CardColor }) {
  if (color === 'neutral') return null;
  return <span className="ag-glyph" data-color={color} aria-hidden="true" />;
}

function Board({ view, meId, members, send }: { view: AgentsView; meId: string; members: Members; send: Send }) {
  const canTouch = view.phase === 'guess' && view.myTeam === view.team && view.role === 'guesser';
  const myVote = view.cards.findIndex((c) => c.votes.includes(meId));
  return (
    <div className="ag-board" data-key={view.keyVisible || undefined} data-can={canTouch || undefined} data-phase={view.phase}>
      {view.cards.map((card, i) => (
        <CardTile
          key={`${view.board}-${i}-${view.lastReveal?.index === i ? view.lastReveal.id : 0}`}
          card={card}
          fresh={view.lastReveal?.index === i}
          canTouch={canTouch && !card.revealed}
          mine={myVote === i}
          votesNeeded={view.revealMode === 'vote' ? view.votesNeeded : 0}
          members={members}
          onTouch={() => void send({ type: 'touch', index: i, turn: view.turn })}
        />
      ))}
    </div>
  );
}

function CardTile({
  card,
  fresh,
  canTouch,
  mine,
  votesNeeded,
  members,
  onTouch,
}: {
  card: AgentsCard;
  fresh: boolean;
  canTouch: boolean;
  mine: boolean;
  votesNeeded: number;
  members: Members;
  onTouch: () => void;
}) {
  const label = card.revealed && card.color ? `${card.word}, ${s.color[card.color]}` : card.color ? `${card.word} (${s.color[card.color]})` : card.word;
  return (
    <button
      type="button"
      className="ag-card"
      data-color={card.color ?? undefined}
      data-revealed={card.revealed || undefined}
      data-fresh={fresh || undefined}
      data-mine={mine || undefined}
      disabled={!canTouch}
      aria-label={label}
      onClick={onTouch}
    >
      {card.revealed && card.color && (card.color === 'assassin' ? <AssassinMark /> : card.color !== 'neutral' ? <AgentMark /> : null)}
      {!card.revealed && card.color && <KeyGlyph color={card.color} />}
      <span className="ag-word" lang="tr" data-long={card.word.length > 8 || undefined}>
        {card.word}
      </span>
      {card.votes.length > 0 && (
        <span className="ag-votes" title={s.play.votes(card.votes.length, votesNeeded)}>
          {card.votes.slice(0, 4).map((id) => {
            const m = members.get(id);
            return m ? <Avatar key={id} avatar={m.avatar} nick={m.nick} size={16} /> : null;
          })}
          {votesNeeded > 0 && <span className="ag-votes-n mono">{`${card.votes.length}/${votesNeeded}`}</span>}
        </span>
      )}
    </button>
  );
}

function GuessBar({ view, send }: { view: AgentsView; send: Send }) {
  const guessing = view.phase === 'guess' && view.myTeam === view.team && view.role === 'guesser';
  if (!guessing) return null;
  return (
    <div className="ag-guessbar">
      {view.revealMode === 'vote' && <p className="dim ag-small">{s.play.votesNeed(view.votesNeeded)}</p>}
      <button type="button" className="btn btn-outline btn-block" onClick={() => void send({ type: 'endTurn', turn: view.turn })}>
        {s.play.endTurn}
      </button>
    </div>
  );
}

/* ---------- Takımlar ---------- */

function Teams({ view, members, meId, isHost, send }: { view: AgentsView; members: Members; meId: string; isHost: boolean; send: Send }) {
  const over = view.phase === 'over';
  return (
    <section className="ag-teams">
      {TEAM_IDS.map((t) => (
        <div key={t} className="ag-roster" data-team={t}>
          <h2 className="ag-roster-head">
            <span>{s.team[t]}</span>
            <span className="dim ag-small">{s.play.left(view.remaining[t])}</span>
          </h2>
          <ul className="sg-score-list">
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              const leader = view.leaders[t] === id;
              const next = view.nextLeaders[t] === id;
              return (
                <li key={id} className="sg-score" data-me={id === meId || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />
                  <span className="sg-score-name">{m.nick}</span>
                  {!m.connected && <span className="dim ag-small">{s.play.offline}</span>}
                  {leader && <span className="ag-tag">{s.play.leader}</span>}
                  {next && <span className="ag-tag ag-tag-next">{s.play.nextLeader}</span>}
                  {isHost && !view.closing && !(over ? next : leader) && (
                    <button
                      type="button"
                      className="ag-make"
                      title={over ? s.play.makeNextLeader : s.play.makeLeader}
                      onClick={() => void send({ type: 'setLeader', team: t, playerId: id })}
                    >
                      {s.play.makeLeader}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/* ---------- İpucu geçmişi ---------- */

function History({ view, nick }: { view: AgentsView; nick: (id: string) => string }) {
  return (
    <section className="ag-history" aria-labelledby="ag-history-title">
      <h2 id="ag-history-title" className="ag-history-title">
        {s.play.history}
      </h2>
      {view.log.length === 0 ? (
        <p className="dim ag-small">{s.play.historyEmpty}</p>
      ) : (
        <ol className="ag-history-list">
          {[...view.log].reverse().map((e, i) => (
            <li key={view.log.length - i} data-team={e.team}>
              <p className="ag-history-head">
                {e.word === null ? (
                  <span className="dim">{s.play.noClue}</span>
                ) : (
                  <>
                    <b>{e.word}</b>
                    <span className="mono">{e.number === UNLIMITED ? '∞' : e.number}</span>
                  </>
                )}
                <span className="dim ag-history-who">{nick(e.leaderId)}</span>
              </p>
              {e.word !== null && (
                <p className="ag-picks">
                  {e.picks.length === 0 ? (
                    <span className="dim">{s.play.noPicks}</span>
                  ) : (
                    e.picks.map((p, k) => (
                      <span key={k} className="ag-pick" data-color={p.color}>
                        {p.word}
                      </span>
                    ))
                  )}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

