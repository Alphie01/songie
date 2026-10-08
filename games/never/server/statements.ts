import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { CATEGORY_NAMES, CUSTOM_CATEGORY, normalizeStatement, type CategoryInfo, type Statement } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

/** Hazır cümleler (JSON) + arkadaşların eklediği cümleler (SQLite, `never_statements`). */
export class StatementPool {
  private builtIn = new Map<string, Statement[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS never_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const category = file.replace(/\.json$/, '');
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as unknown;
      if (!Array.isArray(raw)) continue;
      this.builtIn.set(
        category,
        raw
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((text, i) => ({ id: `${category}:${i}`, text, category })),
      );
    }
  }

  private custom(): Statement[] {
    const rows = this.db.prepare('SELECT id, text FROM never_statements ORDER BY id').all() as { id: number; text: string }[];
    return rows.map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, text: r.text, category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, list]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: list.length }));
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM never_statements').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: n });
    return out;
  }

  statements(categories: string[]): Statement[] {
    const want = new Set(categories);
    const out: Statement[] = [];
    for (const [id, list] of this.builtIn) if (want.has(id)) out.push(...list);
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom());
    return out;
  }

  addCustom(rawText: string, createdBy: string): Statement {
    const text = normalizeStatement(rawText);
    const res = this.db
      .prepare('INSERT INTO never_statements (text, created_by, created_at) VALUES (?, ?, ?)')
      .run(text, createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, text, category: CUSTOM_CATEGORY };
  }
}
