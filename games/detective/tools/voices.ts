/**
 * Ses kanıtlarını ve bölüm anlatılarını ElevenLabs v3 ile seslendirir (yalnızca geliştirmede).
 *
 *   pnpm --filter @songie/detective case:voices <slug> [--dry] [--only e-call,act-1] [--redo] [--recast]
 *
 * - Diyaloglar text-to-dialogue ile tek parça üretilir (konuşmacılar birbirine tepki verir).
 * - Oyuncu seçimi: her konuşan karaktere İstanbul aksanlı paylaşılan seslerden biri, tarifine göre
 *   (cinsiyet, yaş, tarz) seçilir ve `audio/cast.json`'da saklanır; karakterin sesi her kayıtta aynı kalır.
 * - Türkçe söyleyiş yönergeleri (`delivery`) v3'ün anladığı İngilizce etiketlere çevrilip aynı dosyada saklanır.
 * - Telefon kayıtlarına hat filtresi uygulanır.
 * Anahtarlar: tools/.env.local → ELEVENLABS_API_KEY (ses), OPENAI_API_KEY (oyuncu seçimi ve etiket çevirisi).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CaseFile, Voice } from '../shared/case-schema.js';
import { DEFAULT_CASES_DIR, interviewAudioKey, readCaseFile } from '../server/library.js';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.existsSync(path.join(TOOLS, '.env.local')) ? fs.readFileSync(path.join(TOOLS, '.env.local'), 'utf8').split('\n') : []) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
  if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, '');
}
const EL = process.env.ELEVENLABS_API_KEY;
const OA = process.env.OPENAI_API_KEY;
const MODEL = process.env.EL_MODEL ?? 'eleven_v3';
const CHAT = process.env.CAST_MODEL ?? 'gpt-4.1-mini';
const ff = createRequire(path.join(TOOLS, '../../../apps/server/package.json'))('ffmpeg-static') as string;

/** Anlatıcı sesleri (kullanıcının dinleyip onayladığı "Adam"). */
const NARRATOR_PREF: Record<Voice['gender'], string> = { male: 'Adam - Deep, Professional and Serious', female: 'Gamze Özdemir - Turkish Female Narrator' };
const NARRATOR_TAG = '[serious, slow, low voice, tense]';
const PHONE = new Set(['phone-call', 'emergency-call', 'voicemail']);

/** Parantez içindeki sahne notlarını ("(Ekrana uzun süre bakıyor.)") seslendirmeden önce at. */
const spoken = (t: string) => t.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
const MAX_CHUNK = 1800;

/** Karakter yaşı → kabul edilen ses yaşları. */
const AGES: Record<Voice['age'], string[]> = { young: ['young'], adult: ['middle_aged', 'young'], old: ['old', 'middle_aged'] };

interface PoolVoice { voice_id: string; name: string; gender: string; age: string; accent: string; use_case: string; descriptive: string }
interface Cast { voices: Record<string, { voice_id: string; name: string }>; tags: Record<string, string> }

// ---------- API ----------

