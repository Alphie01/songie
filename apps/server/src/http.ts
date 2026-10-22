import fs from 'node:fs';
import path from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { profileInputSchema, roomCodeSchema, type AppConfig, type AuthResponse, type MeResponse, type Profile, type ProfileStats } from '@songie/shared';
import type { AnyServerGame } from '@songie/game-kit/server';
import type { IdTokenVerifier } from './firebase.js';
import type { PlayerStore } from './players.js';
import type { RoomManager } from './rooms/RoomManager.js';

/**
 * Mobil uygulamaların kimlikleri (Universal Links / App Links doğrulaması). Dört uygulama aynı
 * sunucuyu kullanır; davet linki (/r/KOD) hangisi yüklüyse onda açılır.
 */
export const APP_IDS = [
  'com.monolithyazilim.songie',
  'com.monolithyazilim.itirafkosesi',
  'com.monolithyazilim.casebook',
  'com.monolithyazilim.weknows',
] as const;

export interface AppLinks {
  appleTeamId: string;
  androidCertSha256: string[];
}

const authGoogleSchema = z.object({ idToken: z.string().min(20).max(8192) });

export function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

declare module 'fastify' {
  interface FastifyRequest {
    profile: Profile | null;
  }
}

export async function registerHttp(
  app: FastifyInstance,
  deps: {
    players: PlayerStore;
    rooms: RoomManager;
    games: Map<string, AnyServerGame>;
    webDist: string;
    verifyIdToken: IdTokenVerifier;
    disconnectPlayer(playerId: string): void;
    minAppVersion: string;
    appLinks: AppLinks;
  },
): Promise<void> {
  const { players, rooms, games } = deps;

  app.decorateRequest('profile', null);
  app.addHook('preHandler', async (req) => {
    if (req.url.startsWith('/api/')) req.profile = players.byToken(bearer(req));
  });

  app.get('/health', async () => ({ ok: true }));

  app.post('/api/profile', async (req, reply) => {
    const parsed = profileInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message });
    return players.create(parsed.data);
  });

  app.get('/api/me', async (req, reply) => {
    if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
    const id = req.profile.id;
    return { profile: req.profile, stats: players.stats(id), room: rooms.roomOf(id), account: players.account(id) } satisfies MeResponse;
  });

  // Davet linkleri (/r/KOD) yüklü uygulamada açılsın. Kimlikler ayarlanmamışsa dosyalar yok (404).
  const { appleTeamId, androidCertSha256 } = deps.appLinks;
  if (appleTeamId) {
    app.get('/.well-known/apple-app-site-association', async (_req, reply) =>
      reply.type('application/json').send({
        applinks: { details: [{ appIDs: APP_IDS.map((id) => `${appleTeamId}.${id}`), components: [{ '/': '/r/*' }] }] },
      }),
    );
  }
  if (androidCertSha256.length) {
    app.get('/.well-known/assetlinks.json', async () =>
      APP_IDS.map((id) => ({
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: id, sha256_cert_fingerprints: androidCertSha256 },
      })),
    );
  }

  /** Bir oyundaki istatistikler (uygulamaların ana ekranlarındaki rekorlar). Tek kişilik oyunlar da sayılır. */
  app.get<{ Params: { gameId: string } }>('/api/me/stats/:gameId', async (req, reply) => {
    if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
    if (!games.has(req.params.gameId)) return reply.code(404).send({ error: 'Böyle bir oyun yok.' });
    return players.stats(req.profile.id, req.params.gameId, { includeSolo: true }) satisfies ProfileStats;
  });

  app.get('/api/app/config', async () => ({ minAppVersion: deps.minAppVersion }) satisfies AppConfig);

  /**
   * Google ile giriş (isteğe bağlı). Mevcut anonim profil hesaba bağlanır; hesap zaten başka bir
   * profile bağlıysa anonim profil ona katılır. Yeni cihazda aynı profile yeni bir token verilir.
   */
  app.post('/api/auth/google', async (req, reply) => {
    const parsed = authGoogleSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz istek.' });
    let google;
    try {
      google = await deps.verifyIdToken(parsed.data.idToken);
    } catch {
      return reply.code(401).send({ error: 'Google girişi doğrulanamadı. Tekrar dene.' });
    }
    const current = req.profile;
    const currentToken = bearer(req);
    const anonymous = current !== null && players.account(current.id) === null;
    // Önce bu uid; yoksa (başka uygulamanın Firebase projesinden bağlanmış hesap) doğrulanmış e-posta.
    const byUid = players.byFirebaseUid(google.uid);
    const owner = byUid ?? (google.emailVerified && google.email ? players.byAccountEmail(google.email) : null);
    let token: string;
    let profile: Profile;
    if (owner) {
      if (current && anonymous && current.id !== owner.id) {
        rooms.leave(current.id);
        deps.disconnectPlayer(current.id);
        players.mergeInto(current.id, owner.id);
      }
      if (byUid) players.refreshEmail(owner.id, google.uid, google.email);
      else players.addFirebaseUid(owner.id, google.uid);
      token = current?.id === owner.id && currentToken ? currentToken : players.issueToken(owner.id);
      profile = owner;
    } else if (current && anonymous && currentToken) {
      players.linkFirebase(current.id, google.uid, google.email, google.provider);
      token = currentToken;
      profile = current;
    } else {
      ({ token, profile } = players.createFromGoogle(google));
    }
    return { token, profile, account: { provider: google.provider === 'apple.com' ? 'apple' : 'google', email: google.email } } satisfies AuthResponse;
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = bearer(req);
    if (!req.profile || !token) return reply.code(401).send({ error: 'Profil bulunamadı.' });
    players.revokeToken(token);
    return { ok: true };
  });

  app.put('/api/me', async (req, reply) => {
    if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
    const parsed = profileInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message });
    return { profile: players.update(req.profile.id, parsed.data) };
  });

  app.get<{ Params: { code: string } }>('/api/rooms/:code', async (req, reply) => {
    const code = roomCodeSchema.safeParse(req.params.code);
    const room = code.success ? rooms.peek(code.data) : null;
    if (!room) return reply.code(404).send({ error: 'Bu kodla açık bir oda yok.' });
    return room;
  });

  for (const game of games.values()) {
    if (game.routes) await app.register(async (scope) => game.routes!(scope), { prefix: `/api/games/${game.id}` });
  }

  if (fs.existsSync(deps.webDist)) {
    await app.register(fastifyStatic, {
      root: deps.webDist,
      // Hash'li dosyalar uzun süre, index.html hiç önbelleğe alınmaz.
      setHeaders(res, filePath) {
        res.setHeader('cache-control', filePath.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
      cacheControl: false,
    });
    const indexPath = path.join(deps.webDist, 'index.html');
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Bulunamadı.' });
      // Her istekte okunur: yeni build sunucu yeniden başlamadan yayına girer.
      return reply.type('text/html').header('cache-control', 'no-cache').send(fs.readFileSync(indexPath));
    });
  }
}
