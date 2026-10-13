import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { FiveSecondsSettings, FiveSecondsView, Prompt, TeamId } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Members = Map<string, RoomPlayer>;
type Send = (a: unknown) => Promise<void>;

const CATEGORY_LABEL: Record<string, string> = {
  genel: 'Genel',
  ask: 'Aşk ve ilk buluşma',
  'is-okul': 'İş ve okul',
  yemek: 'Yemek',
  turkiye: 'Türkiye',
  'pop-kultur': 'Pop kültür',
  sacma: 'Saçma sapan',
  cesur: 'Cesur',
  arkadas: 'Arkadaş görevi',
};

/** Sunucunun podyum süresi (server/game.ts DEFAULT_TIMING.podiumMs); yalnızca çubuk animasyonu için. */
const PODIUM_MS = 8_000;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Sunucu saatine göre kalan süre; animasyon karesinde güncellenir (halka akıcı dönsün). */
function useRemaining(endsAt: number, serverNow: number, active: boolean): number {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return Math.max(0, endsAt - (now + offset));
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<FiveSecondsView, FiveSecondsSettings>) {
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

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: FiveSecondsSettings) => void setSettings(n) };
  const mine = view.performerId === meId;
  const phaseLabel =
    view.phase === 'ready'
      ? s.play.phase.ready
      : view.phase === 'countdown'
        ? mine
          ? s.play.phase.mine
          : s.play.phase.speaking(nick(view.performerId))
        : s.play.phase.vote;

  return (
    <div className="fs sg">
      <aside className="sg-side sg-left">
        <Scoreboard view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center fs-main">
        <header className="fs-head">
          <span className="fs-pill">
            {s.name} · {phaseLabel}
          </span>
          <span className="fs-code">{room.code}</span>
        </header>

        {view.phase === 'ready' && <Ready view={view} mine={mine} isHost={isHost} nick={nick} send={send} />}
        {view.phase === 'countdown' && <Countdown view={view} mine={mine} isHost={isHost} send={send} />}
        {view.phase === 'vote' && <Vote view={view} meId={meId} mine={mine} nick={nick} send={send} members={members} />}

        {isHost && (
          <div className="fs-host">
            {view.prompt && (
              <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'swap', attemptId: view.attemptId })}>
                {s.play.swap}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skip', attemptId: view.attemptId })}>
              {s.play.skip}
            </button>
          </div>
        )}

        {error && (
          <p className="error-text fs-center" role="alert">
            {error}
          </p>
        )}

        {view.phase !== 'vote' && (
          <div className="sg-mobile-only fs-after">
            <Scoreboard view={view} members={members} meId={meId} />
          </div>
        )}

        <section className="fs-howto" aria-labelledby="fs-howto">
          <h2 id="fs-howto" className="fs-box-title">
            {s.howto.title}
          </h2>
          <ol className="fs-howto-list">
            {s.howto.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="fs-howto-n">{i + 1}</span>
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
        <section className="fs-side-settings">
          <SettingsPanel {...panelProps} section="secondary" />
        </section>
      </aside>
    </div>
  );
}

function PromptCard({ prompt, dim = false }: { prompt: Prompt; dim?: boolean }) {
  return (
    <div className="fs-prompt" data-dim={dim || undefined}>
      <span className="fs-prompt-cat">{CATEGORY_LABEL[prompt.category] ?? prompt.category}</span>
      <p className="fs-prompt-text">{prompt.text}</p>
    </div>
  );
}

