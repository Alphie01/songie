# Kordon’da Şantaj: öz-QA (1. tur, zor mod ve sorgularla)

Denetim: `case:check` hatasız. Tek uyarı, görsellerin henüz üretilmemiş olması (24/24).
`bölüm 4 · kanıt 56 · iz 40 · iz saati 63 · bütçe 35 · hedef 21 · karakter 11 · şüpheli 6 · görsel 24 · belge türü 15 · ses 4 · sorgu 9 (121 soru, 15 sesli cevap) · son bölüm öncesi kanıt 48/56`

## Çözüm özeti
- **Fail (who):** Nermin Erensoy. Levent’i salı sabahı vakıftaki odasından aradı ve fotoğrafları kocasından habersiz nakitle almak için buluşma ayarladı. Kuzey banklarında boğuştular; yakasından tutan Levent’i itti. Levent başını 13 numaralı babaya çarptı, suya düştü ve boğuldu. Nermin zarfı aldı ve yardım çağırmadı.
- **Şantaj ortağı (partner):** Ece Varlı. Şantajı kurdu, mesajları yazdı. Kardeşinin şirketi Mavi Piksel üzerinden kampanya parasının yarısını aldı. 00:47 mesajını da Levent’in öldüğünü bilmeden o attı.
- **Örtbas eden (cover):** Halit Erensoy. 2014’te kazayı şoförüne üstlendirdi. Ölüm gecesi 01:31’de eşinin arabasıyla Kordon’a gidip rozeti aradı, sabah baskıları yaktı, polise eşinin uyuduğunu söyledi.
- **Gizli ikinci suç (hidden):** 2014’te direksiyonda Nermin vardı. Halit ehliyetsizdi ve kolu askıdaydı; şoför İsmail izinliydi ve suçu üstlendi.
- **Alibi hilesi (alibi):** Sahil kapısı kamerası 1 saat 10 dakika geriydi ve Nermin bunu servis e-postasından biliyordu. Kayıtta 21:50’de çıkıp 23:24’te dönmüş görünür; gerçekte 23:00’te çıkıp 00:34’te döndü. Kızını Kordon’dan aradı; arama körfeze bakan Bostanlı S2 antenine bağlandığı için evden yapılmış gibi göründü.
- **Zaman:** 23:48–23:50. **Yöntem:** m-itme. **Para:** p-yari. **Kanıt sorusu:** e-site-gecis, e-site-mail, e-nermin-hts, e-baz-yazi.

## Zorluk eğrisi (tasarım hedefi)
- **1. bölüm sonu.** Nermin’in alibisi sağlam görünür: bekçi ve kamera 21:50–23:24 diyor, kızı 23:20 civarı balkonda konuştuklarını söylüyor. En güçlü aday Rıza’dır: tehdit kaydı, bej trençkot, büfecinin “uzun boylu adam”ı. Diğer teoriler: Ece (Levent’le eski meslektaş, yalan söylüyor, tarihi biliyor), Halit (stüdyo yalanı, 01:49’da rıhtımdaki telefon ışıklı kişi), Deniz (onu son gören). Deniz ve Sinan 1. bölümde ucuz izlerle aklanabilir.
- **2. bölüm.** Kripto raporu ve bütçe tablosu Ece’yi ortak olarak gösterir; taksi kaydı onu cinayetten aklar. İsmail’in ifadesi, ehliyet haberi ve düğün fotoğrafındaki kol askısı 2014 suçunu açar. Santral kaydı, Levent’i arayan hattın Nermin’in odası olduğunu gösterir. Rıza’nın bürosundan Levent’in kasa zarfı çıkar (tuzak). Hedef: Nermin ≤%55, Rıza hâlâ güçlü.
- **3. bölüm.** Devriye kaydı ile kamera karesi karşılaştırılınca 70 dakikalık fark çıkar; servis e-postası farkı ve Nermin’in bunu bildiğini doğrular. Operatör yazısı ve Nermin’in HTS’i (Turan → Bostanlı Sahil S2 → Salhane) aramanın Kordon’dan yapıldığını gösterir. Banka dökümü ve Rıza’nın yazışması zarfın Nermin’den geldiğini gösterir. Gala fotoğrafı ile basın fotoğrafı rozeti bağlar. Hedef: ~%80.
- **4. bölüm.** Kasa, USB’deki DSC_0112, ev araması (yırtık yaka, 90 bin bantlı nakit, barbekü külü), lif ve metal parça, taksi durakları, Halit’in telefonu doğrular.

