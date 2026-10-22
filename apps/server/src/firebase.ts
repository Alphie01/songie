import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** Firebase ID token'ından okunan giriş kimliği (Google ya da Apple). */
export interface GoogleIdentity {
  uid: string;
  email: string | null;
  name: string | null;
  /** E-posta sağlayıcı tarafından doğrulanmış mı (farklı uygulamalardaki hesapları birleştirmek için). */
  emailVerified?: boolean;
  /** google.com | apple.com */
  provider?: string;
}

/** Kabul edilen giriş sağlayıcıları. */
const PROVIDERS = ['google.com', 'apple.com'];

export type IdTokenVerifier = (idToken: string) => Promise<GoogleIdentity>;

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * Firebase Auth ID token doğrulayıcı (servis hesabı gerekmez): imza Google'ın yayımladığı
 * anahtarlarla, `aud`/`iss` izinli proje kimliklerinden biriyle (ikisi aynı proje) kontrol edilir.
 * Her mobil uygulamanın kendi Firebase projesi var. Yalnızca Google ve Apple oturumları kabul edilir.
 */
export function firebaseVerifier(projectIds: string | string[], keys: JWTVerifyGetKey = createRemoteJWKSet(new URL(JWKS_URL))): IdTokenVerifier {
  const ids = typeof projectIds === 'string' ? [projectIds] : projectIds;
  return async (idToken) => {
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: ids.map((id) => `https://securetoken.google.com/${id}`),
      audience: ids,
      algorithms: ['RS256'],
    });
    if (payload.iss !== `https://securetoken.google.com/${String(payload.aud)}`) throw new Error('issuer/audience mismatch');
    const provider = (payload.firebase as { sign_in_provider?: unknown } | undefined)?.sign_in_provider;
    if (!payload.sub || typeof provider !== 'string' || !PROVIDERS.includes(provider)) throw new Error('unsupported sign-in provider');
    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: typeof payload.name === 'string' ? payload.name : null,
      emailVerified: payload.email_verified === true,
      provider,
    };
  };
}
