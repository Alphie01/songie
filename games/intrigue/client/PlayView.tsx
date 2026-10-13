import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import {
  ACTION_COST,
  ACTION_ROLE,
  MUST_COUP_AT,
  ROLES,
  TARGETED,
  type ActionKind,
  type IntrigueSettings,
  type IntrigueView,
} from '../shared/index.js';
import { CardBack, Coin, Glyph, RoleCard } from './RoleArt';
import { SettingsPanel } from './SettingsPanel';
import { ACTION_EFFECT, ACTION_FX, ACTION_NAME, LOSE_REASON, ROLE_ABILITY, ROLE_ACTION, ROLE_BLOCKS, ROLE_NAME, s } from './strings';

type Send = (a: unknown) => Promise<boolean>;
type Nick = (id: string | undefined | null) => string;
type Members = Map<string, RoomPlayer>;

/** Tasarımdaki sıra: herkesin yapabildikleri, rol eylemleri, en sonda Darbe. */
const ACTION_ORDER: ActionKind[] = ['income', 'aid', 'tax', 'assassinate', 'steal', 'exchange', 'coup'];

function useRemaining(view: IntrigueView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  return view.endsAt ? Math.max(0, view.endsAt - (now + offset)) : 0;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<IntrigueView, IntrigueSettings>) {
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

  if (view.phase === 'over') return <Podium view={view} members={members} meId={meId} room={room} remaining={remaining} />;

  const status = !view.me.inGame
    ? s.play.spectator
    : !view.me.alive
      ? s.play.eliminated
      : view.current === meId
        ? s.play.yourTurn
        : s.play.turnOf(nick(view.current));

  return (
    <div className="ig sg">
      <aside className="sg-side sg-left">
        <Log view={view} nick={nick} />
      </aside>

      <main className="sg-center ig-main">
        <div className="ig-screen">
          <header className="ig-top">
            <span className="ig-pill">{status}</span>
            <span className="ig-top-info">{s.play.deck(view.deckCount)}</span>
          </header>

          <Rivals view={view} members={members} meId={meId} />
          <Stage key={`${view.phase}-${view.turn}-${view.window?.id ?? 0}`} view={view} meId={meId} nick={nick} remaining={remaining} send={send} />
          {isHost && <HostDefault view={view} members={members} nick={nick} send={send} />}

          {error && (
            <p className="error-text ig-center" role="alert">
              {error}
            </p>
          )}

          {view.me.inGame && (
            <>
              <div className="ig-fill" />
              <MyHand view={view} meId={meId} />
            </>
          )}
        </div>

        <div className="sg-mobile-only">
          <Log view={view} nick={nick} />
        </div>

        <HowTo />
      </main>

      <aside className="sg-side sg-right">
        <SettingsPanel settings={settings} editable={isHost} api={api} players={room.players} meId={meId} onChange={(n) => void setSettings(n)} section="secondary" />
        <RoleTable compact />
      </aside>

      <Flash view={view} nick={nick} />
    </div>
  );
}

// ---------- Rakipler ----------

