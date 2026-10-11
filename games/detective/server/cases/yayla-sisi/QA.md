# Yayla Sisi: öz-QA (1. tur, zor mod)

Kaynak parçalar: `scratchpad/case-yayla-sisi/` (`p1-meta.js` … `p6-rest.js`, `p5-iv.js`).
Birleştirme: `node patch-from.js && node build.js`. `patch-from.js` izlere `from`/`minAct` ekler.

## Çözüm özeti
- **Fail:** Kemal Okumuş. Emekli öğretmen, kurbanın kırk yıllık arkadaşı, derneğin saymanı, cesedi bulan kişi.
- **Örtbas eden ve ikinci suçun ortağı:** Okan Okumuş, failin oğlu.
  - Sahte dekontu o düzenledi.
  - Yeleği ve mektubu pansiyonun sobasında yaktı.
  - Cinayete katılmadı; olay saatinde Ayder’deydi (22:38 POS fişi).
- **Örtülen suç:** Dava avansı için toplanan paradan 408.000 TL’yi Kemal haziranda nakit çekti ve oğlunun icra borçlarına verdi.
  - Avansı yatırılmış göstermek için Okan’a eski bir dekonttan sahte dekont yaptırdı ve dernek grubunda paylaştı (1 Haziran).
  - Dava 15 Temmuz’da avans yatırılmadığı için reddedildi; istinaf süresi 21 Ağustos’ta doldu.
- **Tetik:**
  - Avukatın mektubu 22 Ağustos’ta Haşim Bey’e ulaştı.
  - Haşim Bey 14:41’de Kemal’i aradı ve 14:45’te gruba ertesi gün için toplantı çağrısı yazdı (“dekontun aslını getirsin”).
  - Kemal erzağın içine imzasız bir “yarına kadar bekle” notu koydu.
- **Yöntem:**
  - 22:27’de kahveden çıktı; 22:31’de alt istasyondan kasaya binip sırta çıktı.
  - Kenarda tartıştılar. Haşim Bey sırtını dönünce Kemal motor kulübesinin duvarındaki acil indirme koluyla başının arkasına vurdu; Haşim Bey 22:40:52’de korkuluksuz kenardan düştü.
  - Kemal 22:41’de telefon taşından kızını aradı; konuşurken evden mektubu aldı.
  - 22:44’te kasayla indi ve vadinin ortasında kolu dereye attı.
  - 22:49’da çeken taştan kızını yeniden aradı, yırtılan yeleği evine bıraktı ve 22:56’da kahveye döndü.
- **Alibi hilesi (baz istasyonu çakışması + dürüst yanılgılar):**
  - Çeken taş da telefon taşı da S3 hücresine bağlanıyor. Bu yüzden HTS onu hep ana yerleşimde gösteriyor gibi.
  - Bayram, kapıdan çıkan Hasan’ı Hoca sandı ve çıkışı 22:35 sanıyor.
  - Ali Rıza dönüşü “22:50 gibi” hatırlıyor.
- **Yerleştirilmiş kanıt:** Kemal pazar sabahı 07:10’da kahvede, Cengiz’in cumartesi öğlen teneke küllüğe bıraktığı ince izmaritleri aldı ve 08:20’de platforma koydu.

## Zincir (son bölüm öncesi belgeler)
1. **Cinayet ve saat:**
   - Ön otopside başın arkasında, düşme yönüyle uyumsuz yuvarlak bir darbe var (`e-otopsi`).
   - Saat 22:40:52’de düşme kaydı var (`e-saat`).
   - 22:33’te Haşim Bey sağ (`e-sesli-mesaj`).
2. **Ziyaretçi teleferikle geldi ve gitti:**
   - Kumanda kartına göre kasa 22:31’de ALT istasyondan, 22:44’te ÜST istasyondan tetiklendi (`e-inverter`).
   - Kol, hattın 170 m altında, patikanın ulaşmadığı yerde bulundu (`e-jak`, `e-foto-kol`).
