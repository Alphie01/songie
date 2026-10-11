import type Database from 'better-sqlite3';

export interface SessionRow {
  id: string;
  slug: string;
  status: 'active' | 'done';
  members: string[];
  data: unknown;
  act: number;
  hoursSpent: number;
  score: number | null;
  rank: string | null;
  createdAt: number;
  updatedAt: number;
}

interface RawRow {
  id: string;
  slug: string;
  status: 'active' | 'done';
  members: string;
  data: string;
  act: number;
  hours_spent: number;
  score: number | null;
  rank: string | null;
  created_at: number;
  updated_at: number;
}

const toRow = (r: RawRow): SessionRow => ({
  id: r.id,
  slug: r.slug,
  status: r.status,
  members: JSON.parse(r.members) as string[],
  data: JSON.parse(r.data) as unknown,
  act: r.act,
  hoursSpent: r.hours_spent,
  score: r.score,
  rank: r.rank,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Soruşturmalar: kaldığı yerden devam ve "çözüldü" rozeti için. */
export class SessionStore {
  constructor(private db: Database.Database) {
    db.exec(`CREATE TABLE IF NOT EXISTS detective_sessions (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      status TEXT NOT NULL,
      members TEXT NOT NULL,
      data TEXT NOT NULL,
      act INTEGER NOT NULL,
      hours_spent INTEGER NOT NULL,
      score INTEGER,
      rank TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
  }

  save(row: Omit<SessionRow, 'createdAt'> & { createdAt?: number }): void {
    this.db
      .prepare(
        `INSERT INTO detective_sessions (id, slug, status, members, data, act, hours_spent, score, rank, created_at, updated_at)
         VALUES (@id, @slug, @status, @members, @data, @act, @hours, @score, @rank, @created, @updated)
         ON CONFLICT(id) DO UPDATE SET status = @status, members = @members, data = @data, act = @act,
           hours_spent = @hours, score = @score, rank = @rank, updated_at = @updated`,
      )
      .run({
        id: row.id,
        slug: row.slug,
        status: row.status,
        members: JSON.stringify(row.members),
        data: JSON.stringify(row.data),
        act: row.act,
        hours: row.hoursSpent,
        score: row.score,
        rank: row.rank,
        created: row.createdAt ?? row.updatedAt,
        updated: row.updatedAt,
      });
  }

  get(id: string): SessionRow | null {
    const r = this.db.prepare('SELECT * FROM detective_sessions WHERE id = ?').get(id) as RawRow | undefined;
    return r ? toRow(r) : null;
  }

  /** Profilin üyesi olduğu soruşturmalar (yeniden eskiye). */
  forMember(profileId: string, status: 'active' | 'done'): SessionRow[] {
    const rows = this.db
      .prepare(
        `SELECT s.* FROM detective_sessions s, json_each(s.members) m
         WHERE m.value = ? AND s.status = ? ORDER BY s.updated_at DESC LIMIT 50`,
      )
      .all(profileId, status) as RawRow[];
    return rows.map(toRow);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM detective_sessions WHERE id = ?').run(id);
  }
}
