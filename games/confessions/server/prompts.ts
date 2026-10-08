import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { foldText } from '@songie/shared';
import { CUSTOM_CATEGORY, type CategoryInfo, type Topic } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  genel: 'Genel',
  cocukluk: 'Çocukluk',
  'okul-is': 'Okul ve iş',
  ask: 'Aşk',
  utanc: 'Utanç',
  aliskanliklar: 'Alışkanlıklar',
  cesur: 'Cesur (+18)',
  [CUSTOM_CATEGORY]: 'Arkadaş konuları',
};

/** Hazır konular (JSON) + oyuncuların eklediği konular (SQLite `confessions_prompts`). */
export class Prompts {
  private builtIn = new Map<string, string[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS confessions_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      folded TEXT NOT NULL UNIQUE,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as unknown;
      if (!Array.isArray(raw)) continue;
      this.builtIn.set(
        file.replace(/\.json$/, ''),
        raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0),
      );
    }
  }

  private custom(): string[] {
    return (this.db.prepare('SELECT text FROM confessions_prompts ORDER BY id').all() as { text: string }[]).map((r) => r.text);
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, list]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: list.length }));
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM confessions_prompts').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: n });
    return out;
  }

  topics(categories: string[]): Topic[] {
    const want = new Set(categories);
    const out: Topic[] = [];
    for (const [id, list] of this.builtIn) if (want.has(id)) out.push(...list.map((text) => ({ text, category: id })));
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom().map((text) => ({ text, category: CUSTOM_CATEGORY })));
    return out;
  }

  /** Aynı konu (büyük/küçük harf, noktalama farkı gözetmeden) varsa false döner. */
  add(text: string, createdBy: string): boolean {
    const folded = foldText(text);
    for (const list of this.builtIn.values()) if (list.some((t) => foldText(t) === folded)) return false;
    const res = this.db
      .prepare('INSERT OR IGNORE INTO confessions_prompts (text, folded, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(text, folded, createdBy, Date.now());
    return res.changes > 0;
  }
}
