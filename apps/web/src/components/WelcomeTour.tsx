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
          <div className="dlg-dots">
            {Array.from({ length: pages }, (_, i) => (
              <span key={i} data-on={i === page || undefined} aria-hidden="true" />
            ))}
            <span className="dlg-count">
              {page + 1}/{pages}
            </span>
          </div>
          <div className="dlg-nav">
            <button type="button" className="btn btn-light" disabled={page === 0} onClick={() => setPage(0)}>
              {tr.guide.back}
            </button>
            <button type="button" className="btn btn-yellow" onClick={page === 0 ? () => setPage(1) : onClose}>
              {page === 0 ? tr.tour.toGames : tr.tour.start}
            </button>
          </div>
        </>
      }
    >
      {page === 0 ? (
        <div className="guide-page">
          <p className="guide-kicker">{tr.tour.kicker}</p>
          <h2 id="tour-title" className="display guide-title">
            {tr.tour.title}
          </h2>
          <ol className="tour-steps">
            {tr.tour.steps.map(([t, d], i) => (
              <li key={t}>
                <span className="tour-step-n">{i + 1}</span>
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
          <h2 id="tour-title" className="display guide-title">
            {tr.tour.gamesTitle(GAMES.length)}
          </h2>
          <p className="guide-p">{tr.tour.gamesLead}</p>
          <ul className="tour-games">
            {GAMES.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => onOpenGame(g.id)}>
                  <span className="game-mono" data-cat={g.category}>
                    {g.mono}
                  </span>
                  <span className="tour-game-text">
                    <span className="tour-game-name">{g.name}</span>
                    <span className="tour-game-sum">{g.guide?.summary ?? g.pitch}</span>
                    <span className="tour-game-meta">{g.guide?.players ?? `${g.minPlayers}–${g.maxPlayers} oyuncu`}</span>
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
