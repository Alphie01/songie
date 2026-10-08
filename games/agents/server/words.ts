import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { foldText } from '@songie/shared';
import { PACKS, type PackId } from '../shared/index.js';

export const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

export type WordPacks = Record<PackId, string[]>;

/** `content/<paket>.json` dosyalarını okur (her biri kelime dizisi). */
export function loadPacks(dir = CONTENT_DIR): WordPacks {
  const out = {} as WordPacks;
  for (const id of PACKS) {
    const file = path.join(dir, `${id}.json`);
    const raw = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as unknown) : [];
    out[id] = Array.isArray(raw) ? raw.filter((w): w is string => typeof w === 'string' && w.trim().length > 0).map((w) => w.trim()) : [];
  }
  return out;
}

/** Seçili paketlerdeki kelimeler, yazımı farklı da olsa aynı kelime bir kez. */
export function wordsFor(packs: WordPacks, ids: readonly PackId[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    for (const w of packs[id] ?? []) {
      const key = foldText(w);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(w);
    }
  }
  return out;
}
