import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuthResponse, MeResponse } from '@songie/shared';
import { buildApp, type App } from './app.js';
import { firebaseVerifier, type GoogleIdentity } from './firebase.js';
import { nickFromName } from './players.js';

// Sahte doğrulayıcı: "google:<uid>:<ad>" biçimindeki token'lar geçerli.
const fakeVerify = async (idToken: string): Promise<GoogleIdentity> => {
  const [kind, uid, name] = idToken.split(':');
  if (kind !== 'google' || !uid) throw new Error('bad token');
  return { uid, email: `${uid}@ornek.com`, name: name ?? null };
};
const idToken = (uid: string, name = 'Ece Kaya') => `google:${uid}:${name}`.padEnd(24, ' ');

let app: App;
let tmp: string;

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'songie-auth-'));
  app = await buildApp({
    dataDir: tmp,
    dbFile: ':memory:',
    webDist: path.join(tmp, 'no-web'),
    ffmpegPath: ffmpegStatic as unknown as string,
    background: false,
    verifyIdToken: async (t) => fakeVerify(t.trim()),
    minAppVersion: '1.2.0',
    appLinks: { appleTeamId: 'TEAM123', androidCertSha256: ['AA:BB'] },
  });
});

afterAll(async () => {
  await app?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function anon(nick: string): Promise<{ token: string; id: string }> {
  const res = await app.http.inject({ method: 'POST', url: '/api/profile', payload: { nick, avatar: { shape: 'circle', color: 'mint' } } });
  const body = res.json() as { token: string; profile: { id: string } };
  return { token: body.token, id: body.profile.id };
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

async function google(uid: string, token?: string, name?: string) {
  return app.http.inject({ method: 'POST', url: '/api/auth/google', headers: token ? auth(token) : {}, payload: { idToken: idToken(uid, name) } });
}

async function me(token: string) {
  return app.http.inject({ method: 'GET', url: '/api/me', headers: auth(token) });
}

describe('Google ile giriş', () => {
  it('anonim profili hesaba bağlar, token değişmez', async () => {
    const a = await anon('Ayşe');
    expect((await me(a.token)).json<MeResponse>().account).toBeNull();
    const res = await google('uid-a', a.token);
    expect(res.statusCode).toBe(200);
    const body = res.json<AuthResponse>();
    expect(body.token).toBe(a.token);
    expect(body.profile.id).toBe(a.id);
    expect(body.account).toEqual({ provider: 'google', email: 'uid-a@ornek.com' });
    expect((await me(a.token)).json<MeResponse>().account).toEqual({ provider: 'google', email: 'uid-a@ornek.com' });
  });

  it('yeni cihazda aynı profile ek token verir, eski cihaz açık kalır', async () => {
    const a = await anon('Barış');
    await google('uid-b', a.token);
    const res = await google('uid-b');
    const body = res.json<AuthResponse>();
    expect(body.profile.id).toBe(a.id);
    expect(body.token).not.toBe(a.token);
    expect((await me(a.token)).statusCode).toBe(200);
    expect((await me(body.token)).json<MeResponse>().profile.id).toBe(a.id);
  });

  it('başka cihazdaki anonim profili bağlı profile katar', async () => {
    const owner = await anon('Cem');
    await google('uid-c', owner.token);
    const guest = await anon('Cem2');
    app.players.recordResults('never', 'ABCD', [{ playerId: guest.id, score: 7, rank: 1 }, { playerId: owner.id, score: 3, rank: 2 }]);

    const res = await google('uid-c', guest.token);
    const body = res.json<AuthResponse>();
    expect(body.profile.id).toBe(owner.id);
    // Anonim profil silindi, sonuçları sahibine geçti.
    expect((await me(guest.token)).statusCode).toBe(401);
    const stats = (await me(body.token)).json<MeResponse>().stats;
    expect(stats.gamesPlayed).toBe(2);
    expect(stats.wins).toBe(1);
  });

  it('hesabı olmayan yeni cihazda Google adından profil açar', async () => {
    const res = await google('uid-d', undefined, 'Çağla Yıldırım-Öztürkoğlu');
    const body = res.json<AuthResponse>();
    expect(body.profile.nick).toBe('Çağla');
    expect((await me(body.token)).json<MeResponse>().account?.email).toBe('uid-d@ornek.com');
  });

  it('başka hesaba bağlı profil yeni hesapla girişte katılmaz', async () => {
    const a = await anon('Deniz');
    await google('uid-e1', a.token);
    const res = await google('uid-e2', a.token, 'Deniz İki');
    const body = res.json<AuthResponse>();
    expect(body.profile.id).not.toBe(a.id);
    expect((await me(a.token)).statusCode).toBe(200);
  });

  it('çıkış yalnızca o cihazın token’ını siler', async () => {
    const a = await anon('Ece');
    await google('uid-f', a.token);
    const second = (await google('uid-f')).json<AuthResponse>().token;
    const out = await app.http.inject({ method: 'POST', url: '/api/auth/logout', headers: auth(second) });
    expect(out.statusCode).toBe(200);
    expect((await me(second)).statusCode).toBe(401);
    expect((await me(a.token)).statusCode).toBe(200);
  });

  it('geçersiz token reddedilir', async () => {
    const res = await app.http.inject({ method: 'POST', url: '/api/auth/google', payload: { idToken: 'x'.repeat(30) } });
    expect(res.statusCode).toBe(401);
  });

  it('davet linkleri için doğrulama dosyaları', async () => {
    const apple = await app.http.inject({ method: 'GET', url: '/.well-known/apple-app-site-association' });
    expect(apple.json().applinks.details[0].appIDs).toEqual(['TEAM123.com.monolithyazilim.songie']);
    const android = await app.http.inject({ method: 'GET', url: '/.well-known/assetlinks.json' });
    expect(android.json()[0].target.sha256_cert_fingerprints).toEqual(['AA:BB']);
  });

  it('uygulama ayarı en düşük sürümü verir', async () => {
    const res = await app.http.inject({ method: 'GET', url: '/api/app/config' });
    expect(res.json()).toEqual({ minAppVersion: '1.2.0' });
  });
});

describe('nickFromName', () => {
  it('izinli karakterlere indirger, sığmazsa ilk adı alır', () => {
    expect(nickFromName('Ali Veli')).toBe('Ali Veli');
    expect(nickFromName('Ali 🎉 Veli')).toBe('Ali Veli');
    expect(nickFromName('Muhammed Mustafa Yılmaz')).toBe('Muhammed');
    expect(nickFromName('A')).toBe('Oyuncu');
    expect(nickFromName(null)).toBe('Oyuncu');
  });
});

describe('firebaseVerifier', () => {
  const project = 'songie-test';
  let sign: (claims: Record<string, unknown>, aud?: string) => Promise<string>;
  let verify: ReturnType<typeof firebaseVerifier>;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
    verify = firebaseVerifier(project, createLocalJWKSet({ keys: [jwk] }));
    sign = (claims, aud = project) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer(`https://securetoken.google.com/${project}`)
        .setAudience(aud)
        .setSubject('uid-1')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);
  });

  it('Google oturumunu kabul eder', async () => {
    const t = await sign({ email: 'a@b.com', name: 'Ali', firebase: { sign_in_provider: 'google.com' } });
    expect(await verify(t)).toEqual({ uid: 'uid-1', email: 'a@b.com', name: 'Ali' });
  });

  it('başka projeyi ve başka sağlayıcıyı reddeder', async () => {
    await expect(verify(await sign({ firebase: { sign_in_provider: 'google.com' } }, 'baska'))).rejects.toThrow();
    await expect(verify(await sign({ firebase: { sign_in_provider: 'password' } }))).rejects.toThrow();
  });
});
