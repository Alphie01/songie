import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, AVATAR_COLOR, Icon } from '@songie/game-kit/ui';
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
const colorOf = (p: Person | undefined) => (p ? (AVATAR_COLOR[avatarOf(p).color] ?? AVATAR_COLOR.mint) : AVATAR_COLOR.mint);

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

  if (view.phase === 'podium') return <Podium view={view} meId={meId} code={room.code} />;

  return (
    <div className="ml">
      <main className="ml-stage">
        <header className="ml-top">
          <span className="ml-pill">{s.play.round(view.round, view.totalRounds)}</span>
          <span className="ml-code">{room.code}</span>
        </header>

        {view.phase === 'vote' ? (
          <Vote view={view} meId={meId} isHost={isHost} nick={nick} send={send} error={error} />
        ) : (
          <Reveal view={view} isHost={isHost} nick={nick} plainNick={plainNick} send={send} error={error} />
        )}
      </main>

      <div className="ml-more">
        <Players view={view} meId={meId} />
        <History view={view} nick={plainNick} />
        <section className="ml-panel ml-settings" aria-labelledby="ml-settings-title">
          <h2 id="ml-settings-title" className="ml-panel-title">
            {s.side.settings}
          </h2>
          <p className="ml-note">{s.side.settingsNote}</p>
          <SettingsPanel
            settings={settings}
            editable={isHost}
            api={api}
            players={room.players}
            meId={meId}
            onChange={(n: MostLikelySettings) => void setSettings(n)}
            section="secondary"
          />
        </section>
      </div>
    </div>
  );
}

function Question({ prompt }: { prompt: Prompt }) {
  return (
    <div className="ml-q" key={prompt.id}>
      <span className="ml-q-tag">{s.prefix}…</span>
      <h1 className="ml-q-text">
        <span className="sr-only">{s.prefix} </span>
        {prompt.text} {s.suffix}
      </h1>
    </div>
  );
}

function Timer({ view }: { view: MostLikelyView }) {
  const remaining = useRemaining(view);
  if (!view.endsAt) return null;
  const secs = Math.ceil(remaining / 1000);
  const low = remaining < 5000 || undefined;
  return (
    <div className="ml-timer" role="timer" aria-label={s.play.timeLeft(secs)}>
      <span className="ml-timer-bar" aria-hidden="true">
        <span style={{ width: `${view.durationMs ? (remaining / view.durationMs) * 100 : 0}%` }} data-low={low} />
      </span>
      <span className="ml-timer-num" data-low={low} aria-hidden="true">
        {secs}
      </span>
    </div>
  );
}

