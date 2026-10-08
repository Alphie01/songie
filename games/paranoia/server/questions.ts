import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { CUSTOM_CATEGORY, type CategoryInfo } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  genel: 'Genel',
  arkadaslik: 'Arkadaşlık',
  ask: 'Aşk',
  gelecek: 'Gelecek',
  utanc: 'Utanç',
  yetenek: 'Yetenek',
  cesur: 'Cesur (+18)',
  [CUSTOM_CATEGORY]: 'Sizin sorularınız',
};

/** Kategori sırası: ayar panelinde bu sırayla görünür. */
const ORDER = ['genel', 'arkadaslik', 'ask', 'gelecek', 'utanc', 'yetenek', 'cesur'];

export interface Question {
  id: string;
  text: string;
  category: string;
}

/** Hazır sorular (content/*.json) + oyuncuların eklediği sorular (SQLite, `paranoia_questions`). */
export class QuestionBank {
  private builtIn = new Map<string, Question[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS paranoia_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
    for (const category of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, `${category}.json`), 'utf8')) as unknown[];
      this.builtIn.set(
        category,
        raw
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((text, i) => ({ id: `${category}:${i}`, text: text.trim(), category })),
      );
    }
  }

  private custom(): Question[] {
    const rows = this.db.prepare('SELECT id, text FROM paranoia_questions ORDER BY id').all() as { id: number; text: string }[];
    return rows.map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, text: r.text, category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, qs]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: qs.length }));
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM paranoia_questions').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: n });
    return out;
  }

  questions(categories: string[]): Question[] {
    const want = new Set(categories);
    const out: Question[] = [];
    for (const [id, qs] of this.builtIn) if (want.has(id)) out.push(...qs);
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom());
    return out;
  }

  add(text: string, createdBy: string): Question {
    const res = this.db
      .prepare('INSERT INTO paranoia_questions (text, created_by, created_at) VALUES (?, ?, ?)')
      .run(text, createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, text, category: CUSTOM_CATEGORY };
  }
}
