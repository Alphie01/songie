# Kemerli Han Yangını — öz-QA (1. taslak, zor mod + sorgular)

Denetim: `case:check` hatasız. Tek uyarı görsellerin henüz üretilmemiş olması (26/26).
`bölüm 4 · kanıt 64 · iz 43 · iz saati 70 · bütçe 39 · hedef 23 · karakter 12 · şüpheli 6 · görsel 26 · belge türü 15 · ses kaydı 3 · sorgu 9 (115 soru, 16 sesli cevap) · son bölüm öncesi kanıt 57/64`

## Çözüm özeti
- **Fail (who):** Cengiz Ayvaz, han yöneticisi; planladı ve düzeneği kendisi kurdu.
- **Suç ortağı (accomplice):** Serkan Doğan, Doğan Tadilat. Sahte faturaların ortağı. Yangın gecesi Cengiz'i hana götürüp otoparkta bekledi, ertesi gün saatler hakkında yalan söyledi.
- **Görünen suç:** Kundaklama. **Gizli ikinci suç:** Zimmet. Üç nakit kiracıdan alınan kiranın aylık 12.000 TL'si bildirilmedi; Doğan Tadilat yapılmamış işlere fatura kesti ve bedelin yarısı yöneticiye döndü. Kanıtı kira defterleri ile karbonlu koçanlardı; bunlar 21 Eylül'de denetime gidecekti.
- **Yöntem:** Yangın 23:47–00:05 arasında kuruldu. Depodaki ekip tineri kolilere döküldü. Ekibin 500 W halojen projektörü yüzüstü yatırılıp mekanik zaman ayarlı prize takıldı; priz 02:15'e kuruluydu.
- **Alibi hilesi:** Pide salonu kamerasının saati bir saat geri. Cengiz bunu mart ayındaki bisiklet hırsızlığı tutanağından biliyordu. Yemekten 23:20'de çıktı, 23:47'de girdi; kayıt girişi 22:47 diye, yani yemeğin ortasına yazdı. Telefonunu evde bıraktı, yangın saatinde de evdeydi.
- **Tuzaklar:**
  - Depodan alınan 4 numaralı ekip yeleği, garsonun yelekli kişiyi şef Volkan sanmasına yol açtı.
  - Yönetim dolabından alınan "12" etiketli yedek anahtar, arka kapının önüne bırakılıp kiracı Emre'yi işaret etti.
- **Cevaplar:** who=cengiz · accomplice=serkan · how=h-timer · why=y-arsiv · alibi=a-saat · second=s-zimmet · time=t-2347 · key=k-yonetim · proof=e-cengiz-banka / ph-istasyon / e-serkan-2.

## Bölüm akışı ve hedeflenen güven
- **1. bölüm (Duman):** Kasıt şüphesi (pour pattern, dişlili parça), Emre'nin 7 kolisi ve sigortası, arka geçitteki "12" anahtar, Volkan'ın tiner yalanı, Tarık'ın yangın maddesi, Sevim'in mesajı var. Cengiz'in alibisi sağlam görünüyor: fotoğraf 23:10, adisyon 23:18, tanıklar. Ona dair ince ipuçları da var: arşivin taşınması, "kokusuz ilaç", 112'deki "depo kilitliydi". Hedef: Cengiz ≤%30, en az 3 rakip teori (ihmal ya da Volkan, sigorta için Emre, tahliye için Tarık).
- **2. bölüm (Pimler):** Bölüm başında bilirkişi düzeneği gösteriyor, yani yangın saatindeki alibiler değersizleşiyor. Sonra şunlar geliyor:
  - Hatice: depo 19:35'te olağandı, Cengiz'le 19:57'de birlikte çıktılar.
  - Pide kamerası: arka kapıdan anahtarla tek giriş, saat "22:47".
  - Anahtar listesi: iki anahtarı birden yalnızca Cengiz ve Sabri taşıyor.
  - Garson: giren Volkan'dı.
  - Site görevlisi: Emre "on buçukta" çıktı.

  Bu noktada **paradoks** ortaya çıkıyor: anahtar sahiplerinin hepsi 22:47'de başka yerde. İkinci suç da burada fark ediliyor: makbuz ile kayıt farkı, sahte ilaçlama ödemesi, hamaliye. Hedef: Cengiz ≤%55 (motif var, alibi "kusursuz").