function Ready({ view, mine, isHost, nick, send }: { view: FiveSecondsView; mine: boolean; isHost: boolean; nick: (id: string) => string; send: Send }) {
  const seconds = Math.round(view.durationMs / 1000);
  const start = () => void send({ type: 'ready', attemptId: view.attemptId });
  const steal = view.stealFrom && view.prompt;
  return (
    <section className="fs-ready">
      {view.lastResult && !view.stealFrom && <LastResult view={view} nick={nick} />}

      {steal ? (
        <>
          <div className="fs-steal">
            <p className="fs-steal-title">{s.play.stealTitle}</p>
            <p>{s.play.stealBody(nick(view.stealFrom!), nick(view.performerId))}</p>
          </div>
          <PromptCard prompt={view.prompt!} dim />
        </>
      ) : null}

      {mine ? (
        <h1 className="fs-turn-title">{s.play.yourTurn}</h1>
      ) : (
        <h1 className="fs-turn-title">
          <span className="fs-turn-label">{s.play.next}</span>
          {nick(view.performerId)}
        </h1>
      )}

      {!steal && (
        <div className="fs-five" aria-hidden="true">
          {seconds}
        </div>
      )}

      <p className="fs-hint">{mine ? s.play.readyHint(seconds) : s.play.waiting(nick(view.performerId))}</p>

      <div className="fs-spacer" />
      {mine ? (
        <button type="button" className="fs-big fs-big-mint" onClick={start}>
          {s.play.ready}
        </button>
      ) : (
        isHost && (
          <button type="button" className="btn btn-ghost fs-self-center" onClick={start}>
            {s.play.readyFor(nick(view.performerId))}
          </button>
        )
      )}
    </section>
  );
}

function Ring({ fraction, label, low }: { fraction: number; label: string; low: boolean }) {
  const R = 100;
  const C = 2 * Math.PI * R;
  return (
    <div className="fs-ring" data-low={low || undefined} role="timer" aria-live="off" aria-label={`${label} ${s.play.seconds}`}>
      <svg viewBox="0 0 230 230" aria-hidden="true">
        <circle className="fs-ring-track" cx="115" cy="115" r={R} />
        <circle
          className="fs-ring-fill"
          cx="115"
          cy="115"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.max(0, Math.min(1, fraction)))}
          transform="rotate(-90 115 115)"
        />
      </svg>
      <span className="fs-ring-num">{label}</span>
    </div>
  );
}