3. **Erişim:**
   - Anahtarlar Haşim Bey, Zehra, Erol, Kemal ve Yusuf’ta (`e-bakim`, `e-ifade-zehra-2`).
   - Patika sisli gecede ~40 dk sürer (`e-oyi-rapor`, `e-bakim`, `iv-yusuf`).
4. **Aklananlar:**
   - Erol ve Cengiz 22:11–23:04 birlikte (`e-starlink`, `e-wa-erol`, `e-protokol`).
   - Yusuf ve Deniz batıda, 2,6 km uzakta (`e-inreach`, `e-olcum`, `e-otel-kart`).
   - Okan Ayder’de (`e-fis-okan`).
   - Zehra Şenyuva’da, anahtarı yanında (`e-ifade-zehra-2`).
5. **Kemal’in gerçek yokluk süresi (22:27’den önce → 22:55’ten sonra):**
   - 22:29:47 fotoğrafında sandalye boş, ampuller yanıyor (`e-foto-okey-2`).
   - İlaç alarmı 22:55; Hasan aynı ceketle sigaraya çıktı (`e-ifade-aliriza`).
   - Bayram yanılgısını kabul ediyor (`e-ifade-bayram-2`).
6. **Telefon alibisinin çöküşü:**
   - S3 iki taşı da kapsıyor; 22:41 araması TA=9 (≈4,95 km, telefon taşı), 22:49 araması TA=7 (≈3,85 km, çeken taş). 22:41 araması 22:44:58’de radyo bağlantısı kaybıyla koptu (`e-kapsama`).
   - Kasa 22:44:10 + 80 m / 1,8 m/sn ≈ 22:44:54’te vadiye girer (`e-bakim`, `e-inverter`).
   - Kızı nefes nefese bir ses, rüzgâr, kapı gıcırtısı ve motor uğultusu duydu (`e-ifade-ayse`).
   - Fadime çeken taşta onun bağırışını duymadı (`e-ifade-fadime-2`).
   - Haşim Bey’in HTS’sinde telefon taşından da bir S3 satırı var (14:45 veri, `e-hts-hasim`).
7. **Lif:**
   - Tırnak altındaki lif = kasa sürgüsündeki lif (`e-lif`, `e-foto-kasa`).
   - 21:16 fotoğrafında bordo-yeşil el örgüsü yelek görülüyor (`e-foto-okey-1`).
   - Kemal kahveye yeleksiz döndü (`e-ifade-aliriza`).
8. **İzmaritler sonradan konmuş:**
   - Kurular, ama çisenti 06:50’ye kadar sürdü (`e-oyi-rapor`, `e-meteo`).
   - Üstlerinde çay posası var (`e-dna-izmarit`).
   - Kahvede pencere dibindeki küllükten kayboldular (`e-ifade-bayram-2`).
9. **İkinci suç:**
   - Kanıtlar: `e-wa-platform`, `e-dekont`, `e-banka-platform`, `e-banka-yazi`, `e-mahkeme`, `e-eposta-avukat`, `e-icra`, `e-bilisim-okan` (Okan sorgusunda bankanın yazısı gösterilince açılır).
10. **Tetik:**
    - Kanıtlar: `e-hts-hasim` (14:41), `e-wa-platform` (14:45), `e-ifade-zehra-1`, `e-not` + `e-grafoloji`.
11. **Mektup ve örtbas:**
    - Kanıtlar: `e-oyi-rapor` (boş zarf), `e-ifade-zehra-2` (mektup sedirdeydi), `e-ifade-fadime-2` (Okan’ın torbası).
    - 4\. bölümde doğrulama: `e-arama`, `e-dinleme`, `e-kriminal-kol`.