async function el(p: string, init?: RequestInit): Promise<Response> {
  const r = await fetch(`https://api.elevenlabs.io${p}`, { ...init, headers: { 'xi-api-key': EL!, 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`ElevenLabs ${p.split('?')[0]} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r;
}
const credits = async () => ((await (await el('/v1/user/subscription')).json()) as { character_count: number; character_limit: number });

async function chatJson<T>(system: string, user: string): Promise<T> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${OA}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: CHAT, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = (await r.json()) as { choices?: { message: { content: string } }[]; error?: { message: string } };
  if (!r.ok) throw new Error(`OpenAI: ${j.error?.message}`);
  return JSON.parse(j.choices![0]!.message.content) as T;
}

/** İstanbul aksanlı (Türk) paylaşılan sesler. */
async function pool(): Promise<PoolVoice[]> {
  const out: PoolVoice[] = [];
  for (const gender of ['male', 'female']) {
    for (const age of ['young', 'middle_aged', 'old']) {
      const q = new URLSearchParams({ language: 'tr', gender, age, page_size: '100', sort: 'usage_character_count_1y' });
      const j = (await (await el(`/v1/shared-voices?${q}`)).json()) as { voices: PoolVoice[] };
      out.push(...j.voices.filter((v) => v.accent === 'istanbul'));
    }
  }
  return out;
}

// ---------- Oyuncu seçimi ----------

interface Speaker { key: string; label: string; voice: Voice; sample: string }

function speakers(c: CaseFile): Speaker[] {
  const map = new Map<string, Speaker>();
  for (const e of c.evidence) {
    if (e.doc.kind !== 'audio') continue;
    for (const l of e.doc.lines) {
      const ch = l.character ? c.characters.find((x) => x.id === l.character) : undefined;
      const key = ch ? ch.id : `#${l.name}`;
      const voice = l.voice ?? ch?.voice;
      if (!voice || map.has(key)) continue;
      map.set(key, { key, label: ch ? `${ch.name} (${ch.role}${ch.age ? `, ${ch.age} yaş` : ''})` : (l.name ?? key), voice, sample: l.text.slice(0, 160) });
    }
  }
  // Sorgularda sesli kilit cevabı olan karakterler
  for (const iv of c.interviews) {
    const voiced = [...iv.questions, ...iv.confront].find((o) => o.voiced);
    const ch = c.characters.find((x) => x.id === iv.character);
    if (!voiced || !ch?.voice || map.has(ch.id)) continue;
    map.set(ch.id, { key: ch.id, label: `${ch.name} (${ch.role}${ch.age ? `, ${ch.age} yaş` : ''})`, voice: ch.voice, sample: voiced.answer.slice(0, 160) });
  }
  return [...map.values()];
}

async function castVoices(c: CaseFile, prev: Cast | null): Promise<Cast> {
  const cast: Cast = prev ?? { voices: {}, tags: {} };
  const need = speakers(c).filter((s) => !cast.voices[s.key]);
  const narrator = c.meta.narrator ?? { gender: 'male', age: 'adult' };
  const voices = await pool();
  if (!cast.voices['@narrator']) {
    // Dizinin tek anlatıcısı: kullanıcının onayladığı ses (vakadaki tarif yalnızca yedek).
    const v = voices.find((x) => x.name.trim() === NARRATOR_PREF.male) ?? voices.find((x) => x.name.trim() === NARRATOR_PREF[narrator.gender])!;
    cast.voices['@narrator'] = { voice_id: v.voice_id, name: v.name };
  }
  if (need.length) {
    const taken = new Set(Object.values(cast.voices).map((v) => v.voice_id));
    const candidates = voices.filter((v) => !taken.has(v.voice_id) && !/cute|childish|kid/i.test(`${v.descriptive} ${v.name}`)).map((v) => ({ id: v.voice_id, name: v.name, gender: v.gender, age: v.age, use_case: v.use_case, tone: v.descriptive }));
    const res = await chatJson<{ cast: Record<string, string> }>(
      'You are a casting director for a Turkish crime drama audio production. Pick one voice for each speaker from the candidate list. ' +
        'Match gender strictly. Age mapping: speaker young → candidate young; adult → middle_aged (young only if nothing fits); old → old, else the most mature-sounding middle_aged. Never give a young/cheerful voice to an old speaker. ' +
        'Match the speaking style. Prefer conversational/narrative_story voices over advertisement/social_media for realism. Every speaker must get a different voice. ' +
        'Answer as JSON: {"cast": {"<speaker key>": "<candidate id>"}}.',
      JSON.stringify({ speakers: need.map((s) => ({ key: s.key, who: s.label, gender: s.voice.gender, age: s.voice.age, style: s.voice.style ?? '', sample_line: s.sample })), candidates }),
    );
    const used = new Set(taken);
    for (const s of need) {
      let id = res.cast[s.key];
      const ok = (x: PoolVoice) => x.gender === s.voice.gender && !used.has(x.voice_id) && AGES[s.voice.age].includes(x.age);
      let v = voices.find((x) => x.voice_id === id && ok(x));
      if (!v) v = voices.find(ok); // model yanlış/tekrar seçtiyse ilk uygun ses
      if (!v) throw new Error(`Ses kalmadı: ${s.key}`);
      id = v.voice_id;
      used.add(id);
      cast.voices[s.key] = { voice_id: id, name: v.name };
    }
  }
  // Söyleyiş yönergeleri → İngilizce v3 etiketleri
  const deliveries = [
    ...new Set([
      ...c.evidence.flatMap((e) => (e.doc.kind === 'audio' ? e.doc.lines.map((l) => l.delivery) : [])),
      ...c.interviews.flatMap((iv) => [...iv.questions, ...iv.confront].filter((o) => o.voiced).map((o) => o.delivery)),
    ]),
  ].filter((d): d is string => !!d && !cast.tags[d]);
  if (deliveries.length) {
    const res = await chatJson<{ tags: Record<string, string> }>(
      'Translate Turkish acting directions into short English audio tags for ElevenLabs v3 (2-5 lowercase words, comma separated, e.g. "whispering, nervous", "out of breath, panicked", "angry, fast"). ' +
        'Describe only voice and emotion, never actions or sounds. Answer as JSON: {"tags": {"<turkish>": "<english>"}}.',
      JSON.stringify(deliveries),
    );
    for (const d of deliveries) cast.tags[d] = (res.tags[d] ?? '').replace(/[[\]]/g, '').trim();
  }
  return cast;
}

// ---------- Ses ----------

const run = (args: string[]) => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

function joinParts(parts: string[], gap: number, out: string) {
  const tmp = path.dirname(parts[0]!);
  const list: string[] = [];
  const sil = path.join(tmp, 'gap.wav');
  run(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(gap), sil]);
  parts.forEach((p, i) => {
    const w = path.join(tmp, `w${i}.wav`);
    run(['-i', p, '-ar', '44100', '-ac', '1', w]);
    if (i > 0) list.push(sil);
    list.push(w);
  });
  fs.writeFileSync(path.join(tmp, 'list.txt'), list.map((f) => `file '${f}'`).join('\n'));
  run(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out]);
}

