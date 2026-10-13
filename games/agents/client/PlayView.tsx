import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { TEAM_IDS, UNLIMITED, clueProblem, type AgentsCard, type AgentsSettings, type AgentsView, type TeamId } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (action: unknown) => Promise<boolean>;
type Members = Map<string, RoomPlayer>;

const upper = (w: string) => w.toLocaleUpperCase('tr');
const num = (n: number) => (n === UNLIMITED ? '∞' : String(n));

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
  const history = <History view={view} />;
  const over = view.phase === 'over';

  return (
    <div className="ag sg">
      <aside className="sg-side sg-left">{teamsPanel}</aside>

      <main className="sg-center ag-center">
        <header className="ag-top">
          <span className="ag-pill">{s.play.pill(view.board)}</span>
          {(view.wins.a > 0 || view.wins.b > 0) && (
            <span className="ag-wins" title={s.play.wins} aria-label={`${s.play.wins}: ${view.wins.a}–${view.wins.b}`}>
              <b data-team="a">{view.wins.a}</b>–<b data-team="b">{view.wins.b}</b>
            </span>
          )}
          <span className="ag-code">{room.code}</span>
        </header>

        {over ? (
          <>
            <OverHead view={view} />
            <div className="sg-mobile-only">{teamsPanel}</div>
          </>
        ) : (
          <>
            <Counters view={view} />
            <Status view={view} nick={nick} members={members} send={send} />
          </>
        )}

        {error && (
          <p className="error-text ag-error" role="alert">
            {error}
          </p>
        )}
        <Board view={view} meId={meId} members={members} send={send} />
        <Legend />

        {over ? (
          <OverActions view={view} isHost={isHost} send={send} />
        ) : (
          <>
            <div className="sg-mobile-only">{history}</div>
            <GuessBar view={view} send={send} />
            <div className="sg-mobile-only">{teamsPanel}</div>
          </>
        )}
        {over && <div className="sg-mobile-only">{history}</div>}

        <section className="ag-howto" aria-labelledby="ag-howto">
          <h2 id="ag-howto" className="ag-howto-title">
            {s.howto.title}
          </h2>
          <ol className="ag-howto-list">
            {s.howto.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="ag-howto-n">{i + 1}</span>
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
        <div className="ag-side-settings">
          <SettingsPanel {...panelProps} section="secondary" />
          {isHost && <p className="sgs-hint">{s.settings.liveHint}</p>}
        </div>
      </aside>
    </div>
  );
}

/* ---------- Kalan ajanlar ---------- */

