import { tr } from '../i18n/tr';
import { GAMES, playersLabel } from '../games';
import { Dialog } from './Dialog';

/** Oyun seçme penceresi: yeni oda kurarken ya da lobide oyunu değiştirirken. */
export function GamePicker({
  title,
  current,
  busy,
  onPick,
  onClose,
}: {
  title: string;
  current?: string;
  busy?: boolean;
  onPick(gameId: string): void;
  onClose(): void;
}) {
  return (
    <Dialog labelledBy="picker-title" onClose={onClose}>
      <h2 id="picker-title" className="picker-title">
        {title}
      </h2>
      <ul className="picker-list">
        {GAMES.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              className="picker-game"
              data-cat={g.category}
              aria-current={g.id === current || undefined}
              disabled={busy}
              onClick={() => onPick(g.id)}
            >
              <span className="game-mono">{g.mono}</span>
              <span className="picker-text">
                <span className="picker-name">{g.name}</span>
                <span className="picker-meta">{g.id === current ? tr.picker.current : playersLabel(g)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
