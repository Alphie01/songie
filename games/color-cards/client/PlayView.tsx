import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
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

  if (view.phase === 'over') return <Podium view={view} members={members} room={room} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: ColorCardsSettings) => void setSettings(n) };
  const mine = view.current === meId && view.me.inGame;
  const turnText = !view.me.inGame ? s.play.spectator : mine ? s.play.yourTurn : s.play.turnOf(nick(view.current));

  return (
    <div className="cc sg" data-active={view.activeColor ?? undefined}>
      <aside className="sg-side sg-left">
        {view.mode === 'points' && <Scores view={view} members={members} meId={meId} />}
        <Log view={view} nick={nick} />
      </aside>

      <main className="sg-center cc-main">
        <header className="cc-top">
          <span className="cc-turn" data-mine={(mine && view.phase !== 'roundOver') || undefined}>
            {turnText}
          </span>
          {view.mode === 'points' && <span className="cc-round">{s.play.round(view.round)}</span>}
          <span className="cc-code">{room.code}</span>
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
        <section className="cc-panel">
          <SettingsPanel {...panelProps} section="secondary" />
        </section>
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
          <li
            key={p.id}
            className="cc-seat"
            data-current={current || undefined}
            data-me={p.id === meId || undefined}
            data-exposed={view.exposed === p.id || undefined}
            data-off={m?.connected === false || undefined}
            aria-current={current || undefined}
          >
            {p.called && p.cards <= 2 && <span className="cc-seat-badge">{s.play.calledBadge}</span>}
            <span className="cc-seat-name">
              {m?.nick ?? '?'}
              {p.id === meId && <span className="cc-seat-me"> ({s.play.you})</span>}
            </span>
            <span className="cc-seat-cards">{s.play.cardCount(p.cards)}</span>
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
      <div className="cc-cards">
        <div className="cc-pile">
          <CardBack />
          <span className="cc-pile-label">
            {s.play.deck} {view.deckCount}
          </span>
        </div>
        <div className="cc-ring" data-color={view.activeColor ?? 'wild'}>
          <span className="cc-discard" key={lastSeq} data-fresh={lastSeq > 0 || undefined}>
            {view.top && <CardFace card={view.top} size="lg" />}
          </span>
        </div>
      </div>
      <p className="cc-active">
        <Swatch color={view.activeColor} />
        {s.play.activeColor} {view.activeColor ? COLOR_NAME[view.activeColor] : '—'} · {view.dir === 1 ? s.play.dirCw : s.play.dirCcw}
      </p>
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
        <button type="button" className="btn cc-last-btn" onClick={() => void send({ type: 'callLast' })}>
          {s.play.lastCard}
        </button>
      </div>
    );
  }
  if (!view.me.inGame) return null;
  return (
    <button type="button" className="btn btn-block cc-catch-btn" onClick={() => void send({ type: 'catch', target: view.exposed })}>
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
    <section className="cc-status" aria-live="polite">
      <p className="cc-hint">{text}</p>
      <Timer remaining={remaining} total={view.durationMs} />
      {isHost && !mine && disconnected && (
        <div className="cc-hostskip">
          <p className="cc-small">{s.play.hostSkipHint}</p>
          <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'skipTurn' })}>
            {s.play.hostSkip(nick(view.current))}
          </button>
        </div>
      )}
      {view.phase === 'color' && mine && (
        <Modal label={s.play.chooseColor}>
          <h2 className="cc-modal-title">{s.play.startColorMe}</h2>
          <ColorGrid onPick={(c) => void send({ type: 'pickColor', color: c })} />
        </Modal>
      )}
    </section>
  );
}

