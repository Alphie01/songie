# Hasat Gecesi (ayvalik-miras): öz-QA, 1. tur (zor mod + sorgular)

Denetim: `case:check` hatasız. Tek uyarı görsellerin henüz üretilmemiş olması (24/24).
`bölüm 4 · kanıt 64 · iz 45 · iz saati 72 · bütçe 39 · hedef 23 · karakter 12 · şüpheli 6 · görsel 24 (9 fotoğraf/kamera) · belge türü 14 · ses kaydı 4 · sorgu 9 (148 soru) · son bölüm öncesi kanıt 57/64` (düzeltme turundan sonra)

## Çözüm özeti
- **Fail (who):** Ömer Dinçer, fabrika müdürü. **Alibiye yardım eden (accomplice):** Engin Sarı, sevkiyat şoförü. Cinayeti bilmiyordu, sonra örttü.
- **Gizli ikinci suç:** Ömer 2019'dan beri kantar programında (tek yönetici odur) müstahsil net ağırlıklarını fiş basıldıktan sonra yaklaşık %11 düşürüyor. Kayıtlarda görünmeyen yağı Engin irsaliyesiz olarak Edremit'teki Körfez Gıda'ya taşıyor; para Ömer'e gidiyor. Altı hasatta 35,5 ton yağ.
- **Motif:** Rıza Bey bunu Dudu Akın'ın fişlerinden buldu. Pazartesi noterde Ömer'in 04112 numaralı vekâletini azledip salı savcılığa gidecekti. Ömer bunu 10 Kasım'da yazılım firmasının onay e-postasından öğrendi.
- **Yöntem:** 23:37'de havuz kenarında 46 mm'lik pres anahtarıyla başın arkasına darbe. Rıza Bey havuza canlı düşüp boğuldu.
- **Alibi hilesi:** Engin 23:18'de kulübeye girdi; Ömer'in kabanını ve kasketini giydi, Ömer'in açık oturumuyla tartım yaptı. Ömer 23:26'da arka kapıdan doğu geçidine çıktı ve kendi anahtarıyla yan kapıdan sıkımhaneye girdi. 23:54'te kolu ıslak döndü.
- **Yerleştirilmiş kanıt:** Ömer mavi dosyayı kazanda yaktı. Anahtarı bir kazan bezine sardı ve 00:14'te ustabaşının arka parktaki kamyonetine koydu. Usta o dakikada panelde PIN'iyle onay veriyordu.
- **Cevaplar:** who=omer · accomplice=engin · how=h-anahtar · why=y-kantar · alibi=a-kaban · second=s-korfez · when=t-2338 · proof=e-k1-log / ph-k1-2342 / e-k1-deneme / e-isg / e-mehmet-ses / e-engin-2 / e-omer-2 · planted=p-fail.

## Bölüm akışı ve hedef güven
- **1. bölüm (Karasu):** Ömer'in alibisi neredeyse kusursuz. Kendi teslim ettiği kantar dökümünde bütün tartımlar onun adına; dürüst tanık Mehmet onu kabanından "tanıyor". Güçlü rakip teoriler:
  - **Selim:** Eve gittim yalanı, gece tekneyle çıkış, deniz kapağının iç sürgüsü açık, mirasa bağlı senet, "yirmi yıllık hesap" sesli mesajı.
  - **Yaşar:** Tahliye ihtarı, geçit anahtarı, İsmail'in "23:30'da yarım saat yoktu" sözü, gece kamyonete teneke yüklemesi.
  - **Kerem ve Nevin:** Askıya alınan proje, tehditli e-posta, tartışma.

  Hedef: Ömer ≤%30.