## Masumları aklayan belgeler
| Şüpheli | Sırrı / yalanı | Aklayan |
|---|---|---|
| Erol | Gizli miras protokolü; “evde uyudum”; babasının aramasını reddetti | `e-starlink`, `e-wa-erol` |
| Cengiz | Protokol; akşam sınır taşlarına gitti; “yalnızdım” | `e-starlink` (20:22’den sabaha kadar ev); izmaritler için `e-ifade-bayram-2`, `e-dna-izmarit` |
| Deniz | İzinsiz gece ölçümü; “oteldeydim” | `e-inreach`, `e-olcum`, `e-otel-kart` |
| Yusuf | HES’ten gizli para; “evdeydim” | `e-inreach` |
| Okan | Sahte dekontu yaptı, delil yaktı; “borcu pansiyondan ödedim” | Olay saati için `e-fis-okan` (Ayder, 22:38) |

## Zor mod katmanları
- **İç içe iki suç:** Zimmet ve sahte dekont, cinayetin altında yatıyor. 2\. bölümde fark edilir: `e-wa-platform` toplantı çağrısı, Deniz sorgusunda davanın temmuzda reddedildiği, Erol sorgusunda “Hoca’nın dekontu”.
- **Çok rollü suçluluk:** Fail Kemal; Okan sahteciliğin ortağı ve delilleri yok eden.
- **Sahte alibi:** 3 ve daha fazla belgeyle çöker: `e-kapsama`, `e-ifade-ayse`, `e-foto-okey-2`, `e-ifade-aliriza`, `e-bakim`, `e-inverter`.
- **Tuzak şüpheliler:**
  - Cengiz: yerleştirilmiş izmaritler (dürüst ayrıntı: kuru izmarit ve çay posası). Sarı yağmurluk ve tehdit de ona işaret ediyor.
  - Erol: “sen misin” sesli mesajı, “babam duymayacak”, vasiyet randevusu, borç, yalanlar.
  - Üçüncü teori Deniz ve Yusuf: otelden kayıp, HES.
- **Dürüst yanılan tanıklar:**
  - Bayram: kişiyi ceketten karıştırdı, saati jeneratör alışkanlığına göre söyledi.
  - Ali Rıza: dönüş saatini kısa hatırlıyor; kendi ilaç alarmı bunu düzeltir.
  - Fadime: saatleri yaklaşık veriyor.
- **Gömülü ipuçları:**
  - HTS’ler 31 ve 33 satır, banka dökümü 30, otel geçiş kaydı 28 satır.
  - Kilit satırlar: Haşim HTS 14:45 S3; Kemal HTS 22:41–22:49; banka 03.06 / 08.06 / 26.06; inverter 22:31 ALT / 22:44 ÜST.
- **Mini bulmacalar:**
  - TA mesafe hesabı.
  - Kopma anı ile kasanın vadiye girişi.
  - Patika süresi ile yokluk süresi.
  - Yağışın bitişi ile kuru izmarit.
  - Nakit çekimleri ile ertesi günkü icra ödemeleri (150→147,5; 140→138; 118→93).
- **Yan hikâyeler:**
  - Erol: üreticiye borç, kefalet, protokol.
  - Cengiz: sınır taşları, ev alımları.
  - Deniz ve Yusuf: izinsiz ölçüm, gizli ödeme.
  - Okan: icra.
- **Sorgular:** 9 sorgu, 128 soru, 16 sesli cevap.
  - Kemal ve Erol’la ikişer görüşme; Cengiz’le iki görüşme (`minAct` izleriyle).
  - Her sorguda 3–5 belge gösterme tepkisi ve 3 kaçamak cevap var.
  - Kemal kırıldığında bile yeni bir yalana geçiyor (“indiğimde ayaktaydı”); `e-saat` bunu çürütüyor.

## Beklenen zorluk eğrisi
- **1. bölüm:** Erol (yalanlar, borç, vasiyet), Cengiz (tehdit, sarı yağmurluk) ve Deniz/Yusuf (otelden kayıp) önde. Kemal’in tanıklı alibisi var (Bayram: 22:35–22:45). Kemal ≤%25.
- **2. bölüm:**
  - Cinayet, 22:40:52 ve teleferik ortaya çıkıyor.
  - İzmaritler Cengiz’i, sesli mesaj Erol’u gösteriyor; Kemal’in HTS’si alibisini destekliyor gibi.
  - İkinci suç fark ediliyor.
  - Kemal ~%40–50.