## Zincir (her halkanın 4. bölümden önce kanıtı var)
1. Ölüm şekli ve saati: e-otopsi, e-oyi, e-155, ph-cam-2350, e-hts-levent, e-otopsi-kesin.
2. Önceden ayarlanmış buluşma ve kaybolan zarf: e-studyo-arama (takvim), e-sesli-mesaj, e-tutanak, e-oyi, (e-levent-not).
3. Şantaj ortağı Ece: e-muhur ile e-halit-1 (tarihi üç kişi biliyordu), e-studyo-arama (künye), e-zincir ile e-butce (480 / 240 bin; 5.714,28 × 42 = 240.000), e-hts-levent (son sinyal 23:47 → 00:47 mesajı onun telefonundan değil), e-ece-2.
4. Diğerlerinin alibisi: e-tv-kayit, e-taksi-ece, e-cms, e-alacati-fis, e-riza-hts.
5. 2014’te sürücü Nermin: e-ismail, e-ehliyet-haber, ph-dugun-2014, e-riza-kayit (“Halit sadece yolcuydu”), e-kupur-2014, (e-usb, ph-0112).
6. Nermin Levent’i buldu ve aradı: e-halit-1, e-nermin-1, e-riza-wp, e-hts-levent, e-santral, e-gulay, e-nermin-banka.
7. Sahte alibi: ph-sahil-cam, e-kemal, e-site-gecis, e-site-mail, e-selin, e-nermin-hts, e-baz-yazi, (e-taksi-kayit).
8. Rozet ve lif: e-oyi, ph-gala, ph-basin, e-gulay, e-otopsi-kesin, e-riza-arama (Rıza’nın trençkotu %65 polyester), (e-lif, e-ev-arama).
9. Rıza’ya yerleştirilen zarf: e-riza-arama (bantlarda “Körfez Bankası Karşıyaka Şb. 16.09”), e-nermin-banka, e-riza-wp, e-parmak, (e-lif).
10. Halit planlamadı, örttü: e-tv-kayit, e-halit-1, e-kamera-dokum (01:49), e-site-gecis (01:31–02:14 Nermin’in arabası), e-riza-hts (08:55’te “o mu?” araması, iv-riza-2’de anlatılıyor), (e-halit-imaj, e-ev-arama).

## Mini çıkarım bulmacaları
1. **Kamera saat farkı.** Sahil kamerası devriyeyi 20:05:32’de gösterir; sistem aynı devriye noktasını 21:15’te kaydetmiş. Fark 70 dakikadır; e-site-mail de bunu doğrular. 21:50 → 23:00, 23:24 → 00:34.
2. **Baz istasyonu.** Nermin’in evdeki bütün kayıtları KSK-Yalı Mah. S1’dir; 23:33 araması KSK-Bostanlı Sahil S2’dir. Levent’in Pasaport’taki son kaydı da S2’dir. Operatöre göre S2 körfeze bakar ve site içinden kayıtların yalnızca %0,3’ü bu antene düşer. Ayrıca 23:15 Turan ve 00:12 Salhane kayıtları güzergâhı verir.
3. **Kur hesabı.** 5.714,28 USDT × 42,00 = 240.000 TL; kampanya 480.000 TL ödedi.
4. **2014 eleme.** İsmail izinliydi, Halit’in ehliyeti mayısta altı aylığına alınmıştı ve kolu askıdaydı. Araçta kalan tek sürücü Nermin’dir.
5. **Yolculuk (4. bölüm).** 23:50’de kameranın önünden geçen kişi 23:56’da Pasaport durağından biniyor; 00:22’de Bostanlı’da inip 12 dakikada kapıya varıyor. Bu, kameranın “23:24” kaydıyla tutar.

