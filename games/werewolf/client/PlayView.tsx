import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import {
  ALL_ROLES,
  CHAT_MAX,
  sideOf,
  type ChatMsg,
  type LogEntry,
  type NightTurn,
  type Role,
  type SecretEntry,
  type WerewolfSettings,
  type WerewolfView,
} from '../shared/index.js';
import { RoleGlyph, SkyDisc } from './Glyphs';
import { s } from './strings';

type Send = (a: unknown) => Promise<boolean>;
type Nick = (id: string) => string;
type Members = Map<string, RoomPlayer>;

/* ---------- Saat ---------- */

function useServerNow(serverNow: number): number {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return now + offset;
}

/** Bu aşamanın toplam süresi: oturum değişince ilk görünümden ölçülür. */
function usePhaseTotal(view: WerewolfView): number {
  const ref = useRef<{ session: number; total: number } | null>(null);
  if (!ref.current || ref.current.session !== view.session) {
    ref.current = { session: view.session, total: Math.max(1, view.endsAt - view.serverNow) };
  }
  return ref.current.total;
}

/* ---------- Ana görünüm ---------- */

export function PlayView({ view, meId, room, act, settings }: PlayViewProps<WerewolfView, WerewolfSettings>) {
  const members: Members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick: Nick = (id) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const plainNick: Nick = (id) => members.get(id)?.nick ?? '?';
  const isHost = room.hostId === meId;
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => setError(null), [view.session]);

  const send: Send = async (action) => {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
    return res.ok;
  };

  const time = view.phase === 'night' ? 'night' : view.phase === 'over' ? 'over' : 'day';
  const me = view.me;

  /** Ekranda görünen roller: oyun sonunda hepsi; hayaletse (ayar açıksa) hepsi; yoksa açıklananlar + kart basılıyken kurt dostları. */
  const knownRoles = useMemo(() => {
    const map = new Map<string, Role>();
    for (const seat of view.seats) if (seat.role) map.set(seat.id, seat.role);
    if (view.roles) for (const [id, r] of Object.entries(view.roles)) map.set(id, r);
    if (view.ghost?.roles) for (const [id, r] of Object.entries(view.ghost.roles)) map.set(id, r);
    if (reveal && me) {
      map.set(meId, me.role);
      for (const a of me.allies) map.set(a, 'wolf');
    }
    return map;
  }, [view.seats, view.roles, view.ghost, reveal, me, meId]);

  const village = <Village view={view} members={members} meId={meId} knownRoles={knownRoles} />;
  const log = <Log view={view} nick={plainNick} />;

  return (
    <div className="ww sg" data-time={time}>
      <div className="ww-sky" aria-hidden="true" />

      <aside className="sg-side sg-left">
        {village}
        <InGame view={view} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round">{s.phase[view.phase]}</span>
          {view.day > 0 && view.phase !== 'over' && (
            <span>{view.phase === 'night' ? s.play.night(view.day) : s.play.day(view.day)}</span>
          )}
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.phase !== 'over' && <Clock view={view} />}

        {me && view.phase !== 'over' && <RoleCard view={view} nick={plainNick} reveal={reveal} setReveal={setReveal} />}

        <Stage view={view} meId={meId} isHost={isHost} nick={nick} plainNick={plainNick} members={members} send={send} />

        {error && (
          <p className="error-text ww-center" role="alert">
            {error}
          </p>
        )}

        {me?.wolfChat && me.alive && view.phase === 'night' && (
          <Chat
            title={s.play.wolfChat}
            hint={s.play.wolfChatHint}
            kind="wolf"
            messages={me.wolfChat}
            nick={plainNick}
            meId={meId}
            onSend={(text) => send({ type: 'wolfChat', text })}
          />
        )}

        {view.ghost && view.phase !== 'over' && <Ghosts view={view} nick={plainNick} meId={meId} send={send} />}

        <div className="sg-mobile-only">
          {village}
          {log}
          <InGame view={view} />
        </div>

        <HowTo />
      </main>

      <aside className="sg-side sg-right">
        {log}
        <Rules settings={settings} />
      </aside>
    </div>
  );
}

/* ---------- Gök saati ---------- */