function Counters({ view }: { view: AgentsView }) {
  return (
    <div className="ag-counters">
      {TEAM_IDS.map((t) => (
        <div key={t} className="ag-counter" data-team={t} data-active={view.team === t || undefined} aria-label={`${s.team[t]}: ${s.play.left(view.remaining[t])}`}>
          <span className="ag-counter-name">
            {s.teamShort[t]}
            {view.myTeam === t && ` (${s.play.you})`}
          </span>
          <span className="ag-counter-num">{s.play.agents(view.remaining[t])}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Durum: ipucu kartı, ipucu formu ---------- */

function Status({ view, nick, members, send }: { view: AgentsView; nick: (id: string) => string; members: Members; send: Send }) {
  const remaining = useRemaining(view);
  const leaderId = view.leaders[view.team];
  const leaderOnline = members.get(leaderId)?.connected ?? false;
  const myLeader = view.role === 'leader' && view.myTeam === view.team;
  const label = myLeader ? s.play.myClue : s.play.clueOf(nick(leaderId));
  const timer = view.endsAt > 0 && <Timer remaining={remaining} duration={view.durationMs} />;

  if (view.phase === 'clue') {
    if (myLeader) {
      return (
        <>
          <ClueForm view={view} send={send} />
          {timer}
        </>
      );
    }
    return (
      <>
        <section className="ag-clue" data-team={view.team} aria-live="polite">
          <span className="ag-clue-text">
            <span className="ag-clue-label">{label}</span>
            <span className="ag-clue-word" data-wait>
              {s.play.thinking}
            </span>
          </span>
          <span className="ag-clue-turn">{s.play.turnShort(s.team[view.team])}</span>
        </section>
        {timer}
        <p className="ag-hint">{view.myTeam === view.team ? s.play.waitClueMine : s.play.waitClue(nick(leaderId))}</p>
        {!leaderOnline && <p className="ag-hint ag-hint-dim">{s.play.leaderOffline(nick(leaderId))}</p>}
      </>
    );
  }

  const clue = view.clue!;
  const hint =
    view.myTeam === view.team && view.role === 'guesser'
      ? s.play.tapHint[view.revealMode]
      : myLeader
        ? s.play.leaderGuessing
        : view.role === 'spectator'
          ? s.play.spectator
          : s.play.opponentGuessing(s.team[view.team]);
  return (
    <>
      <section className="ag-clue" data-team={view.team} aria-live="polite">
        <span className="ag-clue-text">
          <span className="ag-clue-label">{label}</span>
          <span className="ag-clue-word">{upper(clue.word)}</span>
        </span>
        <span className="ag-clue-right">
          <span className="ag-clue-left">{s.play.guessesLeft(view.guessesLeft)}</span>
          <span className="ag-clue-num" aria-label={`${s.play.count}: ${clue.number === UNLIMITED ? s.play.unlimited : clue.number}`}>
            {num(clue.number)}
          </span>
        </span>
      </section>
      {timer}
      <p className="ag-hint">{hint}</p>
    </>
  );
}

function Timer({ remaining, duration }: { remaining: number; duration: number }) {
  const secs = Math.ceil(remaining / 1000);
  return (
    <div className="ag-timer" data-low={remaining < 10_000 || undefined}>
      <span className="ag-bar" aria-hidden="true">
        <span style={{ width: `${duration ? (remaining / duration) * 100 : 0}%` }} />
      </span>
      <span className="ag-timer-num">
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
    <form className="ag-clue ag-clueform" data-team={view.team} onSubmit={submit}>
      <label className="ag-clue-label" htmlFor="ag-clue-input">
        {s.play.yourClue}
      </label>
      <input
        id="ag-clue-input"
        className="ag-clue-input"
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
      <span className="ag-clue-label">{s.play.count}</span>
      <div className="ag-counts" role="group" aria-label={s.play.count}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, UNLIMITED].map((n) => (
          <button
            key={n}
            type="button"
            className="ag-count"
            aria-pressed={count === n}
            aria-label={n === UNLIMITED ? s.play.unlimited : undefined}
            onClick={() => setCount(n)}
          >
            {num(n)}
          </button>
        ))}
      </div>
      <p id="ag-clue-hint" className="ag-form-hint" data-error={!!problem || undefined}>
        {problem ?? s.play.clueHint}
      </p>
      <button className="ag-submit" disabled={busy || !word.trim() || !!problem}>
        {s.play.giveClue}
      </button>
    </form>
  );
}

/* ---------- Tablo sonu (Sonuçlar ekranı dili) ---------- */

function Crown() {
  return (
    <svg className="ag-crown" width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
      <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function OverHead({ view }: { view: AgentsView }) {
  return (
    <section className="ag-over" aria-live="polite">
      <span className="ag-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="ag-over-head">
        <span className="ag-kicker">{view.closing ? s.over.kickerFinal : s.over.kicker}</span>
        <h1 className="ag-over-title">{view.winner ? s.over.won(s.team[view.winner]) : s.over.ended}</h1>
        {view.reason && <p className="ag-over-reason">{s.over.reason[view.reason]}</p>}
      </div>
      <div className="ag-scores">
        <ScoreCard view={view} team="a" />
        <span className="ag-scores-dash" aria-hidden="true">
          –
        </span>
        <ScoreCard view={view} team="b" />
      </div>
    </section>
  );
}

function ScoreCard({ view, team }: { view: AgentsView; team: TeamId }) {
  const found = view.total[team] - view.remaining[team];
  const won = view.winner === team;
  return (
    <div className="ag-score" data-team={team} data-won={won || undefined} data-lost={(view.winner !== null && !won) || undefined}>
      {won && <Crown />}
      <span className="ag-score-num" aria-hidden="true">
        {found}
      </span>
      <span className="ag-score-name" aria-hidden="true">
        {s.team[team]}
      </span>
      <span className="sr-only">{s.over.found(s.team[team], found, view.total[team])}</span>
    </div>
  );
}

function OverActions({ view, isHost, send }: { view: AgentsView; isHost: boolean; send: Send }) {
  if (view.closing) {
    return (
      <div className="ag-over-foot">
        <span className="ag-bar ag-bar-closing" aria-hidden="true">
          <span />
        </span>
        <p className="ag-over-note">{s.over.closing}</p>
      </div>
    );
  }
  if (!isHost) {
    return (
      <div className="ag-over-foot">
        <p className="ag-over-note">{s.over.waitHost}</p>
      </div>
    );
  }
  return (
    <div className="ag-over-foot">
      <p className="ag-over-note">{s.over.newBoardHint}</p>
      <button type="button" className="ag-again" onClick={() => void send({ type: 'newBoard' })}>
        <Icon name="replay" size={22} />
        {s.over.newBoard}
      </button>
      <button type="button" className="ag-lobby" onClick={() => void send({ type: 'toLobby' })}>
        {s.over.toLobby}
      </button>
    </div>
  );
}

/* ---------- Tablo ---------- */

function AgentMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 9h16l-2-4H6z" />
      <circle cx="12" cy="13" r="3" />
      <path d="M6 21c0-3.5 2.7-5 6-5s6 1.5 6 5z" />
    </svg>
  );
}

function AssassinMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
    </svg>
  );
}

function Board({ view, meId, members, send }: { view: AgentsView; meId: string; members: Members; send: Send }) {
  const canTouch = view.phase === 'guess' && view.myTeam === view.team && view.role === 'guesser';
  const myVote = view.cards.findIndex((c) => c.votes.includes(meId));
  return (
    <div className="ag-board" data-can={canTouch || undefined}>
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
  const len = card.word.length;
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
      {card.revealed && (card.color === 'a' || card.color === 'b') && <AgentMark />}
      {card.revealed && card.color === 'assassin' && <AssassinMark />}
      <span className="ag-word" data-len={len >= 12 ? 'xl' : len >= 10 ? 'l' : len >= 8 ? 'm' : undefined}>
        {upper(card.word)}
      </span>
      {card.votes.length > 0 && (
        <span className="ag-votes" title={s.play.votes(card.votes.length, votesNeeded)}>
          {card.votes.slice(0, 3).map((id) => {
            const m = members.get(id);
            return m ? <Avatar key={id} avatar={m.avatar} nick={m.nick} size={16} /> : null;
          })}
          {votesNeeded > 0 && <span className="ag-votes-n">{`${card.votes.length}/${votesNeeded}`}</span>}
        </span>
      )}
    </button>
  );
}

function Legend() {
  return (
    <div className="ag-legend">
      <span>
        <i data-color="neutral" aria-hidden="true" />
        {s.play.legendNeutral}
      </span>
      <span>
        <i data-color="assassin" aria-hidden="true" />
        {s.play.legendAssassin}
      </span>
    </div>
  );
}

function GuessBar({ view, send }: { view: AgentsView; send: Send }) {
  const guessing = view.phase === 'guess' && view.myTeam === view.team && view.role === 'guesser';
  if (!guessing) return null;
  return (
    <div className="ag-guessbar">
      {view.revealMode === 'vote' && <p className="ag-hint">{s.play.votesNeed(view.votesNeeded)}</p>}
      <button type="button" className="ag-end" onClick={() => void send({ type: 'endTurn', turn: view.turn })}>
        {s.play.endTurn}
      </button>
    </div>
  );
}

/* ---------- Takımlar ---------- */

function Teams({ view, members, meId, isHost, send }: { view: AgentsView; members: Members; meId: string; isHost: boolean; send: Send }) {
  const over = view.phase === 'over';
  return (
    <section className="ag-teams" aria-label={s.settings.teams}>
      {TEAM_IDS.map((t: TeamId) => (
        <div key={t} className="ag-roster" data-team={t}>
          <h2 className="ag-roster-head">{upper(s.team[t])}</h2>
          <ul className="ag-roster-list">
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              const leader = view.leaders[t] === id;
              const next = view.nextLeaders[t] === id;
              return (
                <li key={id} className="ag-member" data-off={!m.connected || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected} />
                  <span className="ag-member-name">
                    {m.nick}
                    {id === meId && ` (${s.play.you})`}
                  </span>
                  {leader && <span className="ag-tag">{s.play.leader}</span>}
                  {next && <span className="ag-tag ag-tag-next">{s.play.nextLeader}</span>}
                  {!m.connected && <span className="ag-off">{s.play.offline}</span>}
                  {isHost && !view.closing && !(over ? next : leader) && (
                    <button
                      type="button"
                      className="ag-make"
                      aria-label={`${m.nick}: ${over ? s.play.makeNextLeader : s.play.makeLeader}`}
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

function History({ view }: { view: AgentsView }) {
  return (
    <section className="ag-history" aria-labelledby="ag-history-title">
      <h2 id="ag-history-title" className="ag-history-title">
        {upper(s.play.history)}
      </h2>
      {view.log.length === 0 ? (
        <p className="ag-history-line ag-history-empty">{s.play.historyEmpty}</p>
      ) : (
        <ol className="ag-history-list">
          {[...view.log].reverse().map((e, i) => (
            <li key={view.log.length - i} className="ag-history-line" data-team={e.team}>
              <strong>
                {s.teamShort[e.team]} · {e.word === null ? s.play.noClue : `${upper(e.word)} ${num(e.number)}`}
              </strong>
              {e.word !== null && (
                <>
                  {' — '}
                  {e.picks.length === 0
                    ? s.play.noPicks
                    : e.picks.map((p, k) => (
                        <span key={k} className="ag-pick" data-color={p.color} title={s.color[p.color]}>
                          {k > 0 && ', '}
                          {p.word}
                        </span>
                      ))}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
