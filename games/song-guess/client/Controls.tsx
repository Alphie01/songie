import { useEffect, useRef, type CSSProperties } from 'react';
import { DIFFICULTIES, POOL_CATEGORIES, type Difficulty, type FeedItem, type PoolInfo } from '../shared/index.js';
import type { RoomPlayer } from '@songie/shared';
import { DIFFICULTY_COLOR } from './SettingsPanel';
import { clipShort, s } from './strings';

/** Songspot'taki tür şeridi: listeler arasında hızlı geçiş (oda sahibi). */
export function PoolStrip({
  pools,
  selected,
  editable,
  onPick,
}: {
  pools: PoolInfo[] | null;
  selected: string[];
  editable: boolean;
  onPick(id: string): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = selected[0];
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [first, pools?.length]);
  if (!pools?.length) return null;
  const order = POOL_CATEGORIES.flatMap((c) => pools.filter((p) => p.category === c));
  const sel = new Set(selected);
  return (
    <div className="strip" ref={ref} role="group" aria-label={s.settings.pools}>
      {order.map((p, i) => (
        <span key={p.id} className="strip-item">
          {i > 0 && order[i - 1]!.category !== p.category && <span className="strip-sep" aria-hidden="true" />}
          <button
            type="button"
            className="strip-btn"
            aria-pressed={sel.has(p.id)}
            disabled={!editable}
            title={editable ? undefined : s.settings.readOnly}
            onClick={() => onPick(p.id)}
          >
            {p.name}
          </button>
        </span>
      ))}
    </div>
  );
}

export function DifficultyPills({
  value,
  editable,
  onPick,
}: {
  value: Difficulty;
  editable: boolean;
  onPick(d: Difficulty): void;
}) {
  return (
    <div className="pills" role="group" aria-label={s.settings.difficulty}>
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          type="button"
          className="pill"
          aria-pressed={value === d}
          disabled={!editable}
          title={editable ? s.difficultyHint[d] : s.settings.readOnly}
          style={{ '--c': DIFFICULTY_COLOR[d] } as CSSProperties}
          onClick={() => onPick(d)}
        >
          {s.difficulty[d]}
        </button>
      ))}
    </div>
  );
}

export function Feed({
  items,
  members,
  clips,
  meId,
}: {
  items: FeedItem[];
  members: Map<string, RoomPlayer>;
  clips: readonly number[];
  meId: string;
}) {
  if (!items.length) return null;
  const name = (id: string) => (id === meId ? s.feed.you : (members.get(id)?.nick ?? '?'));
  return (
    <section className="feed" aria-label={s.feed.title} aria-live="polite">
      <h2 className="eyebrow">{s.feed.title}</h2>
      <ol className="feed-list">
        {[...items].reverse().map((f) => (
          <li key={f.id} className="feed-item" data-kind={f.kind}>
            <span className="feed-dot" aria-hidden="true" />
            <span className="feed-text">
              <b>{name(f.playerId)}</b> {s.feed.text(f.kind, clipShort(clips[f.stage] ?? 0), f.text)}
            </span>
            {f.points ? <span className="feed-pts mono">+{f.points.toLocaleString('tr-TR')}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HowToPlay() {
  return (
    <section className="howto" aria-labelledby="howto-title">
      <h2 id="howto-title" className="howto-title">
        {s.howto.title}
      </h2>
      <ol className="howto-list">
        {s.howto.steps.map(([title, body], i) => (
          <li key={title}>
            <span className="howto-n mono">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
