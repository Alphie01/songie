import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Ack, RoomPlayer, RoomState } from '@songie/shared';
import type { CharacterView, DetectiveAction, DetectiveView, DocResponse, EvidenceView } from '../shared/index.js';
import { s } from './strings';

export type Send = (action: DetectiveAction) => Promise<Ack<Record<string, unknown>>>;
export type Tab = 'board' | 'cabinet' | 'interviews' | 'leads' | 'notes';

export interface Desk {
  view: DetectiveView;
  room: RoomState;
  meId: string;
  isHost: boolean;
  /** Hata gösterir (Türkçe metin). */
  send: Send;
  player(id: string): RoomPlayer | undefined;
  nick(id: string | null | undefined): string;
  chars: Map<string, CharacterView>;
  evidence: Map<string, EvidenceView>;
  /** Sunucu saatini yerel saate çevirmek için: yerel = sunucu - offset. */
  offset: number;
  selected: string | null;
  openEvidence(id: string): void;
  showPerson(id: string): void;
  personFilter: string | null;
  setPersonFilter(id: string | null): void;
  seen: Set<string>;
  docs: DocStore;
  setTab(tab: Tab): void;
  /** Sorgu odasında açık olan sorgu. */
  interview: string | null;
  openInterview(id: string): void;
  /** Sorgu başına okunmamış durum (başkasının sorduğu, henüz görmediğim girdiler). */
  ivUnread: Map<string, { count: number; fresh: boolean }>;
  replayAct(index: number): void;
  readOnly: boolean;
}

const DeskContext = createContext<Desk | null>(null);
export const DeskProvider = ({ value, children }: { value: Desk; children: ReactNode }) => <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;

export function useDesk(): Desk {
  const d = useContext(DeskContext);
  if (!d) throw new Error('DeskContext yok');
  return d;
}

// ---------- Belge önbelleği ----------

export type DocEntry = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; data: DocResponse };

export interface DocStore {
  get(id: string): DocEntry | undefined;
  load(id: string, force?: boolean): void;
}

export function useDocStore(act: (a: DetectiveAction) => Promise<Ack<Record<string, unknown>>>, sessionId: string): DocStore {
  const [entries, setEntries] = useState<Record<string, DocEntry>>({});
  const ref = useRef(entries);
  ref.current = entries;
  const actRef = useRef(act);
  actRef.current = act;

  // Başka bir soruşturmaya geçilirse önbellek boşalsın.
  useEffect(() => setEntries({}), [sessionId]);

  const load = useCallback((id: string, force = false) => {
    const cur = ref.current[id];
    if (!force && cur && cur.status !== 'error') return;
    setEntries((e) => ({ ...e, [id]: { status: 'loading' } }));
    actRef
      .current({ type: 'doc', evidenceId: id })
      .then((res) => {
        if (res.ok && res.doc) {
          const data: DocResponse = {
            doc: res.doc as DocResponse['doc'],
            title: String(res.title ?? ''),
            evidenceId: String(res.evidenceId ?? id),
            images: (res.images as DocResponse['images']) ?? {},
            audioUrl: typeof res.audioUrl === 'string' ? res.audioUrl : null,
          };
          setEntries((e) => ({ ...e, [id]: { status: 'ok', data } }));
        } else {
          setEntries((e) => ({ ...e, [id]: { status: 'error', error: res.ok ? s.cabinet.loadError : res.error } }));
        }
      })
      .catch(() => setEntries((e) => ({ ...e, [id]: { status: 'error', error: s.cabinet.loadError } })));
  }, []);

  return useMemo(() => ({ get: (id: string) => entries[id], load }), [entries, load]);
}

// ---------- Görülen kanıtlar (yerel) ----------

export function useSeen(sessionId: string, meId: string): [Set<string>, (id: string) => void] {
  const key = `dt-seen:${sessionId}:${meId}`;
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set<string>();
    }
  };
  const [seen, setSeen] = useState<Set<string>>(read);
  useEffect(() => setSeen(read()), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = useCallback(
    (id: string) => {
      setSeen((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* depolama kapalıysa yalnızca bu oturumda tutulur */
        }
        return next;
      });
    },
    [key],
  );
  return [seen, mark];
}

// ---------- Sorgu tutanağı: okunan girdi sayısı (yerel) ----------

export function useIvSeen(sessionId: string, meId: string): [Record<string, number>, (id: string, n: number) => void] {
  const key = `dt-ivseen:${sessionId}:${meId}`;
  const read = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  };
  const [seen, setSeen] = useState<Record<string, number>>(read);
  useEffect(() => setSeen(read()), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = useCallback(
    (id: string, n: number) => {
      setSeen((prev) => {
        if (prev[id] === n) return prev;
        const next = { ...prev, [id]: n };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* depolama kapalıysa yalnızca bu oturumda tutulur */
        }
        return next;
      });
    },
    [key],
  );
  return [seen, mark];
}

/** Daha önce gördüğüm soru kimlikleri; yeni gelenler bu oturum boyunca "yeni" kalır. */
export function useFreshQuestions(sessionId: string, meId: string, ivId: string | null, ids: string[]): Set<string> {
  const key = `dt-ivq:${sessionId}:${meId}`;
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const sig = ids.join('|');
  useEffect(() => setFresh(new Set()), [ivId]);
  useEffect(() => {
    if (!ivId) return;
    let known: Record<string, string[]> = {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) known = JSON.parse(raw) as Record<string, string[]>;
    } catch {
      /* yok say */
    }
    const prev = known[ivId];
    const cur = sig ? sig.split('|') : [];
    // Sorguyu ilk kez açıyorsam baştaki sorular "yeni" sayılmaz.
    if (prev) {
      const added = cur.filter((q) => !prev.includes(q));
      if (added.length) setFresh((f) => new Set([...f, ...added]));
    }
    known[ivId] = [...new Set([...(prev ?? []), ...cur])];
    try {
      localStorage.setItem(key, JSON.stringify(known));
    } catch {
      /* yok say */
    }
  }, [key, ivId, sig]);
  return fresh;
}

// ---------- Biçimlendirme ----------

const moneyFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n: number) => moneyFmt.format(n);
export const lira = (n: number) => `${money(n)} ₺`;

export function ago(ms: number): string {
  const d = Math.max(0, Date.now() - ms);
  const m = Math.floor(d / 60000);
  if (m < 1) return s.ago.now;
  if (m < 60) return s.ago.min(m);
  const h = Math.floor(m / 60);
  if (h < 24) return s.ago.hour(h);
  return s.ago.day(Math.floor(h / 24));
}

const dayFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/** "2025-02-14T21:08" → ["14 Şubat 2025", "21:08"]. */
export function splitAt(at: string): [string, string] {
  const [date = '', time = ''] = at.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const day = y && mo && d ? dayFmt.format(new Date(Date.UTC(y, mo - 1, d))) : date;
  return [day, time];
}

/** Paragraflar boş satırla, satırlar tek satırla ayrılır. */
export function Paras({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className={className}>
            {p.split('\n').map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
    </>
  );
}

/** Belirli bir metinden kararlı sayı (belge no, barkod). */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const upper = (t: string) => t.toLocaleUpperCase('tr-TR');
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');

export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}
