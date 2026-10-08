import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { CUSTOM_CATEGORY, type Card, type CategoryInfo, type CustomCardInput } from '../shared/index.js';

const DECK_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'deck');

export const CATEGORY_NAMES: Record<string, string> = {
  genel: 'Genel',
  yemek: 'Yemek',
  hayvanlar: 'Hayvanlar',
  meslekler: 'Meslekler',
  nesneler: 'Nesneler',
  spor: 'Spor',
  'film-dizi-muzik': 'Film, dizi, müzik',
  yerler: 'Yerler',
  'bilim-teknoloji': 'Bilim ve teknoloji',
  turkiye: 'Türkiye',
  [CUSTOM_CATEGORY]: 'Arkadaş kartları',
};

interface RawCard {
  w: string;
  t: string[];
}

/** Hazır deste (JSON dosyaları) + arkadaşların eklediği kartlar (SQLite). */
export class Deck {
  private builtIn = new Map<string, Card[]>();

  constructor(private db: Database.Database, dir = DECK_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS tb_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      taboo TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const category = file.replace(/\.json$/, '');
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as RawCard[];
      this.builtIn.set(
        category,
        raw
          .filter((c) => c?.w && Array.isArray(c.t) && c.t.length > 0)
          .map((c, i) => ({ id: `${category}:${i}`, word: c.w, taboo: c.t.slice(0, 5), category })),
      );
    }
  }

  private custom(): Card[] {
    const rows = this.db.prepare('SELECT id, word, taboo FROM tb_cards ORDER BY id').all() as { id: number; word: string; taboo: string }[];
    return rows.map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, word: r.word, taboo: JSON.parse(r.taboo) as string[], category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, cards]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: cards.length }));
    const customCount = (this.db.prepare('SELECT COUNT(*) AS n FROM tb_cards').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: customCount });
    return out;
  }

  cards(categories: string[]): Card[] {
    const want = new Set(categories);
    const out: Card[] = [];
    for (const [id, cards] of this.builtIn) if (want.has(id)) out.push(...cards);
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom());
    return out;
  }

  addCustom(input: CustomCardInput, createdBy: string): Card {
    const res = this.db
      .prepare('INSERT INTO tb_cards (word, taboo, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(input.word, JSON.stringify(input.taboo), createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, word: input.word, taboo: input.taboo, category: CUSTOM_CATEGORY };
  }
}
