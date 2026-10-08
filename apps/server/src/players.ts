import type { Avatar, Profile, ProfileInput, ProfileStats } from '@songie/shared';
import type { DB } from './db.js';
import { hashToken, randomId, randomToken } from './ids.js';

interface PlayerRow {
  id: string;
  nick: string;
  avatar: string;
  token_hash: string;
}

function toProfile(row: PlayerRow): Profile {
  return { id: row.id, nick: row.nick, avatar: JSON.parse(row.avatar) as Avatar };
}

export class PlayerStore {
  constructor(private db: DB) {}

  create(input: ProfileInput): { token: string; profile: Profile } {
    const id = randomId(10);
    const token = randomToken();
    const now = Date.now();
    this.db
      .prepare('INSERT INTO players (id, nick, avatar, token_hash, created_at, seen_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, input.nick, JSON.stringify(input.avatar), hashToken(token), now, now);
    return { token, profile: { id, nick: input.nick, avatar: input.avatar } };
  }

  byToken(token: string | undefined | null): Profile | null {
    if (!token) return null;
    const row = this.db.prepare('SELECT * FROM players WHERE token_hash = ?').get(hashToken(token)) as
      | PlayerRow
      | undefined;
    if (!row) return null;
    this.db.prepare('UPDATE players SET seen_at = ? WHERE id = ?').run(Date.now(), row.id);
    return toProfile(row);
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
