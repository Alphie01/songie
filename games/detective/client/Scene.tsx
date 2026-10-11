import { useEffect, useRef } from 'react';
import { Avatar } from '@songie/game-kit/ui';
import { AudioPlayer, Picture } from './Bits';
import { s } from './strings';
import { Paras, useDesk } from './util';

/** Bölüm açılış sahnesi: tam ekran sinematik kart. `replay` verilirse yalnızca okunur (yerel). */
export function Scene({ replay, onClose }: { replay?: number; onClose?: () => void }) {
  const { view, meId, isHost, send, room } = useDesk();
  const ref = useRef<HTMLDivElement>(null);
  const live = replay === undefined;
  const act = live
    ? { index: view.act.index, title: view.act.title, scene: view.act.scene, imageUrl: view.act.imageUrl, imageAlt: view.act.imageAlt, narrationUrl: view.act.narrationUrl }
    : (() => {
        const a = view.acts.find((x) => x.index === replay);
        return a ? { ...a, imageAlt: null as string | null } : null;
      })();

  useEffect(() => {
    ref.current?.focus();
  }, [replay]);

  useEffect(() => {
    if (live || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live, onClose]);

  if (!act) return null;
  const ready = view.sceneReady.includes(meId);
  const players = room.players.filter((p) => p.connected);

  return (
    <div className="dt-scene" role="dialog" aria-modal="true" aria-labelledby="dt-scene-title" ref={ref} tabIndex={-1}>
      <div className="dt-scene-card">
        <div className="dt-scene-pic">
          <Picture url={act.imageUrl} alt={act.imageAlt ?? act.title} label={s.scene.imageMissing} tone="dark" />
        </div>
        <div className="dt-scene-text">
          <p className="dt-scene-case">{view.case.title}</p>
          <p className="dt-scene-act">{s.scene.act(act.index, view.act.total)}</p>
          <h2 id="dt-scene-title" className="dt-scene-title">
            {act.title}
          </h2>
          <div className="dt-scene-body">
            <Paras text={act.scene} />
          </div>
          {act.narrationUrl && (
            <AudioPlayer
              url={act.narrationUrl}
              seed={`act-${act.index}`}
              variant="narration"
              label={s.scene.act(act.index, view.act.total)}
              playLabel={s.scene.narration}
              pauseLabel={s.scene.narrationPause}
              missing=""
            />
          )}

          {live ? (
            <div className="dt-scene-foot">
              <ul className="dt-scene-ready" aria-label={s.scene.waiting(view.sceneReady.length, players.length)}>
                {players.map((p) => (
                  <li key={p.id} data-ready={view.sceneReady.includes(p.id) || undefined} title={p.nick}>
                    <Avatar avatar={p.avatar} nick={p.nick} size={28} dim={!view.sceneReady.includes(p.id)} />
                  </li>
                ))}
              </ul>
              {!ready ? (
                <button type="button" className="btn btn-primary btn-lg" onClick={() => void send({ type: 'continue' })}>
                  {s.scene.continue}
                </button>
              ) : (
                <div className="dt-scene-wait">
                  <p className="dim">{s.scene.waiting(view.sceneReady.length, players.length)}</p>
                  {isHost && (
                    <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'continue' })}>
                      {s.scene.hostSkip}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="dt-scene-foot">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                {s.scene.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
