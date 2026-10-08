import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { Avatar as AvatarData } from '@songie/shared';
import type { MostLikelySettings, MostLikelyView, Person, Prompt } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (action: unknown) => Promise<void>;
type Nick = (id: string) => string;

function useRemaining(view: MostLikelyView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!view.endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [view.endsAt]);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

const avatarOf = (p: Person) => p.avatar as AvatarData;

/** "Ayşe, Cem ve Deniz" */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<MostLikelyView, MostLikelySettings>) {
  const byId = useMemo(() => new Map(view.people.map((p) => [p.id, p])), [view.people]);
  const nick: Nick = (id) => (id === meId ? s.play.you : (byId.get(id)?.nick ?? '?'));
  const plainNick: Nick = (id) => byId.get(id)?.nick ?? '?';
  const isHost = room.hostId === meId;
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  if (view.phase === 'podium') return <Podium view={view} meId={meId} />;

  const panelProps = {
    settings,
    editable: isHost,
    api,
    players: room.players,
    meId,
    onChange: (n: MostLikelySettings) => void setSettings(n),
  };

  return (
    <div className="ml sg">
      <aside className="sg-side sg-left">
        <Players view={view} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.round(view.round, view.totalRounds)}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.phase === 'vote' ? (
          <Vote view={view} meId={meId} isHost={isHost} nick={nick} send={send} />
        ) : (
          <Reveal view={view} meId={meId} isHost={isHost} nick={nick} plainNick={plainNick} send={send} />
        )}

        {error && (
          <p className="error-text ml-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Players view={view} meId={meId} />
          <History view={view} nick={plainNick} />
        </div>

        <section className="howto" aria-labelledby="ml-howto">
          <h2 id="ml-howto" className="howto-title">
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
        <History view={view} nick={plainNick} />
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>
    </div>
  );
}

function Question({ prompt, compact }: { prompt: Prompt; compact?: boolean }) {
  return (
    <h1 className="ml-q" data-compact={compact || undefined} key={prompt.id}>
      <span className="ml-q-frame">{s.prefix} </span>
      <span className="ml-q-text">{prompt.text}</span>
      <span className="ml-q-frame"> {s.suffix}</span>
    </h1>
  );
}

