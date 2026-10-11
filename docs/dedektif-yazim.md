# Dedektif Masası: vaka yazım rehberi

Bir vaka `games/detective/server/cases/<slug>/case.json` dosyasıdır. Biçim zod şemasıyla tanımlıdır: `games/detective/shared/case-schema.ts` (alan açıklamaları orada). Bu rehber, vakanın **iyi** olması için uyulması gereken kuralları anlatır.

Hedef: 3–6 arkadaşın 45–90 dakikada, birlikte, gerçekten düşünerek çözdüğü, Türkiye'de geçen, gerçekçi bir polisiye. Kimse "bu nereden çıktı" dememeli. Sonuç ekranında herkes "aslında oradaydı" demeli.

## Oyun nasıl oynanır (yazarken aklında olsun)
- **Başlangıç:** Oyuncular 1. bölümün sahnesini okur. Dosyada bölüm başı kanıtları ve birkaç iz vardır.
- **İzler:** Her iz soruşturma saatine mal olur ("Kapıcıyla yeniden görüş", 2 saat). Açılan iz yeni belgeler (`unlocks`) ve yeni izler (`leadsTo`) getirir. Saat bütçesi (`hoursBudget`) sınırlıdır, yani oyuncular **her izi açamaz**. Bu bilinçli bir tasarım; seçim yapmak oyunun yarısıdır.
- **Bölüm geçişi:** Bölümün `advance.leads` izlerinin hepsi açılınca ya da bölümde `advance.hours` saat harcanınca sonraki bölüm gelir. O bölümün sahnesi ve kanıtları dosyaya girer.
- **Dosyayı kapatma:** 2. bölümden itibaren her an yapılabilir. Oyuncular suçlama formunu (`questions`) doldurur ve puan alır.
- **İpucu:** Takılan ekip bölüm başına en çok 2 ipucu alabilir (`hints`). Her ipucu puan götürür.

## Yapı ve ölçüler
- **Bölüm:** 3–4 (`acts`).
  - 1\. bölüm olay ve ilk tablodur.
  - 2\. bölüm derinleşmedir: sırlar çıkar, ilk şüpheli çöker.
  - 3\. bölüm kırılmadır: yeni gelişme, ikinci olay, yalanın çözülmesi.
  - 4\. bölüm (varsa) son düğümdür: doğrulama ve itiraf öncesi.
- **Kanıt:** 30–45 (`evidence`). Her bölüm başında 3–8 kanıt, geri kalanı izlerle gelir.
- **İz:** 18–28 (`leads`), maliyeti 1–4 saat.
  - Toplam iz maliyeti bütçenin **yaklaşık 1,6 katı** olsun. Böylece oyuncular izlerin ~%60'ını açabilir.
  - `targetHours` iyi bir ekibin harcayacağı saattir: bütçenin ~%60'ı.
- **Şüpheli:** 4–6 (`suspect: true`). Kurban ve yan karakterlerle toplam 7–12 karakter.
- **Gerçek:** 12–25 madde (`facts`), her biri tek ve doğrulanabilir bir önerme ("Selim 21:40'ta yalıdaydı.").
- **Soru:** 5–7 (`questions`).
  - `id: "who"` olan `kind: "suspect"` sorusu zorunlu (fail kim).
  - Ayrıca "nasıl" (yöntem), "neden" (motif), 2–3 ayrıntı sorusu (saat, yer, araç, suç ortağı, eşyanın nerede olduğu) ve bir `kind: "evidence"` sorusu ("Failin yalanını en açık hangi belge çürütüyor?") olsun.
  - `who` 30 puan, kanıt sorusu 15 puan, diğerleri 8–15 puan; toplam 100.
  - Her `choice` sorusunda 4–5 seçenek olsun, her biri **makul** görünsün (en az ikisi dosyadaki bir yanlış izle desteklenmeli).
  - `solution[q]` kabul edilen cevaplar listesidir. Kanıt sorusunda birden çok belge kabul edilebilir.

