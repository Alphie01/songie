// Uçtan uca akış + ekran görüntüleri: node e2e/flow.mjs [base] [çıktı klasörü]
// Tarayıcı gerçek otomatik oynatma kısıtlamasıyla çalışır; ses çağrıları kaydedilip doğrulanır.
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
const shot = (page, name, full = true) => page.screenshot({ path: `${out}/${name}.png`, fullPage: full });

const audioProbe = () => {
  window.__audio = [];
  const st = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    window.__audio.push({ dur: this.buffer?.duration ?? 0, state: this.context.state });
    return st.apply(this, a);
  };
};
async function newPage(opts) {
  const ctx = await browser.newContext({ ...opts, locale: 'tr-TR' });
  await ctx.addInitScript(audioProbe);
  await ctx.addInitScript(skipGuides);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('dialog', (d) => d.accept());
  return page;
}
const audible = (page) => page.evaluate(() => window.__audio.filter((a) => a.dur > 0.05 && a.state === 'running').map((a) => +a.dur.toFixed(2)));
function check(cond, msg) {
  if (!cond) throw new Error('KONTROL BAŞARISIZ: ' + msg);
  console.log('✓', msg);
}

const host = await newPage({ ...devices['iPhone 13'] });
const guest = await newPage({ viewport: { width: 1440, height: 900 } });

await host.goto(base);
await host.getByText('Adın ne?').waitFor();
await shot(host, '01-welcome-mobile');
await host.getByLabel('Takma ad').fill('Ayşe');
await host.getByRole('button', { name: 'Mor' }).click();
await host.getByRole('button', { name: 'Devam et' }).click();
await host.locator('.home-game', { hasText: 'Şarkıyı Bil' }).getByRole('button', { name: 'Oda kur' }).waitFor();
await shot(host, '02-home-mobile');
await host.getByRole('button', { name: 'Menüyü aç' }).click();
await host.waitForTimeout(400);
await shot(host, '03-drawer-mobile', false);
await host.getByRole('button', { name: 'Menüyü kapat' }).click();

await host.locator('.home-game', { hasText: 'Şarkıyı Bil' }).getByRole('button', { name: 'Oda kur' }).click();
await host.waitForURL(/\/r\/[A-Z]{4}$/);
const code = host.url().split('/').pop();
await host.getByRole('button', { name: '5', exact: true }).click();

