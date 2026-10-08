import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { foldText } from '@songie/shared';
import { CUSTOM_CATEGORY, type CategoryInfo, type CustomCardInput } from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  'turk-unluler': 'Türk ünlüleri',
  'dunya-unluler': 'Dünya ünlüleri',
  karakterler: 'Çizgi film ve film karakterleri',
  hayvanlar: 'Hayvanlar',
  nesneler: 'Nesneler',
  meslekler: 'Meslekler',
  'tarihi-kisiler': 'Tarihi kişiler',
  sporcular: 'Sporcular',
  [CUSTOM_CATEGORY]: 'Arkadaş kartları',
};

/** Kategorinin ipucu olarak söylenen tekil hali. */
export const CATEGORY_HINT: Record<string, string> = {
  'turk-unluler': 'Türkiye’den bir ünlüsün.',
  'dunya-unluler': 'Dünyaca ünlü birisin.',
  karakterler: 'Bir çizgi film, film ya da dizi karakterisin.',
  hayvanlar: 'Bir hayvansın.',
  nesneler: 'Bir nesnesin.',
  meslekler: 'Kimliğin bir meslek.',
  'tarihi-kisiler': 'Tarihi bir kişisin.',
  sporcular: 'Bir sporcusun.',
  [CUSTOM_CATEGORY]: 'Bir arkadaşının eklediği kartsın.',
};

export interface IdentityCard {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  createdBy: string | null;
}

interface RawCard {
  n: string;
  a?: string[];
}

/** Karşılaştırma anahtarları: katlanmış hal ve boşluksuz hal. */
function keys(text: string): string[] {
  const f = foldText(text);
  if (!f) return [];
  return [f, f.replace(/ /g, '')];
}

/** Kartın kabul edilen bütün yazımları (ad, parantezsiz ad, eşanlamlar). */
export function acceptedKeys(card: Pick<IdentityCard, 'name' | 'aliases'>): Set<string> {
  const out = new Set<string>();
  const bare = card.name.replace(/\s*\([^)]*\)/g, '');
  for (const t of [card.name, bare, ...card.aliases]) for (const k of keys(t)) out.add(k);
  return out;
}

/** Tahmin kartla eşleşiyor mu? Türkçe karakter, büyük/küçük harf, noktalama ve boşluk duyarsız. */
export function matchesGuess(card: Pick<IdentityCard, 'name' | 'aliases'>, guess: string): boolean {
  const accepted = acceptedKeys(card);
  return keys(guess).some((k) => accepted.has(k));
}

/** Hazır kimlikler (JSON) + oyuncuların eklediği kimlikler (SQLite). */
export class IdentityPool {
  private builtIn = new Map<string, IdentityCard[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS who_am_i_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      aliases TEXT NOT NULL,
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
          .filter((c) => typeof c?.n === 'string' && c.n.trim())
          .map((c, i) => ({ id: `${category}:${i}`, name: c.n, category, aliases: c.a ?? [], createdBy: null })),
      );
    }
  }

  private custom(): IdentityCard[] {
    const rows = this.db.prepare('SELECT id, name, aliases, created_by FROM who_am_i_cards ORDER BY id').all() as {
      id: number;
      name: string;
      aliases: string;
      created_by: string | null;
    }[];
    return rows.map((r) => ({
      id: `${CUSTOM_CATEGORY}:${r.id}`,
      name: r.name,
      category: CUSTOM_CATEGORY,
      aliases: JSON.parse(r.aliases) as string[],
      createdBy: r.created_by,
    }));
  }

  categories(): CategoryInfo[] {
    const out: CategoryInfo[] = [...this.builtIn].map(([id, cards]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: cards.length }));
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM who_am_i_cards').get() as { n: number }).n;
    out.push({ id: CUSTOM_CATEGORY, name: CATEGORY_NAMES[CUSTOM_CATEGORY]!, count: n });
    return out;
  }

  cards(categories: string[]): IdentityCard[] {
    const want = new Set(categories);
    const out: IdentityCard[] = [];
    for (const [id, cards] of this.builtIn) if (want.has(id)) out.push(...cards);
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom());
    return out;
  }

  addCustom(input: CustomCardInput, createdBy: string): IdentityCard {
    const aliases = [...new Set(input.aliases.map((a) => a.trim()).filter(Boolean))];
    const res = this.db
      .prepare('INSERT INTO who_am_i_cards (name, aliases, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(input.name.trim(), JSON.stringify(aliases), createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, name: input.name.trim(), category: CUSTOM_CATEGORY, aliases, createdBy };
  }
}
