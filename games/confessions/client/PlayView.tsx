import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { CONFESSION_MAX, CONFESSION_MIN, REACTIONS, type ConfessionsSettings, type ConfessionsView, type ReactionId } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (a: unknown) => Promise<boolean>;
type Members = Map<string, RoomPlayer>;

function useRemaining(view: ConfessionsView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<ConfessionsView, ConfessionsSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  const isHost = room.hostId === meId;
  const remaining = useRemaining(view);
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown): Promise<boolean> {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
    return res.ok;
  }

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: ConfessionsSettings) => void setSettings(n) };

  return (
    <div className="cf sg">
      <aside className="sg-side sg-left">
        <Scores view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.round(view.round, view.totalRounds)}</span>
          {(view.phase === 'guess' || view.phase === 'reveal') && <span className="mono">{s.play.confessionOf(view.index, view.count)}</span>}
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.phase !== 'summary' && <Timer view={view} remaining={remaining} />}

        {view.phase === 'write' && <Write view={view} meId={meId} isHost={isHost} members={members} send={send} />}
        {(view.phase === 'guess' || view.phase === 'reveal') && <Confession view={view} meId={meId} isHost={isHost} members={members} nick={nick} send={send} />}
        {view.phase === 'summary' && <Summary view={view} isHost={isHost} nick={nick} members={members} send={send} />}

        {error && (
          <p className="error-text cf-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Scores view={view} members={members} meId={meId} />
        </div>

        <section className="howto" aria-labelledby="cf-howto">
          <h2 id="cf-howto" className="howto-title">
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

function Timer({ view, remaining }: { view: ConfessionsView; remaining: number }) {
  if (!view.endsAt) return <p className="cf-timer-label dim mono">{s.play.untimed}</p>;
  const secs = Math.ceil(remaining / 1000);
  const quiet = view.phase === 'reveal';
  return (
    <div className="cf-timer" data-quiet={quiet || undefined}>
      <span className="cf-timer-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (remaining / Math.max(1, view.durationMs)) * 100)}%` }} />
      </span>
      {!quiet && (
        <span className="cf-timer-num mono" data-low={remaining < 10_000 || undefined}>
          {secs}
        </span>
      )}
    </div>
  );
}

function Topic({ view }: { view: ConfessionsView }) {
  return (
    <div className="cf-topic">
      <h1 className="cf-topic-text">{view.topic ? view.topic.text : s.play.freeTopic}</h1>
      {!view.topic && <p className="dim cf-small">{s.play.freeTopicHint}</p>}
    </div>
  );
}

/* ---------------- Yazma ---------------- */

function Write({ view, meId, isHost, members, send }: { view: ConfessionsView; meId: string; isHost: boolean; members: Members; send: Send }) {
  const [text, setText] = useState(view.myConfession ?? '');
  const [busy, setBusy] = useState(false);
  const len = text.trim().length;
  const sent = view.myConfession !== null;
  const dirty = text.trim() !== (view.myConfession ?? '');

  useEffect(() => {
    if (view.myConfession === null) setText('');
  }, [view.round]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await send({ type: 'write', text });
    setBusy(false);
  }

  const players = [...members.values()];
  return (
    <section className="cf-write">
      <Topic view={view} />
      <form className="cf-form" onSubmit={submit}>
        <div className="cf-textarea-wrap">
          <textarea
            className="input cf-textarea"
            value={text}
            maxLength={CONFESSION_MAX}
            rows={5}
            placeholder={s.play.placeholder}
            aria-label={s.play.placeholder}
            onChange={(e) => setText(e.target.value)}
          />
          <span className="cf-counter mono" data-bad={(len > 0 && len < CONFESSION_MIN) || undefined}>
            {len}/{CONFESSION_MAX}
          </span>
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy || len < CONFESSION_MIN || (sent && !dirty)}>
          {sent ? s.play.update : s.play.send}
        </button>
        <p className="dim cf-small cf-center">{sent ? s.play.sent : view.hiddenAuthor ? s.play.privacyHidden : s.play.privacy}</p>
      </form>

      <div className="cf-wrote">
        <h2 className="cf-h2">
          {s.play.wroteTitle} <span className="mono dim">{view.written.length}/{players.filter((p) => p.connected).length}</span>
        </h2>
        <ul className="cf-wrote-list">
          {players.map((p) => {
            const done = view.written.includes(p.id);
            return (
              <li key={p.id} data-done={done || undefined} data-me={p.id === meId || undefined}>
                <Avatar avatar={p.avatar} nick={p.nick} size={24} dim={!p.connected} />
                <span className="cf-wrote-name">{p.nick}</span>
                <span className="cf-wrote-state">
                  {done ? (
                    <>
                      <Icon name="check" size={13} /> {s.play.wrote}
                    </>
                  ) : (
                    s.play.waiting
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {isHost && view.written.length > 0 && (
        <div className="cf-host">
          <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'next' })}>
            {s.play.closeWriting}
          </button>
          <p className="dim cf-small">{s.play.closeWritingHint}</p>
        </div>
      )}
    </section>
  );
}

/* ---------------- İtiraf: tahmin + açıklama ---------------- */

function Confession({
  view,
  meId,
  isHost,
  members,
  nick,
  send,
}: {
  view: ConfessionsView;
  meId: string;
  isHost: boolean;
  members: Members;
  nick: (id: string) => string;
  send: Send;
}) {
  const c = view.current!;
  const reveal = view.phase === 'reveal' ? view.reveal : null;
  const online = [...members.values()].filter((p) => p.connected).length;
  const label = (id: string) => (id === meId ? s.play.me : nick(id));

  return (
    <section className="cf-confession" data-phase={view.phase}>
      {view.topic && <p className="cf-topic-small dim">{view.topic.text}</p>}

      <blockquote className="cf-card" key={c.id} data-hidden={c.hidden || undefined}>
        <span className="cf-quote" aria-hidden="true">
          “
        </span>
        <p className="cf-card-text">{c.text ?? s.play.hiddenText}</p>
      </blockquote>

      {!c.hidden && <Reactions confessionId={c.id} reactions={c.reactions} mine={c.myReactions} send={send} />}

      {reveal ? (
        <RevealBlock view={view} meId={meId} members={members} nick={nick} />
      ) : (
        !c.hidden && (
          <div className="cf-guess">
            <h2 className="cf-h2">{s.play.whoWrote}</h2>
            <p className="dim cf-small">{view.hiddenAuthor ? s.play.whoWroteHidden : s.play.whoWroteHint}</p>
          </div>
        )
      )}

      {!c.hidden && (
        <ul className="cf-grid" data-reveal={reveal ? true : undefined}>
          {c.candidates.map((id) => {
            const m = members.get(id);
            const chosen = view.myPick === id;
            const isAuthor = reveal?.authorId === id;
            const votes = reveal?.tally[id] ?? 0;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="cf-pick"
                  aria-pressed={chosen}
                  data-author={isAuthor || undefined}
                  disabled={!!reveal}
                  onClick={() => void send({ type: 'guess', confessionId: c.id, targetId: id })}
                >
                  {m ? <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected} /> : <span className="cf-avatar-gone" />}
                  <span className="cf-pick-name">{label(id)}</span>
                  {reveal && <span className="cf-pick-votes mono">{votes}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!reveal && !c.hidden && (
        <p className="cf-progress dim cf-small">
          <span className="mono">{s.play.picked(view.picked.length, online)}</span>
          {view.myPick && <span>{s.play.myPick(label(view.myPick))}</span>}
        </p>
      )}

      {isHost && (
        <div className="cf-host">
          {view.phase === 'guess' ? (
            <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'next' })}>
              {s.play.closeGuess}
            </button>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'next' })}>
              {view.index >= view.count ? s.play.nextRound : s.play.next}
            </button>
          )}
          {!c.hidden && (
            <button type="button" className="btn btn-ghost cf-hide" onClick={() => void send({ type: 'hide', confessionId: c.id })}>
              <Icon name="x" size={14} />
              {s.play.hide}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Reactions({ confessionId, reactions, mine, send }: { confessionId: string; reactions: Record<ReactionId, number>; mine: ReactionId[]; send: Send }) {
  return (
    <div className="cf-reactions" role="group" aria-label="Tepkiler">
      {REACTIONS.map((r) => (
        <button
          key={r}
          type="button"
          className="cf-react"
          aria-pressed={mine.includes(r)}
          onClick={() => void send({ type: 'react', confessionId, reaction: r })}
        >
          {s.play.reactions[r]}
          {reactions[r] > 0 && <span className="cf-react-n mono">{reactions[r]}</span>}
        </button>
      ))}
    </div>
  );
}

function RevealBlock({ view, meId, members, nick }: { view: ConfessionsView; meId: string; members: Members; nick: (id: string) => string }) {
  const r = view.reveal!;
  if (!r.authorId) {
    return (
      <div className="cf-reveal" data-anon>
        <p className="cf-reveal-label dim">{s.play.revealHidden}</p>
        <p className="cf-reveal-name cf-reveal-anon">{s.play.anonymous}</p>
        <p className="dim cf-small">{s.play.tally}</p>
      </div>
    );
  }
  const m = members.get(r.authorId);
  const fooled = r.points.find((p) => p.playerId === r.authorId)?.delta ?? 0;
  const right = r.correct.map((id) => (id === meId ? s.play.you : nick(id)));
  return (
    <div className="cf-reveal" key={view.current?.id}>
      <p className="cf-reveal-label dim">{s.play.revealTitle}</p>
      <div className="cf-unmask">
        {m && <Avatar avatar={m.avatar} nick={m.nick} size={44} />}
        <p className="cf-reveal-name">{r.authorId === meId ? s.play.you : nick(r.authorId)}</p>
      </div>
      <p className="cf-small">{right.length ? s.play.rightList(right.join(', ')) : s.play.nobodyRight}</p>
      <p className="dim cf-small">{s.play.fooled(r.authorId === meId ? 'Sen' : nick(r.authorId), fooled)}</p>
    </div>
  );
}

/* ---------------- Tur özeti ---------------- */

function Summary({ view, isHost, nick, members, send }: { view: ConfessionsView; isHost: boolean; nick: (id: string) => string; members: Members; send: Send }) {
  const last = view.totalRounds !== null && view.round >= view.totalRounds;
  const recap = view.recap ?? [];
  return (
    <section className="cf-summary">
      <h1 className="cf-topic-text">{s.play.summaryTitle(view.round)}</h1>
      {recap.length === 0 ? (
        <p className="dim">{s.play.summaryEmpty}</p>
      ) : (
        <ol className="cf-recap">
          {recap.map((c) => {
            const m = c.authorId ? members.get(c.authorId) : null;
            const top = REACTIONS.filter((r) => c.reactions[r] > 0);
            return (
              <li key={c.id}>
                <p className="cf-recap-text">“{c.text}”</p>
                <p className="cf-recap-meta">
                  {m ? <Avatar avatar={m.avatar} nick={m.nick} size={18} /> : null}
                  <span>{c.authorId ? s.play.by(nick(c.authorId)) : s.play.anonymous}</span>
                  {top.map((r) => (
                    <span key={r} className="cf-recap-react">
                      {s.play.reactions[r]} <span className="mono">{c.reactions[r]}</span>
                    </span>
                  ))}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      {isHost ? (
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'next' })}>
          {last ? s.play.finish : s.play.nextRound}
        </button>
      ) : (
        <p className="dim cf-small cf-center">{last ? s.play.summaryLast : s.play.summaryNext}</p>
      )}
    </section>
  );
}

/* ---------------- Puanlar ve podyum ---------------- */

function ranked(view: ConfessionsView, members: Members) {
  return Object.entries(view.stats)
    .filter(([id]) => members.has(id) || view.stats[id]!.score > 0)
    .sort((a, b) => b[1].score - a[1].score);
}

function Scores({ view, members, meId }: { view: ConfessionsView; members: Members; meId: string }) {
  const rows = ranked(view, members);
  return (
    <section className="cf-scores">
      <h2 className="cf-h2">{s.play.scores}</h2>
      <ol className="sg-score-list">
        {rows.map(([id, st], i) => {
          const m = members.get(id);
          return (
            <li key={id} className="sg-score" data-me={id === meId || undefined} data-first={(i === 0 && st.score > 0) || undefined}>
              {m ? <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} /> : <span className="cf-avatar-gone" />}
              <span className="cf-score-who">
                <span className="sg-score-name">{m?.nick ?? '?'}</span>
                {!view.hiddenAuthor && <span className="cf-score-detail dim">{s.play.detail(st.correct, st.fooled)}</span>}
              </span>
              <span className="sg-score-pts mono">{st.score}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Podium({ view, members, meId }: { view: ConfessionsView; members: Members; meId: string }) {
  const rows = ranked(view, members);
  const p = view.podium!;
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  const anyPoints = rows.some(([, st]) => st.score > 0);
  const winner = anyPoints && rows[0] && (!rows[1] || rows[1][1].score < rows[0][1].score) ? rows[0][0] : null;
  return (
    <main className="col podium cf-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="podium-kicker dim">{s.podium.title}</p>
      <div className="podium-winner">
        <h1 className="podium-name">{!anyPoints ? s.podium.anonymous : winner ? s.podium.winner(nick(winner)) : s.podium.draw}</h1>
        <p className="dim cf-small">{s.podium.confessions(p.confessions)}</p>
      </div>
      {anyPoints && (
        <dl className="cf-awards">
          <div>
            <dt>{s.podium.detective}</dt>
            <dd>
              {p.detective ? (
                <>
                  <b>{nick(p.detective.playerId)}</b>
                  <span className="dim">{s.podium.detectiveValue(p.detective.value)}</span>
                </>
              ) : (
                <span className="dim">{s.podium.none}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>{s.podium.trickster}</dt>
            <dd>
              {p.trickster ? (
                <>
                  <b>{nick(p.trickster.playerId)}</b>
                  <span className="dim">{s.podium.tricksterValue(p.trickster.value)}</span>
                </>
              ) : (
                <span className="dim">{s.podium.none}</span>
              )}
            </dd>
          </div>
        </dl>
      )}
      <Scores view={view} members={members} meId={meId} />
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
