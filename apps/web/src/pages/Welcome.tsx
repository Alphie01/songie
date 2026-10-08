import { ProfileForm } from '../components/ProfileForm';
import { tr } from '../i18n/tr';
import { useSession } from '../lib/session';
import './welcome.css';

export function Welcome() {
  const { saveProfile } = useSession();
  return (
    <main className="col welcome">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <div className="card welcome-card">
        <h1 className="welcome-title">{tr.welcome.title}</h1>
        <p className="welcome-lead muted">{tr.welcome.lead}</p>
        <ProfileForm submitLabel={tr.welcome.save} onSubmit={saveProfile} />
      </div>
    </main>
  );
}