await guest.goto(`${base}/r/${code}`);
await guest.getByLabel('Takma ad').fill('Barış');
await guest.getByRole('button', { name: 'Devam et' }).click();
await guest.getByRole('button', { name: 'Hazırım' }).click();
await guest.getByLabel('Mesaj yaz').fill('Hazırım, başlat!');
await guest.getByRole('button', { name: 'Gönder' }).click();
await host.getByText('Hazırım, başlat!').waitFor();
await host.getByRole('button', { name: 'Liste ekle / çıkar' }).click();
// Spotify listesi ekle: şarkılar Deezer'da eşleştirilir.
await host.getByLabel('Deezer ya da Spotify playlist linki').fill('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
await host.getByRole('button', { name: 'Ekle', exact: true }).click();
await host.getByText(/eklendi/).waitFor({ timeout: 60000 });
check(true, 'Spotify listesi eklendi: ' + (await host.getByText(/eklendi/).innerText()));
await shot(host, '04-lobby-host-mobile');
await host.getByRole('button', { name: 'Kapat', exact: true }).click();
await shot(guest, '05-lobby-guest-desktop', false);

await host.getByRole('button', { name: 'Oyunu başlat' }).click();
await host.locator('.sg-count-num').waitFor({ timeout: 20000 });
await shot(host, '06-countdown-mobile', false);
await host.locator('.sg-play').waitFor({ timeout: 10000 });
await host.waitForTimeout(800);
check((await audible(host)).length >= 1, `ilk parça kendiliğinden çaldı (ev sahibi): ${JSON.stringify(await audible(host))}`);
check((await audible(guest)).length >= 1, `ilk parça kendiliğinden çaldı (misafir): ${JSON.stringify(await audible(guest))}`);
await shot(host, '07-stage-mobile', false);
await shot(guest, '08-stage-desktop', false);
await shot(host, '07b-stage-mobile-full');
// Oda sahibi oyun sırasında zorluğu değiştirir; misafirin akışında görünür.
await host.locator('.pill', { hasText: 'Zor' }).first().click();
await guest.locator('.feed-item[data-kind="settings"]').waitFor({ timeout: 5000 });
check(true, 'oyun sırasında ayar değişti, canlı akışta göründü');

await host.getByLabel('Tahminin').fill('tarkan');
await host.locator('.guess-hit').first().waitFor({ timeout: 8000 }).catch(async (e) => { await shot(host, 'FAIL-suggest', false); console.log('list count', await host.locator('.guess-list').count(), await host.locator('.guess-list').innerText().catch(() => '-')); throw e; });
await shot(host, '09-suggestions-mobile', false);
await host.keyboard.press('Enter');
await host.locator('.sg-feedback').waitFor();
await guest.getByRole('button', { name: /^(Pas|Pes et)$/ }).click();
await host.waitForTimeout(1200);
const after = await audible(host);
check(after.length >= 2 && after.at(-1) >= 0.45, `bir sonraki parça (0,5 sn) herkese açıldı ve çaldı: ${JSON.stringify(after)}`);
await shot(host, '10-after-guess-mobile', false);

for (let i = 0; i < 8 && !(await host.locator('.rv').count()); i++) {
  for (const p of [host, guest]) {
    const b = p.getByRole('button', { name: /^(Pas|Pes et)$/ });
    if ((await b.count()) && (await b.isEnabled())) await b.click().catch(() => {});
  }
  await host.waitForTimeout(600);
}
await host.locator('.rv').waitFor({ timeout: 15000 });
await host.waitForTimeout(800);
const durs = await audible(host);
check(durs.some((d) => d >= 7.9), `8 sn ve 15 sn parçaları ile önizleme çaldı: ${JSON.stringify(durs)}`);
await shot(host, '11-reveal-mobile');
await shot(guest, '12-reveal-desktop', false);

// Süresiz: sonuç ekranı herkes "Sonraki şarkı" deyince geçer.
await host.waitForTimeout(1500);
check((await host.locator('.rv').count()) === 1, 'sonuç ekranı kendiliğinden geçmedi');
await host.getByRole('button', { name: 'Sonraki şarkı' }).click();
await guest.getByRole('button', { name: 'Sonraki şarkı' }).click();
await host.locator('.sg-play').waitFor({ timeout: 15000 });
check(true, 'herkes hazır deyince ikinci şarkıya geçildi');

await host.getByRole('button', { name: 'Oyunu bitir' }).click();
await host.locator('.podium').waitFor({ timeout: 10000 });
await shot(host, '13-podium-mobile');
await host.getByRole('button', { name: 'Oyunu başlat' }).waitFor({ timeout: 15000 });
await shot(host, '14-lobby-after-mobile');

// Tek başına: "Tek başına oyna" dokunuşu sesi açar, ilk parça kendiliğinden çalar.
const solo = await newPage({ ...devices['Pixel 7'] });
await solo.goto(base);
await solo.getByLabel('Takma ad').fill('Solo');
await solo.getByRole('button', { name: 'Devam et' }).click();
await solo.getByRole('button', { name: 'Tek başına oyna' }).click();
await solo.locator('.sg-play').waitFor({ timeout: 20000 });
await solo.waitForTimeout(800);
check((await audible(solo)).length >= 1, `tek başına: ilk parça kendiliğinden çaldı: ${JSON.stringify(await audible(solo))}`);
await shot(solo, '15-solo-mobile', false);

console.log('ok', code);
await browser.close();
