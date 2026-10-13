import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
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

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} remaining={remaining} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: ConfessionsSettings) => void setSettings(n) };
  const head =
    view.phase === 'write'
      ? `${s.play.round(view.round, view.totalRounds)} · ${s.play.writePhase}`
      : view.phase === 'summary'
        ? s.play.round(view.round, view.totalRounds)
        : s.play.confessionOf(view.index, view.count);

  return (
    <div className="cf sg">
      <aside className="sg-side sg-left">
        <Scores view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center cf-main">
        <header className="cf-head">
          <span className="cf-pill">{head}</span>
          <span className="cf-code">{room.code}</span>
        </header>

        {view.phase !== 'summary' && <Timer view={view} remaining={remaining} />}

        {view.phase === 'write' && <Write view={view} meId={meId} isHost={isHost} members={members} send={send} />}
        {(view.phase === 'guess' || view.phase === 'reveal') && <Confession view={view} meId={meId} isHost={isHost} members={members} nick={nick} send={send} />}
        {view.phase === 'summary' && <Summary view={view} isHost={isHost} nick={nick} send={send} />}

        {error && (
          <p className="error-text cf-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only cf-after">
          <Scores view={view} members={members} meId={meId} />
        </div>

        <section className="cf-howto" aria-labelledby="cf-howto">
          <h2 id="cf-howto" className="cf-box-title">
            {s.howto.title}
          </h2>
          <ol className="cf-howto-list">
            {s.howto.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="cf-howto-n">{i + 1}</span>
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
        <section className="cf-side-settings">
          <SettingsPanel {...panelProps} section="secondary" />
        </section>
      </aside>
    </div>
  );
}

function Timer({ view, remaining }: { view: ConfessionsView; remaining: number }) {
  if (!view.endsAt) return <p className="cf-untimed">{s.play.untimed}</p>;
  const secs = Math.ceil(remaining / 1000);
  const quiet = view.phase === 'reveal';
  return (
    <div className="cf-timer" data-quiet={quiet || undefined} data-low={(!quiet && remaining < 10_000) || undefined}>
      <span className="cf-timer-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (remaining / Math.max(1, view.durationMs)) * 100)}%` }} />
      </span>
      {!quiet && <span className="cf-timer-num">{s.play.secs(secs)}</span>}
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
      <span className="cf-eyebrow">{view.topic ? s.play.topicLabel : s.play.freeTopic}</span>
      <h1 className="cf-topic">{view.topic ? view.topic.text : s.play.freeTopicHint}</h1>

      <form className="cf-form" onSubmit={submit}>
        <div className="cf-note-wrap">
          <label htmlFor="cf-text" className="sr-only">
            {s.play.placeholder}
          </label>
          <textarea
            id="cf-text"
            className="cf-note-input"
            value={text}
            maxLength={CONFESSION_MAX}
            placeholder={s.play.placeholder}
            onChange={(e) => setText(e.target.value)}
          />
          <span className="cf-counter" data-bad={(len > 0 && len < CONFESSION_MIN) || undefined}>
            {len}/{CONFESSION_MAX}
          </span>
        </div>
        <button className="cf-big cf-big-yellow" disabled={busy || len < CONFESSION_MIN || (sent && !dirty)}>
          {sent ? s.play.update : s.play.send}
        </button>
      </form>
      <p className="cf-note-line">{sent ? s.play.sent : view.hiddenAuthor ? s.play.privacyHidden : s.play.privacy}</p>

      <div className="cf-box">
        <h2 className="cf-box-title">
          {s.play.wroteTitle} {view.written.length}/{players.filter((p) => p.connected).length}
        </h2>
        <ul className="cf-wrote">
          {players.map((p) => {
            const done = view.written.includes(p.id);
            return (
              <li key={p.id} data-done={done || undefined} data-me={p.id === meId || undefined} data-off={!p.connected || undefined}>
                {p.nick} {done ? `✓ ${s.play.wrote}` : s.play.waiting}
              </li>
            );
          })}
        </ul>
      </div>

      {isHost && view.written.length > 0 && (
        <div className="cf-host">
          <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'next' })}>
            {s.play.closeWriting}
          </button>
          <p>{s.play.closeWritingHint}</p>
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

  const ask = reveal ? (reveal.authorId ? s.play.author(reveal.authorId === meId ? 'Sen' : nick(reveal.authorId)) : s.play.revealHidden) : s.play.whoWrote;

  return (
    <section className="cf-confession" data-phase={view.phase}>
      {view.topic && <p className="cf-topic-small">{view.topic.text}</p>}

      <div className="cf-paper" key={c.id}>
        <span className="cf-tape" aria-hidden="true" />
        <blockquote className="cf-note" data-hidden={c.hidden || undefined}>
          <span className="cf-quote" aria-hidden="true">
            “
          </span>
          <p className="cf-note-text">{c.text ?? s.play.hiddenText}</p>
        </blockquote>
      </div>

      {!c.hidden && <Reactions confessionId={c.id} reactions={c.reactions} mine={c.myReactions} send={send} />}

      {!c.hidden && (
        <>
          <h2 className="cf-ask" key={reveal ? 'r' : 'g'} data-reveal={reveal ? true : undefined}>
            {ask}
          </h2>
          {!reveal && <p className="cf-note-line">{view.hiddenAuthor ? s.play.whoWroteHidden : s.play.whoWroteHint}</p>}
          <ul className="cf-grid">
            {c.candidates.map((id) => {
              const chosen = view.myPick === id;
              const isAuthor = !!reveal && reveal.authorId === id;
              const wrong = !!reveal && !!reveal.authorId && chosen && !isAuthor;
              const votes = reveal?.tally[id] ?? 0;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="cf-pick"
                    aria-pressed={chosen}
                    data-author={isAuthor || undefined}
                    data-wrong={wrong || undefined}
                    data-off={!members.get(id)?.connected || undefined}
                    disabled={!!reveal}
                    onClick={() => void send({ type: 'guess', confessionId: c.id, targetId: id })}
                  >
                    <span className="cf-pick-name">{label(id)}</span>
                    {reveal && <span className="cf-pick-votes">{s.play.votes(votes)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!c.hidden && <Foot view={view} meId={meId} online={online} label={label} nick={nick} />}

      {isHost && (
        <div className="cf-host">
          <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'next' })}>
            {view.phase === 'guess' ? s.play.closeGuess : view.index >= view.count ? s.play.nextRound : s.play.next}
          </button>
          {!c.hidden && (
            <button type="button" className="btn btn-ghost cf-hide" onClick={() => void send({ type: 'hide', confessionId: c.id })}>
              {s.play.hide}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** Alttaki durum kutusu: tahminde kaç kişi seçti, açıklamada bildin mi. */
function Foot({
  view,
  meId,
  online,
  label,
  nick,
}: {
  view: ConfessionsView;
  meId: string;
  online: number;
  label: (id: string) => string;
  nick: (id: string) => string;
}) {
  const r = view.phase === 'reveal' ? view.reveal : null;
  if (!r) {
    return (
      <div className="cf-foot">
        <p>{view.myPick ? s.play.myPick(label(view.myPick), view.picked.length, online) : s.play.picked(view.picked.length, online)}</p>
        {view.myPick && <p className="cf-foot-sub">{s.play.changePick}</p>}
      </div>
    );
  }
  if (!r.authorId) {
    return (
      <div className="cf-foot" data-tone="light">
        <p>{s.play.revealHidden}</p>
        <p className="cf-foot-sub">{s.play.tally}</p>
      </div>
    );
  }
  const fooled = r.points.find((p) => p.playerId === r.authorId)?.delta ?? 0;
  const mine = r.authorId === meId;
  const hit = !mine && view.myPick === r.authorId;
  const line = mine ? s.play.fooledMe(fooled) : `${view.myPick ? (hit ? s.play.gotIt : s.play.missed) + ' ' : ''}${s.play.fooled(nick(r.authorId), fooled)}`;
  const right = r.correct.map((id) => (id === meId ? s.play.you : nick(id)));
  return (
    <div className="cf-foot" data-tone={hit ? 'hit' : 'light'} key={view.current?.id}>
      <p>{line}</p>
      <p className="cf-foot-sub">{right.length ? s.play.rightList(right.join(', ')) : s.play.nobodyRight}</p>
    </div>
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
          {s.play.reactions[r]} {reactions[r]}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Tur özeti ---------------- */

function Summary({ view, isHost, nick, send }: { view: ConfessionsView; isHost: boolean; nick: (id: string) => string; send: Send }) {
  const last = view.totalRounds !== null && view.round >= view.totalRounds;
  const recap = view.recap ?? [];
  return (
    <section className="cf-summary">
      <h1 className="cf-topic">{s.play.summaryTitle(view.round)}</h1>
      {recap.length === 0 ? (
        <p className="cf-note-line">{s.play.summaryEmpty}</p>
      ) : (
        <ol className="cf-recap">
          {recap.map((c) => {
            const top = REACTIONS.filter((r) => c.reactions[r] > 0);
            return (
              <li key={c.id}>
                <p className="cf-recap-text">“{c.text}”</p>
                <p className="cf-recap-meta">
                  <b>{c.authorId ? s.play.by(nick(c.authorId)) : s.play.anonymous}</b>
                  {top.map((r) => (
                    <span key={r}>
                      {s.play.reactions[r]} {c.reactions[r]}
                    </span>
                  ))}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      {isHost ? (
        <button type="button" className="cf-big cf-big-yellow" onClick={() => void send({ type: 'next' })}>
          {last ? s.play.finish : s.play.nextRound}
        </button>
      ) : (
        <p className="cf-note-line cf-center">{last ? s.play.summaryLast : s.play.summaryNext}</p>
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
    <section className="cf-box cf-scores">
      <h2 className="cf-box-title">{s.play.scores}</h2>
      <ol className="cf-score-list">
        {rows.map(([id, st], i) => {
          const m = members.get(id);
          return (
            <li key={id} data-me={id === meId || undefined}>
              <span className="cf-score-name">
                {i + 1}. {id === meId ? 'Sen' : (m?.nick ?? '?')}
                {!view.hiddenAuthor && <small>{s.play.detail(st.correct, st.fooled)}</small>}
              </span>
              <span>{st.score}</span>
            </li>
          );
        })}
      </ol>
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

function Podium({ view, members, meId, code, remaining }: { view: ConfessionsView; members: Members; meId: string; code: string; remaining: number }) {
  const rows = ranked(view, members);
  const p = view.podium!;
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  const anyPoints = rows.some(([, st]) => st.score > 0);
  const winner = anyPoints && rows[0] && (!rows[1] || rows[1][1].score < rows[0][1].score) ? rows[0][0] : null;
  const [first, second] = rows;
  // Çubuk podyum süresince dolar (sunucu endsAt gönderiyor).
  const [barMs] = useState(() => Math.max(1000, remaining || 10_000));
  return (
    <main className="col cf-podium">
      <span className="cf-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="cf-podium-top">
        <span>{s.name}</span>
        <span className="cf-code">{code}</span>
      </div>

      <div className="cf-podium-head">
        <span className="cf-sticker">{s.podium.title}</span>
        <h1 className="cf-podium-title">{!anyPoints ? s.podium.anonymous : winner ? s.podium.winner(nick(winner)) : s.podium.draw}</h1>
        <p className="cf-podium-sub">{s.podium.confessions(p.confessions)}</p>
      </div>

      {anyPoints && first && (
        <div className="cf-podium-cards">
          <div className="cf-pcard cf-pcard-first">
            <Crown />
            <span className="cf-pcard-score">{first[1].score}</span>
            <span className="cf-pcard-name">{first[0] === meId ? `${nick(first[0])} (sen)` : nick(first[0])}</span>
          </div>
          {second && (
            <>
              <span className="cf-pdash" aria-hidden="true">
                –
              </span>
              <div className="cf-pcard cf-pcard-second">
                <span className="cf-pcard-score">{second[1].score}</span>
                <span className="cf-pcard-name">{second[0] === meId ? `${nick(second[0])} (sen)` : nick(second[0])}</span>
              </div>
            </>
          )}
        </div>
      )}

      {anyPoints && (
        <div className="cf-rosters">
          <Award title={s.podium.detective} tone="mint" who={p.detective ? nick(p.detective.playerId) : null} value={p.detective ? s.podium.detectiveValue(p.detective.value) : null} members={members} id={p.detective?.playerId} />
          <Award title={s.podium.trickster} tone="lilac" who={p.trickster ? nick(p.trickster.playerId) : null} value={p.trickster ? s.podium.tricksterValue(p.trickster.value) : null} members={members} id={p.trickster?.playerId} />
        </div>
      )}

      {rows.length > 2 && (
        <ol className="cf-roster cf-roster-rest" start={3}>
          {rows.slice(2).map(([id, st]) => {
            const m = members.get(id);
            return (
              <li key={id}>
                {m ? <Avatar avatar={m.avatar} nick={m.nick} size={28} /> : null}
                <span className="cf-roster-name">{id === meId ? `${nick(id)} (sen)` : nick(id)}</span>
                <span className="cf-roster-score">{st.score}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="cf-podium-spacer" />
      <div className="cf-podium-foot">
        <div className="cf-podium-bar" aria-hidden="true">
          <div style={{ animationDuration: `${barMs}ms` }} />
        </div>
        <p className="cf-podium-note">{s.podium.back}</p>
      </div>
    </main>
  );
}

function Award({ title, tone, who, value, members, id }: { title: string; tone: 'mint' | 'lilac'; who: string | null; value: string | null; members: Members; id?: string }) {
  const m = id ? members.get(id) : undefined;
  return (
    <div className="cf-roster" data-tone={tone}>
      <span className="cf-roster-title">{title}</span>
      {who ? (
        <>
          <span className="cf-roster-who">
            {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
            {who}
          </span>
          <span className="cf-roster-value">{value}</span>
        </>
      ) : (
        <span className="cf-roster-value">{s.podium.none}</span>
      )}
    </div>
  );
}
