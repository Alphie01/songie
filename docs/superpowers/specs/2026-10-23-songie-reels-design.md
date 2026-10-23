# Songie Instagram Reels — Tasarım

Tarih: 2026-10-23 · Durum: onaylandı (2026-10-23)

## Amaç ve neden

Songie (Şarkıyı Bil) için Instagram Reels formatında pazarlama videoları üretmek. Songie dört uygulamanın ilki; aynı altyapı sonra İtiraf Köşesi, Casebook ve We Knows için kullanılacak. Bu yüzden altyapının yeniden kullanılabilir olması önemli.

Ana fikir (kullanıcı): evde toplanmış bir arkadaş grubu, rekabetçi bir şekilde şarkıyı bilmeye çalışıyor. Videolar App Store görselleriyle aynı dilde, **renkli ve eğlenceli** olmalı.

Uygulamanın kancası: şarkının yalnızca **0,1 sn**'si çalınıyor, bilemeyince 0,5 → 2 → 8 → 15 sn açılıyor. Puanlar 1000 / 700 / 450 / 250 / 100, ayrıca hız ve ilk bilme bonusu var. Hazır listeler (Türkçe Pop, Global Hits, Rock…) ya da kendi Spotify/Deezer listen kullanılabiliyor. 5 zorluk seviyesi var. Uygulama ücretsiz, reklamsız ve tamamen Türkçe. Tek başına ya da arkadaşlarla oda kurup oynanabiliyor.

## Hedefler

- İlk teslim: 3 Reels (kullanıcı üçünü de onayladı).
  1. **0,1 saniye challenge**: izleyiciyi doğrudan oyuna sokar ("Bu şarkıyı 0,1 saniyede bilebilir misin?"). Bip / dalga formu gösterilir, ardından cevap için kısa bir bekleme ve açılış gelir.
  2. **Gerçek oyun deneyimi** (kullanıcı, 2026-10-23, eski "Kapışma" fikrinin yerine): "Sen ne kadar hızlı bilebilirsin?" + altta "Hazır ol" ve 3'ten geri sayım → telefonda 0,1 sn çalar, bilemez → 0,5 sn, bilemez → 2 sn, bilemez → aynı turda canlı akışta "Mert 0,1 sn'de bildi" → şarkı kapağıyla açılış (gerçek şarkı çalar) → kapanış "Sen de Songie ile arkadaşlarına meydan oku" + logo. AI video yok.
  3. **"Her grupta o bir kişi vardır"**: şarkıyı intro'dan bilen arkadaş. Relatable, etiketlemeye uygun bir meme kurgusu.
- Her Reels: 1080×1920, 9:16, **8–12 sn** (kullanıcı: ortalama izlenme 8–10 sn), Türkçe. İlk 1 sn'de güçlü bir kanca ve sonda bir CTA ("Songie — App Store / Google Play'de ücretsiz"). Uygulama şu an mağaza onay sürecinde; videolar yayından sonra paylaşılacak, bu yüzden CTA iki mağazayı da anar. *(Claude'un kararı: resmi rozetler yerine marka stilinde sticker metin kullanılır; mağaza linkleri yayında açıklama metnine eklenir.)*
- Her video için ek çıktılar: kapak görseli (1080×1920 PNG), açıklama metni ve hashtag önerisi.
- Diğer üç uygulamaya tema eklenerek genişletilebilen bir altyapı.

## Hedef dışı

- Instagram'a otomatik paylaşım (paylaşımı kullanıcı yapar).
- Ücretli reklam kurulumu ve hedefleme.
- İtiraf Köşesi, Casebook ve We Knows içerikleri. Bunlar sonraki turlarda yapılacak, yalnızca altyapı hazırlanacak.

## Kaçınılacaklar (çalışsa bile başarısızlık sayılır)

- Gri, kurumsal ya da "stok video" hissi veren görüntüler. Marka renkleri hep baskın olmalı.
- Videoya gerçek, telifli şarkı sesi koymak. Ses bip / efekt / dalga formu animasyonuyla anlatılır, trend ses Instagram'da paylaşırken eklenir.
- Gerçek bir sanatçının yüzünü ya da sesini taklit etmek. Ekranda şarkı adı göstermek serbest, App Store görsellerinde de "Tarkan – Kuzu Kuzu" var.
- AI karakterlerin videodan videoya farklı insanlara dönüşmesi. Aynı "arkadaş grubu" tutarlı kalmalı.
- Uygulamada olmayan bir özelliği varmış gibi göstermek.

