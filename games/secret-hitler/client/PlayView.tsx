import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer, RoomState } from '@songie/shared';
import {
  FASCIST_TO_WIN,
  HITLER_ZONE,
  LIBERAL_TO_WIN,
  VETO_AT,
  type LogEntry,
  type Policy,
  type Role,
  type SecretHitlerSettings,
  type SecretHitlerView,
} from '../shared/index.js';
import { PolicyGlyph, PowerGlyph } from './Glyphs';
import { SettingsPanel } from './SettingsPanel';
import { LICENSE_URL, SITE_URL, s } from './strings';

type Send = (a: unknown) => Promise<void>;
type Nick = (id: string) => string;

function useServerNow(serverNow: number): number {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return now + offset;
}

const roleParty = (r: Role) => (r === 'liberal' ? 'liberal' : 'fascist');

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<SecretHitlerView, SecretHitlerSettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick: Nick = (id) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const plainNick: Nick = (id) => members.get(id)?.nick ?? '?';
  const isHost = room.hostId === meId;
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  async function send(action: unknown) {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
  }

  /** Bu oyuncunun ekranında görebileceği roller: oyun sonunda hepsi, öncesinde yalnızca rol kartı açıkken takım. */
  const knownRoles = useMemo(() => {
    const map = new Map<string, Role>();
    if (view.roles) for (const [id, r] of Object.entries(view.roles)) map.set(id, r);
    else if (reveal && view.me) {
      map.set(meId, view.me.role);
      for (const k of view.me.known) map.set(k.id, k.role);
    }
    return map;
  }, [view.roles, view.me, reveal, meId]);

  const panelProps = {
    settings,
    editable: isHost,
    api,
    players: room.players,
    meId,
    onChange: (n: SecretHitlerSettings) => void setSettings(n),
  };

  const seats = <Seats view={view} members={members} meId={meId} knownRoles={knownRoles} />;
  const log = <Log view={view} nick={plainNick} />;

  return (
    <div className="sh sg">
      <aside className="sg-side sg-left">
        <section className="sh-block">
          <h2 className="sh-h">{s.play.table}</h2>
          {seats}
        </section>
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round">{s.phase[view.phase]}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        {view.me && view.phase !== 'over' && <RoleCard view={view} nick={plainNick} reveal={reveal} setReveal={setReveal} />}

        <Action view={view} meId={meId} isHost={isHost} nick={nick} plainNick={plainNick} send={send} />
        {error && (
          <p className="error-text sh-center" role="alert">
            {error}
          </p>
        )}
        {isHost && <HostBar view={view} room={room} nick={plainNick} send={send} />}

        <Tracks view={view} />

        <div className="sg-mobile-only">
          <section className="sh-block">
            <h2 className="sh-h">{s.play.table}</h2>
            {seats}
          </section>
          {log}
        </div>

        <HowTo />
      </main>

      <aside className="sg-side sg-right">
        {log}
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>
    </div>
  );
}

/* ---------- Rol kartı: varsayılan kapalı, basılı tutunca açılır ---------- */

function RoleCard({
  view,
  nick,
  reveal,
  setReveal,
}: {
  view: SecretHitlerView;
  nick: Nick;
  reveal: boolean;
  setReveal: (v: boolean) => void;
}) {
  const me = view.me!;
  const party = roleParty(me.role);
  const blurb =
    me.role === 'liberal'
      ? s.play.roleLiberal
      : me.role === 'fascist'
        ? s.play.roleFascist
        : me.known.length
          ? s.play.roleHitlerKnows
          : s.play.roleHitlerBlind;

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
      className="sh-rolecard"
      data-open={reveal || undefined}
      data-party={reveal ? party : undefined}
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
        <span className="sh-rolecard-face">
          <span className="sh-rolecard-role">{s.role[me.role]}</span>
          <span className="sh-rolecard-blurb">{blurb}</span>
          {me.known.length > 0 && (
            <span className="sh-rolecard-team">
              {s.play.roleTeam}:{' '}
              {me.known.map((k, i) => (
                <span key={k.id}>
                  {i > 0 && ', '}
                  <b>{nick(k.id)}</b> ({s.role[k.role]})
                </span>
              ))}
            </span>
          )}
          {me.investigations.length > 0 && (
            <span className="sh-rolecard-team">
              {s.play.investigations}:{' '}
              {me.investigations.map((r, i) => (
                <span key={r.target}>
                  {i > 0 && ', '}
                  <b>{nick(r.target)}</b> {s.party[r.party].toLocaleLowerCase('tr-TR')}
                </span>
              ))}
            </span>
          )}
        </span>
      ) : (
        <span className="sh-rolecard-back">
          <span className="sh-rolecard-hold">{s.play.roleHold}</span>
          <span className="sh-rolecard-hint">{s.play.roleHoldHint}</span>
        </span>
      )}
    </button>
  );
}

