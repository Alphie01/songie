# Arife Gecesi (gaziantep-kuyumcu): öz-QA, 1. tur

Denetim: `case:check` hatasız. Tek uyarı görsellerin henüz üretilmemiş olması (24/24).
`bölüm 4 · kanıt 60 · iz 40 · iz saati 66 · bütçe 36 · hedef 22 · karakter 11 · şüpheli 7 · görsel 24 · belge türü 13 · ses 4 · sorgu 9 (126 soru) · son bölüm öncesi kanıt 54/60` (düzeltme turu sonrası)

## Çözüm özeti
- **Fail (who):** Selçuk Aksöğüt, dükkânın ortağı. **Planlayan ve teslim alan (planner):** Rıza Kaplanoğlu, toptancı. **Bilmeden yardım eden:** Hamdi Aksöğüt (gece güvence verdi) ve Ercan Toprak (kamyonetini verdi). **Örtbas eden:** Hamdi, sabah oğlunun yalanını anlayıp sustu.
- **İkinci suç:** Selçuk has piyasasında açık verdi. Rıza’ya olan has borcuna aylık %2,5 vade farkı işledi (tefecilik). Selçuk faizi müşteri emanet zarflarından aldığı 1.728 g ile ödedi, ailenin üç külçesini de gizlice teminat verdi. Hırsızlık bu açığı siliyor; hasar ihbarı kasada olmayan üç külçeyi ve boş zarfları da çalınmış gösteriyor. Rıza’nın kazancı: arife günü bilerek getirdiği 4,2 kilo emanet bileziği gece geri aldı, bedeli de sigortadan dönecekti.
- **Yöntem:** Selçuk B-114’ü 16:20’de teknisyenin açık çantasına koydu. 22:47’de babasına “Yusuf gece gelip emanetleri ayıracak, kodumu ona verdim” dedi. 01:45’te telefonunu Nizip’te bıraktı ve Ercan’ın kamyonetini “kurbanlık” bahanesiyle aldı. 02:49’da han kapısından, 02:53’te arka kapıdan kendi anahtarıyla girdi, alarmı ve kasayı 02 koduyla açtı. Gözcü arayınca Hamdi evinden güvence verdi. Selçuk 03:38’de üç çantayla çıktı, 04:02’de altını Yeşilvadi’deki imalathanede Rıza’ya bıraktı. 04:22’de kendi kartıyla yakıt aldı, 04:40’ta Nizip’e döndü.
- **Cevaplar:** who=selcuk · planner=riza · how=h-fail · alibi=a-kamyonet · second=s-zimmet · time=t-0249 · trap=tr-fail · where=p-imalat · proof ∈ {e-kgys-2, e-ercan, e-ercan-defter, e-selcuk-banka}.

## Bölüm bölüm akış ve hedef güven
- **1. bölüm (Bayram Sabahı):** Giriş yolu, 02 kodu, tek kişi ve eczane kamerasının 11 dk geri olduğu (tur kaydıyla kıyaslanarak) kurulur. Rakip teoriler:
  - Onur: kodu testte gördü, anahtarlar elinden geçti, “evdeydim” diye yalan söylüyor.
  - Cemal: gece çarşıda, kamerasının fişini çekmiş, ağır çantalarla çıkmış.
  - Hamdi: kodu biliyor, güvenceyi verdi, kasayı o buldu, “uyku sersemi” diyor.
  - Halil: tur boşluğu var.

  Selçuk’un kodu kullanılmış ve borç söylentisi var. Ama telefonu Nizip’te, 23:48 fotoğrafı var ve alarm merkezinin aramasını açmamış. “Selçuk planladı, Hamdi ya da Onur uyguladı” okuması 1. bölümde baskın olmalı. Hedef: Selçuk’un uygulayıcı olduğuna güven ≤%30.
