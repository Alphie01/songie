import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { NOTE_MAX, type DocKind, type Note } from '../shared/index.js';
import { s } from './strings';
import { ago, hash, upper, useDesk } from './util';

// ---------- Belge türü simgeleri ----------

const KIND_PATHS: Record<DocKind, ReactNode> = {
  statement: (
    <>
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M8 11h3M8 14.5h8M8 18h6M13 11h3" />
    </>
  ),
  report: (
    <>
      <path d="M6 3.5h12v17H6z" />
      <path d="M9 8h6M9 11.5h6M9 15h4" />
    </>
  ),
  phoneLog: (
    <>
      <path d="M4 5h16M4 9.5h16M4 14h16M4 18.5h16" />
      <path d="M9 5v13.5" />
    </>
  ),
  messages: <path d="M4.5 17.5V6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8z" />,
  email: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M4 6.5l8 6 8-6" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
      <path d="M9 8h6M9 11.5h6M9 15h3" />
    </>
  ),
  bank: (
    <>
      <path d="M3.5 9.5L12 4l8.5 5.5z" />
      <path d="M6 10v7M10 10v7M14 10v7M18 10v7M3.5 19.5h17" />
    </>
  ),
  letter: (
    <>
      <path d="M5 19c3-1 4.5-4 6-7s4-6.5 8-7c-.5 4-4 6.5-7 8s-6 3-7 6z" />
      <path d="M5 19l4-4" />
    </>
  ),
  newspaper: (
    <>
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2z" />
      <path d="M17 9h3v8a2 2 0 0 1-2 2M7 8.5h7M7 12h3M7 15.5h3M12.5 12H14v3.5h-1.5z" />
    </>
  ),
  photo: (
    <>
      <rect x="3.5" y="6.5" width="17" height="12" rx="1.5" />
      <circle cx="12" cy="12.5" r="3.2" />
      <path d="M8.5 6.5l1.2-2h4.6l1.2 2" />
    </>
  ),
  accessLog: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <path d="M3.5 10h17M7 14.5h4" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" />
      <path d="M14 7v10" strokeDasharray="1.5 2" />
    </>
  ),
  table: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1" />
      <path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15" />
    </>
  ),
  audio: (
    <>
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
    </>
  ),
  floorplan: (
    <>
      <path d="M4 4.5h16v15H4z" />
      <path d="M12 4.5v6M12 14v5.5M4 12h5M15 12h5" />
    </>
  ),
};

export function KindGlyph({ kind, size = 16 }: { kind: DocKind; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {KIND_PATHS[kind]}
    </svg>
  );
}

// ---------- Fotoğraf / yer tutucu ----------

/** Görsel varsa basar; yoksa çerçeve içinde dosyadaki tarifi gösterir (oyuncu ipucunu okuyabilsin). */
export function Picture({
  url,
  alt,
  label,
  className,
  tone = 'print',
}: {
  url: string | null | undefined;
  alt: string;
  label?: string;
  className?: string;
  tone?: 'print' | 'cctv' | 'news' | 'dark';
}) {
  if (url) return <img className={`dt-pic ${className ?? ''}`} src={url} alt={alt} loading="lazy" />;
  return (
    <figure className={`dt-ph ${className ?? ''}`} data-tone={tone} role="img" aria-label={alt}>
      <svg className="dt-ph-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
        <rect x="3.5" y="6.5" width="17" height="12" rx="1.5" />
        <circle cx="12" cy="12.5" r="3.2" />
        <path d="M8.5 6.5l1.2-2h4.6l1.2 2" />
      </svg>
      {label && <span className="dt-ph-label">{label}</span>}
      <figcaption className="dt-ph-alt">{alt}</figcaption>
    </figure>
  );
}

// ---------- Mühürler ----------

/** Yuvarlak resmî mühür (antette soluk, imzada ıslak). */
export function Seal({ text, center, className, id }: { text: string; center?: string; className?: string; id: string }) {
  const ring = upper(text).replace(/\s+/g, ' ').trim();
  const pathId = `dt-seal-${id}`;
  return (
    <svg className={`dt-seal ${className ?? ''}`} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path id={pathId} d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <text fontSize={ring.length > 46 ? 7.2 : ring.length > 34 ? 8.6 : 10} fontWeight="700" fill="currentColor">
        <textPath href={`#${pathId}`} startOffset="0" textLength={262} lengthAdjust="spacing">
          {`${ring.length > 60 ? `${ring.slice(0, 58)}…` : ring} ★`}
        </textPath>
      </text>
      {center ? (
        <text x="60" y="65" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor">
          {center}
        </text>
      ) : (
        <path d="M60 44l4.7 9.6 10.6 1.5-7.7 7.5 1.8 10.5L60 68l-9.4 5.1 1.8-10.5-7.7-7.5 10.6-1.5z" fill="currentColor" />
      )}
    </svg>
  );
}

/** Dikdörtgen kaşe ("ASLI GİBİDİR"). */
export function Stamp({ text, sub, tone = 'red' }: { text: string; sub?: string; tone?: 'red' | 'blue' }) {
  return (
    <span className="dt-stamp" data-tone={tone} aria-hidden="true">
      <span className="dt-stamp-main">{text}</span>
      {sub && <span className="dt-stamp-sub">{sub}</span>}
    </span>
  );
}

