import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { Counts, RedFlagSettings, RedFlagView, Vote } from '../shared/index.js';
import { VoteIcon } from './Flag';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Members = Map<string, RoomPlayer>;
type Send = (a: unknown) => Promise<void>;

/** Sunucu saatine göre `at` anına kalan ms. */
function useUntil(serverNow: number, at: number): number {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [at]);
  return at ? Math.max(0, at - (now + offset)) : 0;
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<RedFlagView, RedFlagSettings>) {
  const members: Members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const isHost = room.hostId === meId;
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: RedFlagSettings) => void setSettings(n) };
  const options: Vote[] = view.dealBreaker ? ['green', 'red', 'never'] : ['green', 'red'];

  return (
    <div className="rf sg">
      <aside className="sg-side sg-left">
        <Players view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">
            {view.phase === 'vote' ? s.play.round(view.round, view.totalRounds) : s.play.roundDone(view.round, view.totalRounds)}
          </span>
          {view.phase === 'vote' && <Timer view={view} />}
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.item && (
          <article className="rf-card" key={view.item.id} data-phase={view.phase}>
            <p className="rf-card-cat">{view.categoryName}</p>
            <p className="rf-card-text">{view.item.text}</p>
            {view.phase === 'reveal' && view.reveal && <Bar counts={view.reveal.counts} total={view.reveal.total} options={options} />}
          </article>
        )}

        {view.phase === 'vote' && view.item && <VotePanel view={view} options={options} send={send} isHost={isHost} meId={meId} />}
        {view.phase === 'reveal' && view.reveal && (
          <Reveal view={view} options={options} members={members} meId={meId} isHost={isHost} nick={nick} send={send} />
        )}

        {error && (
          <p className="error-text rf-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Players view={view} members={members} meId={meId} />
        </div>

        <section className="howto" aria-labelledby="rf-howto">
          <h2 id="rf-howto" className="howto-title">
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

function Timer({ view }: { view: RedFlagView }) {
  const left = useUntil(view.serverNow, view.endsAt);
  if (!view.endsAt) return <span className="rf-timer mono dim">{s.play.untimed}</span>;
  const secs = Math.ceil(left / 1000);
  return (
    <span className="rf-timer mono" data-low={left < 5000 || undefined}>
      <span className="rf-timer-bar" aria-hidden="true">
        <span style={{ width: `${view.durationMs ? (left / view.durationMs) * 100 : 0}%` }} />
      </span>
      {secs} sn
    </span>
  );
}

function VotePanel({ view, options, send, isHost, meId }: { view: RedFlagView; options: Vote[]; send: Send; isHost: boolean; meId: string }) {
  const itemId = view.item!.id;
  const total = view.voters.length;
  const canVote = view.voters.includes(meId);
  return (
    <section className="rf-vote">
      <h2 className="rf-q">{s.play.pick}</h2>
      <div className="rf-flags" data-count={options.length}>
        {options.map((v) => (
          <button
            key={v}
            type="button"
            className="rf-flag"
            data-vote={v}
            aria-pressed={view.myVote === v}
            disabled={!canVote}
            onClick={() => void send({ type: 'vote', itemId, vote: v })}
          >
            <VoteIcon vote={v} size={v === 'never' ? 22 : 40} />
            <span>{s.vote[v]}</span>
          </button>
        ))}
      </div>
      {view.myVote && <p className="dim rf-small rf-center">{s.play.picked}</p>}

      {view.predict && (
        <div className="rf-guess" data-locked={!view.myVote || undefined}>
          <div className="rf-guess-head">
            <h3>{s.play.guessTitle}</h3>
            <span className="dim rf-small">{view.myVote ? s.play.guessHint : s.play.guessFirst}</span>
          </div>
          <div className="rf-guess-opts">
            {options.map((v) => (
              <button
                key={v}
                type="button"
                className="rf-guess-opt"
                data-vote={v}
                aria-pressed={view.myGuess === v}
                disabled={!view.myVote}
                onClick={() => void send({ type: 'guess', itemId, vote: v })}
              >
                <VoteIcon vote={v} size={16} />
                {s.voteShort[v]}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="rf-progress mono">{s.play.waiting(view.done.length, total)}</p>

      {isHost && (
        <div className="rf-host">
          <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'reveal', itemId })}>
            {s.play.revealNow}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skip', itemId })}>
            {s.play.skip}
          </button>
        </div>
      )}
    </section>
  );
}

/** Animasyonlu dağılım çubuğu. */
function Bar({ counts, total, options }: { counts: Counts; total: number; options: Vote[] }) {
  return (
    <div className="rf-bar" role="img" aria-label={options.map((v) => `${s.vote[v]} ${counts[v]}`).join(', ')}>
      {options.map((v, i) =>
        counts[v] > 0 ? (
          <span key={v} data-vote={v} style={{ flexGrow: counts[v], animationDelay: `${i * 90}ms` }}>
            {pct(counts[v], total) >= 12 && <b className="mono">%{pct(counts[v], total)}</b>}
          </span>
        ) : null,
      )}
      {total === 0 && <span data-vote="none" style={{ flexGrow: 1 }} />}
    </div>
  );
}

function Reveal({
  view,
  options,
  members,
  meId,
  isHost,
  nick,
  send,
}: {
  view: RedFlagView;
  options: Vote[];
  members: Members;
  meId: string;
  isHost: boolean;
  nick: (id: string) => string;
  send: Send;
}) {
  const r = view.reveal!;
  const lock = useUntil(view.serverNow, view.nextAt);
  const locked = lock > 0;
  const iAmReady = view.ready.includes(meId);
  const unanimous = r.total > 1 && options.some((v) => r.counts[v] === r.total);
  const verdict =
    r.total === 0
      ? s.play.nobody
      : unanimous
        ? s.play.unanimous
        : r.majority.length > 1
          ? s.play.tie
          : s.play.majority(s.vote[r.majority[0]!]);
  const hit = r.myGuess !== null && r.correct.includes(meId);

  return (
    <section className="rf-reveal">
      <p className="rf-verdict" data-vote={r.majority.length === 1 ? r.majority[0] : 'split'}>
        {verdict}
      </p>

      <ul className="rf-rows">
        {options.map((v) => {
          const names = r.votes?.filter((x) => x.vote === v).map((x) => x.playerId) ?? [];
          return (
            <li key={v} className="rf-row" data-vote={v} data-top={r.majority.includes(v) || undefined}>
              <div className="rf-row-head">
                <VoteIcon vote={v} size={18} />
                <span className="rf-row-name">{s.vote[v]}</span>
                <span className="rf-row-n mono">
                  {r.counts[v]}
                  <span className="dim rf-row-pct">%{pct(r.counts[v], r.total)}</span>
                </span>
              </div>
              {names.length > 0 && (
                <div className="rf-who">
                  {names.map((id) => {
                    const m = members.get(id);
                    return (
                      <span key={id} className="rf-who-chip" data-me={id === meId || undefined}>
                        {m && <Avatar avatar={m.avatar} nick={m.nick} size={20} />}
                        {nick(id)}
                      </span>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="rf-mine">
        {r.myVote && (
          <span className="rf-mine-vote" data-vote={r.myVote}>
            <VoteIcon vote={r.myVote} size={14} />
            {s.play.yourVote(s.vote[r.myVote])}
          </span>
        )}
        {view.predict && (
          <span className="rf-mine-guess" data-hit={hit || undefined}>
            {r.myGuess === null ? s.play.noGuess : hit ? s.play.guessHit : s.play.guessMiss(s.voteShort[r.myGuess])}
          </span>
        )}
      </div>
      {r.votes === null && <p className="dim rf-small rf-center">{s.play.anonNote}</p>}

      <div className="rf-next">
        {isHost ? (
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            disabled={locked}
            onClick={() => void send({ type: 'next', round: view.round })}
          >
            {locked ? s.play.nextIn(Math.ceil(lock / 1000)) : s.play.next}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline btn-block btn-lg"
            aria-pressed={iAmReady}
            disabled={iAmReady}
            onClick={() => void send({ type: 'ready', round: view.round })}
          >
            {iAmReady ? s.play.readyDone : s.play.ready}
          </button>
        )}
        <p className="dim rf-small rf-center">{s.play.readyCount(view.ready.length, view.voters.length)}</p>
      </div>
    </section>
  );
}

function Players({ view, members, meId }: { view: RedFlagView; members: Members; meId: string }) {
  const ids = [...new Set([...view.voters, ...Object.keys(view.scores)])].filter((id) => members.has(id));
  const ranked = view.predict ? [...ids].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0)) : ids;
  return (
    <section className="rf-players">
      <h2 className="eyebrow">{view.predict ? s.play.scores : s.play.voters}</h2>
      <ul className="sg-score-list">
        {ranked.map((id) => {
          const m = members.get(id)!;
          const done = view.done.includes(id);
          const ready = view.ready.includes(id);
          const tag =
            !m.connected ? s.play.offline : view.phase === 'vote' ? (done ? s.play.votedTag : s.play.thinkingTag) : ready ? s.play.readyTag : null;
          return (
            <li key={id} className="sg-score rf-player" data-me={id === meId || undefined} data-done={(view.phase === 'vote' ? done : ready) || undefined}>
              <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />
              <span className="sg-score-name">{m.nick}</span>
              {tag && <span className="rf-tag">{tag}</span>}
              {view.predict && <span className="sg-score-pts mono">{view.scores[id] ?? 0}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProfileBar({ green, red, never }: { green: number; red: number; never: number }) {
  return (
    <span className="rf-pbar" aria-hidden="true">
      {green > 0 && <span data-vote="green" style={{ flexGrow: green }} />}
      {red > 0 && <span data-vote="red" style={{ flexGrow: red }} />}
      {never > 0 && <span data-vote="never" style={{ flexGrow: never }} />}
    </span>
  );
}

function Podium({ view, members, meId }: { view: RedFlagView; members: Members; meId: string }) {
  const sum = view.summary!;
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  const profile = (id: string | null) => sum.profiles.find((p) => p.playerId === id);
  const named = sum.profiles.length > 1 || (sum.profiles.length === 1 && sum.profiles[0]!.playerId !== meId);
  const scores = Object.entries(view.scores)
    .filter(([id]) => members.has(id))
    .sort((a, b) => b[1] - a[1]);
  const totalVotes = sum.totals.green + sum.totals.red + sum.totals.never;
  const awards: { key: string; label: string; id: string; note: string; vote: Vote }[] = [];
  if (sum.mostGreen) awards.push({ key: 'g', label: s.podium.mostGreen, id: sum.mostGreen, note: s.podium.tolerance(profile(sum.mostGreen)?.tolerance ?? 0), vote: 'green' });
  if (sum.strictest) awards.push({ key: 's', label: s.podium.strictest, id: sum.strictest, note: s.podium.tolerance(profile(sum.strictest)?.tolerance ?? 0), vote: 'red' });
  if (sum.rebel) awards.push({ key: 'r', label: s.podium.rebel, id: sum.rebel, note: s.podium.rebelNote(profile(sum.rebel)?.minority ?? 0), vote: 'never' });

  return (
    <main className="col podium rf-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <div className="podium-winner">
        <h1 className="podium-name rf-podium-title">{s.podium.title}</h1>
        <p className="dim">{s.podium.sub(sum.rounds)}</p>
      </div>

      {totalVotes > 0 && (
        <div className="rf-sum-totals">
          <Bar counts={sum.totals} total={totalVotes} options={sum.totals.never > 0 ? ['green', 'red', 'never'] : ['green', 'red']} />
        </div>
      )}

      {awards.length > 0 && (
        <ul className="rf-awards">
          {awards.map((a) => {
            const m = members.get(a.id);
            return (
              <li key={a.key} data-vote={a.vote}>
                <VoteIcon vote={a.vote} size={22} />
                <span className="rf-award-label">{a.label}</span>
                <span className="rf-award-who">
                  {m && <Avatar avatar={m.avatar} nick={m.nick} size={22} />}
                  {nick(a.id)}
                </span>
                <span className="rf-award-note mono dim">{a.note}</span>
              </li>
            );
          })}
        </ul>
      )}

      {sum.profiles.length > 0 && (
        <section className="rf-sum-sec">
          <h2 className="rf-sum-h">{named ? s.podium.profiles : s.podium.mine}</h2>
          <ul className="rf-profiles">
            {sum.profiles.map((p) => {
              const m = members.get(p.playerId);
              return (
                <li key={p.playerId} data-me={p.playerId === meId || undefined}>
                  {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} />}
                  <span className="rf-prof-name">{nick(p.playerId)}</span>
                  <span className="rf-prof-pct mono">%{p.tolerance}</span>
                  <ProfileBar green={p.green} red={p.red} never={p.never} />
                </li>
              );
            })}
          </ul>
          {!named && <p className="dim rf-small">{s.podium.anonNote}</p>}
        </section>
      )}

      <section className="rf-sum-sec">
        <h2 className="rf-sum-h">{s.podium.divisive}</h2>
        {sum.divisive.length === 0 ? (
          <p className="dim rf-small">{s.podium.noDivisive}</p>
        ) : (
          <ol className="rf-divisive">
            {sum.divisive.map((d, i) => (
              <li key={i}>
                <p>{d.text}</p>
                <ProfileBar {...d.counts} />
                <span className="mono dim rf-small">
                  {d.counts.green} green, {d.counts.red} red{d.counts.never ? `, ${d.counts.never} asla` : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {view.predict && scores.length > 0 && (
        <section className="rf-sum-sec">
          <h2 className="rf-sum-h">{s.podium.scores}</h2>
          <ul className="sg-score-list">
            {scores.map(([id, pts], i) => {
              const m = members.get(id)!;
              return (
                <li key={id} className="sg-score" data-me={id === meId || undefined} data-first={(i === 0 && pts > 0) || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={26} />
                  <span className="sg-score-name">{m.nick}</span>
                  <span className="sg-score-pts mono">
                    {pts} {s.play.points}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
