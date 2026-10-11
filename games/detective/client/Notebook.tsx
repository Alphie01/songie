import { useEffect, useRef, useState } from 'react';
import { NOTEBOOK_MAX } from '../shared/index.js';
import { s } from './strings';
import { ago, useDesk } from './util';

const DEBOUNCE = 800;

/**
 * Ortak not defteri. Yazarken 800 ms sonra `{ text, base }` gönderilir; `base` son bilinen sunucu sürümüdür.
 * Başkası araya girerse sunucu hata döner: son sürüm yüklenir, kaydedilmeyen metin ayrıca gösterilir.
 */
export function Notebook() {
  const { view, send, meId, nick, offset, readOnly } = useDesk();
  const nb = view.notebook;
  const [text, setText] = useState(nb.text);
  const [state, setState] = useState<'idle' | 'dirty' | 'saving'>('idle');
  const [lost, setLost] = useState<string | null>(null);
  const base = useRef(nb.version);
  const dirty = useRef(false);
  const inflight = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(text);
  latest.current = text;
  const viewRef = useRef(view);
  viewRef.current = view;

  // Sunucudan gelen sürüm
  useEffect(() => {
    if (inflight.current !== null && nb.by === meId && nb.text === inflight.current) {
      base.current = nb.version;
      inflight.current = null;
      if (latest.current === nb.text) {
        dirty.current = false;
        setState('idle');
      }
      return;
    }
    if (!dirty.current && inflight.current === null) {
      base.current = nb.version;
      setText(nb.text);
    }
  }, [nb.version, nb.text, nb.by, meId]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const flush = async () => {
    timer.current = null;
    if (inflight.current !== null) {
      schedule();
      return;
    }
    const sending = latest.current;
    inflight.current = sending;
    setState('saving');
    const res = await send({ type: 'notebook', text: sending, base: base.current });
    if (!res.ok) {
      inflight.current = null;
      dirty.current = false;
      setLost(sending);
      setState('idle');
      // En güncel sunucu metni
      base.current = viewRef.current.notebook.version;
      setText(viewRef.current.notebook.text);
      return;
    }
    if (typeof res.version === 'number') {
      base.current = res.version;
      inflight.current = null;
      if (latest.current === sending) {
        dirty.current = false;
        setState('idle');
      } else schedule();
    }
  };

  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE);
  }

  return (
    <section className="dt-notebook" aria-labelledby="dt-nb">
      <div className="dt-nb-head">
        <h2 id="dt-nb" className="dt-sec-title">
          {s.notebook.title}
        </h2>
        <span className="dt-nb-state" role="status">
          {state === 'saving' ? s.notebook.saving : state === 'dirty' ? '' : nb.by ? s.notebook.lastBy(nick(nb.by), ago(nb.at - offset)) : ''}
        </span>
      </div>
      <textarea
        className="dt-nb-text"
        value={text}
        maxLength={NOTEBOOK_MAX}
        placeholder={s.notebook.placeholder}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          dirty.current = true;
          setState('dirty');
          schedule();
        }}
      />
      <p className="dt-nb-count">{s.notebook.chars(text.length, NOTEBOOK_MAX)}</p>
      {lost !== null && (
        <div className="dt-nb-lost" role="alert">
          <p className="dt-small">{s.notebook.conflict}</p>
          <textarea className="dt-nb-lost-text" readOnly value={lost} aria-label={s.notebook.lost} />
          <button type="button" className="btn btn-ghost" onClick={() => setLost(null)}>
            {s.notebook.dismiss}
          </button>
        </div>
      )}
    </section>
  );
}

export function Log() {
  const { view, offset } = useDesk();
  const items = [...view.log].reverse().slice(0, 40);
  return (
    <section className="dt-sec" aria-labelledby="dt-log">
      <h2 id="dt-log" className="dt-sec-title">
        {s.log.title}
      </h2>
      {items.length === 0 ? (
        <p className="dt-empty">{s.log.empty}</p>
      ) : (
        <ol className="dt-log">
          {items.map((l, i) => (
            <li key={`${l.at}-${i}`}>
              <span className="dt-log-at">{ago(l.at - offset)}</span>
              <span className="dt-log-text">{l.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
