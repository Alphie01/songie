# Soğuk Oda (eskisehir-laboratuvar): öz-QA, 1. tur

Denetim: `case:check` hatasız. Tek uyarı, görsellerin henüz üretilmemiş olması (22/22).
`bölüm 4 · kanıt 63 · iz 41 · iz saati 64 · bütçe 36 · hedef 22 · karakter 10 · şüpheli 6 · görsel 22 (8 fotoğraf/kamera) · belge türü 15 · ses kaydı 3 · sorgu 9 (128 soru, 16 sesli cevap) · son bölüm öncesi kanıt 57/63`

Zor mod ölçüleriyle yazıldı: 4 bölüm, 120 dk, "zor".

## Çözüm özeti
- **Fail (who):** Prof. Dr. Halil Ersoy, bölüm başkanı.
- **Suç ortağı (accomplice):** Can Özer, damadı.
- **Yöntem (how = h-ilac):**
  - 17:07’de, seminer sırasında, iç açma kolunun pimini söktü.
  - 21:27’de otomattan aldığı sütlü kahveye zolpidem kattı.
  - Sinan 22:05’te uyuşmuş halde soğuk odaya girdi ve kapıyı arabayla tuttu.
  - Halil 22:14’te arabayı çekti; kapı yayla kapandı. Kapıya notu yapıştırdı, 22:16’da B-205’ten çıktı.
- **Alibi hilesi (alibi = a-uzak):**
  - Can, 23:29–23:48 arasında Ankara’dan UzakDestek’le Sinan’ın bilgisayarına bağlandı. 4.5 bölümünü sildi, başvuruyu gönderdi ve WhatsApp Web’den Ece’ye “Gönderdim” yazdı.
  - 23:43’te Halil’i aradı. Halil restoranda masaya “Sinan arıyor” diye oynadı.
- **İkinci suç (second = s-patent):** Halil, 2024 BAP ara raporunun gizli ekindeki diziyi damadına verdi. Ersa (Can ve Selda Özer) diziyi patentledi, Feronya’dan 1,8 milyon TL aldı ve 600 bin TL Halil’in eşine gitti. İtiraz gelirse 3,5 milyonluk ikinci ödeme yanacaktı.
- **Motif (why):** y-patent.
- **Kapanma dakikası (when):** w-2214.
- **Silinen bölüm (removed):** r-45.
- **Yerleştirilen kanıt (plant):** p-pazar (15 Şubat 14:31).
- **Kanıt sorusu (proof):** e-hts-halil, e-telefon-sinan, e-uzak, e-saat. Hepsi 3. bölümde.

## Bölüm bölüm akış ve zorluk eğrisi
- **1. bölüm (kaza → cinayet):**
  - OYİ, bakım defteri ve 112 kaydı “kaza değil” sonucunu verir.
  - Herkesin anlatısı, Sinan’ın 23:41–23:44’te hayatta olduğu varsayımına dayanır: portal, mesaj, Nihat’ın tanık olduğu telefon, Recep’in 23:20’de gördüğü “oturan adam”.
  - Bu varsayımla Halil 23:04’ten itibaren restoranda olduğu için temiz görünür.
  - Adaylar:
    - Ece: en son çıkan, veri uydurma, bardaklar onun yanındayken yalnız kaldı;
    - Yusuf: gece gizlice geldi, yalan söyledi, kapıyı en iyi o biliyor;
    - Gülşen: rakip, 00:20’ye kadar binada, intihal kavgası;
    - Burak: tehdit e-postası.
  - Halil için ince işaretler var ama bağlam yok: 17:06 kartı, kahve, defterdeki “bakarız”, Ece’nin “mesaj düzgündü” sözü.
  - Hedef: Halil ≤%30.
- **2. bölüm (kapı kaydı):**
  - Logger: kapı 22:14:30’da kapandı, sabaha kadar açılmadı.
  - FPLC: son komut 22:11.
  - Toksikoloji: zolpidem, mide içeriğinde kahveyle. Bardak raporu da var.
  - Aynı bölümün başında, Yusuf’un çekmecesinde pim çıkar (tuzak).
  - Logger’ın “pil zayıf” notu, kısa bir açılışın kaçmış olabileceği şüphesini 3. bölüme kadar açık tutar. Bu yüzden şu alternatif ayakta kalır: Sinan 22:14’te çıktı, 23:41’de gönderdi, gece yarısı Yusuf ya da Ece onu kapattı.
  - Kamera (DVR +7 dk) düzeltilirse Ece 23:38–23:44 arasında çay ocağındadır.
  - İkinci suç fark edilir: sürüm karşılaştırmasında 4.5 bölümünün metni (Ersa, BAP ara raporu) ve sesli mesaj (“bölüm başkanımıza bu sabah gösterdim”).
  - Ersa’nın kime ait olduğu 3. bölüme kadar açık değildir.
  - Hedef: Halil ≤%55.