- **3. bölüm:** Yönlendirici Erol’la Cengiz’i aklıyor; kapsama raporu, fotoğraflar ve Ayşe’nin ifadesi alibiyi çökertiyor. ~%80.
- **4. bölüm:** Kol, kan, arama (düğmeler, yanık mektup) ve dinleme doğruluyor.

## Bilinen riskler
- **1. bölüm:** Dikkatli bir okur mektup → dernek → sayman bağını, krokide Kemal’in evinin alt istasyona bitişik olmasını ve Fadime’nin “uğultu”sunu birleştirip Kemal’i erken öne alabilir. Hafifletme: `e-inverter` ve `l-aliriza` geç açılıyor; Kemal’in tanıklı alibisi var.
- **2. bölüm:**
  - Haşim Bey’in HTS’sindeki 14:45 S3 satırını gören oyuncu, kapsama raporundan önce baz çakışmasından şüphelenebilir. Bilerek gömülü bırakıldı.
  - İzmaritlerin kuruluğu (OYİ) ile hava verileri birleştirilirse “sabah konmuş → sabah orada Kemal ve Erol vardı” çıkarımı 1.–2. bölümde yapılabilir. Erol’un da kenara tek başına gittiği yazılı olduğu için iki aday kalıyor. Çay posası ve küllük ayrıntısı 3. bölümde.
- **Bilim ve teknik:**
  - TA birimi GSM’e göre yazıldı (~550 m); LTE’de farklıdır. Rapor “bu hücrede” diye sınırladı.
  - Akıllı saatin şebekesiz düşme kaydı tutması gerçekçi; acil arama denemesi Haşim Bey’in HTS’sinde “bağlantı kurulamadı” satırı olarak görünüyor. Bu satırın operatör kaydında yer alması tartışmalı olabilir; gerekirse çıkarılabilir.
  - DNA ve lif sonuçları 2–5 günde “ön rapor” olarak verildi.
- **Coğrafya:** Huser, Ayder, Hazindak, Şenyuva ve Çamlıhemşin gerçek; Kartal deresi, Dalkılıç sırtı, “telefon taşı” ve “çeken taş” kurmaca ayrıntı.
- **Kurum adları:** Pazar Cumhuriyet Başsavcılığı / Pazar Sulh Ceza Hâkimliği / Pazar İcra Dairesi yetkisi varsayıldı.
- **Bakım anahtarı:** Yusuf’un bakım anahtarı Zehra’nın bilgisinde yok (“bilmem”); `e-bakim`’de yazılı.
- **Olgu sayısı:** `facts` 47 madde; eski rehberdeki 12–25 sınırının üstünde, zor modun ayrıntı düzeyi yüzünden.

---

## Düzeltme turu (kör test + şeytanın avukatı)

Kaynak artık `p6-data.json`. Birleştirme: `node patch-from.js && node build.js`. `p6-rest.v1.js` yalnızca arşiv.

### Kritik
- **K1. Bölüm başı izleri:**
  - `l-kemal-2` → “Cesedi bulan kişiyi karakolda, avukatı huzurunda yeniden dinle”. Bölüm başında değil; `from: e-kapsama / e-foto-okey-2 / e-ifade-ayse` ile keşfediliyor, `minAct 3`. Sorgu girişinden “şüpheli sıfatıyla” çıktı.
  - 3\. bölüm başı izleri: `l-starlink`, `l-avukat`. Geçiş izleri: `l-kapsama`, `l-ayse`.
  - 4\. bölümün başında iz yok. `l-arama` (torbanın götürüldüğü pansiyon) `from: e-ifade-fadime-2` ile, `l-dinleme` `from: e-bilisim-okan` ile keşfediliyor; ikisi de `minAct 4`. Başlıklarda ad yok.
