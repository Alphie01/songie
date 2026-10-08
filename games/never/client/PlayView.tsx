import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { CATEGORY_NAMES, type Answer, type NeverSettings, type NeverView, type PlayerInfo, type RoundSummary, type Statement } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Members = Map<string, RoomPlayer>;

function useRemaining(view: NeverView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!view.endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [view.endsAt]);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

/** "Ben hiç" girişini cümlenin geri kalanından ayırır. */
function splitStatement(text: string): string {
  return text.replace(/^Ben hiç\s+/u, '');
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<NeverView, NeverSettings>) {
  const members = useMemo<Members>(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const isHost = room.hostId === meId;
  const remaining = useRemaining(view);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Answer | null>(null);

  // Yeni cümle gelince iyimser seçimi sıfırla.
  const statementId = view.statement?.id ?? null;
  useEffect(() => setPending(null), [statementId, view.phase]);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: NeverSettings) => void setSettings(n) };
  const me = view.players.find((p) => p.id === meId);

  return (
    <div className="nv sg">
      <aside className="sg-side sg-left">
        <PlayerList view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.round(view.round, view.totalRounds)}</span>
          {me?.lives != null && view.maxLives != null && <Fingers lives={me.lives} max={view.maxLives} size={14} />}
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.statement && (
          <StatementCard
            statement={view.statement}
            phase={view.phase}
            remaining={remaining}
            durationMs={view.durationMs}
            endsAt={view.endsAt}
          />
        )}

        {view.phase === 'question' && view.statement && (
          <Question
            view={view}
            statement={view.statement}
            me={me}
            isHost={isHost}
            pending={pending}
            onAnswer={(a) => {
              setPending(a);
              void send({ type: 'answer', statementId: view.statement!.id, answer: a });
            }}
            send={send}
          />
        )}

        {view.phase === 'reveal' && view.reveal && view.statement && (
          <Reveal view={view} reveal={view.reveal} statement={view.statement} members={members} meId={meId} isHost={isHost} nick={nick} send={send} />
        )}

        {error && (
          <p className="error-text nv-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only nv-mobile">
          <PlayerList view={view} members={members} meId={meId} />
          <History view={view} nick={nick} />
        </div>

        <section className="howto" aria-labelledby="nv-howto">
          <h2 id="nv-howto" className="howto-title">
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
        <History view={view} nick={nick} />
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>
    </div>
  );
}

/** Kalkık parmaklar: kalan can. İnen parmaklar sönük. */
export function Fingers({ lives, max, size = 16 }: { lives: number; max: number; size?: number }) {
  return (
    <span className="nv-fingers" role="img" aria-label={s.play.lives(lives)}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 10 20" width={size * 0.5} height={size} aria-hidden="true" data-down={i >= lives || undefined}>
          <rect x="1.5" y="1" width="7" height="18" rx="3.5" />
          <path d="M3.5 5.5h3" />
        </svg>
      ))}
    </span>
  );
}

function StatementCard({
  statement,
  phase,
  remaining,
  durationMs,
  endsAt,
}: {
  statement: Statement;
  phase: NeverView['phase'];
  remaining: number;
  durationMs: number;
  endsAt: number;
}) {
  const timed = phase === 'question' && endsAt > 0 && durationMs > 0;
  return (
    <article className="nv-card" key={statement.id} data-phase={phase}>
      {timed && (
        <div className="nv-timer" aria-hidden="true">
          <span style={{ width: `${(remaining / durationMs) * 100}%` }} data-low={remaining < 5000 || undefined} />
        </div>
      )}
      <p className="nv-statement">
        <span className="nv-lead">{s.play.lead}</span>
        <span className="nv-rest">{splitStatement(statement.text)}</span>
      </p>
      <p className="nv-card-foot">
        <span className="dim">{CATEGORY_NAMES[statement.category] ?? statement.category}</span>
        {timed && <span className="mono nv-secs" data-low={remaining < 5000 || undefined}>{Math.ceil(remaining / 1000)} sn</span>}
      </p>
    </article>
  );
}