- **3. bölüm (uzak masa):**
  - Firma yazısı kapı kaydının güvenilirliğini kesinleştirir.
  - Saat verisinde 22:13’ten sonra sıfır adım vardır.
  - Adli bilişim raporunda UTC saatlerle uzak bağlantı görünür: 20:29–20:48 UTC = 23:29–23:48.
  - Telefon raporu: mesaj bağlı cihazdan atılmış, Halil’le hiç arama yok.
  - HTS: 23:43’te arayan Can.
  - Gazete: Ersa, Can ve Selda Özer’in.
  - BAP: gizli eke yalnızca Halil erişmiş.
  - Hafta sonu kart kaydı ve OYİ’nin ilk çekmece dökümü tuzağı açar.
  - Hedef: ~%80.
- **4. bölüm (mühür, doğrulama):**
  - IP abonesi Selda Özer (Ümitköy, Ersa’nın adresi). Modemde “CAN-DIZUSTU” görünür.
  - Can’ın HTS kaydı, Ersa banka dökümü ve reçete sorgusu (Halil’in zolpidemi) gelir.
  - Can’ın sorgudaki çöküşü burada açılır.
  - Bölüm sahnesi ve başlangıç belgeleri (UBTA yazısı, etik kurul) nötrdür.

## Zincir (her halkanın son bölümden önce kanıtı var)
1. **Kaza değil, pim 17:07’de söküldü:** e-bakim, e-oyi, e-112, e-logger (17:07 açılış), e-kart (17:06 Halil), e-mert-1 (seminer), e-teknik.
2. **Zolpidemli kahve:** e-tox, e-bardak, e-ece-1, e-otomat; 4. bölümde e-recete doğrular.
3. **22:14’te kapatıldı, bir daha kımıldamadı:** e-logger, e-video (21:52:10 + 00:22:10 = 22:14:20), e-fplc, e-teknik, e-saat, e-ece-mesaj (22:20 cevapsız).
4. **22:16’da B-205’ten çıkan Halil:**
   - Belgeler: e-kamera, e-dvr-servis, ph-k2-b, ph-gate-b (aynı kaban ve atkı, kart 22:48), e-kart, e-ece-1, e-halil-1 (“22:05” yalanı).
   - DVR farkı servis formu olmadan da çıkar: Ece’nin B-204 kartı 22:18, kamerada 22:25.
5. **Uzak bağlantı:** e-uzak, e-telefon-sinan, e-sunucu, e-portal-log, e-kamera + e-otomat (Ece çay ocağında).
6. **Sahte “Sinan” telefonu; yanılan tanıklar:** e-hts-halil, e-nihat, e-telefon-sinan, e-adisyon (kuver 23:04), e-rekon, e-recep.
7. **Can suç ortağı:** e-gazete, e-avukat-mail (buluşçu Can Özer), e-mert-1, e-hts-halil, e-uzak (Ankara IP), e-tren; 4. bölümde e-operator ve e-hts-can.
8. **İkinci suç ve motif:** e-bap, e-avukat-mail, e-sesli, e-surum, e-defter, e-opsiyon; 4. bölümde e-banka.
9. **Tuzak:** e-oyi (13 Şubat çekmece dökümü: pim yok, takım tam), e-arama-b202 (S beden eldiven, takım dışı alyan), e-kart-hafta (15.02 14:31 yalnızca P-0117), e-yusuf-1 (izin).
10. **Masumların 22:05–22:16 alibisi:** ph-gate-a, e-kart, e-kamera, e-video-log, e-video, e-burak-otel, e-tren.

## Karmaşıklık katmanları (zor mod kontrol listesi)
- **İç içe iki suç:** Cinayet, bir patent hırsızlığını ve opsiyon parasını örter.
- **Çok rollü suçluluk:** Fail Halil. Suç ortağı Can (alibiyi kurar, metni değiştirir). Feronya’dan Burak da kaynağı şüpheli patente göz yumar; suça ortak değildir.
- **Sahte alibi (en az 3 belgeyle çöker):** e-uzak + e-saat + e-telefon-sinan + e-hts-halil (+ e-logger/e-teknik).
- **Tuzak şüpheliler:**
  - Yusuf: yerleştirilmiş pim. Ele veren dürüst ayrıntılar: S beden eldiven, takım dışı alyan, ilk dökümde pimin olmaması, pazar günkü kart.
  - Ece: veri uydurma; bardaklar yanında yalnız kaldı; 23:41’de laboratuvardaydı.
- **Dürüst ama yanılan tanıklar:**
  - Recep: kaban.
  - Nihat: arayanı Sinan sandı; Halil’in geliş saatini 22:30 sandı.
  - Gülşen: çarpma sesinin saati.
- **Uzun tablolara gömülü kilit satırlar:**
  - Kart kayıtları: 46 ve 31 satır.
  - HTS kayıtları: 40 ve 26 satır.
  - Banka dökümü: 27 satır.
  - Logger: 51 satır.
  - Kamera dökümü: 24 satır.
  - Sunucu kaydı: 27 satır.
