# Songie Reels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Songie için marka dilinde, renkli, 8–12 sn'lik 3 Instagram Reels (MP4 + kapak + açıklama). Sahnelerin çoğu kodla üretilen hareketli grafik, Reels başına 1–2 kie.ai AI klip. Altyapı diğer 3 uygulamaya tema ekleyerek yeniden kullanılabilir.

**Architecture:** `marketing/reels` adında bağımsız bir pnpm paketi. Remotion kompozisyonları ortak marka bileşenlerini (`src/brand/`) ve uygulama başına bir tema nesnesini (`src/themes/`) kullanır. `tools/` altındaki Node betikleri ücretli üretimi yönetir: OpenAI gpt-image ile karakter görseli, kie.ai ile image-to-video, ffmpeg ile ses efekti. Her ücretli çağrı 10 $ sınırlı bir harcama defterinden geçer, her sonuç `assets/` altında önbelleğe alınır.

**Tech Stack:** Remotion 4.0.538 (`remotion`, `@remotion/cli`, `@remotion/google-fonts` kullanılmaz: fontlar yerel TTF), React 19, TypeScript, vitest, tsx, ffmpeg (`/opt/homebrew/bin/ffmpeg`), kie.ai REST, OpenAI Images REST. HyperFrames isteğe bağlı, bu planda kullanılmıyor.

**Spec:** `docs/superpowers/specs/2026-10-23-songie-reels-design.md`

## Global Constraints

- Çıktı 1080×1920, 30 fps, H.264 MP4. Her Reels **8–12 sn**.
- Güvenli alan: metin ve CTA üstten 250 px, alttan 400 px, yanlardan 60 px içeride.
- Renkler yalnızca şu tokenlar: pink `#ff7ac6`, yellow `#ffd23f`, mint `#3ee0a8`, sky `#5ab8ff`, lilac `#b794ff`, bg `#2a1b6e`, bgDeep `#150e38`, panel `#3a2a8c`, ink `#0d0828`, paper `#ffffff`, cream `#fff4c2`, coral `#ff8a5b`.
- Fontlar: başlık Baloo 2 (Bold/ExtraBold), gövde Nunito. Kaynak: `packages/songie_core/lib/fonts/*.ttf` (kopyalanmaz, `staticFile` için `public/fonts`'a symlink).
- Videoda telifli müzik yok. Ses yalnızca ffmpeg ile sentezlenen efektler.
- AI bütçesi: kie + OpenAI toplam **10 $**. Sınır aşılacaksa çağrı yapılmaz, kullanıcıya sorulur.
- Video modeli: `google/gemini-omni-flash-1-1` (varsayılan) ya da Kling. Reels başına **en fazla 2** AI klip.
- Anahtarlar `~/works/liste/.env` içinden okunur (`KIE_API_KEY`, `OPENAI_API_KEY`). Anahtarlar kopyalanmaz, loglanmaz, repoya yazılmaz.
- Metinler Türkçe, cümle düzeninde. Arkadaşlar: Mert, Deniz, Kaan, Ece. CTA: "Songie — App Store ve Google Play'de ücretsiz".
- Uygulamada olmayan bir özellik gösterilmez. Aşamalar 0,1 / 0,5 / 2 / 8 / 15 sn, puanlar 1000 / 700 / 450 / 250 / 100.

## Review Focus

1. **Bütçe sınırında yarım kalan çağrı.** Görev oluşturuldu, sonra yoklama zaman aşımına uğradı. Beklenen: taskId deftere "pending" olarak yazılır, tekrar çalıştırmada yeni görev açılmaz, aynı görev sorgulanır (Task 2 testi `resumes pending task`).
2. **kie HTTP 200 ama `code != 200`.** Beklenen: anlamlı hata fırlatılır, deftere harcama yazılmaz (Task 2 testi `throws on non-200 code`).
3. **Uzun Türkçe cevap metni** (ör. "Sezen Aksu – Kaybolan Yıllar"). Beklenen: güvenli alana sığar, satır kırar, taşmaz (Task 3 testi `fitText shrinks long answers`).
4. **Klip dosyası eksik** (ör. AI üretimi henüz yapılmadı). Beklenen: render, düz renk yer tutucu kartla çalışır, çökmez (Task 3 testi `ClipCard falls back when src missing`).
5. **Geçici sonuç URL'leri** (kie URL'leri süreli, upload 24 saat). Beklenen: sonuç hemen `assets/` altına indirilir, render hiçbir zaman uzak URL kullanmaz (Task 2 testi `downloads result locally`).