- **K2. Suçlama formu (EK KURAL):**
  - Soru ve seçeneklerde karakter adı, meslek ve faile özgü ayrıntı yok (“kurban”, “fail”).
  - `proof` nötrleştirildi: “olay anında nerede olduğuna ilişkin iddia”. Kabul listesi: `e-kapsama`, `e-ifade-ayse`; Fadime çıkarıldı.
  - `alibi`, `how`, `second` ve `why` seçenekleri eşit uzunlukta, kişiden bağımsız; her yanlış seçeneğin dosyada dayanağı var.
  - `time` sorusu çıkarım isteyen “failin sırtta kaldığı süre” sorusuna dönüştü (cevap ~9 dk, 22:35–22:44).

### Önemli
- **Ö1. Kemal’in sorgusu (`iv-kemal-2`):**
  - `e-kapsama` gösterilince artık yeni bir yalan geliyor (“sinyal sıçrar”).
  - Teleferiği kabul ettiği yeni soru `q17`, ancak `e-kapsama + e-ifade-ayse + e-foto-okey-2` üçü birlikteyken açılıyor. Orada da yarım kabul ediyor (“bir adım attım, geri indim, ayaktaydı”); `q18` önceki yalanını açıklıyor.
  - `q10` ile hesap itirafı arasındaki tavır uyumlu hâle getirildi.
- **Ö2. Mektup:** Artık evden alınmıyor. Haşim Bey mektubu cebinde kenara götürdü; darbede platforma düştü, Kemal yerden aldı. Ayşe “kapı gıcırtısı” yerine metal bir sürgü sesi duyuyor (kasa sürgüsü). `e-kapsama`’ya “platform ve hattın ilk ~80 m’sinde S3 zayıf ama kullanılabilir; evin içinde yok” eklendi.
- **Ö3. Fadime’nin ikinci ifadesi:** Taşta bir kez, kısa ve alçak sesli bir konuşma duyuyor (“hat koptu kızım”); bu 22:49 aramasıyla uyumlu. `proof` listesinden çıkarıldı.
- **Ö4. Saat düzeltmeleri:**
  - Erol ve Bayram: “ona yirmi kala”.
  - Zehra: “on ikiye on kala”.
  - Bayram: “ikiyi on geçe”.
  - Bayram-2: “yedide baktım, yediyi on geçe Hoca geldi”.
- **Ö5. Cengiz’in yürüyüşleri:** Patika süresine uyuyor. Yönlendirici kaydı: 15:30 ayrılış / 17:16 dönüş ve 19:14 ayrılış / 20:41 dönüş. Fadime adamı 19:20’de görüyor. Olgular, sorgu cevapları ve gerçek bu saatlere güncellendi.
- **Ö6. Haşim HTS çakışması:** Grup mesajı, S3 veri satırı ve saat eşitlemesi 14:48’e alındı.
- **Ö7. İstinaf süresi:** Adli tatil nedeniyle 07.09.2026. Avukatın talimat ve masraf için verdiği son gün 21.08. E-posta, olgular, gerçek ve sorgular buna göre düzeltildi.
- **Ö8. Kurbanın önceden bildiği imaları kaldırıldı:**
  - `iv-erol-1` `q6` dekonttan söz etmiyor.
  - `iv-erol-2` `q11` artık “Hoca dekontun aslını hep sonraya bırakıyordu” diyor; avukata dayanmıyor.
- **Ö9. İzmarit raporu:**
  - `e-dna-izmarit`: kâğıt kuru; güncel ya da yağmura bağlı ıslaklık yok; önceden bir sıvıyla ıslanıp kurumaya bağlı kırışma ve leke var, niteliği ayrıca incelenecek.
  - Çay ve tanen tanısı 3. bölümde `e-lif` ek bölümünde.
