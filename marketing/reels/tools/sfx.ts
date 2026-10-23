import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function bin(name: string): string {
  const fallback = `/opt/homebrew/bin/${name}`;
  try {
    execFileSync(name, ['-version'], { stdio: 'ignore' });
    return name;
  } catch {
    return fallback;
  }
}
export const ffmpegBin = () => bin('ffmpeg');
export const ffprobeBin = () => bin('ffprobe');

export type SfxName = 'bip' | 'ding' | 'whoosh' | 'pop' | 'buzz' | 'tick';

const SPECS: Record<SfxName, { src: string; af?: string; t: number }> = {
  bip: { src: 'sine=frequency=1200:duration=0.1', af: 'afade=t=out:st=0.08:d=0.02', t: 0.1 },
  ding: {
    src: "aevalsrc='0.5*sin(2*PI*1760*t)*exp(-6*t)+0.3*sin(2*PI*2640*t)*exp(-6*t)':d=0.6",
    t: 0.6,
  },
  whoosh: {
    src: 'anoisesrc=color=pink:duration=0.4',
    af: "bandpass=f=400:width_type=h:w=300,afade=t=in:d=0.15,afade=t=out:st=0.2:d=0.2,volume=3",
    t: 0.4,
  },
  pop: { src: "aevalsrc='0.8*sin(2*PI*(600*t-4000*t*t))*exp(-30*t)':d=0.05", t: 0.05 },
  buzz: { src: "aevalsrc='0.4*sgn(sin(2*PI*110*t))':d=0.3", af: 'afade=t=out:st=0.27:d=0.03', t: 0.3 },
  tick: { src: "aevalsrc='0.9*sin(2*PI*3000*t)*exp(-300*t)':d=0.02", t: 0.02 },
};

export async function makeSfx(dir: string): Promise<Record<SfxName, string>> {
  fs.mkdirSync(dir, { recursive: true });
  const out = {} as Record<SfxName, string>;
  for (const [name, s] of Object.entries(SPECS) as [SfxName, (typeof SPECS)[SfxName]][]) {
    const file = path.join(dir, `${name}.wav`);
    const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', s.src];
    if (s.af) args.push('-af', s.af);
    args.push('-t', String(s.t), '-ar', '44100', '-ac', '1', file);
    execFileSync(ffmpegBin(), args);
    out[name] = file;
  }
  return out;
}