- **2. bölüm (Emanet):** Burada ikinci suç ortaya çıkar: hasar listesi, emanet defteri, müşteri yazışması, çekmecedeki şifreli not ve teminat senedi. Notun anahtarı MAHZEN DOLU; sorgularda Yusuf ya da Hamdi verir. Ayrıca:
  - Gece kaydı (“Selçuk o söylemişti zaten akşam”), HTS ve Hamdi’nin ikinci ifadesi güvencenin önceden hazırlandığını gösterir; Yusuf’un hastane kaydı da bunu doğrular.
  - B-114 Onur’un çantasından çıkar, ama sayım tutanağına göre 16:20’de Selçuk ayırmıştır.

  Buna karşılık Abdullah, Selçuk’u 03:05’te balkonda gördüğünü dürüstçe söyler; KGYS de Selçuk’un arabasının Nizip’ten çıkmadığını gösterir. Hedef ≤%55.
- **3. bölüm (Has Hesabı):** Alibi çöker:
  - KGYS: kamyonet 02:24’te şehre girer, 03:51’de çıkar.
  - Ercan: kamyoneti verdi, kamyonet 94 km yaptı; montu o giydi, sigarayı o içti.
  - Banka: 04:22’de km 25’te yakıt alınmış.

  Rıza’nın rolü de çıkar: 03:39’da Nizip yönüne çıkıyor, 03:58’de imalathaneyi açıyor, ocak 04:15–06:30 arasında yanıyor. Defterindeki 7.008,4 g, T1 + T2’ye eşit. Telefon kaydı da elde. Cemal ve Onur bu bölümde aklanır. Hedef ~%80.
- **4. bölüm (Tartı):** Sahne ve başlangıç kanıtı (eksper ön raporu) nötr. İmalathane araması, tartım tablosu, sorgu kaydı ve Hamdi’nin mektubu doğrulama içindir. Hepsi izlerle gelir.

## Zincir (hepsinin son bölüm öncesi kanıtı var)
1. Giriş, kod, tek kişi ve saat düzeltmesi: e-alarm-log, e-kasa-log, e-oyi, ph-eczane-1/2, e-tur, e-dvr-not.
2. Çete değil: e-alarm-log, e-oyi, e-haber.
3. Güvence önceden hazırlandı: a-gozcu, e-hts-hamdi, e-hamdi-2, e-hastane.
4. B-114 yerleştirildi: e-sayim, e-is-emri, e-arama-onur, ph-b114, ph-istasyon, e-istasyon-msg, e-kgys.
5. Masumlar: ph-atolye, e-cemal-dilekce, e-kurban, e-kgys, e-hastane.
6. İkinci suç: e-defter-not, e-emanet-liste, e-musteri-msg, e-teminat, e-hasar, e-riza-cari.
7. Alibi hilesi: e-kgys-2, ph-kgys, e-ercan, e-selcuk-banka, e-hts-selcuk.
8. Balkondaki Ercan’dı: e-abdullah, e-ercan, e-nizip-kroki, e-selcuk-1.
9. Rıza: e-kgys-2, e-imalat-alarm, e-elektrik, e-riza-cari, e-sayim, a-riza, e-irsaliye (son bölümde e-arama-imalat, e-tartim).

## Mini çıkarım bulmacaları
- **Kamera saat farkı:** Bekçi eczane kamerasında 01:09 ve 04:47’de görünür; tur kaydında N6 okutmaları 01:20 ve 04:58’dir. Fark 11 dakikadır, bu yüzden giriş gerçekte 02:49’da olmuştur. Eczacının “03:30”u da 03:41’dir; kamyonet 03:44’te İnönü Caddesi’nden geçer.
- **Gram:** Rıza’nın 7.008,4 g × 916 = 6.419,7 g has tahsilatı sayımdaki T1 (4.200,00) ile T2’nin (2.808,40) toplamına eşittir. Notun şifresi çözülünce 254 + 568 + 475 + 431 = 1.728 çıkar; bunlar Rıza defterindeki dört “hurda ödemesi” satırının brütleridir. 2.140 − 1.728 = 412 g; aramada zarflardan çıkan miktar budur.
- **Kilometre:** 84.406 − 84.312 = 94 km. Bu, Nizip–çarşı arasının iki katına (46 × 2 = 92) imalathaneye kısa sapmanın eklenmesine denk gelir. Selçuk’un “pazara gittim” dediği yer 3 km ötededir. Yakıt km 25’te alınmıştır.

