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
          <div className="dlg-dots" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} data-on={i === page || undefined} />
            ))}
          </div>
          <span className="dlg-count mono">
            {page + 1}/{total}
          </span>
          <div className="dlg-nav">
            {page > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setPage((p) => p - 1)}>
                {tr.guide.back}
              </button>
            )}
            {last ? (
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {tr.guide.done}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setPage((p) => p + 1)}>
                {tr.guide.next}
              </button>
            )}
          </div>
        </>
      }
    >
      {page === 0 ? (
        <div className="guide-cover">
          <span className="guide-icon">
            <Icon name={game.icon} size={28} />
          </span>
          <h2 id="guide-title" className="guide-name">
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
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span> {s.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        section && (
          <div className="guide-page">
            <p className="guide-kicker">{game.name}</p>
            <h2 id="guide-title" className="guide-title">
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