## Marka dili (App Store görselleri `app-store-gorselleri/Songie/` ve web `apps/web/src` CSS tokenları)

- Düz renkli sahne zeminleri: pembe `#ff7ac6`, sarı `#ffd23f`, mint `#3ee0a8`, mavi `#5ab8ff`, lila `#b794ff`.
- Uygulama yüzeyleri: koyu mor `#2a1b6e` / `#150e38`, panel `#3a2a8c`. Çizgi / mürekkep rengi `#0d0828`.
- Kalın siyah dış çizgili, hafif eğik "sticker" etiketler (örnekler: "Ücretsiz", "+880", "Kulağını aç", "5 zorluk", "Reklamsız") ve köşede yıldız simgesi.
- Fontlar: başlıklar **Baloo 2** (kalın), gövde **Nunito**.
- Uygulama anları: telefon mockup'ı içinde 0,1 / 0,5 / 2 / 8 / 15 sn aşama çubuğu, pembe play düğmesi, dalga formu, "CANLI AKIŞ" ("Mert 0.5s'de bildi +880"), alt skor tablosu (Mert, Sen, Deniz, Kaan).

## Görsel yaklaşım (kullanıcı onayladı)

- Her sahne düz renk zeminle açılır. Geçişler renk değişimiyle (pembe → sarı → mint…) olur ve tempo yüksek tutulur.
- AI ile üretilen gerçekçi insan klipleri ekranı tam doldurmaz. Kalın siyah çerçeveli, hafif eğik bir "kart" olarak renkli zeminin üstüne oturtulur. Kartın üstüne sticker'lar zıplayarak girer ("0,1 SN!", "+1000", "HİLE!").
- Uygulama anları kodla yeniden çizilir. App Store PNG'leri doğrudan kullanılmaz, böylece animasyonlu ve net kalır.

## Okunabilir tempo (kullanıcı, 2026-10-23)

"Çok hızlı geçiyorsun, ne izlediğimi bildiğim halde anlamadım." Her sekans izleyicinin okuyabileceği kadar ekranda kalır (tek satır ≥ 0,8 sn, sticker/olay ≥ 1 sn, açılış/kapanış kartı ≥ 2,5 sn). Bu kural 8–12 sn hedefinin önüne geçer; R2 ~22 sn.

## AI video kuralı (kullanıcı geri bildirimi, 2026-10-23)

Reels 1'deki kie klibi "hiçbir şey ifade etmedi": 1 sn'den kısa algılanan bir klip için 0,37 $ mantıklı değil. Bundan sonra AI video yalnızca hikâyenin merkezinde, en az ~3 sn tam ekran/okunur görünecek ve sahnede tek başına anlam taşıyacak şekilde planlanırsa üretilir; aksi halde kodla üretilen sahneler kullanılır. Üretmeden önce klibin ne anlatacağı ve kaç saniye görüneceği storyboard'da yazılı olmalı.

## Gerçek şarkı (kullanıcı, 2026-10-23)

Videolarda Deezer 30 sn önizlemesinden gerçek şarkı kullanılır (oyunla aynı kaynak): 0,1 / 0,5 / 2 sn kesitler oyundaki gibi aynı ofsetten, açılışta şarkı arkada çalar; kapak görseli Deezer'dan. Telif riski kullanıcıya bildirildi; dosyalar git'e girmez. Bu, "telifli müzik yok" kaçınma maddesinin yerine geçer.

## Teknik kararlar

