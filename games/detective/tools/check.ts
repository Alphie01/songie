/** Vaka denetimi: pnpm --filter @songie/detective case:check [slug…] (slug yoksa hepsi). */
import fs from 'node:fs';
import path from 'node:path';
import { ZodError } from 'zod';
import { DEFAULT_CASES_DIR, readCaseFile } from '../server/library.js';
import { checkCase } from '../server/validate.js';

const slugs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = slugs.length
  ? slugs
  : fs.readdirSync(DEFAULT_CASES_DIR).filter((n) => fs.existsSync(path.join(DEFAULT_CASES_DIR, n, 'case.json')));

let failed = false;
for (const slug of targets) {
  const dir = path.join(DEFAULT_CASES_DIR, slug);
  console.log(`\n=== ${slug} ===`);
  let data;
  try {
    data = readCaseFile(dir);
  } catch (err) {
    failed = true;
    if (err instanceof ZodError) {
      for (const i of err.issues.slice(0, 40)) console.log(`ŞEMA  ${i.path.join('.')}: ${i.message}`);
      if (err.issues.length > 40) console.log(`… ${err.issues.length - 40} şema hatası daha`);
    } else console.log(`OKUNAMADI  ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  const report = checkCase(data, (key) => fs.existsSync(path.join(dir, 'img', `${key}.webp`)));
  for (const e of report.errors) console.log(`HATA  ${e}`);
  for (const w of report.warnings) console.log(`UYARI ${w}`);
  console.log(Object.entries(report.stats).map(([k, v]) => `${k}: ${v}`).join(' · '));
  if (report.errors.length) failed = true;
  else console.log('Tamam.');
}
process.exit(failed ? 1 : 0);