function Question({
  view,
  statement,
  me,
  isHost,
  pending,
  onAnswer,
  send,
}: {
  view: NeverView;
  statement: Statement;
  me: PlayerInfo | undefined;
  isHost: boolean;
  pending: Answer | null;
  onAnswer(a: Answer): void;
  send(a: unknown): Promise<void>;
}) {
  const mine = pending ?? view.myAnswer;
  const active = view.players.filter((p) => p.active);
  const answered = active.filter((p) => p.answered).length;
  return (
    <section className="nv-question">
      {view.canAnswer ? (
        <>
          <div className="nv-answers" role="group" aria-label={statement.text}>
            <button type="button" className="nv-answer" data-kind="did" aria-pressed={mine === 'did'} onClick={() => onAnswer('did')}>
              {s.play.did}
            </button>
            <button type="button" className="nv-answer" data-kind="didNot" aria-pressed={mine === 'didNot'} onClick={() => onAnswer('didNot')}>
              {s.play.didNot}
            </button>
          </div>
          <p className="dim nv-small nv-center">{mine ? s.play.answeredNote : s.play.askNote}</p>
        </>
      ) : (
        <p className="nv-note">{me?.eliminated ? s.play.eliminatedNote : s.play.lateNote}</p>
      )}

      <p className="nv-progress mono">{s.play.waiting(answered, active.length)}</p>

      <div className="nv-controls">
        {view.canAnswer && (
          <button type="button" className="btn btn-ghost" aria-pressed={view.skip.mine} onClick={() => void send({ type: 'voteSkip', statementId: statement.id })}>
            {view.skip.mine ? s.play.skipUndo(view.skip.votes, view.skip.needed) : s.play.skip(view.skip.votes, view.skip.needed)}
          </button>
        )}
        {isHost && (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'next', statementId: statement.id })}>
              {s.play.nextStatement}
            </button>
            {answered > 0 && (
              <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'reveal', statementId: statement.id })}>
                {s.play.revealNow}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Reveal({
  view,
  reveal,
  statement,
  members,
  meId,
  isHost,
  nick,
  send,
}: {
  view: NeverView;
  reveal: RoundSummary;
  statement: Statement;
  members: Members;
  meId: string;
  isHost: boolean;
  nick: (id: string) => string;
  send(a: unknown): Promise<void>;
}) {
  const pct = reveal.answered ? Math.round((reveal.didCount / reveal.answered) * 100) : 0;
  const headline =
    reveal.answered === 0 ? s.play.noAnswers : reveal.didCount === 0 ? s.play.nobody : reveal.didCount === reveal.answered ? s.play.everyone : s.play.didCount(reveal.didCount, reveal.answered);
  const missing = reveal.total - reveal.answered;
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const leader = view.anonymous
    ? null
    : [...view.players].filter((p) => (p.didCount ?? 0) > 0).sort((a, b) => (b.didCount ?? 0) - (a.didCount ?? 0))[0];

  return (
    <section className="nv-reveal" aria-live="polite">
      <div className="nv-tally">
        <p className="nv-tally-head">{headline}</p>
        <div className="nv-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="nv-small dim nv-tally-meta">
          <span className="mono">%{pct}</span>
          {missing > 0 && <span>{s.play.unanswered(missing)}</span>}
          {view.myAnswer && <span>{s.play.yourAnswer(view.myAnswer)}</span>}
        </p>
      </div>

      {reveal.didIds && reveal.didIds.length > 0 && (
        <ul className="nv-doers">
          {reveal.didIds.map((id) => {
            const m = members.get(id);
            const p = byId.get(id);
            const out = reveal.eliminatedIds?.includes(id);
            return (
              <li key={id} className="nv-doer" data-me={id === meId || undefined} data-out={out || undefined}>
                {m && <Avatar avatar={m.avatar} nick={m.nick} size={40} dim={!m.connected} />}
                <span className="nv-doer-name">{nick(id)}</span>
                {p?.lives != null && view.maxLives != null && <Fingers lives={p.lives} max={view.maxLives} size={12} />}
                {out && <span className="nv-tag" data-kind="out">{s.play.eliminatedTag}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {reveal.eliminatedIds && reveal.eliminatedIds.length > 0 && (
        <p className="nv-out">{s.play.eliminated(joinNames(reveal.eliminatedIds.map(nick)))}</p>
      )}

      {leader && leader.didCount != null && <p className="nv-small dim nv-center">{s.play.leader(nick(leader.id), leader.didCount)}</p>}

      {isHost ? (
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void send({ type: 'next', statementId: statement.id })}>
          {view.final ? s.play.toResults : s.play.next}
        </button>
      ) : (
        <p className="dim nv-small nv-center">{view.final ? s.play.finalNote : s.play.waitHost}</p>
      )}
    </section>
  );
}

function PlayerList({ view, members, meId }: { view: NeverView; members: Members; meId: string }) {
  const sorted = [...view.players].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || (b.lives ?? 0) - (a.lives ?? 0));
  return (
    <section className="nv-players">
      <h2 className="nv-side-title">
        {s.play.players} <span className="mono dim">{view.players.length}</span>
      </h2>
      <ul className="sg-score-list">
        {sorted.map((p) => {
          const m = members.get(p.id);
          if (!m) return null;
          const tag = p.eliminated ? 'out' : view.phase === 'question' ? (p.answered ? 'answered' : 'waiting') : null;
          return (
            <li key={p.id} className="sg-score" data-me={p.id === meId || undefined} data-out={p.eliminated || undefined}>
              <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected || p.eliminated} />
              <span className="sg-score-name">{m.nick}</span>
              <span className="nv-score-end">
                {tag && (
                  <span className="nv-tag" data-kind={tag}>
                    {tag === 'out' ? s.play.eliminatedTag : tag === 'answered' ? s.play.answered : s.play.waitingTag}
                  </span>
                )}
                {p.lives != null && view.maxLives != null && !p.eliminated && <Fingers lives={p.lives} max={view.maxLives} size={12} />}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function History({ view, nick }: { view: NeverView; nick: (id: string) => string }) {
  return (
    <section className="nv-history">
      <h2 className="nv-side-title">{s.play.history}</h2>
      {view.history.length === 0 ? (
        <p className="sgs-hint">{s.play.historyEmpty}</p>
      ) : (
        <ol className="nv-history-list">
          {view.history.map((r) => (
            <li key={r.round + r.text}>
              <span className="nv-history-text">{r.text}</span>
              <span className="nv-small dim">
                <span className="mono">
                  {r.didCount}/{r.answered}
                </span>
                {r.didIds && r.didIds.length > 0 && ` ${r.didIds.map(nick).join(', ')}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Podium({ view, members, meId }: { view: NeverView; members: Members; meId: string }) {
  const p = view.podium;
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  const rows = p?.players ? [...p.players].sort((a, b) => (b.lives ?? 0) - (a.lives ?? 0) || a.did - b.did) : null;
  const most = p?.players ? [...p.players].sort((a, b) => b.did - a.did)[0] : null;
  const least = p?.players ? [...p.players].sort((a, b) => a.did - b.did)[0] : null;

  let title: string;
  if (p?.winners) title = p.winners.length ? s.podium.winner(joinNames(p.winners.map(nick))) : s.podium.noneLeft;
  else if (least && p?.players && p.players.length > 1) title = s.podium.cleanest(nick(least.id));
  else title = s.podium.title;

  return (
    <main className="col podium nv-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <div className="podium-winner">
        <h1 className="podium-name">{title}</h1>
        <p className="dim">{s.podium.summary(p?.rounds ?? 0)}</p>
      </div>

      {most && most.did > 0 && <p className="nv-center nv-podium-line">{s.podium.mostDid(nick(most.id))}</p>}

      {p?.hottest && (
        <div className="nv-hot card">
          <p className="nv-small dim">{s.podium.hottest}</p>
          <p className="nv-hot-text">{p.hottest.text}</p>
          <p className="nv-small mono dim">{s.podium.hottestCount(p.hottest.didCount, p.hottest.total)}</p>
        </div>
      )}

      {rows ? (
        <table className="nv-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Oyuncu</span>
              </th>
              <th scope="col">{s.podium.did}</th>
              <th scope="col">{s.podium.didNot}</th>
              {view.maxLives != null && <th scope="col">{s.podium.lives}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = members.get(r.id);
              return (
                <tr key={r.id} data-me={r.id === meId || undefined} data-out={r.eliminated || undefined}>
                  <th scope="row">
                    {m && <Avatar avatar={m.avatar} nick={m.nick} size={24} dim={r.eliminated} />}
                    <span>{nick(r.id)}</span>
                  </th>
                  <td className="mono">{r.did}</td>
                  <td className="mono">{r.didNot}</td>
                  {view.maxLives != null && <td>{r.lives != null && <Fingers lives={r.lives} max={view.maxLives} size={12} />}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="dim nv-center">{s.podium.anonymousNote}</p>
      )}

      {p?.me && <p className="nv-center nv-small">{s.podium.me(p.me.did, p.me.didNot)}</p>}
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
