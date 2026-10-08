import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { CARD_KINDS, CAT_KINDS, isCat, type Card, type CardKind, type KittenSettings, type KittenView, type PendingKind } from '../shared/index.js';
import { CardBack, CardFace, Glyph } from './CardArt';
import { SettingsPanel } from './SettingsPanel';
import { ACTION_NAME, CARD_NAME, CARD_TEXT, s } from './strings';

type Send = (a: unknown) => Promise<boolean>;
type Nick = (id: string | undefined) => string;

function useRemaining(view: KittenView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

/** Seçili kartlar hangi eylem olur? */
function detect(cards: Card[], fiveCats: boolean): PendingKind | null {
  const kinds = cards.map((c) => c.kind);
  const first = kinds[0];
  if (!first) return null;
  if (cards.length === 1) return first === 'attack' || first === 'skip' || first === 'future' || first === 'shuffle' || first === 'favor' ? first : null;
  const same = kinds.every((k) => k === first) && isCat(first);
  if (same && cards.length === 2) return 'pair';
  if (same && cards.length === 3) return 'triple';
  if (fiveCats && cards.length === 5 && CAT_KINDS.every((k) => kinds.includes(k))) return 'five';
  return null;
}

const SORT = new Map(CARD_KINDS.map((k, i) => [k, i]));
const sortHand = (hand: Card[]) => [...hand].sort((a, b) => SORT.get(a.kind)! - SORT.get(b.kind)!);

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<KittenView, KittenSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
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

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: KittenSettings) => void setSettings(n) };

  return (
    <div className="kt sg">
      <aside className="sg-side sg-left">
        <Log view={view} nick={nick} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round">{view.me.inGame ? (view.me.alive ? (view.current === meId ? s.play.yourTurn : s.play.turnOf(nick(view.current))) : s.play.left) : s.play.spectator}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Seats view={view} members={members} meId={meId} />
        <Table view={view} />
        <Stage view={view} meId={meId} isHost={isHost} nick={nick} remaining={remaining} send={send} members={members} />
        {view.me.inGame && view.me.alive && <HandArea key={view.turn} view={view} meId={meId} nick={nick} send={send} />}

        {error && (
          <p className="error-text kt-center" role="alert">
            {error}
          </p>
        )}

        <div className="sg-mobile-only">
          <Log view={view} nick={nick} />
        </div>

        <HowTo fiveCats={view.fiveCats} />
      </main>

      <aside className="sg-side sg-right">
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>

      <BombOverlay view={view} meId={meId} nick={nick} remaining={remaining} send={send} />
      <Flash view={view} meId={meId} nick={nick} />
      <Future view={view} />
    </div>
  );
}

// ---------- Rakipler ----------

