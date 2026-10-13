// Platform ekranlarının görüntüleri (tasarım karşılaştırması): giriş, ana sayfa, rehber, oyun seçici, lobi, sonuç.
// node e2e/design.mjs [base] [çıktı]
import { chromium, devices } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:4310';
const out = process.argv[3] ?? 'screenshots';
const browser = await chromium.launch();
const errors = [];

async function player(nick, shoot) {
  const p = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' })).newPage();
  p.on('pageerror', (e) => errors.push(`${nick}: ${e.message}`));
  p.on('dialog', (d) => d.accept());
  await p.goto(base);
  await p.getByLabel('Takma ad').fill(nick);
  if (shoot) await p.screenshot({ path: `${out}/1-welcome.png` });
  await p.getByRole('button', { name: 'Devam et' }).click();
  await p.locator('.dlg').waitFor({ timeout: 8000 });
  if (shoot) await p.screenshot({ path: `${out}/2-tour.png` });
  await p.keyboard.press('Escape');
  await p.locator('.home-tile').first().waitFor();
  return p;
}

const A = await player('Ece', true);
await A.waitForTimeout(500);
await A.screenshot({ path: `${out}/3-home.png`, fullPage: true });
await A.locator('.home-tile', { hasText: 'Tabu' }).getByRole('button', { name: /Nasıl oynanır/ }).click();
await A.locator('.dlg').waitFor();
await A.screenshot({ path: `${out}/4-guide-1.png` });
await A.getByRole('button', { name: 'İleri' }).click();
await A.screenshot({ path: `${out}/4-guide-2.png` });
await A.keyboard.press('Escape');
await A.getByRole('button', { name: 'Oda Oluştur' }).click();
await A.locator('.dlg').waitFor();
await A.screenshot({ path: `${out}/5-picker.png` });
await A.locator('.picker-game', { hasText: 'Ben Hiç' }).click();
await A.waitForURL(/\/r\/[A-Z]{4}$/);
await A.waitForTimeout(800);
await A.keyboard.press('Escape');
const url = A.url();
const others = [];
for (const n of ['Deniz', 'Zeynep']) {
  const p = await player(n, false);
  await p.goto(url);
  await p.waitForTimeout(800);
  await p.keyboard.press('Escape');
  others.push(p);
}
await others[0].getByRole('button', { name: 'Hazırım' }).click();
await A.waitForTimeout(600);
await A.screenshot({ path: `${out}/6-lobby.png`, fullPage: true });
await others[1].screenshot({ path: `${out}/6-lobby-guest.png`, fullPage: true });
await A.getByRole('button', { name: 'Oyunu başlat' }).click();
await A.waitForTimeout(2500);
await A.screenshot({ path: `${out}/7-game.png`, fullPage: true });
await A.getByRole('button', { name: 'Oyunu bitir' }).click();
await A.waitForTimeout(2500);
await A.screenshot({ path: `${out}/8-results.png`, fullPage: true });
await others[0].screenshot({ path: `${out}/8-results-guest.png`, fullPage: true });
const desk = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' })).newPage();
await desk.goto(base);
await desk.getByLabel('Takma ad').fill('Mert');
await desk.getByRole('button', { name: 'Devam et' }).click();
await desk.waitForTimeout(800);
await desk.keyboard.press('Escape');
await desk.screenshot({ path: `${out}/9-home-desktop.png` });
console.log(errors.length ? 'SAYFA HATALARI:\n' + errors.join('\n') : 'hata yok');
await browser.close();