- **Konum:** `songie/marketing/reels/` (repo içinde, ayrı bir paket).
- **Kompozisyon / render:** Remotion (React). Kullanıcı HyperFrames'i (HeyGen'in HTML→MP4 aracı) de önerdi. Kullanıcı "hypermotion" dedi, npm'deki `hypermotion` paketi yayınlanmamış olduğu için HyperFrames kastedildiği varsayıldı. Ana araç Remotion. HyperFrames'i kullanıp kullanmamak builder'a bırakıldı: hızlı HTML tabanlı sticker/metin efektleri gibi işine yarayan yerlerde kullanabilir, şart değil.
- **Paylaşılan marka bileşenleri:** renk zemini, sticker, telefon mockup'ı, aşama çubuğu, dalga formu, canlı akış, skor tablosu, CTA kartı. Tema nesnesi uygulama başına değişir (renkler, logo, metinler). Diğer uygulamalar yeni bir temayla aynı bileşenleri kullanır.
- **AI video:** kie.ai API. Anahtar `~/works/liste/.env` içindeki `KIE_API_KEY`'den okunur. Kopyalanmaz, repoya yazılmaz.
  - Önce gpt-image (kie üzerinden) ile karakter / ilk kare görselleri üretilir: 4 kişilik sabit bir arkadaş grubu (Türk, 20'li yaşlar, evde, sıcak ve renkli ortam): Mert, Deniz, Kaan, Ece (uygulamadaki isimler). *(Claude'un kararı: uygulamadaki "Sen" kameradaki biri değil, izleyicinin kendisi; bazı uygulama anları izleyicinin bakış açısından gösterilir.)*
  - Sonra image-to-video ile (Kling ya da google/gemini-omni-flash-1-1) kısa (≈5 sn) reaksiyon klipleri üretilir.
  - Üretilen her asset, prompt'u ve parametreleriyle birlikte `assets/` altında saklanır. Pahalı çağrıları tekrar etmemek için önbellek tutulur.
- **Ses:** telifsiz efektler (bip, ding, whoosh, kalabalık sevinci). ElevenLabs anahtarı şu an hazır değil. Seslendirme gerekirse kullanıcıdan istenecek. İlk teslimde konuşma yerine ekran metni + efekt yeterli.
- **OpenAI anahtarı** (`liste/.env` içinde `OPENAI_API_KEY`) gerekirse metin / açıklama üretimi için kullanılabilir. Şart değil.
- **Bütçe (kullanıcı: "çok fazla harcamamamız gerekiyor"):** Video modeli (kullanıcı): kie'de **Kling** ya da **google/gemini-omni-flash-1-1**; pahalı modlardan kaçınılır. Her harcama `marketing/reels/.spend.json`'a yazılır. *(Claude'un kararı: Kullanıcı: ilk 3 Reels için sınır **10 $**; aşılacaksa önce kullanıcıya sorulur.)* AI klip sayısı: **Reels başına 1–2 klip** (kullanıcı); sahnelerin çoğu kodla üretilen hareketli grafiktir. Aynı klipler farklı Reels'lerde tekrar kullanılabilir.
- **Maliyet kontrolü:** önce Reels 1 uçtan uca üretilip kullanıcıya gösterilir, onaydan sonra 2 ve 3'e geçilir. Toplu üretimden önce tek klip denemesi yapılır.

- **Reels 1'in cevabı:** ekranda açılan şarkı adı/sanatçı Remotion'da render parametresi (prop) olarak verilir. Kullanıcı Instagram'da ekleyeceği trend sesi seçince doğru cevapla yeniden render alınır; ses ile ekrandaki cevap uyuşmalı. *(Claude'un kararı.)*

## Teslim ve kabul

- `marketing/reels/out/songie-01-challenge.mp4`, `-02-kapisma.mp4`, `-03-o-kisi.mp4` + aynı adla `.png` kapaklar + `captions.md` (açıklama, hashtag'ler).
- Kabul kriterleri: ilk 1 sn'de kanca okunuyor, tüm metinler telefon ekranında (güvenli alan: üstten ~250 px, alttan ~400 px boş, Instagram arayüzü kapatmasın) okunaklı, renk paleti marka dışına çıkmıyor, karakterler videolar arasında tutarlı, CTA son 2 sn'de net.

## Builder'a bırakılanlar

- Her Reels'in saniye saniye storyboard'u ve metinlerin tam ifadesi (yukarıdaki fikirlere sadık kalarak).
- Kie'de hangi video modelinin seçileceği, ilk kare / prompt detayları.
- Animasyon zamanlamaları, geçiş türleri, efekt sesi kaynakları (telifsiz / lisanslı olmak şartıyla).
- Remotion proje yapısı, bileşen ayrımı.
