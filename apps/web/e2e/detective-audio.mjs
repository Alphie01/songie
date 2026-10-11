// Dedektif anlatıcısı: tam süre okunuyor mu, sahne kapanınca anlatı sürüyor mu. node e2e/detective-audio.mjs [base] [çıktı]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4310';
const out = process.argv[3] ?? 'screenshots';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
await ctx.addInitScript(() => {
  const get = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    return /^songie\.(tour|guide)\./.test(k) ? '1' : get.call(this, k);
  };
});
const p = await ctx.newPage();
const check = (c, m) => {
  if (!c) throw new Error('KONTROL BAŞARISIZ: ' + m);
  console.log('✓', m);
};
await p.goto(base);
await p.getByLabel('Takma ad').fill('Dinleyici');
await p.getByRole('button', { name: 'Devam et' }).click();
await p.locator('.home-game', { hasText: 'Dedektif' }).getByRole('button', { name: 'Oda kur' }).click();
await p.locator('.dt-case').filter({ hasText: 'Yalıda' }).click();
await p.getByRole('button', { name: 'Oyunu başlat' }).click();
await p.getByRole('button', { name: 'Anlatıcıyı dinle' }).click();
await p.waitForTimeout(4000);
const t1 = await p.locator('.dt-scene .dt-audio-time').textContent();
console.log('sahnede:', t1);
check(/\/ 1:2\d/.test(t1 ?? ''), `süre tam görünüyor (${t1})`);
await p.getByRole('button', { name: 'Okudum, devam' }).click();
await p.locator('.dt-narration-pill').waitFor();
const a = await p.locator('.dt-narration-pill .dt-audio-time').textContent();
await p.waitForTimeout(3000);
const b = await p.locator('.dt-narration-pill .dt-audio-time').textContent();
console.log('masada:', a, '→', b);
check(a !== b, 'sahne kapandıktan sonra anlatı sürüyor');
await p.screenshot({ path: `${out}/da-pill.png` });
await p.getByRole('button', { name: 'Durdur' }).click();
await p.waitForTimeout(500);
check(!(await p.locator('.dt-narration-pill').isVisible()), 'Durdur anlatıyı kapatıyor');
await browser.close();
console.log('TAMAM');
