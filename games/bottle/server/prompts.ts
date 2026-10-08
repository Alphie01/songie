import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import {
  BUILTIN_CATEGORIES,
  CUSTOM_CATEGORY,
  KINDS,
  type CategoryInfo,
  type CustomPromptInput,
  type Prompt,
  type PromptKind,
} from '../shared/index.js';

const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export const CATEGORY_NAMES: Record<string, string> = {
  eglenceli: 'Eğlenceli',
  arkadaslar: 'Arkadaşlar',
  ask: 'Aşk',
  utanc: 'Utanç',
  cesur: 'Cesur (+18)',
  [CUSTOM_CATEGORY]: 'Oyuncuların ekledikleri',
};

const ORDER = [...BUILTIN_CATEGORIES, CUSTOM_CATEGORY] as string[];

interface RawFile {
  truth?: string[];
  dare?: string[];
}

/** Hazır sorular (JSON) + oyuncuların eklediği sorular (SQLite, `bottle_prompts`). */
export class PromptBank {
  private builtIn = new Map<string, Prompt[]>();

  constructor(private db: Database.Database, dir = CONTENT_DIR) {
    db.exec(`CREATE TABLE IF NOT EXISTS bottle_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const category = file.replace(/\.json$/, '');
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as RawFile;
      const list: Prompt[] = [];
      for (const kind of KINDS) {
        (raw[kind] ?? []).forEach((text, i) => {
          if (typeof text === 'string' && text.trim()) list.push({ id: `${category}:${kind}:${i}`, kind, text: text.trim(), category });
        });
      }
      this.builtIn.set(category, list);
    }
  }

  private custom(): Prompt[] {
    const rows = this.db.prepare('SELECT id, kind, text FROM bottle_prompts ORDER BY id').all() as { id: number; kind: string; text: string }[];
    return rows
      .filter((r): r is { id: number; kind: PromptKind; text: string } => (KINDS as readonly string[]).includes(r.kind))
      .map((r) => ({ id: `${CUSTOM_CATEGORY}:${r.id}`, kind: r.kind, text: r.text, category: CUSTOM_CATEGORY }));
  }

  categories(): CategoryInfo[] {
    const all = new Map<string, Prompt[]>(this.builtIn);
    all.set(CUSTOM_CATEGORY, this.custom());
    const ids = [...all.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
    return ids.map((id) => {
      const list = all.get(id)!;
      return {
        id,
        name: CATEGORY_NAMES[id] ?? id,
        truth: list.filter((p) => p.kind === 'truth').length,
        dare: list.filter((p) => p.kind === 'dare').length,
      };
    });
  }

  prompts(categories: string[], kind: PromptKind): Prompt[] {
    const want = new Set(categories);
    const out: Prompt[] = [];
    for (const [id, list] of this.builtIn) if (want.has(id)) out.push(...list.filter((p) => p.kind === kind));
    if (want.has(CUSTOM_CATEGORY)) out.push(...this.custom().filter((p) => p.kind === kind));
    return out;
  }

  addCustom(input: CustomPromptInput, createdBy: string): Prompt {
    const res = this.db
      .prepare('INSERT INTO bottle_prompts (kind, text, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(input.kind, input.text, createdBy, Date.now());
    return { id: `${CUSTOM_CATEGORY}:${res.lastInsertRowid}`, kind: input.kind, text: input.text, category: CUSTOM_CATEGORY };
  }
}
