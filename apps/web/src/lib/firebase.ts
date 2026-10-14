import type { Auth } from 'firebase/auth';

/** Firebase web yapılandırması (gizli değil; erişim Firebase'deki yetkili alan adlarıyla sınırlı). */
const config = {
  apiKey: 'AIzaSyDlyPQee8OPLkYotM1z9Z1PDazcb6lNJlc',
  authDomain: 'songie-app.firebaseapp.com',
  projectId: 'songie-app',
  appId: '1:200614992898:web:e38fa8782fa2dac32edb1b',
  messagingSenderId: '200614992898',
};

type AuthModule = typeof import('firebase/auth');

let loading: Promise<{ auth: Auth; mod: AuthModule }> | null = null;
let ready: { auth: Auth; mod: AuthModule } | null = null;

/** Firebase'i ilk ekranın yükünü artırmadan, Google butonu göründüğünde önceden yükler. */
export function preloadFirebase(): Promise<{ auth: Auth; mod: AuthModule }> {
  loading ??= Promise.all([import('firebase/app'), import('firebase/auth')]).then(([app, mod]) => {
    ready = { auth: mod.getAuth(app.initializeApp(config)), mod };
    return ready;
  });
  return loading;
}

export class GoogleCancelled extends Error {}

/**
 * Google açılır penceresiyle giriş yapar ve Firebase ID token'ını döndürür.
 * Safari açılır pencereyi yalnızca dokunuşla aynı anda açılırsa izin verir; bu yüzden modül
 * önceden yüklendiyse pencere hiç beklemeden açılır.
 */
export async function googleIdToken(): Promise<string> {
  const { auth, mod } = ready ?? (await preloadFirebase());
  const provider = new mod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await mod.signInWithPopup(auth, provider);
    return await cred.user.getIdToken();
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') throw new GoogleCancelled();
    if (code === 'auth/popup-blocked') throw new Error('Açılır pencere engellendi. Tarayıcıda izin verip tekrar dene.');
    if (code === 'auth/network-request-failed') throw new Error('Google’a ulaşılamadı. İnternet bağlantını kontrol et.');
    throw new Error('Google ile giriş yapılamadı. Tekrar dene.');
  }
}

export async function firebaseSignOut(): Promise<void> {
  if (!loading) return;
  const { auth, mod } = await loading;
  await mod.signOut(auth).catch(() => {});
}
