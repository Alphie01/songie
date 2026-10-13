import { useEffect, useMemo, useState } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { ParanoiaSettings, ParanoiaView, RevealedEntry } from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (action: unknown) => Promise<boolean>;
type Who = { nick: (id: string) => string; player: (id: string) => RoomPlayer; inRoom: (id: string) => boolean };

/** Sunucu saatine göre şimdiki an (istemci saat farkı düzeltilmiş). */
function useServerNow(serverNow: number): number {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return now + offset;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<ParanoiaView, ParanoiaSettings>) {
  const isHost = room.hostId === meId;
  const now = useServerNow(view.serverNow);
  const [error, setError] = useState<string | null>(null);

  const who: Who = useMemo(() => {
    const members = new Map(room.players.map((p) => [p.id, p]));
    const nick = (id: string) => members.get(id)?.nick ?? view.names[id] ?? '?';
    return {
      nick,
      inRoom: (id: string) => members.has(id),
      player: (id: string) =>
        members.get(id) ?? { id, nick: nick(id), avatar: { shape: 'circle', color: 'paper' }, connected: false, ready: false },
    };
  }, [room.players, view.names]);

  const send: Send = async (action) => {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
    return res.ok;
  };

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: ParanoiaSettings) => void setSettings(n) };
  const roster = <Roster view={view} meId={meId} who={who} />;
  const revealing = view.phase === 'reveal';
  const label = revealing
    ? s.play.progress(view.revealed.length, view.revealTotal)
    : s.play.progress(Math.min(view.answered + 1, view.total), view.total);

  return (
    <div className="pr sg">
      <aside className="sg-side sg-left">{roster}</aside>

      <main className="sg-center pr-main">
        {view.phase === 'summary' ? (
          <Summary view={view} now={now} isHost={isHost} code={room.code} who={who} send={send} />
        ) : (
          <>
            <header className="pr-top">
              <span className="pr-pill">
                {s.name} · {label}
              </span>
              <span className="pr-code">{room.code}</span>
            </header>
            {revealing ? (
              <Progress done={view.revealed.length - 1} total={view.revealTotal} label={label} />
            ) : (
              <Progress done={view.answered} total={view.total} label={label} />
            )}

            {view.phase === 'pickFirst' && <PickFirst view={view} isHost={isHost} who={who} send={send} />}
            {view.phase === 'asking' &&
              (view.myTurn ? (
                <MyTurn key={view.seq} view={view} now={now} meId={meId} settings={settings} who={who} send={send} />
              ) : (
                <Waiting view={view} now={now} isHost={isHost} who={who} send={send} />
              ))}
            {revealing && <Reveal view={view} meId={meId} isHost={isHost} settings={settings} who={who} send={send} />}
          </>
        )}

        {error && (
          <p className="error-text pr-center" role="alert">
            {error}
          </p>
        )}

        {view.phase !== 'summary' && <div className="sg-mobile-only pr-mobile-roster">{roster}</div>}
      </main>

      <aside className="sg-side sg-right">
        <div className="pr-side-settings">
          <SettingsPanel {...panelProps} section="secondary" />
        </div>
      </aside>
    </div>
  );
}

/* ---------- Ortak parçalar ---------- */

