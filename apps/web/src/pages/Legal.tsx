import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Dialog } from '../components/Dialog';
import { WelcomeGoogle } from '../components/GoogleAuth';
import { BrandLarge } from '../components/Shell';
import { tr } from '../i18n/tr';
import { api, setToken } from '../lib/api';
import { firebaseSignOut } from '../lib/firebase';
import { useSession } from '../lib/session';
import './legal.css';

const L = tr.legal;

/** Public pages for the App Store (privacy policy URL, user privacy choices URL): open without a profile. */
function LegalShell({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <main className="col legal">
      <header className="legal-head">
        <Link to="/" className="legal-brand" aria-label={L.home}>
          <BrandLarge />
        </Link>
        <h1 className="display legal-title">{title}</h1>
        <p className="legal-lead">{lead}</p>
        <p className="legal-updated">{L.updated}</p>
      </header>
      {children}
      <section className="legal-card legal-contact">
        <h2 className="display">{L.privacy.contact}</h2>
        <p>
          {L.privacy.contactLead} <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a>
        </p>
      </section>
    </main>
  );
}

export function PrivacyPage() {
  const P = L.privacy;
  return (
    <LegalShell title={P.title} lead={P.lead}>
      {P.sections.map((s) => (
        <section key={s.title} className="legal-card">
          <h2 className="display">{s.title}</h2>
          {s.items && (
            <ul>
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          {s.paras?.map((p) => <p key={p}>{p}</p>)}
          {s.note && <p className="legal-note">{s.note}</p>}
        </section>
      ))}
      <section className="legal-card" lang="en">
        <h2 className="display">{P.english}</h2>
        <p>{P.englishText}</p>
      </section>
      <p className="legal-links">
        <Link to="/gizlilik-tercihleri" className="btn btn-yellow">
          {L.toChoices}
        </Link>
      </p>
    </LegalShell>
  );
}

export function PrivacyChoicesPage() {
  const C = L.choices;
  const { status, profile, account, signOut, notify } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = new URLSearchParams(useLocation().search).has('silindi');

  // The server has dropped the profile and every token: forget it here and reload clean (no stale session).
  const remove = async () => {
    setBusy(true);
    try {
      await api.del('/api/me');
      setToken(null);
      await firebaseSignOut().catch(() => {});
      window.location.replace(`${window.location.pathname}?silindi=1`);
    } catch {
      notify(C.failed);
      setBusy(false);
    }
  };

  return (
    <LegalShell title={C.title} lead={C.lead}>
      <section className="legal-card">
        <h2 className="display">{C.tracking}</h2>
        <p>{C.trackingText}</p>
      </section>

      <section className="legal-card legal-account">
        <h2 className="display">{C.account}</h2>
        {done ? (
          <p className="legal-done" role="status">
            {C.deleted}
          </p>
        ) : status === 'ready' && profile ? (
          <>
            <p>{C.signedInAs(profile.nick)}</p>
            <p>{account?.email ? C.linked(account.email) : C.anonymous}</p>
            <div className="legal-danger">
              <h3 className="display">{C.deleteTitle}</h3>
              <p>{C.deleteText}</p>
              <div className="legal-actions">
                <button type="button" className="btn legal-delete" onClick={() => setConfirm(true)}>
                  {C.deleteBtn}
                </button>
                {account && (
                  <button type="button" className="btn btn-light" onClick={() => void signOut()}>
                    {C.signOut}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : status === 'loading' ? null : (
          <>
            <p>{C.noProfile}</p>
            <WelcomeGoogle />
          </>
        )}
      </section>

      <section className="legal-card">
        <h2 className="display">{C.apps}</h2>
        <p>{C.appsText}</p>
      </section>
      <section className="legal-card">
        <h2 className="display">{C.email}</h2>
        <p>{C.emailText}</p>
      </section>
      <p className="legal-links">
        <Link to="/gizlilik" className="btn btn-light">
          {L.toPolicy}
        </Link>
      </p>

      {confirm && (
        <Dialog
          labelledBy="legal-confirm"
          onClose={() => !busy && setConfirm(false)}
          footer={
            <div className="legal-actions">
              <button type="button" className="btn btn-light" disabled={busy} onClick={() => setConfirm(false)}>
                {C.cancel}
              </button>
              <button type="button" className="btn legal-delete" disabled={busy} onClick={() => void remove()}>
                {busy ? C.deleting : C.confirmBtn}
              </button>
            </div>
          }
        >
          <div className="legal-confirm">
            <h2 id="legal-confirm" className="display">
              {C.confirmTitle}
            </h2>
            <p>{C.confirmText}</p>
          </div>
        </Dialog>
      )}
    </LegalShell>
  );
}
