/**
 * Ses kanıtlarını ve bölüm anlatılarını OpenAI TTS ile seslendirir (yalnızca geliştirmede).
 *
 *   pnpm --filter @songie/detective case:voices <slug> [--dry] [--only e-call,act-1] [--redo]
 *
 * Çıktı: cases/<slug>/audio/<kanıt>.mp3 ve audio/act-<n>.mp3. Telefon kayıtlarına hat filtresi uygulanır.
 * TTS_MODEL (varsayılan gpt-4o-mini-tts). Harcama tools/.image-spend.json'daki ortak bütçeye yazılır.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CaseDoc, CaseFile, Voice } from '../shared/case-schema.js';
import { DEFAULT_CASES_DIR, readCaseFile } from '../server/library.js';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const SPEND_FILE = path.join(TOOLS, '.image-spend.json');

for (const line of fs.existsSync(path.join(TOOLS, '.env.local')) ? fs.readFileSync(path.join(TOOLS, '.env.local'), 'utf8').split('\n') : []) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
  if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, '');
}
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.TTS_MODEL ?? 'gpt-4o-mini-tts';
const BUDGET = Number(process.env.IMAGE_BUDGET_USD ?? 25);
/** gpt-4o-mini-tts ≈ 0,015 $/dk; Türkçe ≈ 13 karakter/sn konuşma. */
const USD_PER_CHAR = 0.015 / 60 / 13;

const ff = (() => {
  const req = createRequire(path.join(TOOLS, '../../../apps/server/package.json'));
  return req('ffmpeg-static') as string;
})();

/** Cinsiyet ve yaşa göre sesler; aynı vakada karakterler mümkün olduğunca ayrı ses alır. */
const VOICES: Record<Voice['gender'], Record<Voice['age'], string[]>> = {
  male: { young: ['echo', 'verse', 'ash'], adult: ['ash', 'ballad', 'cedar', 'verse'], old: ['onyx', 'cedar', 'ballad'] },
  female: { young: ['shimmer', 'nova', 'coral'], adult: ['coral', 'sage', 'marin', 'alloy'], old: ['sage', 'marin', 'alloy'] },
};
const AGE_TR: Record<Voice['age'], string> = { young: 'genç (20–30 yaş)', adult: 'orta yaşlı (35–55 yaş)', old: 'yaşlı (60 yaş üstü)' };

function assignVoices(c: CaseFile): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  const pick = (key: string, v: Voice) => {
    if (out.has(key)) return out.get(key)!;
    const pool = VOICES[v.gender][v.age];
    const all = [...pool, ...Object.values(VOICES[v.gender]).flat()];
    const voice = all.find((x) => !used.has(x)) ?? pool[0]!;
    used.add(voice);
    out.set(key, voice);
    return voice;
  };
  if (c.meta.narrator) pick('@narrator', c.meta.narrator);
  for (const ch of c.characters) if (ch.voice) pick(ch.id, ch.voice);
  for (const e of c.evidence) {
    if (e.doc.kind !== 'audio') continue;
    for (const l of e.doc.lines) if (!l.character && l.name && l.voice) pick(`#${l.name}`, l.voice);
  }
  return out;
}

async function tts(text: string, voice: string, instructions: string, out: string) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice, input: text, instructions, response_format: 'wav' }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}

const run = (args: string[]) => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

