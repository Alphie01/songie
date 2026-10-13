// Tüm oyunlar için duman testi: 5 oyuncu oda kurar, katılır, başlatır; lobi ve oyun ekran görüntüleri.
// node e2e/smoke.mjs [base] [çıktı] [oyun adı süzgeci]
import { chromium, devices } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4310';
const out = process.argv[3] ?? 'screenshots';
const only = process.argv[4];
const GAMES = [
  ['Ben Hiç', 5],
  ['Şişe Çevirmece', 5],
  ['Aramızdaki En', 5],
  ['Secret Hitler', 5],
  ['Sessiz Sinema', 4],
  ['Gizlilik Esas', 5],
  ['Gizli İtiraflar', 5],
  ['Bomba Kedi', 4],
  ['Red Flag / Green Flag', 5],
  ['5 Saniye', 5],
  ['Kimim Ben?', 5],
  ['Frekans', 4],
  ['Ajanlar', 4],
  ['Tabu', 4],
  ['Renk Renk', 4],
  ['Entrika', 4],
  ['Kurt Adam', 5],
].filter(([n]) => !only || n === only);


// İlk girişte açılan tanıtım pencerelerini kapat (test akışını engellemesin).
async function closeDialogs(p) {
  for (let i = 0; i < 3; i++) {
    const d = p.locator('.dlg');
    if (!(await d.count())) return;
    await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
  }
}

const browser = await chromium.launch();
// Yatay taşma: sayfa ekrandan geniş olmamalı.
const overflows = [];
async function checkOverflow(p, label) {
  // Kök ve gövde taşmayı keser (clip); kırpılan öğeleri bul.
  const out = await p.evaluate(() => {
    const W = window.innerWidth;
    const bad = [];
    // Kendi içinde kayan (yatay şerit) ya da kırpan kapların içi sayılmaz.
    const contained = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const o = getComputedStyle(a).overflowX;
        if (o !== 'visible') return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      if (contained(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > W + 2 || r.left < -2) && getComputedStyle(el).position !== 'fixed') {
        if (![...bad].some((b) => b.contains(el))) bad.push(el);
      }
    }
    return bad.slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} [${Math.round(el.getBoundingClientRect().left)}…${Math.round(el.getBoundingClientRect().right)}]`);
  });
  if (out.length) overflows.push(`${label}: ${out.join(', ')}`);
}
const errors = [];
const names = ['Ayşe', 'Barış', 'Cem', 'Deniz', 'Ece'];
const views = [devices['iPhone 13'], { viewport: { width: 1440, height: 900 } }, devices['Pixel 7'], { viewport: { width: 1024, height: 768 } }, devices['iPhone 13']];
const pages = [];
for (let i = 0; i < 5; i++) {
  const p = await (await browser.newContext({ ...views[i], locale: 'tr-TR' })).newPage();
  p.on('pageerror', (e) => errors.push(`${names[i]}: ${e.message}`));
  p.on('dialog', (d) => d.accept());
  await p.goto(base);
  await p.getByLabel('Takma ad').fill(names[i]);
  await p.getByRole('button', { name: 'Devam et' }).click();
  // İlk girişte platform turu açılmalı.
  await p.locator('.dlg').waitFor({ timeout: 8000 });
  if (i === 0) {
    await p.screenshot({ path: `${out}/0-tour-1.png` });
    await p.getByRole('button', { name: 'Oyunlara bak' }).click();
    await p.screenshot({ path: `${out}/0-tour-2.png`, fullPage: false });
  }
  await closeDialogs(p);
  await p.locator('.home-tile').first().waitFor();
  pages.push(p);
}
const slug = (s) => s.toLocaleLowerCase('tr').replace(/[^a-z0-9ğüşıöç]+/g, '-');
const results = [];
for (const [name, count] of GAMES) {
  const before = errors.length;
  const [A, ...rest] = pages;
  try {
    await A.goto(base);
    await A.locator('.home-tile').filter({ has: A.locator('.home-tile-name', { hasText: new RegExp(`^${name.replace(/[?/]/g, '\\$&')}$`) }) }).getByRole('button', { name: 'Oda kur' }).click();
    await A.waitForURL(/\/r\/[A-Z]{4}$/, { timeout: 10000 });
    const url = A.url();
    // Oyuna ilk girişte rehber açılmalı.
    const guide = await A.locator('.dlg').waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
    if (guide) {
      await A.screenshot({ path: `${out}/${slug(name)}-0-guide-1.png` });
      await A.getByRole('button', { name: 'İleri' }).click().catch(() => {});
      await A.screenshot({ path: `${out}/${slug(name)}-0-guide-2.png` });
    }
    await closeDialogs(A);
    for (const p of rest.slice(0, count - 1)) {
      await p.goto(url);
      await p.locator('.dlg').waitFor({ timeout: 4000 }).catch(() => {});
      await closeDialogs(p);
    }
    await A.waitForFunction((n) => document.querySelectorAll('.lobby-player').length >= n, count, { timeout: 10000 }).catch(() => {});
    await A.waitForTimeout(800);
    await A.screenshot({ path: `${out}/${slug(name)}-1-lobby-mobile.png`, fullPage: true });
    await checkOverflow(A, `${name} lobi`);
    await rest[0].screenshot({ path: `${out}/${slug(name)}-2-lobby-desktop.png` });
    await A.getByRole('button', { name: 'Oyunu başlat' }).click();
    await A.waitForTimeout(3000);
    const startErr = await A.locator('.lobby-cta .error-text').textContent({ timeout: 300 }).catch(() => null);
    await A.screenshot({ path: `${out}/${slug(name)}-3-game-mobile.png`, fullPage: true });
    await checkOverflow(A, `${name} oyun`);
    await checkOverflow(rest[1], `${name} oyun (Android)`);
    await rest[0].screenshot({ path: `${out}/${slug(name)}-4-game-desktop.png` });
    await rest[1].screenshot({ path: `${out}/${slug(name)}-5-game-other.png`, fullPage: true });
    const playing = (await A.locator('.lobby-cta').count()) === 0;
    results.push(`${playing ? 'ok ' : 'NO '} ${guide ? 'rehber ✓' : 'REHBER YOK'} ${name}${startErr ? ` — başlatılamadı: ${startErr}` : ''}${errors.length > before ? ` — ${errors.length - before} sayfa hatası` : ''}`);
    if (playing) {
      await A.getByRole('button', { name: 'Oyunu bitir' }).click().catch(() => {});
      await A.waitForTimeout(500);
    }
  } catch (e) {
    results.push(`ERR ${name}: ${e.message.split('\n')[0]}`);
    await A.screenshot({ path: `${out}/${slug(name)}-ERR.png`, fullPage: true }).catch(() => {});
  }
}
console.log(results.join('\n'));
if (overflows.length) console.log('YATAY TAŞMA:\n' + overflows.join('\n'));
if (errors.length) console.log('SAYFA HATALARI:\n' + [...new Set(errors)].join('\n'));
await browser.close();