- **Ö10. Rize gün batımı ve doğumu:** 19:06 / 05:53. İnvertördeki güneş girişi 06:05 / 06:00. Fadime “akşam ezanından sonra, hava kararırken” diyor.
- **Ö11. 2. bölümdeki ucuz yollar kapandı:**
  - Dernek grubundaki çağrı artık “avukattan yazı geldi, dava hakkında” diyor; dekont ve sayman yok.
  - `iv-deniz` `q9`: yalnızca “vezne kaydında avans görmedik”; ret bilgisi 3. bölümde.
  - `iv-cengiz-2` `q5`: “sabah orada kim vardı” cümlesi çıktı.
  - `iv-kemal-1` `q14`: dekonttan söz etmiyor.
  - 2\. bölüm sahnesi ve ipucu nötrleştirildi.
  - 1\. bölümde OYİ’deki “kuru izmarit” tespiti, Bayram’ın pazar sabahı “pencere dibine oturdu” ayrıntısı, Cengiz’in teneke küllük ayrıntısı ve Fadime’nin “taşta ses duymadım” sözü çıkarıldı.
- **Ö12.** `e-gazete-2` artık 28 Ağustos Cuma tarihli.
- **Ö13. Okan’ın ikinci alibisi:** Yeni belge `e-hts-okan` (28 satır). Telefon 22:00–23:30 Ayder hücresinde; pazar 15:02’de Huser S3’te, Fadime’nin anlattığıyla uyumlu. Yeni iz `l-hts-okan` (`from: e-fis-okan`, `minAct 2`).

### Küçük bulgular
- Haşim HTS’deki şebekeye ulaşmayan 22:41 “acil sorgu” satırı silindi.
- Erol 08:31’de çeken taşta (“mesajlara bakmaya çıkmıştım”).
- Sesli mesajda motor sesi yakında ve sabit; yaklaşan yalnızca makara tıkırtısı.
- 4\. bölüm sahnesi nötr; karar tarihleri 28.08’e alındı (arama ve dinleme). Dinleme kaydı aramadan sonraya kaydı, içerik buna göre değişti.
- Okan’ın “zarf” sözü → “katlanmış, antetli bir kâğıt”.
- `l-inreach` artık Deniz sorgusundaki Yusuf cevabından ve `l-yusuf`’tan doğuyor (otel kaydından değil). `l-tapu` başlığı nötr.
- Vasiyetin içeriği randevu fişine eklendi (“kurulacak bir vakfa bırakılması”).
- Ayşe’nin ifadesi “Pazar Cumhuriyet Başsavcılığının talimat yazısı üzerine” alındı.
- Ali Rıza: Kemal ceketini önü açık omuzlarına geçirip çıktı (lif aktarımı için).
- TDK: “onu on geçe”, “onu otuz sekiz geçe”, “amca oğlu”; diyalogda “üç dakika elli üç saniye”.
- Kör test bulguları:
  - `e-foto-masa` görselinden tespih çıkarıldı (**`ph-masa` prompt ve alt değişti**).
  - Kemal patikayı “dizlerim tutmuyor, dinlene dinlene otuz dakikada” çıkıyor; pazar sabahları ekmek kasayla, kendisi yürüyerek gider.
  - Anahtar için “kendi evimde, kapımın yanında çivide” deniyor.
  - `iv-kemal-1` `q7` artık `needs: e-not` ile açılıyor ve notun erzakla geldiğini söylemiyor.

### Yapılmayanlar ve gerekçeleri
- **`who` 20 puan:** Zor modda 10 soru var ve form ağırlığı alibi, ikinci suç ve kanıt sorularına dağıtıldı. Toplam 100.
- **Bütçe sıkılığı:** Bilerek 43 saat bırakıldı (iz saati 79, oran 1,84). Kör testte ölçülmeli.
- **`e-kroki` “Odalar” başlığı:** Dışa aktarım aracından geliyor; vaka metni değil.
- **Validator hatası (bildirilmeli):** `reachable()` içinde, `from` ile doğan bir iz, kaynağı yalnızca bir sorgu cevabıyla açılan belgeyse kuyruğa eklenir. Ama küme o turda büyümediği için döngü biter ve iz işlenmez. Geçici çözüm olarak `iv-okan` `q2`’ye `leadsTo: l-hts-okan` eklendi.

