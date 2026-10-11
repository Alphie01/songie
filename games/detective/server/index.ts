import fs from 'node:fs';
import type Database from 'better-sqlite3';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerGame } from '@songie/game-kit/server';
import type { CaseCard, CasesResponse, DetectiveAction, DetectiveSettings, SessionCard } from '../shared/index.js';
import { createDetectiveGame, type DetectiveState } from './game.js';
import { CaseLibrary, DEFAULT_CASES_DIR } from './library.js';
import { SessionStore } from './sessions.js';

export { CaseLibrary, SessionStore, createDetectiveGame };

type Authed = FastifyRequest & { profile?: { id: string } | null };

const RANK_ORDER = ['Stajyer', 'Komiser Yardımcısı', 'Komiser', 'Başkomiser'];

export function detectiveServer(deps: {
  db: Database.Database;
  casesDir?: string;
}): ServerGame<DetectiveSettings, DetectiveState, DetectiveAction> & { library: CaseLibrary; sessions: SessionStore } {
  const library = new CaseLibrary(deps.casesDir ?? DEFAULT_CASES_DIR);
  const sessions = new SessionStore(deps.db);
  const game = createDetectiveGame({ library, sessions });

  return {
    ...game,
    library,
    sessions,
    routes(app: FastifyInstance) {
      app.get('/cases', async (req: Authed): Promise<CasesResponse> => {
        const profileId = req.profile?.id ?? null;
        const best = new Map<string, { rank: string; score: number }>();
        if (profileId) {
          for (const s of sessions.forMember(profileId, 'done')) {
            const prev = best.get(s.slug);
            const cur = { rank: s.rank ?? 'Stajyer', score: s.score ?? 0 };
            if (!prev || cur.score > prev.score || RANK_ORDER.indexOf(cur.rank) > RANK_ORDER.indexOf(prev.rank)) best.set(s.slug, cur);
          }
        }
        const cases: CaseCard[] = library.list().map(({ data, urls }) => ({
          slug: data.meta.slug,
          title: data.meta.title,
          subtitle: data.meta.subtitle,
          genre: data.meta.genre,
          difficulty: data.meta.difficulty,
          minutes: data.meta.minutes,
          teaser: data.meta.teaser,
          coverUrl: data.meta.cover ? (urls.get(data.meta.cover) ?? null) : null,
          acts: data.acts.length,
          evidenceCount: data.evidence.length,
          solved: best.get(data.meta.slug) ?? null,
        }));
        const active: SessionCard[] = profileId
          ? sessions.forMember(profileId, 'active').flatMap((s) => {
              const c = library.get(s.slug)?.data;
              if (!c) return [];
              return [{ id: s.id, slug: s.slug, title: c.meta.title, act: s.act + 1, acts: c.acts.length, hoursSpent: s.hoursSpent, updatedAt: s.updatedAt, members: s.members }];
            })
          : [];
        return { cases, sessions: active };
      });

      // Devam eden bir dosyayı listeden kaldır (yalnızca üyeler).
      app.post<{ Params: { id: string } }>('/sessions/:id/archive', async (req: Authed & { params: { id: string } }, reply) => {
        if (!req.profile) return reply.code(401).send({ error: 'Profil bulunamadı.' });
        const row = sessions.get(req.params.id);
        if (!row || !row.members.includes(req.profile.id)) return reply.code(404).send({ error: 'Dosya bulunamadı.' });
        if (row.status === 'active') sessions.delete(row.id);
        return { ok: true };
      });

      app.get<{ Params: { slug: string; file: string } }>('/audio/:slug/:file', async (req, reply) => {
        const token = req.params.file.replace(/\.mp3$/, '');
        const file = /^[a-f0-9]{20}$/.test(token) ? library.audioFile(req.params.slug, token) : undefined;
        if (!file || !fs.existsSync(file)) return reply.code(404).send({ error: 'Kayıt bulunamadı.' });
        reply.header('cache-control', 'private, max-age=86400').type('audio/mpeg');
        return reply.send(fs.createReadStream(file));
      });

      app.get<{ Params: { slug: string; file: string } }>('/img/:slug/:file', async (req, reply) => {
        const token = req.params.file.replace(/\.webp$/, '');
        const file = /^[a-f0-9]{20}$/.test(token) ? library.file(req.params.slug, token) : undefined;
        if (!file || !fs.existsSync(file)) return reply.code(404).send({ error: 'Görsel bulunamadı.' });
        reply.header('cache-control', 'private, max-age=86400').type('image/webp');
        return reply.send(fs.createReadStream(file));
      });
    },
  };
}
