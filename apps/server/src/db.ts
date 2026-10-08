import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type DB = Database.Database;

export function openDb(dataDir: string, file = 'songie.db'): DB {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(file === ':memory:' ? ':memory:' : path.join(dataDir, file));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, at INTEGER NOT NULL)`);
  migrate(db, 'core-001', `
    CREATE TABLE players (
      id TEXT PRIMARY KEY,
      nick TEXT NOT NULL,
      avatar TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      seen_at INTEGER NOT NULL
    );
    CREATE TABLE game_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL,
      room_code TEXT NOT NULL,
      score INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      player_count INTEGER NOT NULL,
      meta TEXT,
      at INTEGER NOT NULL
    );
    CREATE INDEX game_results_player ON game_results(player_id, game_id);
  `);
  return db;
}

/** Her migration bir kez çalışır. Oyun modülleri de kendi tablolarını bununla açar. */
export function migrate(db: DB, id: string, sql: string): void {
  const done = db.prepare('SELECT 1 FROM migrations WHERE id = ?').get(id);
  if (done) return;
  db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO migrations (id, at) VALUES (?, ?)').run(id, Date.now());
  })();
}