## Masumları aklayan belgeler
| Şüpheli | Sırrı | Yalanı | Aklayan |
|---|---|---|---|
| Hamdi | Oğlunun yalanını anlayıp sustu | “Uyku sersemiydim”, “sadece bayramlaştık” | a-gozcu (ev sesleri), e-hts-hamdi (02:57 İbrahimli) |
| Yusuf | Cemal’den iş teklifi | “Doğruca eve gittim” | e-hastane (01:42–08:10 turnike) |
| Onur | Faturasız gece işleri | “Gece evdeydim” | ph-istasyon, e-istasyon-msg, e-kgys (K-19 02:27 / 03:52) |
| Cemal | Belgesiz hurda eritme | “Evdeydim, kamera arızalı” | ph-atolye (23:52–04:05 kesintisiz), e-cemal-dilekce |
| Halil | Nöbeti bırakıp kurban pazarına gitti | “Bütün gece çarşıdaydım” | e-kurban (02:35 tanık imzası), e-kgys (K-25) |
| Rıza | (suç ortağı) | “Hesap 25’inde kapandı”, “bayramda imalathaneye gitmedim” | aklanmaz |

Yanıltıcı ipuçları (7): e-haber, ph-bakircilar, ph-b114, e-servis-formu, e-tur, e-abdullah, e-sevim.
Yanılan dürüst tanıklar: Abdullah (montu tanıdı), Sevim (aracı servis minibüsüne benzetti, saati geri monitörden okudu), Gözcü operatörü (“bizim çocuk” sözünü “oğlu” diye not etti).

## Bilinen riskler
- **Selçuk 1. bölümde fazla öne çıkabilir:** Kod onun, Cemal borç söylentisini anlatıyor. Bunu Nizip alibisi (telefon, fotoğraf, cevapsız arama) dengeliyor. Kör testte “Selçuk planladı, babası uyguladı” okuması baskın çıkmazsa Cemal’in söylentisi 2. bölüme (`needs`) itilebilir.
- **Abdullah ile e-selcuk-1’deki “sigarayı bıraktım” cümlesi** keskin bir ekibe balkon yanılgısını 2. bölümde çözdürebilir. Bu kabul edilebilir, çünkü alibiyi asıl yıkan kamyonetin bilgileri 3. bölümde gelir.
- **a-riza (3. bölüm) güçlü bir kayıt:** Örtük konuşuyor ama tek başına fail ve planlayan için yönlendirici. Gerekirse daha da örtük yazılabilir.
- **Hamdi’nin “bizim çocuk” sözü:** Oyuncu bunu Hamdi’nin kendini ele vermesi diye okuyabilir. Ev sesleri ve İbrahimli baz istasyonu bunu kapatır.
- **Şema ve araç:** `validate.ts` içindeki `reachable` fonksiyonu, bir sorgu cevabının `leadsTo` ile `minAct`’i ileride olan bir izi göstermesi hâlinde sonsuz döngüye giriyor; `case:check` takılıyor. Bu yüzden sorgu cevaplarında yalnızca `minAct`’siz izlere bağlantı bıraktım. Kod değiştirilmedi.
- Görsellerde kişi sayıları (“exactly two/one/six”) prompt’ta yazılı; üretimden sonra cam-bakircilar, cam-eczane-1/2 ve obj-sofra gözle kontrol edilmeli.

## Düzeltme turu (kör test ve şeytanın avukatı sonrası)

### Kritik
- **Alibi tek belgeyle çökmüyor.**
  - `iv-selcuk-2`: e-kgys-2 gösterilince Selçuk artık inkâr ediyor (“Ercan’ın kamyoneti, anahtar avluda ortadaydı”).
  - Şehre geldiğini ancak `s2-sehir` sorusunda kabul ediyor. Bu soru `needs: [e-kgys-2, e-ercan-defter, e-selcuk-banka]` ile açılıyor; kabulünde de “bir kadına uğradım” diye yeni bir yalana geçiyor.