## Masumları aklayan belgeler
| Şüpheli | Sırrı | Yalanı | Aklayan |
|---|---|---|---|
| Halit (örtbas eden, fail değil) | 2014 örtbası, kampanya parasıyla ödeme, stüdyo ziyareti | “Ödemedim”, “Levent’i görmedim”, “gece çıkmadım” | e-tv-kayit (23:41 ve 00:27 canlı) |
| Ece (şantaj ortağı, fail değil) | Şantaj, 240 bin | “Levent’i tanımam”, “ödeme yapılmadı” | e-taksi-ece (23:14–23:41 Buca) |
| Rıza (tuzak) | Rüşvetle veri, faturasız ücret | “Açık kaynakla buldum”, “tehdit etmedim” | e-riza-hts (23:46, 23:55 Bornova), e-otopsi-kesin ile e-riza-arama (lif tipi) |
| Deniz | Sinan’ın parası | “Gazetenin kasasından” | e-cms (22:41–01:22 kartlı bina) |
| Sinan | Deniz’i finanse etti | “Gazetecilerle işim olmaz” | e-alacati-fis (23:58 Alaçatı, imzalı) |

Dürüst ama yanılan tanıklar: Kemal (kameranın saatine güveniyor), Selin (“balkondaydı”, saati 23:20 sanıyor), büfeci Cemal (“uzun boylu bir adam”; taksi şoförleri “uzun boylu bir hanım” der, gala fotoğrafında Nermin topuklularla eşinden uzun).

Yanıltıcı ipuçları (7): e-riza-kayit, e-riza-arama, e-155, e-kamera-dokum, e-muhur, e-deniz-banka, e-kupur-2014.

## Bilinen riskler
- **Levent’in son kaydı 1. bölümde Bostanlı anteninde.** Bu dürüst bir anomali, ama keskin bir oyuncuyu erkenden Bostanlı’ya, yani Erensoylara yöneltebilir. Kör testte 1. bölüm güveni ölçülmeli.
- **Sahil kamerasının dönüş karesi.** Nermin şapkayla ve elinde katlanmış bir şeyle dönüyor. Saat kaymasını çözen oyuncu için güzel bir doğrulama; ama 1. bölümde dikkat çekebilir.
- **Santral kaydı (2. bölüm) güçlü.** Alibi sağlam göründüğü için Nermin’i tek başına çözmüyor; yine de 2. bölüm sonu güveni %55’i aşabilir. Gerekirse `l-santral` minAct 3 yapılabilir.
- **Kemal’in devriye saati.** İfadede devriye saati bilerek belirsiz bırakıldı; kesin saat yalnızca e-site-gecis’te var (3. bölüm).
- **Gerçek dünya ayrıntısı.** Karşı kıyıdan baz istasyonuna bağlanma gerçek bir olgu; belgedeki oranlar kurmaca. Taksi süreleri gece Altınyol için makul (14–15 km, 18–26 dk).
- **Doğrulayıcı hatası (koda dokunmadım).** `server/validate.ts` içindeki `reachable()`, bir sorgu cevabının `leadsTo` listesinde o bölüm için `minAct` engeline takılan bir iz varsa sonsuz döngüye giriyor. İz `leads`e hiç eklenmediği için her turda `changed = true` oluyor. Geçici çözüm olarak bu vakada minAct’li izleri sorgu cevaplarından değil, sorguyu açan izden (`l-riza`, `l-ece`, `l-sinan`) açtım.

## Düzeltme turu (kör test + şeytanın avukatı)
`bölüm 4 · kanıt 57 · iz 42 · iz saati 65 · bütçe 35 · hedef 21 · görsel 25 · sorgu 10 (133 soru)`; `case:check` hatasız, yalnızca görsel uyarısı var.

