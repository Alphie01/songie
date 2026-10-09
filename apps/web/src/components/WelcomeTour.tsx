import { useState } from 'react';
import { Icon } from '@songie/game-kit/ui';
import { GAMES } from '../games';
import { tr } from '../i18n/tr';
import { Dialog } from './Dialog';

/** İlk girişte: platform nasıl çalışır + bütün oyunların kısa tanıtımı. */
export function WelcomeTour({ onClose, onOpenGame }: { onClose(): void; onOpenGame(id: string): void }) {
  const [page, setPage] = useState(0);
  const pages = 2;
  return (
    <Dialog
      labelledBy="tour-title"
      onClose={onClose}
      footer={
        <>
          <div className="dlg-dots" aria-hidden="true">
            {Array.from({ length: pages }, (_, i) => (
              <span key={i} data-on={i === page || undefined} />
            ))}
          </div>
          <div className="dlg-nav">
            {page > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setPage(0)}>
                {tr.guide.back}
              </button>
            )}
            {page === 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => setPage(1)}>
                {tr.tour.toGames}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {tr.tour.start}
              </button>
            )}
          </div>
        </>
      }
    >
      {page === 0 ? (
        <div className="guide-page">
          <p className="guide-kicker">{tr.tour.kicker}</p>
          <h2 id="tour-title" className="guide-title">
            {tr.tour.title}
          </h2>
          <ol className="tour-steps">
            {tr.tour.steps.map(([t, d], i) => (
              <li key={t}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="guide-page">
          <p className="guide-kicker">{tr.tour.kicker}</p>
          <h2 id="tour-title" className="guide-title">
            {tr.tour.gamesTitle(GAMES.length)}
          </h2>
          <p className="guide-p">{tr.tour.gamesLead}</p>
          <ul className="tour-games">
            {GAMES.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => onOpenGame(g.id)}>
                  <span className="game-tile-icon">
                    <Icon name={g.icon} size={16} />
                  </span>
                  <span className="tour-game-text">
                    <span className="tour-game-name">{g.name}</span>
                    <span className="tour-game-sum">{g.guide?.summary ?? g.pitch}</span>
                    <span className="tour-game-meta mono">{g.guide?.players ?? `${g.minPlayers}–${g.maxPlayers} oyuncu`}</span>
                  </span>
                  <Icon name="chevron" size={14} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