- **2. bölüm (Seviye):** Sensör dakikayı verir (23:38). Ustanın kamyonetinde anahtar bulunur (tuzak). İkinci suç kantar fişleri, bilirkişi, not defteri ve vekâletle fark edilir. Selim, Nevin, Kerem ve Yaşar saatli belgelerle aklanabilir. Ömer'in alibisi hâlâ ayakta. "Engin öldürdü, Ömer örttü" teorisi de ayakta: Engin'in 23:10 yalanı ancak 3. bölümde çöker. Hedef: Ömer ≤%55.
- **3. bölüm (Kaban):** Alibi çöker. K1 dökümünde turuncu yelek 23:18'de giriyor, 23:56'da çıkıyor. OYİ ölçüsü (üst kasa 1,72 m) ve sağlık taraması (Ömer 1,67, Engin 1,87) birlikte okunur. Kaban kolları kısa; Mehmet'in canlandırmasında "abi" ve "uzundu". Terazi'nin yazısı fişteki adın yalnızca oturum olduğunu söyler. GPS 00:03'ü gösterir. Engin sorguda çöker. Hedef: ~%80.
- **4. bölüm (Kül):** Doğrulama: kazan külü, anahtardaki kan ve lifler, değişiklik günlüğü, silinmiş mesajlar, dinleme. Sahne nötr: kazan söndürülüyor.

## Zincir (hepsi 4. bölümden önce kanıtlanabilir)
1. Kaza değil; alet 46'lık anahtar → e-otopsi, e-oyi, ph-pano, ph-havuz.
2. Dakika 23:37–23:38 → e-plc (4 m² × 1,9 cm ≈ 76 l), e-riza-hts (son kayıt 23:37), e-k2 (23:23 giriş), e-otopsi.
3. Geçitten giriş, anahtar yalnızca üç kişide → e-k2, ph-k4-2318, e-oyi, e-oyi-2 (deniz kapağı tuz kabuğu), e-anahtar, e-kroki.
4. Selim, Nevin ve Kerem dışarıda:
   - Selim: e-barinak, e-adisyon, e-tayfun-1, ph-k4.
   - Nevin: e-toplanti, e-nevin-kerem.
   - Kerem: e-taksi.
