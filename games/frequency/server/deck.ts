import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import type { Card, CustomCardInput } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');
export const FRIEND_PREFIX = 'arkadas';

/** Hazır spektrum kartları (content/*.json, [sol, sağ] çiftleri) + oyuncuların eklediği kartlar (SQLite). */
export class Deck {
  private builtIn: Card[] = [];

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS frequency_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      left_text TEXT NOT NULL,
      right_text TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const category = file.replace(/\.json$/, '');
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as unknown[];
      raw.forEach((pair, i) => {
        if (Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string') {
          this.builtIn.push({ id: `${category}:${i}`, left: pair[0], right: pair[1] });
        }
      });
    }
  }

  builtInCount(): number {
    return this.builtIn.length;
  }

  private custom(): Card[] {
    const rows = this.db.prepare('SELECT id, left_text, right_text FROM frequency_cards ORDER BY id').all() as {
      id: number;
      left_text: string;
      right_text: string;
    }[];
    return rows.map((r) => ({ id: `${FRIEND_PREFIX}:${r.id}`, left: r.left_text, right: r.right_text }));
  }

  cards(withFriends: boolean): Card[] {
    return withFriends ? [...this.builtIn, ...this.custom()] : [...this.builtIn];
  }

  addCustom(input: CustomCardInput, createdBy: string): Card {
    const res = this.db
      .prepare('INSERT INTO frequency_cards (left_text, right_text, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(input.left, input.right, createdBy, Date.now());
    return { id: `${FRIEND_PREFIX}:${res.lastInsertRowid}`, left: input.left, right: input.right };
  }
}
