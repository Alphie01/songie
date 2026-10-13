import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import { CARD_KINDS, CAT_KINDS, isCat, type Card, type CardKind, type KittenSettings, type KittenView, type PendingKind } from '../shared/index.js';
import { BombIcon, CardBack, CardFace, Glyph } from './CardArt';
import { SettingsPanel } from './SettingsPanel';
import { ACTION_NAME, CARD_FX, CARD_NAME, CARD_TEXT, s } from './strings';

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

  if (view.phase === 'over') return <Podium view={view} members={members} room={room} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: KittenSettings) => void setSettings(n) };

  const mine = view.current === meId;
  const headline = view.me.inGame ? (view.me.alive ? (mine ? s.play.yourTurn : s.play.turnOf(nick(view.current))) : s.play.left) : s.play.spectator;

  return (
    <div className="kt sg">
      <aside className="sg-side sg-left">
        <Log view={view} nick={nick} />
      </aside>

      <main className="sg-center kt-center-col">
        <header className="kt-top">
          <span className="kt-pill" data-mine={(mine && view.me.alive) || undefined}>
            {headline}
          </span>
          <span className="kt-code">{room.code}</span>
        </header>

        <Seats view={view} members={members} meId={meId} />
        <Table view={view} />
        <Risk view={view} />
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
        <section className="kt-sidecard">
          <SettingsPanel {...panelProps} section="secondary" />
        </section>
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
    <ol className="kt-seats" aria-label={s.play.seats}>
      {view.players.map((p) => {
        const m = members.get(p.id);
        const current = view.current === p.id && p.alive;
        const name = p.id === meId ? s.play.me : (m?.nick ?? '?');
        return (
          <li
            key={p.id}
            className="kt-seat"
            data-current={current || undefined}
            data-out={!p.alive || undefined}
            data-off={(m && !m.connected) || undefined}
            aria-current={current || undefined}
          >
            <span className="kt-seat-name">
              {name}
              {current && ` ×${view.turnsLeft}`}
            </span>
            <span className="kt-seat-cards">{p.alive ? s.play.cards(p.cards) : s.play.out}</span>
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
        <span className="kt-pile-label">{s.play.deckN(view.deckCount)}</span>
      </div>
      <div className="kt-pile">
        <span className="kt-discard">{view.discardTop ? <CardFace kind={view.discardTop} size="pile" /> : <span className="kt-slot">{s.play.emptyDiscard}</span>}</span>
        <span className="kt-pile-label">{s.play.discardN(view.discardCount)}</span>
      </div>
    </section>
  );
}

/** Patlama riski: destedeki bomba / destedeki kart (ikisi de herkese açık). */
function Risk({ view }: { view: KittenView }) {
  // Eski sunucu sürümü alanı göndermezse kuraldan türet (hayatta − 1).
  const bombs = view.deckBombs ?? Math.max(0, view.players.filter((p) => p.alive).length - 1 - (view.phase === 'bomb' || view.phase === 'place' ? 1 : 0));
  const pct = view.deckCount > 0 ? Math.min(100, Math.round((bombs / view.deckCount) * 100)) : 0;
  return (
    <div className="kt-risk">
      <div className="kt-risk-head">
        <span>{s.play.risk(bombs)}</span>
        <span className="kt-risk-pct">%{pct}</span>
      </div>
      <div className="kt-bar" role="meter" aria-label={s.play.riskLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------- Duruma göre orta panel ----------

function Timer({ remaining, total }: { remaining: number; total: number }) {
  if (!total) return null;
  return (
    <span className="kt-bar kt-timer" aria-hidden="true">
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
          <span className="kt-count" data-low={secs <= 2 || undefined}>
            {secs}
          </span>
          <div className="kt-window-text">
            <p className="kt-window-title">{s.play.pendingTitle(nick(p.by), ACTION_NAME[p.kind], p.target ? nick(p.target) : null)}</p>
            {p.named && <p className="kt-small">{s.play.pendingNamed(CARD_NAME[p.named])}</p>}
            <p className="kt-window-state">
              {p.willHappen ? s.play.willHappen : s.play.willCancel}
              {p.nopes.length > 0 && <span className="kt-nopes">{s.play.nopeCount(p.nopes.length)}</span>}
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
            <button type="button" className="btn btn-block kt-nope-btn" onClick={() => void send({ type: 'nope', pendingId: p.id, cardId: nope.id })}>
              <Glyph kind="nope" size={24} />
              {s.play.nopeBtn}
            </button>
          ) : (
            <p className="kt-small kt-center">{s.play.noNope}</p>
          ))}
      </section>
    );
  }

  if (view.phase === 'favor' && view.favor && view.favor.to !== meId) {
    return (
      <section className="kt-box">
        <p>{s.play.favorOther(nick(view.favor.from), nick(view.favor.to))}</p>
        <Timer remaining={remaining} total={view.durationMs} />
      </section>
    );
  }

  if (view.phase === 'pick') {
    if (view.discardPick) {
      return (
        <section className="kt-box">
          <p className="kt-box-title">{s.play.pickMe}</p>
          <p className="kt-small">{s.play.pickHint}</p>
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
      <section className="kt-box">
        <p>{s.play.pickOther(nick(view.current))}</p>
        <Timer remaining={remaining} total={view.durationMs} />
      </section>
    );
  }

  if (view.phase === 'play') {
    const mine = view.current === meId;
    const disconnected = members.get(view.current)?.connected === false;
    return (
      <>
        <section className="kt-status" data-mine={mine || undefined}>
          <p>{mine ? s.play.myTurnsLeft(view.turnsLeft) : [s.play.turnOf(nick(view.current)), s.play.turnsLeft(view.turnsLeft)].filter(Boolean).join(', ')}</p>
          {view.myBomb !== null && <p className="kt-secret">{s.play.myBomb(view.myBomb)}</p>}
          <Timer remaining={remaining} total={view.durationMs} />
          {isHost && !mine && disconnected && (
            <div className="kt-hostskip">
              <p className="kt-small">{s.play.hostSkipHint}</p>
              <button type="button" className="btn btn-dark" onClick={() => void send({ type: 'skipTurn' })}>
                {s.play.hostSkip(nick(view.current))}
              </button>
            </div>
          )}
        </section>
      </>
    );
  }

  // bomb / place: tam ekran katman gösteriyor; burada kısa bir durum.
  return (
    <section className="kt-box">
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
        <div className="kt-box kt-ask">
          <p className="kt-box-title">{s.play.favorMe(nick(view.favor!.from))}</p>
          <p className="kt-small">{s.play.favorMeHint}</p>
        </div>
      )}

      <div className="kt-hand-head">
        <h2 className="kt-hand-title">
          {s.play.hand} {hand.length}
        </h2>
        {live.length > 0 && !giving ? (
          <button type="button" className="kt-clear" onClick={() => setSelected([])}>
            {s.play.clear}
          </button>
        ) : (
          playing && <span className="kt-hand-hint">{s.play.selectHint}</span>
        )}
      </div>

      {hand.length === 0 ? (
        <p className="kt-small">{s.play.handEmpty}</p>
      ) : (
        <ul className="kt-hand">
          {hand.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="kt-hcard"
                data-kind={c.kind}
                aria-pressed={live.includes(c.id)}
                disabled={!playing && !giving}
                onClick={() => toggle(c)}
              >
                {CARD_NAME[c.kind]}
                <span className="kt-hcard-fx">{CARD_FX[c.kind]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {giving && live[0] && (
        <button type="button" className="btn btn-primary btn-block kt-bigbtn" onClick={() => void send({ type: 'give', cardId: live[0] })}>
          {s.play.giveBtn(CARD_NAME[cards[0]!.kind])}
        </button>
      )}

      {playing && (
        <div className="kt-actions">
          {combo && needsTarget && (
            <div className="kt-choose" role="group" aria-labelledby="kt-choose-target">
              <span id="kt-choose-target" className="kt-choose-label">
                {s.play.chooseTarget}
              </span>
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
            <div className="kt-choose" role="group" aria-labelledby="kt-choose-named">
              <span id="kt-choose-named" className="kt-choose-label">
                {s.play.chooseNamed}
              </span>
              <div className="chips">
                {CARD_KINDS.filter((k) => k !== 'bomb').map((k) => (
                  <button key={k} type="button" className="chip" aria-pressed={named === k} onClick={() => setNamed(k)}>
                    {CARD_NAME[k]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {live.length > 0 && (
            <button type="button" className="kt-playsel" disabled={!ready} onClick={() => void play()}>
              {combo ? s.play.playAs(ACTION_NAME[combo]) : s.play.invalid}
            </button>
          )}
          <button type="button" className="btn btn-yellow btn-block kt-draw" onClick={() => void send({ type: 'draw', turn: view.turn })}>
            {s.play.draw}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------- Bomba ve geri koyma ----------

type Spot = 'top' | 'second' | 'bottom' | 'random';

function BombOverlay({ view, meId, nick, remaining, send }: { view: KittenView; meId: string; nick: Nick; remaining: number; send: Send }) {
  const [spot, setSpot] = useState<Spot | null>('random');
  const [index, setIndex] = useState(0);
  const mine = view.current === meId;
  if (view.phase !== 'bomb' && view.phase !== 'place') return null;
  const secs = Math.ceil(remaining / 1000);
  const max = view.deckCount;

  if (!mine) {
    const placing = view.phase === 'place';
    return (
      <div className="kt-overlay" data-tone={placing ? 'night' : 'bomb'} role="status">
        <div className="kt-overlay-body kt-overlay-center">
          <span className="kt-bombcard kt-bombcard-sm" data-calm={placing || undefined}>
            {placing ? <Glyph kind="defuse" size={64} /> : <BombIcon size={64} sparks />}
          </span>
          <p className="kt-overlay-title">{placing ? s.play.placeOther(nick(view.current)) : s.play.bombOther(nick(view.current))}</p>
          {!placing && <p className="kt-overlay-hint">{s.play.bombOtherHint}</p>}
        </div>
      </div>
    );
  }

  if (view.phase === 'bomb') {
    return (
      <div className="kt-overlay" data-tone="bomb" role="alertdialog" aria-labelledby="kt-bomb-title" aria-describedby="kt-bomb-hint">
        <div className="kt-overlay-body kt-overlay-center">
          <span className="kt-bombcard">
            <BombIcon size={90} sparks />
          </span>
          <h2 id="kt-bomb-title" className="kt-overlay-title kt-big">
            {s.play.bombMe}
          </h2>
          <p id="kt-bomb-hint" className="kt-overlay-hint kt-bomb-hint">
            {s.play.bombMeHint}
          </p>
          <button type="button" className="btn btn-primary btn-block kt-bigbtn" autoFocus onClick={() => void send({ type: 'defuse' })}>
            {s.play.defuseBtn} · {secs}
          </button>
        </div>
      </div>
    );
  }

  const fixed: Record<Exclude<Spot, 'random'>, number> = { top: 0, second: Math.min(1, max), bottom: max };
  const at = spot && spot !== 'random' ? fixed[spot] : Math.min(index, max);
  const labelAt = (i: number) => (i === 0 ? s.play.placeTop : i === max ? s.play.placeBottom : s.play.placeAt(i + 1));
  const label = spot === 'random' ? s.play.placeRandom : labelAt(at);
  const spots: [Spot, string][] = [
    ['top', s.play.placeTop],
    ...(max >= 2 ? ([['second', s.play.placeAt(2)]] as [Spot, string][]) : []),
    ['bottom', s.play.placeBottom],
    ['random', s.play.placeRandom],
  ];
  function place() {
    const index = spot === 'random' ? Math.floor(Math.random() * (max + 1)) : at;
    void send({ type: 'place', index });
  }
  return (
    <div className="kt-overlay" data-tone="night" role="dialog" aria-labelledby="kt-place-title">
      <div className="kt-overlay-body">
        <h2 id="kt-place-title" className="kt-overlay-title kt-mid">
          {s.play.placeMe}
        </h2>
        <p className="kt-overlay-hint">{s.play.placeHint}</p>
        <div className="kt-spots">
          {spots.map(([k, l]) => (
            <button key={k} type="button" className="kt-spot" aria-pressed={spot === k} onClick={() => setSpot(k)}>
              {l}
            </button>
          ))}
        </div>
        {max > 2 && (
          <label className="kt-exact">
            <span className="kt-choose-label">{s.play.placeExact}</span>
            <input
              className="kt-range"
              type="range"
              min={0}
              max={max}
              value={at}
              aria-valuetext={labelAt(at)}
              onChange={(e) => {
                setSpot(null);
                setIndex(Number(e.target.value));
              }}
            />
          </label>
        )}
        <button type="button" className="btn btn-yellow btn-block kt-bigbtn" onClick={place}>
          {s.play.placeBtn(label)} · {secs}
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
    <div className="kt-overlay kt-boom" data-tone="bomb" role="alert" onClick={() => setShow(null)}>
      <div className="kt-overlay-body kt-overlay-center">
        <span className="kt-bombcard">
          <BombIcon size={90} sparks />
        </span>
        <p className="kt-overlay-title kt-big">{show.by === meId ? s.play.boomMe : s.play.boom(nick(show.by))}</p>
        <p className="kt-overlay-hint kt-bomb-hint">{s.play.boomHint}</p>
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
        <Glyph kind="future" size={20} />
        {s.play.futureAgain}
      </button>
    );
  }
  const close = () => {
    setClosed(peek.seq);
    setReopen(false);
  };
  return (
    <div className="kt-overlay" data-tone="night" role="dialog" aria-labelledby="kt-future-title" onClick={close}>
      <div className="kt-overlay-body" onClick={(e) => e.stopPropagation()}>
        <h2 id="kt-future-title" className="kt-overlay-title kt-mid">
          {s.play.futureTitle}
        </h2>
        <p className="kt-overlay-hint">{s.play.futureHint}</p>
        <ol className="kt-future-row">
          {peek.cards.map((k, i) => (
            <li key={i}>
              <span className="kt-peek" data-kind={k}>
                {CARD_NAME[k]}
              </span>
              <span className="kt-peek-slot">{s.play.futureSlot(i)}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-yellow btn-block kt-okbtn" autoFocus onClick={close}>
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
            <span className="howto-n">{i + 1}</span>
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
            <span className="kt-catnames">{CAT_KINDS.map((k) => CARD_NAME[k]).join(', ')}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Sunucudaki oyun sonu süresi (PODIUM_MS); çubuk bu sürede dolar. */
const PODIUM_MS = 10_000;

function Podium({ view, members, room }: { view: KittenView; members: Map<string, RoomPlayer>; room: { code: string } }) {
  const winner = view.winner ? members.get(view.winner) : null;
  // Son patlayan ikinci olur; hayatta kalan birinci.
  const ranked = [...view.players].sort((a, b) => (b.out ?? 99) - (a.out ?? 99));
  const [first, second, ...rest] = ranked;
  const half = Math.ceil(rest.length / 2);
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  // Hayatta kalanlar (erken bitişte birden çok) ortak birinci; patlayanlar sonra patlayanların ardından.
  const place = (p: (typeof ranked)[number]) => (p.out === null ? 1 : 1 + ranked.filter((q) => q.out === null || q.out > p.out!).length);
  return (
    <main className="col kt-end">
      <span className="kt-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="kt-end-top">
        <span>{s.name}</span>
        <span className="kt-code">{room.code}</span>
      </div>
      <div className="kt-end-head">
        <span className="kt-end-sticker">{s.podium.gameOver}</span>
        <h1 className="display kt-end-title">{winner ? s.podium.winnerTitle(winner.nick) : s.podium.none}</h1>
      </div>
      {first && (
        <div className="kt-end-scores">
          <div className="kt-end-card kt-end-first">
            <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
              <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <span className="kt-end-num">{place(first)}</span>
            <span className="kt-end-name">{nick(first.id)}</span>
            <span className="kt-end-sub">{first.out === null ? s.podium.survivor : s.podium.outAt(first.out)}</span>
          </div>
          {second && (
            <>
              <span className="kt-end-dash" aria-hidden="true">
                –
              </span>
              <div className="kt-end-card kt-end-second">
                <span className="kt-end-num">{place(second)}</span>
                <span className="kt-end-name">{nick(second.id)}</span>
                <span className="kt-end-sub">{second.out === null ? s.podium.survivor : s.podium.outAt(second.out)}</span>
              </div>
            </>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="kt-end-rosters">
          {[rest.slice(0, half), rest.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="kt-end-roster">
                  {col.map((p) => {
                    const m = members.get(p.id);
                    return (
                      <li key={p.id}>
                        {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                        <span className="kt-end-roster-name">{m?.nick ?? '?'}</span>
                        <span className="kt-end-roster-rank">{place(p)}.</span>
                      </li>
                    );
                  })}
                </ol>
              ),
          )}
        </div>
      )}
      <div className="kt-end-spacer" />
      <div className="kt-end-foot">
        <div className="kt-end-bar" aria-hidden="true">
          <div style={{ animationDuration: `${PODIUM_MS}ms` }} />
        </div>
        <p className="kt-end-note" role="status">
          {s.podium.back}
        </p>
      </div>
    </main>
  );
}