function Vote({ view, meId, isHost, nick, send }: { view: MostLikelyView; meId: string; isHost: boolean; nick: Nick; send: Send }) {
  const remaining = useRemaining(view);
  const [mode, setMode] = useState<'vote' | 'guess'>('vote');
  // Yeni soruda oy sekmesine dön; oy verince tahmine geç.
  useEffect(() => setMode('vote'), [view.prompt.id]);
  const candidates = view.people.filter((p) => p.present);
  const voters = candidates.filter((p) => p.connected || view.voted.includes(p.id));
  const voted = new Set(view.voted);
  const amIn = candidates.some((p) => p.id === meId);
  const guessing = view.predict && mode === 'guess';
  const base = { round: view.round, promptId: view.prompt.id };

  async function pick(id: string) {
    if (guessing) {
      await send({ type: 'guess', ...base, target: id });
    } else {
      await send({ type: 'vote', ...base, target: id });
      if (view.predict && !view.myGuess) setMode('guess');
    }
  }

  return (
    <section className="ml-vote">
      {view.endsAt > 0 && (
        <div className="ml-timer" aria-label={`${Math.ceil(remaining / 1000)} ${s.play.secondsLeft}`}>
          <span className="ml-timer-bar" aria-hidden="true">
            <span style={{ width: `${(remaining / view.durationMs) * 100}%` }} data-low={remaining < 5000 || undefined} />
          </span>
          <span className="ml-timer-num mono" data-low={remaining < 5000 || undefined}>
            {Math.ceil(remaining / 1000)}
          </span>
        </div>
      )}

      <Question prompt={view.prompt} />

      {amIn && view.predict && (
        <div className="ml-mode" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'vote'} onClick={() => setMode('vote')}>
            {s.play.modeVote}
            {view.myVote && <Icon name="check" size={13} />}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'guess'} data-kind="guess" onClick={() => setMode('guess')}>
            {s.play.modeGuess}
            {view.myGuess && <Icon name="check" size={13} />}
          </button>
        </div>
      )}

      {amIn && <p className="ml-hint">{guessing ? s.play.tapToGuess : s.play.tapToVote}</p>}

      <ul className="ml-grid" data-mode={guessing ? 'guess' : 'vote'}>
        {candidates.map((p) => {
          const self = p.id === meId;
          const blocked = !guessing && self && !view.selfVote;
          const isVote = view.myVote === p.id;
          const isGuess = view.myGuess === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                className="ml-tile"
                aria-pressed={guessing ? isGuess : isVote}
                data-vote={isVote || undefined}
                data-guess={isGuess || undefined}
                disabled={!amIn || blocked}
                title={blocked ? s.play.noSelf : undefined}
                onClick={() => void pick(p.id)}
              >
                <span className="ml-tile-av">
                  <Avatar avatar={avatarOf(p)} nick={p.nick} size={52} dim={!p.connected} />
                  {voted.has(p.id) && (
                    <span className="ml-tile-done" aria-label="oy verdi">
                      <Icon name="check" size={11} />
                    </span>
                  )}
                </span>
                <span className="ml-tile-name">{self ? `${p.nick} (${s.play.you})` : p.nick}</span>
                {(isVote || isGuess) && (
                  <span className="ml-tile-tags">
                    {isVote && <span className="ml-tag">{s.play.myVote}</span>}
                    {isGuess && (
                      <span className="ml-tag" data-kind="guess">
                        {s.play.myGuess}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="ml-status">
        <p className="ml-progress">
          <span className="mono">{s.play.progress(voters.filter((p) => voted.has(p.id)).length, voters.length)}</span>
          <span className="ml-progress-bar" aria-hidden="true">
            <span style={{ width: `${voters.length ? (voters.filter((p) => voted.has(p.id)).length / voters.length) * 100 : 0}%` }} />
          </span>
        </p>
        {view.waitingFor.length > 0 && (
          <p className="dim ml-small">
            {s.play.waiting}: {joinNames(view.waitingFor.map(nick))}
          </p>
        )}
        <p className="dim ml-small">
          {view.anonymous ? s.play.anonymousNote : s.play.openNote} {view.endsAt === 0 && s.play.untimed}
        </p>
      </div>

      {isHost && (
        <div className="ml-host">
          <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skip', ...base })}>
            <Icon name="skip" size={14} />
            {s.play.skip}
          </button>
          {view.voted.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'reveal', ...base })}>
              {s.play.revealNow}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Reveal({
  view,
  meId,
  isHost,
  nick,
  plainNick,
  send,
}: {
  view: MostLikelyView;
  meId: string;
  isHost: boolean;
  nick: Nick;
  plainNick: Nick;
  send: Send;
}) {
  const r = view.result;
  if (!r) return null;
  const byId = new Map(view.people.map((p) => [p.id, p]));
  const max = r.counts[0]?.votes ?? 0;
  const last = view.totalRounds !== null && view.round >= view.totalRounds;
  const byTarget = new Map<string, string[]>();
  for (const b of r.ballots ?? []) byTarget.set(b.target, [...(byTarget.get(b.target) ?? []), b.voter]);
  // Oy almayanlar da çubukta sıfırla görünsün.
  const rows = [
    ...r.counts,
    ...view.people.filter((p) => p.present && !r.counts.some((c) => c.id === p.id)).map((p) => ({ id: p.id, votes: 0 })),
  ];

  return (
    <section className="ml-reveal">
      <Question prompt={view.prompt} compact />

      {r.winners.length ? (
        <div className="ml-winner" data-tie={r.winners.length > 1 || undefined}>
          <p className="ml-winner-label">{r.winners.length > 1 ? s.play.winnerTie : s.play.winnerOne}</p>
          <div className="ml-winner-avs">
            {r.winners.map((id) => {
              const p = byId.get(id);
              return p ? <Avatar key={id} avatar={avatarOf(p)} nick={p.nick} size={r.winners.length > 2 ? 56 : 84} /> : null;
            })}
          </div>
          <p className="ml-winner-name">{joinNames(r.winners.map(plainNick))}</p>
          <p className="ml-winner-title">
            {s.title(view.prompt.text)} <span className="mono dim">{s.play.votes(max)}</span>
          </p>
        </div>
      ) : (
        <p className="ml-empty">{s.play.noVotes}</p>
      )}

      <ol className="ml-bars">
        {rows.map((c, i) => {
          const p = byId.get(c.id);
          const voters = byTarget.get(c.id) ?? [];
          return (
            <li key={c.id} className="ml-bar" data-win={r.winners.includes(c.id) || undefined} data-me={c.id === meId || undefined} style={{ '--i': i } as CSSProperties}>
              <div className="ml-bar-head">
                {p && <Avatar avatar={avatarOf(p)} nick={p.nick} size={24} dim={!p.present} />}
                <span className="ml-bar-name">{nick(c.id)}</span>
                <span className="ml-bar-n mono">{c.votes}</span>
              </div>
              <span className="ml-bar-track" aria-hidden="true">
                <span className="ml-bar-fill" style={{ width: max ? `${(c.votes / max) * 100}%` : '0%' }} />
              </span>
              {r.ballots && voters.length > 0 && (
                <p className="ml-bar-voters">
                  <span className="dim">{s.play.votedBy}:</span> {joinNames(voters.map(nick))}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {r.correctGuessers && (
        <p className="ml-guessers">
          {r.correctGuessers.length ? s.play.correctGuess(joinNames(r.correctGuessers.map(nick))) : s.play.nobodyGuessed}
        </p>
      )}

      {isHost ? (
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'next', round: view.round })}>
          {last ? s.play.finish : s.play.next}
        </button>
      ) : (
        <p className="dim ml-small ml-center">{s.play.waitHost}</p>
      )}
    </section>
  );
}

function titlesOf(view: MostLikelyView, id: string): string[] {
  return view.history.filter((h) => h.winners.includes(id)).map((h) => h.text);
}

function Players({ view, meId }: { view: MostLikelyView; meId: string }) {
  const showGuess = view.predict || Object.keys(view.guessScores).length > 0;
  const rows = view.people
    .filter((p) => p.present)
    .map((p) => ({ p, titles: titlesOf(view, p.id).length, guess: view.guessScores[p.id] ?? 0 }))
    .sort((a, b) => b.titles - a.titles || b.guess - a.guess);
  return (
    <section className="ml-side">
      <h2 className="ml-side-title">{s.side.players}</h2>
      <ul className="sg-score-list">
        {rows.map(({ p, titles, guess }) => (
          <li key={p.id} className="sg-score" data-me={p.id === meId || undefined}>
            <Avatar avatar={avatarOf(p)} nick={p.nick} size={26} dim={!p.connected} />
            <span className="sg-score-name">{p.nick}</span>
            <span className="sg-score-pts ml-score-pts">
              <span>{s.side.titles(titles)}</span>
              {showGuess && <span className="dim">{s.side.guessPts(guess)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function History({ view, nick }: { view: MostLikelyView; nick: Nick }) {
  const items = [...view.history].reverse();
  return (
    <section className="ml-side">
      <h2 className="ml-side-title">{s.side.history}</h2>
      {items.length === 0 ? (
        <p className="sgs-hint">{s.side.historyEmpty}</p>
      ) : (
        <ol className="ml-history">
          {items.map((h) => (
            <li key={h.round}>
              <span className="ml-history-who">{joinNames(h.winners.map(nick))}</span>
              <span className="ml-history-what">{s.title(h.text)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Podium({ view, meId }: { view: MostLikelyView; meId: string }) {
  const rows = view.people
    .filter((p) => p.present)
    .map((p) => ({ p, titles: titlesOf(view, p.id), guess: view.guessScores[p.id] ?? 0 }))
    .sort((a, b) => b.titles.length - a.titles.length || b.guess - a.guess);
  const top = rows[0]?.titles.length ?? 0;
  const kings = top > 0 ? rows.filter((r) => r.titles.length === top) : [];
  const showGuess = Object.keys(view.guessScores).length > 0 || view.predict;
  return (
    <main className="col podium ml-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="podium-kicker dim">{s.podium.title}</p>
      <div className="podium-winner">
        {kings.length > 0 && (
          <div className="ml-winner-avs">
            {kings.map(({ p }) => (
              <Avatar key={p.id} avatar={avatarOf(p)} nick={p.nick} size={72} />
            ))}
          </div>
        )}
        <h1 className="podium-name">{kings.length ? joinNames(kings.map((k) => k.p.nick)) : s.podium.nobody}</h1>
        {kings.length > 0 && <p className="podium-score mono">{s.podium.king(top)}</p>}
      </div>
      <ul className="ml-final">
        {rows.map(({ p, titles, guess }) => (
          <li key={p.id} data-me={p.id === meId || undefined}>
            <Avatar avatar={avatarOf(p)} nick={p.nick} size={36} />
            <div>
              <p className="ml-final-name">
                {p.nick}
                {showGuess && <span className="mono dim"> {s.podium.guess(guess)}</span>}
              </p>
              <p className="ml-final-titles">{titles.length ? titles.map(s.title).join(', ') : <span className="dim">{s.podium.noTitles}</span>}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
