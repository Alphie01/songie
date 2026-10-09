import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import {
  ACTIONS,
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
import { ACTION_EFFECT, ACTION_NAME, LOSE_REASON, ROLE_ABILITY, ROLE_ACTION, ROLE_BLOCKS, ROLE_NAME, s } from './strings';

type Send = (a: unknown) => Promise<boolean>;
type Nick = (id: string | undefined | null) => string;
type Members = Map<string, RoomPlayer>;

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

  if (view.phase === 'over') return <Podium view={view} members={members} meId={meId} />;

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

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round">{status}</span>
          <span className="dim">{s.play.deck(view.deckCount)}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Rivals view={view} members={members} meId={meId} />
        <Stage key={`${view.phase}-${view.turn}-${view.window?.id ?? 0}`} view={view} meId={meId} nick={nick} remaining={remaining} send={send} />
        {isHost && <HostDefault view={view} members={members} nick={nick} send={send} />}
        {view.me.inGame && <MyHand view={view} meId={meId} />}

        {error && (
          <p className="error-text ig-center" role="alert">
            {error}
          </p>
        )}

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
    <ol className="ig-rivals" aria-label="Rakipler">
      {list.map((p) => {
        const m = members.get(p.id);
        const current = view.current === p.id && p.alive;
        const targeted = view.pending?.target === p.id && view.phase !== 'action';
        const say = w && w.eligible.includes(p.id) ? (w.passed.includes(p.id) ? 'passed' : 'deciding') : undefined;
        return (
          <li key={p.id} className="ig-rival" data-current={current || undefined} data-out={!p.alive || undefined} data-target={targeted || undefined}>
            <span className="ig-rival-head">
              {m ? <Avatar avatar={m.avatar} nick={m.nick} size={30} dim={!m.connected || !p.alive} /> : null}
              <span className="ig-rival-name">{m?.nick ?? '?'}</span>
              {say && <span className="ig-say" data-say={say} aria-label={say === 'passed' ? 'geçti' : 'karar veriyor'} />}
            </span>
            <span className="ig-rival-cards">
              {Array.from({ length: p.hidden }, (_, i) => (
                <CardBack key={`h${i}`} size="mini" />
              ))}
              {p.revealed.map((r, i) => (
                <RoleCard key={`r${i}`} role={r} size="mini" dead />
              ))}
            </span>
            <span className="ig-rival-coins mono">
              {p.alive ? (
                <>
                  <Coin size={12} />
                  {p.coins}
                </>
              ) : (
                s.play.out
              )}
            </span>
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

  function reason(a: ActionKind): string | null {
    if (mustCoup && a !== 'coup') return s.play.mustCoupReason;
    if (coins < ACTION_COST[a]) return s.play.needCoins(ACTION_COST[a]);
    return null;
  }

  function pick(a: ActionKind) {
    if (TARGETED[a]) {
      setChosen(a);
      setTarget(targets.length === 1 ? targets[0]!.id : null);
      return;
    }
    void send({ type: 'act', turn: view.turn, action: a });
  }

  return (
    <section className="ig-panel" aria-labelledby="ig-actions-title">
      <div className="ig-panel-head">
        <h2 id="ig-actions-title" className="ig-panel-title">
          {s.play.chooseAction}
        </h2>
        <span className="ig-purse mono">
          <Coin size={16} />
          {coins}
        </span>
      </div>
      {mustCoup && <p className="ig-warn ig-small">{s.play.mustCoup}</p>}
      <Bar remaining={remaining} total={view.durationMs} />
      <ul className="ig-actions">
        {ACTIONS.map((a) => {
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
                disabled={!!why}
                onClick={() => pick(a)}
              >
                <span className="ig-action-top">
                  <span className="ig-action-name">{ACTION_NAME[a]}</span>
                  {role && (
                    <span className="ig-claim" data-role={role}>
                      <Glyph role={role} size={14} />
                      {ROLE_NAME[role]}
                    </span>
                  )}
                </span>
                <span className="ig-action-effect">{why ?? ACTION_EFFECT[a]}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {chosen && (
        <div className="ig-target">
          <span className="ig-target-label">{s.play.chooseTarget}</span>
          <div className="chips">
            {targets.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={target === p.id} onClick={() => setTarget(p.id)}>
                {nick(p.id)}
                <span className="chip-count">{p.coins}</span>
              </button>
            ))}
          </div>
          <div className="ig-row">
            <button type="button" className="btn btn-ghost" onClick={() => setChosen(null)}>
              {s.play.cancel}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg ig-grow"
              disabled={!target}
              onClick={() => void send({ type: 'act', turn: view.turn, action: chosen, target })}
            >
              {s.play.confirm(ACTION_NAME[chosen], target ? nick(target) : null)}
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

  return (
    <section className="ig-window" data-kind={w.kind} aria-live="polite">
      <div className="ig-window-head">
        <span className="ig-count mono" data-low={secs <= 3 || undefined} aria-label={`${secs} saniye`}>
          {secs}
        </span>
        <div className="ig-window-text">
          <p className="ig-window-title">{title}</p>
          <p className="ig-window-hint">{hint}</p>
        </div>
        {w.claimRole && <RoleCard role={w.claimRole} tag="?" />}
      </div>
      <Bar remaining={remaining} total={view.durationMs} />
      <p className="ig-small dim ig-passed">{s.play.passedList(w.passed.length, w.eligible.length)}</p>

      {eligible && !passed && (
        <div className="ig-responses">
          {canLie && (
            <button type="button" className="btn btn-lg btn-block ig-lie" onClick={() => void send({ type: 'challenge', windowId: w.id })}>
              {s.play.lie}
            </button>
          )}
          {canBlock &&
            w.blockRoles.map((r) => (
              <button key={r} type="button" className="btn btn-outline btn-lg btn-block ig-block" data-role={r} onClick={() => void send({ type: 'block', windowId: w.id, role: r })}>
                <Glyph role={r} size={20} />
                {s.play.blockAs(ROLE_NAME[r])}
              </button>
            ))}
          <button type="button" className="btn btn-ghost btn-lg btn-block" onClick={() => void send({ type: 'pass', windowId: w.id })}>
            {s.play.pass}
          </button>
        </div>
      )}
      {eligible && passed && <p className="ig-small dim ig-center">{s.play.passed}</p>}
      {!eligible && <p className="ig-small dim ig-center">{w.claimant === meId ? s.play.waiting : s.play.noSay}</p>}
    </section>
  );
}

function LosePicker({ view, remaining, send }: { view: IntrigueView; remaining: number; send: Send }) {
  const [pick, setPick] = useState<string | null>(null);
  const card = view.me.hand.find((c) => c.id === pick);
  return (
    <section className="ig-panel ig-panel-alert" aria-labelledby="ig-lose-title">
      <h2 id="ig-lose-title" className="ig-panel-title">
        {LOSE_REASON[view.lose!.reason]}
      </h2>
      <p className="ig-small dim">{s.play.loseMeHint}</p>
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
    <section className="ig-panel" aria-labelledby="ig-ex-title">
      <h2 id="ig-ex-title" className="ig-panel-title">
        {s.play.exMeTitle}
      </h2>
      <p className="ig-small dim">{s.play.exMeHint(ex.keep)}</p>
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
      <p className="ig-small dim">
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
      <div className="ig-panel-head">
        <h2 id="ig-hand-title" className="ig-panel-title">
          {s.play.hand}
        </h2>
        <span className="ig-purse mono" aria-label={s.play.coins(view.me.coins)}>
          <Coin size={16} />
          {view.me.coins}
        </span>
      </div>
      {view.me.hand.length === 0 && revealed.length === 0 ? (
        <p className="ig-small dim">{s.play.noHand}</p>
      ) : (
        <ul className="ig-hand-cards">
          {view.me.hand.map((c) => (
            <li key={c.id}>
              <RoleCard role={c.role} />
              <span className="ig-hand-ability">{ROLE_ABILITY[c.role]}</span>
            </li>
          ))}
          {revealed.map((r, i) => (
            <li key={`r${i}`}>
              <RoleCard role={r} dead />
              <span className="ig-hand-ability dim">{s.play.out}</span>
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
    const t = setTimeout(() => setShow(null), 2800);
    return () => clearTimeout(t);
  }, [view.flash]);
  if (!show) return null;
  const role = ROLE_NAME[show.role];
  return (
    <div className="ig-overlay" role="alert" onClick={() => setShow(null)}>
      <div className="ig-overlay-body" data-had={show.had || undefined}>
        <span className="ig-flip">
          <RoleCard role={show.role} size="big" dead={!show.had} />
        </span>
        <p className="ig-overlay-title">{show.had ? s.play.flashTrue(nick(show.claimant), role) : s.play.flashFalse(nick(show.claimant), role)}</p>
        <p className="muted ig-small">{show.had ? s.play.flashTrueHint(nick(show.challenger)) : s.play.flashFalseHint}</p>
      </div>
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

function Podium({ view, members, meId }: { view: IntrigueView; members: Members; meId: string }) {
  const winner = view.winner ? members.get(view.winner) : null;
  const ranked = [...view.players].sort((a, b) => (b.out ?? 99) - (a.out ?? 99));
  return (
    <main className="col podium ig-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <div className="podium-winner">
        <h1 className="podium-name">{winner ? s.podium.winner(winner.nick) : s.podium.none}</h1>
        <p className="dim">{s.podium.title}</p>
      </div>
      <section className="ig-podium-list">
        <h2 className="ig-side-title">{s.podium.order}</h2>
        <ol className="sg-score-list">
          {ranked.map((p) => {
            const m = members.get(p.id);
            return (
              <li key={p.id} className="sg-score" data-me={p.id === meId || undefined} data-first={p.id === view.winner || undefined}>
                {m && <Avatar avatar={m.avatar} nick={m.nick} size={26} />}
                <span className="sg-score-name">{m?.nick ?? '?'}</span>
                <span className="ig-podium-cards">
                  {p.revealed.map((r, i) => (
                    <RoleCard key={i} role={r} size="mini" dead />
                  ))}
                </span>
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
