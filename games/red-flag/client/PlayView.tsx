import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { LIMIT_CATEGORY, type Counts, type RedFlagSettings, type RedFlagView, type Vote } from '../shared/index.js';
import { VoteIcon } from './Flag';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Members = Map<string, RoomPlayer>;
type Send = (a: unknown) => Promise<void>;

/** Sunucunun podyum süresi (server/game.ts DEFAULT_TIMING.podiumMs); yalnızca çubuk animasyonu için. */
const PODIUM_MS = 25_000;
/** Bayrak kartlarının tasarımdaki eğimi. */
const TILT = [-3, 1, 3];

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

/** Seçenek adları: sınır testinde Varım / Hayır / Sınırım. */
const labelsFor = (view: RedFlagView): Record<Vote, string> => (view.item?.category === LIMIT_CATEGORY ? s.limitVote : s.vote);

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

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: RedFlagSettings) => void setSettings(n) };
  const options: Vote[] = view.dealBreaker ? ['green', 'red', 'never'] : ['green', 'red'];

  return (
    <div className="rf sg">
      <aside className="sg-side sg-left">
        <Players view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center rf-main">
        <header className="rf-head">
          <span className="rf-pill">{view.phase === 'vote' ? s.play.round(view.round, view.totalRounds) : s.play.roundDone(view.round, view.totalRounds)}</span>
          <span className="rf-code">{room.code}</span>
        </header>

        {view.phase === 'vote' && <Timer view={view} />}

        {view.item && (
          <article className="rf-card" key={view.item.id} data-phase={view.phase}>
            <span className="rf-card-cat">{view.categoryName}</span>
            <p className="rf-card-text">{view.item.text}</p>
            {view.phase === 'reveal' && view.reveal && <Bar counts={view.reveal.counts} total={view.reveal.total} options={options} labels={labelsFor(view)} />}
          </article>
        )}

        {view.phase === 'vote' && view.item && <VotePanel view={view} options={options} send={send} isHost={isHost} meId={meId} />}
        {view.phase === 'reveal' && view.reveal && <Reveal view={view} options={options} meId={meId} isHost={isHost} nick={nick} send={send} />}

        {error && (
          <p className="error-text rf-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only rf-after">
          <Players view={view} members={members} meId={meId} />
        </div>

        <section className="rf-howto" aria-labelledby="rf-howto">
          <h2 id="rf-howto" className="rf-box-title">
            {s.howto.title}
          </h2>
          <ol className="rf-howto-list">
            {s.howto.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="rf-howto-n">{i + 1}</span>
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
        <section className="rf-side-settings">
          <SettingsPanel {...panelProps} section="secondary" />
        </section>
      </aside>
    </div>
  );
}

function Timer({ view }: { view: RedFlagView }) {
  const left = useUntil(view.serverNow, view.endsAt);
  if (!view.endsAt) return <p className="rf-untimed">{s.play.untimed}</p>;
  return (
    <div className="rf-timer" data-low={left < 5000 || undefined}>
      <span className="rf-timer-bar" aria-hidden="true">
        <span style={{ width: `${view.durationMs ? Math.min(100, (left / view.durationMs) * 100) : 0}%` }} />
      </span>
      <span className="rf-timer-num">{s.play.secs(Math.ceil(left / 1000))}</span>
    </div>
  );
}

function VotePanel({ view, options, send, isHost, meId }: { view: RedFlagView; options: Vote[]; send: Send; isHost: boolean; meId: string }) {
  const itemId = view.item!.id;
  const total = view.voters.length;
  const canVote = view.voters.includes(meId);
  return (
    <section className="rf-vote">
      <h2 className="rf-q">{s.play.pick}</h2>
      <div className="rf-flags" data-count={options.length} data-picked={view.myVote ? true : undefined}>
        {options.map((v, i) => (
          <button
            key={v}
            type="button"
            className="rf-flag"
            data-vote={v}
            style={{ '--tilt': `${TILT[i]}deg` } as CSSProperties}
            aria-pressed={view.myVote === v}
            disabled={!canVote}
            onClick={() => void send({ type: 'vote', itemId, vote: v })}
          >
            <VoteIcon vote={v} size={40} />
            <span>{labelsFor(view)[v]}</span>
          </button>
        ))}
      </div>
      <p className="rf-note">{view.myVote ? s.play.picked : s.play.pickHint}</p>

      {view.predict && (
        <div className="rf-guess" data-locked={!view.myVote || undefined}>
          <p className="rf-guess-head">
            {s.play.guessTitle} <span>{view.myVote ? s.play.guessHint : s.play.guessFirst}</span>
          </p>
          <div className="rf-guess-opts" data-count={options.length}>
            {options.map((v) => (
              <button
                key={v}
                type="button"
                className="rf-guess-opt"
                aria-pressed={view.myGuess === v}
                disabled={!view.myVote}
                onClick={() => void send({ type: 'guess', itemId, vote: v })}
              >
                {view.item?.category === LIMIT_CATEGORY ? s.limitVote[v] : s.voteShort[v]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rf-spacer" />
      <p className="rf-progress">{s.play.waiting(view.done.length, total)}</p>

      {isHost && (
        <>
          <button type="button" className="rf-big" onClick={() => void send({ type: 'reveal', itemId })}>
            {s.play.revealNow}
          </button>
          <button type="button" className="btn btn-ghost rf-self-center" onClick={() => void send({ type: 'skip', itemId })}>
            {s.play.skip}
          </button>
        </>
      )}
    </section>
  );
}

/** Dağılım çubuğu (kartın altında). */
function Bar({ counts, total, options, labels }: { counts: Counts; total: number; options: Vote[]; labels: Record<Vote, string> }) {
  return (
    <div className="rf-bar" role="img" aria-label={options.map((v) => `${labels[v]} ${counts[v]}`).join(', ')}>
      {options.map((v, i) =>
        counts[v] > 0 ? <span key={v} data-vote={v} style={{ flexGrow: counts[v], animationDelay: `${i * 90}ms` }} /> : null,
      )}
      {total === 0 && <span data-vote="none" style={{ flexGrow: 1 }} />}
    </div>
  );
}

function Reveal({
  view,
  options,
  meId,
  isHost,
  nick,
  send,
}: {
  view: RedFlagView;
  options: Vote[];
  meId: string;
  isHost: boolean;
  nick: (id: string) => string;
  send: Send;
}) {
  const r = view.reveal!;
  const label = labelsFor(view);
  const lock = useUntil(view.serverNow, view.nextAt);
  const discussLeft = useUntil(view.serverNow, view.discussEndsAt);
  const locked = lock > 0;
  const iAmReady = view.ready.includes(meId);
  const unanimous = r.total > 1 && options.some((v) => r.counts[v] === r.total);
  const verdict =
    r.total === 0 ? s.play.nobody : unanimous ? s.play.unanimous : r.majority.length > 1 ? s.play.tie : s.play.majority(label[r.majority[0]!]);
  const hit = r.myGuess !== null && r.correct.includes(meId);
  const you = [r.myVote ? s.play.yourVote(label[r.myVote]) : null, view.predict ? (r.myGuess === null ? s.play.noGuess : hit ? s.play.guessHit : s.play.guessMiss(label[r.myGuess])) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="rf-reveal">
      <p className="rf-verdict" data-vote={r.majority.length === 1 ? r.majority[0] : 'split'}>
        {verdict}
      </p>

      <ul className="rf-rows">
        {options.map((v) => {
          const names = r.votes?.filter((x) => x.vote === v).map((x) => nick(x.playerId)) ?? [];
          return (
            <li key={v} className="rf-row" data-vote={v} data-top={(r.majority.length === 1 && r.majority[0] === v) || undefined}>
              <div className="rf-row-head">
                <span className="rf-swatch" aria-hidden="true" />
                <span className="rf-row-name">{label[v]}</span>
                <span>
                  {r.counts[v]} · %{pct(r.counts[v], r.total)}
                </span>
              </div>
              {names.length > 0 && <p className="rf-row-who">{names.join(', ')}</p>}
            </li>
          );
        })}
      </ul>

      {you && <p className="rf-you">{you}</p>}
      {r.votes === null && <p className="rf-note">{s.play.anonNote}</p>}

      <div className="rf-spacer" />
      {view.discussEndsAt > 0 && (
        <span className="rf-discuss" role="timer" aria-live="off">
          {s.play.nextIn(Math.ceil(discussLeft / 1000))}
        </span>
      )}
      <p className="rf-note rf-note-dim">
        {(view.discussEndsAt > 0 ? s.play.readyCountTimed : s.play.readyCount)(view.ready.length, view.voters.length)}
      </p>
      {isHost ? (
        <button type="button" className="rf-big" disabled={locked} onClick={() => void send({ type: 'next', round: view.round })}>
          {locked ? `${s.play.discussing} ${Math.ceil(lock / 1000)}` : s.play.next}
        </button>
      ) : (
        <button
          type="button"
          className="rf-big"
          data-done={iAmReady || undefined}
          aria-pressed={iAmReady}
          disabled={iAmReady}
          onClick={() => void send({ type: 'ready', round: view.round })}
        >
          {iAmReady ? s.play.readyDone : s.play.ready}
        </button>
      )}
    </section>
  );
}

function Players({ view, members, meId }: { view: RedFlagView; members: Members; meId: string }) {
  const ids = [...new Set([...view.voters, ...Object.keys(view.scores)])].filter((id) => members.has(id));
  const ranked = view.predict ? [...ids].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0)) : ids;
  return (
    <section className="rf-box">
      <h2 className="rf-box-title">{view.predict ? s.play.scores : s.play.voters}</h2>
      <ul className="rf-player-list">
        {ranked.map((id) => {
          const m = members.get(id)!;
          const done = view.done.includes(id);
          const ready = view.ready.includes(id);
          const tag = !m.connected ? s.play.offline : view.phase === 'vote' ? (done ? s.play.votedTag : s.play.thinkingTag) : ready ? s.play.readyTag : null;
          return (
            <li key={id} data-me={id === meId || undefined} data-off={!m.connected || undefined} data-done={(view.phase === 'vote' ? done : ready) || undefined}>
              <Avatar avatar={m.avatar} nick={m.nick} size={26} />
              <span className="rf-player-name">{id === meId ? `${m.nick} (sen)` : m.nick}</span>
              {tag && <span className="rf-tag">{tag}</span>}
              {view.predict && <span className="rf-player-pts">{view.scores[id] ?? 0}</span>}
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

function Crown() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
      <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function Podium({ view, members, meId, code }: { view: RedFlagView; members: Members; meId: string; code: string }) {
  const sum = view.summary!;
  const nick = (id: string) => (members.get(id)?.nick ?? '?') + (id === meId ? ' (sen)' : '');
  const profile = (id: string | null) => sum.profiles.find((p) => p.playerId === id);
  const named = sum.profiles.length > 1 || (sum.profiles.length === 1 && sum.profiles[0]!.playerId !== meId);
  const scores = Object.entries(view.scores)
    .filter(([id]) => members.has(id))
    .sort((a, b) => b[1] - a[1]);
  const showScores = view.predict && scores.some(([, p]) => p > 0);
  const totalVotes = sum.totals.green + sum.totals.red + sum.totals.never;
  const awards: { key: string; label: string; id: string; note: string; vote: Vote }[] = [];
  if (sum.mostGreen) awards.push({ key: 'g', label: s.podium.mostGreen, id: sum.mostGreen, note: s.podium.tolerance(profile(sum.mostGreen)?.tolerance ?? 0), vote: 'green' });
  if (sum.strictest) awards.push({ key: 's', label: s.podium.strictest, id: sum.strictest, note: s.podium.tolerance(profile(sum.strictest)?.tolerance ?? 0), vote: 'red' });
  if (sum.rebel) awards.push({ key: 'r', label: s.podium.rebel, id: sum.rebel, note: s.podium.rebelNote(profile(sum.rebel)?.minority ?? 0), vote: 'never' });
  const [first, second] = scores;

  return (
    <main className="col rf-podium">
      <span className="rf-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="rf-podium-top">
        <span>{s.name}</span>
        <span className="rf-code">{code}</span>
      </div>

      <div className="rf-podium-head">
        <span className="rf-sticker">{s.podium.gameOver}</span>
        <h1 className="rf-podium-title">{s.podium.title}</h1>
        <p className="rf-podium-sub">{s.podium.sub(sum.rounds)}</p>
      </div>

      {showScores && first && (
        <section aria-label={s.podium.scores} className="rf-pcards">
          <div className="rf-pcard rf-pcard-first">
            <Crown />
            <span className="rf-pcard-score">{first[1]}</span>
            <span className="rf-pcard-name">{nick(first[0])}</span>
          </div>
          {second && (
            <>
              <span className="rf-pdash" aria-hidden="true">
                –
              </span>
              <div className="rf-pcard rf-pcard-second">
                <span className="rf-pcard-score">{second[1]}</span>
                <span className="rf-pcard-name">{nick(second[0])}</span>
              </div>
            </>
          )}
        </section>
      )}

      {totalVotes > 0 && (
        <div className="rf-sum-totals">
          <span className="rf-box-title">{s.podium.totals}</span>
          <Bar counts={sum.totals} total={totalVotes} options={sum.totals.never > 0 ? ['green', 'red', 'never'] : ['green', 'red']} labels={s.vote} />
          <span className="rf-sum-legend">
            {sum.totals.green} green · {sum.totals.red} red{sum.totals.never ? ` · ${sum.totals.never} asla` : ''}
          </span>
        </div>
      )}

      {awards.length > 0 && (
        <ul className="rf-awards">
          {awards.map((a) => {
            const m = members.get(a.id);
            return (
              <li key={a.key} data-vote={a.vote}>
                <span className="rf-award-label">{a.label}</span>
                <span className="rf-award-who">
                  {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                  {nick(a.id)}
                </span>
                <span className="rf-award-note">{a.note}</span>
              </li>
            );
          })}
        </ul>
      )}

      {sum.profiles.length > 0 && (
        <section className="rf-roster">
          <h2 className="rf-box-title">{named ? s.podium.profiles : s.podium.mine}</h2>
          <ul className="rf-profiles">
            {sum.profiles.map((p) => {
              const m = members.get(p.playerId);
              return (
                <li key={p.playerId} data-me={p.playerId === meId || undefined}>
                  {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                  <span className="rf-prof-name">{nick(p.playerId)}</span>
                  <span className="rf-prof-pct">%{p.tolerance}</span>
                  <ProfileBar green={p.green} red={p.red} never={p.never} />
                </li>
              );
            })}
          </ul>
          {!named && <p className="rf-note rf-note-dim">{s.podium.anonNote}</p>}
        </section>
      )}

      <section className="rf-roster">
        <h2 className="rf-box-title">{s.podium.divisive}</h2>
        {sum.divisive.length === 0 ? (
          <p className="rf-note rf-note-dim">{s.podium.noDivisive}</p>
        ) : (
          <ol className="rf-divisive">
            {sum.divisive.map((d, i) => (
              <li key={i}>
                <p>{d.text}</p>
                <ProfileBar {...d.counts} />
                <span className="rf-div-n">
                  {d.counts.green} green · {d.counts.red} red{d.counts.never ? ` · ${d.counts.never} asla` : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {showScores && scores.length > 2 && (
        <ol className="rf-roster rf-rest" start={3}>
          {scores.slice(2).map(([id, pts], i) => {
            const m = members.get(id)!;
            return (
              <li key={id}>
                <span className="rf-rest-rank">{i + 3}.</span>
                <Avatar avatar={m.avatar} nick={m.nick} size={28} />
                <span className="rf-prof-name">{nick(id)}</span>
                <span className="rf-rest-pts">{pts}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rf-spacer" />
      <div className="rf-podium-foot">
        <div className="rf-podium-bar" aria-hidden="true">
          <div style={{ animationDuration: `${PODIUM_MS}ms` }} />
        </div>
        <p className="rf-podium-note">{s.podium.back}</p>
      </div>
    </main>
  );
}