function Vote({ view, meId, isHost, nick, send, error }: { view: MostLikelyView; meId: string; isHost: boolean; nick: Nick; send: Send; error: string | null }) {
  const [mode, setMode] = useState<'vote' | 'guess'>('vote');
  // Yeni soruda oy sekmesine dön; oy verince tahmine geç.
  useEffect(() => setMode('vote'), [view.prompt.id]);
  const candidates = view.people.filter((p) => p.present);
  const voters = candidates.filter((p) => p.connected || view.voted.includes(p.id));
  const voted = new Set(view.voted);
  const doneCount = voters.filter((p) => voted.has(p.id)).length;
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
    <>
      <Timer view={view} />
      <Question prompt={view.prompt} />

      <section className="ml-body">
        {amIn && view.predict && (
          <div className="ml-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'vote'} onClick={() => setMode('vote')}>
              {s.play.modeVote}
              {view.myVote && <Icon name="check" size={15} />}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'guess'} onClick={() => setMode('guess')}>
              {s.play.modeGuess}
              {view.myGuess && <Icon name="check" size={15} />}
            </button>
          </div>
        )}

        {amIn && <p className="ml-hint">{guessing ? s.play.tapToGuess : s.play.tapToVote(view.selfVote)}</p>}

        <ul className="ml-grid">
          {candidates.map((p) => {
            const self = p.id === meId;
            const blocked = !guessing && self && !view.selfVote;
            const isVote = view.myVote === p.id;
            const isGuess = view.myGuess === p.id;
            const on = guessing ? isGuess : isVote;
            const tag = [isVote && s.play.myVote, isGuess && s.play.myGuess].filter(Boolean).join(' · ');
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="ml-tile"
                  aria-pressed={on}
                  disabled={!amIn || blocked}
                  title={blocked ? s.play.noSelf : undefined}
                  onClick={() => void pick(p.id)}
                >
                  <Avatar avatar={avatarOf(p)} nick={p.nick} size={50} dim={!p.connected} />
                  <span className="ml-tile-name">{p.nick}</span>
                  {self && <span className="sr-only">({s.play.you})</span>}
                  {tag && <span className="ml-tile-tag">{tag}</span>}
                  {voted.has(p.id) && (
                    <span className="ml-tile-done">
                      <span className="sr-only">{s.play.voted}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="ml-spacer" />

        <p className="ml-status">
          {s.play.progress(doneCount, voters.length)}
          {view.waitingFor.length > 0 && ` · ${s.play.waiting}: ${joinNames(view.waitingFor.map(nick))}`}
        </p>
        <p className="ml-note">
          {view.anonymous ? s.play.anonymousNote : s.play.openNote}
          {view.endsAt === 0 && ` ${s.play.untimed}`}
        </p>

        {error && (
          <p className="error-text ml-center" role="alert">
            {error}
          </p>
        )}

        {isHost && (
          <>
            <button type="button" className="ml-ghost" onClick={() => void send({ type: 'skip', ...base })}>
              <Icon name="skip" size={15} />
              {s.play.skip}
            </button>
            <button type="button" className="ml-cta" disabled={view.voted.length === 0} onClick={() => void send({ type: 'reveal', ...base })}>
              {s.play.revealNow}
            </button>
          </>
        )}
      </section>
    </>
  );
}

function Reveal({
  view,
  isHost,
  nick,
  plainNick,
  send,
  error,
}: {
  view: MostLikelyView;
  isHost: boolean;
  nick: Nick;
  plainNick: Nick;
  send: Send;
  error: string | null;
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
    <>
      <Question prompt={view.prompt} />

      <section className="ml-body" aria-live="polite">
        {r.winners.length ? (
          <div className="ml-winner">
            <span className="ml-winner-avs">
              {r.winners.map((id) => {
                const p = byId.get(id);
                return p ? <Avatar key={id} avatar={avatarOf(p)} nick={p.nick} size={r.winners.length > 1 ? 52 : 68} /> : null;
              })}
            </span>
            <span className="ml-winner-text">
              <span className="ml-winner-label">{r.winners.length > 1 ? s.play.winnerTie : s.play.winnerOne}</span>
              <span className="ml-winner-name">{joinNames(r.winners.map(plainNick))}</span>
              <span className="ml-winner-title">{s.play.winnerLine(s.title(view.prompt.text), max)}</span>
            </span>
          </div>
        ) : (
          <p className="ml-empty">{s.play.noVotes}</p>
        )}

        <ol className="ml-bars">
          {rows.map((c) => {
            const p = byId.get(c.id);
            const voters = byTarget.get(c.id) ?? [];
            return (
              <li key={c.id} className="ml-bar" data-zero={c.votes === 0 || undefined}>
                <div className="ml-bar-row">
                  <span className="ml-bar-name">{plainNick(c.id)}</span>
                  <span className="ml-bar-track" aria-hidden="true">
                    {c.votes > 0 && (
                      <span className="ml-bar-fill" style={{ width: `${r.total ? (c.votes / r.total) * 100 : 0}%`, '--c': colorOf(p) } as CSSProperties} />
                    )}
                  </span>
                  <span className="ml-bar-n">{c.votes}</span>
                </div>
                {r.ballots && voters.length > 0 && (
                  <p className="ml-bar-voters">
                    {s.play.votedBy}: {joinNames(voters.map(nick))}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {r.correctGuessers && (
          <p className="ml-guessers">{r.correctGuessers.length ? s.play.correctGuess(joinNames(r.correctGuessers.map(nick))) : s.play.nobodyGuessed}</p>
        )}

        <div className="ml-spacer" />

        {error && (
          <p className="error-text ml-center" role="alert">
            {error}
          </p>
        )}

        {isHost ? (
          <button type="button" className="ml-cta" onClick={() => void send({ type: 'next', round: view.round })}>
            {last ? s.play.finish : s.play.next}
          </button>
        ) : (
          <p className="ml-note ml-center">{s.play.waitHost}</p>
        )}
      </section>
    </>
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
    <section className="ml-panel">
      <h2 className="ml-panel-title">{s.side.players}</h2>
      <ul className="ml-list">
        {rows.map(({ p, titles, guess }) => (
          <li key={p.id} data-me={p.id === meId || undefined}>
            <Avatar avatar={avatarOf(p)} nick={p.nick} size={28} dim={!p.connected} />
            <span className="ml-list-name">
              {p.nick}
              {p.id === meId && ` (${s.play.you})`}
            </span>
            <span className="ml-list-end">
              {s.side.titles(titles)}
              {showGuess && <span className="ml-list-dim"> · {s.side.guessPts(guess)}</span>}
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
    <section className="ml-panel">
      <h2 className="ml-panel-title">{s.side.history}</h2>
      {items.length === 0 ? (
        <p className="ml-note">{s.side.historyEmpty}</p>
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

function Podium({ view, meId, code }: { view: MostLikelyView; meId: string; code: string }) {
  const rows = view.people
    .filter((p) => p.present)
    .map((p) => ({ p, titles: titlesOf(view, p.id), guess: view.guessScores[p.id] ?? 0 }))
    .sort((a, b) => b.titles.length - a.titles.length || b.guess - a.guess);
  const top = rows[0]?.titles.length ?? 0;
  const kings = top > 0 ? rows.filter((r) => r.titles.length === top) : [];
  const [first, second] = rows;
  const showGuess = Object.keys(view.guessScores).length > 0 || view.predict;
  return (
    <main className="ml-end">
      <span className="ml-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="ml-end-top">
        <span>{s.name}</span>
        <span className="ml-end-code">{code}</span>
      </div>
      <div className="ml-end-head">
        <span className="ml-end-sticker">{s.podium.title}</span>
        <h1 className="ml-end-title">{kings.length ? s.podium.winner(joinNames(kings.map((k) => k.p.nick))) : s.podium.nobody}</h1>
      </div>

      {first && top > 0 && (
        <div className="ml-end-scores">
          <div className="ml-end-card" data-first="">
            <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
              <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <span className="ml-end-num">{first.titles.length}</span>
            <span className="ml-end-name">{first.p.nick}</span>
          </div>
          {second && (
            <>
              <span className="ml-end-dash" aria-hidden="true">
                –
              </span>
              <div className="ml-end-card">
                <span className="ml-end-num">{second.titles.length}</span>
                <span className="ml-end-name">{second.p.nick}</span>
              </div>
            </>
          )}
        </div>
      )}

      <section className="ml-end-roster" aria-label={s.podium.titlesLabel}>
        <h2 className="ml-end-roster-title">{s.podium.titlesLabel}</h2>
        <ul>
          {rows.map(({ p, titles, guess }) => (
            <li key={p.id} data-me={p.id === meId || undefined}>
              <Avatar avatar={avatarOf(p)} nick={p.nick} size={28} />
              <span className="ml-end-roster-body">
                <span className="ml-end-roster-name">
                  {p.nick}
                  <span className="ml-end-roster-n">
                    {s.podium.titleCount(titles.length)}
                    {showGuess && ` · ${s.podium.guess(guess)}`}
                  </span>
                </span>
                <span className="ml-end-roster-titles">{titles.length ? titles.map(s.title).join(', ') : s.podium.noTitles}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="ml-spacer" />
      <div className="ml-end-foot">
        <div className="ml-end-bar" aria-hidden="true">
          <div />
        </div>
        <p className="ml-end-note">{s.podium.back}</p>
      </div>
    </main>
  );
}