/* ---------- Pistler ---------- */

function Tracks({ view }: { view: SecretHitlerView }) {
  return (
    <section className="sh-tracks" aria-label={`${s.play.liberalTrack}, ${s.play.fascistTrack}`}>
      <div className="sh-track" data-party="liberal">
        <div className="sh-track-head">
          <h2 className="sh-h">{s.play.liberalTrack}</h2>
          <span className="mono sh-track-count">
            {view.liberal}/{LIBERAL_TO_WIN}
          </span>
        </div>
        <ol className="sh-slots" style={{ '--n': LIBERAL_TO_WIN } as React.CSSProperties}>
          {Array.from({ length: LIBERAL_TO_WIN }, (_, i) => (
            <li key={i} className="sh-slot" data-filled={i < view.liberal || undefined}>
              {i < view.liberal && <PolicyGlyph policy="liberal" size={20} />}
            </li>
          ))}
        </ol>
      </div>

      <div className="sh-track" data-party="fascist">
        <div className="sh-track-head">
          <h2 className="sh-h">{s.play.fascistTrack}</h2>
          <span className="mono sh-track-count">
            {view.fascist}/{FASCIST_TO_WIN}
          </span>
        </div>
        <ol className="sh-slots" style={{ '--n': FASCIST_TO_WIN } as React.CSSProperties}>
          {view.track.map((power, i) => (
            <li
              key={i}
              className="sh-slot"
              data-filled={i < view.fascist || undefined}
              data-zone={i >= HITLER_ZONE || undefined}
              title={power ? `${s.power[power]}: ${s.powerHint[power]}` : undefined}
            >
              {i < view.fascist ? (
                <PolicyGlyph policy="fascist" size={20} />
              ) : power ? (
                <span className="sh-slot-power">
                  <PowerGlyph power={power} size={16} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="sh-track-note">
          {view.fascist >= VETO_AT ? s.play.vetoZone : s.play.hitlerZone}
        </p>
        <ul className="sh-legend-powers">
          {[...new Set(view.track.filter((p) => p !== null))].map((p) => (
            <li key={p}>
              <PowerGlyph power={p} size={13} />
              {s.power[p]}
            </li>
          ))}
        </ul>
      </div>

      <div className="sh-meta">
        <div className="sh-tracker" title={s.play.trackerHint}>
          <span className="sh-meta-label">{s.play.tracker}</span>
          <span className="sh-tracker-dots" aria-label={`${view.electionTracker}/3`}>
            {[0, 1, 2].map((i) => (
              <span key={i} data-on={i < view.electionTracker || undefined} />
            ))}
          </span>
        </div>
        <div className="sh-pile">
          <span className="sh-meta-label">{s.play.deck}</span>
          <span className="mono">{view.deckCount}</span>
        </div>
        <div className="sh-pile">
          <span className="sh-meta-label">{s.play.discard}</span>
          <span className="mono">{view.discardCount}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Oyuncu halkası ---------- */

function Seats({
  view,
  members,
  meId,
  knownRoles,
}: {
  view: SecretHitlerView;
  members: Map<string, RoomPlayer>;
  meId: string;
  knownRoles: Map<string, Role>;
}) {
  const showVotes = view.phase !== 'vote' && view.lastVote;
  return (
    <ol className="sh-seats">
      {view.seats.map((seat) => {
        const m = members.get(seat.id);
        const role = knownRoles.get(seat.id);
        const vote = showVotes ? view.lastVote!.votes[seat.id] : undefined;
        const isPres = view.president === seat.id && view.phase !== 'over';
        const isChan = view.chancellor === seat.id && view.phase !== 'over';
        return (
          <li
            key={seat.id}
            className="sh-seat"
            data-me={seat.id === meId || undefined}
            data-dead={!seat.alive || undefined}
            data-party={role ? roleParty(role) : undefined}
          >
            <Avatar avatar={m?.avatar ?? { shape: 'circle', color: 'mint' }} nick={m?.nick ?? '?'} size={28} dim={!seat.alive || !m?.connected} />
            <span className="sh-seat-name">
              {m?.nick ?? '?'}
              {seat.id === meId && <span className="dim"> ({s.play.you})</span>}
            </span>
            <span className="sh-seat-tags">
              {role && <span className="sh-tag" data-role={role}>{s.role[role]}</span>}
              {!seat.alive && <span className="sh-tag" data-kind="dead">{s.play.dead}</span>}
              {isPres && <span className="sh-tag" data-kind="pres">{s.play.president}</span>}
              {isChan && (
                <span className="sh-tag" data-kind="chan">
                  {view.phase === 'nominate' || view.phase === 'vote' ? s.play.nominee : s.play.chancellor}
                </span>
              )}
              {seat.voted && <span className="sh-tag" data-kind="voted">{s.play.voted}</span>}
              {vote && (
                <span className="sh-tag" data-vote={vote}>
                  {vote === 'ja' ? s.play.ja : s.play.nein}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Eylem paneli ---------- */

function PolicyCard({ policy, selected, onClick, label }: { policy: Policy; selected?: boolean; onClick?: () => void; label: string }) {
  return (
    <button type="button" className="sh-policy" data-policy={policy} aria-pressed={selected} aria-label={label} onClick={onClick} disabled={!onClick}>
      <PolicyGlyph policy={policy} size={30} />
      <span className="sh-policy-name">{s.policy[policy]}</span>
    </button>
  );
}

function TargetList({ ids, nick, onPick, label }: { ids: string[]; nick: Nick; onPick: (id: string) => void; label: (nick: string) => string }) {
  return (
    <div className="sh-targets">
      {ids.map((id) => (
        <button key={id} type="button" className="option sh-target" onClick={() => onPick(id)} aria-label={label(nick(id))}>
          {nick(id)}
        </button>
      ))}
    </div>
  );
}

function Action({
  view,
  meId,
  isHost,
  nick,
  plainNick,
  send,
}: {
  view: SecretHitlerView;
  meId: string;
  isHost: boolean;
  nick: Nick;
  plainNick: Nick;
  send: Send;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [view.session]);

  const amPres = view.president === meId;
  const amChan = view.chancellor === meId;
  const mySeat = view.seats.find((x) => x.id === meId);
  const alive = !!mySeat?.alive;
  const lastVote = view.lastVote;

  if (view.phase === 'over') return <Over view={view} nick={nick} isHost={isHost} send={send} />;

  switch (view.phase) {
    case 'nominate':
      return (
        <section className="sh-panel">
          {lastVote && <VoteResult view={view} nick={nick} />}
          {amPres ? (
            <>
              <h2 className="sh-title">{s.play.nominateTitle}</h2>
              <TargetList ids={view.eligible} nick={nick} label={s.play.nominate} onPick={(id) => void send({ type: 'nominate', target: id })} />
              <p className="sh-hint">{view.seats.filter((x) => x.alive).length > 5 ? s.play.nominateHint : s.play.nominateHint5}</p>
            </>
          ) : (
            <p className="sh-wait">{s.play.waitNominate(nick(view.president))}</p>
          )}
        </section>
      );

    case 'vote': {
      const living = view.seats.filter((x) => x.alive);
      const done = living.filter((x) => x.voted).length;
      return (
        <section className="sh-panel">
          <h2 className="sh-title">{s.play.voteTitle(plainNick(view.president), plainNick(view.chancellor!))}</h2>
          {!mySeat ? (
            <p className="sh-wait">{s.play.spectator}</p>
          ) : !alive ? (
            <p className="sh-wait">{s.play.deadNoVote}</p>
          ) : (
            <div className="sh-ballot">
              {(['ja', 'nein'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className="sh-ballot-btn"
                  data-vote={v}
                  aria-pressed={view.myVote === v}
                  onClick={() => void send({ type: 'vote', round: view.voteRound, vote: v })}
                >
                  {v === 'ja' ? s.play.ja : s.play.nein}
                </button>
              ))}
            </div>
          )}
          <p className="sh-hint">
            {view.myVote ? `${s.play.voteMine(view.myVote === 'ja' ? s.play.ja : s.play.nein)} ` : ''}
            {s.play.voteProgress(done, living.length)}. {s.play.voteHint}
          </p>
        </section>
      );
    }

    case 'presidentLegislate':
      return (
        <section className="sh-panel">
          {amPres && view.hand ? (
            <>
              <h2 className="sh-title">{s.play.presidentTitle}</h2>
              <div className="sh-hand" data-count={3}>
                {view.hand.map((p, i) => (
                  <PolicyCard key={i} policy={p} label={`${s.policy[p]} ${i + 1}`} selected={picked === i} onClick={() => setPicked(i)} />
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                disabled={picked === null}
                onClick={() => picked !== null && void send({ type: 'discard', session: view.session, index: picked })}
              >
                {s.play.discardThis}
              </button>
              <p className="sh-hint">{s.play.presidentHint}</p>
            </>
          ) : (
            <p className="sh-wait">{s.play.waitPresident(nick(view.president))}</p>
          )}
          <p className="sh-silence">{s.play.silence}</p>
        </section>
      );

    case 'chancellorLegislate': {
      if (view.vetoRequested) {
        return (
          <section className="sh-panel">
            {amPres ? (
              <>
                <h2 className="sh-title">{s.play.vetoAsk(nick(view.chancellor!))}</h2>
                <div className="sh-row">
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => void send({ type: 'vetoAnswer', session: view.session, accept: true })}>
                    {s.play.vetoAccept}
                  </button>
                  <button type="button" className="btn btn-outline btn-lg" onClick={() => void send({ type: 'vetoAnswer', session: view.session, accept: false })}>
                    {s.play.vetoReject}
                  </button>
                </div>
                <p className="sh-hint">{s.play.vetoHint}</p>
              </>
            ) : (
              <p className="sh-wait">{amChan ? s.play.vetoWait : s.play.waitVeto(nick(view.president), nick(view.chancellor!))}</p>
            )}
          </section>
        );
      }
      return (
        <section className="sh-panel">
          {amChan && view.hand ? (
            <>
              <h2 className="sh-title">{s.play.chancellorTitle}</h2>
              <div className="sh-hand" data-count={2}>
                {view.hand.map((p, i) => (
                  <PolicyCard key={i} policy={p} label={`${s.policy[p]} ${i + 1}`} selected={picked === i} onClick={() => setPicked(i)} />
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                disabled={picked === null}
                onClick={() => picked !== null && void send({ type: 'enact', session: view.session, index: picked })}
              >
                {s.play.enactThis}
              </button>
              <p className="sh-hint">{s.play.chancellorHint}</p>
              {view.vetoUnlocked && !view.vetoDenied && (
                <>
                  <button type="button" className="btn btn-outline btn-block" onClick={() => void send({ type: 'veto', session: view.session })}>
                    {s.play.veto}
                  </button>
                  <p className="sh-hint">{s.play.vetoHint}</p>
                </>
              )}
              {view.vetoDenied && <p className="sh-hint">{s.play.vetoDeniedNote}</p>}
            </>
          ) : (
            <p className="sh-wait">{s.play.waitChancellor(nick(view.chancellor!))}</p>
          )}
          <p className="sh-silence">{s.play.silence}</p>
        </section>
      );
    }

    case 'power': {
      const power = view.power!;
      if (!amPres) {
        return (
          <section className="sh-panel">
            <p className="sh-wait sh-power-wait">
              <PowerGlyph power={power} size={18} />
              {s.play.waitPower(nick(view.president), s.power[power])}
            </p>
            <p className="sh-hint">{s.powerHint[power]}</p>
          </section>
        );
      }
      if (power === 'peek') {
        return (
          <section className="sh-panel">
            <h2 className="sh-title">{s.play.peekTitle}</h2>
            <div className="sh-hand" data-count={3}>
              {(view.peek ?? []).map((p, i) => (
                <PolicyCard key={i} policy={p} label={`${s.policy[p]} ${i + 1}`} />
              ))}
            </div>
            <p className="sh-hint">{s.play.peekHint}</p>
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'peekDone', session: view.session })}>
              {s.play.peekDone}
            </button>
          </section>
        );
      }
      const others = view.seats.filter((x) => x.alive && x.id !== meId && !(power === 'investigate' && x.investigated)).map((x) => x.id);
      const title = power === 'investigate' ? s.play.investigateTitle : power === 'specialElection' ? s.play.specialTitle : s.play.executionTitle;
      const hint = power === 'investigate' ? s.play.investigateHint : power === 'specialElection' ? s.play.specialHint : s.play.executionHint;
      return (
        <section className="sh-panel" data-power={power}>
          <h2 className="sh-title sh-power-title">
            <PowerGlyph power={power} size={20} />
            {title}
          </h2>
          <TargetList ids={others} nick={nick} label={s.play.pick} onPick={(id) => void send({ type: 'power', session: view.session, target: id })} />
          <p className="sh-hint">{hint}</p>
        </section>
      );
    }
  }
}

function VoteResult({ view, nick }: { view: SecretHitlerView; nick: Nick }) {
  const v = view.lastVote!;
  const ja = Object.values(v.votes).filter((x) => x === 'ja').length;
  const nein = Object.values(v.votes).length - ja;
  return (
    <p className="sh-voteresult" data-passed={v.passed || undefined}>
      <b>{s.play.voteResult(v.passed)}</b>
      <span className="dim">
        {' '}
        {nick(v.president)} / {nick(v.chancellor)}: {ja} {s.play.ja}, {nein} {s.play.nein}
      </span>
    </p>
  );
}

function HostBar({ view, room, nick, send }: { view: SecretHitlerView; room: RoomState; nick: Nick; send: Send }) {
  const now = useServerNow(view.serverNow);
  if (view.phase === 'over' || !view.waitingFor.length) return null;
  const online = new Set(room.players.filter((p) => p.connected).map((p) => p.id));
  const offline = view.waitingFor.some((id) => !online.has(id));
  const left = Math.ceil((view.skipAt - now) / 1000);
  const ready = offline || left <= 0;
  const names = view.waitingFor.map(nick).join(', ');
  return (
    <div className="sh-hostbar">
      <button type="button" className="btn btn-ghost" disabled={!ready} onClick={() => void send({ type: 'skip', session: view.session })}>
        {s.play.skip(view.waitingFor.length > 3 ? s.play.people(view.waitingFor.length) : names)}
      </button>
      <p className="sh-hint">{ready ? s.play.skipHint : s.play.skipIn(left)}</p>
    </div>
  );
}

function Over({ view, nick, isHost, send }: { view: SecretHitlerView; nick: Nick; isHost: boolean; send: Send }) {
  const now = useServerNow(view.serverNow);
  const left = Math.max(0, Math.ceil((view.finishAt - now) / 1000));
  return (
    <section className="sh-panel sh-over" data-winner={view.winner ?? 'none'}>
      <h1 className="sh-over-title">{view.winner ? s.play.winner[view.winner] : s.play.noWinner}</h1>
      <p className="sh-over-reason">{view.winReason ? s.play.reason[view.winReason] : ''}</p>
      {view.roles && (
        <ul className="sh-over-roles" aria-label={s.play.rolesTitle}>
          {view.seats.map((seat) => {
            const r = view.roles![seat.id]!;
            return (
              <li key={seat.id} data-party={roleParty(r)}>
                <span>{nick(seat.id)}</span>
                <b>{s.role[r]}</b>
              </li>
            );
          })}
        </ul>
      )}
      <p className="sh-hint sh-center">{s.play.backIn(left)}</p>
      {isHost && (
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => void send({ type: 'finish' })}>
          {s.play.backNow}
        </button>
      )}
    </section>
  );
}

/* ---------- Günlük ---------- */

function logText(e: LogEntry, nick: Nick): string {
  switch (e.k) {
    case 'start':
      return `Oyun başladı. İlk başkan ${nick(e.president)}.`;
    case 'nominate':
      return `${nick(e.president)}, ${nick(e.chancellor)} adlı oyuncuyu şansölye adayı gösterdi.`;
    case 'vote':
      return `${e.passed ? 'Hükümet kuruldu' : 'Hükümet kurulamadı'}. Ja!: ${e.ja.map(nick).join(', ') || 'kimse'}. Nein: ${e.nein.map(nick).join(', ') || 'kimse'}.`;
    case 'tracker':
      return `Seçim sayacı ${e.count}/3.`;
    case 'enact':
      return e.chaos ? `Kargaşa: destenin üstündeki ${s.policy[e.policy].toLocaleLowerCase('tr-TR')} yasa kendiliğinden çıktı. Dönem sınırları sıfırlandı.` : `${s.policy[e.policy]} yasa çıktı.`;
    case 'vetoAsked':
      return `${nick(e.chancellor)} veto önerdi.`;
    case 'veto':
      return `${nick(e.president)} vetoyu kabul etti; iki kart da atıldı.`;
    case 'vetoDenied':
      return `${nick(e.president)} vetoyu reddetti.`;
    case 'reshuffle':
      return `Iskarta desteye karıştırıldı. Destede ${e.deck} kart var.`;
    case 'peek':
      return `${nick(e.president)} destenin üstündeki 3 karta baktı.`;
    case 'investigate':
      return `${nick(e.president)}, ${nick(e.target)} adlı oyuncunun sadakatini sorguladı.`;
    case 'special':
      return `${nick(e.president)} özel seçimle ${nick(e.target)} adlı oyuncuyu başkan yaptı.`;
    case 'execute':
      return `${nick(e.president)}, ${nick(e.target)} adlı oyuncuyu idam etti.`;
    case 'powerSkipped':
      return `${s.power[e.power]} kullanılmadan geçildi.`;
    case 'skip':
      return `Oda sahibi ${e.who.map(nick).join(', ')} adına varsayılanı uyguladı.`;
    case 'notHitler':
      return `${nick(e.chancellor)} şansölye seçildi; Hitler olmadığı kesinleşti.`;
    case 'over':
      return `${e.winner ? s.play.winner[e.winner] : s.play.noWinner}. ${s.play.reason[e.reason]}`;
  }
}

function Log({ view, nick }: { view: SecretHitlerView; nick: Nick }) {
  const entries = [...view.log].reverse();
  return (
    <section className="sh-block">
      <h2 className="sh-h">{s.play.log}</h2>
      <ol className="sh-log">
        {entries.map((e, i) => (
          <li key={view.log.length - i} data-k={e.k} data-policy={e.k === 'enact' ? e.policy : undefined}>
            {logText(e, nick)}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Nasıl oynanır + lisans ---------- */

function HowTo() {
  return (
    <section className="howto" aria-labelledby="sh-howto">
      <h2 id="sh-howto" className="howto-title">
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
      <p className="sh-license">
        {s.howto.license.before}
        <a href={LICENSE_URL} target="_blank" rel="noreferrer">
          {s.howto.license.licenseName}
        </a>
        {s.howto.license.after}
        <a href={SITE_URL} target="_blank" rel="noreferrer">
          {s.howto.license.site}
        </a>
      </p>
    </section>
  );
}
