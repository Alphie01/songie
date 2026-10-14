import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** Firebase ID token'ından okunan Google kimliği. */
export interface GoogleIdentity {
  uid: string;
  email: string | null;
  name: string | null;
}

export type IdTokenVerifier = (idToken: string) => Promise<GoogleIdentity>;

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * Firebase Auth ID token doğrulayıcı (servis hesabı gerekmez): imza Google'ın
 * yayımladığı anahtarlarla, `aud`/`iss` proje kimliğiyle kontrol edilir.
 * Yalnızca Google ile açılmış oturumlar kabul edilir.
 */
export function firebaseVerifier(projectId: string, keys: JWTVerifyGetKey = createRemoteJWKSet(new URL(JWKS_URL))): IdTokenVerifier {
  return async (idToken) => {
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    const provider = (payload.firebase as { sign_in_provider?: unknown } | undefined)?.sign_in_provider;
    if (!payload.sub || provider !== 'google.com') throw new Error('not a google sign-in');
    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  };
}
