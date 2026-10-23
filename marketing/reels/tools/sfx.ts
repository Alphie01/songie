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

export type SfxName = 'bip' | 'ding' | 'whoosh' | 'pop' | 'buzz' | 'tick' | 'type' | 'stamp' | 'shutter' | 'siren' | 'heart' | 'clock' | 'msg';

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
  /** Casebook: typewriter key, rubber stamp thud, camera shutter. */
  type: { src: "aevalsrc='0.7*(random(0)*2-1)*exp(-140*t)+0.4*sin(2*PI*180*t)*exp(-60*t)':d=0.05", af: 'highpass=f=300', t: 0.05 },
  stamp: { src: "aevalsrc='0.9*sin(2*PI*85*t)*exp(-16*t)+0.5*(random(0)*2-1)*exp(-70*t)':d=0.3", af: 'lowpass=f=1800', t: 0.3 },
  shutter: {
    src: "aevalsrc='(random(0)*2-1)*(exp(-160*t)+0.8*gt(t,0.09)*exp(-160*(t-0.09)))':d=0.2",
    af: 'highpass=f=900,volume=0.8',
    t: 0.2,
  },
  /** Two-tone police wail, a heartbeat (lub-dub), a heavy clock tick, a chat message blip. */
  siren: {
    src: "aevalsrc='0.5*sin(2*PI*(700+250*sgn(sin(2*PI*2.5*t)))*t)*min(1,t*8)*min(1,(0.9-t)*6)':d=0.9",
    af: 'lowpass=f=3000',
    t: 0.9,
  },
  heart: {
    src: "aevalsrc='0.95*sin(2*PI*55*t)*exp(-25*t)+0.75*gt(t,0.22)*sin(2*PI*50*(t-0.22))*exp(-25*(t-0.22))':d=0.6",
    af: 'lowpass=f=300,volume=2',
    t: 0.6,
  },
  clock: { src: "aevalsrc='0.9*sin(2*PI*1800*t)*exp(-200*t)+0.5*sin(2*PI*600*t)*exp(-90*t)':d=0.06", t: 0.06 },
  msg: {
    src: "aevalsrc='0.6*sin(2*PI*1320*t)*exp(-18*t)*lt(t,0.09)+0.6*gt(t,0.09)*sin(2*PI*1760*(t-0.09))*exp(-18*(t-0.09))':d=0.3",
    t: 0.3,
  },
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