function Roster({ view, meId, who }: { view: ParanoiaView; meId: string; who: Who }) {
  const picked = new Map(view.stats.map((x) => [x.playerId, x.picked]));
  return (
    <section className="pr-roster" aria-labelledby="pr-roster-title">
      <h2 id="pr-roster-title" className="pr-label">
        {s.play.players}
      </h2>
      <ul>
        {view.players.map((id) => {
          const p = who.player(id);
          const thinking = view.phase === 'asking' && view.holderId === id && id !== meId;
          return (
            <li key={id} data-me={id === meId || undefined} data-thinking={thinking || undefined}>
              <Avatar avatar={p.avatar} nick={p.nick} size={28} dim={!p.connected} />
              <span className="pr-roster-name">
                {p.nick}
                {id === meId && <span className="pr-roster-you"> ({s.you})</span>}
              </span>
              {thinking && <span className="pr-roster-tag">{s.play.thinking}</span>}
              {!p.connected && who.inRoom(id) && <span className="pr-roster-tag">{s.play.offline}</span>}
              {view.phase === 'summary' && <span className="pr-roster-n">{picked.get(id) ?? 0}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className="pr-progress" role="img" aria-label={label} style={{ gridTemplateColumns: `repeat(${Math.max(1, total)}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} data-done={i < done || undefined} data-now={i === done || undefined} />
      ))}
    </div>
  );
}

function Countdown({ endsAt, now, durationMs }: { endsAt: number | null; now: number; durationMs: number }) {
  if (endsAt === null) return null;
  const left = Math.max(0, endsAt - now);
  const secs = Math.ceil(left / 1000);
  return (
    <div className="pr-timer" data-low={left < 8000 || undefined}>
      <span className="pr-timer-bar" aria-hidden="true">
        <span style={{ width: `${durationMs ? (left / durationMs) * 100 : 0}%` }} />
      </span>
      <span className="pr-timer-num" aria-live="off">
        {s.play.secondsLeft(secs)}
      </span>
    </div>
  );
}

/** Oyuncu seçici: iki sütunlu avatar düğmeleri; seçilemeyenler sönük. */
function PlayerPicker({
  ids,
  choices,
  selected,
  onSelect,
  notes,
  label,
  who,
}: {
  ids: string[];
  choices: string[];
  selected: string | null;
  onSelect: (id: string) => void;
  notes?: Map<string, string>;
  label: string;
  who: Who;
}) {
  return (
    <div className="pr-picker" role="radiogroup" aria-label={label}>
      {ids.map((id) => {
        const p = who.player(id);
        const ok = choices.includes(id);
        const note = notes?.get(id);
        return (
          <button
            key={id}
            type="button"
            role="radio"
            className="pr-pick"
            aria-checked={selected === id}
            disabled={!ok}
            onClick={() => onSelect(id)}
          >
            <Avatar avatar={p.avatar} nick={p.nick} size={34} dim={!p.connected} />
            <span className="pr-pick-text">
              <span className="pr-pick-name">{p.nick}</span>
              {note && <span className="pr-pick-note">{note}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Envelope({ seal, small }: { seal?: string; small?: boolean }) {
  const w = small ? 260 : 300;
  const h = small ? 172 : 200;
  const fold = small ? 96 : 110;
  const mid = w / 2;
  return (
    <>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="pr-env-svg">
        <path className="pr-env-flap" d={`M0 0 L${mid} ${fold} L${w} 0`} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round" />
        <path d={`M0 ${h} L${w * 0.4} ${fold - 15} M${w} ${h} L${w * 0.6} ${fold - 15}`} stroke="var(--ink)" strokeWidth="3" />
      </svg>
      <span className="pr-env-seal" aria-hidden="true">
        {seal}
      </span>
    </>
  );
}

/* ---------- İlk seçim ---------- */

function PickFirst({ view, isHost, who, send }: { view: ParanoiaView; isHost: boolean; who: Who; send: Send }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!isHost) {
    return (
      <section className="pr-wait">
        <div className="pr-env pr-env-sm" aria-hidden="true">
          <Envelope small />
        </div>
        <p className="pr-big">{s.play.pickFirstWait}</p>
        <p className="pr-sub">{s.play.waitHint}</p>
      </section>
    );
  }
  return (
    <section className="pr-turn">
      <h2 className="pr-h">{s.play.pickFirstTitle}</h2>
      <PlayerPicker ids={view.choices} choices={view.choices} selected={selected} onSelect={setSelected} label={s.play.pickFirstTitle} who={who} />
      <p className="pr-hint">{s.play.pickFirstHint}</p>
      <div className="pr-spacer" />
      <button
        type="button"
        className="pr-confirm"
        data-on={!!selected || undefined}
        disabled={!selected}
        onClick={() => selected && void send({ type: 'pickFirst', targetId: selected })}
      >
        {s.play.pickFirstConfirm}
      </button>
    </section>
  );
}

/* ---------- Sıra sende: kapalı zarf, sonra gizli soru kartı ---------- */

function MyTurn({
  view,
  now,
  meId,
  settings,
  who,
  send,
}: {
  view: ParanoiaView;
  now: number;
  meId: string;
  settings: ParanoiaSettings;
  who: Who;
  send: Send;
}) {
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const senderId = view.fromId;

  const notes = useMemo(() => {
    const m = new Map<string, string>();
    if (senderId) m.set(senderId, s.play.sentYou);
    m.set(meId, s.you);
    return m;
  }, [senderId, meId]);

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    const ok = await send({ type: 'choose', seq: view.seq, targetId: selected });
    if (!ok) setBusy(false);
  }

  function open() {
    if (opening) return;
    if (prefersReducedMotion()) {
      setOpened(true);
      return;
    }
    setOpening(true);
    setTimeout(() => setOpened(true), 650);
  }

  if (!opened) {
    return (
      <section className="pr-closed">
        <button type="button" className="pr-env" data-opening={opening || undefined} aria-label={s.play.openEnvelope} onClick={open}>
          <Envelope seal="S" />
        </button>
        <p className="pr-big">{s.play.envelopeTitle}</p>
        <p className="pr-sub">{senderId ? s.play.envelopeFrom(who.nick(senderId)) : s.play.envelopeHint}</p>
        <Countdown endsAt={view.endsAt} now={now} durationMs={view.durationMs} />
      </section>
    );
  }

  return (
    <section className="pr-turn">
      <article className="pr-secret pr-secret-in" aria-labelledby="pr-secret-q">
        <header className="pr-secret-top">
          <span className="pr-secret-who">{s.play.yourTurn}</span>
          <span className="pr-secret-n">{s.play.revealHead(view.answered + 1, view.total)}</span>
        </header>
        <p id="pr-secret-q" className="pr-secret-q">
          {view.question}
        </p>
        <p className="pr-secret-note">
          <LockGlyph />
          {s.play.secretNote}
        </p>
        <Countdown endsAt={view.endsAt} now={now} durationMs={view.durationMs} />
      </article>

      <h2 className="pr-h">{s.play.pickTitle}</h2>
      <PlayerPicker ids={view.players.filter(who.inRoom)} choices={view.choices} selected={selected} onSelect={setSelected} notes={notes} label={s.play.pickTitle} who={who} />
      <p className="pr-hint">{s.play.pickHint(settings.allowSelf, settings.noReturn)}</p>
      <div className="pr-spacer" />
      <button type="button" className="pr-confirm" data-on={!!selected || undefined} disabled={!selected || busy} onClick={() => void confirm()}>
        {busy ? s.play.sending : selected ? s.play.confirmPick(who.nick(selected)) : s.play.confirm}
      </button>
      {view.endsAt !== null && <p className="pr-hint pr-center">{settings.onTimeout === 'pass' ? s.play.timeoutPass : s.play.timeoutRandom}</p>}
      <Mine view={view} who={who} />
    </section>
  );
}

function LockGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/* ---------- Bekleme ---------- */

function Waiting({ view, now, isHost, who, send }: { view: ParanoiaView; now: number; isHost: boolean; who: Who; send: Send }) {
  return (
    <section className="pr-wait">
      <div className="pr-env pr-env-sm" aria-hidden="true">
        <Envelope small />
      </div>
      <div className="pr-wait-text" aria-live="polite">
        <p className="pr-big">{view.holderId ? s.play.waitHolder(who.nick(view.holderId)) : s.play.waitHidden}</p>
        <p className="pr-sub">{s.play.waitHint}</p>
        {view.pulse > 0 && (
          <p key={view.pulse} className="pr-pulse">
            {s.play.answeredFlash}
          </p>
        )}
      </div>
      <Countdown endsAt={view.endsAt} now={now} durationMs={view.durationMs} />

      {isHost && view.holderOffline && (
        <div className="pr-stuck" role="status">
          <p className="pr-stuck-title">{s.play.stuckTitle}</p>
          <p className="pr-hint">{s.play.stuckHint}</p>
          <div className="pr-stuck-actions">
            <button type="button" className="btn btn-yellow" onClick={() => void send({ type: 'skip', seq: view.seq, mode: 'random' })}>
              {s.play.skipRandom}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void send({ type: 'skip', seq: view.seq, mode: 'reassign' })}>
              {s.play.skipReassign}
            </button>
          </div>
        </div>
      )}
      <Mine view={view} who={who} />
    </section>
  );
}

function Mine({ view, who }: { view: ParanoiaView; who: Who }) {
  if (!view.mine.length) return null;
  return (
    <section className="pr-mine" aria-labelledby="pr-mine-title">
      <h2 id="pr-mine-title" className="pr-label">
        {s.play.mine}
      </h2>
      <ul>
        {view.mine.map((m, i) => (
          <li key={i}>
            {m.question} → <strong>{m.answerId ? who.nick(m.answerId) : s.play.passed}</strong>
          </li>
        ))}
      </ul>
      <p className="pr-mine-hint">{s.play.mineHint}</p>
    </section>
  );
}

/* ---------- Açıklama: sahne ---------- */

const STAGE_MS = 2900;

function Reveal({
  view,
  meId,
  isHost,
  settings,
  who,
  send,
}: {
  view: ParanoiaView;
  meId: string;
  isHost: boolean;
  settings: ParanoiaSettings;
  who: Who;
  send: Send;
}) {
  const current = view.revealed.at(-1)!;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setReady(true);
      return;
    }
    setReady(false);
    const t = setTimeout(() => setReady(true), STAGE_MS);
    return () => clearTimeout(t);
  }, [current.n]);

  const isLast = view.revealed.length >= view.revealTotal;
  const vote = settings.revealBy === 'vote' && !isHost;
  const history = view.revealed.slice(0, -1).reverse();

  return (
    <section className="pr-turn">
      <Stage key={current.n} entry={current} total={view.revealTotal} meId={meId} who={who} />

      <div className="pr-spacer" />
      {isHost ? (
        <button type="button" className="pr-confirm" data-on disabled={!ready} onClick={() => void send({ type: 'next', shown: view.revealed.length })}>
          {isLast ? s.play.last : s.play.next}
          {settings.revealBy === 'vote' && view.votes > 0 && (
            <span className="pr-votes">
              {' '}
              {view.votes}/{view.votesNeeded}
            </span>
          )}
        </button>
      ) : vote ? (
        <button
          type="button"
          className="pr-confirm"
          data-on={!view.myVote || undefined}
          disabled={!ready || view.myVote}
          onClick={() => void send({ type: 'next', shown: view.revealed.length })}
        >
          {view.myVote ? s.play.voted(view.votes, view.votesNeeded) : s.play.vote(view.votes, view.votesNeeded)}
        </button>
      ) : (
        <p className="pr-hint pr-center">{s.play.hostWillOpen}</p>
      )}

      {history.length > 0 && (
        <section className="pr-history" aria-labelledby="pr-history-title">
          <h2 id="pr-history-title" className="pr-label">
            {s.play.history}
          </h2>
          <EntryList entries={history} who={who} />
        </section>
      )}
    </section>
  );
}

function Stage({ entry, total, meId, who }: { entry: RevealedEntry; total: number; meId: string; who: Who }) {
  const asked = who.player(entry.askedId);
  const answer = entry.answerId ? who.player(entry.answerId) : null;
  const note = s.play.how[entry.how];
  return (
    <div className="pr-stage" aria-live="polite">
      <article className="pr-secret pr-stage-q">
        <header className="pr-secret-top">
          <span className="pr-secret-who">{s.play.revealHead(entry.n, total)}</span>
        </header>
        <p className="pr-secret-q">{entry.question}</p>
        <p className="pr-stage-to">
          <Avatar avatar={asked.avatar} nick={asked.nick} size={28} />
          {s.play.askedTo(asked.nick)}
        </p>
      </article>
      <div className="pr-stage-ans" data-none={!answer || undefined}>
        <span className="pr-stage-ans-label">{s.play.answerOf(asked.nick)}</span>
        {answer ? (
          <span className="pr-stage-ans-name">
            <Avatar avatar={answer.avatar} nick={answer.nick} size={44} />
            <span>
              {answer.nick}
              {entry.answerId === meId && <span className="pr-stage-you"> ({s.you})</span>}
            </span>
          </span>
        ) : (
          <span className="pr-stage-ans-name">{s.play.noAnswer}</span>
        )}
        {note && <span className="pr-stage-note">{note}</span>}
      </div>
    </div>
  );
}

function EntryList({ entries, who }: { entries: RevealedEntry[]; who: Who }) {
  return (
    <ol className="pr-entries">
      {entries.map((e) => (
        <li key={e.n}>
          <span className="pr-entry-n">{e.n}</span>
          <div>
            <p className="pr-entry-q">{e.question}</p>
            <p className="pr-entry-meta">
              {s.play.askedTo(who.nick(e.askedId))} → <strong>{e.answerId ? who.nick(e.answerId) : s.play.noAnswer}</strong>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Özet: oyun sonu (Sonuçlar ekranının dili) ---------- */

function Crown() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
      <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function Summary({
  view,
  now,
  isHost,
  code,
  who,
  send,
}: {
  view: ParanoiaView;
  now: number;
  isHost: boolean;
  code: string;
  who: Who;
  send: Send;
}) {
  const left = Math.max(0, view.closesAt - now);
  const secs = Math.ceil(left / 1000);
  // Geri sayım çubuğu: ekran açıldığında kalan süreyi tam kabul et.
  const [span] = useState(() => Math.max(1, view.closesAt - view.serverNow));
  const [first, second, ...rest] = view.stats;
  const half = Math.ceil(rest.length / 2);
  const tie = !!first && !!second && first.picked > 0 && first.picked === second.picked;
  const title = !first || first.picked === 0 ? s.play.summaryTitle : tie ? s.play.tie : s.play.mostPicked(who.nick(first.playerId));

  return (
    <section className="pr-end">
      <span className="pr-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="pr-end-top">
        <span>{s.name}</span>
        <span className="pr-code">{code}</span>
      </div>
      <div className="pr-end-head">
        <span className="pr-sticker">{s.play.gameOver}</span>
        <h1 className="pr-end-title">{title}</h1>
      </div>

      {first && (
        <div className="pr-end-scores" aria-label={s.play.statsTitle}>
          <div className="pr-end-card pr-end-first">
            {!tie && first.picked > 0 && <Crown />}
            <span className="pr-end-score">{first.picked}</span>
            <span className="pr-end-name">{who.nick(first.playerId)}</span>
          </div>
          {second && (
            <>
              <span className="pr-end-dash" aria-hidden="true">
                –
              </span>
              <div className="pr-end-card pr-end-second">
                <span className="pr-end-score">{second.picked}</span>
                <span className="pr-end-name">{who.nick(second.playerId)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {rest.length > 0 && (
        <div className="pr-end-rosters">
          {[rest.slice(0, half), rest.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="pr-end-roster" start={3 + i * half}>
                  {col.map((x) => {
                    const p = who.player(x.playerId);
                    return (
                      <li key={x.playerId}>
                        <Avatar avatar={p.avatar} nick={p.nick} size={28} />
                        <span className="pr-end-roster-name">{p.nick}</span>
                        <span className="pr-end-roster-n">{s.play.times(x.picked)}</span>
                      </li>
                    );
                  })}
                </ol>
              ),
          )}
        </div>
      )}

      <div className="pr-end-foot">
        <div className="pr-end-bar" aria-hidden="true">
          <div style={{ width: `${Math.min(100, (1 - left / span) * 100)}%` }} />
        </div>
        <p className="pr-end-note">
          {s.play.backToLobby} · {s.play.secondsLeft(secs)}
        </p>
        {isHost ? (
          <button type="button" className="btn btn-primary btn-block pr-end-finish" onClick={() => void send({ type: 'finish' })}>
            {s.play.finish}
          </button>
        ) : (
          <p className="pr-hint pr-center">{s.play.waitHostFinish}</p>
        )}
      </div>

      {view.revealed.length > 0 && (
        <section aria-labelledby="pr-all-title" className="pr-history">
          <h2 id="pr-all-title" className="pr-label">
            {s.play.allTitle}
          </h2>
          <EntryList entries={view.revealed} who={who} />
        </section>
      )}
    </section>
  );
}