### Yapılanlar
**Kritik**
- **K1 – Suçlama formu.** Alibi seçenekleri faile özgü olmayan, eşit uzunlukta yöntem tariflerine çevrildi. "Kızıyla konuşan" ve "eşi canlı yayında" ifadeleri kalktı; `a-esi` yerine `a-benzer` geldi. Zaman seçenekleri artık yalnızca saat aralığı. `how`, `hidden` ve `money` seçenekleri aynı uzunluğa getirildi; doğru seçenek en ayrıntılı olan değil.
- **K2 – Tek belgeyle çözülme.** `iv-nermin-2`’de HTS gösterilince Nermin artık yeni bir yalan söylüyor: "Bir dostum arabayla aldı, Bayraklı’ya gittik". Kordon’a gittiğini ancak 4. bölümdeki `e-taksi-kayit` gösterilince kabul ediyor.
- **K3 – `needs` eksikleri.** m2 → `e-site-mail`, m13 → `e-ismail`, n5 → `e-kemal`, q8 → `e-riza-hts`.
- **K4 – `from` alanları.** Bölüm başlarında sırasıyla 3, 1, 1 ve 1 iz kaldı. Diğer bütün izler `from` ya da `leadsTo` ile bir belgeye veya sorguya bağlandı. Eşleme büyük ölçüde şeytanın avukatının önerisini izliyor. Ek olarak `l-riza-2` ve `l-ece-2` minAct 3, `l-taksi` ve `l-halit-tel` minAct 4 aldı.

**Zorluk eğrisi**
- **2. bölümün kolaylığı.**
  - `ph-basin` artık bölüm başında gelmiyor; yeni `l-basin` iziyle (minAct 3) açılıyor.
  - Gülay’ın rozet anlatımı çıkarıldı. "Rozet vakfın simgesi, 300 adet" bilgisi gala fotoğrafının notuna taşındı (`l-rozet`, minAct 3).
  - 2. bölüm sahnesindeki fotoğraf paragrafı kalktı; 3. bölüm sahnesinin anten imasını taşıyan son paragrafı silindi.
- **1. bölümün kolaylığı.**
  - Nermin’in "Başını izledim" cevabı "İzlemedim" oldu.
  - Sahil kapısı karesinden şapka ve kâğıt notu kalktı.
  - 1. bölüm ipucu yumuşatıldı. 2. bölüm ipucu artık "ehliyeti olmayan ve kolu askıda" demiyor.
- **Diğer.**
  - `l-baz` açıklaması nötr hâle geldi ve izin kaynağı HTS oldu.
  - Görsel tariflerinden "pamuklu" kelimesi çıkarıldı; basın fotoğrafında yakalar yorumsuz tarif ediliyor.
  - `e-levent-not`’tan "ailesi" ve "sürücü koltuğu" kalktı; 4. bölüm ipucu buna göre düzeltildi.
  - Sinan s11, Deniz’in künye tepkisi ve Rıza’nın q7/q9 cevapları kısaltıldı; çıkarımı artık oyuncu yapıyor.

