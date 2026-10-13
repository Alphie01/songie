import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { CATEGORY_NAMES, type Answer, type NeverSettings, type NeverView, type PlayerInfo, type RoundSummary, type Statement } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Members = Map<string, RoomPlayer>;

/** Sunucudaki PODIUM_MS ile aynı: sonuç ekranındaki "lobiye dönülüyor" çubuğu. */
const PODIUM_MS = 12_000;

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

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: NeverSettings) => void setSettings(n) };
  const me = view.players.find((p) => p.id === meId);

  return (
    <div className="nv">
      <main className="nv-main">
        <header className="nv-top">
          <span className="nv-pill">{s.play.round(view.round, view.totalRounds)}</span>
          {me?.lives != null && view.maxLives != null ? (
            <Fingers lives={me.lives} max={view.maxLives} />
          ) : (
            <span className="nv-code">{room.code}</span>
          )}
        </header>

        {view.statement && (
          <StatementCard statement={view.statement} phase={view.phase} remaining={remaining} durationMs={view.durationMs} endsAt={view.endsAt} />
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
          <Reveal view={view} reveal={view.reveal} statement={view.statement} members={members} me={me} isHost={isHost} nick={nick} send={send} />
        )}

        {error && (
          <p className="error-text nv-center" role="alert">
            {error}
          </p>
        )}
      </main>

      <section className="nv-more" aria-label={s.play.more}>
        <PlayerList view={view} members={members} meId={meId} />
        <History view={view} nick={nick} />
        <div className="nv-box">
          <SettingsPanel {...panelProps} section="secondary" />
        </div>
      </section>
    </div>
  );
}

/** Kalkık parmaklar: kalan can. İnen parmaklar mor. */
export function Fingers({ lives, max, small = false }: { lives: number; max: number; small?: boolean }) {
  return (
    <span className="nv-fingers" data-small={small || undefined} role="img" aria-label={s.play.lives(lives)}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} data-down={i >= lives || undefined} />
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
      <div className="nv-card-body">
        <span className="nv-lead">{s.play.lead}</span>
        <p className="nv-rest">{splitStatement(statement.text)}</p>
        <p className="nv-card-foot">
          <span>{CATEGORY_NAMES[statement.category] ?? statement.category}</span>
          {timed && <span data-low={remaining < 5000 || undefined}>{s.play.secs(Math.ceil(remaining / 1000))}</span>}
        </p>
      </div>
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
  const pct = active.length ? Math.round((answered / active.length) * 100) : 0;
  return (
    <section className="nv-phase">
      {view.canAnswer ? (
        <>
          <div className="nv-answers" role="group" aria-label={statement.text} data-chosen={mine ?? undefined}>
            <button type="button" className="nv-answer" data-kind="did" aria-pressed={mine === 'did'} onClick={() => onAnswer('did')}>
              {s.play.did}
            </button>
            <button type="button" className="nv-answer" data-kind="didNot" aria-pressed={mine === 'didNot'} onClick={() => onAnswer('didNot')}>
              {s.play.didNot}
            </button>
          </div>
          <p className="nv-note">{mine ? s.play.answeredNote : s.play.askNote}</p>
        </>
      ) : (
        <p className="nv-box nv-note">{me?.eliminated ? s.play.eliminatedNote : s.play.lateNote}</p>
      )}

      <div className="nv-progress">
        <div className="nv-progress-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span>{s.play.waiting(answered, active.length)}</span>
      </div>

      <div className="nv-spacer" />

      <div className="nv-ghosts">
        {view.canAnswer && (
          <button type="button" className="nv-ghost" aria-pressed={view.skip.mine} onClick={() => void send({ type: 'voteSkip', statementId: statement.id })}>
            {view.skip.mine ? s.play.skipUndo(view.skip.votes, view.skip.needed) : s.play.skip(view.skip.votes, view.skip.needed)}
          </button>
        )}
        {isHost && (
          <button type="button" className="nv-ghost" onClick={() => void send({ type: 'next', statementId: statement.id })}>
            {s.play.nextStatement}
          </button>
        )}
      </div>
      {isHost && answered > 0 && (
        <button type="button" className="nv-cta" onClick={() => void send({ type: 'reveal', statementId: statement.id })}>
          {s.play.revealNow}
        </button>
      )}
    </section>
  );
}

