import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { GuideDialog } from '../components/GuideDialog';
import { WelcomeTour } from '../components/WelcomeTour';
import { findGame } from '../games';

const TOUR_KEY = 'songie.tour.seen';
const GAME_KEY = (id: string) => `songie.guide.seen.${id}`;

/** Görülen rehberler yalnızca bu tarayıcıda hatırlanır; okunamazsa rehber yeniden gösterilir. */
function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function markSeen(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // gizli sekme: önemli değil
  }
}

interface GuideApi {
  openGuide(gameId: string): void;
  openTour(): void;
  /** İlk kez girilen oyunda rehberi bir kez açar. */
  showGuideOnce(gameId: string): void;
  showTourOnce(): void;
}

const GuideContext = createContext<GuideApi | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ kind: 'tour' } | { kind: 'game'; id: string } | null>(null);

  const openGuide = useCallback((id: string) => {
    markSeen(GAME_KEY(id));
    setOpen({ kind: 'game', id });
  }, []);
  const openTour = useCallback(() => {
    markSeen(TOUR_KEY);
    setOpen({ kind: 'tour' });
  }, []);
  const showGuideOnce = useCallback((id: string) => {
    if (!seen(GAME_KEY(id)) && findGame(id)?.guide) openGuide(id);
  }, [openGuide]);
  const showTourOnce = useCallback(() => {
    if (!seen(TOUR_KEY)) openTour();
  }, [openTour]);

  const api = useMemo(() => ({ openGuide, openTour, showGuideOnce, showTourOnce }), [openGuide, openTour, showGuideOnce, showTourOnce]);
  const game = open?.kind === 'game' ? findGame(open.id) : undefined;

  return (
    <GuideContext.Provider value={api}>
      {children}
      {open?.kind === 'tour' && <WelcomeTour onClose={() => setOpen(null)} onOpenGame={openGuide} />}
      {game && <GuideDialog game={game} onClose={() => setOpen(null)} />}
    </GuideContext.Provider>
  );
}

export function useGuide(): GuideApi {
  const g = useContext(GuideContext);
  if (!g) throw new Error('useGuide outside provider');
  return g;
}