// ---------- Notlar ----------

export function NoteList({ notes, onAdd, compact }: { notes: Note[]; onAdd: (text: string) => Promise<boolean>; compact?: boolean }) {
  const { player, nick, meId, isHost, send, offset } = useDesk();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(!compact);
  return (
    <div className="dt-notes" data-compact={compact || undefined}>
      {notes.length > 0 && (
        <ul className="dt-note-list">
          {notes.map((n) => {
            const p = player(n.by);
            return (
              <li key={n.id} className="dt-note">
                {p ? <Avatar avatar={p.avatar} nick={p.nick} size={20} /> : <span className="dt-note-dot" />}
                <div className="dt-note-body">
                  <p className="dt-note-text">{n.text}</p>
                  <p className="dt-note-meta">
                    {nick(n.by)}, {ago(n.at - offset)}
                  </p>
                </div>
                {(n.by === meId || isHost) && (
                  <button type="button" className="dt-icon-btn" aria-label={s.notes.delete} title={s.notes.delete} onClick={() => void send({ type: 'deleteNote', noteId: n.id })}>
                    <Icon name="x" size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!formOpen ? (
        <button type="button" className="dt-link" onClick={() => setFormOpen(true)}>
          {s.notes.add}
        </button>
      ) : (
      <form
        className="dt-note-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || busy) return;
          setBusy(true);
          const ok = await onAdd(t);
          setBusy(false);
          if (ok) setText('');
        }}
      >
        <input
          autoFocus={compact}
          className="input dt-note-input"
          value={text}
          maxLength={NOTE_MAX}
          placeholder={s.notes.placeholder}
          aria-label={s.notes.placeholder}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-outline dt-note-add" disabled={!text.trim() || busy}>
          {s.notes.add}
        </button>
      </form>
      )}
    </div>
  );
}

/** Basit iki adımlı onay butonu (tarayıcı confirm'ü yerine). */
export function ConfirmButton({
  label,
  confirm,
  yes,
  onConfirm,
  className = 'btn btn-outline btn-block',
  disabled,
}: {
  label: string;
  confirm: string;
  yes: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className={className} disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <div className="dt-confirm" role="group">
      <p className="dt-confirm-text">{confirm}</p>
      <div className="dt-confirm-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {yes}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>
          {s.hint.cancel}
        </button>
      </div>
    </div>
  );
}

// ---------- Ses oynatıcı ----------

const fmtTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s2 = Math.floor(sec % 60);
  return `${m}:${String(s2).padStart(2, '0')}`;
};

/**
 * Basit oynatıcı: oynat/duraklat, sahte dalga formu (tıklayınca konum), süre.
 * Otomatik başlatmaz. `url` null ise `missing` metnini gösterir.
 */
export function AudioPlayer({
  url,
  seed,
  playLabel,
  pauseLabel,
  missing,
  variant = 'device',
}: {
  url: string | null;
  seed: string;
  playLabel: string;
  pauseLabel: string;
  missing: string;
  variant?: 'device' | 'narration';
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [failed, setFailed] = useState(false);
  const bars = useMemo(() => {
    let h = hash(seed);
    return Array.from({ length: variant === 'narration' ? 56 : 72 }, (_, i) => {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      const env = 0.55 + 0.45 * Math.sin((i / 9) * Math.PI) ** 2;
      return Math.max(0.12, Math.min(1, ((h % 1000) / 1000) * env + 0.1));
    });
  }, [seed, variant]);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDur(0);
    setFailed(false);
  }, [url]);

  useEffect(() => () => ref.current?.pause(), []);

  if (!url || failed)
    return (
      <div className="dt-audio" data-variant={variant} data-missing>
        <p className="dt-audio-missing">{failed ? s.audio.loadError : missing}</p>
      </div>
    );

  const progress = dur > 0 ? time / dur : 0;
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setFailed(true));
    else a.pause();
  };

  return (
    <div className="dt-audio" data-variant={variant} data-playing={playing || undefined}>
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onDurationChange={(e) => setDur(e.currentTarget.duration)}
        onError={() => setFailed(true)}
      />
      <button type="button" className="dt-audio-play" onClick={toggle} aria-label={playing ? pauseLabel : playLabel}>
        <Icon name={playing ? 'pause' : 'play'} size={variant === 'narration' ? 18 : 20} />
        {variant === 'narration' && <span>{playing ? pauseLabel : playLabel}</span>}
      </button>
      <div
        className="dt-wave"
        role="slider"
        tabIndex={0}
        aria-label={s.audio.seek}
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${fmtTime(time)} / ${fmtTime(dur)}`}
        onClick={(e) => {
          const a = ref.current;
          if (!a || !dur) return;
          const r = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * dur;
        }}
        onKeyDown={(e) => {
          const a = ref.current;
          if (!a || !dur) return;
          if (e.key === 'ArrowRight') a.currentTime = Math.min(dur, a.currentTime + 5);
          else if (e.key === 'ArrowLeft') a.currentTime = Math.max(0, a.currentTime - 5);
          else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {bars.map((b, i) => (
          <i key={i} style={{ height: `${b * 100}%` }} data-on={i / bars.length < progress || undefined} />
        ))}
      </div>
      <span className="dt-audio-time">
        {fmtTime(time)} / {fmtTime(dur)}
      </span>
    </div>
  );
}
