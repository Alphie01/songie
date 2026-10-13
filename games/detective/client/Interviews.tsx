import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { foldText } from '@songie/shared';
import type { CharacterView, InterviewView, TranscriptEntry } from '../shared/index.js';
import { KindGlyph } from './Bits';
import { s } from './strings';
import { initials, Paras, useDesk, useFreshQuestions } from './util';

/** Sorgu odası: açık sorgular, ortak tutanak, soru listesi ve belge gösterme. */
export function Interviews() {
  const { view, interview, openInterview, chars, ivUnread } = useDesk();
  const iv = view.interviews.find((i) => i.id === interview) ?? null;

  if (!view.interviews.length) return <p className="dt-empty">{s.interview.empty}</p>;

  return (
    <div className="dt-iv">
      {view.interviews.length > 1 && (
        <div className="dt-iv-doors" role="group" aria-label={s.interview.pick}>
          {[...view.interviews].reverse().map((x) => {
            const c = chars.get(x.characterId);
            const u = ivUnread.get(x.id);
            return (
              <button key={x.id} type="button" className="dt-iv-door" aria-pressed={x.id === interview} onClick={() => openInterview(x.id)}>
                <Face c={c} size="sm" />
                <span className="dt-iv-door-text">
                  <span className="dt-iv-door-name">{c?.name ?? x.title}</span>
                  <span className="dt-iv-door-place">{x.place}</span>
                </span>
                {u && u.count > 0 && x.id !== interview ? (
                  <span className="dt-tab-badge" data-tone="iv" aria-label={s.interview.unread(u.count)}>
                    {u.count}
                  </span>
                ) : (
                  u?.fresh && x.id !== interview && <span className="dt-new">{s.interview.newQ}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {iv && <Room key={iv.id} iv={iv} c={chars.get(iv.characterId)} />}
    </div>
  );
}

function Face({ c, size }: { c: CharacterView | undefined; size: 'sm' | 'lg' }) {
  return (
    <span className="dt-iv-face" data-size={size}>
      {c?.portraitUrl ? (
        <img src={c.portraitUrl} alt={size === 'lg' ? (c.portraitAlt ?? c.name) : ''} loading="lazy" />
      ) : (
        <span className="dt-portrait-ph" title={c?.portraitAlt ?? undefined}>
          {initials(c?.name ?? '?')}
        </span>
      )}
    </span>
  );
}

function Room({ iv, c }: { iv: InterviewView; c: CharacterView | undefined }) {
  const { view, send, meId } = useDesk();
  const locked = view.phase !== 'investigate';
  const name = c?.name ?? iv.title;
  const short = name.split(/\s+/)[0] ?? name;
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'hit' | 'miss'; text: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (flashTimer.current && clearTimeout(flashTimer.current)), []);
  const fresh = useFreshQuestions(
    view.sessionId,
    meId,
    iv.id,
    iv.questions.map((q) => q.id),
  );

  // Tutanak kutusu her yeni girdide en alta kayar (sayfa kaymaz).
  const logRef = useRef<HTMLOListElement>(null);
  const len = iv.transcript.length;
  useLayoutEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [len]);

  const shown = useMemo(() => new Set(iv.transcript.map((e) => e.evidenceId).filter((x): x is string => !!x)), [iv.transcript]);

  const ask = async (questionId: string) => {
    if (busy || locked) return;
    setBusy(true);
    await send({ type: 'ask', interviewId: iv.id, questionId });
    setBusy(false);
  };

  const confront = async (evidenceId: string) => {
    if (busy || locked) return false;
    setBusy(true);
    const res = await send({ type: 'confront', interviewId: iv.id, evidenceId });
    setBusy(false);
    if (!res.ok) return false;
    if (res.stale) return true;
    const hit = res.hit === true;
    setFlash({ tone: hit ? 'hit' : 'miss', text: hit ? s.interview.hit : s.interview.miss });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 4500);
    return true;
  };

  return (
    <section className="dt-room" aria-labelledby={`dt-room-${iv.id}`}>
      <header className="dt-room-head">
        <Face c={c} size="lg" />
        <div className="dt-room-id">
          {iv.title !== name && <p className="dt-room-title">{iv.title}</p>}
          <h2 id={`dt-room-${iv.id}`} className="dt-room-name">
            {name}
          </h2>
          <p className="dt-room-place">
            {iv.place}
            <span className="dim">, {s.interview.act(iv.act)}</span>
          </p>
          <div className="dt-room-intro">
            <Paras text={iv.intro} />
          </div>
        </div>
      </header>

      <div className="dt-record">
        <p className="dt-record-head">
          <span>{s.interview.transcript}</span>
          <span className="dt-count">{len}</span>
        </p>
        {len === 0 ? (
          <p className="dt-record-empty">{s.interview.transcriptEmpty}</p>
        ) : (
          <ol ref={logRef} className="dt-record-log" aria-live="polite">
            {iv.transcript.map((e, i) => (
              <Entry key={`${e.at}-${i}`} e={e} n={i + 1} speaker={short} />
            ))}
          </ol>
        )}
      </div>

      {flash && (
        <p className="dt-room-flash" data-tone={flash.tone} role="status">
          {flash.text}
        </p>
      )}

      {locked ? (
        <p className="dt-room-locked">{s.interview.closed}</p>
      ) : (
        <div className="dt-room-ask">
          <div className="dt-room-ask-head">
            <h3 className="dt-sec-title">
              {s.interview.questions}
              <span className="dt-count">{iv.questions.length}</span>
            </h3>
            <p className="dt-room-free">{s.interview.free}</p>
          </div>
          {iv.questions.length === 0 ? (
            <p className="dt-empty">{s.interview.noQuestions}</p>
          ) : (
            <ul className="dt-qs">
              {iv.questions.map((q) => (
                <li key={q.id}>
                  <button type="button" className="dt-q" data-fresh={fresh.has(q.id) || undefined} disabled={busy} onClick={() => void ask(q.id)}>
                    <span className="dt-q-text">{q.ask}</span>
                    {fresh.has(q.id) && <span className="dt-new">{s.interview.newQ}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {picker ? (
            <Picker name={name} shown={shown} busy={busy} onClose={() => setPicker(false)} onShow={confront} />
          ) : (
            <button type="button" className="btn btn-outline dt-room-show" disabled={busy || view.evidence.length === 0} onClick={() => setPicker(true)}>
              <KindGlyph kind="photo" size={16} />
              {s.interview.show}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Entry({ e, n, speaker }: { e: TranscriptEntry; n: number; speaker: string }) {
  const { player, nick, evidence, openEvidence } = useDesk();
  const p = player(e.by);
  const ev = e.evidenceId ? evidence.get(e.evidenceId) : undefined;
  return (
    <li className="dt-entry" data-kind={e.kind}>
      <span className="dt-entry-no" aria-hidden="true">
        {n}
      </span>
      <div className="dt-entry-body">
        <p className="dt-entry-who">
          {p ? <Avatar avatar={p.avatar} nick={p.nick} size={16} /> : <span className="dt-note-dot" />}
          {e.kind === 'ask' ? s.interview.asked(nick(e.by)) : s.interview.showed(nick(e.by))}
        </p>
        {e.kind === 'ask' ? (
          <p className="dt-entry-q">{e.prompt}</p>
        ) : (
          <button type="button" className="dt-entry-doc" disabled={!ev} onClick={() => ev && openEvidence(ev.id)}>
            {ev && <KindGlyph kind={ev.kind} size={14} />}
            <span>{e.prompt}</span>
          </button>
        )}
        <div className="dt-entry-a">
          <p className="dt-entry-speaker">
            {speaker}
            {e.kind === 'deflect' && <span className="dt-entry-tag">{s.interview.deflect}</span>}
          </p>
          <blockquote className="dt-entry-answer">
            <Paras text={e.answer} />
          </blockquote>
          {e.audioUrl && <MiniPlay url={e.audioUrl} />}
          {e.unlocked.map((id) => {
            const u = evidence.get(id);
            if (!u) return null;
            return (
              <button key={id} type="button" className="dt-entry-unlock" onClick={() => openEvidence(id)}>
                <KindGlyph kind={u.kind} size={13} />
                <span>
                  {s.interview.unlocked}: <b>{u.title}</b>
                </span>
              </button>
            );
          })}
        </div>
        {e.kind === 'confront' && (
          <span className="dt-entry-stamp" aria-label={s.interview.broke}>
            {s.interview.broke}
          </span>
        )}
      </div>
    </li>
  );
}

/** Tek düğmeli küçük oynatıcı; otomatik çalmaz. */
function MiniPlay({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => () => ref.current?.pause(), []);
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const update = () => {
    const a = ref.current;
    if (a && Number.isFinite(a.duration)) setLeft(Math.max(0, a.duration - a.currentTime));
  };
  return (
    <span className="dt-mini" data-playing={playing || undefined}>
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={update}
        onTimeUpdate={update}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className="dt-mini-btn"
        disabled={failed}
        onClick={() => {
          const a = ref.current;
          if (!a) return;
          if (a.paused || a.ended) void a.play().catch(() => setFailed(true));
          else a.pause();
        }}
      >
        <Icon name={playing ? 'pause' : 'play'} size={13} />
        {failed ? s.interview.audioError : playing ? s.interview.pause : s.interview.listen}
      </button>
      {left !== null && !failed && <span className="dt-mini-time">{fmt(left)}</span>}
    </span>
  );
}

function Picker({
  name,
  shown,
  busy,
  onClose,
  onShow,
}: {
  name: string;
  shown: Set<string>;
  busy: boolean;
  onClose: () => void;
  onShow: (evidenceId: string) => Promise<boolean>;
}) {
  const { view } = useDesk();
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<string | null>(null);
  const list = useMemo(() => {
    const needle = foldText(q.trim());
    return [...view.evidence]
      .filter((e) => !needle || foldText(`${e.title} ${e.summary} ${s.kind[e.kind]}`).includes(needle))
      .sort((a, b) => Number(shown.has(a.id)) - Number(shown.has(b.id)) || b.seq - a.seq);
  }, [view.evidence, q, shown]);
  const picked = pick ? view.evidence.find((e) => e.id === pick) : undefined;
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    boxRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  return (
    <div ref={boxRef} className="dt-picker" role="group" aria-label={s.interview.showTo(name)}>
      <div className="dt-picker-head">
        <p className="dt-picker-title">{s.interview.showTo(name)}</p>
        <button type="button" className="dt-icon-btn" aria-label={s.interview.cancel} title={s.interview.cancel} onClick={onClose}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <input
        className="input dt-picker-search"
        type="search"
        value={q}
        placeholder={s.interview.search}
        aria-label={s.interview.search}
        autoFocus
        onChange={(e) => setQ(e.target.value)}
      />
      {list.length === 0 ? (
        <p className="dt-empty">{s.interview.noMatch}</p>
      ) : (
        <ul className="dt-picker-list" role="listbox" aria-label={s.cabinet.title}>
          {list.map((e) => {
            const was = shown.has(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  role="option"
                  className="dt-picker-item"
                  aria-selected={pick === e.id}
                  disabled={was}
                  onClick={() => setPick(pick === e.id ? null : e.id)}
                >
                  <span className="dt-file-glyph" data-kind={e.kind}>
                    <KindGlyph kind={e.kind} size={16} />
                  </span>
                  <span className="dt-picker-main">
                    <span className="dt-picker-name">{e.title}</span>
                    <span className="dt-picker-kind">{s.kind[e.kind]}</span>
                  </span>
                  {was && <span className="dt-picker-was">{s.interview.shownTag}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="dt-picker-foot">
        <p className="dt-picker-sel">{picked ? picked.title : ' '}</p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!picked || busy}
          onClick={async () => {
            if (!picked) return;
            if (await onShow(picked.id)) onClose();
          }}
        >
          {s.interview.confirm}
        </button>
      </div>
    </div>
  );
}