## Adil oyun kuralları (pazarlıksız)
1. **Fail 1. bölümde tanıtılır** ve 1. bölüm kanıtlarında adı geçer.
2. **Çözüm son bölüm açılmadan bulunabilir.** `truth.chain` zincirindeki her halkanın en az bir kanıtı son bölümden önce erişilebilir olmalı. Son bölüm doğrulama ve kesinlik katar ama zorunlu değildir.
3. **Her kilit çıkarım en az iki bağımsız kanıta dayanır** (`chain[].evidence` en az 2 öge). Biri kaçırılırsa diğeri kurtarır. İzler arasında dağıtın: tek bir pahalı ize bağlamayın.
4. **Hiçbir kanıt yalan söylemez,** karakterler söyler. Resmî belgeler (otopsi, HTS, banka, kamera, kart kaydı) doğrudur. Yalanlar ifadelerde, mesajlarda ve mektuplardadır. Bir resmî belge hatalıysa (bozuk saat, kayık kamera saati), bu dosyada **başka bir belgeyle açıkça** belirtilmelidir ("DVR saati 7 dk ileri, servis kaydı").
5. **Masum şüphelilerin de sırrı ve yalanı vardır.** Her şüpheli bir şey saklamalı (ilişki, borç, küçük bir suç, utanç). Böylece herkes şüpheli görünür. Ama her sır, failin değil kendi sırrı olduğunu gösteren bir belgeyle açıklanabilmeli.
6. **Yanıltıcı ipucu (`truth.redHerrings`):** 3–5 tane. Her biri dosyadaki başka bir belgeyle çürütülebilmeli. "Rastgele tesadüf" yok; her yanıltıcı ipucunun bir açıklaması vardır.
7. **Zaman çizelgesi tutarlı.** `truth.timeline` dakika dakika gerçeği verir. Hiçbir doğru belge bununla çelişemez. Yolculuk süreleri gerçekçi olsun (İstanbul trafiği, vapur saatleri).
8. **Çözümde sezgi değil çıkarım olsun.** "Kim bilebilirdi?" sorusunun cevabı dosyada olmalı (ör. alerjiyi yalnızca üç kişi biliyordu ve bunu gösteren belge var).
9. **Tek çözüm.** Aynı kanıtlarla başka bir şüphelinin de fail olabileceği bir okuma olmamalı. Her masum şüpheliyi aklayan **en az bir** kanıt bulunmalı (alibi doğrulaması, fiziksel imkânsızlık).
10. **Belgeler sonucu söylemez.** Polis raporu "fail X'tir" demez. Başlıklar ve özetler (`title`, `summary`) nötrdür: "Otopark kamera kaydı, 21:00–23:00", "Kâhyanın ikinci ifadesi". İz sonuçları (`outcome`) olayı söyler, yorumu değil: "Kapıcı, ilk ifadesinde saati yanlış söylediğini kabul etti."

## Katmanlı kanıt: iyi bir vakanın dokusu
- **Çapraz okuma:** Kilit ipuçları tek belgede değil, iki belgenin yan yana okunmasında çıkar.
  - Ör. ifadede "eve 22:30'da döndüm" yazar; otopark kart kaydında araç 21:52'de girmiştir; HTS'de 22:05'te evin baz istasyonundan arama vardır.
  - Oyuncu bunu kendisi bağlamalı.
- **Ayrıntıya gömme:** Kritik bir bilgi bazen 14 satırlık bir fişin 9. satırında, bir banka dökümünün sıradan görünen bir kalemindedir. Ama okunabilir ve dürüst olmalı.
- **Belge çeşitliliği:**
  - Bir vakada en az 9 farklı belge türü kullanılsın.
  - Fotoğraf ve kamera karesi en az 6 olsun; bunların görsel tarifi (`images`) somut ve metinsiz olmalı.
  - En az bir kroki (`floorplan` ya da konumda `plan`) bulunsun.
- **Ses kayıtları (`audio`):**
  - Her vakada 2–4 ses kanıtı olsun: hat dinleme kaydı, 155/112 ihbar kaydı, telesekreter, sesli mesaj, gizli kayıt, sorgu kaydı.
  - Bunlar araçla seslendirilir: telefon kayıtları hat filtresiyle, her karakter kendi sesiyle.
  - Konuşan her karakterin `voice` alanı dolu olmalı. Operatör gibi yan sesler satırda `name` + `voice` alır.
  - Kayıtlar 20–90 saniyelik, doğal konuşma dilinde olsun: yarım cümleler, duraksamalar (`pause`), söyleyiş yönergeleri (`delivery`: "fısıldayarak", "nefes nefese").
  - İpucu sesin içeriğinde olur (söylenen saat, arka plandaki vapur düdüğü, yanlış söylenen bir ad). Arka plan sesleri `ambience` ile dökümde yazılı görünür, ses efekti olarak üretilmez.
  - Dökümde görünmeyen hiçbir ipucu olmasın.
- **Anlatıcı:** `meta.narrator` sesi bölüm sahnelerini okur.
  - Sahneler sesli okunmaya uygun yazılsın: kısa cümleler, ritim.
  - Kısaltma ve rakam yığını olmasın ("saat dokuzu yirmi geçe" yazılabilir).
