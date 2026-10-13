import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { SIGNS, type Card, type CardResult, type CharadesSettings, type CharadesView, type TeamId } from '../shared/index.js';
import { KindIcon } from './KindIcon';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

function useRemaining(view: CharadesView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, view.endsAt - (now + offset));
}

const RESULT_ICON: Record<CardResult, 'check' | 'skip' | 'x'> = { correct: 'check', pass: 'skip', foul: 'x' };
const TEAMS: TeamId[] = ['a', 'b'];

type Send = (a: unknown) => Promise<void>;
type Nick = (id: string) => string;

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<CharadesView, CharadesSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const rawNick = (id: string) => members.get(id)?.nick ?? '?';
  const isHost = room.hostId === meId;
  const remaining = useRemaining(view);
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: CharadesSettings) => void setSettings(n) };

  return (
    <div className="ch">
      <main className="ch-col">
        <div className="ch-screen">
          <header className="ch-top">
            <span className="ch-pill">
              {s.name} · {s.play.turn(view.turnNumber, view.totalTurns)}
            </span>
            <span className="ch-code">{room.code}</span>
          </header>

          <Scores view={view} />

          {view.phase === 'ready' ? (
            <Ready view={view} meId={meId} isHost={isHost} nick={nick} rawNick={rawNick} members={members} send={send} />
          ) : (
            <Turn view={view} remaining={remaining} nick={rawNick} send={send} />
          )}
          {error && (
            <p className="error-text ch-center" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="ch-more">
          <Rosters view={view} members={members} meId={meId} />
          <section className="ch-box" aria-label={s.settings.seconds}>
            <SettingsPanel {...panelProps} section="secondary" />
          </section>
          <HowTo />
        </div>
      </main>
    </div>
  );
}

function HowTo() {
  return (
    <section className="ch-box ch-howto" aria-labelledby="ch-howto">
      <h2 id="ch-howto" className="ch-box-title">
        {s.howto.title}
      </h2>
      <ol className="ch-howto-list">
        {s.howto.steps.map(([title, body], i) => (
          <li key={title}>
            <span className="ch-howto-n">{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <h3 className="ch-box-title ch-signs-title">{s.howto.signsTitle}</h3>
      <dl className="ch-signs">
        {s.howto.signs.map(([title, body]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Scores({ view }: { view: CharadesView }) {
  return (
    <div className="ch-scores">
      {TEAMS.map((t) => (
        <div key={t} className="ch-score" data-team={t} data-active={view.team === t || undefined}>
          <span className="ch-score-name">
            {s.team[t]}
            {view.myTeam === t && ` (${s.play.you})`}
          </span>
          <span className="ch-score-pts">{view.scores[t]}</span>
        </div>
      ))}
    </div>
  );
}

/** Klasik işaretler şeridi: anlatıcı dokunur, herkesin ekranında son işaret yanar. */
function SignStrip({ view, send }: { view: CharadesView; send: Send }) {
  const narrator = view.role === 'narrator' && !!view.card;
  return (
    <ul className="ch-strip" aria-label={s.play.signsLabel}>
      {SIGNS.map((id) => {
        const on = view.sign?.sign === id || undefined;
        return (
          <li key={id} data-on={on}>
            {narrator ? (
              <button type="button" aria-pressed={!!on} title={s.play.signsTap} onClick={() => void send({ type: 'sign', sign: id })}>
                {s.play.signsShort[id]}
              </button>
            ) : (
              <span>{s.play.signsShort[id]}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LastTurn({ summary, nick }: { summary: NonNullable<CharadesView['lastTurn']>; nick: Nick }) {
  return (
    <div className="ch-last" data-team={summary.team}>
      <p className="ch-last-head">
        <span>{s.play.lastTurn(s.team[summary.team], summary.points)}</span>
        <span className="ch-last-who">{nick(summary.narratorId)}</span>
      </p>
      {summary.cards.length === 0 ? (
        <p className="ch-small">{s.play.noCards}</p>
      ) : (
        <ol className="ch-last-list">
          {summary.cards.map((c, i) => (
            <li key={i} data-result={c.result}>
              <span className="ch-last-mark">
                <Icon name={RESULT_ICON[c.result]} size={14} />
              </span>
              <span className="ch-last-title">{c.title}</span>
              <span className="ch-last-kind" title={s.kind[c.kind]}>
                <KindIcon kind={c.kind} size={16} stroke={2.4} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Ready({
  view,
  meId,
  isHost,
  nick,
  rawNick,
  members,
  send,
}: {
  view: CharadesView;
  meId: string;
  isHost: boolean;
  nick: Nick;
  rawNick: Nick;
  members: Map<string, RoomPlayer>;
  send: Send;
}) {
  const mine = view.narratorId === meId;
  const narrator = members.get(view.narratorId);
  return (
    <>
      <div className="ch-stage ch-stage-ready">
        <div className="ch-next">
          <span className="ch-next-label">{s.play.next}</span>
          {narrator && <Avatar avatar={narrator.avatar} nick={narrator.nick} size={64} />}
          <p className="ch-next-name">{mine ? `${narrator?.nick ?? ''} (${s.play.you})` : rawNick(view.narratorId)}</p>
          <span className="ch-next-team" data-team={view.team}>
            {s.team[view.team]}
          </span>
        </div>
        {view.lastTurn && <LastTurn summary={view.lastTurn} nick={nick} />}
      </div>

      {mine ? (
        <div className="ch-actions">
          <button type="button" className="ch-btn ch-btn-go" onClick={() => void send({ type: 'start' })}>
            {s.play.startMine}
          </button>
          <p className="ch-note">{s.play.startMineHint}</p>
        </div>
      ) : (
        <div className="ch-actions">
          <p className="ch-note">{s.play.waitNarrator(rawNick(view.narratorId))}</p>
          {isHost && (
            <div className="ch-pair">
              <button type="button" className="ch-btn ch-btn-light" onClick={() => void send({ type: 'start' })}>
                {s.play.startForThem(rawNick(view.narratorId))}
              </button>
              <button type="button" className="ch-btn ch-btn-panel" onClick={() => void send({ type: 'skipNarrator' })}>
                {s.play.skipNarrator}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Turn({ view, remaining, nick, send }: { view: CharadesView; remaining: number; nick: Nick; send: Send }) {
  const secs = Math.ceil(remaining / 1000);
  const card = view.card;
  const headline =
    view.role === 'narrator'
      ? s.play.headline.narrator
      : view.role === 'watcher'
        ? s.play.headline.watcher
        : view.role === 'guesser'
          ? s.play.guess(nick(view.narratorId))
          : `${nick(view.narratorId)} ${s.play.narrating}`;
  return (
    <>
      <div className="ch-timer">
        <span className="ch-timer-num" data-low={remaining < 10_000 || undefined}>
          {secs}
        </span>
        <span className="ch-timer-bar" aria-hidden="true">
          <span style={{ width: `${(remaining / view.durationMs) * 100}%` }} />
        </span>
      </div>
      <p className="ch-headline">{headline}</p>

      <div className="ch-stage">
        {card ? (
          <TitleCard card={card} flash={view.flash} />
        ) : (
          <div className="ch-guess">
            <span className="ch-guess-label">{s.play.guessCount}</span>
            <span className="ch-guess-count">{view.turnStats.correct}</span>
            <span className="ch-guess-hint">{view.role === 'guesser' ? s.play.guessHint : s.play.spectator}</span>
            {view.sign && (
              <span key={view.sign.id} className="ch-sign" role="status">
                {s.play.signShown(view.sign.sign, view.sign.kind && s.kind[view.sign.kind], view.sign.words)}
              </span>
            )}
            {view.flash && (
              <span key={view.flash.id} className="ch-flash-text" data-kind={view.flash.kind}>
                {s.play.flash[view.flash.kind]}
              </span>
            )}
          </div>
        )}
      </div>

      <dl className="ch-stats">
        {(['correct', 'pass', 'foul'] as const).map((k) => (
          <div key={k} data-kind={k}>
            <dt>{s.play.stats[k]}</dt>
            <dd>{view.turnStats[k]}</dd>
          </div>
        ))}
      </dl>

      <SignStrip view={view} send={send} />

      {view.role === 'narrator' && card && (
        <div className="ch-actions">
          <button type="button" className="ch-btn ch-btn-go" onClick={() => void send({ type: 'correct', cardId: card.id })}>
            {s.play.correct}
          </button>
          <div className="ch-pair">
            <button
              type="button"
              className="ch-btn ch-btn-light"
              disabled={view.passesLeft !== null && view.passesLeft <= 0}
              onClick={() => void send({ type: 'pass', cardId: card.id })}
            >
              {s.play.pass(view.passesLeft)}
            </button>
            <button type="button" className="ch-btn ch-btn-panel" disabled={!view.canUndo} onClick={() => void send({ type: 'undo' })}>
              {s.play.undo}
            </button>
          </div>
        </div>
      )}

      {view.role === 'watcher' && card && (
        <div className="ch-actions">
          <button type="button" className="ch-btn ch-btn-foul" onClick={() => void send({ type: 'foul', cardId: card.id })}>
            {s.play.foul}
          </button>
          <p className="ch-note">{s.play.foulHint(view.foulPenalty)}</p>
        </div>
      )}
    </>
  );
}

/** Anlatıcı ve rakip için kart: tür işareti, kelime sayısı ve kelimeler numaralı. */
function TitleCard({ card, flash }: { card: Card; flash: CharadesView['flash'] }) {
  const words = card.title.split(/\s+/).filter(Boolean);
  const longest = Math.max(...words.map((w) => w.length));
  const size = card.title.length > 28 || longest > 12 ? 'sm' : card.title.length > 16 || longest > 9 ? 'md' : 'lg';
  let n = 0;
  return (
    <div className="ch-card" key={card.id}>
      {flash && (
        <span key={flash.id} className="ch-flash" data-kind={flash.kind}>
          {s.play.flash[flash.kind]}
        </span>
      )}
      <div className="ch-card-head">
        <span className="ch-kind">
          <KindIcon kind={card.kind} size={16} stroke={2.6} />
          {s.kind[card.kind]}
        </span>
        <span className="ch-count">{s.words(card.words)}</span>
      </div>
      <p className="ch-title" data-size={size} aria-label={card.title}>
        {words.map((w, i) => {
          const counts = /[\p{L}\p{N}]/u.test(w);
          if (counts) n++;
          return (
            <span key={i} className="ch-word" aria-hidden="true">
              {w}
              {counts && (
                <span className="ch-word-n" title={s.play.wordN(n)}>
                  {n}
                </span>
              )}
            </span>
          );
        })}
      </p>
      <p className="ch-gesture">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 7V3M17 12h4" />
        </svg>
        {s.play.gesture(s.kindGesture[card.kind])}
      </p>
    </div>
  );
}

function Rosters({ view, members, meId }: { view: CharadesView; members: Map<string, RoomPlayer>; meId: string }) {
  return (
    <section className="ch-rosters">
      {TEAMS.map((t) => (
        <div key={t} className="ch-roster" data-team={t}>
          <h2 className="ch-roster-head">
            <span>{s.team[t]}</span>
            <span>{view.scores[t]}</span>
          </h2>
          <ul className="ch-roster-list">
            {view.teams[t].map((id) => {
              const m = members.get(id);
              if (!m) return null;
              return (
                <li key={id} data-off={!m.connected || undefined}>
                  <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected} />
                  <span className="ch-roster-name">
                    {m.nick}
                    {id === meId && ` (${s.play.you})`}
                  </span>
                  {view.phase !== 'podium' && view.narratorId === id && view.team === t && <span className="ch-tag">{s.play.narrating}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Podium({ view, members, meId, code }: { view: CharadesView; members: Map<string, RoomPlayer>; meId: string; code: string }) {
  const { a, b } = view.scores;
  const winner: TeamId | null = a === b ? null : a > b ? 'a' : 'b';
  const order: TeamId[] = winner === 'b' ? ['b', 'a'] : ['a', 'b'];
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <main className="ch-col ch-podium">
      <span className="ch-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="ch-podium-top">
        <span>{s.name}</span>
        <span className="ch-code">{code}</span>
      </div>
      <div className="ch-podium-head">
        <span className="ch-podium-sticker">{s.podium.title}</span>
        <h1 className="ch-podium-title">
          {winner ? (
            <>
              {s.team[winner]}
              <br />
              {s.podium.won}
            </>
          ) : (
            s.podium.draw
          )}
        </h1>
      </div>
      <div className="ch-podium-scores">
        {order.map((t, i) => (
          <div key={t} className="ch-podium-card" data-team={t} data-first={i === 0 || undefined} data-win={winner === t || undefined}>
            {winner === t && (
              <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
                <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            )}
            <span className="ch-podium-score">{view.scores[t]}</span>
            <span className="ch-podium-name">{s.team[t]}</span>
          </div>
        )).flatMap((el, i) => (i === 0 ? [el] : [<span key="dash" className="ch-podium-dash" aria-hidden="true">–</span>, el]))}
      </div>
      <Rosters view={view} members={members} meId={meId} />
      <div className="ch-podium-spacer" />
      <div className="ch-podium-foot">
        <span className="ch-podium-bar" aria-hidden="true">
          <span />
        </span>
        <p className="ch-podium-back" role="status">
          {s.podium.back}
        </p>
      </div>
    </main>
  );
}
