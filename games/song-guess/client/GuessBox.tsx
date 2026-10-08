import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { GameApi } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import type { SearchHit } from '../shared/index.js';
import { s } from './strings';

export function GuessBox({
  api,
  disabled,
  placeholder,
  pools,
  onPick,
}: {
  api: GameApi;
  disabled: boolean;
  placeholder: string;
  /** Kolay arama açıksa öneriler yalnızca bu listelerden gelir. */
  pools?: string[];
  onPick(hit: SearchHit): Promise<void>;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const listId = useId();
  // Görünüm her güncellendiğinde dizi yeniden oluşur; aramayı yalnızca içerik değişince tekrarla.
  const scopeKey = pools?.join(',') ?? '';

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const scope = scopeKey ? `&pools=${encodeURIComponent(scopeKey)}` : '';
        const res = await api.get<{ hits: SearchHit[] }>(`/search?q=${encodeURIComponent(query)}${scope}`);
        if (mine === seq.current) {
          setHits(res.hits);
          setActive(0);
        }
      } catch {
        if (mine === seq.current) setHits([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, api, scopeKey]);

  // Kilit açılınca odağı geri ver.
  useEffect(() => {
    if (!disabled) inputRef.current?.focus({ preventScroll: true });
  }, [disabled]);

  async function pick(hit: SearchHit) {
    setOpen(false);
    setQ('');
    setHits([]);
    await onPick(hit);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[active];
      if (hit) void pick(hit);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && q.trim().length >= 2 && !disabled;

  return (
    <div className="guess">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        {s.play.guessLabel}
      </label>
      <Icon name="search" size={16} className="guess-icon" />
      <input
        id={`${listId}-input`}
        ref={inputRef}
        className="guess-input"
        value={q}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${listId}-list`}
        aria-activedescendant={showList && hits[active] ? `${listId}-${hits[active]!.id}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => document.activeElement !== inputRef.current && setOpen(false), 150)}
        onKeyDown={onKey}
      />
      {showList && (
        <ul id={`${listId}-list`} className="guess-list" role="listbox" aria-label={s.play.guessLabel}>
          {hits.length === 0 ? (
            <li className="guess-empty">{loading ? s.play.searching : s.play.noHits}</li>
          ) : (
            hits.map((h, i) => (
              <li
                key={h.id}
                id={`${listId}-${h.id}`}
                role="option"
                aria-selected={i === active}
                className="guess-hit"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => void pick(h)}
              >
                {h.cover ? <img src={h.cover} alt="" width={36} height={36} loading="lazy" /> : <span className="guess-nocover" />}
                <span className="guess-text">
                  <span className="guess-title">{h.title}</span>
                  <span className="guess-artist">{h.artist}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