function Modal({ label, labelledBy, role = 'dialog', onClose, children }: { label?: string; labelledBy?: string; role?: 'dialog' | 'alertdialog'; onClose?: () => void; children: ReactNode }) {
  return (
    <div className="cc-overlay" role={role} aria-modal="true" aria-label={label} aria-labelledby={labelledBy} onClick={onClose}>
      <div className="cc-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ColorGrid({ onPick }: { onPick(c: CardColor): void }) {
  return (
    <div className="cc-colors">
      {COLORS.map((c) => (
        <button key={c} type="button" className="cc-colorbtn" data-color={c} onClick={() => onPick(c)}>
          {COLOR_NAME[c]}
        </button>
      ))}
    </div>
  );
}

// ---------- El ----------

function HandArea({ view, meId, nick, send }: { view: ColorCardsView; meId: string; nick: Nick; send: Send }) {
  const hand = useMemo(() => sortHand(view.me.hand), [view.me.hand]);
  const [picking, setPicking] = useState<{ card: Card } | null>(null);
  const [lockedHint, setLockedHint] = useState(false);
  const playable = new Set(view.me.playable);
  const myTurn = view.current === meId && (view.phase === 'play' || view.phase === 'challenge');
  const canAct = view.current === meId && view.phase === 'play';
  const others = view.players.filter((p) => p.id !== meId);
  const me = view.players.find((p) => p.id === meId);
  const called = !!me?.called && hand.length <= 2;
  const canCall = hand.length > 0 && hand.length <= 2 && !me?.called && view.phase !== 'roundOver' && view.exposed !== meId;

  // Sıra değişince açık seçici kapanır.
  useEffect(() => setPicking(null), [view.step]);
  useEffect(() => setLockedHint(false), [hand.length]);

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
  const n = hand.length;
  const spread = n > 1 ? Math.min(6, 48 / (n - 1)) : 0;

  return (
    <section className="cc-handarea" data-turn={myTurn || undefined}>
      {lockedHint && (
        <p className="cc-hint" role="status">
          {s.play.lastCardLocked}
        </p>
      )}
      <div className="cc-hand-head">
        <h2 className="cc-hand-title">
          {s.play.hand} {n}
        </h2>
        <button
          type="button"
          className="cc-last-btn"
          aria-disabled={!canCall || undefined}
          data-done={called || undefined}
          title={s.play.lastCardHint}
          onClick={() => (canCall ? void send({ type: 'callLast' }) : !called && setLockedHint(true))}
        >
          {called ? s.play.lastCardDone : s.play.lastCard}
        </button>
      </div>

      <ul className="cc-hand" aria-label={s.play.hand} style={{ '--n': Math.max(n, 1) } as CSSProperties}>
        {hand.map((c, i) => {
          const ok = playable.has(c.id);
          return (
            <li key={c.id} style={{ '--r': `${(i - (n - 1) / 2) * spread}deg` } as CSSProperties}>
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

      {canAct && view.drew ? (
        <button type="button" className="btn btn-outline btn-block cc-draw" onClick={() => void send({ type: 'pass', step: view.step })}>
          {s.play.pass}
        </button>
      ) : (
        <button type="button" className="btn btn-yellow btn-block cc-draw" disabled={!canAct} onClick={() => void send({ type: 'draw', step: view.step })}>
          {view.penalty && canAct ? s.play.takePenalty(view.penalty) : s.play.draw}
        </button>
      )}

      {picking && (
        <Modal label={picking.card.color === null ? s.play.chooseColorFor(cardName(picking.card)) : s.play.chooseSwap} onClose={() => setPicking(null)}>
          {picking.card.color === null ? (
            <>
              <h2 className="cc-modal-title">{s.play.chooseColorFor(cardName(picking.card))}</h2>
              {bluff && <p className="cc-modal-warn">{s.play.bluffWarn}</p>}
              <ColorGrid onPick={(col) => finish({ color: col })} />
            </>
          ) : (
            <>
              <h2 className="cc-modal-title">{s.play.chooseSwap}</h2>
              <div className="cc-swaps">
                {others.map((p) => (
                  <button key={p.id} type="button" className="cc-swapbtn" onClick={() => finish({ swapWith: p.id })}>
                    <span>{nick(p.id)}</span>
                    <span className="cc-swapbtn-n">{s.play.cardCount(p.cards)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <button type="button" className="cc-modal-cancel" onClick={() => setPicking(null)}>
            {s.play.cancel}
          </button>
        </Modal>
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
    <Modal role="alertdialog" labelledBy="cc-ch-title">
      <span className="cc-modal-card">{view.top && <CardFace card={view.top} />}</span>
      <h2 id="cc-ch-title" className="cc-modal-title">
        {s.play.challengeTitle(nick(ch.by))}
      </h2>
      <p className="cc-modal-text">{s.play.challengeHint(ch.penalty)}</p>
      {canStack && <p className="cc-modal-text">{s.play.challengeStackHint}</p>}
      <Timer remaining={remaining} total={view.durationMs} />
      <button type="button" className="btn btn-block cc-cheat-btn" onClick={() => void send({ type: 'challenge', step: view.step })}>
        {s.play.challengeBtn}
      </button>
      <button type="button" className="cc-modal-cancel" onClick={() => void send({ type: 'accept', step: view.step })}>
        {s.play.acceptBtn(ch.penalty)}
      </button>
      {canStack && (
        <ul className="cc-row">
          {view.me.hand
            .filter((c) => view.me.playable.includes(c.id))
            .map((c) => (
              <li key={c.id}>
                <StackFour card={c} send={send} />
              </li>
            ))}
        </ul>
      )}
    </Modal>
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
  return <ColorGrid onPick={(col) => void send({ type: 'play', cardId: card.id, color: col })} />;
}

function RevealDialog({ view, nick }: { view: ColorCardsView; nick: Nick }) {
  const [closed, setClosed] = useState(0);
  const r = view.reveal;
  if (!r || closed === r.seq) return null;
  return (
    <Modal labelledBy="cc-rv-title" onClose={() => setClosed(r.seq)}>
      <h2 id="cc-rv-title" className="cc-modal-title">
        {s.play.revealTitle(nick(r.of))}
      </h2>
      <p className="cc-verdict" data-guilty={r.guilty || undefined}>
        {r.guilty ? s.play.revealGuilty : s.play.revealClean}
      </p>
      <ul className="cc-row">
        {sortHand(r.cards).map((c) => (
          <li key={c.id}>
            <CardFace card={c} size="sm" />
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary btn-block cc-draw" autoFocus onClick={() => setClosed(r.seq)}>
        {s.play.close}
      </button>
    </Modal>
  );
}

// ---------- El sonu, skor, günlük ----------

function RoundOver({ view, nick, remaining }: { view: ColorCardsView; nick: Nick; remaining: number }) {
  const r = view.roundResult;
  if (!r) return null;
  return (
    <section className="cc-roundover" aria-live="polite">
      <h2 className="cc-roundover-title">{s.play.roundOverTitle(nick(r.winner))}</h2>
      <p className="cc-roundover-pts">{s.play.roundOverPoints(r.points)}</p>
      <ul className="cc-roundlist">
        {r.hands
          .filter((x) => x.id !== r.winner)
          .map((x) => (
            <li key={x.id}>
              <span>{nick(x.id)}</span>
              <span>
                {s.play.cardCount(x.cards)}, {x.points} p
              </span>
            </li>
          ))}
      </ul>
      <p className="cc-small">{s.play.nextRound(Math.ceil(remaining / 1000))}</p>
      <Timer remaining={remaining} total={view.durationMs} />
    </section>
  );
}

function Scores({ view, members, meId }: { view: ColorCardsView; members: Members; meId: string }) {
  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  return (
    <section className="cc-panel">
      <h2 className="cc-panel-title">
        {s.play.scores} <span className="cc-panel-sub">{s.play.target(view.target)}</span>
      </h2>
      <ol className="cc-scores">
        {ranked.map((p, i) => {
          const m = members.get(p.id);
          return (
            <li key={p.id} className="cc-score" data-me={p.id === meId || undefined} data-first={(i === 0 && p.score > 0) || undefined}>
              {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} />}
              <span className="cc-score-name">{m?.nick ?? '?'}</span>
              <span className="cc-score-pts">{p.score}</span>
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
    <section className="cc-panel" aria-labelledby="cc-log-title">
      <h2 id="cc-log-title" className="cc-panel-title">
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
    <section className="cc-panel">
      <h2 className="cc-panel-title">{s.play.rules}</h2>
      <p className="cc-rules-main">
        {view.mode === 'single' ? s.settings.single : s.settings.points}
        {view.rules.turnSeconds > 0 && `, ${s.settings.sec(view.rules.turnSeconds)}`}
      </p>
      <p className="cc-small">{on.length ? on.join(', ') : s.play.noHouse}</p>
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

// ---------- Oyun sonu (tasarım: Sonuçlar) ----------

function Podium({ view, members, room }: { view: ColorCardsView; members: Members; room: PlayViewProps<ColorCardsView, ColorCardsSettings>['room'] }) {
  const winner = view.winner ? members.get(view.winner) : null;
  const points = view.mode === 'points';
  const ranked = [...view.players].sort((a, b) => {
    if (points && b.score !== a.score) return b.score - a.score;
    if (a.id === view.winner) return -1;
    if (b.id === view.winner) return 1;
    return a.cards - b.cards;
  });
  const [first, second, ...rest] = ranked;
  const half = Math.ceil(rest.length / 2);
  const big = (p: (typeof ranked)[number]) => (points ? p.score : p.cards);
  const sub = (p: (typeof ranked)[number]) => (points ? s.podium.pts(p.score) : s.podium.cardsLeft(p.cards));
  return (
    <main className="col cc-over">
      <span className="cc-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="cc-over-top">
        <span>{s.name}</span>
        <span className="cc-over-code">{room.code}</span>
      </div>
      <div className="cc-over-head">
        <span className="cc-over-sticker">{s.podium.over}</span>
        <h1 className="cc-over-title">{winner ? s.podium.winner(winner.nick) : s.podium.none}</h1>
      </div>
      {first && (
        <div className="cc-over-scores">
          <div className="cc-over-card" data-first>
            <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
              <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <span className="cc-over-score">{big(first)}</span>
            <span className="cc-over-name">{members.get(first.id)?.nick ?? '?'}</span>
            <span className="cc-over-sub">{sub(first)}</span>
          </div>
          {second && (
            <>
              <span className="cc-over-dash" aria-hidden="true">
                –
              </span>
              <div className="cc-over-card">
                <span className="cc-over-score">{big(second)}</span>
                <span className="cc-over-name">{members.get(second.id)?.nick ?? '?'}</span>
                <span className="cc-over-sub">{sub(second)}</span>
              </div>
            </>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="cc-over-rosters">
          {[rest.slice(0, half), rest.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="cc-over-roster" start={3 + i * half}>
                  {col.map((p) => {
                    const m = members.get(p.id);
                    return (
                      <li key={p.id}>
                        {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                        <span className="cc-over-roster-name">{m?.nick ?? '?'}</span>
                        <span className="cc-over-roster-score">{points ? p.score : s.podium.cards(p.cards)}</span>
                      </li>
                    );
                  })}
                </ol>
              ),
          )}
        </div>
      )}
      <div className="cc-over-spacer" />
      <div className="cc-over-foot">
        <div className="cc-over-bar" aria-hidden="true">
          <div />
        </div>
        <p className="cc-over-note">{s.podium.back}</p>
      </div>
    </main>
  );
}
