import path from 'node:path';
import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import type { SongAction, SongSettings } from '../shared/index.js';
import { Catalog } from './catalog/catalog.js';
import { DeezerClient, DeezerError, parsePlaylistRef } from './catalog/deezer.js';
import { parseSpotifyPlaylistRef, SpotifyError } from './catalog/spotify.js';
import { SEED_POOLS } from './catalog/seed-pools.js';
import { createSongGame, type SongState, type SongTiming } from './game.js';
import { MediaService } from './media.js';

export { Catalog, MediaService, SEED_POOLS, createSongGame, DeezerClient };

const REFRESH_EVERY_MS = 24 * 60 * 60_000;
const CUSTOM_POOL_MAX = 300;

type Authed = FastifyRequest & { profile?: { id: string } | null };

export interface SongGameDeps {
  db: Database.Database;
  dataDir: string;
  ffmpegPath: string;
  fetchImpl?: typeof fetch;
  /** false: otomatik seed ve gece yenilemesi kapalı (testler için). */
  background?: boolean;
  timing?: Partial<SongTiming>;
}

export async function seedPools(catalog: Catalog, log: (m: string) => void = console.log): Promise<void> {
  for (const def of SEED_POOLS) {
    try {
      const info = await catalog.importPool(def);
      log(`[song-guess] ${def.id}: ${info.trackCount} şarkı`);
    } catch (err) {
      log(`[song-guess] ${def.id} alınamadı: ${String(err)}`);
    }
  }
}

async function refreshAll(catalog: Catalog): Promise<void> {
  for (const def of catalog.poolDefs()) {
    try {
      await catalog.importPool(def);
    } catch (err) {
      console.warn(`[song-guess] refresh ${def.id} failed`, String(err));
    }
  }
}

export function songGuessServer(deps: SongGameDeps): ServerGame<SongSettings, SongState, SongAction> & { catalog: Catalog; media: MediaService } {
  const catalog = new Catalog(deps.db, new DeezerClient(deps.fetchImpl));
  const media = new MediaService(path.join(deps.dataDir, 'media'), catalog, deps.ffmpegPath, deps.fetchImpl);
  const game = createSongGame({ catalog, media, timing: deps.timing });

  if (deps.background !== false) {
    if (catalog.pools().length === 0) void seedPools(catalog);
    setInterval(() => void refreshAll(catalog), REFRESH_EVERY_MS).unref();
  }

  return {
    ...game,
    catalog,
    media,
    routes(app: FastifyInstance) {
      media.routes(app);

      app.get<{ Querystring: { selected?: string } }>('/pools', async (req: Authed) => {
        const selected = String((req.query as { selected?: string }).selected ?? '').split(',').filter(Boolean).slice(0, 12);
        return { pools: catalog.pools({ playerId: req.profile?.id ?? null, include: selected }) };
      });

      // Listeyi kendi kataloğundan çıkar (şarkılar ve başkalarının kopyası durur).
      app.post<{ Params: { id: string } }>('/pools/:id/remove', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        catalog.removeOwner((req.params as { id: string }).id, req.profile.id);
        return { ok: true };
      });

      app.get<{ Querystring: { q?: string; pools?: string } }>('/search', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        const query = req.query as { q?: string; pools?: string };
        const q = String(query.q ?? '').slice(0, 80);
        // Kolay arama: öneriler yalnızca oyundaki listelerden.
        const pools = query.pools?.split(',').filter(Boolean).slice(0, 12);
        if (pools?.length) return { hits: catalog.searchLocal(q, 8, pools) };
        return { hits: await catalog.search(q) };
      });

      app.post<{ Body: { url?: string } }>('/pools', async (req: Authed, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        const url = String((req.body as { url?: string })?.url ?? '');

        // Spotify: listeyi oku, şarkıları Deezer'da eşleştir.
        const spotifyId = parseSpotifyPlaylistRef(url);
        if (spotifyId) {
          const existing = catalog.poolByPlaylist(`spotify:${spotifyId}`);
          if (existing) {
            catalog.addOwner(existing.id, req.profile.id);
            return { pool: existing };
          }
          try {
            const res = await catalog.importSpotify(spotifyId, { createdBy: req.profile.id, fetchImpl: deps.fetchImpl });
            if (res.pool.trackCount < 10) {
              return reply.code(400).send({ error: `Bu listeden yalnızca ${res.matched} şarkı Deezer’da bulundu. En az 10 gerekiyor.` });
            }
            return res;
          } catch (err) {
            if (err instanceof SpotifyError) return reply.code(400).send({ error: err.message });
            throw err;
          }
        }

        const ref = parsePlaylistRef(url);
        if (!ref) return reply.code(400).send({ error: 'Deezer ya da Spotify playlist linkini yapıştır.' });
        const existing = catalog.poolByPlaylist(ref);
        if (existing) {
          catalog.addOwner(existing.id, req.profile.id);
          return { pool: existing };
        }
        try {
          const meta = await catalog.deezer.playlist(ref);
          const pool = await catalog.importPool(
            { id: `custom-${ref}`, name: meta.title.slice(0, 60), category: 'ozel', playlist: ref, max: CUSTOM_POOL_MAX },
            { custom: true, createdBy: req.profile.id },
          );
          if (pool.trackCount < 10) {
            return reply.code(400).send({ error: 'Bu listede çalınabilir en az 10 şarkı yok. Daha uzun bir liste dene.' });
          }
          return { pool };
        } catch (err) {
          if (err instanceof DeezerError && (err.code === 800 || err.code === 404)) {
            return reply.code(404).send({ error: 'Bu playlist bulunamadı. Herkese açık olduğundan emin ol.' });
          }
          throw err;
        }
      });
    },
  };
}
