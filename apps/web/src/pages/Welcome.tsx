import { ProfileForm } from '../components/ProfileForm';
import { BrandLarge } from '../components/Shell';
import { tr } from '../i18n/tr';
import { useSession } from '../lib/session';
import './welcome.css';

export function Welcome() {
  const { saveProfile } = useSession();
  return (
    <main className="col welcome">
      <span className="welcome-shape welcome-shape-a" aria-hidden="true" />
      <span className="welcome-shape welcome-shape-b" aria-hidden="true" />
      <ProfileForm
        submitLabel={tr.welcome.save}
        onSubmit={saveProfile}
        before={
          <div className="welcome-brand">
            <BrandLarge />
            <p>{tr.welcome.tagline}</p>
          </div>
        }
      />
    </main>
  );
}
