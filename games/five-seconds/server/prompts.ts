import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { CUSTOM_CATEGORY, type CategoryInfo, type CustomPromptInput, type Prompt } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  genel: 'Genel',
  ask: 'Aşk ve ilk buluşma',
  'is-okul': 'İş ve okul',
  yemek: 'Yemek',
  turkiye: 'Türkiye',
  'pop-kultur': 'Pop kültür',
  sacma: 'Saçma sapan',
  cesur: 'Cesur (+18)',
  [CUSTOM_CATEGORY]: 'Arkadaş görevleri',
};

/** Hazır görevler (JSON) + oyuncuların eklediği görevler (SQLite). Oyuncu görevleri hiçbir uçtan listelenmez. */
export class PromptBank {
  private builtIn = new Map<string, Prompt[]>();

  constructor(
    private db: Database.Database,
    dir = CONTENT_DIR,
  ) {
    db.exec(`CREATE TABLE IF NOT EXISTS five_seconds_prompts (
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

  private custom(): Prompt[] {
    const rows = this.db.prepare('SELECT id, text FROM five_seconds_prompts ORDER BY id').all() as { id: number; text: string }[];
    return rows.map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, text: r.text, category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, list]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: list.length }));
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM five_seconds_prompts').get() as { n: number }).n;
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

  addCustom(input: CustomPromptInput, createdBy: string): Prompt {
    const res = this.db
      .prepare('INSERT INTO five_seconds_prompts (text, created_by, created_at) VALUES (?, ?, ?)')
      .run(input.text, createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, text: input.text, category: CUSTOM_CATEGORY };
  }
}
