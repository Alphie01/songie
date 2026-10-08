import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import {
  CATEGORY_KIND,
  CUSTOM_CATEGORY,
  countWords,
  type Card,
  type CategoryInfo,
  type CustomTitleInput,
  type Difficulty,
  type Kind,
} from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  'film-turk': 'Türk filmleri',
  'film-yabanci': 'Yabancı filmler',
  'dizi-turk': 'Türk dizileri',
  'dizi-yabanci': 'Yabancı diziler',
  kitap: 'Kitaplar',
  sarki: 'Şarkılar',
  'atasozu-deyim': 'Atasözleri ve deyimler',
  [CUSTOM_CATEGORY]: 'Arkadaş başlıkları',
};

/** İçerik dosyası satırı: t = başlık, d = zorluk (k = kolay, z = zor). */
interface RawTitle {
  t: string;
  d: 'k' | 'z';
}

interface Entry extends Card {
  hard: boolean;
}

/** Hazır başlıklar (JSON) + arkadaşların eklediği başlıklar (SQLite). */
export class TitleBank {
  private builtIn = new Map<string, Entry[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS charades_titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const category = file.replace(/\.json$/, '');
      const kind = CATEGORY_KIND[category];
      if (!kind) continue;
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as RawTitle[];
      this.builtIn.set(
        category,
        raw
          .filter((r) => typeof r?.t === 'string' && r.t.trim())
          .map((r, i) => ({ id: `${category}:${i}`, title: r.t.trim(), kind, words: countWords(r.t), category, hard: r.d === 'z' })),
      );
    }
  }

  private custom(): Card[] {
    const rows = this.db.prepare('SELECT id, title, kind FROM charades_titles ORDER BY id').all() as { id: number; title: string; kind: Kind }[];
    return rows.map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, title: r.title, kind: r.kind, words: countWords(r.title), category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, list]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: list.length }));
    const customCount = (this.db.prepare('SELECT COUNT(*) AS n FROM charades_titles').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: customCount });
    return out;
  }

  /** Seçili kategorilerden zorluğa uyan kartlar. Arkadaş başlıkları her zorlukta gelir. */
  cards(categories: string[], difficulty: Difficulty): Card[] {
    const want = new Set(categories);
    const out: Card[] = [];
    for (const [id, list] of this.builtIn) {
      if (!want.has(id)) continue;
      for (const { hard, ...card } of list) {
        if (difficulty === 'kolay' && hard) continue;
        if (difficulty === 'zor' && !hard) continue;
        out.push(card);
      }
    }
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom());
    return out;
  }

  addCustom(input: CustomTitleInput, createdBy: string): Card {
    const res = this.db
      .prepare('INSERT INTO charades_titles (title, kind, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(input.title, input.kind, createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, title: input.title, kind: input.kind, words: countWords(input.title), category: CUSTOM_CATEGORY };
  }
}
