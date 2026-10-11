/**
 * Seslendirme servislerini karşılaştırma: aynı diyaloğu ve anlatıyı ElevenLabs (text-to-dialogue,
 * eleven_v3) ve Gemini TTS ile tek parça üretir.
 *   npx tsx tools/voice-sample.ts <çıktı-klasörü> [--list]
 * Anahtarlar: tools/.env.local → ELEVENLABS_API_KEY, GEMINI_API_KEY.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(TOOLS, '.env.local'), 'utf8').split('\n')) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
  if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, '');
}
const EL = process.env.ELEVENLABS_API_KEY;
const GM = process.env.GEMINI_API_KEY;
const ff = createRequire(path.join(TOOLS, '../../../apps/server/package.json'))('ffmpeg-static') as string;

const out = process.argv[2] ?? '.';
fs.mkdirSync(out, { recursive: true });

// --- Örnek içerik ---
const CALL = [
  { who: 'Operatör', gender: 'female', el: '[calm, professional]', text: 'Polis imdat, dinliyorum.' },
  { who: 'Sevim', gender: 'female-old', el: '[panicked, out of breath]', text: "Kızım, Moda Caddesi'ndeki saatçi... Nuri Bey... yerde yatıyor, kıpırdamıyor!" },
  { who: 'Operatör', gender: 'female', el: '[calm]', text: 'Sakin olun hanımefendi. Adresi tam söyleyebilir misiniz? İçeri nasıl girdiniz?' },
  { who: 'Sevim', gender: 'female-old', el: '[shaky, on the verge of tears]', text: 'Yedek anahtarım var, her sabah çay içeriz biz. Arka odanın kapısı kilitliydi... camdan gördüm. Allah’ım, ne olur çabuk gelin.' },
  { who: 'Operatör', gender: 'female', el: '[reassuring]', text: 'Ekiplerimiz yola çıktı. Hiçbir şeye dokunmayın, hatta kalın.' },
];
const NARRATION =
  'Pazar sabahına karşı, saat ikiyi beş geçiyordu. Komiser Ayla Tunç Kandilli’deki yalının bahçe kapısından girdiğinde lodos hâlâ Boğaz’ı dövüyordu. ' +
  'Sofada, ayaküstü kurulmuş bir masada yarısı yenmiş bir doğum günü pastası duruyordu. Yetmiş mumun çoğu devrilmişti. ' +
  'Ambulans doktoru kapıda bekliyordu. “Ailesi kalp diyor,” dedi, “öyküsü de uyuyor. Ama gözlerine bakın. O kanamalar kalpten olmaz.”';

const run = (args: string[]) => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const phone = (src: string, dst: string) =>
  run(['-i', src, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.01:r=24000', '-filter_complex',
    '[0:a]aresample=24000,highpass=f=320,lowpass=f=3300,acompressor=threshold=-18dB:ratio=4,volume=1.4[v];[v][1:a]amix=inputs=2:duration=first:normalize=0[o]',
    '-map', '[o]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', dst]);
const clean = (src: string, dst: string) => run(['-i', src, '-af', 'loudnorm=I=-18:TP=-2', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', dst]);

// --- ElevenLabs ---
async function el<T>(p: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`https://api.elevenlabs.io${p}`, { ...init, headers: { 'xi-api-key': EL!, 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`ElevenLabs ${p} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (r.headers.get('content-type')?.includes('json') ? r.json() : r.arrayBuffer()) as Promise<T>;
}
interface SharedVoice { voice_id: string; public_owner_id: string; name: string; gender: string; age: string; accent: string; language: string; use_case: string; descriptive: string }

/** Türkçe ana dilli paylaşılan seslerden uygun olanı hesaba ekler. */
async function turkishVoice(want: { gender: 'male' | 'female'; age?: string; useCase?: string; prefer?: string }, taken: Set<string>): Promise<{ id: string; name: string }> {
  const q = new URLSearchParams({ language: 'tr', gender: want.gender, page_size: '60', sort: 'usage_character_count_1y' });
  if (want.prefer) q.set('search', want.prefer);
  if (want.age) q.set('age', want.age);
  if (want.useCase) q.set('use_cases', want.useCase);
  let res = await el<{ voices: SharedVoice[] }>(`/v1/shared-voices?${q}`);
  if (!res.voices.length && want.age) {
    q.delete('age');
    res = await el<{ voices: SharedVoice[] }>(`/v1/shared-voices?${q}`);
  }
  // "tr" filtresi Türkçe konuşabilen yabancı sesleri de getiriyor: İstanbul aksanlıyı ve tercih edilen adı öne al.
  const ok = res.voices.filter((x) => !taken.has(x.voice_id));
  const v = ok.find((x) => want.prefer && x.name.startsWith(want.prefer) && x.accent === 'istanbul') ?? ok.find((x) => x.accent === 'istanbul') ?? ok[0];
  if (!v) throw new Error(`Türkçe ses bulunamadı: ${JSON.stringify(want)}`);
  taken.add(v.voice_id);
  const mine = await el<{ voices: { voice_id: string }[] }>('/v1/voices');
  if (!mine.voices.some((x) => x.voice_id === v.voice_id)) {
    await el(`/v1/voices/add/${v.public_owner_id}/${v.voice_id}`, { method: 'POST', body: JSON.stringify({ new_name: `tr-${v.name}`.slice(0, 40) }) });
  }
  return { id: v.voice_id, name: `${v.name} (${v.gender}, ${v.age}, ${v.accent})` };
}