/** Yalnızca görsel yardımcı: söylenen her şey için dokun. Sunucuya gitmez. */
function ThreeCounter({ resetKey }: { resetKey: string }) {
  const [n, setN] = useState(0);
  useEffect(() => setN(0), [resetKey]);
  return (
    <div className="fs-three">
      <span className="fs-three-label" id="fs-three-label">
        {s.play.counter}
      </span>
      <div className="fs-pips" role="group" aria-labelledby="fs-three-label">
        {[1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            className="fs-pip"
            aria-pressed={i <= n}
            aria-label={s.play.pip(i)}
            onClick={() => setN((x) => (x === i ? i - 1 : i))}
          >
            {i}
          </button>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {s.play.counterLabel(n)}
      </span>
    </div>
  );
}

function Countdown({ view, mine, isHost, send }: { view: FiveSecondsView; mine: boolean; isHost: boolean; send: Send }) {
  const remaining = useRemaining(view.endsAt, view.serverNow, true);
  const secs = Math.ceil(remaining / 1000);
  const low = remaining <= Math.max(2000, view.durationMs * 0.3);
  const lastBuzz = useRef<number | null>(null);

  // Son saniyelerde telefonda kısa titreşim (hareket azaltma açıksa yok).
  useEffect(() => {
    if (!low || secs <= 0 || lastBuzz.current === secs || reducedMotion()) return;
    lastBuzz.current = secs;
    try {
      navigator.vibrate?.(40);
    } catch {
      /* desteklenmiyor */
    }
  }, [low, secs]);

  return (
    <section className="fs-turn">
      {view.stealFrom && <span className="fs-steal-tag">{s.play.stealTitle}</span>}
      {view.prompt && <PromptCard key={view.prompt.id} prompt={view.prompt} />}
      <Ring fraction={remaining / view.durationMs} label={String(secs)} low={low} />
      <ThreeCounter resetKey={`${view.attemptId}:${view.prompt?.id ?? ''}`} />
      <div className="fs-spacer" />
      {(mine || isHost) && (
        <button type="button" className="fs-big fs-big-yellow" onClick={() => void send({ type: 'done', attemptId: view.attemptId })}>
          {s.play.done}
        </button>
      )}
    </section>
  );
}

function Vote({ view, meId, mine, nick, send, members }: { view: FiveSecondsView; meId: string; mine: boolean; nick: (id: string) => string; send: Send; members: Members }) {
  const remaining = useRemaining(view.voteEndsAt, view.serverNow, true);
  const total = view.voters.length;
  const count = view.voted.filter((id) => view.voters.includes(id)).length;
  const canVote = !mine && view.order.includes(meId);
  const vote = (success: boolean) => void send({ type: 'vote', attemptId: view.attemptId, success });
  const tally = view.tally ?? { yes: 0, no: 0 };
  const card = (yes: boolean) => {
    const body = (
      <>
        <span className="fs-tally-n">{yes ? tally.yes : tally.no}</span>
        <span className="fs-tally-label">{yes ? s.play.voteYes : s.play.voteNo}</span>
      </>
    );
    return canVote ? (
      <button type="button" className="fs-tally" data-yes={yes || undefined} aria-pressed={view.myVote === yes} onClick={() => vote(yes)}>
        {body}
      </button>
    ) : (
      <div className="fs-tally" data-yes={yes || undefined}>
        {body}
      </div>
    );
  };
  return (
    <section className="fs-turn fs-vote-wrap">
      {view.prompt && <PromptCard prompt={view.prompt} dim />}
      <h1 className="fs-vote-title">{mine || !canVote ? s.play.voteWait : s.play.voteTitle(nick(view.performerId))}</h1>
      <div className="fs-tallies">
        {card(true)}
        {card(false)}
      </div>
      <p className="fs-vote-count">
        {s.play.voteCount(count, total)} · {s.play.voteHint}
      </p>
      <span className="fs-vote-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (remaining / Math.max(1, view.voteMs)) * 100)}%` }} />
      </span>
      {view.myVote !== null && <p className="fs-hint">{s.play.voteChange}</p>}
      <div className="fs-spacer" />
      <div className="sg-mobile-only">
        <Scoreboard view={view} members={members} meId={meId} />
      </div>
    </section>
  );
}

function LastResult({ view, nick }: { view: FiveSecondsView; nick: (id: string) => string }) {
  const r = view.lastResult!;
  const who = nick(r.performerId) === s.play.you ? s.play.youCap : nick(r.performerId);
  const title = r.skipped ? s.play.result.skipped(who) : r.success ? (r.steal ? s.play.result.stolen(who) : s.play.result.success(who)) : s.play.result.fail(who);
  const parts = [r.success ? `${title} +1` : title];
  if (r.prompt) parts.push(`“${r.prompt}”`);
  if (!r.skipped) parts.push(s.play.votes(r.yes, r.no));
  return (
    <p className="fs-last" data-ok={r.success || undefined}>
      {parts.join(' · ')}
    </p>
  );
}

function ranking(view: FiveSecondsView): string[] {
  return [...view.order].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0));
}

