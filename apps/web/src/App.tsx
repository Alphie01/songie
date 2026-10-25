import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Shell } from './components/Shell';
import { GuideProvider } from './lib/guide';
import { SessionProvider, useSession } from './lib/session';
import { Home } from './pages/Home';
import { ProfilePage } from './pages/Profile';
import { RoomPage } from './pages/Room';
import { Welcome } from './pages/Welcome';
import { PrivacyChoicesPage, PrivacyPage } from './pages/Legal';

/** App Store links: open without a profile. English aliases for the store listing. */
const LEGAL: Record<string, () => React.JSX.Element> = {
  '/gizlilik': PrivacyPage,
  '/privacy': PrivacyPage,
  '/gizlilik-tercihleri': PrivacyChoicesPage,
  '/privacy-choices': PrivacyChoicesPage,
};

function Routed() {
  const { status, notice } = useSession();
  const Legal = LEGAL[useLocation().pathname.replace(/\/+$/, '') || '/'];
  return (
    <>
      {Legal ? (
        <Legal />
      ) : status === 'loading' ? null : status === 'anonymous' ? (
        // Davet linkiyle gelen önce adını yazar, sonra aynı adreste odaya girer.
        <Welcome />
      ) : (
        <GuideProvider>
          <Shell>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/r/:code" element={<RoomPage />} />
              <Route path="/profil" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        </GuideProvider>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routed />
      </SessionProvider>
    </BrowserRouter>
  );
}