function Rivals({ view, members, meId }: { view: IntrigueView; members: Members; meId: string }) {
  const list = view.players.filter((p) => p.id !== meId);
  const w = view.window;
  return (
    <ol className="ig-rivals" aria-label={s.play.rivals}>
      {list.map((p) => {
        const m = members.get(p.id);
        const current = view.current === p.id && p.alive;
        const targeted = view.pending?.target === p.id && view.phase !== 'action';
        const say = w && w.eligible.includes(p.id) ? (w.passed.includes(p.id) ? 'passed' : 'deciding') : undefined;
        return (
          <li
            key={p.id}
            className="ig-rival"
            data-current={current || undefined}
            data-out={!p.alive || undefined}
            data-target={targeted || undefined}
            data-off={m?.connected === false || undefined}
          >
            {say && <span className="ig-say" data-say={say} title={say === 'passed' ? s.play.passedMark : s.play.decidingMark} />}
            {say && <span className="sr-only">{say === 'passed' ? s.play.passedMark : s.play.decidingMark}</span>}
            <span className="ig-rival-name">{m?.nick ?? '?'}</span>
            <span className="ig-rival-cards">
              {Array.from({ length: p.hidden }, (_, i) => (
                <CardBack key={`h${i}`} size="mini" />
              ))}
              {p.revealed.map((r, i) => (
                <RoleCard key={`r${i}`} role={r} size="mini" dead />
              ))}
            </span>
            <span className="ig-rival-coins">{p.alive ? s.play.coins(p.coins) : s.play.out}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Orta panel ----------

function Bar({ remaining, total }: { remaining: number; total: number }) {
  if (!total) return null;
  return (
    <span className="ig-bar" aria-hidden="true">
      <span style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }} />
    </span>
  );
}

function Stage({ view, meId, nick, remaining, send }: { view: IntrigueView; meId: string; nick: Nick; remaining: number; send: Send }) {
  if (view.phase === 'window' && view.window) return <ChallengeWindow view={view} meId={meId} nick={nick} remaining={remaining} send={send} />;

  if (view.phase === 'lose' && view.lose) {
    if (view.lose.player === meId) return <LosePicker view={view} remaining={remaining} send={send} />;
    return (
      <section className="ig-status">
        <p>{s.play.loseOther(nick(view.lose.player))}</p>
        <Bar remaining={remaining} total={view.durationMs} />
      </section>
    );
  }

  if (view.phase === 'exchange') {
    if (view.exchange) return <ExchangePicker view={view} remaining={remaining} send={send} />;
    return (
      <section className="ig-status">
        <p>{s.play.exOther(nick(view.exchanging))}</p>
        <Bar remaining={remaining} total={view.durationMs} />
      </section>
    );
  }

  if (view.phase === 'action' && view.current === meId && view.me.alive) return <ActionPanel view={view} meId={meId} nick={nick} remaining={remaining} send={send} />;

  return (
    <section className="ig-status">
      <p>{s.play.thinking(nick(view.current))}</p>
      <Bar remaining={remaining} total={view.durationMs} />
    </section>
  );
}

function ActionPanel({ view, meId, nick, remaining, send }: { view: IntrigueView; meId: string; nick: Nick; remaining: number; send: Send }) {
  const [chosen, setChosen] = useState<ActionKind | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const coins = view.me.coins;
  const mustCoup = coins >= MUST_COUP_AT;
  const targets = view.players.filter((p) => p.alive && p.id !== meId);
  const secs = Math.ceil(remaining / 1000);

  function reason(a: ActionKind): string | null {
    if (mustCoup && a !== 'coup') return s.play.mustCoupReason;
    if (coins < ACTION_COST[a]) return s.play.needCoins(ACTION_COST[a]);
    return null;
  }

  function pick(a: ActionKind) {
    if (TARGETED[a]) {
      if (chosen === a) {
        setChosen(null);
        return;
      }
      setChosen(a);
      setTarget(targets.length === 1 ? targets[0]!.id : null);
      return;
    }
    setChosen(null);
    void send({ type: 'act', turn: view.turn, action: a });
  }

  return (
    <section className="ig-sheet" aria-labelledby="ig-actions-title">
      <div className="ig-sheet-head">
        <h2 id="ig-actions-title" className="ig-sheet-title">
          {s.play.chooseAction}
        </h2>
        <span className="ig-sheet-meta">{view.durationMs ? s.play.yourTurnLeft(secs) : s.play.yourTurn}</span>
      </div>
      <Bar remaining={remaining} total={view.durationMs} />
      {mustCoup && <p className="ig-warn">{s.play.mustCoup}</p>}
      <ul className="ig-actions">
        {ACTION_ORDER.map((a) => {
          const why = reason(a);
          const role = ACTION_ROLE[a];
          return (
            <li key={a}>
              <button
                type="button"
                className="ig-action"
                data-action={a}
                data-role={role ?? undefined}
                aria-pressed={chosen === a}
                aria-describedby={`ig-fx-${a}`}
                title={ACTION_EFFECT[a]}
                disabled={!!why}
                onClick={() => pick(a)}
              >
                <span className="ig-action-name">{ACTION_NAME[a]}</span>
                <span className="ig-action-fx" id={`ig-fx-${a}`}>
                  {why ?? ACTION_FX[a]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {chosen && (
        <div className="ig-target">
          <span className="ig-target-label">{s.play.chooseTarget}</span>
          <div className="ig-target-list">
            {targets.map((p) => (
              <button key={p.id} type="button" className="ig-target-btn" aria-pressed={target === p.id} onClick={() => setTarget(p.id)}>
                {nick(p.id)} · {p.coins}
              </button>
            ))}
          </div>
          <div className="ig-confirm-row">
            <button
              type="button"
              className="ig-confirm"
              disabled={!target}
              onClick={() => void send({ type: 'act', turn: view.turn, action: chosen, target })}
            >
              {target ? s.play.confirm(ACTION_NAME[chosen], nick(target)) : s.play.chooseTarget}
            </button>
            <button type="button" className="ig-cancel" onClick={() => setChosen(null)}>
              {s.play.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ChallengeWindow({ view, meId, nick, remaining, send }: { view: IntrigueView; meId: string; nick: Nick; remaining: number; send: Send }) {
  const w = view.window!;
  const p = view.pending!;
  const secs = Math.ceil(remaining / 1000);
  const eligible = w.eligible.includes(meId);
  const passed = w.passed.includes(meId);
  const canLie = w.canChallenge && eligible && !passed && w.claimant !== meId;
  const canBlock = w.blockers.includes(meId) && !passed;
  const target = p.target ? nick(p.target) : null;

  let title: string;
  let hint: string;
  if (w.kind === 'counter' && p.block) {
    title = s.play.windowCounter(nick(p.block.by), ROLE_NAME[p.block.role]);
    hint = s.play.windowCounterHint;
  } else if (w.kind === 'block' && p.action === 'aid') {
    title = s.play.windowAid(nick(p.actor));
    hint = s.play.windowAidHint;
  } else if (w.kind === 'block') {
    title = s.play.windowClaim(nick(p.actor), ACTION_NAME[p.action], target);
    hint = s.play.windowBlockOnly(target ?? '?');
  } else {
    title = s.play.windowClaim(nick(p.actor), ACTION_NAME[p.action], target);
    hint = p.claim ? s.play.windowClaimRole(ROLE_NAME[p.claim]) : '';
  }

  const status = !eligible ? (w.claimant === meId ? s.play.waiting : s.play.noSay) : passed ? s.play.passed : s.play.waiting;
  const total = view.durationMs || 1;

  return (
    <section className="ig-sheet ig-window" data-kind={w.kind} aria-live="polite">
      <div className="ig-window-head">
        <span className="ig-count" data-low={secs <= 3 || undefined} aria-label={`${secs} saniye`}>
          {secs}
        </span>
        <span className="ig-window-text">
          <span className="ig-window-title">{title}</span>
          {hint && <span className="ig-window-hint">{hint}</span>}
        </span>
      </div>
      <div className="ig-window-mid">
        {w.claimRole && (
          <span className="ig-claimcard" data-role={w.claimRole}>
            <Glyph role={w.claimRole} size={28} />
            <span className="ig-claimcard-name">{ROLE_NAME[w.claimRole]}</span>
            <span className="ig-claimcard-q" aria-hidden="true">
              ?
            </span>
          </span>
        )}
        <div className="ig-window-progress">
          <span className="ig-bar ig-bar-red" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }} />
          </span>
          <span className="ig-window-passed">{s.play.passedList(w.passed.length, w.eligible.length)}</span>
          <span className="ig-window-status">{status}</span>
        </div>
      </div>

      {eligible && !passed && (
        <div className="ig-responses">
          {(canLie || canBlock) && (
            <div className="ig-responses-grid">
              {canLie && (
                <button type="button" className="ig-resp ig-lie" onClick={() => void send({ type: 'challenge', windowId: w.id })}>
                  {s.play.lie}
                </button>
              )}
              {canBlock &&
                w.blockRoles.map((r) => (
                  <button key={r} type="button" className="ig-resp ig-block" data-role={r} onClick={() => void send({ type: 'block', windowId: w.id, role: r })}>
                    {s.play.blockAs(ROLE_NAME[r])}
                  </button>
                ))}
            </div>
          )}
          <button type="button" className="ig-pass" onClick={() => void send({ type: 'pass', windowId: w.id })}>
            {s.play.pass}
          </button>
        </div>
      )}
    </section>
  );
}

function LosePicker({ view, remaining, send }: { view: IntrigueView; remaining: number; send: Send }) {
  const [pick, setPick] = useState<string | null>(null);
  const card = view.me.hand.find((c) => c.id === pick);
  return (
    <section className="ig-sheet" data-alert aria-labelledby="ig-lose-title">
      <h2 id="ig-lose-title" className="ig-sheet-title">
        {LOSE_REASON[view.lose!.reason]}
      </h2>
      <p className="ig-sheet-hint">{s.play.loseMeHint}</p>
      <Bar remaining={remaining} total={view.durationMs} />
      <div className="ig-pick">
        {view.me.hand.map((c) => (
          <button key={c.id} type="button" className="ig-cardbtn" aria-pressed={pick === c.id} aria-label={ROLE_NAME[c.role]} onClick={() => setPick(c.id)}>
            <RoleCard role={c.role} />
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!card} onClick={() => card && void send({ type: 'lose', cardId: card.id })}>
        {card ? s.play.loseBtn(ROLE_NAME[card.role]) : s.play.loseMeTitle}
      </button>
    </section>
  );
}

function ExchangePicker({ view, remaining, send }: { view: IntrigueView; remaining: number; send: Send }) {
  const ex = view.exchange!;
  const [keep, setKeep] = useState<string[]>([]);
  const mine = new Set(view.me.hand.map((c) => c.id));
  function toggle(id: string) {
    setKeep((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= ex.keep ? [...cur.slice(1), id] : [...cur, id]));
  }
  return (
    <section className="ig-sheet" aria-labelledby="ig-ex-title">
      <h2 id="ig-ex-title" className="ig-sheet-title">
        {s.play.exMeTitle}
      </h2>
      <p className="ig-sheet-hint">{s.play.exMeHint(ex.keep)}</p>
      <Bar remaining={remaining} total={view.durationMs} />
      <div className="ig-pick">
        {ex.options.map((c) => (
          <button key={c.id} type="button" className="ig-cardbtn" aria-pressed={keep.includes(c.id)} aria-label={ROLE_NAME[c.role]} onClick={() => toggle(c.id)}>
            <RoleCard role={c.role} tag={mine.has(c.id) ? undefined : s.play.drawn} />
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-lg btn-block" disabled={keep.length !== ex.keep} onClick={() => void send({ type: 'exchange', keep })}>
        {s.play.exBtn(ex.keep, keep.length)}
      </button>
    </section>
  );
}

function HostDefault({ view, members, nick, send }: { view: IntrigueView; members: Members; nick: Nick; send: Send }) {
  const off = (id: string | null | undefined) => !!id && members.get(id)?.connected === false;
  let who: string | null = null;
  if (view.phase === 'action' && off(view.current)) who = view.current;
  else if (view.phase === 'window' && view.window) who = view.window.eligible.find((x) => !view.window!.passed.includes(x) && off(x)) ?? null;
  else if (view.phase === 'lose' && off(view.lose?.player)) who = view.lose!.player;
  else if (view.phase === 'exchange' && off(view.exchanging)) who = view.exchanging;
  if (!who) return null;
  return (
    <div className="ig-host">
      <p className="ig-host-hint">
        {s.play.hostDefaultHint} ({nick(who)})
      </p>
      <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'hostDefault' })}>
        {s.play.hostDefault}
      </button>
    </div>
  );
}

// ---------- El ----------

function MyHand({ view, meId }: { view: IntrigueView; meId: string }) {
  const revealed = view.players.find((p) => p.id === meId)?.revealed ?? [];
  return (
    <section className="ig-hand" aria-labelledby="ig-hand-title" data-out={!view.me.alive || undefined}>
      <div className="ig-hand-head">
        <h2 id="ig-hand-title" className="ig-hand-title">
          {s.play.hand}
        </h2>
        <span className="ig-purse">{s.play.coins(view.me.coins)}</span>
      </div>
      {view.me.hand.length === 0 && revealed.length === 0 ? (
        <p className="ig-sheet-hint">{s.play.noHand}</p>
      ) : (
        <ul className="ig-hand-cards">
          {view.me.hand.map((c) => (
            <li key={c.id} className="ig-handcard" data-role={c.role}>
              <Glyph role={c.role} size={38} />
              <span className="ig-handcard-name">{ROLE_NAME[c.role]}</span>
              <span className="ig-handcard-fx">{ROLE_ABILITY[c.role]}</span>
            </li>
          ))}
          {revealed.map((r, i) => (
            <li key={`r${i}`} className="ig-handcard" data-role={r} data-dead>
              <Glyph role={r} size={38} />
              <span className="ig-handcard-name">{ROLE_NAME[r]}</span>
              <span className="ig-handcard-fx">{s.play.out}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- İtiraz sonucu ----------

function Flash({ view, nick }: { view: IntrigueView; nick: Nick }) {
  const seen = useRef(view.flash?.seq ?? 0);
  const [show, setShow] = useState<IntrigueView['flash']>(null);
  useEffect(() => {
    const f = view.flash;
    if (!f || f.seq <= seen.current) return;
    seen.current = f.seq;
    setShow(f);
    const t = setTimeout(() => setShow(null), 4000);
    return () => clearTimeout(t);
  }, [view.flash]);
  if (!show) return null;
  const role = ROLE_NAME[show.role];
  return (
    <div className="ig-overlay" role="alert">
      <span className="ig-flashcard" data-role={show.role} data-had={show.had || undefined}>
        <Glyph role={show.role} size={60} />
        <span className="ig-flashcard-name">{role}</span>
      </span>
      <p className="ig-overlay-title">{show.had ? s.play.flashTrue(nick(show.claimant), role) : s.play.flashFalse(nick(show.claimant), role)}</p>
      <p className="ig-overlay-hint">{show.had ? s.play.flashTrueHint(nick(show.challenger)) : s.play.flashFalseHint}</p>
      <button type="button" className="ig-overlay-ok" onClick={() => setShow(null)}>
        {s.play.ok}
      </button>
    </div>
  );
}

// ---------- Günlük, nasıl oynanır, podyum ----------

function Log({ view, nick }: { view: IntrigueView; nick: Nick }) {
  const entries = [...view.log].reverse().filter((e) => e.t !== 'turn');
  return (
    <section className="ig-log" aria-labelledby="ig-log-title">
      <h2 id="ig-log-title" className="ig-side-title">
        {s.play.log}
      </h2>
      <ol className="ig-log-list">
        {entries.map((e) => (
          <li key={e.seq} data-t={e.t} data-ok={e.ok === undefined ? undefined : String(e.ok)}>
            {e.role && (e.t === 'lose' || e.t === 'challenge' || e.t === 'block') && <Glyph role={e.role} size={14} />}
            <span>{s.log(e, nick)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RoleTable({ compact }: { compact?: boolean }) {
  return (
    <section className="ig-roles" data-compact={compact || undefined} aria-label={s.howto.roles}>
      {compact && <h2 className="ig-side-title">{s.howto.roles}</h2>}
      <table className="ig-table">
        <thead>
          <tr>
            <th scope="col">{s.howto.role}</th>
            <th scope="col">{s.howto.action}</th>
            <th scope="col">{s.howto.blocks}</th>
          </tr>
        </thead>
        <tbody>
          {ROLES.map((r) => (
            <tr key={r} data-role={r}>
              <th scope="row">
                <span className="ig-table-role">
                  <Glyph role={r} size={18} />
                  {ROLE_NAME[r]}
                </span>
              </th>
              <td>{ROLE_ACTION[r]}</td>
              <td>{ROLE_BLOCKS[r]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function HowTo() {
  const common: ActionKind[] = ['income', 'aid', 'coup'];
  return (
    <section className="howto" aria-labelledby="ig-howto">
      <h2 id="ig-howto" className="howto-title">
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
      <h3 className="ig-howto-sub">{s.howto.actions}</h3>
      <dl className="ig-legend">
        {common.map((a) => (
          <div key={a} className="ig-legend-row">
            <dt>{ACTION_NAME[a]}</dt>
            <dd>{ACTION_EFFECT[a]}</dd>
          </div>
        ))}
      </dl>
      <h3 className="ig-howto-sub">{s.howto.roles}</h3>
      <RoleTable />
    </section>
  );
}

function Podium({
  view,
  members,
  meId,
  room,
  remaining,
}: {
  view: IntrigueView;
  members: Members;
  meId: string;
  room: { code: string };
  remaining: number;
}) {
  const winner = view.winner ? members.get(view.winner) : null;
  // Önce ayakta kalan, sonra en geç elenen.
  const ranked = [...view.players].sort((a, b) => (b.out ?? 99) - (a.out ?? 99));
  // Kazanan yoksa (oyun yarıda bitti) sıralama anlamsız: herkes listede, numarasız.
  const first = view.winner ? ranked[0] : undefined;
  const second = view.winner ? ranked[1] : undefined;
  const rest = view.winner ? ranked.slice(2) : ranked;
  const half = Math.ceil(rest.length / 2);
  const total = view.durationMs || 1;
  const name = (id: string) => members.get(id)?.nick ?? '?';
  return (
    <main className="col ig-over">
      <span className="ig-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="ig-over-top">
        <span>{s.name}</span>
        <span className="ig-over-code">{room.code}</span>
      </div>
      <div className="ig-over-head">
        <span className="ig-sticker">{s.podium.gameOver}</span>
        <h1 className="ig-over-title">{winner ? s.podium.winnerTitle(winner.nick) : s.podium.none}</h1>
        <p className="ig-over-sub">{s.podium.title}</p>
      </div>
      {first && (
        <div className="ig-over-cards">
          <div className="ig-over-card" data-first data-me={first.id === meId || undefined}>
            <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
              <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="#FFD23F" stroke="#0D0828" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <span className="ig-over-n">{s.podium.place(1)}</span>
            <span className="ig-over-name">{name(first.id)}</span>
          </div>
          {second && (
            <Fragment>
              <span className="ig-over-dash" aria-hidden="true">
                –
              </span>
              <div className="ig-over-card" data-me={second.id === meId || undefined}>
                <span className="ig-over-n">{s.podium.place(2)}</span>
                <span className="ig-over-name">{name(second.id)}</span>
              </div>
            </Fragment>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="ig-over-rosters">
          {[rest.slice(0, half), rest.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="ig-over-roster">
                  {col.map((p, j) => {
                    const m = members.get(p.id);
                    return (
                      <li key={p.id} data-me={p.id === meId || undefined}>
                        {view.winner && <span className="ig-over-place">{s.podium.place(3 + i * half + j)}</span>}
                        {m && <Avatar avatar={m.avatar} nick={m.nick} size={28} />}
                        <span className="ig-over-rname">{name(p.id)}</span>
                      </li>
                    );
                  })}
                </ol>
              ),
          )}
        </div>
      )}
      <div className="ig-fill" />
      <div className="ig-over-foot">
        <div className="ig-over-bar" aria-hidden="true">
          <div style={{ width: `${Math.max(0, 100 - (remaining / total) * 100)}%` }} />
        </div>
        <p className="ig-over-note">{s.podium.back}</p>
      </div>
    </main>
  );
}
