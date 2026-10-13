// Dedektif Masası uçtan uca: 3 oyuncu, iz önerme/oylama, belge görüntüleme, bölüm geçişi, suçlama, sonuç.
// node e2e/detective.mjs [base] [çıktı] [vaka-slug]
import { chromium, devices } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4310';
const out = process.argv[3] ?? 'screenshots';
const slug = process.argv[4] ?? 'pera-gecesi';

const skipGuides = () => {
  const get = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    return /^songie\.(tour|guide)\./.test(k) ? '1' : get.call(this, k);
  };
};

const browser = await chromium.launch();
const shot = (p, n, full = false) => p.screenshot({ path: `${out}/${n}.png`, fullPage: full });
function check(cond, msg) {
  if (!cond) throw new Error('KONTROL BAŞARISIZ: ' + msg);
  console.log('✓', msg);
}
const errors = [];
async function page(nick, opts) {
  const ctx = await browser.newContext({ ...opts, locale: 'tr-TR' });
  await ctx.addInitScript(skipGuides);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => {
    errors.push(`${nick}: ${e.message}`);
    console.log('PAGE ERROR', nick, e.message);
  });
  return p;
}
async function signup(p, nick, url) {
  await p.goto(url);
  await p.getByLabel('Takma ad').fill(nick);
  await p.getByRole('button', { name: 'Devam et' }).click();
}
const noHScroll = async (p, label) => {
  const [sw, w] = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(sw <= w + 1, `${label}: yatay kayma yok (${sw} ≤ ${w})`);
};

const A = await page('Ayşe', { viewport: { width: 1440, height: 900 } });
const B = await page('Barış', devices['iPhone 13']);
const C = await page('Cem', { viewport: { width: 1440, height: 900 } });

await signup(A, 'Ayşe', base);
await A.locator('.home-tile', { hasText: 'Dedektif' }).getByRole('button', { name: 'Oda kur' }).click();
await A.waitForURL(/\/r\/[A-Z]{4}$/);
const url = A.url();
await A.locator('.dt-case').first().waitFor();
await shot(A, 'd01-lobby-desktop', true);
const caseTitle = await A.locator('.dt-case', { has: A.locator('.dt-case-title') }).evaluateAll(
  (els, s) => els.map((e) => e.textContent),
  slug,
);
await A.locator('.dt-case').filter({ hasText: slug === 'pera-gecesi' ? 'Pera Gecesi' : 'Yalıda' }).click();
for (const [p, n] of [[B, 'Barış'], [C, 'Cem']]) await signup(p, n, url);
await A.getByText('Cem').first().waitFor();
await shot(B, 'd02-lobby-mobile', true);
await A.getByRole('button', { name: 'Oyunu başlat' }).click();

// Bölüm 1 sahnesi
for (const p of [A, B, C]) await p.getByRole('button', { name: 'Okudum, devam' }).waitFor();
await shot(A, 'd03-scene-desktop');
await shot(B, 'd04-scene-mobile', true);
await B.getByRole('button', { name: 'Okudum, devam' }).click();
await C.getByRole('button', { name: 'Okudum, devam' }).click();
await A.getByRole('button', { name: 'Okudum, devam' }).click();
await A.locator('.dt-lead').first().waitFor();
await shot(A, 'd05-desk-desktop');
await noHScroll(A, 'masa 1440');
await noHScroll(B, 'masa 390');

// Belgeler: ilk birkaçını aç
const files = A.locator('.dt-file');
const n = await files.count();
check(n >= 3, `bölüm başında ${n} belge`);
for (let i = 0; i < Math.min(n, 6); i++) {
  await files.nth(i).click();
  await A.waitForTimeout(600);
  await shot(A, `d06-doc-${i}`);
}

// Barış (mobil) bir iz önerir, Cem oy verir
await B.getByRole('button', { name: 'İzler' }).click();
await B.getByRole('button', { name: 'Bu izi öner' }).first().click();
await C.getByRole('button', { name: 'Evet' }).click();
await A.waitForTimeout(800);
await shot(B, 'd07-leads-mobile', true);
check((await A.locator('.dt-file').count()) > n, 'oylanan iz yeni belge getirdi');

// Ortak not defteri
await C.locator('textarea').first().fill('Kamera kablosu 23:50 civarı çıkarılmış olabilir.');
await C.waitForTimeout(1500);
check((await A.locator('textarea').first().inputValue()).includes('Kamera kablosu'), 'not defteri herkese yansıdı');

// Oda sahibi 2. bölüme kadar iz açar
for (let i = 0; i < 20; i++) {
  if (await A.getByRole('button', { name: 'Okudum, devam' }).isVisible().catch(() => false)) break;
  const btn = A.getByRole('button', { name: 'Oylamadan aç' }).first();
  if (!(await btn.isVisible().catch(() => false))) break;
  await btn.click();
  await A.waitForTimeout(500);
}
await A.getByRole('button', { name: 'Okudum, devam' }).waitFor();
await shot(A, 'd08-act2-scene');
await A.getByRole('button', { name: 'Okudum, devam' }).click();
await A.locator('.dt-lead, .dt-file').first().waitFor();

// Ses kaydı varsa görüntüle
const audioFile = A.locator('.dt-file').filter({ has: A.locator('[data-kind="audio"]') }).first();
if (await audioFile.count()) {
  await audioFile.click();
  await A.waitForTimeout(600);
  await shot(A, 'd09-audio-doc');
}

// Dosyayı kapat (oda sahibi)
await A.getByRole('button', { name: 'Dosyayı kapat' }).first().click();
const yes = A.getByRole('button', { name: 'Evet, kapat' });
if (await yes.isVisible().catch(() => false)) await yes.click();
for (const p of [A, B, C]) await p.locator('.dt-q').first().waitFor();
await shot(B, 'd10-accuse-mobile', true);

for (const p of [A, B, C]) {
  const qs = p.locator('.dt-q');
  const qn = await qs.count();
  for (let i = 0; i < qn; i++) await qs.nth(i).locator('.dt-q-opt').first().click();
  await p.getByRole('button', { name: 'Formu gönder' }).click();
}
await A.getByRole('button', { name: 'Ekip cevabını teslim et' }).waitFor();
await shot(A, 'd11-reconcile', true);
await A.getByRole('button', { name: 'Ekip cevabını teslim et' }).click();
await A.waitForTimeout(2500);
await shot(A, 'd12-after-submit', true);
await A.getByText('Dosya kapandı').first().waitFor();
await A.waitForTimeout(800);
await shot(A, 'd12-result-desktop', true);
await shot(B, 'd13-result-mobile', true);
await noHScroll(B, 'sonuç 390');

check(errors.length === 0, `sayfa hatası yok${errors.length ? ': ' + errors.join(' | ') : ''}`);
void caseTitle;
await browser.close();
console.log('TAMAM');
