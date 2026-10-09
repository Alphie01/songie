// Tabu uçtan uca: 4 oyuncu, kartın kimlere göründüğü. node e2e/taboo.mjs [base] [çıktı]
import { chromium, devices } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4310';
const out = process.argv[3] ?? 'screenshots';

// Tanıtım pencereleri bu testte konu dışı: hepsini görülmüş say.
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
async function page(nick, opts) {
  const ctx = await browser.newContext({ ...opts, locale: 'tr-TR' });
  await ctx.addInitScript(skipGuides);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGE ERROR', nick, e.message));
  p.on('dialog', (d) => d.accept());
  return p;
}
async function signup(p, nick, url) {
  await p.goto(url);
  await p.getByLabel('Takma ad').fill(nick);
  await p.getByRole('button', { name: 'Devam et' }).click();
}

const A = await page('Ayşe', devices['iPhone 13']);
const B = await page('Barış', devices['iPhone 13']);
const C = await page('Cem', { viewport: { width: 1440, height: 900 } });
const D = await page('Deniz', devices['Pixel 7']);

await signup(A, 'Ayşe', base);
await A.locator('.home-game', { hasText: 'Tabu' }).getByRole('button', { name: 'Oda kur' }).click();
await A.waitForURL(/\/r\/[A-Z]{4}$/);
const url = A.url();
for (const [p, n] of [[B, 'Barış'], [C, 'Cem'], [D, 'Deniz']]) await signup(p, n, url);
await A.locator('.tb-player').filter({ hasText: 'Deniz' }).waitFor();

// Takımlar: Ayşe + Barış yeşil, Cem + Deniz mor (dokunma: takımsız → yeşil → mor).
const chip = (n) => A.locator('.tb-player').filter({ hasText: n }).first();
await chip('Ayşe').click();
await A.waitForTimeout(250);
await chip('Barış').click();
await A.waitForTimeout(250);
for (const n of ['Cem', 'Deniz']) {
  await chip(n).click();
  await A.waitForTimeout(250);
  await chip(n).click();
  await A.waitForTimeout(250);
}
await A.locator('.tb-teambox[data-team="b"] .tb-player').filter({ hasText: 'Deniz' }).waitFor();
await shot(A, 't01-lobby-host-mobile', true);
await shot(C, 't02-lobby-desktop');

await A.getByRole('button', { name: 'Oyunu başlat' }).click();
await A.getByRole('button', { name: 'Anlatmaya başla' }).waitFor({ timeout: 10000 });
await shot(A, 't03-ready-narrator-mobile', true);
await A.getByRole('button', { name: 'Anlatmaya başla' }).click();

await A.locator('.tb-card').waitFor();
await C.locator('.tb-card').waitFor();
await D.locator('.tb-card').waitFor();
await B.locator('.tb-guess').waitFor();
const word = await A.locator('.tb-word').innerText();
check((await C.locator('.tb-word').innerText()) === word && (await D.locator('.tb-word').innerText()) === word, `rakip takım aynı kartı görüyor: ${word}`);
check((await C.locator('.tb-taboo li').count()) === 5, 'rakip takım 5 yasaklı kelimeyi birlikte görüyor');
check((await B.locator('.tb-card').count()) === 0 && !(await B.content()).includes(word), 'anlatıcının takım arkadaşı kartı görmüyor');
check((await B.getByRole('button', { name: 'Tabu!' }).count()) === 0, 'takım arkadaşında Tabu butonu yok');
await shot(A, 't04-narrator-mobile', true);
await shot(B, 't05-guesser-mobile', true);
await shot(C, 't06-watcher-desktop');

await A.getByRole('button', { name: 'Doğru' }).click();
await C.locator('.tb-score[data-team="a"] .tb-score-pts', { hasText: '1' }).waitFor();
check(true, 'doğru: yeşil takım 1 puan');
await C.getByRole('button', { name: 'Tabu!' }).click();
await A.locator('.tb-flash[data-kind="taboo"]').waitFor();
await shot(A, 't07-taboo-flash-mobile');
await A.locator('.tb-score[data-team="a"] .tb-score-pts', { hasText: '0' }).waitFor();
check(true, 'tabu: anlatıcıda uyarı göründü, puan 1 düştü');

await A.getByRole('button', { name: 'Oyunu bitir' }).click();
await A.locator('.podium').waitFor({ timeout: 10000 });
await shot(A, 't08-podium-mobile', true);
await A.getByRole('button', { name: 'Oyunu başlat' }).waitFor({ timeout: 15000 });
check(true, 'oyun bitti, lobiye dönüldü');
console.log('ok');
await browser.close();
