import { ProfileForm } from '../components/ProfileForm';
import { tr } from '../i18n/tr';
import { useSession } from '../lib/session';
import './profile.css';

export function ProfilePage() {
  const { profile, stats, saveProfile, notify } = useSession();
  if (!profile) return null;
  const rows: [string, number][] = stats
    ? [
        [tr.profile.games, stats.gamesPlayed],
        [tr.profile.wins, stats.wins],
        [tr.profile.best, stats.bestScore],
        [tr.profile.streak, stats.bestStreak],
      ]
    : [];
  return (
    <main className="col profile">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <div className="card profile-card">
        <h1 className="profile-title">{tr.profile.title}</h1>
        <dl className="stats">
          {rows.map(([label, value]) => (
            <div key={label} className="stat">
              <dt className="eyebrow">{label}</dt>
              <dd className="mono">{value.toLocaleString('tr-TR')}</dd>
            </div>
          ))}
        </dl>
        <ProfileForm
          initial={{ nick: profile.nick, avatar: profile.avatar }}
          submitLabel={tr.profile.save}
          onSubmit={async (input) => {
            await saveProfile(input);
            notify(tr.profile.saved);
          }}
        />
      </div>
    </main>
  );
}