- **e-ercan üç kanıta bölündü.**
  - e-ercan: Ercan anahtarı verdiğini söylüyor ama saatleri bilmiyor (uyuklamış), kilometreden söz etmiyor.
  - Yeni **e-ercan-defter** (iz `l-ercan-defter`): kilometre farkı 84.312 → 84.406 ve yakıt. Satırlar artık “her yolculuk” mantığıyla tutarlı; depo “yarıyı geçmiş” (1.150 TL ≈ 25 L).
  - Yeni **e-ercan-2** (iz `l-ercan-2`): balkondaki gri montlu kişinin kendisi olduğunu ve Selçuk’un sigara içmediğini söylüyor.
  - Alibi artık en az üç belgeyle çöküyor: kamyonetin geçişleri (e-kgys-2), kilometre (e-ercan-defter) ve yakıt (e-selcuk-banka); e-ercan ve e-hts-selcuk destekliyor.

### Önemli
- **İzler artık belgelerden doğuyor (`from`).**
  - Bölüm başında yalnızca l-alarm, l-kasa ve l-selcuk (1. bölüm) ile l-kgys (2. bölüm) açık. 3. ve 4. bölümde başlangıç izi yok.
  - Diğer bütün izler `from` ya da `leadsTo` ile bir belgeye veya sorgu cevabına bağlı.
  - Başlık ve açıklamalar kaynağı ima ediyor, oyuncunun bilmediği bir şeyi varsaymıyor. l-selcuk-tel’deki “kalmış” sözü çıkarıldı.
- **KGYS sorguları ayrıldı.** e-kgys-2 artık yalnızca kamyoneti, yeni **e-kgys-3** yalnızca Rıza’nın aracını sorguluyor. e-kgys-3 teminat senedinden ya da has defterinden doğuyor. Rıza’nın 16:05’te şehirden çıkışı eklendi.
- **Suçlama formu.**
  - `proof` kişisiz: “Failin olay gecesi bulunduğu yere ilişkin iddiası”. Kabul edilenler e-kgys-2, e-ercan, e-ercan-defter ve e-selcuk-banka; ph-kgys tek başına çürütücü olmadığı için çıkarıldı.
  - `how`, `alibi`, `second` ve `trap` seçenekleri aynı uzunlukta yazıldı ve dosyada dayanağı olan yanlış okumalara bağlandı. Doğru seçenekler “Nizip”, “baba” ya da “kayınbirader” demiyor.
  - tr-hamdi seçeneği artık anlamlı: Hamdi teknisyen gelirken atölyedeydi.
- **Sahneler.** 3. bölüm sahnesinden “telefon bir yerde, insan başka yerde”, “avluda sabahlayan genç adam” ve “sanayi sitesi” çıkarıldı. 2. bölüm sahnesindeki “has piyasasında yanmış” söylentisi de çıkarıldı.
- **1. bölümde Selçuk’u ele veren işaretler azaltıldı.**
  - Kayınpederin 03:05 balkon tanıklığı (e-abdullah) artık 1. bölümde, e-selcuk-1’den doğan bir izle geliyor. Bu, saatli ve dürüst ama yanılan bir alibi; 3. bölüme kadar ayakta kalıyor.
  - Alarm notu artık “bizim çocuk dükkânda” diyor; kalfayı da kapsayabiliyor.
  - Cemal’in borç söylentisi (`c-selcuk`) ancak e-hasar gelince soruluyor.
  - Yusuf’un B-114 cevabı (`y-b114`) ve Selçuk’un B-114 cevabı ancak bilezik bulunduktan sonra açılıyor.
  - Selçuk’un ifadesindeki balkon ve sigara cümlesi çıkarıldı. Yerine `s1-balkon` geldi (needs e-abdullah); burada Selçuk “gördüğü bendim” diye yeni bir yalan söylüyor.
  - Yusuf’un hastane kaydı (`l-hastane`) `minAct: 2` ile ertelendi; belge tarihi 28.05 ile de uyumlu. Böylece Yusuf 1. bölümde de aday kalıyor.
