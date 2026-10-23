import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadKeys } from './env.js';
import { ffmpegBin, ffprobeBin } from './sfx.js';
import { SPEND_FILE, SpendLedger } from './spend.js';

/** gpt-4o-mini-tts is ~$0.015 per minute; one line is a few seconds, so a cent per line is a safe reservation. */
export const TTS_ESTIMATE_USD = 0.01;

export type VoiceLine = { id: string; text: string; voice: string; style: string };

/**
 * One spoken line as mp3 (OpenAI gpt-4o-mini-tts), cached: an existing file is reused and costs nothing.
 * Every paid call goes through the $10 ledger.
 */
export async function speak(line: VoiceLine, outDir: string, ledger = new SpendLedger(SPEND_FILE)): Promise<string> {
  const out = path.join(outDir, `${line.id}.mp3`);
  const raw = path.join(outDir, `${line.id}.raw.mp3`);
  if (!fs.existsSync(raw)) await fetchSpeech(line, raw, ledger);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(raw).mtimeMs) tighten(raw, out);
  return out;
}

/** Reels pace: no lead-in/tail silence, pauses cut to 0,12 s, 12 % faster (pitch kept), loudness -15 LUFS over the music. */
export function tighten(src: string, out: string): void {
  execFileSync(ffmpegBin(), [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
    '-af', 'silenceremove=start_periods=1:start_threshold=-42dB:stop_periods=-1:stop_duration=0.15:stop_silence=0.12:stop_threshold=-42dB,atempo=1.12,loudnorm=I=-15:TP=-1.5:LRA=7,apad=pad_dur=0.08',
    '-ar', '44100', out,
  ]);
}

/** Seconds of audio in a file. */
export function audioSeconds(file: string): number {
  return Number(execFileSync(ffprobeBin(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim());
}

async function fetchSpeech(line: VoiceLine, out: string, ledger: SpendLedger): Promise<void> {
  ledger.assertCanSpend(TTS_ESTIMATE_USD);
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { authorization: `Bearer ${loadKeys().openai}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: line.voice,
      input: line.text,
      instructions: `Türkçe konuş, doğal İstanbul Türkçesi. ${line.style}`,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  ledger.record({ id: `tts-${line.id}`, kind: 'audio', provider: 'openai', usd: TTS_ESTIMATE_USD, state: 'done' });
}
