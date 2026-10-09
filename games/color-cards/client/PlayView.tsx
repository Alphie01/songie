import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { COLORS, VALUES, cardPoints, type Card, type CardColor, type ColorCardsSettings, type ColorCardsView } from '../shared/index.js';
import { CardBack, CardFace, Swatch } from './CardArt';
import { guide } from './guide';
import { SettingsPanel } from './SettingsPanel';
import { COLOR_NAME, cardName, s } from './strings';

type Send = (a: unknown) => Promise<boolean>;
type Nick = (id: string | undefined) => string;
type Members = Map<string, RoomPlayer>;

function useRemaining(view: ColorCardsView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

const COLOR_RANK = new Map<CardColor | null, number>([...COLORS.map((c, i) => [c, i] as const), [null, 9]]);
const VALUE_RANK = new Map(VALUES.map((v, i) => [v, i]));
const sortHand = (hand: Card[]) =>
  [...hand].sort((a, b) => COLOR_RANK.get(a.color)! - COLOR_RANK.get(b.color)! || VALUE_RANK.get(a.value)! - VALUE_RANK.get(b.value)!);

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<ColorCardsView, ColorCardsSettings>) {
  const members: Members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick: Nick = (id) => (id ? (members.get(id)?.nick ?? '?') : '?');
  const isHost = room.hostId === meId;
  const remaining = useRemaining(view);
  const [error, setError] = useState<string | null>(null);

  async function send(action: unknown): Promise<boolean> {
    setError(null);
    try {
      const res = await act(action);
      if (!res.ok) setError(res.error);
      return res.ok;
    } catch {
      setError(s.play.error);
      return false;
    }
  }

  if (view.phase === 'over') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: ColorCardsSettings) => void setSettings(n) };
  const mine = view.current === meId && view.me.inGame;

  return (
    <div className="cc sg" data-active={view.activeColor ?? undefined}>
      <aside className="sg-side sg-left">
        {view.mode === 'points' && <Scores view={view} members={members} meId={meId} />}
        <Log view={view} nick={nick} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round">{!view.me.inGame ? s.play.spectator : mine ? s.play.yourTurn : s.play.turnOf(nick(view.current))}</span>
          {view.mode === 'points' && <span className="mono dim">{s.play.round(view.round)}</span>}
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Seats view={view} members={members} meId={meId} />
        <Table view={view} />
        <Catch view={view} meId={meId} nick={nick} send={send} />
        {view.phase === 'roundOver' ? (
          <RoundOver view={view} nick={nick} remaining={remaining} />
        ) : (
          <Status view={view} meId={meId} isHost={isHost} nick={nick} members={members} remaining={remaining} send={send} />
        )}
        {view.me.inGame && <HandArea view={view} meId={meId} nick={nick} send={send} />}

        {error && (
          <p className="error-text cc-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          {view.mode === 'points' && <Scores view={view} members={members} meId={meId} />}
          <Log view={view} nick={nick} />
          <Rules view={view} />
        </div>

        <HowTo />
      </main>

      <aside className="sg-side sg-right">
        <Rules view={view} />
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>

      <ChallengeDialog view={view} meId={meId} nick={nick} send={send} remaining={remaining} />
      <RevealDialog view={view} nick={nick} />
    </div>
  );
}

// ---------- Oyuncular ----------

function Seats({ view, members, meId }: { view: ColorCardsView; members: Members; meId: string }) {
  return (
    <ol className="cc-seats" aria-label="Oyuncular" data-dir={view.dir}>
      {view.players.map((p) => {
        const m = members.get(p.id);
        const current = view.current === p.id && view.phase !== 'roundOver';
        return (
          <li key={p.id} className="cc-seat" data-current={current || undefined} data-me={p.id === meId || undefined} data-exposed={view.exposed === p.id || undefined}>
            <span className="cc-seat-avatar">{m ? <Avatar avatar={m.avatar} nick={m.nick} size={34} dim={!m.connected} /> : null}</span>
            <span className="cc-seat-name">
              {m?.nick ?? '?'}
              {p.id === meId && <span className="dim"> ({s.play.you})</span>}
            </span>
            <span className="cc-seat-cards mono" aria-label={s.play.cardCount(p.cards)}>
              <span className="cc-fan" aria-hidden="true" data-n={Math.min(p.cards, 3)} />
              {p.cards}
            </span>
            {p.called && p.cards <= 2 && <span className="cc-seat-badge">{s.play.calledBadge}</span>}
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Masa: deste, açık kart, etkin renk, yön ----------

function Table({ view }: { view: ColorCardsView }) {
  const lastSeq = view.lastPlay?.seq ?? 0;
  return (
    <section className="cc-table" aria-label="Masa">
      <div className="cc-pile">
        <span className="cc-stack" data-count={Math.min(view.deckCount, 3)}>
          <CardBack size="lg" />
        </span>
        <span className="cc-pile-label">
          {s.play.deck} <b className="mono">{view.deckCount}</b>
        </span>
      </div>

      <div className="cc-ring" data-color={view.activeColor ?? 'wild'}>
        <svg className="cc-orbit" data-dir={view.dir} viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <marker id="cc-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className="cc-orbit-headfill" />
            </marker>
          </defs>
          <circle cx="100" cy="100" r="92" className="cc-orbit-track" />
          <g className="cc-orbit-spin">
            <path
              d={view.dir === 1 ? 'M100 8 A92 92 0 0 1 179.7 54' : 'M179.7 54 A92 92 0 0 0 100 8'}
              className="cc-orbit-arc"
              markerEnd="url(#cc-head)"
            />
            <path
              d={view.dir === 1 ? 'M100 192 A92 92 0 0 1 20.3 146' : 'M20.3 146 A92 92 0 0 0 100 192'}
              className="cc-orbit-arc"
              markerEnd="url(#cc-head)"
            />
          </g>
        </svg>
        <span className="cc-discard" key={lastSeq} data-fresh={lastSeq > 0 || undefined}>
          {view.top && <CardFace card={view.top} size="lg" />}
        </span>
      </div>

      <div className="cc-active">
        <Swatch color={view.activeColor} />
        <span>
          <span className="dim">{s.play.activeColor}</span>
          <b>{view.activeColor ? COLOR_NAME[view.activeColor] : '—'}</b>
        </span>
        <span className="dim cc-small">{view.dir === 1 ? s.play.dirCw : s.play.dirCcw}</span>
      </div>
    </section>
  );
}

function Timer({ remaining, total }: { remaining: number; total: number }) {
  if (!total) return null;
  return (
    <span className="cc-timer" aria-hidden="true">
      <span style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }} />
    </span>
  );
}

// ---------- Yakalama şeridi ----------

function Catch({ view, meId, nick, send }: { view: ColorCardsView; meId: string; nick: Nick; send: Send }) {
  if (!view.exposed || view.phase === 'roundOver') return null;
  if (view.exposed === meId) {
    return (
      <div className="cc-alert" role="alert">
        <p>{s.play.exposedMe}</p>
        <button type="button" className="btn btn-lg cc-last-btn" onClick={() => void send({ type: 'callLast' })}>
          {s.play.lastCard}
        </button>
      </div>
    );
  }
  if (!view.me.inGame) return null;
  return (
    <button type="button" className="btn btn-lg btn-block cc-catch-btn" onClick={() => void send({ type: 'catch', target: view.exposed })}>
      {s.play.catchBtn(nick(view.exposed))}
    </button>
  );
}

// ---------- Durum ----------

function Status({
  view,
  meId,
  isHost,
  nick,
  members,
  remaining,
  send,
}: {
  view: ColorCardsView;
  meId: string;
  isHost: boolean;
  nick: Nick;
  members: Members;
  remaining: number;
  send: Send;
}) {
  const mine = view.current === meId && view.me.inGame;
  const disconnected = members.get(view.current)?.connected === false;
  let text: string;
  if (view.phase === 'color') text = mine ? s.play.startColorMe : s.play.startColorOther(nick(view.current));
  else if (view.phase === 'challenge' && view.challenge) text = s.play.challengeOther(nick(view.challenge.victim), nick(view.challenge.by));
  else if (mine) text = view.drew ? s.play.afterDraw : view.penalty ? s.play.myTurnPenalty(view.penalty) : s.play.myTurn;
  else text = view.penalty ? s.play.otherPenalty(nick(view.current), view.penalty) : s.play.otherTurn(nick(view.current));

  return (
    <section className="cc-status" data-mine={mine || undefined} aria-live="polite">
      <p className={mine ? 'cc-status-title' : undefined}>{text}</p>
      {view.phase === 'color' && mine && (
        <div className="cc-colors">
          {COLORS.map((c) => (
            <button key={c} type="button" className="cc-colorbtn" data-color={c} onClick={() => void send({ type: 'pickColor', color: c })}>
              {COLOR_NAME[c]}
            </button>
          ))}
        </div>
      )}
      <Timer remaining={remaining} total={view.durationMs} />
      {isHost && !mine && disconnected && (
        <div className="cc-hostskip">
          <p className="dim cc-small">{s.play.hostSkipHint}</p>
          <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'skipTurn' })}>
            {s.play.hostSkip(nick(view.current))}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------- El ----------

function HandArea({ view, meId, nick, send }: { view: ColorCardsView; meId: string; nick: Nick; send: Send }) {
  const hand = useMemo(() => sortHand(view.me.hand), [view.me.hand]);
  const [picking, setPicking] = useState<{ card: Card; color?: CardColor } | null>(null);
  const playable = new Set(view.me.playable);
  const myTurn = view.current === meId && (view.phase === 'play' || view.phase === 'challenge');
  const canAct = view.current === meId && view.phase === 'play';
  const others = view.players.filter((p) => p.id !== meId);
  const me = view.players.find((p) => p.id === meId);
  const canCall = hand.length > 0 && hand.length <= 2 && !me?.called && view.phase !== 'roundOver' && view.exposed !== meId;

  // Sıra değişince açık seçici kapanır.
  useEffect(() => setPicking(null), [view.step]);

  function choose(card: Card) {
    if (!playable.has(card.id)) return;
    const needsColor = card.color === null;
    const needsSwap = view.rules.sevenZero && card.value === '7' && hand.length > 1 && others.length > 1;
    if (needsColor || needsSwap) {
      setPicking({ card });
      return;
    }
    void send({ type: 'play', cardId: card.id });
  }

  function finish(extra: { color?: CardColor; swapWith?: string }) {
    if (!picking) return;
    void send({ type: 'play', cardId: picking.card.id, ...extra }).then((ok) => ok && setPicking(null));
  }

  const bluff = picking?.card.value === 'wild4' && hand.some((c) => c.color === view.activeColor && c.id !== picking.card.id);

  return (
    <section className="cc-handarea" data-turn={myTurn || undefined}>
      <div className="cc-hand-head">
        <h2 className="cc-hand-title">
          {s.play.hand} <span className="mono dim">{hand.length}</span>
        </h2>
        {canCall && (
          <button type="button" className="btn cc-last-btn" onClick={() => void send({ type: 'callLast' })} title={s.play.lastCardHint}>
            {s.play.lastCard}
          </button>
        )}
        {me?.called && hand.length <= 2 && <span className="cc-called">{s.play.lastCardDone}</span>}
      </div>

      <ul className="cc-hand" aria-label={s.play.hand}>
        {hand.map((c) => {
          const ok = playable.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                className="cc-cardbtn"
                data-playable={(myTurn && ok) || undefined}
                data-dim={(myTurn && !ok) || undefined}
                data-drawn={view.drawnId === c.id || undefined}
                disabled={!ok}
                aria-label={cardName(c)}
                onClick={() => choose(c)}
              >
                <CardFace card={c} />
              </button>
            </li>
          );
        })}
      </ul>

      {picking && (
        <div className="cc-picker" role="dialog" aria-label={picking.card.color === null ? s.play.chooseColorFor(cardName(picking.card)) : s.play.chooseSwap}>
          {picking.card.color === null && !picking.color ? (
            <>
              <p className="cc-status-title">{s.play.chooseColorFor(cardName(picking.card))}</p>
              {bluff && <p className="cc-small cc-warn">{s.play.bluffWarn}</p>}
              <div className="cc-colors">
                {COLORS.map((col) => (
                  <button key={col} type="button" className="cc-colorbtn" data-color={col} onClick={() => finish({ color: col })}>
                    {COLOR_NAME[col]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="cc-status-title">{s.play.chooseSwap}</p>
              <div className="chips">
                {others.map((p) => (
                  <button key={p.id} type="button" className="chip" onClick={() => finish({ swapWith: p.id })}>
                    {nick(p.id)}
                    <span className="chip-count">{p.cards}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setPicking(null)}>
            {s.play.cancel}
          </button>
        </div>
      )}

      {canAct && !picking && (
        <div className="cc-actions">
          {view.drew ? (
            <button type="button" className="btn btn-outline btn-lg btn-block" onClick={() => void send({ type: 'pass', step: view.step })}>
              {s.play.pass}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void send({ type: 'draw', step: view.step })}>
              {view.penalty ? s.play.takePenalty(view.penalty) : s.play.draw}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ---------- +4 itirazı ----------

function ChallengeDialog({ view, meId, nick, send, remaining }: { view: ColorCardsView; meId: string; nick: Nick; send: Send; remaining: number }) {
  const ch = view.challenge;
  if (view.phase !== 'challenge' || !ch || ch.victim !== meId) return null;
  const canStack = view.me.playable.length > 0;
  return (
    <div className="cc-overlay" role="alertdialog" aria-labelledby="cc-ch-title">
      <div className="cc-overlay-body">
        <span className="cc-overlay-card">{view.top && <CardFace card={view.top} size="lg" />}</span>
        <h2 id="cc-ch-title" className="cc-overlay-title">
          {s.play.challengeTitle(nick(ch.by))}
        </h2>
        <p className="muted cc-small">{s.play.challengeHint(ch.penalty)}</p>
        {canStack && <p className="cc-small">{s.play.challengeStackHint}</p>}
        <Timer remaining={remaining} total={view.durationMs} />
        <div className="cc-overlay-actions">
          <button type="button" className="btn btn-lg btn-block cc-cheat-btn" onClick={() => void send({ type: 'challenge', step: view.step })}>
            {s.play.challengeBtn}
          </button>
          <button type="button" className="btn btn-outline btn-lg btn-block" onClick={() => void send({ type: 'accept', step: view.step })}>
            {s.play.acceptBtn(ch.penalty)}
          </button>
        </div>
        {canStack && (
          <ul className="cc-hand cc-hand-center">
            {view.me.hand
              .filter((c) => view.me.playable.includes(c.id))
              .map((c) => (
                <li key={c.id}>
                  <StackFour card={c} send={send} />
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StackFour({ card, send }: { card: Card; send: Send }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="cc-cardbtn" data-playable aria-label={cardName(card)} onClick={() => setOpen(true)}>
        <CardFace card={card} />
      </button>
    );
  return (
    <div className="cc-colors">
      {COLORS.map((col) => (
        <button key={col} type="button" className="cc-colorbtn" data-color={col} onClick={() => void send({ type: 'play', cardId: card.id, color: col })}>
          {COLOR_NAME[col]}
        </button>
      ))}
    </div>
  );
}

function RevealDialog({ view, nick }: { view: ColorCardsView; nick: Nick }) {
  const [closed, setClosed] = useState(0);
  const r = view.reveal;
  if (!r || closed === r.seq) return null;
  return (
    <div className="cc-overlay" role="dialog" aria-labelledby="cc-rv-title" onClick={() => setClosed(r.seq)}>
      <div className="cc-overlay-body" onClick={(e) => e.stopPropagation()}>
        <h2 id="cc-rv-title" className="cc-overlay-title">
          {s.play.revealTitle(nick(r.of))}
        </h2>
        <p className={r.guilty ? 'cc-verdict' : 'cc-verdict cc-verdict-clean'}>{r.guilty ? s.play.revealGuilty : s.play.revealClean}</p>
        <ul className="cc-hand cc-hand-center">
          {sortHand(r.cards).map((c) => (
            <li key={c.id}>
              <CardFace card={c} size="sm" />
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary btn-lg btn-block" autoFocus onClick={() => setClosed(r.seq)}>
          {s.play.close}
        </button>
      </div>
    </div>
  );
}

// ---------- El sonu, skor, günlük ----------

function RoundOver({ view, nick, remaining }: { view: ColorCardsView; nick: Nick; remaining: number }) {
  const r = view.roundResult;
  if (!r) return null;
  return (
    <section className="cc-status cc-roundover" aria-live="polite">
      <p className="cc-status-title">{s.play.roundOverTitle(nick(r.winner))}</p>
      <p className="cc-points mono">{s.play.roundOverPoints(r.points)}</p>
      <ul className="cc-roundlist">
        {r.hands
          .filter((x) => x.id !== r.winner)
          .map((x) => (
            <li key={x.id}>
              <span>{nick(x.id)}</span>
              <span className="mono dim">
                {s.play.cardCount(x.cards)}, {x.points} p
              </span>
            </li>
          ))}
      </ul>
      <p className="dim cc-small">{s.play.nextRound(Math.ceil(remaining / 1000))}</p>
      <Timer remaining={remaining} total={view.durationMs} />
    </section>
  );
}

function Scores({ view, members, meId }: { view: ColorCardsView; members: Members; meId: string }) {
  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  return (
    <section className="sg-scores">
      <h2 className="cc-side-title">
        {s.play.scores} <span className="dim mono">{s.play.target(view.target)}</span>
      </h2>
      <ol className="sg-score-list">
        {ranked.map((p, i) => {
          const m = members.get(p.id);
          return (
            <li key={p.id} className="sg-score" data-me={p.id === meId || undefined} data-first={(i === 0 && p.score > 0) || undefined}>
              {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} />}
              <span className="sg-score-name">{m?.nick ?? '?'}</span>
              <span className="sg-score-pts mono">{p.score}</span>
              <span className="cc-scorebar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (p.score / view.target) * 100)}%` }} />
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Log({ view, nick }: { view: ColorCardsView; nick: Nick }) {
  const entries = [...view.log].reverse();
  return (
    <section className="cc-log" aria-labelledby="cc-log-title">
      <h2 id="cc-log-title" className="cc-side-title">
        {s.play.log}
      </h2>
      <ol className="cc-log-list">
        {entries.map((e) => (
          <li key={e.seq} data-t={e.t}>
            {e.card && <span className="cc-log-dot" data-color={e.card.color ?? e.color ?? 'wild'} aria-hidden="true" />}
            {s.log(e, nick)}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Rules({ view }: { view: ColorCardsView }) {
  const on = [
    view.rules.stacking && s.settings.stacking,
    view.rules.sevenZero && s.settings.sevenZero,
    view.rules.drawUntilPlayable && s.settings.drawUntil,
  ].filter(Boolean) as string[];
  return (
    <section className="cc-rulesbox">
      <h2 className="cc-side-title">{s.play.rules}</h2>
      <p className="cc-small">
        {view.mode === 'single' ? s.settings.single : s.settings.points}
        {view.rules.turnSeconds > 0 && `, ${s.settings.sec(view.rules.turnSeconds)}`}
      </p>
      <p className="cc-small dim">{on.length ? on.join(', ') : s.play.noHouse}</p>
    </section>
  );
}

const LEGEND: Pick<Card, 'color' | 'value'>[] = [
  { color: 'green', value: '7' },
  { color: 'yellow', value: 'skip' },
  { color: 'red', value: 'reverse' },
  { color: 'purple', value: 'draw2' },
  { color: null, value: 'wild' },
  { color: null, value: 'wild4' },
];

function HowTo() {
  const flow = guide.sections.filter((x) => ['Amaç', 'Sıra sende', '+4 ve “Hile!”', 'Son kart!'].includes(x.title));
  const cards = guide.sections.find((x) => x.title === 'Kartlar')!.items!;
  return (
    <section className="howto" aria-labelledby="cc-howto">
      <h2 id="cc-howto" className="howto-title">
        Nasıl oynanır
      </h2>
      <ol className="howto-list">
        {flow.map((sec, i) => (
          <li key={sec.title}>
            <span className="howto-n mono">{i + 1}</span>
            <div>
              <h3>{sec.title}</h3>
              <p>{sec.body?.split('\n\n')[0]}</p>
            </div>
          </li>
        ))}
      </ol>
      <dl className="cc-legend">
        {LEGEND.map((card, i) => (
          <div key={card.value} className="cc-legend-row">
            <dt>
              <CardFace card={card} size="sm" />
              {cards[i]!.term}
            </dt>
            <dd>
              {cards[i]!.text} <span className="dim mono">{card.value === '7' ? '0–9' : cardPoints(card)} p</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Podium({ view, members, meId }: { view: ColorCardsView; members: Members; meId: string }) {
  const winner = view.winner ? members.get(view.winner) : null;
  const ranked = [...view.players].sort((a, b) => {
    if (view.mode === 'points' && b.score !== a.score) return b.score - a.score;
    if (a.id === view.winner) return -1;
    if (b.id === view.winner) return 1;
    return a.cards - b.cards;
  });
  return (
    <main className="col podium cc-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <div className="podium-winner">
        {view.top && <CardFace card={view.top} size="lg" />}
        <h1 className="podium-name">{winner ? s.podium.winner(winner.nick) : s.podium.none}</h1>
      </div>
      <section>
        <h2 className="cc-side-title">{s.podium.order}</h2>
        <ol className="sg-score-list">
          {ranked.map((p) => {
            const m = members.get(p.id);
            return (
              <li key={p.id} className="sg-score" data-me={p.id === meId || undefined} data-first={p.id === view.winner || undefined}>
                {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} />}
                <span className="sg-score-name">{m?.nick ?? '?'}</span>
                <span className="sg-score-pts mono">{view.mode === 'points' ? s.podium.pts(p.score) : s.podium.cards(p.cards)}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
