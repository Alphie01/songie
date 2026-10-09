import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Shell } from './components/Shell';
import { GuideProvider } from './lib/guide';
import { SessionProvider, useSession } from './lib/session';
import { Home } from './pages/Home';
import { ProfilePage } from './pages/Profile';
import { RoomPage } from './pages/Room';
import { Welcome } from './pages/Welcome';

function Routed() {
  const { status, notice } = useSession();
  return (
    <>
      {status === 'loading' ? null : status === 'anonymous' ? (
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
