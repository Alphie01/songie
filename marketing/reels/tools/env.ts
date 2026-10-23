import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_ENV = path.join(os.homedir(), 'works/liste/.env');

/** Reads only KIE_API_KEY and OPENAI_API_KEY. Errors name the missing key, never a value. */
export function loadKeys(file = DEFAULT_ENV): { kie: string; openai: string } {
  const found: Record<string, string> = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*(?:export\s+)?(KIE_API_KEY|OPENAI_API_KEY)\s*=\s*(.*?)\s*$/.exec(line);
      if (m) found[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, '');
    }
  }
  for (const k of ['KIE_API_KEY', 'OPENAI_API_KEY']) {
    if (!found[k]) throw new Error(`${k} is missing in ${file}`);
  }
  return { kie: found.KIE_API_KEY!, openai: found.OPENAI_API_KEY! };
}

/** The repo's own .env (gitignored), where the ElevenLabs key lives as ELEVEN_LABS_API_KEY. */
export const REPO_ENV = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../.env');

/** Optional ElevenLabs key (ELEVENLABS_API_KEY or ELEVEN_LABS_API_KEY) from liste/.env, then the repo .env. Never logged. */
export function loadElevenKey(files = [DEFAULT_ENV, REPO_ENV]): string | undefined {
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*(?:export\s+)?ELEVEN_?LABS_API_KEY\s*=\s*(.*?)\s*$/.exec(line);
      if (m && m[1]) return m[1].replace(/^['"]|['"]$/g, '');
    }
  }
  return undefined;
}
