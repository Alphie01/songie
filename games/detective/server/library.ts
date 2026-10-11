import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caseSchema, type CaseFile } from '../shared/case-schema.js';
import { checkCase } from './validate.js';

export const DEFAULT_CASES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cases');
export const IMG_ROUTE = '/api/games/detective/img';
export const AUDIO_ROUTE = '/api/games/detective/audio';

/** Adresler tahmin edilemesin (ör. sonraki bölümün anlatısı): süreç başına rastgele tuz. */
const SALT = randomBytes(16).toString('hex');

export interface LoadedCase {
  data: CaseFile;
  dir: string;
  /** Görsel anahtarı → yayın adresi (dosya yoksa yok). */
  urls: Map<string, string>;
  /** Yayın belirteci → dosya yolu. */
  files: Map<string, string>;
  /** Ses anahtarı (kanıt kimliği ya da "act-<n>") → yayın adresi. */
  audio: Map<string, string>;
  audioFiles: Map<string, string>;
}

/** Görsel adresinde anahtar görünmesin (anahtar adı ipucu verebilir). */
export function imageToken(slug: string, key: string): string {
  return createHash('sha256').update(`${SALT}:${slug}:${key}`).digest('hex').slice(0, 20);
}

/** Sorgudaki kilit anın ses dosyası adı (`audio/<anahtar>.mp3`). */
export function interviewAudioKey(interviewId: string, item: string): string {
  return `iv-${interviewId}-${item}`;
}

export function readCaseFile(dir: string): CaseFile {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'case.json'), 'utf8')) as unknown;
  return caseSchema.parse(raw);
}

export function loadCase(dir: string): LoadedCase {
  const data = readCaseFile(dir);
  const urls = new Map<string, string>();
  const files = new Map<string, string>();
  for (const key of Object.keys(data.images)) {
    const file = path.join(dir, 'img', `${key}.webp`);
    if (!fs.existsSync(file)) continue;
    const token = imageToken(data.meta.slug, key);
    urls.set(key, `${IMG_ROUTE}/${data.meta.slug}/${token}.webp`);
    files.set(token, file);
  }
  const audio = new Map<string, string>();
  const audioFiles = new Map<string, string>();
  const audioKeys = [
    ...data.evidence.filter((e) => e.doc.kind === 'audio').map((e) => e.id),
    ...data.acts.map((_, i) => `act-${i + 1}`),
    ...data.interviews.flatMap((iv) => [
      ...iv.questions.filter((q) => q.voiced).map((q) => interviewAudioKey(iv.id, q.id)),
      ...iv.confront.filter((x) => x.voiced).map((x) => interviewAudioKey(iv.id, `c-${x.evidence}`)),
    ]),
  ];
  for (const key of audioKeys) {
    const file = path.join(dir, 'audio', `${key}.mp3`);
    if (!fs.existsSync(file)) continue;
    const token = imageToken(data.meta.slug, `audio:${key}`);
    audio.set(key, `${AUDIO_ROUTE}/${data.meta.slug}/${token}.mp3`);
    audioFiles.set(token, file);
  }
  return { data, dir, urls, files, audio, audioFiles };
}

export class CaseLibrary {
  private cases = new Map<string, LoadedCase>();

  constructor(
    readonly dir: string = DEFAULT_CASES_DIR,
    log: (m: string) => void = (m) => console.warn(m),
  ) {
    if (!fs.existsSync(dir)) return;
    // published.json varsa yalnızca listedeki vakalar yüklenir (yazımı süren vakalar yayına girmesin).
    const listFile = path.join(dir, 'published.json');
    const published = fs.existsSync(listFile) ? new Set(JSON.parse(fs.readFileSync(listFile, 'utf8')) as string[]) : null;
    for (const name of fs.readdirSync(dir).sort()) {
      if (published && !published.has(name)) continue;
      const caseDir = path.join(dir, name);
      if (!fs.existsSync(path.join(caseDir, 'case.json'))) continue;
      try {
        const loaded = loadCase(caseDir);
        const report = checkCase(loaded.data);
        if (report.errors.length) {
          log(`[detective] ${name} yüklenmedi: ${report.errors[0]} (+${report.errors.length - 1})`);
          continue;
        }
        this.cases.set(loaded.data.meta.slug, loaded);
      } catch (err) {
        log(`[detective] ${name} okunamadı: ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`);
      }
    }
  }

  get(slug: string): LoadedCase | undefined {
    return this.cases.get(slug);
  }

  list(): LoadedCase[] {
    return [...this.cases.values()];
  }

  /** Belirteçten görsel dosyası. */
  file(slug: string, token: string): string | undefined {
    return this.cases.get(slug)?.files.get(token);
  }

  audioFile(slug: string, token: string): string | undefined {
    return this.cases.get(slug)?.audioFiles.get(token);
  }
}