---

## Son tur (ikinci kör test: 1. bölüm %35, 2. bölüm %85)

- **2\. bölümdeki erken kesinleşme:** Teleferik kumanda kaydı (`e-inverter`, `l-inverter`) `minAct 3` ile 3. bölüme taşındı; artık 3. bölüm başı genel izlerinden biri. 2\. bölüm başı izleri: iki HTS. Geçiş izleri: sesli mesaj ve Kemal’in HTS’si (16 saat). 3\. bölüm geçişi 21 saat.
- **Faili ele veren yerler:**
  - `l-kemal-2` başlığı nötrleşti: “Gece çeken taştan yapıldığı söylenen aramaları, arayan kişiyle yeniden konuş”.
  - Sorgunun adı “karakolda görüşme”.
  - `q17` artık “Bu üç belgeyi yan yana koyalım. Teleferiğe bindiniz mi?” diyor; açılması için yine üç belge gerekiyor.
  - `e-foto-okey-1` notunda ad yok: “Pencere tarafındaki kişi”.
- **Ayşe’nin ifadesi seyreltildi:** “yokuşu çıktım” → “yürüdüm biraz”. Sürgü sesi çıkarıldı. “Sormadan iki kere çeken taştayım” → bir kez, olağan bir cümle olarak. Makine sesi ve kopma kaldı.
- **İpuçları yön gösteriyor:** 2\. bölüm (zaman kaynakları; anahtar sahiplerinin doğrulanması) ve 3. bölüm (kolun krokideki yeri; hücre adının kesinliği) ipuçları çözümü söylemiyor.
- **Yusuf:** `q13` sonundaki “batıdaydım… yani” sürçmesi ve `q14` çıkarıldı.
- **OYİ numaralandırması:** Delil 1 kafa feneri, 2 saat, 3 telefon, 4–5 izmarit, 6 kasa sürgüsündeki lif (renk verilmeden), 7 kapıdaki anahtar, 8 zarf, 9 not.
- **112 kaydı:** “Ben evin önündeyim” → “istasyonun yanındayım”; “kırk yıldır bu taşa basardı”.
- **Zehra’nın bağımsız alibisi:** Yeni belge `e-kina` (kameramanın video dosyası özeti). Yeni iz `l-kina` (`from: e-ifade-zehra-1`, `minAct 2`, 1 saat).
- **Dil:**
  - `relation` alanları küçük harfle başlıyor.
  - Sahne: “telefonunu çekmeyen havaya boşuna kaldırıyordu”, “basardı”.
  - Saat okunuşları rakamla: 22.10, 23.05, 22.38. Zehra: “on buçuğa on kala”.
  - “Dördü on geçe”.
  - Tespih notu silindi.
  - Fadime’nin bulanık cümlesi düzeltildi.
- **Form:**
  - `proof` kabul listesi: `e-kapsama`, `e-ifade-ayse`, `e-foto-okey-2`, `e-inverter`.
  - `a-ikiz` artık Hasan durumuyla örtüşmüyor: telefonu bir yakına verme.
- **Değişen ses ve sesli metinler:** `e-112` (Kemal’in son satırı); `iv-kemal-2` → `e-ifade-ayse` gösterimi (sesli). `q17` yalnızca soru metni değişti, cevap aynı.
- **Görsel:** Bu turda prompt değişmedi. Önceki turda `ph-masa` prompt’undan tespih çıkarılmıştı.
- **Yapılmayan:** Krokinin dökümdeki ham koordinatları dışa aktarım aracından geliyor; vaka metni değil.
