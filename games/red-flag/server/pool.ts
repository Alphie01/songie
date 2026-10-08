import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { CATEGORY_IDS, CUSTOM_CATEGORY, type CategoryInfo, type CustomItemInput, type Situation } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  iliski: 'İlişki',
  'ilk-bulusma': 'İlk buluşma',
  arkadaslik: 'Arkadaşlık',
  'ev-arkadasi': 'Ev arkadaşı',
  is: 'İş',
  aile: 'Aile',
  'sosyal-medya': 'Sosyal medya',
  aliskanliklar: 'Alışkanlıklar',
  cesur: 'Cesur (+18)',
  [CUSTOM_CATEGORY]: 'Arkadaşların ekledikleri',
};

const ORDER = new Map<string, number>(CATEGORY_IDS.map((id, i) => [id, i]));

/** Hazır durumlar (server/content/*.json) + oyuncuların eklediği durumlar (SQLite `red_flag_items`). */
export class Pool {
  private builtIn = new Map<string, Situation[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS red_flag_items (
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
        raw
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((text, i) => ({ id: `${category}:${i}`, text: text.trim(), category })),
      );
    }
  }

  private custom(): Situation[] {
    const rows = this.db.prepare('SELECT id, text FROM red_flag_items ORDER BY id').all() as { id: number; text: string }[];
    return rows.map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, text: r.text, category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, items]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: items.length }));
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM red_flag_items').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: n });
    return out.sort((a, b) => (ORDER.get(a.id) ?? 99) - (ORDER.get(b.id) ?? 99));
  }

  items(categories: string[]): Situation[] {
    const want = new Set(categories);
    const out: Situation[] = [];
    for (const [id, items] of this.builtIn) if (want.has(id)) out.push(...items);
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom());
    return out;
  }

  addCustom(input: CustomItemInput, createdBy: string): Situation {
    const res = this.db
      .prepare('INSERT INTO red_flag_items (text, created_by, created_at) VALUES (?, ?, ?)')
      .run(input.text, createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, text: input.text, category: CUSTOM_CATEGORY };
  }
}