function Seats({ view, members, meId }: { view: KittenView; members: Map<string, RoomPlayer>; meId: string }) {
  return (
    <ol className="kt-seats" aria-label="Oyuncular">
      {view.players.map((p) => {
        const m = members.get(p.id);
        const current = view.current === p.id && p.alive;
        return (
          <li key={p.id} className="kt-seat" data-current={current || undefined} data-out={!p.alive || undefined} data-me={p.id === meId || undefined}>
            <span className="kt-seat-avatar">
              {m ? <Avatar avatar={m.avatar} nick={m.nick} size={34} dim={!m.connected || !p.alive} /> : null}
              {current && view.turnsLeft > 1 && <span className="kt-seat-turns mono">×{view.turnsLeft}</span>}
            </span>
            <span className="kt-seat-name">
              {m?.nick ?? '?'}
              {p.id === meId && <span className="dim"> ({s.play.you})</span>}
            </span>
            <span className="kt-seat-cards mono">{p.alive ? <><span className="kt-pip" aria-hidden="true" />{p.cards}</> : s.play.out}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Masa: deste ve ıskarta ----------

function Table({ view }: { view: KittenView }) {
  return (
    <section className="kt-table">
      <div className="kt-pile">
        <div className="kt-stack" data-count={Math.min(view.deckCount, 3)}>
          <CardBack />
        </div>
        <span className="kt-pile-label">
          {s.play.deckLabel} <b className="mono">{view.deckCount}</b>
        </span>
      </div>
      <div className="kt-pile">
        {view.discardTop ? <CardFace kind={view.discardTop} /> : <span className="kt-slot">{s.play.emptyDiscard}</span>}
        <span className="kt-pile-label">
          {s.play.discardLabel} <b className="mono">{view.discardCount}</b>
        </span>
      </div>
    </section>
  );
}

// ---------- Duruma göre orta panel ----------

function Timer({ remaining, total }: { remaining: number; total: number }) {
  if (!total) return null;
  return (
    <span className="kt-timer" aria-hidden="true">
      <span style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }} />
    </span>
  );
}

function Stage({
  view,
  meId,
  isHost,
  nick,
  remaining,
  send,
  members,
}: {
  view: KittenView;
  meId: string;
  isHost: boolean;
  nick: Nick;
  remaining: number;
  send: Send;
  members: Map<string, RoomPlayer>;
}) {
  const p = view.pending;
  if (view.phase === 'nope' && p) {
    const secs = Math.ceil(remaining / 1000);
    const nope = view.me.alive ? view.me.hand.find((c) => c.kind === 'nope') : undefined;
    return (
      <section className="kt-window" data-cancel={!p.willHappen || undefined} aria-live="polite">
        <div className="kt-window-head">
          <span className="kt-count mono" data-low={secs <= 2 || undefined}>
            {secs}
          </span>
          <div className="kt-window-text">
            <p className="kt-window-title">{s.play.pendingTitle(nick(p.by), ACTION_NAME[p.kind], p.target ? nick(p.target) : null)}</p>
            {p.named && <p className="dim kt-small">{s.play.pendingNamed(CARD_NAME[p.named])}</p>}
            <p className="kt-window-state">
              {p.willHappen ? s.play.willHappen : s.play.willCancel}
              {p.nopes.length > 0 && <span className="kt-nopes mono">{s.play.nopeCount(p.nopes.length)}</span>}
            </p>
          </div>
          <span className="kt-window-cards">
            {p.cards.map((k, i) => (
              <CardFace key={i} kind={k} size="mini" />
            ))}
          </span>
        </div>
        <Timer remaining={remaining} total={view.durationMs} />
        {view.me.alive &&
          (nope ? (
            <button type="button" className="btn btn-lg btn-block kt-nope-btn" onClick={() => void send({ type: 'nope', pendingId: p.id, cardId: nope.id })}>
              <Glyph kind="nope" size={22} />
              {s.play.nopeBtn}
            </button>
          ) : (
            <p className="dim kt-small kt-center">{s.play.noNope}</p>
          ))}
      </section>
    );
  }

  if (view.phase === 'favor' && view.favor && view.favor.to !== meId) {
    return (
      <section className="kt-status">
        <p>{s.play.favorOther(nick(view.favor.from), nick(view.favor.to))}</p>
        <Timer remaining={remaining} total={view.durationMs} />
      </section>
    );
  }

  if (view.phase === 'pick') {
    if (view.discardPick) {
      return (
        <section className="kt-status">
          <p className="kt-status-title">{s.play.pickMe}</p>
          <p className="dim kt-small">{s.play.pickHint}</p>
          <Timer remaining={remaining} total={view.durationMs} />
          <div className="kt-pickgrid">
            {view.discardPick.map((c) => (
              <button key={c.id} type="button" className="kt-cardbtn" onClick={() => void send({ type: 'pick', cardId: c.id })} aria-label={CARD_NAME[c.kind]}>
                <CardFace kind={c.kind} />
              </button>
            ))}
          </div>
        </section>
      );
    }
    return (
      <section className="kt-status">
        <p>{s.play.pickOther(nick(view.current))}</p>
        <Timer remaining={remaining} total={view.durationMs} />
      </section>
    );
  }

  if (view.phase === 'play') {
    const mine = view.current === meId;
    const disconnected = members.get(view.current)?.connected === false;
    return (
      <section className="kt-status" data-mine={mine || undefined}>
        {mine ? <p className="kt-status-title">{s.play.myTurnsLeft(view.turnsLeft)}</p> : <p>{[s.play.turnOf(nick(view.current)), s.play.turnsLeft(view.turnsLeft)].filter(Boolean).join(', ')}</p>}
        {view.myBomb !== null && <p className="kt-secret kt-small">{s.play.myBomb(view.myBomb)}</p>}
        <Timer remaining={remaining} total={view.durationMs} />
        {isHost && !mine && disconnected && (
          <div className="kt-hostskip">
            <p className="dim kt-small">{s.play.hostSkipHint}</p>
            <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'skipTurn' })}>
              {s.play.hostSkip(nick(view.current))}
            </button>
          </div>
        )}
      </section>
    );
  }

  // bomb / place: tam ekran katman gösteriyor; burada kısa bir durum.
  return (
    <section className="kt-status">
      <p>{view.phase === 'place' ? s.play.placeOther(nick(view.current)) : s.play.bombOther(nick(view.current))}</p>
    </section>
  );
}

// ---------- El ----------

function HandArea({ view, meId, nick, send }: { view: KittenView; meId: string; nick: Nick; send: Send }) {
  const hand = useMemo(() => sortHand(view.me.hand), [view.me.hand]);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [named, setNamed] = useState<CardKind | null>(null);
  const giving = view.phase === 'favor' && view.favor?.to === meId;
  const playing = view.phase === 'play' && view.current === meId;

  // Elden çıkan kartları seçimden düş.
  const live = selected.filter((id) => hand.some((c) => c.id === id));
  const cards = live.map((id) => hand.find((c) => c.id === id)!);
  const combo = playing ? detect(cards, view.fiveCats) : null;
  const needsTarget = combo === 'favor' || combo === 'pair' || combo === 'triple';
  const targets = view.players.filter((p) => p.alive && p.id !== meId && p.cards > 0);

  function toggle(card: Card) {
    if (giving) return setSelected([card.id]);
    if (!playing) return;
    setSelected((cur) => (cur.includes(card.id) ? cur.filter((x) => x !== card.id) : [...cur, card.id]));
  }

  async function play() {
    if (!combo) return;
    const ok = await send({ type: 'play', cardIds: live, target: needsTarget ? (target ?? undefined) : undefined, named: combo === 'triple' ? (named ?? undefined) : undefined });
    if (ok) {
      setSelected([]);
      setTarget(null);
      setNamed(null);
    }
  }

  const ready = combo && (!needsTarget || target) && (combo !== 'triple' || named);

  return (
    <section className="kt-handarea" data-active={playing || giving || undefined}>
      {giving && (
        <div className="kt-ask">
          <p className="kt-status-title">{s.play.favorMe(nick(view.favor!.from))}</p>
          <p className="dim kt-small">{s.play.favorMeHint}</p>
        </div>
      )}

      <div className="kt-hand-head">
        <h2 className="kt-hand-title">
          {s.play.hand} <span className="mono dim">{hand.length}</span>
        </h2>
        {live.length > 0 && !giving && (
          <button type="button" className="btn btn-ghost kt-clear" onClick={() => setSelected([])}>
            {s.play.clear}
          </button>
        )}
      </div>

      {hand.length === 0 ? (
        <p className="dim kt-small">{s.play.handEmpty}</p>
      ) : (
        <ul className="kt-hand">
          {hand.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="kt-cardbtn"
                aria-pressed={live.includes(c.id)}
                aria-label={CARD_NAME[c.kind]}
                disabled={!playing && !giving}
                onClick={() => toggle(c)}
              >
                <CardFace kind={c.kind} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {giving && live[0] && (
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void send({ type: 'give', cardId: live[0] })}>
          {s.play.giveBtn(CARD_NAME[cards[0]!.kind])}
        </button>
      )}

      {playing && (
        <div className="kt-actions">
          {live.length === 0 ? (
            <p className="dim kt-small">{s.play.selectHint}</p>
          ) : !combo ? (
            <p className="kt-small kt-warn">{s.play.invalid}</p>
          ) : (
            <>
              {needsTarget && (
                <div className="kt-choose">
                  <span className="kt-choose-label">{s.play.chooseTarget}</span>
                  <div className="chips">
                    {targets.map((p) => (
                      <button key={p.id} type="button" className="chip" aria-pressed={target === p.id} onClick={() => setTarget(p.id)}>
                        {nick(p.id)}
                        <span className="chip-count">{p.cards}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {combo === 'triple' && (
                <div className="kt-choose">
                  <span className="kt-choose-label">{s.play.chooseNamed}</span>
                  <div className="chips">
                    {CARD_KINDS.filter((k) => k !== 'bomb').map((k) => (
                      <button key={k} type="button" className="chip" aria-pressed={named === k} onClick={() => setNamed(k)}>
                        {CARD_NAME[k]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button type="button" className="btn btn-outline btn-lg btn-block" disabled={!ready} onClick={() => void play()}>
                {s.play.playAs(ACTION_NAME[combo])}
              </button>
            </>
          )}
          <button type="button" className="btn btn-primary btn-lg btn-block kt-draw" onClick={() => void send({ type: 'draw', turn: view.turn })}>
            {s.play.draw}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------- Bomba ve geri koyma ----------

function BombOverlay({ view, meId, nick, remaining, send }: { view: KittenView; meId: string; nick: Nick; remaining: number; send: Send }) {
  const [index, setIndex] = useState(0);
  const mine = view.current === meId;
  if (view.phase !== 'bomb' && view.phase !== 'place') return null;
  const secs = Math.ceil(remaining / 1000);
  const max = view.deckCount;

  if (!mine) {
    return (
      <div className="kt-overlay kt-overlay-soft" role="status">
        <div className="kt-overlay-body">
          <span className="kt-bombglyph" data-calm={view.phase === 'place' || undefined}>
            <Glyph kind={view.phase === 'place' ? 'defuse' : 'bomb'} size={84} />
          </span>
          <p className="kt-overlay-title">{view.phase === 'place' ? s.play.placeOther(nick(view.current)) : s.play.bombOther(nick(view.current))}</p>
          {view.phase === 'bomb' && <p className="muted">{s.play.bombOtherHint}</p>}
        </div>
      </div>
    );
  }

  if (view.phase === 'bomb') {
    return (
      <div className="kt-overlay kt-overlay-bomb" role="alertdialog" aria-labelledby="kt-bomb-title">
        <div className="kt-overlay-body">
          <span className="kt-bombglyph">
            <Glyph kind="bomb" size={120} />
          </span>
          <h2 id="kt-bomb-title" className="kt-overlay-title kt-big">
            {s.play.bombMe}
          </h2>
          <p className="muted">{s.play.bombMeHint}</p>
          <button type="button" className="btn btn-primary btn-lg kt-defuse-btn" autoFocus onClick={() => void send({ type: 'defuse' })}>
            <Glyph kind="defuse" size={22} />
            {s.play.defuseBtn}
            <span className="mono kt-btn-secs">{secs}</span>
          </button>
        </div>
      </div>
    );
  }

  const at = Math.min(index, max);
  const label = at === 0 ? s.play.placeTop : at === max ? s.play.placeBottom : s.play.placeAt(at + 1);
  return (
    <div className="kt-overlay kt-overlay-place" role="dialog" aria-labelledby="kt-place-title">
      <div className="kt-overlay-body kt-place">
        <h2 id="kt-place-title" className="kt-overlay-title">
          {s.play.placeMe}
        </h2>
        <p className="muted kt-small">{s.play.placeHint}</p>
        <div className="kt-place-deck" aria-hidden="true">
          {Array.from({ length: Math.min(max + 1, 12) }, (_, i) => {
            const pos = max <= 11 ? i : Math.round((i / 11) * max);
            return <span key={i} className="kt-place-slot" data-on={pos === at || (max > 11 && Math.abs(pos - at) < max / 22) || undefined} />;
          })}
        </div>
        <input
          className="kt-range"
          type="range"
          min={0}
          max={max}
          value={at}
          aria-label={s.play.placeMe}
          aria-valuetext={label}
          onChange={(e) => setIndex(Number(e.target.value))}
        />
        <div className="chips kt-place-quick">
          <button type="button" className="chip" aria-pressed={at === 0} onClick={() => setIndex(0)}>
            {s.play.placeTop}
          </button>
          {max >= 2 && (
            <button type="button" className="chip" aria-pressed={at === 1} onClick={() => setIndex(1)}>
              {s.play.placeAt(2)}
            </button>
          )}
          <button type="button" className="chip" aria-pressed={at === max} onClick={() => setIndex(max)}>
            {s.play.placeBottom}
          </button>
          <button type="button" className="chip" onClick={() => setIndex(Math.floor(Math.random() * (max + 1)))}>
            {s.play.placeRandom}
          </button>
        </div>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void send({ type: 'place', index: at })}>
          {s.play.placeBtn(label)}
          <span className="mono kt-btn-secs">{secs}</span>
        </button>
      </div>
    </div>
  );
}

/** Patlama / etkisiz kılma anı (yalnızca yeni olaylar için). */
function Flash({ view, meId, nick }: { view: KittenView; meId: string; nick: Nick }) {
  const seen = useRef(view.flash?.seq ?? 0);
  const [show, setShow] = useState<KittenView['flash']>(null);
  useEffect(() => {
    const f = view.flash;
    if (!f || f.seq <= seen.current) return;
    seen.current = f.seq;
    setShow(f);
    const t = setTimeout(() => setShow(null), f.t === 'boom' ? 2800 : 1600);
    return () => clearTimeout(t);
  }, [view.flash]);
  if (!show) return null;
  if (show.t === 'defuse') {
    return (
      <div className="kt-toast" role="status">
        <Glyph kind="defuse" size={20} />
        {s.play.defused(nick(show.by))}
      </div>
    );
  }
  return (
    <div className="kt-overlay kt-boom" role="alert" onClick={() => setShow(null)}>
      <div className="kt-overlay-body">
        <span className="kt-boom-ring" aria-hidden="true" />
        <Glyph kind="bomb" size={110} />
        <p className="kt-overlay-title kt-big">{show.by === meId ? s.play.boomMe : s.play.boom(nick(show.by))}</p>
        <p className="muted">{s.play.boomHint}</p>
      </div>
    </div>
  );
}

function Future({ view }: { view: KittenView }) {
  const [closed, setClosed] = useState<number | null>(null);
  const peek = view.peek;
  const [reopen, setReopen] = useState(false);
  if (!peek) return null;
  const open = closed !== peek.seq || reopen;
  if (!open) {
    return (
      <button type="button" className="kt-peekchip" onClick={() => setReopen(true)}>
        <Glyph kind="future" size={18} />
        {s.play.futureAgain}
      </button>
    );
  }
  const close = () => {
    setClosed(peek.seq);
    setReopen(false);
  };
  return (
    <div className="kt-overlay kt-overlay-soft" role="dialog" aria-labelledby="kt-future-title" onClick={close}>
      <div className="kt-overlay-body kt-future" onClick={(e) => e.stopPropagation()}>
        <h2 id="kt-future-title" className="kt-overlay-title">
          {s.play.futureTitle}
        </h2>
        <p className="muted kt-small">{s.play.futureHint}</p>
        <ol className="kt-future-row">
          {peek.cards.map((k, i) => (
            <li key={i}>
              <CardFace kind={k} size="big" />
              <span className="kt-small dim">{s.play.futureSlot(i)}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-primary btn-lg btn-block" autoFocus onClick={close}>
          {s.play.futureClose}
        </button>
      </div>
    </div>
  );
}

// ---------- Günlük, nasıl oynanır, podyum ----------

function Log({ view, nick }: { view: KittenView; nick: Nick }) {
  const entries = [...view.log].reverse();
  return (
    <section className="kt-log" aria-labelledby="kt-log-title">
      <h2 id="kt-log-title" className="kt-side-title">
        {s.play.log}
      </h2>
      <ol className="kt-log-list">
        {entries.map((e) => (
          <li key={e.seq} data-t={e.t}>
            {s.log(e, nick)}
          </li>
        ))}
      </ol>
    </section>
  );
}

function HowTo({ fiveCats }: { fiveCats: boolean }) {
  const single: CardKind[] = ['bomb', 'defuse', 'attack', 'skip', 'future', 'shuffle', 'favor', 'nope'];
  return (
    <section className="howto" aria-labelledby="kt-howto">
      <h2 id="kt-howto" className="howto-title">
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
      <h3 className="kt-howto-sub">{s.howto.cardsTitle}</h3>
      <dl className="kt-legend">
        {single.map((k) => (
          <div key={k} className="kt-legend-row">
            <dt>
              <CardFace kind={k} size="mini" />
              {CARD_NAME[k]}
            </dt>
            <dd>{CARD_TEXT[k]}</dd>
          </div>
        ))}
        <div className="kt-legend-row">
          <dt>
            <span className="kt-legend-cats">
              {CAT_KINDS.map((k) => (
                <CardFace key={k} kind={k} size="mini" />
              ))}
            </span>
            {s.howto.cats}
          </dt>
          <dd>
            {s.howto.catsText} {fiveCats && s.howto.five}
            <span className="kt-catnames dim">{CAT_KINDS.map((k) => CARD_NAME[k]).join(', ')}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Podium({ view, members, meId }: { view: KittenView; members: Map<string, RoomPlayer>; meId: string }) {
  const winner = view.winner ? members.get(view.winner) : null;
  const ranked = [...view.players].sort((a, b) => (b.out ?? 99) - (a.out ?? 99));
  return (
    <main className="col podium kt-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <div className="podium-winner">
        {view.winner && <Glyph kind="defuse" size={56} />}
        <h1 className="podium-name">{winner ? s.podium.winner(winner.nick) : s.podium.none}</h1>
        <p className="dim">{s.podium.title}</p>
      </div>
      <section className="kt-podium-list">
        <h2 className="kt-side-title">{s.podium.order}</h2>
        <ol className="sg-score-list">
          {ranked.map((p) => {
            const m = members.get(p.id);
            return (
              <li key={p.id} className="sg-score" data-me={p.id === meId || undefined} data-first={p.id === view.winner || undefined}>
                {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} />}
                <span className="sg-score-name">{m?.nick ?? '?'}</span>
                <span className="sg-score-pts mono">{p.out === null ? s.podium.alive : `${p.out}.`}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