- **3. bölüm (Bir saat):** Kamera farkı ve alibinin çökmesi. Cengiz'i hanın orada gösteren belgeler: Serkan'ın aracının otopark kaydı (plaka 1. bölümdeki yükleme listesiyle eşleşiyor), Serkan'ın HTS'i, Cengiz'in kartı ve istasyon karesi. Hedef ~%80. Bu bölüm 2. bölüm saat sınırıyla ya da `l-arka-kamera` ve `l-anahtar` izleri açılınca gelir.
- **4. bölüm (Kül):** Sahnesi nötr (hastane). Doğrulama izle geliyor: bekçinin ifadesi, arama (ikinci priz, boş "12" kancası, 4 numaralı tinerli yelek, kira farkları defteri) ve MASAK raporu.

## Zincir (hepsi 4. bölümden önce kanıtlanabilir)
1. Kasıt, depo, 02:15 düzeneği: e-bilirkisi-on, e-bilirkisi-rapor, e-elektrik, ph-timer, e-itfaiye.
2. Düzenek 19:35'ten sonra kuruldu, 19:57'de han boşaldı: e-hatice, ph-depo-1748, e-santiye-grup, e-on-dokum.
3. Tek giriş arka kapıdan anahtarla oldu, depo yeniden kilitlendi: e-arka-dokum, ph-arka-2247, e-on-dokum, e-112, e-tutanak, ph-avlu.
4. Anahtar sahipleri: e-anahtar; Sabri için e-necla ve e-on-dokum; Tarık için e-otel.
5. Kamera farkı:
   - e-itfaiye: kilit 02:58'de kesildi, kayıt 01:58 diyor.
   - Kepenk gerçekte 00:00'da indi, kayıt 23:00 diyor (Burak).
   - e-mart: farkın resmî tespiti, Cengiz hazır bulunmuş.
   - ph-avlu: saati doğru kamera, fener 23:49–00:03.
6. Alibinin sonu: e-yemek-fis, e-lokanta (23:20 Doblo), e-otopark ile e-kiracilar (16 DT 1907), e-serkan-hts (Hamitler–Altıparmak–Hanlar), e-cengiz-hts (telefon hareketsiz), e-cengiz-banka (00:19), ph-istasyon (yelekli adam, **** 3318), e-serkan-2.
7. Yelek ve anahtar tuzakları:
   - Yelek: 17:48'de dört yelek vardı, yangında üç kalıntı bulundu. Giren kişi gelirken yeleği zaten giyiyordu. Demek ki yelek 17:52 ile 23:47 arasında alındı; depo bu aralıkta yalnızca 19:35'te Cengiz tarafından açıldı.
   - Anahtar: etiketli yedekler yönetim dolabında duruyor, dolabın anahtarı yalnızca Cengiz'de (e-anahtar, e-hatice, iv-emre-2).
