import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage, OPENAI_IMAGE_ESTIMATE_USD } from './openai-image.js';
import { SPEND_FILE, SpendLedger } from './spend.js';

/** Kurt Adam reel backdrops (gpt-image-2, $10 ledger), generated once into assets/weknows/. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets', 'weknows');

const NIGHT =
  'Cinematic night photograph, vertical frame. A small old Anatolian stone village on a hillside under a huge full moon, thin mist drifting between the houses, only two or three warm windows lit, dark pine forest on the ridge behind, deep indigo sky with a few stars, quiet and ominous, shot on 35mm film, natural grain, no people, no animals, no text, no logos.';
const DAWN =
  'The same village from the same viewpoint at first light just after sunrise: cold blue mist in the valley, pale pink and amber sky, the moon fading, smoke rising from one chimney, damp stone, quiet and uneasy, shot on 35mm film, no people, no text.';

export async function wwImages(): Promise<{ night: string; dawn: string }> {
  const ledger = new SpendLedger(SPEND_FILE);
  fs.mkdirSync(DIR, { recursive: true });
  const night = path.join(DIR, 'ww-night.png');
  const dawn = path.join(DIR, 'ww-dawn.png');
  if (!fs.existsSync(night)) {
    ledger.assertCanSpend(OPENAI_IMAGE_ESTIMATE_USD);
    await generateImage({ prompt: NIGHT, out: night, size: '1024x1536', quality: 'medium' });
    ledger.record({ id: 'ww-night', kind: 'image', provider: 'openai', usd: OPENAI_IMAGE_ESTIMATE_USD, state: 'done' });
  }
  if (!fs.existsSync(dawn)) {
    ledger.assertCanSpend(OPENAI_IMAGE_ESTIMATE_USD);
    await generateImage({ prompt: DAWN, out: dawn, size: '1024x1536', quality: 'medium', refs: [night] });
    ledger.record({ id: 'ww-dawn', kind: 'image', provider: 'openai', usd: OPENAI_IMAGE_ESTIMATE_USD, state: 'done' });
  }
  return { night, dawn };
}



const HALL =
  'Cinematic night photograph, vertical frame. An empty old grand assembly hall: curved rows of dark wooden benches, a raised speaker\'s desk with a single green-shaded lamp lit, tall arched windows with deep blue moonlight, thin haze in the air, dust in the light beams, no people, no flags, no symbols, no text, shot on 35mm film, natural grain, political thriller mood.';

/** Secret Hitler backdrop: an empty assembly hall at night. */
export async function shImages(): Promise<{ hall: string }> {
  const ledger = new SpendLedger(SPEND_FILE);
  fs.mkdirSync(DIR, { recursive: true });
  const hall = path.join(DIR, 'sh-hall.png');
  if (!fs.existsSync(hall)) {
    ledger.assertCanSpend(OPENAI_IMAGE_ESTIMATE_USD);
    await generateImage({ prompt: HALL, out: hall, size: '1024x1536', quality: 'medium' });
    ledger.record({ id: 'sh-hall', kind: 'image', provider: 'openai', usd: OPENAI_IMAGE_ESTIMATE_USD, state: 'done' });
  }
  return { hall };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  wwImages()
    .then(() => shImages())
    .then((r) => console.log(r, `spent $${new SpendLedger(SPEND_FILE).spent().toFixed(3)}`));
}