/** Parçaları araya sessizlik koyarak birleştirir; telefon kaydıysa hat filtresi ve hafif cızırtı. */
function assemble(parts: { file: string; pauseBefore: number }[], out: string, phone: boolean) {
  const tmp = path.dirname(parts[0]!.file);
  const list: string[] = [];
  parts.forEach((p, i) => {
    const norm = path.join(tmp, `n${i}.wav`);
    run(['-i', p.file, '-ar', '24000', '-ac', '1', norm]);
    if (p.pauseBefore > 0) {
      const sil = path.join(tmp, `s${i}.wav`);
      run(['-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`, '-t', String(p.pauseBefore), sil]);
      list.push(sil);
    }
    list.push(norm);
  });
  const concat = path.join(tmp, 'list.txt');
  fs.writeFileSync(concat, list.map((f) => `file '${f}'`).join('\n'));
  const joined = path.join(tmp, 'joined.wav');
  run(['-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', joined]);
  if (phone) {
    run([
      '-i', joined,
      '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.012:r=24000',
      '-filter_complex', '[0:a]highpass=f=320,lowpass=f=3300,acompressor=threshold=-18dB:ratio=4,volume=1.4[v];[v][1:a]amix=inputs=2:duration=first:normalize=0[o]',
      '-map', '[o]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', out,
    ]);
  } else {
    run(['-i', joined, '-af', 'loudnorm=I=-18:TP=-2', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '80k', out]);
  }
}

const PHONE = new Set(['phone-call', 'emergency-call', 'voicemail']);

function characterInstr(v: Voice | undefined, delivery: string | undefined): string {
  const who = v ? `${v.gender === 'male' ? 'Erkek' : 'Kadın'}, ${AGE_TR[v.age]}${v.style ? `; ${v.style}` : ''}.` : '';
  return `Türkçe konuş; doğal, gündelik konuşma Türkçesi, Türkçe vurgu ve tonlamayla (yabancı aksan yok). ${who} Gerçek bir ses kaydı gibi, oyunculuk abartısız.${delivery ? ` Söyleyiş: ${delivery}.` : ''}`;
}

async function main() {
  const args = process.argv.slice(2);
  if (!KEY) throw new Error('OPENAI_API_KEY yok (tools/.env.local).');
  const slug = args.find((a) => !a.startsWith('-'));
  if (!slug) throw new Error('Kullanım: case:voices <slug> [--dry] [--only k1,k2] [--redo]');
  const dir = path.join(process.env.CASES_DIR ?? DEFAULT_CASES_DIR, slug);
  const c = readCaseFile(dir);
  const outDir = path.join(dir, 'audio');
  fs.mkdirSync(outDir, { recursive: true });
  const voices = assignVoices(c);
  const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const redo = args.includes('--redo');

  type Job = { key: string; phone: boolean; lines: { text: string; voice: string; instr: string; pause: number }[] };
  const jobs: Job[] = [];
  const narrator = voices.get('@narrator') ?? 'onyx';
  const nv = c.meta.narrator;
  c.acts.forEach((a, i) => {
    const paras = a.scene.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const instr = `Türkçe konuş; Türkçe vurgu ve tonlama. Polisiye bir dizinin anlatıcısısın: ${nv ? `${nv.gender === 'male' ? 'erkek' : 'kadın'}, ${AGE_TR[nv.age]}${nv.style ? `, ${nv.style}` : ''}` : 'tok, ağır'}. Ağır tempoda, cümle aralarında kısa duraklarla, gerilimi koruyarak oku. Abartma.`;
    jobs.push({ key: `act-${i + 1}`, phone: false, lines: paras.map((text, j) => ({ text, voice: narrator, instr, pause: j === 0 ? 0.6 : 0.9 })) });
  });
  for (const e of c.evidence) {
    const d = e.doc as CaseDoc;
    if (d.kind !== 'audio') continue;
    jobs.push({
      key: e.id,
      phone: PHONE.has(d.variant),
      lines: d.lines.map((l, j) => {
        const ch = l.character ? c.characters.find((x) => x.id === l.character) : undefined;
        const v = l.voice ?? ch?.voice;
        const voice = (ch ? voices.get(ch.id) : voices.get(`#${l.name}`)) ?? 'alloy';
        return { text: l.text, voice, instr: characterInstr(v, l.delivery), pause: l.pause ?? (j === 0 ? 0.4 : 0.35) };
      }),
    });
  }
  const todo = jobs.filter((j) => (only ? only.includes(j.key) : redo || !fs.existsSync(path.join(outDir, `${j.key}.mp3`))));
  const chars = todo.reduce((s, j) => s + j.lines.reduce((t, l) => t + l.text.length, 0), 0);
  const usd = chars * USD_PER_CHAR;
  console.log(`${slug}: ${todo.length} kayıt, ${chars} karakter, tahmini ${usd.toFixed(2)} $ · sesler: ${[...voices].map(([k, v]) => `${k}=${v}`).join(', ')}`);
  if (args.includes('--dry')) return;

  for (const job of todo) {
    const spend = fs.existsSync(SPEND_FILE) ? JSON.parse(fs.readFileSync(SPEND_FILE, 'utf8')) : { total: 0, items: [] };
    const cost = job.lines.reduce((t, l) => t + l.text.length, 0) * USD_PER_CHAR;
    if (spend.total + cost > BUDGET) {
      console.log(`  ${job.key}: bütçe sınırı — durdu.`);
      break;
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-voice-'));
    try {
      const parts = await Promise.all(
        job.lines.map(async (l, i) => {
          const file = path.join(tmp, `p${i}.wav`);
          await tts(l.text, l.voice, l.instr, file);
          return { file, pauseBefore: l.pause };
        }),
      );
      const out = path.join(outDir, `${job.key}.mp3`);
      assemble(parts, out, job.phone);
      spend.total += cost;
      spend.items.push({ slug, key: `audio:${job.key}`, usd: cost, at: new Date().toISOString(), model: MODEL });
      fs.writeFileSync(SPEND_FILE, JSON.stringify(spend, null, 2));
      console.log(`  ${job.key}: tamam (${Math.round(fs.statSync(out).size / 1024)} KB)`);
    } catch (err) {
      console.log(`  ${job.key}: HATA ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