8. Hazırlık: e-necla, e-hatice, e-ilaclama, e-whatsapp, e-gider (ilaçlama 3.500, hamaliye, "avlu için" priz), e-elektrik (avlu dijital rölede).
9. Motif: e-avukat, e-makbuz ile e-kiracilar (2.000 + 3.500 + 6.500 = 12.000), e-cengiz-banka (her ay 12.000 ATM), e-dogan-fatura ile e-rolove (çatıya 2011'den beri dokunulmamış, oluklar tıkalı), e-sikayet.
10. Suç ortağı: e-serkan-hts, e-otopark, e-lokanta, e-serkan-1, e-dogan-fatura, e-cengiz-banka (Doğan'dan 21.000 "borç iadesi").
11. Masumlar: bkz. tablo.

## Mini çıkarım bulmacaları
1. **Kamera saat farkı:** itfaiye 02:58 / kayıt 01:58; kepenk 00:00 / kayıt 23:00; avlu kamerası 23:49 / kayıt 22:47 + 2 dk.
2. **Kira farkı toplamı:** üç makbuz eksi yönetim kaydı = 12.000; bankada her ay 12.000 ATM yatırma. Arama defterindeki "7→2 · 9→3,5 · 12→6,5 = 12" bunu doğrular.
3. **Yelek sayımı:** fotoğrafta 4, kalıntıda 3, giren kişi yelekle geldi; buradan alınma zamanı çıkar.
4. **Baz istasyonu güzergâhı:** Serkan'ın telefonu sırayla H2, H1, Altıparmak, Hanlar ×3, Altıparmak, H2, H1 istasyonlarından geçiyor; istasyon adları satırlarda yazılı.
5. **Fatura ile rölöve:** 2025'teki 185.000 TL'lik kurşun aktarma faturası ile "2011'den beri müdahale yok" tespiti; 8 Eylül'de faturalanan oluk temizliği ile 8–9 Eylül'de "oluklar tıkalı".
6. **Prizin kadranı:** durma konumu 02:40, sigortanın atması ve 112 çağrısıyla örtüşüyor; prizin saati doğru kurulmuş.
7. **Yol süresi:** Emre siteden 23:02'de çıkıyor, otoyola 23:14'te giriyor, köprüden 23:58'de geçiyor (61 km).

## Masumları aklayan belgeler
| Şüpheli | Sırrı / küçük suçu | Yalanı | Aklayan (saatli) |
|---|---|---|---|
| Emre | Antika koleksiyonu kayıtsız sattı, yandı diye bildirdi | "Bütün gece evdeydim", "iade mal" | e-site-log (23:02), e-hgs (23:14 / 23:58 / 03:46), e-on-dokum (19:05'te çıktı, geri dönmedi) |
| Volkan | Tiner ve projektörü depoda bırakıyordu, kabloyu izinsiz çekti | "Depoda tiner ve projektör yoktu" | ph-halisaha (23:52), e-halisaha (00:06); arka kapı anahtarı yok |
| Sevim | Sahte "el dokuması" etiketi; kamera kaydını sakladı | "Masa meselesi", "kamera kayıt alıyor mu bilmem" | e-hastane-kayit (22:07–00:52, 23:30 ve 00:15'teki hemşire notları) |
| Tarık | Otel ön protokolü (6 milyon avans), yemek | "Cuma sabahı geldim", "protokol yok" | e-otel (22:15–07:35 kapı açılmadı); depo anahtarı yok |

Yanılan dürüst tanıklar:
- Burak'ın saati doğru, kişi tespiti yanlış (yelek).
- Site görevlisi Kadir'in saati yanlış; 22:31'de çıkan, A bloktaki benzer plakalı 16 EK 2109'du.

Yanıltıcı ipuçları (7): ph-on-1905, ph-anahtar, e-whatsapp, ph-depo-1748, e-burak, e-tarik-1, e-site-gorevli.

## Sorgular
- 9 sorgu: Cengiz, Serkan ve Emre ikişer kez; Tarık, Sevim ve Volkan birer kez.
- İkinci sorgular `minAct`li izlerle açılıyor (l-emre-2 bölüm 2, l-cengiz-2 bölüm 3 başı, l-serkan-2 bölüm 3).
- Kilit kırılmalar:
  - Emre: ph-on-1905 gösterilince antikayı itiraf ediyor ve **e-hgs açılıyor**.
  - Serkan: e-serkan-hts gösterilince saatleri değiştiriyor ve **e-serkan-2 açılıyor**.
  - Volkan: ph-depo-1748 gösterilince tineri kabul ediyor.
  - Tarık: e-otel gösterilince perşembe geldiğini kabul ediyor.
  - Sevim: e-emre-1 gösterilince etiketleri, e-arka-dokum gelince kamerayı kabul ediyor.
- Cengiz hiçbir zaman tam itiraf etmiyor. Bankayla benzini kabul ediyor ama "hana gitmedim" diyor; Serkan'ın ifadesiyle "otoparkta yürüdüm" diyor. Kamera farkını "hatırlamıyorum" diye geçiştiriyor.

## Bilinen riskler
- **Araç hatası (yazara değil koda ait):** `validate.ts` → `reachable()`, bir sorgu cevabının `leadsTo`'su o bölümde açılamayan (`minAct`li) bir izi gösterirse sonsuz döngüye giriyor. O iz `leads` kümesine hiç eklenmiyor, ama her turda `changed = true` yapılıyor. İlk denetim bu yüzden takıldı (süreci ben durdurdum). Vakadaki bu tür bağlantıları kaldırdım; aynı izler zaten başka izlerden keşfediliyor. Diğer yazarlar da aynı tuzağa düşebilir, düzeltilmesi önerilir.
- **2. bölümün ipucu 2** kamera farkına doğrudan yöneltiyor. Bilinçli tercih (puan cezalı), ama kör testte erken kullanılırsa 3. bölüm hedefi (~%80) 2. bölüme kayabilir.
- **1. bölümde Cengiz'e ince işaretler var:** arşivin taşınması, "kokusuz ilaç", "depo kilitliydi", q9'daki "denetim" sözü. Keskin bir oyuncu "hedef arşivdi, o hâlde yönetici" diye erken düşünebilir. Buna karşı ağırlık: kusursuz görünen yemek alibisi, Emre'ye yerleştirilmiş anahtar, Volkan'ın yalanı. Kör testte ölçülmeli.
- **Hatice'nin "o bir şey aldı mı bilmem"** yan cümlesi, yelek çıkarımını destekliyor ama tek başına bir şey kanıtlamıyor. Çıkarım ph-depo-1748 + e-bilirkisi-rapor + ph-arka-2247 üçlüsüne dayanıyor.
- **Serkan'ın girmiş olması okuması:** Anahtar listesinde Serkan yok. İstasyon karesinde yelekli ve kartı kullanan kişi Cengiz, Serkan aracın yanında. Bu okuma 3. bölümde kapanıyor.
- **Sabri'nin kendisinin kurmuş olması okuması:** Avlu kamerasına göre 01:59–02:24 arası hareket yok (Sabri bekçi odasında). Düzenek 10–15 dakika sürüyor. Yanıkları ön yüzde.
- **Ölçüler üst sınırda:** iz sayısı 43 (sınır 45). Gerçek sayısı 48; rehberdeki 12–25 önerisinin üstünde, zor mod için bilinçli.
- **Görseller:**
  - cam-back-gate'te yüz görünmemeli.
  - cam-fuel'de yelekli adam ödeme ünitesinde, iri ve polarlı ikinci adam sürücü kapısında olmalı.
  - photo-dinner'da 16 kişi; photo-depot-day'de tam 4 yelek ve 11 koli.

## Düzeltme turu (kör test + şeytanın avukatı)

Son denetim: `bölüm 4 · kanıt 67 · iz 45 · iz saati 70 · bütçe 45 · hedef 26 · sorgu 9 (115 soru) · son bölüm öncesi kanıt 60/67`. Tek uyarı, görsellerin henüz üretilmemiş olması.

### Kritik
- **iv-serkan-2:**
  - Ne değişti: e-serkan-hts gösterilince Serkan artık yalnızca "çarşıya götürdüm, otoparkta indi, nereye gittiğini görmedim" diyor; açılan e-serkan-2 da bu kadarını içeriyor. Çanta, yelek, benzini kimin ödediği ve sabahki talimat belgeden çıkarıldı. Bu bilgiler sorgu sorularına taşındı ve her biri iki belge istiyor:
    - çanta: e-serkan-2 + ph-arka-2247;
    - yelek: e-serkan-2 + ph-istasyon;
    - benzin: e-serkan-2 + e-cengiz-banka;
    - süre: e-serkan-2 + e-otopark.
  - Ayrıca: q5 artık varsayımsız soruluyor ("Otoparkta ne oldu?"). q11 için de e-serkan-2 gerekiyor; sabah 07:20'de arayanın Serkan olduğu düzeltildi.
- **3. bölüm sahnesi** nötrleştirildi. Anahtar sahipleri, garson ve "itfaiye raporunu açıyor" çıkarıldı.
- **2. bölüm sahnesi:** Kolilere yapılan vurgu çıkarıldı.
- **1. bölüm:** Sahnedeki "dört saat" "beş saat" oldu.
- **l-arama** bölüm başından kaldırıldı. Başlık "Arama kararı için savcılığa yaz" oldu. `from`: ph-istasyon, e-serkan-2, e-gider; `minAct: 4`. Arama yapılan yerler yalnızca sonuç notunda geçiyor.
- **Kamera farkı 2. bölümde bedava çıkmasın diye:**
  - Pide kamerası dökümü ikiye bölündü. e-arka-dokum (2. bölüm) cihazın 06:00–23:00 dosyalarını kapsıyor. e-arka-dokum-2 (3. bölüm, yeni iz `l-arka-kamera-2`) gece dosyalarını kapsıyor: 23:00 kepenk, 23:05 çıkış, 01:58 itfaiye.
  - Burak'ın "saati şaşık" sözü silindi; yalnızca "bisiklet için polis gelmişti" kaldı. Bu söz l-mart izinin kaynağı.
  - Burak kişiyi artık "yelekten" tanıyor; "uzun boylu" çıkarıldı.
  - 2. bölümün 2. ipucu genelleştirildi.

### Belgeden doğan izler (`from`)
- 1\. bölüm başında yalnızca l-cengiz, l-bilirkisi-on ve l-on-kamera var. 2. bölüm başında yalnızca l-arka-kamera, 3. bölüm başında l-cengiz-hts ve l-cengiz-2 var. 4. bölüm başında iz yok.
- Diğer bütün izler bir belgeye bağlandı. Başlıca bağlar:

  | İz | `from` |
  |---|---|
  | l-emre | e-kiracilar |
  | l-sevim | e-cengiz-1 |
  | l-volkan | e-itfaiye, e-kiracilar |
  | l-mart | e-burak |
  | l-otopark | e-arka-dokum |
  | l-serkan-hts | e-otopark |
  | l-istasyon | e-cengiz-banka |
  | l-cengiz-banka, l-masak | e-sikayet |
  | l-rolove, l-halisaha, l-santiye | e-volkan-1 |
  | l-emre-2 | ph-on-1905 |
  | l-sevim-kamera | e-kroki (+ iv-sevim q11) |
  | l-sabri | e-doktor |

- İz açıklamaları kaynağı ima ediyor ve sonucu söylemiyor. l-serkan-2, l-cengiz-2 ve l-istasyon nötrleştirildi.

### Çelişkiler ve sayılar
- **Tutarlar:** Adisyon ve halı saha fişinde birim fiyatlar düzeltildi; toplamlar artık 14.420 TL ve 1.965 TL.
- **Hatice (19:49):** "Ben mescidin halılarını toplarken o arka kapıyı kilitlemeye gitti, beş dakikada döndü" diyor. Avlu kamerası 19:46–19:50 arasında bu yürüyüşü gösteriyor ve depo kapısına yaklaşılmadığını kaydediyor. Kurulum 10–15 dakika sürdüğü için "kapanışta kurdu" seçeneği kapanıyor.
- **Sevim:** Saatler düzeltildi ("onu yedi geçe", "gece yarısını elli iki geçe"). "Bir’e" → "Bire".
- **Tarık'ın anahtarı:** Zincir ve sahne artık "anahtarın sahibi otel odasındaydı" diyor; anahtarın yeri iddia edilmiyor. Tarık'ın "yangını yolda öğrendim" yalanı listeye eklendi. Sorguda "üç gibi çıktım" diyerek 03:09'daki aramayla kendi yalanını tutarlı tutuyor.
- **Banka, fatura ve defter:**
  - Yeni fatura: 03.08.2026, 42.000 TL; 12.08'deki 21.000 TL'lik EFT bunun yarısı.
  - Yeni EFT: 12.09.2026, 30.250 TL, yani (42.000 + 18.500) / 2. Bakiyeler yeniden hesaplandı.
  - Defterdeki kayıtlar bunlarla tutarlı. MASAK toplamları: nakit 723.000 TL, 17 fatura 559.600 TL, 20 EFT 192.650 TL.
- **e-sikayet:** Rakamlar ve şüpheli adı çıkarıldı; dilekçe yalnızca "uyumsuzluk şüphesi" diyor. Suç nitelendirmesi TCK 155/2 ve TCK 207 olarak düzeltildi.
- **e-kiracilar:** Not nötrleştirildi ("yönetim kaydındaki tutarlar").
- **Motif mantığı:**
  - e-makbuz'a not eklendi: kiracılarda yalnızca son üç ayın makbuzları var, altı yılın tamamı yalnızca yanan koçanlardaydı.
  - Emre'nin "makbuzu kaybetme" cümlesi silindi.
  - Hikâyeye gerekçe eklendi: prizi gider listesine neden yazdığı ve kamera onarımını bilerek ertelediği.
- **Çilingir damgası:** e-anahtar notunda açıklandı. Yönetimdeki yedekler 2019'da çilingirde çoğaltılmış, damgalı ve etiketli; kiracıların anahtarları damgasız orijinaller. Tuzağın ikinci dürüst ayrıntısı bu.
- **e-otel:** Açıklanmayan kart reddi kaldırıldı, kayıt 26 satıra çıktı.
- **Kroki:** Pencereler avluya bakan duvarlara taşındı.
- **Lokanta:** Belgesi olmayan kamera kaydı teklifi çıkarıldı.

### Alternatif okumalar
- **Bekçi:** Saatli ve bağımsız bir alibi eklendi: e-sabri-hts (yeni iz `l-sabri-hts`, kaynağı e-necla). 22:31'de kızıyla 28 dakikalık görüşme, 23:58'e kadar Emirsultan baz istasyonu, 01:41–01:56 taksi uygulaması.
- **"Serkan girdi" okuması:** Pide kamerası dökümü giren kişiyi "orta boylu, ince yapılı" diye tarif ediyor. Serkan iri yapılı (portre, istasyon karesi), Volkan uzun boylu ve geniş omuzlu. Serkan sorguda kilitleri yönetimin taktırdığını söylüyor. Fatura metinlerinde kilit değişimi geçmiyor.
- **Emre'nin satışı tesadüf olmasın diye:** e-koleksiyoner eklendi. 12 Eylül'de, alıcının cuma sabahki Doha uçuşu yüzünden tarih perşembe gecesi olarak belirlenmiş. iv-emre-2'de ph-on-1905 gösterilince e-hgs ile birlikte açılıyor. q5, q7, q8, q9 ve q11 artık belge istiyor.

### Sorgular, ifadeler ve dil
- Bütün resmî ifadeler en az 12 soru-cevaba çıkarıldı. Sorgularda ifadeleri tekrar eden sorular yeni katmanlarla değiştirildi.
- Belge koşulu eklenen sorular:
  - iv-cengiz-1 q3 (depoyu açtınız mı): e-bilirkisi-rapor;
  - iv-cengiz-2 q2: e-arka-dokum;
  - iv-volkan q9: e-haber;
  - iv-volkan q11 ("istifletti"): e-bilirkisi-rapor.
- iv-cengiz-1'deki "denetim" sözü ve e-tarik-1'deki denetim cümlesi 1. bölümden çıkarıldı.
- Ana metindeki "yanan tek şey ipek değildi" cümlesi değiştirildi.
- Yeni yalanlar `truth.characters[].lies` listesine eklendi:
  - Cengiz: yemek saati, pazar programı, tutanak, etiketli anahtar;
  - Serkan: para ilişkisi, "oturduk";
  - Sevim: "hepsi buranın malı";
  - Volkan: tiner bidonu;
  - Emre: kimseyle görüşmedim.
- TDK: Cins isim "han" kesmesiz yazıldı ("Hanın", "Handa"…); özel ad "Kemerli Han’ın" korundu.

### Suçlama formu (ek kural)
- Soru ve seçeneklerde ad, meslek ya da faile özgü ayrıntı yok:
  - anahtar sorusundaki "12" çıkarıldı;
  - kanıt sorusu artık "düzeneğin kurulduğu saatlerde nerede olduğuna dair beyan" diyor.
- Seçenekler aynı soruda yaklaşık eşit uzunlukta: yöntem 73–80, alibi 75–78, ikinci suç 47–52 karakter. Her yanlış seçeneğin dosyada bir dayanağı var:
  - kablo, pano, tiner buharı;
  - sigorta, yangın maddesi, esnaf kavgası, hibe;
  - telefonun evde kalması, yemek fotoğrafı, kapanış, bekçi.
- Kanıt sorusunun kabul listesi: e-cengiz-banka, ph-istasyon, e-serkan-2 (hepsi 3. bölümde).
- Kesinliği veren kanıtlar 4. bölümde kaldı: arama (ikinci priz, boş kanca, numaralı yelek, defter), bekçinin ifadesi, MASAK.

### Bütçe
- Bütçe 39'dan 45'e, hedef 23'ten 26'ya çıktı. Oran 1,56: iki inceleme bütçeyi sıkı buldu ve 44–46 önerdi.
- Bölüm geçiş saatleri: 17 / 14 / 14.

### Yapılmayanlar ve gerekçeleri
- **Sigortanın 02:40'ta attığını bağımsız gösteren bir belge eklenmedi.** Kadranın durma konumu, 112 çağrısı (02:38) ve avlu kamerasındaki parlama (02:34) dolaylı olarak destekliyor. Zincirde kilit bir halka değil.
- **2022'den beri bildirilen 9.500 TL'lik kiranın** varislerce fark edilmemesi: kira tespit davası tam da bu yüzden açıldı. Ek açıklama yazmadım.
- **Cengiz'in mart ayından sonra kamera saatinin düzeltilmediğini bildiğine dair ayrı bir satır eklemedim.** "Tutanak ile kayıt hâlâ bir saat geri" çıkarımı oyuncuya kalıyor.
- **Puanlar:** who 25, kanıt sorusu 12. Dokuz soruya dengeli dağıtım için bilinçli.
- **Risk:** 2. bölüm sonunda anahtar listesi ile zimmet birlikte okunursa Cengiz'e güven %55'i aşabilir. Buna karşı ağırlık, "kusursuz" görünen yemek alibisi ve anahtar paradoksu. Kör testte yeniden ölçülmeli.

## Son tur (ikinci kör test sonrası)

İkinci kör testte gerçek fail 2. bölüm sonunda %85'e çıkıyordu. Hedef ≤%60.

### Erken kesinleşmeye karşı
- **Anahtar zimmet listesi** (`l-anahtar`) `minAct: 3` ile 3. bölüme alındı. "Arka kapı + depo anahtarı yalnızca iki kişide" çıkarımı artık 3. bölümde yapılabiliyor.
- **Kira makbuzları** (`l-makbuz`) da 3. bölüme alındı. Zimmet, 2. bölümde yalnızca avukatın e-postası (9.500 TL beyanı ve 21 Eylül denetimi) ile sahte ilaçlama ve hamaliye kalemleriyle sezilebiliyor.
- **2. bölüm geçişi:** `l-arka-kamera` + `l-hatice` ya da 12 saat. 3. bölüm geçişi 15 saat.
- **Gider listesindeki priz kalemi** "Elektrik malzemesi (avlu aydınlatması) ve uzatma kablosu" diye bulanıklaştırıldı. Zaman ayarlı prizin alındığı artık yalnızca 4. bölümdeki aramada (çekmecedeki ikili ambalaj) ortaya çıkıyor. iv-cengiz-2 q11 artık e-arama ve e-gider istiyor.
- **Hatice'nin ifadesi:** Çanta artık yalnızca "bir çanta"; "siyah spor çanta" eşleşmesi kalktı.
- **2. bölüm ipucu 1** anahtar mantığını söylemiyor.
- **3. bölüm ipucu 2** yalnızca yön gösteriyor (araçlar, telefonlar, ödemeler).
- **ph-istasyon** dağıtıldı:
  - plaka okunmuyor, kart numarası yok;
  - not yalnızca "bu dakikada pompa 3'te tek bir temassız ödeme var: 1.400 TL" diyor;
  - kartın kime ait olduğu ancak banka dökümüyle, aracın hangisi olduğu otopark ve Serkan'ın HTS kaydıyla çıkıyor.

### Somut düzeltmeler
- **Kronoloji:** e-emre-1'in saati 10:40 yapıldı; iz e-cengiz-1'den (09:10) sonra açıldığı için kronoloji artık doğru. l-emre sonucu belgenin yeriyle uyumlu ("han önünde ifade verdi").
- **ph-istasyon:** Kamera adı "pompa adası 2 (pompa 3–4)"; notla çelişmiyor.
- **e-otel:** Satırlar saate göre sıralandı. "Housekeeping" yerine "Kat hizmetleri".
- **Türkçe:**
  - "beşi geçe" → "beşi beş geçe" (e-hatice, e-necla);
  - "Yediyi otuz beş geçe" → "Yedi buçuğu beş geçe";
  - "Onu yedi geçe" → "Saat onu yedi geçe".
- **Sigorta oranı:** Ana metin "geçen ay neredeyse dört katına", 1. bölüm sahnesi "ağustosta neredeyse dört katına". Karakterlerin konuşmasındaki "dört katına" abartı olarak bırakıldı.
- **Kanıt sorusu:** Kabul listesine e-otopark eklendi. Listenin tamamı: e-cengiz-banka, ph-istasyon, e-serkan-2, e-otopark.
- **Zincir:** 8. halkaya e-arama eklendi; halkada son bölüm öncesi belgeler zaten var.

### Değişen görsel ve ses
- **Görsel `p-cengiz`:** Prompt ve alt metnine "orta boylu, ince yapılı, dar omuzlu" eklendi. Pide kamerasındaki "orta boylu, ince yapılı" tarif böylece doğrulanabiliyor.
- **Ses:** Ses kaydı metinleri ve sesli sorgu cevapları değişmedi. Değişen tek sorgu cevabı iv-sevim'deki e-hastane-kayit tepkisi; sesli değil.