function Scoreboard({ view, members, meId }: { view: FiveSecondsView; members: Members; meId: string }) {
  const name = (id: string) => (id === meId ? s.play.youCap : (members.get(id)?.nick ?? '?'));
  if (view.teamMode && view.teams && view.teamScores) {
    return (
      <section className="fs-teams" aria-label={s.play.scoreboard}>
        {(['a', 'b'] as TeamId[]).map((t) => (
          <div key={t} className="fs-team" data-team={t}>
            <h2 className="fs-team-head">
              <span>{s.team[t]}</span>
              <span>{view.teamScores![t]}</span>
            </h2>
            <ul className="fs-team-list">
              {view.teams![t].map((id) => {
                const m = members.get(id);
                if (!m) return null;
                return (
                  <li key={id} data-me={id === meId || undefined} data-off={!m.connected || undefined} data-active={view.performerId === id || undefined}>
                    <Avatar avatar={m.avatar} nick={m.nick} size={26} />
                    <span className="fs-team-name">{name(id)}</span>
                    <span className="fs-team-pts">{view.scores[id] ?? 0}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    );
  }
  const ranked = ranking(view);
  return (
    <section className="fs-box">
      <h2 className="fs-box-title">{s.play.scoreboardRound(s.play.round(view.round, view.totalRounds))}</h2>
      <ol className="fs-score-list">
        {ranked.map((id) => {
          const m = members.get(id);
          if (!m) return null;
          const rank = 1 + ranked.findIndex((x) => (view.scores[x] ?? 0) === (view.scores[id] ?? 0));
          return (
            <li key={id} data-me={id === meId || undefined} data-off={!m.connected || undefined} data-active={view.performerId === id || undefined}>
              <span>
                {rank}. {name(id)}
              </span>
              <span>{view.scores[id] ?? 0}</span>
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

function Podium({ view, members, meId, code }: { view: FiveSecondsView; members: Members; meId: string; code: string }) {
  const ranked = ranking(view);
  const nick = (id: string) => (members.get(id)?.nick ?? '?') + (id === meId ? ' (sen)' : '');
  const ts = view.teamScores;
  const teams = view.teams;
  const pts = (id: string) => view.scores[id] ?? 0;

  let title: string;
  let cards: { label: string; score: number }[];
  if (ts && teams) {
    const order: TeamId[] = ts.b > ts.a ? ['b', 'a'] : ['a', 'b'];
    title = ts.a === ts.b ? s.podium.draw : s.podium.winnerTeam(s.team[order[0]!]);
    cards = order.map((t) => ({ label: s.team[t], score: ts[t] }));
  } else {
    const [a, b] = ranked;
    title = a && (!b || pts(a) > pts(b)) ? s.podium.winner(nick(a)) : s.podium.draw;
    cards = ranked.slice(0, 2).map((id) => ({ label: nick(id), score: pts(id) }));
  }
  const firstTeam: TeamId | null = ts ? (ts.b > ts.a ? 'b' : 'a') : null;

  return (
    <main className="col fs-podium">
      <span className="fs-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="fs-podium-top">
        <span>{s.name}</span>
        <span className="fs-code">{code}</span>
      </div>

      <div className="fs-podium-head">
        <span className="fs-sticker">{s.podium.gameOver}</span>
        <h1 className="fs-podium-title">{title}</h1>
        <p className="fs-podium-sub">{s.podium.title}</p>
      </div>

      {cards.length > 0 && (
        <div className="fs-pcards">
          <div className="fs-pcard fs-pcard-first" data-team={firstTeam === 'b' ? 'b' : undefined}>
            <Crown />
            <span className="fs-pcard-score">{cards[0]!.score}</span>
            <span className="fs-pcard-name">{cards[0]!.label}</span>
          </div>
          {cards[1] && (
            <>
              <span className="fs-pdash" aria-hidden="true">
                –
              </span>
              <div className="fs-pcard fs-pcard-second" data-team={firstTeam === 'b' ? 'a' : undefined}>
                <span className="fs-pcard-score">{cards[1].score}</span>
                <span className="fs-pcard-name">{cards[1].label}</span>
              </div>
            </>
          )}
        </div>
      )}

      {ts && teams ? (
        <div className="fs-rosters">
          {(['a', 'b'] as TeamId[]).map((t) => (
            <ul key={t} className="fs-roster" data-team={t}>
              <li className="fs-roster-title">{s.team[t]}</li>
              {teams[t].map((id) => {
                const m = members.get(id);
                return (
                  <li key={id}>
                    {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                    <span className="fs-roster-name">{nick(id)}</span>
                    <span className="fs-roster-score">{pts(id)}</span>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      ) : (
        ranked.length > 2 && (
          <ol className="fs-roster" start={3}>
            {ranked.slice(2).map((id, i) => {
              const m = members.get(id);
              return (
                <li key={id}>
                  <span className="fs-roster-rank">{i + 3}.</span>
                  {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                  <span className="fs-roster-name">{nick(id)}</span>
                  <span className="fs-roster-score">{pts(id)}</span>
                </li>
              );
            })}
          </ol>
        )
      )}

      <div className="fs-spacer" />
      <div className="fs-podium-foot">
        <div className="fs-podium-bar" aria-hidden="true">
          <div style={{ animationDuration: `${PODIUM_MS}ms` }} />
        </div>
        <p className="fs-podium-note">{s.podium.back}</p>
      </div>
    </main>
  );
}