- **Çelişkiler giderildi.**
  - Sabah alarm açma saatleri kasa kodundan önceye alındı.
  - Cemal’in kamerası cihaz saatiyle 23:46’da (gerçek 23:44) kapanıyor; bu, çarşıya girişinden (23:40) sonra.
  - Hamdi’nin teknisyen cevabı düzeltildi: “ben arkada atölyedeydim”.
  - Has defterinde 25.05 satırı ikiye ayrıldı: vade farkı (15 gün, 78,9 g) ve yapılandırma bedeli (27,2 g); toplam yine 6.419,7.
  - Hamdi’nin 08:10 aramasını anlatışı her yerde aynı cümle.
  - Yusuf’un külçeleri gördüğü zaman “bayramdan on gün kadar önce” oldu.
  - Defterin çantada taşındığı not edildi.
  - Halil’in duyduğu cümle a-riza’dan ayrıldı; Rıza’nın repliği “ayın biri; son gün” oldu.
- **Sorgu soruları çıkarım yapmıyor.**
  - s2-saat, s2-sehir, s2-imalat ve s2-yakit yalnızca belgeye atıf yapıyor; s2-km kaldırıldı.
  - h2-sifre şifreyi çözmüyor; yalnızca anahtarı veriyor. h1-etiket kaldırıldı.
  - Selçuk’un zimmet kabulü üç belgeye bağlandı.
  - iv-yusuf’un B-114 tepkisi açıklama yapmıyor.
- **Yeni e-grup (dükkânın mesaj grubu).** Selçuk’un Yusuf’un hastanede olduğunu nereden öğrendiğini belgeliyor. Selçuk 06:15’te Yusuf’un hastanede olduğunu yazan mesaja cevap verip “babama ben söylerim” diyor, 08:10’da ise babasını “Yusuf işini bitirdi mi bak” diye dükkâna gönderiyor. Bu, f-selcuk-knew olarak zincirin 3. halkasına eklendi.
- **Kroki ve iç geçit.** Çarşıdan han avlusuna inen iç geçit krokiye çizildi. Geceleri kilitli olduğu ve anahtarının yalnızca bekçide bulunduğu e-oyi, e-tur ve mekân tarifinde belirtildi.

### Küçük
- **Prosedür.** CMK 45 tanıklıktan çekinme hatırlatması e-abdullah ve e-ercan’a eklendi. Hastane cevabı artık savcılık yazısına verilmiş.
- **Selçuk’un acente araması.** Acente kaydı e-eksper’e eklendi: sigortalı kodla açılan kasada teminatın geçerli olup olmadığını sormuş, poliçe yenilemesi 2027’de. Bu, “poliçe yenilemesi” yalanını 4. bölümde çürütüyor.
- **Dil ve sayılar.**
  - TDK düzeltmeleri: “haziran ortası”, “Nisanda”, “hiçbiri”, “Nermin Abla”.
  - Dükkânın yaşı “altmış sekiz yıl / yetmiş yıla yakın” olarak düzeltildi; Hamdi “elli dört yıl” diyor.
  - Görsel tariflerinden (alt) “Tam iki/bir” kalıntıları temizlendi.
  - Karakter `relation` alanları küçük harfle başlıyor.
- **Saat dengesi.** İz saati 66 (bütçe 36, oran 1,83). 2. bölümün `advance.hours` değeri 13’ten 10’a indi.
- **Yalan listesi.** Yeni yalanlar truth.characters listesine eklendi.

### Yapılmayanlar ve gerekçeleri
- **B-114 satırındaki “S.A.” notu kaldı.** Tuzağın dürüst ayrıntısı bu. Bilezik 2. bölümde bulunana kadar not anlamsız kalıyor; kör testte belirttiğiniz y-b114 cevabı ise artık ancak bilezik bulunduktan sonra açılıyor.
- **OYİ’deki 42–44 numara ayakkabı izi atmosfer olarak kaldı.** Bilinçli bir çıkmaz; kimseyi suçlamıyor, kimseyi de aklamıyor.
- **iv-hamdi-2’deki `h2-kayit`, e-hamdi-2 ile içerikte örtüşüyor.** Bu bilinçli: e-hamdi-2’yi açan cevap bu soru.
- **Görsel prompt’ları değişmedi.** Yalnızca dört görselin alt metni sadeleşti (cam-bakircilar, cam-eczane-1, cam-eczane-2, cam-atolye).

