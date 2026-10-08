import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { STAGE_CLIPS } from '../shared/index.js';
import { cutClips, wavPeak } from './media.js';

const ffmpeg = ffmpegStatic as unknown as string;
let tmp: string;
let src: string;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'songie-media-'));
  src = path.join(tmp, 'tone.mp3');
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=30', src]);
});

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('cutClips', () => {
  // Önizlemenin başından ve ortasından alınan kliplerin hepsi duyulabilir olmalı.
  for (const offset of [0, 7.5, 12.25]) {
    it(`produces audible clips of the right length at offset ${offset}s`, async () => {
      const dir = path.join(tmp, `o${offset}`);
      fs.mkdirSync(dir);
      await cutClips(ffmpeg, src, dir, offset);
      STAGE_CLIPS.forEach((dur, i) => {
        const buf = fs.readFileSync(path.join(dir, `${i}.wav`));
        // mono 24 kHz 16 bit = saniyede 48000 bayt
        expect((buf.length - 44) / 48000).toBeCloseTo(dur, 1);
        expect(wavPeak(buf), `stage ${i} is silent`).toBeGreaterThan(0.2);
      });
    });
  }
});