function Clock({ view }: { view: WerewolfView }) {
  const now = useServerNow(view.serverNow);
  const total = usePhaseTotal(view);
  const left = Math.max(0, view.endsAt - now);
  const sec = Math.ceil(left / 1000);
  const night = view.phase === 'night';
  const title = night ? s.play.night(view.day) : s.phase[view.phase];
  const sub = night && view.nightStep ? s.stepWakes[view.nightStep] : view.phase === 'discuss' || view.phase === 'vote' ? s.play.day(view.day) : null;
  return (
    <section className="ww-clock" aria-live="polite">
      <div className="ww-clock-disc">
        <SkyDisc time={night ? 'night' : 'day'} progress={1 - left / total} />
        <span className="ww-clock-sec mono" aria-label={`${sec} sn`}>
          {sec}
        </span>
      </div>
      <div className="ww-clock-text">
        <h1 className="ww-clock-title">{title}</h1>
        {sub && <p className="ww-clock-sub">{sub}</p>}
        {night && view.nightSteps.length > 0 && (
          <ol className="ww-steps" aria-label={s.play.nightOrder}>
            {view.nightSteps.map((st, i) => {
              const cur = view.nightSteps.indexOf(view.nightStep!);
              return (
                <li key={st} data-state={i < cur ? 'done' : i === cur ? 'now' : 'next'}>
                  {s.step[st]}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

/* ---------- Rol kartı: basılı tutunca açılır ---------- */

function RoleCard({ view, nick, reveal, setReveal }: { view: WerewolfView; nick: Nick; reveal: boolean; setReveal: (v: boolean) => void }) {
  const me = view.me!;
  useEffect(() => {
    if (!reveal) return;
    const hide = () => setReveal(false);
    window.addEventListener('pointerup', hide);
    window.addEventListener('blur', hide);
    return () => {
      window.removeEventListener('pointerup', hide);
      window.removeEventListener('blur', hide);
    };
  }, [reveal, setReveal]);

  return (
    <button
      type="button"
      className="ww-rolecard"
      data-open={reveal || undefined}
      data-role={reveal ? me.role : undefined}
      data-dead={!me.alive || undefined}
      aria-pressed={reveal}
      onPointerDown={(e) => {
        e.preventDefault();
        setReveal(true);
      }}
      onPointerUp={() => setReveal(false)}
      onPointerCancel={() => setReveal(false)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setReveal(true);
        }
      }}
      onKeyUp={() => setReveal(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {reveal ? (
        <span className="ww-rolecard-face">
          <span className="ww-rolecard-head">
            <span className="ww-rolecard-icon">
              <RoleGlyph role={me.role} size={30} />
            </span>
            <span className="ww-rolecard-role">{s.role[me.role]}</span>
          </span>
          <span className="ww-rolecard-blurb">{s.roleBlurb[me.role]}</span>
          {me.role === 'wolf' && (
            <span className="ww-rolecard-line">
              {me.allies.length ? (
                <>
                  {s.play.allies}: <b>{me.allies.map(nick).join(', ')}</b>
                </>
              ) : (
                s.play.noAllies
              )}
            </span>
          )}
          {me.lover && (
            <span className="ww-rolecard-line" data-kind="lover">
              {s.play.lover(nick(me.lover.id), s.side[me.lover.side])}
              {me.lover.side !== sideOf(me.role) && <> {s.play.loverMixed}</>}
            </span>
          )}
          {me.cupidPair && <span className="ww-rolecard-line">{s.play.cupidPair(nick(me.cupidPair[0]), nick(me.cupidPair[1]))}</span>}
          {me.seerResults.length > 0 && (
            <span className="ww-rolecard-line">
              {s.play.seerResults}:{' '}
              {me.seerResults.map((r, i) => (
                <span key={r.night}>
                  {i > 0 && ', '}
                  <b>{nick(r.id)}</b> {r.wolf ? s.play.isWolf : s.play.notWolf}
                </span>
              ))}
            </span>
          )}
          {me.potions && <span className="ww-rolecard-line">{s.play.potions(me.potions.heal, me.potions.poison)}</span>}
          {!me.alive && <span className="ww-rolecard-line">{s.play.youDied}</span>}
        </span>
      ) : (
        <span className="ww-rolecard-back">
          <span className="ww-rolecard-hold">{s.play.roleHold}</span>
          <span className="ww-rolecard-hint">{s.play.roleHoldHint}</span>
        </span>
      )}
    </button>
  );
}

/* ---------- Oyuncu ızgarası (hedef seçimi) ---------- */

function PlayerGrid({
  ids,
  members,
  meId,
  picked,
  disabled,
  badge,
  label,
  onPick,
  tone,
}: {
  ids: string[];
  members: Members;
  meId: string;
  picked?: (id: string) => boolean;
  disabled?: (id: string) => string | null;
  badge?: (id: string) => ReactNode;
  label: (nick: string) => string;
  onPick?: (id: string) => void;
  tone?: 'wolf' | 'day' | 'love' | 'seer' | 'heal' | 'poison';
}) {
  return (
    <ul className="ww-grid" data-tone={tone}>
      {ids.map((id) => {
        const m = members.get(id);
        const name = m?.nick ?? '?';
        const off = disabled?.(id) ?? null;
        return (
          <li key={id}>
            <button
              type="button"
              className="ww-tile"
              aria-pressed={picked?.(id) ?? false}
              aria-label={label(name)}
              disabled={!onPick || !!off}
              title={off ?? undefined}
              onClick={() => onPick?.(id)}
            >
              <Avatar avatar={m?.avatar ?? { shape: 'circle', color: 'mint' }} nick={name} size={34} dim={!m?.connected} />
              <span className="ww-tile-name">
                {name}
                {id === meId && <span className="dim"> ({s.play.you})</span>}
              </span>
              {off && <span className="ww-tile-note">{off}</span>}
              {badge && <span className="ww-tile-badge">{badge(id)}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Aşamalar ---------- */

interface StageProps {
  view: WerewolfView;
  meId: string;
  isHost: boolean;
  nick: Nick;
  plainNick: Nick;
  members: Members;
  send: Send;
}

function Stage(props: StageProps) {
  const { view } = props;
  switch (view.phase) {
    case 'night':
      return <Night {...props} />;
    case 'hunter':
      return (
        <>
          <Dawn view={view} nick={props.plainNick} />
          <Hunter {...props} />
        </>
      );
    case 'discuss':
      return (
        <>
          <Dawn view={view} nick={props.plainNick} />
          <Discuss {...props} />
        </>
      );
    case 'vote':
      return <Vote {...props} />;
    case 'verdict':
      return <Verdict view={view} nick={props.plainNick} />;
    case 'over':
      return <Over {...props} />;
  }
}

/* ----- Gece ----- */

function Sleep({ note }: { note?: string }) {
  return (
    <section className="ww-sleep">
      <p className="ww-sleep-title">{s.play.sleepTitle}</p>
      <p className="ww-sleep-body">{note ?? s.play.sleepBody}</p>
    </section>
  );
}

function Night(props: StageProps) {
  const { view } = props;
  const me = view.me;
  if (!me) return <Sleep note={s.play.spectator} />;
  if (!me.alive) return <Sleep note={s.play.deadNight} />;
  if (!me.turn) return <Sleep />;
  return <Turn key={view.session} turn={me.turn} {...props} />;
}

function Turn({ turn, view, meId, members, nick, plainNick, send }: StageProps & { turn: NightTurn }) {
  const [local, setLocal] = useState<string[]>([]);
  const [heal, setHeal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentPair, setSentPair] = useState<[string, string] | null>(null);
  const session = view.session;

  async function go(action: unknown, optimistic?: string[]) {
    setBusy(true);
    const ok = await send(action);
    setBusy(false);
    if (ok && optimistic) setLocal(optimistic);
  }

  switch (turn.step) {
    case 'cupid': {
      const done = turn.pair ?? sentPair;
      if (done) {
        return (
          <section className="ww-panel" data-step="cupid">
            <p className="ww-done">{s.play.cupidDone(nick(done[0]), nick(done[1]))}</p>
          </section>
        );
      }
      const pick = (id: string) => setLocal((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)));
      return (
        <section className="ww-panel" data-step="cupid">
          <h2 className="ww-title">{s.play.cupidTitle}</h2>
          <PlayerGrid ids={turn.targets} members={members} meId={meId} tone="love" picked={(id) => local.includes(id)} label={(n) => n} onPick={pick} />
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            disabled={local.length !== 2 || busy}
            onClick={() =>
              void send({ type: 'cupid', session, a: local[0], b: local[1] }).then((ok) => ok && setSentPair([local[0]!, local[1]!]))
            }
          >
            {local.length === 2 ? s.play.cupidConfirm(plainNick(local[0]!), plainNick(local[1]!)) : s.play.cupidPick}
          </button>
          <p className="ww-hint">{s.play.cupidHint}</p>
        </section>
      );
    }

    case 'wolves': {
      const mine = local[0] ?? turn.votes[meId] ?? null;
      const tally = new Map<string, string[]>();
      for (const [w, t] of Object.entries({ ...turn.votes, ...(local[0] ? { [meId]: local[0] } : {}) })) {
        tally.set(t, [...(tally.get(t) ?? []), w]);
      }
      return (
        <section className="ww-panel" data-step="wolves">
          <h2 className="ww-title">{s.play.wolvesTitle}</h2>
          <PlayerGrid
            ids={turn.targets}
            members={members}
            meId={meId}
            tone="wolf"
            picked={(id) => id === mine}
            label={(n) => n}
            badge={(id) => {
              const by = tally.get(id);
              return by?.length ? <span className="ww-claw" title={by.map(plainNick).join(', ')}>{s.play.wolfVotes(by.length)}</span> : null;
            }}
            onPick={(id) => void go({ type: 'wolfVote', session, target: id }, [id])}
          />
          {mine && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => void go({ type: 'wolfVote', session, target: null }, [])}>
              {s.play.wolvesWithdraw}
            </button>
          )}
          <p className="ww-hint">{s.play.wolvesHint}</p>
        </section>
      );
    }

    case 'seer': {
      if (turn.result) {
        return (
          <section className="ww-panel" data-step="seer">
            <div className="ww-reveal" data-wolf={turn.result.wolf || undefined}>
              <RoleGlyph role={turn.result.wolf ? 'wolf' : 'villager'} size={34} />
              <p>{turn.result.wolf ? s.play.seerIsWolf(plainNick(turn.result.id)) : s.play.seerNotWolf(plainNick(turn.result.id))}</p>
            </div>
            <p className="ww-hint">{s.play.stepDone}</p>
          </section>
        );
      }
      return (
        <section className="ww-panel" data-step="seer">
          <h2 className="ww-title">{s.play.seerTitle}</h2>
          <PlayerGrid
            ids={turn.targets}
            members={members}
            meId={meId}
            tone="seer"
            picked={(id) => local.includes(id)}
            label={(n) => n}
            onPick={busy || local.length ? undefined : (id) => void go({ type: 'seer', session, target: id }, [id])}
          />
          <p className="ww-hint">{local.length ? s.play.pending : s.play.seerHint}</p>
        </section>
      );
    }

    case 'doctor': {
      const picked = turn.picked ?? local[0] ?? null;
      if (picked) {
        return (
          <section className="ww-panel" data-step="doctor">
            <p className="ww-done">{s.play.doctorDone(nick(picked))}</p>
            <p className="ww-hint">{s.play.stepDone}</p>
          </section>
        );
      }
      return (
        <section className="ww-panel" data-step="doctor">
          <h2 className="ww-title">{s.play.doctorTitle}</h2>
          <PlayerGrid
            ids={turn.targets}
            members={members}
            meId={meId}
            tone="heal"
            label={(n) => n}
            disabled={(id) => (id === turn.blocked ? s.play.doctorBlocked : null)}
            onPick={busy ? undefined : (id) => void go({ type: 'doctor', session, target: id }, [id])}
          />
          <p className="ww-hint">{s.play.doctorHint}</p>
        </section>
      );
    }

    case 'witch': {
      if (turn.done || local[0] === 'done') {
        return (
          <section className="ww-panel" data-step="witch">
            <p className="ww-done">{s.play.witchDone}</p>
          </section>
        );
      }
      const poison = local[0] ?? null;
      return (
        <section className="ww-panel" data-step="witch">
          <h2 className="ww-title">{s.play.witchTitle}</h2>
          <p className="ww-witch-victim">{turn.victim ? s.play.witchVictim(plainNick(turn.victim)) : s.play.witchNoVictim}</p>
          {turn.victim &&
            (turn.canHeal ? (
              <button type="button" className="toggle" role="switch" aria-checked={heal} onClick={() => setHeal(!heal)}>
                <span>{s.play.witchHeal(plainNick(turn.victim))}</span>
                <span className="toggle-knob" aria-hidden="true" />
              </button>
            ) : (
              <p className="ww-hint">{s.play.witchHealUsed}</p>
            ))}
          {turn.canPoison ? (
            <>
              <h3 className="ww-sub">{s.play.witchPoison}</h3>
              <PlayerGrid
                ids={turn.targets}
                members={members}
                meId={meId}
                tone="poison"
                label={(n) => n}
                picked={(id) => id === poison}
                onPick={(id) => setLocal(id === poison ? [] : [id])}
              />
            </>
          ) : (
            <p className="ww-hint">{s.play.witchPoisonUsed}</p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            disabled={busy}
            onClick={() => void go({ type: 'witch', session, heal, poison }, ['done'])}
          >
            {s.play.witchConfirm}
          </button>
          <p className="ww-hint">{s.play.witchHint}</p>
        </section>
      );
    }
  }
}

/* ----- Sabah ----- */

function Dawn({ view, nick }: { view: WerewolfView; nick: Nick }) {
  const n = view.lastNight;
  if (!n || n.night !== view.day) return null;
  return (
    <section className="ww-dawn">
      <h2 className="ww-dawn-title">{s.play.dawnTitle(n.night)}</h2>
      {n.deaths.length === 0 ? (
        <p className="ww-dawn-none">{s.play.dawnNone}</p>
      ) : (
        <ul className="ww-dawn-list" aria-label={s.play.dawnDied}>
          {n.deaths.map((d) => (
            <li key={d.id} data-role={d.role ?? undefined}>
              <span className="ww-dawn-name">{nick(d.id)}</span>
              {d.role && (
                <span className="ww-rolechip" data-role={d.role}>
                  <RoleGlyph role={d.role} size={14} />
                  {s.role[d.role]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ----- Avcı ----- */

function Hunter({ view, meId, members, plainNick, send }: StageProps) {
  if (view.hunter !== meId) {
    return (
      <section className="ww-panel">
        <p className="ww-wait">{s.play.hunterWait(plainNick(view.hunter ?? ''))}</p>
      </section>
    );
  }
  const targets = view.seats.filter((x) => x.alive && x.id !== meId).map((x) => x.id);
  return (
    <section className="ww-panel" data-step="hunter">
      <h2 className="ww-title">{s.play.hunterTitle}</h2>
      <PlayerGrid ids={targets} members={members} meId={meId} tone="wolf" label={(n) => n} onPick={(id) => void send({ type: 'shoot', session: view.session, target: id })} />
      <p className="ww-hint">{s.play.hunterHint}</p>
    </section>
  );
}

/* ----- Tartışma ----- */

function Discuss({ view, meId, isHost, members, plainNick, send }: StageProps) {
  const mySeat = view.seats.find((x) => x.id === meId);
  const alive = view.seats.filter((x) => x.alive);
  const readyN = alive.filter((x) => x.ready).length;
  const amReady = !!mySeat?.ready;
  const canAct = !!mySeat?.alive;

  return (
    <section className="ww-panel">
      <p className="ww-rule">{s.play.discussRule}</p>

      <div className="ww-cands">
        <h2 className="ww-h">{s.play.candidates}</h2>
        {view.candidates.length === 0 ? (
          <p className="ww-hint">{s.play.noCandidates}</p>
        ) : (
          <ul className="ww-cand-list">
            {view.candidates.map((id) => {
              const by = view.seats.find((x) => x.id === id)?.nominatedBy ?? [];
              return (
                <li key={id}>
                  <b>{plainNick(id)}</b>
                  <span className="dim">{s.play.nominatedBy(by.map(plainNick).join(', '))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!mySeat ? (
        <p className="ww-wait">{s.play.spectator}</p>
      ) : !canAct ? (
        <p className="ww-wait">{s.play.deadDiscuss}</p>
      ) : (
        <>
          <h3 className="ww-sub">{s.play.discussPick}</h3>
          <PlayerGrid
            ids={alive.filter((x) => x.id !== meId).map((x) => x.id)}
            members={members}
            meId={meId}
            tone="day"
            picked={(id) => view.myNomination === id}
            label={(n) => s.play.nominate(n)}
            badge={(id) => {
              const n = view.seats.find((x) => x.id === id)?.nominatedBy.length ?? 0;
              return n ? <span className="ww-count mono">{n}</span> : null;
            }}
            onPick={(id) => void send({ type: 'nominate', session: view.session, target: view.myNomination === id ? null : id })}
          />
          {view.myNomination && <p className="ww-hint">{s.play.myNomination(plainNick(view.myNomination))}</p>}
          <button
            type="button"
            className={amReady ? 'btn btn-outline btn-block btn-lg' : 'btn btn-primary btn-block btn-lg'}
            onClick={() => void send({ type: 'ready', session: view.session, ready: !amReady })}
          >
            {amReady ? s.play.unready : s.play.readyBtn}
          </button>
        </>
      )}
      <p className="ww-hint ww-center">{s.play.readyCount(readyN, alive.length)}</p>
      {isHost && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void send({ type: 'hostSkip', session: view.session })}>
          {s.play.endDiscuss}
        </button>
      )}
    </section>
  );
}

/* ----- Oylama ----- */

function Vote({ view, meId, isHost, members, plainNick, send }: StageProps) {
  const mySeat = view.seats.find((x) => x.id === meId);
  const alive = view.seats.filter((x) => x.alive);
  const voted = alive.filter((x) => x.voted).length;
  const mine = view.myVote;
  const votersFor = (target: string | null) =>
    view.liveVotes
      ? Object.entries(view.liveVotes)
          .filter(([, t]) => t === target)
          .map(([v]) => v)
      : [];

  return (
    <section className="ww-panel">
      <h2 className="ww-title">{view.runoff ? s.play.runoffTitle : s.play.voteTitle}</h2>
      {!mySeat ? (
        <p className="ww-wait">{s.play.spectator}</p>
      ) : !mySeat.alive ? (
        <p className="ww-wait">{s.play.deadVote}</p>
      ) : null}
      <ul className="ww-ballot">
        {[...view.candidates, null].map((id) => {
          const m = id ? members.get(id) : null;
          const who = votersFor(id);
          return (
            <li key={id ?? 'none'}>
              <button
                type="button"
                className="ww-ballot-btn"
                data-none={id === null || undefined}
                aria-pressed={!!mine && mine.target === id}
                disabled={!mySeat?.alive}
                onClick={() => void send({ type: 'vote', session: view.session, target: id })}
              >
                {id ? (
                  <Avatar avatar={m?.avatar ?? { shape: 'circle', color: 'mint' }} nick={m?.nick ?? '?'} size={32} />
                ) : (
                  <span className="ww-ballot-none" aria-hidden="true" />
                )}
                <span className="ww-ballot-name">{id ? plainNick(id) : s.play.voteNone}</span>
                {view.liveVotes && <span className="ww-count mono">{who.length}</span>}
              </button>
              {who.length > 0 && <p className="ww-ballot-who">{who.map(plainNick).join(', ')}</p>}
            </li>
          );
        })}
      </ul>
      <p className="ww-hint ww-center">
        {mine ? `${s.play.voteMine(mine.target ? plainNick(mine.target) : s.play.nobody)}. ` : ''}
        {s.play.voteProgress(voted, alive.length)}. {s.play.voteHint(!!view.liveVotes)}
      </p>
      {isHost && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void send({ type: 'hostSkip', session: view.session })}>
          {s.play.endVote}
        </button>
      )}
    </section>
  );
}

/* ----- Karar ----- */

function Verdict({ view, nick }: { view: WerewolfView; nick: Nick }) {
  const v = view.lastVote;
  if (!v) return null;
  const hangedRole = v.hanged ? view.seats.find((x) => x.id === v.hanged)?.role : null;
  const max = Math.max(1, ...v.tally.map((t) => t.n));
  return (
    <section className="ww-panel ww-verdict" data-hanged={v.hanged ? true : undefined}>
      <h2 className="ww-verdict-title">
        {v.hanged ? s.play.hanged(nick(v.hanged)) : v.noCandidates ? s.play.sparedNone : v.tie ? s.play.sparedTie : s.play.spared}
      </h2>
      {hangedRole && (
        <p className="ww-rolechip" data-role={hangedRole}>
          <RoleGlyph role={hangedRole} size={14} />
          {s.play.hangedRole(s.role[hangedRole])}
        </p>
      )}
      {v.tally.length > 0 && (
        <ul className="ww-tally" aria-label={s.play.tally}>
          {[...v.tally]
            .sort((a, b) => b.n - a.n)
            .map((t) => (
              <li key={t.id ?? 'none'} data-top={t.id === v.hanged || undefined}>
                <span className="ww-tally-name">{t.id ? nick(t.id) : s.play.voteNone}</span>
                <span className="ww-tally-bar">
                  <span style={{ width: `${(t.n / max) * 100}%` }} />
                </span>
                <span className="mono ww-tally-n">{t.n}</span>
                {v.votes && (
                  <span className="ww-tally-who">
                    {Object.entries(v.votes)
                      .filter(([, x]) => x === t.id)
                      .map(([id]) => nick(id))
                      .join(', ')}
                  </span>
                )}
              </li>
            ))}
        </ul>
      )}
      <p className="ww-hint ww-center">{s.play.nightFalls}</p>
    </section>
  );
}

/* ----- Oyun sonu ----- */

function Over({ view, isHost, plainNick, send }: StageProps) {
  const now = useServerNow(view.serverNow);
  const left = Math.max(0, Math.ceil((view.finishAt - now) / 1000));
  const roles = view.roles ?? {};
  const lovers = view.lovers;
  const won = (id: string) => {
    const r = roles[id];
    if (!r || !view.winner) return false;
    const mixed = !!lovers && lovers.includes(id) && sideOf(roles[lovers[0]]!) !== sideOf(roles[lovers[1]]!);
    if (mixed) return view.winner === 'lovers';
    if (r === 'fool') return view.winner === 'fool';
    return view.winner === (r === 'wolf' ? 'wolves' : 'village');
  };
  return (
    <section className="ww-panel ww-over" data-winner={view.winner ?? 'none'}>
      <h1 className="ww-over-title">{view.winner ? s.play.winner[view.winner] : s.play.noWinner}</h1>
      <p className="ww-over-reason">{view.winReason ? s.play.reason[view.winReason] : ''}</p>
      <ul className="ww-over-roles" aria-label={s.play.rolesTitle}>
        {view.seats.map((seat) => {
          const r = roles[seat.id];
          return (
            <li key={seat.id} data-role={r} data-won={won(seat.id) || undefined} data-dead={!seat.alive || undefined}>
              {r && <RoleGlyph role={r} size={18} />}
              <span className="ww-over-name">{plainNick(seat.id)}</span>
              <b>{r ? s.role[r] : ''}</b>
            </li>
          );
        })}
      </ul>
      {view.secret && view.secret.length > 0 && (
        <details className="ww-secret">
          <summary>{s.play.secretTitle}</summary>
          <ol>
            {view.secret.map((e, i) => (
              <li key={i}>{secretText(e, plainNick)}</li>
            ))}
          </ol>
        </details>
      )}
      <p className="ww-hint ww-center">{s.play.backIn(left)}</p>
      {isHost && (
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'finish' })}>
          {s.play.backNow}
        </button>
      )}
    </section>
  );
}

/* ---------- Sohbet (kurtlar / hayaletler) ---------- */

function Chat({
  title,
  hint,
  kind,
  messages,
  nick,
  meId,
  onSend,
}: {
  title: string;
  hint: string;
  kind: 'wolf' | 'ghost';
  messages: ChatMsg[];
  nick: Nick;
  meId: string;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    if (await onSend(t)) setText('');
  }
  return (
    <section className="ww-chat" data-kind={kind}>
      <div className="ww-chat-head">
        <h2 className="ww-h">{title}</h2>
        <span className="ww-hint">{hint}</span>
      </div>
      <ol className="ww-chat-list" ref={listRef}>
        {messages.length === 0 && <li className="dim">{s.play.chatEmpty}</li>}
        {messages.map((m) => (
          <li key={m.n} data-me={m.from === meId || undefined}>
            <b>{nick(m.from)}</b> {m.text}
          </li>
        ))}
      </ol>
      <form className="ww-chat-form" onSubmit={(e) => void submit(e)}>
        <input
          className="input"
          value={text}
          maxLength={CHAT_MAX}
          placeholder={s.play.chatPlaceholder}
          aria-label={s.play.chatPlaceholder}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-outline" disabled={!text.trim()}>
          {s.play.send}
        </button>
      </form>
    </section>
  );
}

function Ghosts({ view, nick, meId, send }: { view: WerewolfView; nick: Nick; meId: string; send: Send }) {
  const g = view.ghost!;
  return (
    <section className="ww-ghosts">
      <Chat title={s.play.ghosts} hint={s.play.ghostHint} kind="ghost" messages={g.chat} nick={nick} meId={meId} onSend={(text) => send({ type: 'ghostChat', text })} />
      {g.secret && g.secret.length > 0 && (
        <details className="ww-secret">
          <summary>{s.play.ghostSecret}</summary>
          <ol>
            {g.secret.map((e, i) => (
              <li key={i}>{secretText(e, nick)}</li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

/* ---------- Köy (oyuncu listesi) ---------- */

function Village({ view, members, meId, knownRoles }: { view: WerewolfView; members: Members; meId: string; knownRoles: Map<string, Role> }) {
  const aliveN = view.seats.filter((x) => x.alive).length;
  return (
    <section className="ww-block">
      <div className="ww-block-head">
        <h2 className="ww-h">{s.play.village}</h2>
        <span className="ww-hint">{s.play.alive(aliveN)}</span>
      </div>
      <ol className="ww-seats">
        {view.seats.map((seat) => {
          const m = members.get(seat.id);
          const role = knownRoles.get(seat.id);
          return (
            <li key={seat.id} className="ww-seat" data-me={seat.id === meId || undefined} data-dead={!seat.alive || undefined}>
              <Avatar avatar={m?.avatar ?? { shape: 'circle', color: 'mint' }} nick={m?.nick ?? '?'} size={28} dim={!seat.alive || !m?.connected} />
              <span className="ww-seat-name">
                {m?.nick ?? '?'}
                {seat.id === meId && <span className="dim"> ({s.play.you})</span>}
              </span>
              <span className="ww-seat-tags">
                {role && (
                  <span className="ww-rolechip" data-role={role} title={s.role[role]}>
                    <RoleGlyph role={role} size={12} />
                    {s.rolePlural[role]}
                  </span>
                )}
                {!seat.alive && <span className="ww-tag" data-kind="dead">{s.play.dead}</span>}
                {seat.ready && <span className="ww-tag" data-kind="ready">{s.play.ready}</span>}
                {seat.voted && <span className="ww-tag" data-kind="voted">{s.play.voted}</span>}
                {seat.nominatedBy.length > 0 && <span className="ww-tag" data-kind="nom">{s.play.nominated(seat.nominatedBy.length)}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function InGame({ view }: { view: WerewolfView }) {
  const roles = ALL_ROLES.filter((r) => view.roleCounts[r] > 0);
  return (
    <section className="ww-block">
      <h2 className="ww-h">{s.play.inGame}</h2>
      <ul className="ww-ingame">
        {roles.map((r) => (
          <li key={r} data-role={r}>
            <RoleGlyph role={r} size={16} />
            <span>{s.role[r]}</span>
            <span className="mono">{view.roleCounts[r]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Rules({ settings }: { settings: WerewolfSettings }) {
  const rows: [string, string][] = [
    [s.settings.roleSeconds, s.settings.sec(settings.roleSeconds)],
    [s.settings.discussSeconds, s.settings.sec(settings.discussSeconds)],
    [s.settings.voteSeconds, s.settings.sec(settings.voteSeconds)],
    [s.settings.dayTie, s.settings.dayTieOpts[settings.dayTie]],
    [s.settings.wolfTie, s.settings.wolfTieOpts[settings.wolfTie]],
  ];
  const flags: [string, boolean][] = [
    [s.settings.revealRoles, settings.revealRoles],
    [s.settings.openVotes, settings.openVotes],
    [s.settings.doctorNoRepeat, settings.doctorNoRepeat],
    [s.settings.ghostsSeeRoles, settings.ghostsSeeRoles],
  ];
  return (
    <section className="ww-block">
      <h2 className="ww-h">{s.settings.rules}</h2>
      <dl className="ww-rules">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {flags.map(([k, on]) => (
          <div key={k} data-off={!on || undefined}>
            <dt>{k}</dt>
            <dd>{on ? 'Açık' : 'Kapalı'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- Günlükler ---------- */

function roleSuffix(role: Role | null): string {
  return role ? ` (${s.role[role]})` : '';
}

function logText(e: LogEntry, nick: Nick): string {
  switch (e.k) {
    case 'start':
      return `Oyun ${e.players} kişiyle başladı. Herkes rolünü öğrendi.`;
    case 'night':
      return `${e.night}. gece çöktü.`;
    case 'dawn':
      return e.deaths.length
        ? `Sabah oldu. Gece ölenler: ${e.deaths.map((d) => nick(d.id) + roleSuffix(d.role)).join(', ')}.`
        : 'Sabah oldu. Bu gece kimse ölmedi.';
    case 'grief':
      return `${nick(e.id)}${roleSuffix(e.role)}, ${nick(e.partner)} için kalp acısından öldü.`;
    case 'shot':
      return `Avcı ${nick(e.hunter)} son atışıyla ${nick(e.target)}${roleSuffix(e.role)} kişisini vurdu.`;
    case 'noShot':
      return `Avcı ${nick(e.hunter)} atış yapmadan öldü.`;
    case 'nominate':
      return `${nick(e.by)}, ${nick(e.target)} kişisini aday gösterdi.`;
    case 'noCandidates':
      return 'Kimse aday gösterilmedi; bugün kimse asılmadı.';
    case 'runoff':
      return `Oylar eşit: ${e.candidates.map(nick).join(' ve ')} arasında ikinci tur.`;
    case 'hanged':
      return `${nick(e.id)}${roleSuffix(e.role)} ${e.votes} oyla asıldı.`;
    case 'spared':
      return e.tie ? 'Oylar eşit çıktı; kimse asılmadı.' : 'Köy bugün kimseyi asmadı.';
    case 'over':
      return `${e.winner ? s.play.winner[e.winner] : s.play.noWinner}. ${s.play.reason[e.reason]}`;
  }
}

function secretText(e: SecretEntry, nick: Nick): string {
  switch (e.k) {
    case 'lovers':
      return `${e.night}. gece: aşk okçusu ${nick(e.a)} ile ${nick(e.b)} kişisini âşık etti.`;
    case 'wolves':
      return e.target ? `${e.night}. gece: kurtlar ${nick(e.target)} kişisini seçti.` : `${e.night}. gece: kurtlar kimseyi seçemedi.`;
    case 'seer':
      return `${e.night}. gece: kahin ${nick(e.seer)}, ${nick(e.target)} kişisine baktı (${e.wolf ? 'kurt' : 'kurt değil'}).`;
    case 'doctor':
      return `${e.night}. gece: doktor ${nick(e.doctor)}, ${nick(e.target)} kişisini korudu.`;
    case 'heal':
      return `${e.night}. gece: cadı ${nick(e.witch)}, ${nick(e.target)} kişisini iyileştirdi.`;
    case 'poison':
      return `${e.night}. gece: cadı ${nick(e.witch)}, ${nick(e.target)} kişisini zehirledi.`;
    case 'saved':
      return `${e.night}. gece: ${nick(e.target)} kurtlardan kurtuldu.`;
  }
}

function Log({ view, nick }: { view: WerewolfView; nick: Nick }) {
  const entries = [...view.log].reverse();
  return (
    <section className="ww-block">
      <h2 className="ww-h">{s.play.log}</h2>
      <ol className="ww-log">
        {entries.map((e, i) => (
          <li key={view.log.length - i} data-k={e.k}>
            {logText(e, nick)}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Nasıl oynanır ---------- */

function HowTo() {
  return (
    <section className="howto" aria-labelledby="ww-howto">
      <h2 id="ww-howto" className="howto-title">
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
      <h3 className="ww-h">{s.howto.roleTable}</h3>
      <table className="ww-roletable">
        <tbody>
          {ALL_ROLES.map((r) => (
            <tr key={r} data-role={r}>
              <th scope="row">
                <RoleGlyph role={r} size={16} />
                {s.role[r]}
              </th>
              <td>{s.roleBlurb[r]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
