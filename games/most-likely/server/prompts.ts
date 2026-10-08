import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { CUSTOM_CATEGORY, type CategoryInfo, type Prompt } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  genel: 'Genel',
  arkadaslik: 'Arkadaşlık',
  ask: 'Aşk',
  'is-okul': 'İş ve okul',
  gelecek: 'Gelecek',
  utanc: 'Utanç',
  aliskanliklar: 'Alışkanlıklar',
  cesur: 'Cesur (+18)',
  [CUSTOM_CATEGORY]: 'Arkadaş soruları',
};

/** Hazır sorular (JSON) + oyuncuların eklediği sorular (`most_likely_prompts`). */
export class PromptPool {
  private builtIn = new Map<string, Prompt[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS most_likely_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const category = file.replace(/\.json$/, '');
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as unknown[];
      this.builtIn.set(
        category,
        raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((text, i) => ({ id: `${category}:${i}`, text, category })),
      );
    }
  }

  private custom(): Prompt[] {
    const rows = this.db.prepare('SELECT id, text FROM most_likely_prompts ORDER BY id').all() as { id: number; text: string }[];
    return rows.map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, text: r.text, category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, list]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: list.length }));
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM most_likely_prompts').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: n });
    return out;
  }

  prompts(categories: string[]): Prompt[] {
    const want = new Set(categories);
    const out: Prompt[] = [];
    for (const [id, list] of this.builtIn) if (want.has(id)) out.push(...list);
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom());
    return out;
  }

  add(text: string, createdBy: string): Prompt {
    const key = (t: string) => t.toLocaleLowerCase('tr-TR');
    const dup = this.custom().find((p) => key(p.text) === key(text));
    if (dup) return dup;
    const res = this.db.prepare('INSERT INTO most_likely_prompts (text, created_by, created_at) VALUES (?, ?, ?)').run(text, createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, text, category: CUSTOM_CATEGORY };
  }
}
