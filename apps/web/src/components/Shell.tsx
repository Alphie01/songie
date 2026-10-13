import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
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

const MenuContext = createContext<() => void>(() => {});

/** Sayfaların üst çubuğu: solda menü, ortada logo, sağda sayfanın verdiği düğme. */
export function TopBar({ right, compact = false }: { right?: ReactNode; compact?: boolean }) {
  const openMenu = useContext(MenuContext);
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" aria-label={tr.shell.open} onClick={openMenu}>
        <Icon name="menu" size={22} />
      </button>
      <Link to="/" className="brand" data-compact={compact || undefined}>
        {!compact && (
          <span className="brand-badge" aria-hidden="true">
            <Icon name="note" size={20} />
          </span>
        )}
        songie
      </Link>
      {right ?? <span className="topbar-spacer" />}
    </header>
  );
}

/** Logo rozeti (büyük), giriş ekranı için. */
export function BrandLarge() {
  return (
    <span className="brand brand-lg">
      <span className="brand-badge" aria-hidden="true">
        <Icon name="note" size={40} />
      </span>
      songie
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profile, room, emit } = useSession();
  const volume = useVolume();
  const location = useLocation();
  const navigate = useNavigate();
  const { openTour } = useGuide();
  // Oyun ekranları kendi üst şeridini çizer; menüye sol alttaki düğmeden ulaşılır.
  const playing = !!room && room.phase === 'playing' && location.pathname === `/r/${room.code}`;

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
    <MenuContext.Provider value={() => setOpen(true)}>
      {playing && (
        <button
          type="button"
          className="icon-btn shell-fab"
          aria-label={tr.shell.open}
          aria-expanded={open}
          aria-controls="shell-drawer"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" size={20} />
        </button>
      )}

      <div className="shell-scrim" data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside id="shell-drawer" className="shell-drawer" data-open={open || undefined} aria-hidden={!open} inert={!open}>
        <header className="shell-head">
          <Link to="/" className="brand">
            <span className="brand-badge" aria-hidden="true">
              <Icon name="note" size={20} />
            </span>
            songie
          </Link>
          <button type="button" className="icon-btn" aria-label={tr.shell.close} onClick={() => setOpen(false)}>
            <Icon name="close" size={18} />
          </button>
        </header>

        {profile && (
          <Link to="/profil" className="shell-profile">
            <Avatar avatar={profile.avatar} nick={profile.nick} size={44} />
            <span>
              <span className="shell-profile-nick">{profile.nick}</span>
              <span className="shell-profile-sub">{tr.shell.profile}</span>
            </span>
          </Link>
        )}

        <label className="shell-volume">
          <span className="eyebrow">{tr.shell.volume}</span>
          <span className="shell-volume-row">
            <Icon name="volume" size={18} />
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

        {room && (
          <Link to={`/r/${room.code}`} className="btn btn-primary btn-block">
            {tr.home.backToRoom(room.code)}
          </Link>
        )}

        <section className="shell-section">
          <h2 className="eyebrow">{tr.shell.games}</h2>
          <ul className="shell-games">
            {GAMES.map((g) => (
              <li key={g.id}>
                <button type="button" className="shell-game" onClick={() => void createRoom(g.id)}>
                  <span className="game-mono" data-cat={g.category}>
                    {g.mono}
                  </span>
                  <span className="shell-game-text">
                    <span className="shell-game-name">{g.name}</span>
                    <span className="shell-game-pitch">{g.pitch}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setOpen(false);
            openTour();
          }}
        >
          {tr.tour.replay}
        </button>
      </aside>

      {children}
    </MenuContext.Provider>
  );
}
