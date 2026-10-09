import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { player } from '@songie/game-kit/audio';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { GAMES } from '../games';
import { tr } from '../i18n/tr';
import { useGuide } from '../lib/guide';
import { useSession } from '../lib/session';
import './shell.css';

function useVolume() {
  return useSyncExternalStore(
    (fn) => player.subscribe(fn),
    () => player.volume,
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profile, room, emit } = useSession();
  const volume = useVolume();
  const location = useLocation();
  const navigate = useNavigate();
  const { openTour } = useGuide();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function createRoom(gameId: string) {
    const res = await emit('room:create', { gameId });
    if (res.ok) navigate(`/r/${res.code as string}`);
  }

  return (
    <>
      <button
        type="button"
        className="shell-menu-btn"
        aria-label={tr.shell.open}
        aria-expanded={open}
        aria-controls="shell-drawer"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={18} />
      </button>

      <div className="shell-scrim" data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside id="shell-drawer" className="shell-drawer" data-open={open || undefined} aria-hidden={!open} inert={!open}>
        <header className="shell-head">
          <div>
            <Link to="/" className="wordmark-sm">
              songie
            </Link>
            <p className="shell-sub">{tr.shell.subtitle}</p>
          </div>
          <button type="button" className="shell-close" aria-label={tr.shell.close} onClick={() => setOpen(false)}>
            <Icon name="close" size={16} />
          </button>
        </header>

        <section className="shell-section">
          <label className="shell-volume">
            <span className="eyebrow">{tr.shell.volume}</span>
            <span className="shell-volume-row">
              <Icon name="volume" size={16} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => player.setVolume(Number(e.target.value))}
                style={{ '--v': `${volume * 100}%` } as React.CSSProperties}
              />
            </span>
          </label>
        </section>

        {room && (
          <section className="shell-section">
            <Link to={`/r/${room.code}`} className="btn btn-primary btn-block">
              {tr.home.backToRoom(room.code)}
            </Link>
          </section>
        )}

        <section className="shell-section">
          <h2 className="eyebrow shell-title">{tr.shell.games}</h2>
          <ul className="shell-games">
            {GAMES.map((g) => (
              <li key={g.id}>
                <button type="button" className="game-tile" onClick={() => void createRoom(g.id)}>
                  <span className="game-tile-icon">
                    <Icon name={g.icon} size={18} />
                  </span>
                  <span className="game-tile-text">
                    <span className="game-tile-name">{g.name}</span>
                    <span className="game-tile-pitch">{g.pitch}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost shell-tour" onClick={() => { setOpen(false); openTour(); }}>
            {tr.tour.replay}
          </button>
        </section>

        {profile && (
          <Link to="/profil" className="shell-profile">
            <Avatar avatar={profile.avatar} nick={profile.nick} size={36} />
            <span>
              <span className="shell-profile-nick">{profile.nick}</span>
              <span className="shell-profile-sub">{tr.shell.profile}</span>
            </span>
          </Link>
        )}
      </aside>

      {children}
    </>
  );
}