- **Mini bulmacalar:**
  1. Kayıt ofsetinden çarpma saati;
  2. DVR saat farkı (kart kaydıyla bulunabilir);
  3. UTC → TSİ;
  4. ilk çekmece dökümü ile hafta sonu kart kaydı;
  5. adisyondaki ikinci kuver saati;
  6. Ece’nin mesaj üslubu (küçük harf/noktasız ve düzgün yazım).
- **Yan hikâyeler:**
  - Ece’nin şekli;
  - Yusuf’un etanol satışı;
  - Gülşen’in izinsiz erişimi;
  - Burak’ın gizli opsiyonu.

  Her biri bir belgeyle kapanır: e-etik, e-stok, e-sunucu, e-opsiyon.

## Masumları aklayan belgeler
| Şüpheli | Sırrı | Yalanı | Aklayan |
|---|---|---|---|
| Ece | Şekil 3’te bant kopyalama | “Tartışmadık”, “şekilde sorun yok” | ph-gate-a (22:09), e-kart (22:04–22:16), e-kurye, e-kamera + e-otomat (23:39 çay ocağı), e-tox (hidroksizin negatif) |
| Yusuf | Etanol hırsızlığı | “Gece gelmedim”, “ilacımı almaya geldim” | e-kart (16:41 çıkış, 23:58 giriş), e-saat (Sinan 22:13’ten sonra hareketsiz), e-oyi, e-kart-hafta |
| Gülşen | İzinsiz klasör erişimi | “2.3’ü Ece’nin sunumunda gördüm” | e-video-log (kesintisiz kamera), e-video (çarpma kayıtta) |
| Burak | Ersa ile gizli opsiyon | “Başka firmayla görüşmüyoruz” | e-kart (21:36), e-burak-otel (21:39 bariyer, 21:58 oda, bar) |
| Can | Suç ortağı (masum değil) | “Akşam konuşmadık” | Cinayetten değil, yalnızca fiziksel kapatmadan aklanır: e-tren, e-hts-can |

Yanıltıcı ipuçları (7): e-mail-ece, e-arama-b202, e-mail-gulsen, e-mail-burak, e-recep, e-ece-mesaj, e-nihat.

## Sorgular
- **Dağılım:** 9 sorgu. Halil, Ece ve Yusuf ikişer kez sorgulanır; ikinci sorgular minAct’li izle açılır. Gülşen, Burak ve Can birer kez sorgulanır; bu üç sorgu `needs` ile sonraki bölümlerde derinleşir.
- **Sesli cevaplar:** 16.
- **Halil hiçbir zaman itiraf etmez.** Önce aramanın Can’dan geldiğini kabul eder ama yeni bir yalana geçer. Sonra BAP ekini okuduğunu ve “bir fikir verdiğini” kabul eder. Uzak bağlantı karşısında restoran alibisine sığınır.
- **Can’ın çöküşü** (uzak bağlantıyı Halil’in isteğiyle yaptığını kabul etmesi) yalnızca 4. bölümdeki e-operator belgesiyle açılır. Zincir bu itirafa dayanmaz.
- **Sorgudan çıkan belgeler:**
  - e-kurye: iv-ece-2 açar.
  - e-stok: iv-yusuf-2 açar.
  - Bunlar zincirde yan kanıttır.

## Bilinen riskler
- **Kanıt ve iz sayısı:** 63 kanıt ve 41 iz. Dosya büyük (313 KB); kör testte okuma yükü yüksek olabilir.
- **2. bölümde Halil’e erken yönelme:** Logger’daki 17:07 açılışı ile 17:06 kartı yan yana konursa Halil erken öne çıkabilir. Bardak raporundaki parmak izleri de aynı yöne iter. Karşı ağırlıklar:
  - restoran alibisi (portal, mesaj, telefon);
  - Yusuf’un çekmecesindeki pim;
  - Yusuf’un 14:05’teki 4 dakikalık soğuk oda girişi (pim o sırada da sökülmüş olabilir);
  - logger’ın pil uyarısı.

  Kör test burada %55’i aşarsa, bardak raporundaki Halil izleri 3. bölüme itilebilir.
- **Bilişim ayrıntıları:** IP, NAT, UTC ve WhatsApp bağlı cihaz kavramları belgelerin içinde düz dille açıklandı. Yine de bazı oyuncular için yoğun olabilir.
- **Pimin söküm saati kesin kanıtlanmaz.** 17:07, laboratuvar boşken yapılmış tek açıklanamayan açılıştır. Halil’in “iç kapıdan B-205’e geçtim” beyanı logger’la çelişir. Zincir, pimin ne zaman söküldüğüne değil, 22:14 kapanışına dayanır.
- **Toksikoloji ön raporu** 3 günde “ivedi ön rapor” olarak geldi. Kesin rapor ayrıca bekleniyor.
- **Görseller:** Kamera karelerinde kaban ve atkı benzerliği görünmeli. Halil’in portresinde kaban yok; bu bilinçli.
- **Şema:** Gerek olmadı; uydurma alan eklenmedi.