---

### Task 1: Paket iskeleti, tema ve font kurulumu

**Files:**
- Modify: `pnpm-workspace.yaml` (`- marketing/*` ekle)
- Create: `marketing/reels/package.json` (ad `@songie/reels`, scripts: `studio`, `render`, `still`, `test`, `gen`), `tsconfig.json`, `remotion.config.ts`, `.gitignore` (`out/`, `node_modules/`; `.spend.json` git'te takip edilir)
- Create: `marketing/reels/src/index.ts` (`registerRoot`), `src/Root.tsx`
- Create: `marketing/reels/src/themes/types.ts`, `src/themes/songie.ts`
- Create: `marketing/reels/src/brand/fonts.ts`
- Create: `marketing/reels/public/fonts` → `../../../packages/songie_core/lib/fonts` symlink
- Test: `marketing/reels/test/theme.test.ts`

**Interfaces:**
- Produces:
  - `type AppTheme = { id: 'songie'|'itiraf'|'casebook'|'weknows'; name: string; colors: Record<'pink'|'yellow'|'mint'|'sky'|'lilac'|'bg'|'bgDeep'|'panel'|'ink'|'paper'|'cream'|'coral', string>; stageColors: string[]; cta: string; stores: string }`
  - `songieTheme: AppTheme` (`stageColors = [pink, yellow, mint, sky, lilac]`, `cta = 'Şarkıyı 0,1 saniyeden bil!'`, `stores = "App Store ve Google Play'de ücretsiz"`)
  - `loadBrandFonts(): Promise<void>`: `FontFace` ile `Baloo2-ExtraBold`, `Baloo2-Bold`, `Nunito-ExtraBold`, `Nunito-Bold` yükler, `delayRender` / `continueRender` kullanır.
  - `FONT_DISPLAY = "'Baloo 2', sans-serif"`, `FONT_BODY = "'Nunito', sans-serif"`
  - `VIDEO = { width: 1080, height: 1920, fps: 30 }`, `SAFE = { top: 250, bottom: 400, side: 60 }`

- [ ] **Step 1:** Test yaz. `songieTheme.colors` değerleri Global Constraints'teki hex'lere birebir eşit, `stageColors.length === 5`, `VIDEO` ve `SAFE` değerleri yukarıdaki gibi.
- [ ] **Step 2:** `pnpm --filter @songie/reels test` → FAIL (modül yok).
- [ ] **Step 3:** Dosyaları oluştur, `remotion@4.0.538 @remotion/cli@4.0.538 react react-dom` (repo'daki React 19 sürümü) ve `vitest tsx` dev olarak ekle. `Root.tsx` geçici olarak 1 sn'lik boş bir `Hello` kompozisyonu kaydeder.
- [ ] **Step 4:** Testi çalıştır → PASS. `pnpm --filter @songie/reels exec remotion still src/index.ts Hello out/hello.png` → PNG oluşur.
- [ ] **Step 5:** Commit: `feat(reels): scaffold remotion package with songie theme`

---

### Task 2: Ücretli üretim araçları (env, defter, kie, OpenAI, sfx)

**Files:**
- Create: `marketing/reels/tools/env.ts`, `tools/spend.ts`, `tools/kie.ts`, `tools/openai-image.ts`, `tools/sfx.ts`, `tools/gen.ts` (CLI)
- Create: `marketing/reels/assets/shots.json` (manifest; Task 4'te doldurulur, şimdilik `[]`)
- Test: `marketing/reels/test/spend.test.ts`, `test/kie.test.ts`, `test/sfx.test.ts`

**Interfaces:**
- Produces:
  - `loadKeys(file = path.join(os.homedir(), 'works/liste/.env')): { kie: string; openai: string }`: yalnızca bu iki anahtarı parse eder, eksikse anahtar değerini yazmadan hata verir.
  - `class SpendLedger { constructor(file: string, capUsd = 10); spent(): number; assertCanSpend(estimateUsd: number): void /* spent+estimate > cap → throw BudgetError */; record(e: { id: string; kind: 'image'|'video'; provider: 'kie'|'openai'; usd: number; taskId?: string; state: 'pending'|'done'|'failed' }): void; find(id: string) }`. Dosya: `marketing/reels/.spend.json` (git'te takip edilir).
  - `KIE_USD_PER_CREDIT = 0.005`: ilk gerçek çağrıda kie fiyat sayfasıyla doğrulanır, farklıysa güncellenir.
  - `kie.uploadFile(localPath): Promise<string>` → `POST https://kieai.redpandaai.co/api/file-stream-upload` (multipart `file`, `uploadPath='songie-reels'`), `data.downloadUrl` döner.
  - `kie.createTask(model: string, input: object): Promise<string>` → `POST https://api.kie.ai/api/v1/jobs/createTask`, `data.taskId`.
  - `kie.waitTask(taskId, { intervalMs = 10_000, timeoutMs = 15 * 60_000 }): Promise<{ urls: string[]; credits: number }>` → `GET /api/v1/jobs/recordInfo?taskId=`, `state` `success` → `JSON.parse(resultJson).resultUrls`, `fail` → `failMsg` ile hata.
  - `kie.credits(): Promise<number>` → `GET /api/v1/chat/credit`.
  - Bütün kie yanıtlarında HTTP 200 olsa da `code !== 200` → `KieError(code, msg)`.
  - `generateImage({ prompt, out, size: '1024x1536', quality: 'medium', refs?: string[] }): Promise<string>` → OpenAI `gpt-image-2`, `refs` varsa `/images/edits`. Tahmin 0,05 $.
  - `download(url, out): Promise<string>`
  - `makeSfx(dir): Promise<Record<'bip'|'ding'|'whoosh'|'pop'|'buzz'|'tick', string>>`: ffmpeg `lavfi` ile WAV üretir (bip: 1200 Hz sine 0,1 sn; ding: 1760+2640 Hz, üstel sönüm 0,6 sn; whoosh: bandpass süpürmeli pembe gürültü 0,4 sn; pop: 0,05 sn kısa sine 600→200 Hz; buzz: 110 Hz kare dalga 0,3 sn; tick: 0,02 sn klik). Çıktı `public/sfx/*.wav`.
  - CLI: `pnpm --filter @songie/reels gen <shotId>` → `assets/shots.json`'dan çekimi okur, önbellekte yoksa üretir. Akış: `assertCanSpend(estimate)` → görev → deftere `pending` → bekle → `assets/<shotId>.<ext>`'e indir → deftere `done` + gerçek USD (`credits × KIE_USD_PER_CREDIT`). Önbellekte varsa ücretsiz çıkar. `pending` kayıt varsa yeni görev açmaz, `waitTask` ile sürdürür.
  - `type Shot = { id: string; kind: 'image'|'video'; model: string; prompt: string; input?: object; refs?: string[] /* shot id'leri */; estimateUsd: number }`

- [ ] **Step 1:** `spend.test.ts`: (a) `assertCanSpend(1)` 9,5 $ harcanmışken `BudgetError` atar; (b) `record` sonrası `spent()` yalnızca `done` kayıtları toplar; (c) dosya yoksa 0 ile başlar.
- [ ] **Step 2:** `kie.test.ts` (`fetch` mock): `throws on non-200 code` (`{code:402,msg:'insufficient'}` → `KieError`), `waitTask parses resultJson` (`queuing` → `success`, `resultUrls[0]` döner, credits okunur), `waitTask throws on fail`, `resumes pending task` (`gen` defterde `pending` taskId varken `createTask` çağırmaz), `downloads result locally` (`gen` sonunda `assets/<id>.mp4` vardır, manifest uzak URL içermez).
- [ ] **Step 3:** `sfx.test.ts`: `makeSfx` 6 dosya üretir, her biri > 1 KB ve ffprobe süresi verilen değerin ±0,05 sn içinde.
- [ ] **Step 4:** Testleri çalıştır → FAIL.
- [ ] **Step 5:** Uygula.
- [ ] **Step 6:** Testler PASS. Ücretsiz canlı doğrulama: `tsx tools/gen.ts --credits` → kalan kie kredisini yazar (anahtarın çalıştığını kanıtlar, harcama yok).
- [ ] **Step 7:** Commit: `feat(reels): kie/openai generation tools with 10$ spend ledger and sfx`

---

### Task 3: Marka bileşenleri

**Files:**
- Create in `marketing/reels/src/brand/`: `ColorStage.tsx`, `Sticker.tsx`, `Star.tsx`, `Headline.tsx`, `fitText.ts`, `PhoneFrame.tsx`, `ClipCard.tsx`, `CtaCard.tsx`, `ColorWipe.tsx`
- Create in `marketing/reels/src/brand/app/`: `StageBar.tsx`, `Waveform.tsx`, `PlayButton.tsx`, `LiveFeed.tsx`, `Scoreboard.tsx`, `GuessBox.tsx`, `SongPlayScreen.tsx`
- Modify: `src/Root.tsx` (bileşen önizleme kompozisyonu `BrandSheet`, 1080×1920, 3 sn)
- Test: `marketing/reels/test/fitText.test.ts`, `test/clipCard.test.tsx`

**Interfaces:**
- Consumes: `AppTheme`, `FONT_*`, `VIDEO`, `SAFE` (Task 1).
- Produces (hepsi `theme: AppTheme` prop'u alır):
  - `<ColorStage color>`: düz zemin + köşede `Star` + App Store görsellerindeki gibi alt kısımda kalın çizgili dalgalı şekil.
  - `<Sticker text bg rotate={-6} enterAt={frame} size>`: `ink` 6 px dış çizgi, 8 px sert gölge, `spring` ile zıplayarak girer.
  - `<Headline text enterAt maxWidth={1080 - 2*SAFE.side}>`: Baloo 2 ExtraBold, kelime kelime giriş.
  - `fitText(text: string, maxWidth: number, startSize: number, minSize = 48): { size: number; lines: string[] }`: ölçüm `@remotion/layout-utils` `measureText` ile.
  - `<PhoneFrame tilt={0}>{children}</PhoneFrame>`: App Store görselindeki koyu mor telefon, 840 px genişlik.
  - `<SongPlayScreen stage={0..4} feed={FeedLine[]} scores={ScoreRow[]} guess?: string playing: boolean>`: uygulamadaki oyun ekranının kodla birebir çizimi (Tur 4/10 rozeti, aşama çubuğu, pembe play, dalga formu, "Şarkıyı bul" kutusu + "Pas", CANLI AKIŞ, alt skor kartları). Referans `app-store-gorselleri/Songie/iPhone-6.9/02.png` ve `03.png`.
  - `type FeedLine = { name: string; text: string; points?: number; color: string }`, `type ScoreRow = { name: string; score: number; color: string; me?: boolean }`
  - `<ClipCard src?: string rotate={-3} enterAt from={0}>`: `OffthreadVideo`, kalın çerçeve + gölge. `src` yoksa ya da dosya yoksa `lilac` zeminli "KLİP" yer tutucusu gösterir.
  - `<ColorWipe from to at durationInFrames={8}>`: çapraz renk silme geçişi + `whoosh` sesi.
  - `<CtaCard theme>`: logo + "Songie" + `theme.cta` + `theme.stores` sticker'ı. Son 2 sn için.

- [ ] **Step 1:** `fitText.test.ts`: `fitText shrinks long answers`. "Sezen Aksu – Kaybolan Yıllar" için `maxWidth = 960`, `startSize = 120` → `size < 120`, `lines.length <= 2`, `size >= 48`. Kısa "Tarkan" → `size === 120`, `lines.length === 1`.
- [ ] **Step 2:** `clipCard.test.tsx`: `ClipCard falls back when src missing`. `@testing-library/react` ile `src` olmadan render → "KLİP" metni var, `video` öğesi yok.
- [ ] **Step 3:** `@remotion/layout-utils@4.0.538` ve dev olarak `@testing-library/react`, `jsdom` ekle. FAIL → uygula → PASS.
- [ ] **Step 4:** Görsel kontrol: `remotion still src/index.ts BrandSheet out/brandsheet.png --frame=60`. PNG'yi `02.png` ile yan yana aç (Read). Renkler, çizgi kalınlığı, fontlar ve sticker stili tutarlı olmalı. Fark varsa düzelt.
- [ ] **Step 5:** Commit: `feat(reels): brand components and coded app screen`

---

### Task 4: Karakter görseli ve Reels 1 AI klibi (ücretli, ≈1,5 $ üst sınır)

**Files:**
- Modify: `marketing/reels/assets/shots.json`
- Create (üretilen): `assets/friends-ref.png`, `assets/r1-react.mp4`
- Modify: `.spend.json`

**Interfaces:**
- Consumes: `gen` CLI, `Shot` (Task 2).
- Produces: `assets/friends-ref.png` (Reels 2 ve 3'te `refs` olarak tekrar kullanılır), `assets/r1-react.mp4` (≈4 sn, 9:16).

Çekimler (prompt'lar İngilizce, model bunlarda daha iyi):
- `friends-ref`: image, `gpt-image-2`, 1024×1536, medium. *"Vertical photo, four Turkish friends in their mid-20s (Mert: curly dark hair, mustard hoodie; Deniz: woman, long brown hair, pink sweater; Kaan: short fade, glasses, mint t-shirt; Ece: woman, black bob, lilac cardigan) on a cozy living-room couch at night, each holding a smartphone, warm lamp light, colorful pillows in pink, yellow and mint, candid phone-camera look, natural skin, no text, no logos."* Tahmin 0,05 $.
- `r1-react`: video, `google/gemini-omni-flash-1-1`, `input: { prompt, first_frame_url: <friends-ref upload>, aspect_ratio: '9:16', resolution: '720p', duration: '4' }`. *"Handheld phone video. The friends stare at their phones in silence, then Deniz suddenly jumps up shouting with joy, arms raised, the others react in shock and laugh, one throws a pillow. Natural motion, same people and room, no text."* Tahmin 1,0 $.

- [ ] **Step 1:** `shots.json`'a iki çekimi ekle.
- [ ] **Step 2:** `gen friends-ref` → PNG'yi Read ile aç. Kontrol: 4 kişi, tarif edilen kıyafetler, metin/logo yok, renkler marka renkleriyle uyumlu. Kötüyse prompt'u düzelt ve **en fazla 1 kez** yeniden üret.
- [ ] **Step 3:** `gen r1-react`. Sonra `ffmpeg -ss` ile 0, 1, 2, 3. saniyeden kare çıkar ve Read ile bak. Kontrol: yüzler bozuk değil, kişiler ilk kareyle aynı. Kötüyse **1 kez** Kling ile yeniden dene (`kling-3.0/video`, std, 5 sn). Yine kötüyse dur, kullanıcıya göster.
- [ ] **Step 4:** `.spend.json` toplamını ve kalan kie kredisini raporla. `KIE_USD_PER_CREDIT`'i gerçek tüketimle doğrula.
- [ ] **Step 5:** Commit: `feat(reels): friends reference and reels-1 clip`. Ham MP4/PNG git'e girer (küçük); 10 MB'ı aşarsa `.gitignore`'a al ve yolu rapora yaz.

---

### Task 5: Reels 1 — "0,1 saniye challenge" (≈10 sn) → kullanıcı onayı

**Files:**
- Create: `marketing/reels/src/reels/R1Challenge.tsx`
- Modify: `src/Root.tsx` (`songie-01-challenge`, 300 kare, `defaultProps: { answer: 'Tarkan – Kuzu Kuzu', solveStage: 0 }`, `schema` zod ile)
- Create: `marketing/reels/captions.md`
- Output: `out/songie-01-challenge.mp4`, `out/songie-01-challenge.png`
- Test: `marketing/reels/test/r1.test.ts`

**Interfaces:**
- Consumes: Task 3'teki tüm bileşenler, `public/sfx/*`, `assets/r1-react.mp4`.
- Produces: `R1Props = { answer: string; solveStage: 0|1|2|3|4 }`.

Storyboard (kare @30 fps):
| Kare | Sahne |
|---|---|
| 0–30 | Pembe `ColorStage`. `Headline` "Bu şarkıyı **0,1 saniyede** bilebilir misin?" + `Sticker` "0,1 SN!" (sarı). `bip` sesi kare 20'de. |
| 30–105 | `PhoneFrame` + `SongPlayScreen stage=0`, dalga formu titrer. Üstte geri sayım sticker'ı "3·2·1" (`tick` sesi). Alt yazı "Yorumlara yaz 👇". |
| 105–115 | `ColorWipe` pembe → sarı. |
| 115–190 | Sarı zemin, `ClipCard src=r1-react.mp4` (eğik). Üstüne `Sticker` "Deniz 0.1s'de bildi +1000" (mint, `ding`) ve "HİLE!" (coral, `buzz`, kare 160). |
| 190–200 | `ColorWipe` sarı → mint. |
| 200–245 | Mint zemin, cevap kartı: `fitText(answer)` ile büyük cevap + "Sen kaçta bildin?" sticker'ı (`pop`). |
| 245–300 | `CtaCard` (lila zemin): logo, "Şarkıyı 0,1 saniyeden bil!", sticker "App Store ve Google Play'de ücretsiz". |

- [ ] **Step 1:** `r1.test.ts`: kompozisyon `durationInFrames === 300` (10 sn, 8–12 aralığında), `width/height` 1080×1920. Zod şeması `answer: ''` için hata verir.
- [ ] **Step 2:** FAIL → `R1Challenge` uygula → PASS.
- [ ] **Step 3:** Kareler 15, 60, 150, 220, 280 için still al ve Read ile kontrol et: güvenli alan dışında metin yok, renkler marka renkleri, sticker'lar okunur.
- [ ] **Step 4:** `remotion render src/index.ts songie-01-challenge out/songie-01-challenge.mp4 --codec=h264 --crf=18`. `ffprobe` ile 1080×1920, 10,0 sn, ses kanalı var. Kapak: `remotion still ... --frame=20 out/songie-01-challenge.png`.
- [ ] **Step 5:** `captions.md`'ye Reels 1 açıklaması (≤ 150 karakter kanca + soru "Kaçıncı saniyede bildin?") ve 8–12 Türkçe/İngilizce hashtag ekle. Yeni cevapla yeniden render komutunu yaz: `--props='{"answer":"…"}'`.
- [ ] **Step 6:** Commit: `feat(reels): reels 1 challenge`
- [ ] **Step 7: DUR.** MP4 yolunu, kapağı ve harcamayı kullanıcıya göster. Geri bildirimi uygula. Reels 2 ve 3'e yalnızca kullanıcı onayından sonra geç.

---

### Task 6: Reels 2 "Kapışma" ve Reels 3 "O kişi" (onaydan sonra)

**Files:**
- Modify: `assets/shots.json` (`r2-battle`, gerekirse `r3-that-friend`; Reels 3, `r1-react`'ı tekrar kullanabilir)
- Create: `src/reels/R2Battle.tsx`, `src/reels/R3ThatFriend.tsx`
- Modify: `src/Root.tsx`, `captions.md`
- Output: `out/songie-02-kapisma.{mp4,png}`, `out/songie-03-o-kisi.{mp4,png}`
- Test: `test/r2r3.test.ts`

**Interfaces:**
- Consumes: Task 3 bileşenleri, `friends-ref` (`refs` / `first_frame_url`), `SpendLedger`.

İçerik:
- **R2 (≈10 sn):** "Cuma akşamı. 4 kişi. 1 şarkı." → hızlı kesitlerle `SongPlayScreen` aşama 0 → 1 (0,1 → 0,5 sn), `LiveFeed` satırları akar ("Mert 0.5s'de bildi +880", "Deniz sanatçıyı bildi +210", "Kaan pas geçti"), AI klip (grup kavgası/sevinç, `r2-battle`, 4 sn), `Scoreboard` sıralama animasyonu (Mert 3.420 lider) → CTA. Kanca: "Arkadaş grubunda şarkıyı ilk kim bilir?"
- **R3 (≈9 sn):** "Her grupta bir kişi vardır…" → "…şarkıyı 0,1 saniyede bilen" → AI klip (biri gözünü kırpmadan bilir, diğerleri şok) → "Etiketle 👇" sticker → CTA. AI klip olarak `r1-react` tekrar kullanılabilir. Yeni klip yalnızca bütçe kalırsa ve R1 klibi uymazsa üretilir.

- [ ] **Step 1:** Test: her iki kompozisyonun süresi 240–360 kare, 1080×1920.
- [ ] **Step 2:** FAIL → çekimleri üret (her biri `assertCanSpend` ile, toplam 10 $'ı geçemez) → kompozisyonları uygula → PASS.
- [ ] **Step 3:** Task 5 Step 3–4'teki still ve ffprobe kontrolleri.
- [ ] **Step 4:** `captions.md` güncelle. Commit: `feat(reels): reels 2 and 3`
- [ ] **Step 5:** Son rapor: 3 MP4 + kapak yolu, toplam harcama / 10 $, yeniden render komutları, diğer uygulamalar için yeni tema ekleme notu (`src/themes/<app>.ts`).
