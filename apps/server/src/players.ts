import { AVATAR_COLORS, nickSchema, type Account, type Avatar, type Profile, type ProfileInput, type ProfileStats } from '@songie/shared';
import type { DB } from './db.js';
import { hashToken, randomId, randomToken } from './ids.js';

interface PlayerRow {
  id: string;
  nick: string;
  avatar: string;
  token_hash: string;
  firebase_uid: string | null;
  email: string | null;
}

/** Google adından takma ad: izinli karakterler, sığmazsa ilk ad; olmazsa "Oyuncu". */
export function nickFromName(name: string | null): string {
  const clean = (name ?? '').replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim();
  for (const candidate of [clean, clean.split(' ')[0] ?? '', clean.slice(0, 16).trim()]) {
    const parsed = nickSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return 'Oyuncu';
}

function toProfile(row: PlayerRow): Profile {
  return { id: row.id, nick: row.nick, avatar: JSON.parse(row.avatar) as Avatar };
}

export class PlayerStore {
  constructor(private db: DB) {}

  create(input: ProfileInput, google?: { uid: string; email: string | null }): { token: string; profile: Profile } {
    const id = randomId(10);
    const token = randomToken();
    const now = Date.now();
    this.db.transaction(() => {
      this.db
        .prepare(
          'INSERT INTO players (id, nick, avatar, token_hash, created_at, seen_at, firebase_uid, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(id, input.nick, JSON.stringify(input.avatar), hashToken(token), now, now, google?.uid ?? null, google?.email ?? null);
      this.db.prepare('INSERT INTO player_tokens (token_hash, player_id, created_at) VALUES (?, ?, ?)').run(hashToken(token), id, now);
    })();
    return { token, profile: { id, nick: input.nick, avatar: input.avatar } };
  }

  /** Google ile ilk girişte açılan profil: ad Google'dan, renk rastgele. */
  createFromGoogle(google: { uid: string; email: string | null; name: string | null }): { token: string; profile: Profile } {
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!;
    return this.create({ nick: nickFromName(google.name), avatar: { shape: 'circle', color } }, google);
  }

  byToken(token: string | undefined | null): Profile | null {
    if (!token) return null;
    const row = this.db
      .prepare('SELECT p.* FROM player_tokens t JOIN players p ON p.id = t.player_id WHERE t.token_hash = ?')
      .get(hashToken(token)) as PlayerRow | undefined;
    if (!row) return null;
    this.db.prepare('UPDATE players SET seen_at = ? WHERE id = ?').run(Date.now(), row.id);
    return toProfile(row);
  }

  byFirebaseUid(uid: string): Profile | null {
    const row = this.db.prepare('SELECT * FROM players WHERE firebase_uid = ?').get(uid) as PlayerRow | undefined;
    return row ? toProfile(row) : null;
  }

  account(id: string): Account | null {
    const row = this.db.prepare('SELECT firebase_uid, email FROM players WHERE id = ?').get(id) as
      | Pick<PlayerRow, 'firebase_uid' | 'email'>
      | undefined;
    return row?.firebase_uid ? { provider: 'google', email: row.email } : null;
  }

  linkFirebase(id: string, uid: string, email: string | null): void {
    this.db.prepare('UPDATE players SET firebase_uid = ?, email = ? WHERE id = ?').run(uid, email, id);
  }

  /** Aynı profile yeni bir cihaz token'ı (eski cihazların oturumu açık kalır). */
  issueToken(playerId: string): string {
    const token = randomToken();
    this.db.prepare('INSERT INTO player_tokens (token_hash, player_id, created_at) VALUES (?, ?, ?)').run(hashToken(token), playerId, Date.now());
    return token;
  }

  revokeToken(token: string): void {
    this.db.prepare('DELETE FROM player_tokens WHERE token_hash = ?').run(hashToken(token));
  }

  /**
   * Anonim profili Google'a bağlı profile katar: sonuçlar, şarkı listesi sahiplikleri ve
   * dedektif dosyası üyelikleri taşınır, anonim profil (ve token'ları) silinir.
   */
  mergeInto(fromId: string, toId: string): void {
    const hasTable = (name: string) =>
      Boolean(this.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
    this.db.transaction(() => {
      this.db.prepare('UPDATE game_results SET player_id = ? WHERE player_id = ?').run(toId, fromId);
      if (hasTable('sg_pool_owners')) {
        this.db
          .prepare('INSERT OR IGNORE INTO sg_pool_owners (pool_id, player_id) SELECT pool_id, ? FROM sg_pool_owners WHERE player_id = ?')
          .run(toId, fromId);
        this.db.prepare('DELETE FROM sg_pool_owners WHERE player_id = ?').run(fromId);
      }
      if (hasTable('detective_sessions')) {
        const rows = this.db
          .prepare('SELECT s.id, s.members FROM detective_sessions s, json_each(s.members) m WHERE m.value = ?')
          .all(fromId) as { id: string; members: string }[];
        const update = this.db.prepare('UPDATE detective_sessions SET members = ? WHERE id = ?');
        for (const r of rows) {
          const members = [...new Set((JSON.parse(r.members) as string[]).map((m) => (m === fromId ? toId : m)))];
          update.run(JSON.stringify(members), r.id);
        }
      }
      this.db.prepare('DELETE FROM players WHERE id = ?').run(fromId);
    })();
  }

  update(id: string, input: ProfileInput): Profile {
    this.db.prepare('UPDATE players SET nick = ?, avatar = ? WHERE id = ?').run(input.nick, JSON.stringify(input.avatar), id);
    return { id, nick: input.nick, avatar: input.avatar };
  }

  recordResults(
    gameId: string,
    roomCode: string,
    results: { playerId: string; score: number; rank: number; meta?: Record<string, unknown> }[],
  ): void {
    const stmt = this.db.prepare(
      'INSERT INTO game_results (player_id, game_id, room_code, score, rank, player_count, meta, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const now = Date.now();
    this.db.transaction(() => {
      for (const r of results) {
        stmt.run(r.playerId, gameId, roomCode, r.score, r.rank, results.length, r.meta ? JSON.stringify(r.meta) : null, now);
      }
    })();
  }

  stats(playerId: string, gameId?: string): ProfileStats {
    const where = gameId ? 'player_id = ? AND game_id = ?' : 'player_id = ?';
    const args = gameId ? [playerId, gameId] : [playerId];
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS games,
                SUM(CASE WHEN rank = 1 AND player_count > 1 THEN 1 ELSE 0 END) AS wins,
                MAX(CASE WHEN player_count > 1 THEN score END) AS best,
                MAX(CAST(json_extract(meta, '$.streak') AS INTEGER)) AS streak
         FROM game_results WHERE ${where}`,
      )
      .get(...args) as { games: number; wins: number | null; best: number | null; streak: number | null };
    return { gamesPlayed: row.games, wins: row.wins ?? 0, bestScore: row.best ?? 0, bestStreak: row.streak ?? 0 };
  }
}
