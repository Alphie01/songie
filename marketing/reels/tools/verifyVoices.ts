import fs from 'node:fs';
import path from 'node:path';
import { loadKeys } from './env.js';
import { speak, type VoiceLine } from './tts.js';

/** Words of a Turkish line, lowercased, apostrophes and punctuation dropped (Ece'yi → eceyi). */
export const words = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

async function transcribe(file: string): Promise<string> {
  const form = new FormData();
  form.append('model', 'gpt-4o-mini-transcribe');
  form.append('language', 'tr');
  form.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/mpeg' }), 'a.mp3');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${loadKeys().openai}` }, body: form });
  return ((await r.json()) as { text?: string }).text ?? '';
}

/**
 * Speaks every line and checks it with a transcription; a line whose words differ is regenerated (up to
 * `tries` times). Returns the lines that still do not match, for a human to listen to.
 */
export async function verifiedVoices(lines: VoiceLine[], dir: string, tries = 3): Promise<{ id: string; heard: string }[]> {
  const bad: { id: string; heard: string }[] = [];
  for (const l of lines) {
    let heard = '';
    for (let t = 0; t < tries; t++) {
      const file = await speak(l, dir);
      heard = await transcribe(file);
      if (words(heard).join(' ') === words(l.text).join(' ')) break;
      const base = file.replace(/\.mp3$/, '');
      for (const f of [file, `${base}.raw.mp3`]) fs.rmSync(f, { force: true });
      heard += ' ✗';
    }
    if (heard.endsWith('✗')) {
      bad.push({ id: l.id, heard });
      await speak(l, dir); // keep the last take so renders still work
    }
    console.log(`${path.basename(l.id)}: ${heard}`);
  }
  return bad;
}