## Son tur (ikinci kör test sonrası)

Hedef: 1. bölüm sonunda Selçuk ≤%35, 2. bölüm sonunda ≤%60. Kör testte bu değerler %45–50 ve %85 çıkmıştı.

- **1. bölümde alibiyi ele veren yerler kaldırıldı.**
  - e-abdullah:
    - Komiserin “Ercan’ın kamyoneti?” sorusu çıkarıldı; yerine “Gece evden çıkan ya da eve gelen oldu mu?” geldi.
    - Kayınpeder artık emin konuşuyor: “Yan dönmüştü, lamba arkasından vuruyordu; Selçuk’tu, eminim.” Yanılgısı yalnızca 3. bölümde e-ercan-2 ile anlaşılıyor.
  - e-nizip-kroki: “sokağı görmez” ve “Ercan’ın gece beklediği yer” işaretleri çıkarıldı.
- **1. bölümde Selçuk’u öne çıkaran işaretler azaltıldı.**
  - Alarm dökümünde tuş takımı numaraları gösterilmiyor.
  - Operatör notu artık söz aktarmıyor (“abone işlemden haberdar olduğunu teyit etti”). “Bizim çocuk” cümlesi yalnızca ses kaydında (a-gozcu, 2. bölüm) geçiyor. Hamdi’nin ifadesi ve h1-cocuk’ta “haberim var dedim” deniyor; bu yeni bir yalan, listeye eklendi. h1-kim sorusu a-gozcu’ya bağlandı.
  - Telefonun sessizde olduğu ilk ifadeden çıkarıldı; s1-tel e-hts-selcuk’a bağlandı.
  - Belediye kamerası notu artık Cemal’i adıyla tanımlamıyor; yalnızca kapının anahtarla açıldığını ve anahtarların kimlerde bulunduğunu söylüyor.
- **2. bölümde kesinleşme geciktirildi.**
  - e-grup artık yeni `l-grup` iziyle (minAct 3, from e-hamdi-2) geliyor; y-haber cevabı belge açmıyor.
  - B-114 araması (`l-arama-onur`) minAct 3’e alındı, teknisyen tuzağı 3. bölüme kadar ayakta kalıyor.
  - l-hastane artık e-hamdi-2’den doğuyor.
  - Onur, Cemal ve Halil’in aklanması 2. ve 3. bölüme yayılmış durumda; Cemal ve Onur 3. bölümde aklanıyor.
- **Nötrleştirilen iz başlıkları:** l-hamdi-2 (“gece kaydını dinlet”), l-ercan-2 (“avlu ve balkon üzerine konuş”), l-imalat-alarm.
- **3. bölüm ipuçları** artık yön gösteriyor, çözümü söylemiyor.
- **Form.**
  - how ve alibi seçenekleri aynı özgüllükte yazıldı; doğru seçenek adımları sayan tek seçenek değil.
  - proof kabul listesi genişletildi: e-kgys-2, ph-kgys, e-ercan, e-ercan-defter, e-ercan-2, e-selcuk-banka.
- **Küçük düzeltmeler.**
  - Sofra fotoğrafının saati: “gece yarısına on iki kala”, yani 23:48. Fotoğraf Ercan’ın telefonuyla, zamanlayıcıyla çekilmiş.
  - Banka dökümüne KM25’in çevre yolu kavşağından sayıldığı notu eklendi.
  - 1\. bölümün geçiş izleri daha derinde: l-eczane, l-tur ve l-abdullah (en az 7 saat).
  - TDK düzeltmeleri: e-ercan-2 cümlesi, “açılıştan itibaren”. h1-not sorusu kaldırıldı.
- **Görsel prompt’ları, ses kaydı metinleri ve sesli sorgu cevapları değişmedi.**
