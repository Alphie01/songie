import { useState } from 'react';
import type { ClientGame } from '@songie/game-kit/client';
import { Icon } from '@songie/game-kit/ui';
import { tr } from '../i18n/tr';
import { Dialog } from './Dialog';

/** Oyunun adım adım tanıtımı: ilk sayfa özet, sonra rehber bölümleri. */
export function GuideDialog({ game, onClose }: { game: ClientGame; onClose(): void }) {
  const guide = game.guide;
  const sections = guide?.sections ?? [];
  const total = sections.length + 1;
  const [page, setPage] = useState(0);
  const section = page > 0 ? sections[page - 1] : undefined;
  const last = page === total - 1;

  return (
    <Dialog
      labelledBy="guide-title"
      onClose={onClose}
      footer={
        <>
          <div className="dlg-dots">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} data-on={i === page || undefined} aria-hidden="true" />
            ))}
            <span className="dlg-count">
              {page + 1}/{total}
            </span>
          </div>
          <div className="dlg-nav">
            <button type="button" className="btn btn-light" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              {tr.guide.back}
            </button>
            <button type="button" className="btn btn-yellow" onClick={last ? onClose : () => setPage((p) => p + 1)}>
              {last ? tr.guide.done : tr.guide.next}
            </button>
          </div>
        </>
      }
    >
      {page === 0 ? (
        <div className="guide-cover">
          <span className="guide-icon">
            <Icon name={game.icon} size={40} />
          </span>
          <h2 id="guide-title" className="display guide-name">
            {game.name}
          </h2>
          <p className="guide-summary">{guide?.summary ?? game.pitch}</p>
          {guide && (
            <dl className="guide-facts">
              <div>
                <dt>{tr.guide.players}</dt>
                <dd>{guide.players}</dd>
              </div>
              <div>
                <dt>{tr.guide.duration}</dt>
                <dd>{guide.duration}</dd>
              </div>
            </dl>
          )}
          {sections.length > 0 && (
            <ol className="guide-toc">
              {sections.map((s, i) => (
                <li key={s.title}>
                  <button type="button" onClick={() => setPage(i + 1)}>
                    <span className="guide-toc-n">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        section && (
          <div className="guide-page">
            <p className="guide-kicker">
              {game.name} · {page}
            </p>
            <h2 id="guide-title" className="display guide-title">
              {section.title}
            </h2>
            {section.body?.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="guide-p">
                {p}
              </p>
            ))}
            {section.items && section.items.length > 0 && (
              <ul className="guide-items">
                {section.items.map((it) => (
                  <li key={it.term} data-tone={it.tone ?? 'neutral'}>
                    <span className="guide-term">{it.term}</span>
                    <span className="guide-text">{it.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.tip && <p className="guide-tip">{section.tip}</p>}
          </div>
        )
      )}
    </Dialog>
  );
}