function Reveal({
  view,
  reveal,
  statement,
  members,
  me,
  isHost,
  nick,
  send,
}: {
  view: NeverView;
  reveal: RoundSummary;
  statement: Statement;
  members: Members;
  me: PlayerInfo | undefined;
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
  const youLine = view.myAnswer ? s.play.yourAnswer(view.myAnswer) : me && !me.eliminated && me.active ? s.play.noAnswer : null;
  // Sunucu seçer; isimsiz modda hep null (kimse ifşa olmaz).
  const tellerNick = !view.anonymous && reveal.storytellerId ? members.get(reveal.storytellerId)?.nick : null;

  const lines: string[] = [];
  if (reveal.eliminatedIds && reveal.eliminatedIds.length > 0) lines.push(`${s.play.eliminated(joinNames(reveal.eliminatedIds.map(nick)))}.`);
  if (leader && leader.didCount != null) lines.push(s.play.leader(nick(leader.id), leader.didCount));

  return (
    <section className="nv-phase" aria-live="polite">
      <p className="nv-headline">{headline}</p>
      <div className="nv-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
        <b data-light={pct < 18 || undefined}>%{pct}</b>
      </div>
      {(youLine || missing > 0) && (
        <p className="nv-you">
          {youLine}
          {missing > 0 && <span className="nv-missing">{s.play.unanswered(missing)}</span>}
        </p>
      )}

      {reveal.didIds && reveal.didIds.length > 0 && (
        <ul className="nv-doers">
          {reveal.didIds.map((id) => {
            const m = members.get(id);
            const p = byId.get(id);
            const out = reveal.eliminatedIds?.includes(id);
            const tail = out ? s.play.eliminatedTag : p?.lives != null ? s.play.doerLives(p.lives) : null;
            return (
              <li key={id} className="nv-doer" data-out={out || undefined}>
                {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected} />}
                <span className="nv-doer-name">
                  {m?.nick ?? '?'}
                  {tail && ` · ${tail}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {lines.length > 0 && <p className="nv-note nv-left">{lines.join(' ')}</p>}

      {tellerNick && <p className="nv-teller">{s.play.storyteller(tellerNick)}</p>}

      <div className="nv-spacer" />

      {isHost ? (
        <button type="button" className="nv-cta nv-cta-lg" onClick={() => void send({ type: 'next', statementId: statement.id })}>
          {view.final ? s.play.toResults : s.play.next}
        </button>
      ) : (
        <p className="nv-note">{view.final ? s.play.finalNote : s.play.waitHost}</p>
      )}
    </section>
  );
}

function PlayerList({ view, members, meId }: { view: NeverView; members: Members; meId: string }) {
  const sorted = [...view.players].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || (b.lives ?? 0) - (a.lives ?? 0));
  return (
    <section className="nv-box nv-list">
      <h2 className="nv-box-title">
        {s.play.players} <span>{view.players.length}</span>
      </h2>
      <ul className="nv-rows">
        {sorted.map((p) => {
          const m = members.get(p.id);
          if (!m) return null;
          const tag = p.eliminated ? 'out' : view.phase === 'question' ? (p.answered ? 'answered' : 'waiting') : null;
          return (
            <li key={p.id} className="nv-row" data-me={p.id === meId || undefined} data-out={p.eliminated || undefined}>
              <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected || p.eliminated} />
              <span className="nv-row-name">{m.nick}</span>
              <span className="nv-row-end">
                {tag && (
                  <span className="nv-tag" data-kind={tag}>
                    {tag === 'out' ? s.play.eliminatedTag : tag === 'answered' ? s.play.answered : s.play.waitingTag}
                  </span>
                )}
                {p.lives != null && view.maxLives != null && !p.eliminated && <Fingers lives={p.lives} max={view.maxLives} small />}
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
    <section className="nv-box nv-list">
      <h2 className="nv-box-title">{s.play.history}</h2>
      {view.history.length === 0 ? (
        <p className="sgs-hint">{s.play.historyEmpty}</p>
      ) : (
        <ol className="nv-history">
          {view.history.map((r) => (
            <li key={r.round + r.text}>
              <span className="nv-history-text">{r.text}</span>
              <span className="nv-history-meta">
                <b>
                  {r.didCount}/{r.answered}
                </b>
                {r.didIds && r.didIds.length > 0 && ` ${r.didIds.map(nick).join(', ')}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Crown() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
      <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function Podium({ view, members, meId, code }: { view: NeverView; members: Members; meId: string; code: string }) {
  const p = view.podium;
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  const rows = p?.players ? [...p.players].sort((a, b) => (b.lives ?? 0) - (a.lives ?? 0) || a.did - b.did) : null;
  const most = p?.players ? [...p.players].sort((a, b) => b.did - a.did)[0] : null;
  const least = p?.players ? [...p.players].sort((a, b) => a.did - b.did)[0] : null;

  let title: string;
  if (p?.winners) title = p.winners.length ? s.podium.winner(joinNames(p.winners.map(nick))) : s.podium.noneLeft;
  else if (least && p?.players && p.players.length > 1) title = s.podium.cleanest(nick(least.id));
  else title = s.podium.title;

  const livesMode = view.maxLives != null;
  const first = rows?.[0] ?? null;
  const second = most && first && most.id !== first.id && most.did > 0 ? most : null;
  const half = rows ? Math.ceil(rows.length / 2) : 0;

  return (
    <main className="nv-end">
      <span className="nv-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="nv-end-top">
        <span>{s.name}</span>
        <span className="nv-end-code">{code}</span>
      </div>
      <div className="nv-end-head">
        <span className="nv-sticker">{s.podium.gameOver}</span>
        <h1 className="nv-end-title">{title}</h1>
        <p className="nv-end-sub">{s.podium.summary(p?.rounds ?? 0)}</p>
      </div>

      {first && (
        <div className="nv-end-cards">
          <div className="nv-end-card" data-first="">
            <Crown />
            <span className="nv-end-num">{livesMode ? (first.lives ?? 0) : first.did}</span>
            <span className="nv-end-cap">{livesMode ? s.podium.livesLeft : s.podium.timesDid}</span>
            <span className="nv-end-name">{nick(first.id)}</span>
          </div>
          {second && (
            <>
              <span className="nv-end-dash" aria-hidden="true">
                –
              </span>
              <div className="nv-end-card" data-second="">
                <span className="nv-end-num">{second.did}</span>
                <span className="nv-end-cap">{s.podium.mostDidCaption}</span>
                <span className="nv-end-name">{nick(second.id)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {p?.hottest && (
        <div className="nv-hot">
          <span className="nv-hot-label">{s.podium.hottest}</span>
          <p className="nv-hot-text">{p.hottest.text}</p>
          <span className="nv-hot-label">{s.podium.hottestCount(p.hottest.didCount, p.hottest.total)}</span>
        </div>
      )}

      {rows ? (
        <div className="nv-rosters">
          {[rows.slice(0, half), rows.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="nv-roster" start={1 + i * half}>
                  {col.map((r) => {
                    const m = members.get(r.id);
                    return (
                      <li key={r.id} data-me={r.id === meId || undefined} data-out={r.eliminated || undefined}>
                        {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={r.eliminated} />}
                        <span className="nv-roster-name">{nick(r.id)}</span>
                        <span className="nv-roster-score" title={`${s.podium.did}: ${r.did}, ${s.podium.didNot}: ${r.didNot}`}>
                          {s.podium.timesShort(r.did)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ),
          )}
        </div>
      ) : (
        <p className="nv-note">{s.podium.anonymousNote}</p>
      )}

      {p?.me && <p className="nv-note">{s.podium.me(p.me.did, p.me.didNot)}</p>}

      <div className="nv-spacer" />
      <div className="nv-end-foot">
        <div className="nv-end-bar" aria-hidden="true">
          <div style={{ animationDuration: `${PODIUM_MS}ms` }} />
        </div>
        <p className="nv-end-note">{s.podium.back}</p>
      </div>
    </main>
  );
}