function finish(src: string, out: string, phone: boolean) {
  if (phone) {
    run([
      '-i', src, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.01:r=24000',
      '-filter_complex', '[0:a]aresample=24000,highpass=f=320,lowpass=f=3300,acompressor=threshold=-18dB:ratio=4,volume=1.4[v];[v][1:a]amix=inputs=2:duration=first:normalize=0[o]',
      '-map', '[o]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', out,
    ]);
  } else {
    run(['-i', src, '-af', 'loudnorm=I=-18:TP=-2', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', out]);
  }
}

/** Satırları toplamı MAX_CHUNK'ı geçmeyecek parçalara böler. */
function chunk<T extends { text: string }>(items: T[]): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  let len = 0;
  for (const it of items) {
    if (cur.length && len + it.text.length > MAX_CHUNK) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(it);
    len += it.text.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

async function dialogue(inputs: { text: string; voice_id: string }[], file: string) {
  // Tek konuşmacılı kayıtlarda da dialogue ucu çalışır; tutarlılık için hep aynı uç.
  const r = await el('/v1/text-to-dialogue?output_format=mp3_44100_128', { method: 'POST', body: JSON.stringify({ model_id: MODEL, language_code: 'tr', inputs }) });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

async function speech(text: string, voiceId: string, file: string) {
  const r = await el(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify({ model_id: MODEL, language_code: 'tr', text }) });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

// ---------- Ana akış ----------

async function main() {
  const args = process.argv.slice(2);
  if (!EL) throw new Error('ELEVENLABS_API_KEY yok (tools/.env.local).');
  if (!OA) throw new Error('OPENAI_API_KEY yok (oyuncu seçimi için).');
  const slug = args.find((a) => !a.startsWith('-'));
  if (!slug) throw new Error('Kullanım: case:voices <slug> [--dry] [--only k1,k2] [--redo] [--recast]');
  const dir = path.join(process.env.CASES_DIR ?? DEFAULT_CASES_DIR, slug);
  const c = readCaseFile(dir);
  const outDir = path.join(dir, 'audio');
  fs.mkdirSync(outDir, { recursive: true });
  const castFile = path.join(outDir, 'cast.json');
  const prev = !args.includes('--recast') && fs.existsSync(castFile) ? (JSON.parse(fs.readFileSync(castFile, 'utf8')) as Cast) : null;
  const cast = await castVoices(c, prev);
  fs.writeFileSync(castFile, JSON.stringify(cast, null, 2));
  console.log(`${slug} oyuncular: ${Object.entries(cast.voices).map(([k, v]) => `${k}=${v.name.split(' - ')[0]}`).join(', ')}`);

  type Job = { key: string; run: (tmp: string) => Promise<string>; phone: boolean; chars: number };
  const jobs: Job[] = [];
  c.acts.forEach((a, i) => {
    const paras = a.scene.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const groups = chunk(paras.map((text) => ({ text })));
    jobs.push({
      key: `act-${i + 1}`,
      phone: false,
      chars: a.scene.length,
      run: async (tmp) => {
        const parts: string[] = [];
        for (const [gi, g] of groups.entries()) {
          const f = path.join(tmp, `n${gi}.mp3`);
          await speech(`${NARRATOR_TAG} ${g.map((x) => x.text).join('\n\n')}`, cast.voices['@narrator']!.voice_id, f);
          parts.push(f);
        }
        const joined = path.join(tmp, 'joined.wav');
        joinParts(parts, 0.8, joined);
        return joined;
      },
    });
  });
  for (const e of c.evidence) {
    const d = e.doc;
    if (d.kind !== 'audio') continue;
    const lines = d.lines.map((l) => {
      const key = l.character ?? `#${l.name}`;
      const tag = l.delivery ? cast.tags[l.delivery] : '';
      const pause = l.pause && l.pause >= 1 ? '... ' : '';
      return { text: `${tag ? `[${tag}] ` : ''}${pause}${spoken(l.text)}`, voice_id: cast.voices[key]?.voice_id ?? cast.voices['@narrator']!.voice_id };
    });
    jobs.push({
      key: e.id,
      phone: PHONE.has(d.variant),
      chars: lines.reduce((s, l) => s + l.text.length, 0),
      run: async (tmp) => {
        const parts: string[] = [];
        for (const [gi, g] of chunk(lines).entries()) {
          const f = path.join(tmp, `d${gi}.mp3`);
          await dialogue(g, f);
          parts.push(f);
        }
        const joined = path.join(tmp, 'joined.wav');
        joinParts(parts, 0.4, joined);
        return joined;
      },
    });
  }

  // Sorgulardaki kilit anlar: karakterin sesiyle tek parça
  for (const iv of c.interviews) {
    const voice = cast.voices[iv.character]?.voice_id;
    const items = [
      ...iv.questions.filter((q) => q.voiced).map((q) => ({ key: interviewAudioKey(iv.id, q.id), text: q.answer, delivery: q.delivery })),
      ...iv.confront.filter((x) => x.voiced).map((x) => ({ key: interviewAudioKey(iv.id, `c-${x.evidence}`), text: x.answer, delivery: x.delivery })),
    ];
    for (const it of items) {
      if (!voice) {
        console.log(`  ${it.key}: atlandı (karakterin sesi yok)`);
        continue;
      }
      const tag = it.delivery ? cast.tags[it.delivery] : '';
      jobs.push({
        key: it.key,
        phone: false,
        chars: it.text.length,
        run: async (tmp) => {
          const f = path.join(tmp, 'iv.mp3');
          await speech(`${tag ? `[${tag}] ` : ''}${spoken(it.text)}`, voice, f);
          return f;
        },
      });
    }
  }

  const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const redo = args.includes('--redo');
  const todo = jobs.filter((j) => (only ? only.includes(j.key) : redo || !fs.existsSync(path.join(outDir, `${j.key}.mp3`))));
  const chars = todo.reduce((s, j) => s + j.chars, 0);
  const before = await credits();
  console.log(`${todo.length} kayıt, ~${chars} karakter · kredi ${before.character_count}/${before.character_limit}`);
  if (args.includes('--dry')) return;
  if (before.character_count + chars > before.character_limit) throw new Error('Bu ayın kredisi yetmiyor.');

  for (const job of todo) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-el-'));
    try {
      const src = await job.run(tmp);
      const out = path.join(outDir, `${job.key}.mp3`);
      finish(src, out, job.phone);
      console.log(`  ${job.key}: tamam (${Math.round(fs.statSync(out).size / 1024)} KB)`);
    } catch (err) {
      console.log(`  ${job.key}: HATA ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  const after = await credits();
  console.log(`Harcanan kredi: ${after.character_count - before.character_count} (toplam ${after.character_count}/${after.character_limit})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