async function elevenlabs() {
  const taken = new Set<string>();
  const operator = await turkishVoice({ gender: 'female', prefer: 'Mine' }, taken);
  const sevim = await turkishVoice({ gender: 'female', prefer: 'Sultan - Theatrical' }, taken);
  const narrator = await turkishVoice({ gender: 'male', prefer: 'Adam' }, taken);
  console.log('ElevenLabs sesleri:', operator.name, '|', sevim.name, '|', narrator.name);
  const call = await el<ArrayBuffer>('/v1/text-to-dialogue?output_format=mp3_44100_128', {
    method: 'POST',
    body: JSON.stringify({
      model_id: process.env.EL_MODEL ?? 'eleven_v3',
      language_code: 'tr',
      inputs: CALL.map((l) => ({ text: `${l.el} ${l.text}`, voice_id: l.who === 'Operatör' ? operator.id : sevim.id })),
    }),
  });
  fs.writeFileSync(path.join(out, 'el-call-raw.mp3'), Buffer.from(call));
  phone(path.join(out, 'el-call-raw.mp3'), path.join(out, 'el-call.mp3'));
  const nar = await el<ArrayBuffer>(`/v1/text-to-speech/${narrator.id}?output_format=mp3_44100_128`, {
    method: 'POST',
    body: JSON.stringify({ model_id: process.env.EL_MODEL ?? 'eleven_v3', language_code: 'tr', text: `[serious, slow, low voice] ${NARRATION}` }),
  });
  fs.writeFileSync(path.join(out, 'el-narration-raw.mp3'), Buffer.from(nar));
  clean(path.join(out, 'el-narration-raw.mp3'), path.join(out, 'el-narration.mp3'));
}

// --- Gemini ---
async function geminiModel(): Promise<string> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GM}&pageSize=200`);
  const j = (await r.json()) as { models?: { name: string }[]; error?: { message: string } };
  if (!r.ok) throw new Error(`Gemini models: ${j.error?.message}`);
  const tts = (j.models ?? []).map((m) => m.name.replace('models/', '')).filter((n) => /tts/.test(n));
  console.log('Gemini TTS modelleri:', tts.join(', '));
  const pick = process.env.GEMINI_TTS_MODEL ?? ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'].find((m) => tts.includes(m))!;
  console.log('Kullanılan:', pick);
  return pick;
}

async function gemini(model: string, prompt: string | { system: string; lines: { speaker: string; text: string }[] }, speech: unknown, outFile: string) {
  const body =
    typeof prompt === 'string'
      ? { contents: [{ parts: [{ text: prompt }] }] }
      : {
          contents: [{ parts: prompt.lines.map((l) => ({ text: l.text, speechMetadata: { speaker: l.speaker } })) }],
        };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GM}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, generationConfig: { responseModalities: ['AUDIO'], speechConfig: speech } }),
  });
  const j = (await r.json()) as { candidates?: { content: { parts: { inlineData?: { data: string } }[] } }[]; error?: { message: string } };
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${j.error?.message}`);
  const data = j.candidates?.[0]?.content.parts.find((p) => p.inlineData)?.inlineData?.data;
  if (!data) throw new Error('Gemini ses döndürmedi');
  const pcm = `${outFile}.pcm`;
  fs.writeFileSync(pcm, Buffer.from(data, 'base64'));
  return pcm;
}

async function geminiAll() {
  const model = await geminiModel();
  const dialogue = {
    system:
      'Bu gerçek bir 155 Polis İmdat çağrı kaydıdır. Türkçe, doğal ve gerçekçi seslendir; iki kişi gerçekten birbiriyle konuşuyor, birbirine tepki veriyor. ' +
      'Operatör sakin ve profesyonel, orta yaşlı bir kadın. Sevim altmışlarında, İstanbullu, panik içinde, nefes nefese, ağlamaklı bir kadın.',
    lines: CALL.map((l) => ({ speaker: l.who, text: `${l.el} ${l.text}` })),
  };
  const legacy = !model.startsWith('gemini-3.8');
  const prompt1 = legacy ? `${dialogue.system}\n\n${CALL.map((l) => `${l.who}: ${l.el} ${l.text}`).join('\n')}` : dialogue;
  const pcm1 = await gemini(model, prompt1, {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [
        { speaker: 'Operatör', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        { speaker: 'Sevim', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Sulafat' } } },
      ],
    },
  }, path.join(out, 'gm-call'));
  const wav1 = path.join(out, 'gm-call.wav');
  run(['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', pcm1, wav1]);
  phone(wav1, path.join(out, 'gm-call.mp3'));
  const pcm2 = await gemini(model,
    '[serious, slow, deep voice, tense, like a crime drama narrator] ' + NARRATION,
    { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }, path.join(out, 'gm-narration'));
  const wav2 = path.join(out, 'gm-narration.wav');
  run(['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', pcm2, wav2]);
  clean(wav2, path.join(out, 'gm-narration.mp3'));
}

const jobs: Promise<void>[] = [];
if (EL) jobs.push(elevenlabs().catch((e) => console.log('ElevenLabs HATA:', e.message)));
else console.log('ELEVENLABS_API_KEY yok');
if (GM && !process.argv.includes('--eleven')) jobs.push(geminiAll().catch((e) => console.log('Gemini HATA:', e.message)));
else console.log('GEMINI_API_KEY yok');
await Promise.all(jobs);
for (const f of fs.readdirSync(out).filter((f) => /\.(mp3)$/.test(f) && !f.includes('raw'))) console.log('  ', f, Math.round(fs.statSync(path.join(out, f)).size / 1024), 'KB');