**Tutarlılık ve gerçeklik**
- `e-site-mail` artık Nermin’in 10:31 tarihli yanıtı; eski e-postalar altta alıntılı. Saat sorununu Kemal değil gündüz görevlisi Hasan bildirmiş, böylece Kemal’in ifadesiyle çelişki kalmadı. Servis "uzaktan baktık" demiyor; cihaz internete bağlı olmadığı için teknisyen gelip bakmış.
- Rıza için bağımsız alibi eklendi: `ph-bornova` (yeni görsel `cam-bornova`). Kazımdirik’teki çay ocağının kamera kaydı (saati eşitli), 23:51; garson beyanı ve araç plakası da var.
- **Cesedin bulunuşu.** Ceset rıhtım dibindeki taş dolguda, 1,5 m derinlikte, bir halata takılı. Gece aramasında su karanlık ve bulanıktı. OYİ raporu cesedin babanın 20 m güneyinde bulunduğunu yazıyor; böylece 140 m ve 160 m arasındaki fark açıklandı.
- **Nermin’in boyu.** Rıza (iv-riza-2 q5) Nermin’in kapıda topuklularla kendi boyunda olduğunu söylüyor; taksi notlarına "topuklu" eklendi. Kırmızı ringa açıklaması buna göre güncellendi.
- Anten yönü 205° yerine 140° (güneydoğu); site antenin arka lobunda, kuzeybatıda kalıyor.
- **Lif bilimi.** Ön laboratuvar raporu karışım kumaşın da pamuk lifi bırakabileceğini açıkça yazıyor; Rıza’yı dışlayan dokuma sıklığı ve boya karşılaştırması `e-lif`’te. Rıza’nın tepkisi buna göre düzenlendi. "Kesin rapor" başlığı "ön laboratuvar raporu" oldu.
- Kroki artık "ölçekli değildir" notu taşıyor; mesafeler OYİ raporunda. Rozet işareti nötrleştirildi ("Delil 4").
- **Küçük düzeltmeler.**
  - Selin 2014’te 9 yaşındaydı.
  - Para iadesi "cuma günü" oldu (banka 18.09).
  - Rıza’nın 18:41 kaydı "veri" oldu.
  - Nermin’in HTS’indeki numara etiketi santralle uyumlu hâle geldi.
  - Gülay’ın "pazartesi" cümlesi düzeltildi.
  - Ev araması 14:00’e alındı.
  - `iv-ece-2` giriş metni düzeltildi.
  - Rıza portresinden "cotton" ve "uzun boylu" çıkarıldı.
- Halit’in 14.09 22:41 mesajı yeni h15 sorusuyla açıklandı (blöf).

**Sorgular**
- Yeni `iv-halit-2` eklendi (4. bölüm; `l-halit-3`, kaynağı `e-halit-imaj`). `e-halit-imaj`, `e-ev-arama` ve `e-usb` gösterildiğinde Halit’in örtbas ettiğini kabul ettiği tepkiler var.
- `iv-nermin-1`’de ilk ifadeyle aynı olan sorular (n7, n8, n9, n11) yerine yeni sorular yazıldı.
- Yalan listeleri genişledi: Halit’e 7, Nermin’e 4 yeni yalan eklendi.

**TDK**
- Belirli tarihli gün adları büyük harfle yazıldı: "14 Eylül Pazartesi", "18 Eylül Cuma", "16 Eylül Çarşamba", "21 Eylül Pazartesi".
- "Mart’tan" → "Marttan".

### Yapılmayanlar ve gerekçeleri
- **`e-taksi-kayit` kanıt sorusunun kabul listesine eklenmedi.** Belge son bölümde açılıyor ve denetim, son bölüm kanıtı kabul cevabı olunca uyarı veriyor. Ortak talimat da yalnızca son bölüm öncesi belgelerin kabul edilmesini istiyor. Kabul listesi: e-site-gecis, e-site-mail, e-nermin-hts, e-baz-yazi.
- **`iv-ece-2` ile `e-ece-2` içerik olarak örtüşüyor.** `e-ece-2`, sorgudaki itirafın resmî tutanağı ve rehberdeki "sorgudan çıkan kritik bilgi bir belgeyle kalıcılaşsın" kuralı gereği duruyor.
- **Kroki koordinatları değiştirilmedi.** Ölçek notu eklendi; ortak talimata göre koordinatlar yalnızca dökümde görünüyor.

### Değişen görseller (henüz üretilmedi)
`p-riza` (prompt), `cam-seagate` (prompt ve alt), `ph-press` (prompt ve alt), `ph-gala` (prompt ve alt), yeni `cam-bornova`.

### Ek kural (suçlama formu)
- Soru ve seçenek metinlerinden bütün karakter adları çıkarıldı ("kurban", "araç sahibi", "araç sahibinin eşi", "aracı şirket" gibi genel ifadeler kullanılıyor).
- Seçenek uzunlukları eşitlendi: soru başına 54–79 karakter; zaman seçenekleri yalnızca saat aralığı.
- Gizli suç sorusunda "araç sahibinin eşi" ifadesi kaçınılmaz olarak bir aile bağına işaret ediyor. Ancak araç sahibinin kendisi ve şoför de seçenek olarak duruyor.
- Kesinliği veren kanıtlar (`e-usb`, `ph-0112`, `e-lif`, `e-taksi-kayit`, `e-halit-imaj`, `iv-halit-2`) son bölümde kalıyor.