- **Belgelerin gerçekliği:**
  - Türkiye'deki resmî biçimler: Cumhuriyet Başsavcılığı soruşturma numarası (2024/18734 gibi), Emniyet Müdürlüğü birimleri (Cinayet Büro Amirliği, Olay Yeri İnceleme Şube Müdürlüğü), Adli Tıp Kurumu raporu, HTS kaydı, MASAK, sigorta eksper raporu.
  - İfade tutanağı: "Soruldu: … Cevaben: …" dili, hak hatırlatması.
  - Yerler, mahalleler ve ulaşım gerçek olsun. Kişi ve şirket adları kurmaca olsun; gerçek bir kişiye ya da markaya benzemesin.
- **Ses ve ton:** Gerçekçi, yetişkin polisiyesi. Şiddet klinik dille anlatılır, istismar edilmez. Cinsel içerik yok, çocuklara yönelik şiddet yok. Karakterler karikatür değil, motifleri insani olsun: borç, kıskançlık, korku, gurur, miras, örtbas.
- **Uzunluklar:**
  - Bir ifade 6–14 soru-cevap.
  - Bir rapor 3–6 bölüm.
  - Bir mesajlaşma 8–30 mesaj.
  - Bölüm sahnesi 120–260 kelime, ikinci şahıs değil, sinematik üçüncü şahıs ya da komiserin gözünden.
  - `truth.story` 250–500 kelime.

## İzler (lead) nasıl yazılır
- İz bir **eylem** olarak yazılır: "Yalının bahçıvanını bul", "Kurbanın son altı aylık banka hareketlerini iste", "Otel resepsiyonundaki kamera kaydını incele".
- `description` neden mantıklı olduğunu söyler, sonucu söylemez.
- Bir iz 1–3 belge açar. Bazı izler başka izleri açar (`leadsTo`). Bir dal 3–4 iz derinliğe inebilir.
- **Çıkmaz izler:** 2–4 iz az değerli bilgi getirir. Gerçekçi soruşturma böyledir. Ama hiçbir iz boş değildir; çıkmaz izin belgesi de bir şüpheliyi aklar ya da atmosfer katar.
- Bölüm geçiş izleri (`advance.leads`) bölümün doğal düğümüdür ("Kâhyanın odasını ara"). Her bölümde 1–2 tane olsun. `advance.hours` ise sıkışan ekibi ilerletir: o bölümün açılabilir izlerinin toplam saatinin ~%70'i.

## Görseller (`images`)
- Anahtar kısa ve nötr olsun: `p-selim`, `scene-library`, `cam-garage-2148`, `obj-cufflink`. Sonucu ele vermesin.
- `prompt` İngilizce, somut ve **yazısız** olmalı: tabela, ekran yazısı, belge, rakam, logo istenmez. Kişi, ışık, mekân, nesne, kamera açısı ve dönem tarif edilir.
  - Ör. "Overhead crime-scene photograph of a mahogany study floor, an overturned brass desk lamp, scattered papers without legible text, a dark stain near a Persian rug, harsh flash lighting".
  - Stil öneki (gerçekçi fotoğraf, Türkiye, metinsiz) araç tarafından eklenir; tekrar yazma.
- **Portre:** Omuz çekimi, nötr arka plan, yaş, giyim, yüz ifadesi, bir ayırt edici özellik. Ünlü birine benzetme yok.
- **Kamera karesi (`cctv`):** Yüksek açılı, geniş açılı, düşük çözünürlüklü güvenlik kamerası görünümü. Zaman damgası **CSS ile** basılır, görselde rakam istenmez.
- `alt` görselde gerçekten görülebilenin Türkçe tarifi olsun. Görsel üretilmemişse oyuncu bu tarifi okur, yani **ipucu görselde ise `alt`'ta da yazmalı** (ör. "Sol kolunda saat yok, bileğinde açık renk bir iz var").
- Vaka başına toplam 18–26 görsel olsun: 1 kapak, şüpheli ve önemli karakterlerin portreleri, her bölüm için 1 sahne, geri kalanı kanıt fotoğrafı ve kamera karesi.

## Teslim ve denetim
1. `pnpm --filter @songie/detective case:check <slug>` hatasız geçmeli; uyarıları oku ve gerekçesiz bırakma.
2. `pnpm --filter @songie/detective case:export <slug>` oyuncunun göreceği metni üretir (`cases/<slug>/.export/`). Kör çözüm ve şeytanın avukatı testleri bununla yapılır.
3. QA sonuçları `cases/<slug>/QA.md` dosyasına yazılır.