5. Yaşar panelde → e-hmi, ph-k3-2338; İsmail'in hatası CIP 00:22 ile düzelir.
6. Rıza Bey, Ömer'i çağırdı → e-riza-hts, e-riza-not, e-omer-2.
7. Kulübedeki Engin'di → e-k1-log, ph-k1-2342, e-oyi-2, e-isg, e-mehmet-1, e-mehmet-ses, e-kantar-teknik, e-engin-gps, e-engin-2.
8. Anahtarı 00:14'te Ömer koydu → ph-k5-0024, e-k2, ph-k2-0012, e-hmi, e-k1-log (kulübe 00:10–00:20 boş), e-kantar-gece (00:02–00:21 arası tartım yok), e-yasar-arama.
9. Motif ve ikinci suç → e-dudu-fis ile e-kantar-sistem (1.840 / 1.640), e-dudu-1, e-riza-not, e-noter-mail ile e-vekalet (04112 = Ömer), e-terazi-mail ile e-kantar-teknik (onay 17:02'de açıldı), e-bilirkisi, e-omer-banka.

## Masumları aklayan belgeler
| Şüpheli | Sırrı | Yalanı | 23:37'de aklayan |
|---|---|---|---|
| Selim | Tefeciye mirasa bağlı 1,5 milyon TL borç | "23:00'te eve gittim, tekne iskeledeydi" | e-barinak (23:40, saat 1 dk geri), e-adisyon 23:52, ph-k4 (23:18 çıkış; 2,6 mil / 7 mil ≈ 22 dk) |
| Nevin | Kerem'den gizli %2 başarı primi | "Tartışmadık" | e-toplanti (23:12–00:31, kamera açık, 23:36–23:52 ekran paylaşımı) |
| Kerem | Şirketi icrada | "22:30'da çıktım, konuşmadım" | e-taksi (23:08 → 23:27 Cunda) |
| Yaşar | Yıllardır teneke yağ alıyor | "Hattan ayrılmadım" | e-hmi (23:38 ve 00:14 USTA PIN'i), ph-k3-2338 |
| Engin | Kayıtsız yağ taşıyor; kulübede Ömer'in yerine durdu | "23:10'da çıktım" | e-k1-log: 23:26–23:55 arasında pencerede kesintisiz, tartımlar 23:33, 23:36, 23:42, 23:51 |

Yanıltıcı ipuçları (7): e-senet, e-sesli, e-ihtarname, ph-anahtar-kamyonet (yerleştirilmiş), e-nuri (dürüst saat hatası), e-ismail-1 (dürüst saat hatası), e-kerem-mail. Dürüstçe yanılan üçüncü tanık Mehmet'tir (e-mehmet-1); kişiyi kabanından yanlış tanıyor.

Mini çıkarım bulmacaları:
- Tekne süresi.
- Havuz hacmi ile beden.
- Pencere üst kasası ile boylar.
- Panelvanın kontak ve yol süresi.
- Fiş farkı (200 kg ≈ %11).

## Bilinen riskler
- **Planlama okuması:** "Engin öldürdü, Ömer örttü" okuması K1'deki kesintisiz pencere satırıyla (23:26–23:55) kapanıyor. Bu satır kaçırılırsa ölçü ve boy kanıtı da aynı sonuca götürür.
- **Ömer'in 00:12 açıklaması:** 1. bölüm sorgusunda Ömer, 00:12'de avludaki kabanlı kişinin kendisi olduğunu kabul ediyor ve depoya gittiğini söylüyor. Anahtar 2. bölümde bulununca dikkatli bir ekip yerleştirmeyi 2. bölümde Ömer'e bağlayabilir. Bu durumda 2. bölüm sonu güveni %55'i aşabilir. Kör testte ölçülmeli. Gerekirse o14 sorusu `needs: ['ph-anahtar-kamyonet']` ile ertelenebilir.
- **Portreler:** Ömer'in "kısa, tıknaz", Engin'in "çok uzun" portreleri 3. bölüm boy bulmacasını görsel olarak kolaylaştırır. Bu bilinçli bir tercih: portre tarifi kamera notlarında tekrar edilmiyor.
- **Ölçek:** Kanıt 63, iz 44, sorgu 9. İz sayısı zor mod üst sınırına yakın. Bütçe 39 saat; iyi bir ekip 23–28 saatte 3. bölümü bitirir.
- **Görsel kontrolü:** ph-k1-2342'de yüz pencere kasasının üstünde kalmalı ve kaban kolları kısa görünmeli. ph-k2-0012'de kolun altında beze sarılı uzun bir nesne olmalı. Üretimden sonra gözle kontrol edilmeli.
- **Şema:** Şema yeterli oldu, uydurma alan yok.

## Düzeltme turu (kör test + şeytanın avukatı sonrası)

### Kritik
- **iv-engin-2 alibiyi tek belgeyle çözüyordu.**
  - h3'te Engin artık yeni bir yalana geçiyor: "panelvanda uyudum". e-k1-log gösterilince de yeni bir yalan söylüyor: "Ömer'in yanındaydım, o tarttı".
  - Çöküş ve e-engin-2 yalnızca h3b'de açılıyor. h3b için e-k1-log, e-k1-deneme ve e-isg birlikte gerekiyor.
  - Kısmi itiraf yolu h3c'de: e-k1-log ile e-mehmet-ses gerekiyor.
  - Ayrıntı soruları (h4–h16) h3b'den sonra açılıyor.
- **e-riza-hts tek başına e-omer-2'yi açıyordu.**
  - Bu belge gösterme kaldırıldı. Kısmi itiraf artık p2b sorusunda; e-riza-hts, e-anahtar ve e-oyi birlikte gerekiyor.
  - e-omer-2'den Engin, kaban, ıslak kol ve 00:12 soruları çıkarıldı. Ömer orada "kulübe beş dakika boş kaldı" yalanında kalıyor.
  - "Engin yanımdaydı, ben tarttım o oturdu" yalanı ancak e-k1-log gösterilince, sorguda (p11) çıkıyor.
- **İzler belgelerden doğuyor (`from`).**
  - Bölüm başlarında kalan izler: 1. bölümde l-otopsi, l-oyi, l-avlu; 2. bölümde l-yasar-2, l-masa; 3. bölümde l-k1, l-omer-2; 4. bölümde l-kul, l-anahtar-lab, l-dinleme.
  - Diğer izler bir belgeden ya da bir sorgu cevabından doğuyor: l-sesli Selim s5'ten, l-toplanti Nevin n1'den, l-taksi Kerem k7'den.
  - İz açıklamaları, izi doğuran belgeyi anıyor.

### Zorluk eğrisi
- **1. bölümde Ömer'e işaretler azaltıldı.**
  - Mehmet'in "Ömer Bey bana hep Mehmet der" cümlesi çıktı; "abi" kaldı, bu ayrıntı gömülü.
  - "Yirmi yıllık hesap" → "Çoktandır kapanmamış bir hesap". Defterdeki "Yirmi iki yıl…" çıktı. Selim s15 yumuşatıldı.
  - Portrelerden boy sıfatları çıkarıldı (p-omer, p-engin).
  - Kerem k13 için artık e-bilirkisi gerekiyor.
  - Teaser ve 1. bölüm sahnesi, alibiyi vurgulamıyor.
  - Ömer'in ilk ifadesinde ve o5'te "depoya geçtim" bilgisi yok. o14'te ise "güney kapısından denize hava almaya" çıktığını söylüyor.
- **e-riza-hts 3. bölüme taşındı** (minAct 3). 2. bölümde Ömer'i patronla yüz yüze getiren bir belge yok; "Engin öldürdü, Ömer örtbas etti" teorisi 3. bölüme kadar ayakta. 2. bölüm geçişi: l-masa ve l-hmi.
- **3. bölüm başında yalnızca e-oyi-2 var.**
  - Pencere ölçüleri ve K1 denemesi yeni belgede: e-k1-deneme, l-k1-deneme iziyle (ph-k1-2342'den doğuyor). Denemeye kaban ve bilek gözlemi de eklendi.
  - ph-k1-2342 artık l-k1 iziyle geliyor; altyazısı yorumsuz.
  - 3. bölüm sahnesi ve ipuçları cevabı söylemiyor.
- **Seçenekler.**
  - Uzunluklar eşitlendi; doğru seçenekte kanıt ayrıntısı yok.
  - when sorusunun bütün seçenekleri artık aralık biçiminde.
  - Yanlış seçeneklerin dayanağı dosyada var: deniz kapağı, kazan dairesi, Ömer'in "kayıp düştü" ve "eski sayaç" sözleri.

### Çelişkiler
- **Kurgu ve sorular.**
  - "Yirmi yıldır soyuyor" → "yıllardır".
  - why ile second artık ayrı çıkarımlar. second'ın yeni sorusu: "Kayıtsız yağ nasıl paraya dönüşüyordu?" (s-korfez).
  - Kanıt sorusu failin ilk ifadesine bağlandı. e-omer-2 ve e-k1-deneme kabul listesine eklendi.
- **Defter ve kantar kayıtları.**
  - e-riza-not tarih sırası: 2 Kasım girdisi 2024 fişlerini anıyor (2.120 / 1.890, 230 kg). 1.840 → 1.640 ayrı bir 12–13 Kasım girdisinde.
  - e-dudu-1 ve kül raporundaki parçalar bu rakamlara uyduruldu.
  - Düzeltme sayısı 846'ya, düşürülen zeytin 178 tona çıkarıldı (≈35,5 t yağ). Engin'in sefer sıklığı "hasatta ayda iki üç" oldu.
- **Olay yeri.**
  - OYİ havuz seviyesi 1,12 m. PLC düşüşü 1,9 cm.
  - ph-kul: "üst katman".
  - Deniz kapağı iç sürgüsünün paslı olduğu e-oyi-2'de açıklandı.
  - Ceset 06:30'da havuzdan çıkarılıyor (e-tutanak).
- **Kayıtlar.**
  - HTS'ye 14.11 17:31 tarihli gelen SMS satırı eklendi; dönem notundaki "23:37'den sonra kayıt yok" ibaresi kaldırıldı.
  - Panel kaydına 3 dakikalık oturum kapanmaları eklendi.
  - K2: 23:10 "telefonuna bakıyor", 23:12 arama. Sesli mesajın arka planındaki kalabalık uğultusu çıkarıldı.
- **Tanık ifadeleri.**
  - İsmail sıkımhaneye 05:38'de giriyor.
  - Nevin eve "on biri beş geçe" geliyor.
  - Mehmet'in önündeki traktör cümlesi düzeltildi.
- **Araç ve sevkiyat.**
  - Engin'in aracı her yerde "panelvan".
  - Tenekeler kasada kaldı. Yaşar 00:41'de ilacını almaya eve gitti (z6, truth).
  - Satış parasının zarfı pazar sabahı Ömer'in evine bırakıldı (e-engin-2, h10).
- **Belgeler.**
  - Adisyon ve yakıt fişinde ödeme yalnızca "Nakit" (toplamı araç hesaplıyor).
  - Bez "açık renkli, yağ ve is lekeli".
  - İhtarnameyi Rıza Bey kendisi imzalamış. Vekil adı bilerek yazılmadı: 1. bölümde vekâleti Ömer'e bağlamasın.
  - e-isg'den sağlık teşhisi çıkarıldı.
- **Prosedür.** 3. bölüm sahnesinde ustabaşı tutuklandı (Sulh Ceza, pazartesi akşamı). Gözaltı uzatması kaldırıldı.
- **Sorgu kapıları.**
  - Yaşar'ın yalanları artık belge göstererek kırılıyor: ph-k5-0024 ve e-ismail-1 için tepki yazıldı. "Fabrikadan bir şey çıkarmadım" yalanı y10'a eklendi.
  - Kapıları düzeltilen sorular: s5, s16, n9, y6, p14, Kerem k13. o18 kaldırıldı.
  - truth.lies güncellendi.
- **TDK:** "yüzüstü", "pazar sabahı", "Pazartesi" (belirli tarihte), "kapüşonlu üst", "yuvarlatılmış kenar", "Körfez Sabah gazetesi".

### Yapılmayanlar ve gerekçesi
- **e-omer-banka'daki eksik aylar** (temmuz maaşı, bazı taksitler) eklenmedi. Bakiyelerin baştan hesaplanması gerekirdi; gerçekçilik eksikliği küçük ve çözümü etkilemiyor.
- **Kart ve fişlerdeki sayı biçimleri:** Noktalı virgül ve ondalık biçim araçtan geliyor. Metinde bırakılan toplamlar kaldırıldı.
- **Engin g12** ("Bu fişleri kim keser?") bırakıldı. Ömer'i değil, kantarın gece kimde olduğunu söylüyor; Engin'i de kapsıyor.

### Görseller
Henüz üretilmediler. Prompt ya da alt metni değişen görseller: p-omer, p-engin, ph-k5-0024, ph-k1-2342, ph-havuz.

### Ek kural (suçlama formu)
- **Soru metinleri:** Kurbanın adı çıkarıldı; "Kurban" deniyor. planted sorusu "kamyonetin kasası" diye soruyor; meslek adı geçmiyor.
- **Seçenek metinleri:** Hiçbirinde ad, meslek (ustabaşı, şoför, kazancı), yer adı (Cunda, Edremit), kantar, kaban ya da kulübe geçmiyor.
- **Uzunluk:** Seçenekler 61–78 karakter arasında.
- **Kesinlik veren kanıtlar** son bölümde duruyor: kriminal raporları, değişiklik günlüğü, mesajlar, dinleme.

## Son tur (ikinci kör testten sonra)
Testteki ölçüm: 1. bölüm %50, 2. bölüm %85. Yapılan ayarlar:

**1. bölümde erken eşleşmeler**
- Engin'in g11 sorusu ("Mehmet abi?") artık e-dudu-fis gerektiriyor (2. bölüm).
- Engin'in "Abi mi demiş?" tepkisi bir belge göstermeydi. Artık g11b sorusu; e-mehmet-1 ile e-plc gerekiyor.
- Ömer'in e-mehmet-1 gösterilince verdiği tepki 2. sorguya (iv-omer-2) taşındı.

**00:12 ile 00:14 karelerinin bağlantısı**
- ph-k5-0024 notunda artık 00:14 hareketi yok.
- K5'in tam dökümü yeni bir belgede: e-k5-log. Belge l-k5-log iziyle geliyor (2. bölüm; ph-k5-0024 ya da arama tutanağından doğuyor).
- y17, z15 ve zincirin 8. halkası artık e-k5-log'a bağlı.

**2. bölümde kesinleşme**
- l-vekalet ve l-terazi `minAct: 3` ile 3. bölüme kaydı. 2. bölümde ikinci suç görünüyor ama düzeltmeleri kimin yaptığı ve vekâlet henüz açık değil.
- Geçiş saatleri 13 / 13 oldu.

**Yaşar'a karşı 1. bölüm kanıtı**
- e-oyi'de havuz kenarında kırmızı yün lifleri var.
- Aklayıcı ayrıntı e-oyi-2'de (3. bölüm): lifler kanın altında. Usta 22:28'de havuzu doldurmuştu (y1).
- Yanıltıcı ipucu listesinde e-kerem-mail'in yerini e-oyi aldı; liste yine 7.

**Cevabı söyleyen metinler**
- "Şüpheli sıfatıyla" ifadesi l-omer-2 ve l-engin-2 başlıklarından çıktı.
- l-masak açıklaması vekâletnameye dayanıyor.
- 3. bölümün başlığı "Kaban" yerine "Cenaze"; 2. ipucu nötr.
- Ömer'in g11b'ye göre değişen "Abi" tepkisi ve Engin'in "Mehmet abi" sözü 1. bölümde görünmüyor.

**Form**
- a-panel çıkarıldı; yerine a-telefon geldi (telefon ve baz kaydı).
- proof kabul listesinde, kör testin savunduğu belgelerin hepsi var: ph-k1-2342, e-k1-log, e-k1-deneme, e-isg, e-mehmet-ses, e-engin-2, e-omer-2.

**Somut hatalar**
- "On bire on" → "on ikiye on" (e-engin-1, g14, e-tayfun-1).
- e-omer-1: Ömer kantardan avluyu görmediğini söylüyor; Kerem'le konuşmayı anlatmıyor.
- e-tutanak'ta İsmail'in saati 23:15.
- Engin'in "kazağının sağ kolu" cümlesi düzeltildi (e-engin-2 ve h6).
- Senet "matbu form".
- Kroki etiketi "kilitli tutulur".
- l-taksi izi kaldırıldı; taksi kaydı Kerem'in k7 cevabıyla geliyor.

**Değişen ses ve görseller**
- Sesli cevaplar:
  - iv-engin-2 h6: metin değişti.
  - iv-omer-1 → iv-omer-2: e-mehmet-1 tepkisi taşındı, metin aynı.
  - iv-engin-1: e-mehmet-1 tepkisi g11b sorusuna dönüştü, metin aynı.
- Görsel prompt'ları değişmedi.