## Son tur (ikinci kör testten sonra)
Kör test 2'nin sonucu: 1. bölüm sonu Nermin %40, Rıza %30; 2. bölüm sonu %65; 3. bölüm %92. Hedef 2. bölüm sonu için ≤%60'tı. Bu turda yapılanlar:

- **2. bölümün yükü azaltıldı.**
  - `l-santral` en erken 3. bölümde açılıyor; onunla birlikte Gülay'ın ifadesi ve banka dökümü de 3. bölüme geçti.
  - 2\. bölümün geçiş izleri artık `l-riza-ofis` ve `l-ismail`; geçiş saati 11.
- **Gizli suçun erken sızması.** `e-riza-kayit`'te Levent artık "Halit Bey sadece yolcuydu" demiyor; "Hepsi onun değil abi. Asıl kareyi görsen şaşarsın" diyor. Rıza'nın q7 sorusu ve zincir metni buna göre güncellendi.
- **E-postadaki açık rakam.** `e-site-mail` artık "1 saat 10 dakika ekleyin" demiyor. Servis yalnızca "bir saati aşkın geride; tam farkı ölçüp düzelteceğiz" diyor. Kesin fark ancak devriye kaydı ile kamera karesi karşılaştırılınca çıkıyor.
- **İtirafın tek belgeyle gelmesi.** `e-santral` gösterilince Nermin artık inkâr ediyor ("kapım hep açıktır"). İtiraf yeni m15 sorusunda; bu soru `e-santral` ve `e-gulay` birlikte dosyadayken görünüyor. Sesli metin aynı kaldı, yalnızca yeri değişti.
- **İpuçları.** 2. bölüm ipucu 1 artık ortağı söylemiyor. 3. bölümün iki ipucu yön veriyor, çözümü söylemiyor.
- **Suçlama formu.** `cover` sorusu netleştirildi: "Faili tanıyan, ölümden sonra onu korumak için delil yok eden ve polise yalan söyleyen kim?" Fail kendini koruyan kişi sayılmadığı için Nermin bu soruya cevap olamaz. `proof` kabul listesi zaten e-site-gecis, e-site-mail, e-nermin-hts ve e-baz-yazi'yi içeriyor.
- **Tutarlılık.**
  - Krokinin notu mekân metniyle aynı oldu: "ölçekli değildir".
  - Banka satırı 150 bini 7 bant (100 × 200) ve 50 bantsız banknot olarak açıklıyor. 60 bin Rıza'da (3 bant), 90 bin evde (4 bant ve 50 bantsız); toplam tutuyor.
  - Mekân görseli artık 1. bölüm sahne görseliyle aynı değil (konumdan `image` kaldırıldı).
- **Dil.**
  - Selin'in "babam gelmiştir sandım" cümlesi düzeltildi; "Annem sinek öldüremez" yerine "Annem karıncayı bile incitmez" oldu.
  - Rıza'nın portresi "kısa beyaz sakallı" oldu; Levent'inkinde "Göz altları" yazıldı.
  - `ph-gala`'dan "topuklularıyla adamdan uzun" ifadesi çıkarıldı. Nermin'in boyu Rıza'nın q5 cevabında ve taksi notlarında duruyor.
- **Yapılmayan: `ph-basin` alt metnindeki "yakaları düz".** Görseldeki ipucu alt metinde de yazmalı; fotoğraf zaten 3. bölümde bir izle geliyor.
- **İngilizce ses türü etiketleri** araçtan geliyor; ortak talimata göre dokunulmadı.

**Değişen görsel anahtarları** (hiçbiri üretilmedi): `ph-gala` (prompt ve alt), `p-riza` (alt), `p-levent` (alt).
**Değişen ses metni:** `e-riza-kayit`, Levent'in 6. satırı.
