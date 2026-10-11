# Peri Bacaları Arasında (kapadokya-kayip): öz-QA, 1. tur

Denetim: `case:check` hatasız. Tek uyarı görsellerin henüz üretilmemiş olması (22/22).
`bölüm 4 · kanıt 64 · iz 43 · iz saati 66 · bütçe 36 · hedef 22 · karakter 11 · şüpheli 6 · görsel 22 · belge türü 14 · ses 4 · sorgu 8 (113 soru, 16 sesli cevap) · son bölüm öncesi kanıt 56/64`

## Çözüm özeti
- **Fail (who):** Murat Talay, otel sahibi. **Planlayan (planner):** Prof. Dr. Kemal Sağıroğlu, tez danışmanı.
- **Görünen suç:** kayıp, sonra alıkoyma. **Gizli ikinci suç:** arka yamaçta izinsiz beş süit oyulması ve buna dayanak raporun başka sahanın verisinden kopyalanması; parası Kemal’in eşinin şirketine.
- **Olay:** Kemal, Nehir’in karşılaştırmasını gördükten sonra (15.09 21:31) Murat’ı arayıp (22:40, 18 dk) kaydediciyi ve bilgisayarı aldırmak istedi. Murat aynı gece lobi kamerasının saatini 47 dk geri aldı. 16.09 08:33’te kilitli arka kapıdan iş yoluna çıktı. İstasyonda çanta çekişmesinde Nehir 08:58’de düştü. Murat onu ek binaya taşıyıp kilitledi, 09:11’de telefonunu kapattı, 09:27’de kaydediciyi söktü. 09:40’ta masaya oturdu; kamerada 08:53 görünüyor. Emine’ye rüzgârlığı giydirip çantayı otogara yolladı (kamerada 09:15 “çıkış”). Öğlen Nevşehir’den atel, bandaj ve kilit aldı. Gece telefonu otelde açıp kilit ekranından “Bitti” yazdı. 17.09 gecesi telefonu Onur’un aracına attı ve çekmecedeki turist telefonuyla ihbar etti.
- **Cevaplar (düzeltme turu sonrası):** who=murat · planner=kemal · how=h-cihaz · why=y-ihbar · alibi=a-saat · hidden=s-oyma · when=w-0940 · where=p-ekbina · proof=e-ferhat-cam / ph-cam-1002 / ph-cam-1021 / e-ferhat-2 / e-emine-2 / e-gps / e-kartlog.

## Bölüm akışı ve hedeflenen güven
- **1. bölüm (Çarşamba):** Kaçış güçlü görünüyor: çıkış kaydı, emanetteki çanta, gece mesajı, Norveç teklifi, nakit çekim. Rakip teoriler:
  - Onur: kavga, bilek, 112’deki yalan ve dakikalık saat.
  - Ferhat: kaybolduktan sonraki kart çekimi, meydanda görülmesi, yalanı.
  - Tolga: bar fotoğrafı, alçak uçuş yalanı.
  - Kemal: telefon görüşmesini inkâr etmesi, annenin “korkuyordu” sözü.

  Murat’ın lobi kaydı, Gizem’in “dokuz gibi masadaydı” sözü ve kendi beyanından oluşan sağlam bir alibisi var. Hedef: Murat ≤%30. Lobi kaydı 1. bölümde yalnızca 08:40–11:30 bölümüyle geliyor, bu yüzden saat kayması burada hesaplanamıyor.
- **2. bölüm (Perşembe şafak):** Nehir istasyonda düşmüş ve yaralanmış. İz köpeği iş yoluna kadar iz sürüyor; bu, Murat’ın “iş yolundan inip çıkış yaptı” anlatısını destekliyor. Telefon Onur’un arabasında çıkıyor ve isimsiz bir ihbar geliyor. Kaydedici 09:27’de sökülmüş, Murat ise kayda göre o saatte masada; şüphe Onur’a ya da başka birine kayıyor.

  İkinci suç fark ediliyor: 112/4 parseli, izin dosyası, balon fotoğrafındaki yedi açıklık, kopya sayılar. Kemal’in planlayıcılığına ilişkin işaretler de geliyor: 22:40 araması, bulut silmesi, sökme yöntemi.

  Dikkatli oyuncu Onur tuzağını 21:35 karakol ayrıntısıyla ve konum geçmişindeki 21:34 Taşoda kaydıyla sezebilir. Hedef: Murat ≤%55.
- **3. bölüm (Perşembe gecesi):** Alibi çöküyor: saat kayması, Emine, halıcının kamerası, ihbar telefonu, eczane, kilit ve Murat’ın HTS güzergâhı. Hedef: ~%80.
- **4. bölüm (Cuma, yağmur öncesi):** Sahne nötr. Dört adreslik arama talebi var, fail adı geçmiyor. Kesin kanıtlar izlerle geliyor: ek binada bulunuş, Nehir’in ifadesi, DVR günlüğü, kurtarılan Kemal–Murat yazışması, zaman atlamalı kamera.

## Alibi hilesi: en az üç belgenin birlikte okunmasıyla çöker
1. **e-dvr-sabah** (3. bölüm). Kamerada balon servisi 07:01’de duruyor, Nehir 07:02’de giriyor, otel minibüsü 07:51’de kalkıyor.
2. **e-servis**: servis 07:49:10’da durdu. **e-transfer**: minibüs 08:38’de kalktı. **e-ferhat-cam** (NTP): aynı olaylar 07:49 ve 08:38. Ayrıca **e-ucus** (iniş 07:12) ve **e-hts-nehir** (07:15’te Çavuşin), Nehir’in 07:02’de otelde olamayacağını gösteriyor.
3. Fark her yerde 47 dakika. **e-dvr-mail**: cihaz 3 Eylül’de doğruydu, saat pili var, kendiliğinden geri gitmez.
4. Bu farkla Murat masaya 09:40’ta oturmuş oluyor; “09:15 çıkışı” da 10:02’ye denk geliyor. 10:02’de çıkan kişi 10:21’de uzun örgüsüyle döner (**ph-cam-1021**), **e-kartlog** 10:21’de servis kapısında HK-2’yi gösterir, **e-ferhat-2** ve **e-emine-2** de bunu doğrular.
5. Ek doğrulamalar:
   - **e-eczane**: Murat 11:08’de Nevşehir’de. Kamera ise onu 11:00 damgasıyla otele girerken gösteriyor; düzeltilmiş saatle 11:47.
   - **e-murat-hts**: 08:51 ve 09:16’da iki cevapsız çağrı var.
   - **e-dvr-log** (4. bölüm): 15.09 23:12’de saat elle geri alınmış.

## Zincir (her halkanın son bölümden önce kanıtı var)
1. Gönüllü gitmedi: e-alan-yazi, a-sesli-not, ph-oda6, e-sevim, e-bilisim-tel.
2. 08:58 düşüş, iş yoluna taşınma, 09:11 telefonun kapatılması, 09:27 sökme: e-gps, e-jak2, ph-dere, e-kan, e-kurulum, e-hts-nehir.
3. Kamera 47 dk geride: e-dvr-sabah, e-servis, e-transfer, e-ferhat-cam, e-ucus, e-dvr-mail (+e-dvr-log).
4. “Çıkış yapan Nehir” Emine: e-ferhat-cam, ph-cam-1002/1021, e-kartlog, e-ferhat-2, e-emine-2.
5. Murat’ın sabahı: e-emine-2 (08:33 yukarı, 09:34 aşağı), e-gizem-1 (Nehir’in nereye gittiğini sordu), e-murat-hts, e-hasan (kapı hep kilitli).
6. Onur’a kurulan tuzak: e-kayip, e-bilisim-tel, e-konum, ph-arac, a-ihbar (“altı numara”), e-hat-kayit ile e-kayip-esya, e-murat-hts (23:12–23:56 merkez) ve e-ferhat-cam (23:09–23:58).
7. İkinci suç ve motif: e-alan-yazi, e-izin, ph-hava, e-karsilastirma, e-masak, e-hasan.
8. Planlayan Kemal: e-kemal-hts, e-murat-hts, e-kurulum, e-drive (11:10–11:14, savunma arasında, e-juri), a-telesekreter (+e-kemal-murat).
9. Yer, ek bina: e-kroki, e-gps, e-jak2, e-hasan, e-eczane, e-murat-banka (+e-arama).

## Masumları aklayan belgeler
| Şüpheli | Sırrı | Yalanı | Aklayan |
|---|---|---|---|
| Onur | Gizli konum uygulaması, lobideki bilek | “Sabah görmedim” | e-onur-is (08:31–10:12, kamera açık), e-kayip (21:35 karakolda), e-bilisim-tel |
| Ferhat | Kayıt dışı komisyon, saklanan kart numaraları | “Dükkândan çıkmadım”, “kamera bozuk” | e-ferhat-cam (K2: 08:40–09:57 tezgâhta), e-kargo |
| Tolga | Alçak geçiş, iki kayıtsız yolcu | “300’ün altına inmem” | e-lpg (08:51–09:12 dolum, pompacı) |
| Kemal | Sahte rapor, para | “Konuşmadık” | e-juri (09:12–12:24 Ankara). Planlayan olarak suçlu, ama uygulayan değil |
| Emine | Sigortasız; çantayı götürdü | “Dışarı çıkmadım” | e-kartlog (08:31–09:41 odalar), e-emine-2. Bilmeden örtbasa alet edildi |

## Katman denetimi (zor mod)
- **İç içe suç:** kayıp ve alıkoyma, kaçak oyma ile sahte raporu örtüyor.
- **Çok rollü suçluluk:** Kemal planlayan, Murat uygulayan ve örtbas eden, Emine bilmeden örtbasa alet olan.
- **Tuzak şüpheliler:**
  - Onur, yerleştirilmiş kanıt. Fark edilmesini sağlayan dürüst ayrıntılar: telefon camın tam altında; 21:35’te karakolda; Wi-Fi Taşoda’yı gösteriyor.
  - Ferhat: kart çekimi, meydanda görülmesi, yalanı.
- **Yanılan dürüst tanıklar:** Gizem (rüzgârlıktan teşhis; Murat’ı “dokuz gibi” masada sanması), Recep (rüzgârlıktan teşhis).
- **Mini bulmacalar:**
  1. Kamera saat farkı (47 dk).
  2. Balonun yerden yüksekliği: 1.148 − 1.110 = 38 m.
  3. İhbar hattı: turist hattı → kayıp eşya çekmecesi → şarj edilmiş telefon.
  4. Murat’ın baz dizisi (Göreme–Merkez → Uçhisar → Nar → Nevşehir) ve eczane saati.
  5. Parsel numarası eşleştirmesi (112/4 = Taşoda).
  6. Rapor ile Uçhisar verisinin aynı olması.
- **Uzun tablolar:**
  - HTS: Nehir 47 satır, Kemal 34 satır, Murat 45 satır.
  - Banka: Nehir 27 satır, Murat 25 satır, şirket 24 satır.
  - Kart kaydı: 37 satır.
- **Sorgular:** 8 sorgu; Murat ve Onur iki kez sorgulanıyor. Murat kırıldığında yalnızca kısmen kabul ediyor, ardından yeni bir yalana geçiyor (“kız telefon etti”, “sargı benim için”).

## Bilinen riskler
- **Murat’ın iş yolu anlatısı 2. bölümde fazla zayıf görünebilir.** Kayıt 09:07’de derede bitiyor, kan var, çıkış ise 09:15’te. İz köpeği ve “kapı açıktı” beyanı bu açığı kapatmak için konuldu. Kör test 2. bölümde Murat’ı %55’in üstünde bulursa çıkış damgası 09:20’ye kaydırılabilir.
- **e-konum (2. bölüm) 21:34’te telefonu Taşoda civarında gösteriyor.** Bu, oteli işaret ediyor. Murat anlatısında “Nehir gece oralardaydı” diye okunabilsin diye bırakıldı.
- **Seçenek metni:** `alibi` sorusundaki doğru seçenek 47 dakikayı açıkça söylüyor. Bu yüzden `when` sorusu, alibi doğru bilindiğinde kolaylaşıyor. İstenirse seçenekten sayı çıkarılabilir.
- **Görseller:**
  - `cam-1021` karesinde uzun örgü görünmeli.
  - `tl-0850` karesinde zeytin yeşili yelek görünmeli; bu bilinçli olarak portreyle örtüşüyor, çünkü yalnızca 4. bölümde geliyor.
- **Hukuki ayrıntılar:** Kriminal DNA ön raporunun yaklaşık 36 saatte çıkması, acil işlem varsayımına dayanıyor. Ek binaya hâkim kararıyla girildi.
- **Doğrulayıcı hatası:** `validate.ts` içindeki `reachable` fonksiyonunda, sorgu cevaplarının `leadsTo` ile minAct’li bir izi daha erken bir bölümde açması sonsuz döngüye yol açıyor. Bu vakada döngüye yol açan bağ kaldırıldı; kod düzeltilmedi.


## Düzeltme turu (kör test ve şeytanın avukatı sonrası)
Denetim: `case:check` hatasız; yalnızca "22/22 görsel üretilmedi" uyarısı kaldı.
`kanıt 70 · iz 45 · iz saati 71 · bütçe 39 · hedef 28 · sorgu 9 (127 soru, 18 sesli) · son bölüm öncesi kanıt 61/70`

### Suçlama formu
Formu kişisiz yazdım: hiçbir soru ve seçenek metninde ad ya da meslek geçmiyor.
- **Seçenekler:** Alibi seçeneklerinden üçü başka şüphelilere uyuyor (toplantı bağlantısı, dolum fişi, kalabalık salon). Doğru seçenekten sayıları çıkardım. Seçenek uzunluklarını eşitledim; doğru seçenek artık en uzunu değil.
- **Soru metinleri:**
  - `when`: “Lobi kaydında 08:53’te masaya oturan kişi gerçekte kaçta oturdu?”
  - `proof`: “09:15’te otelden kendisinin çıkış yaptığı beyanı…”
- **Kanıt sorusu:** Kabul listesine e-gps ve e-kartlog eklendi; e-servis ve e-transfer çıkarıldı.
- **Puanlar:** who 30, proof 15; toplam 100.

### 1. bölümdeki işaretleri azalttım
- **Otel sahibinin ifadesi yumuşatıldı.** Murat çıkış anında telefondaymış: kart masaya bırakılmış, yüzü görmemiş. Yüz yüze yalan 2. sorguya taşındı. “Yediye doğru döndü” sözü silindi.
- **Gizem’in ifadesi:** “Nereye gitti?” sorusu ilk ifadeden çıkarıldı; yeni belge e-gizem-2’ye (3. bölüm) taşındı. Yerine, saat vermeden geçilen bir mal teslimi cümlesi kondu.
- **Emanet fişi:**
  - Telefon numarasının son dört hanesi okunmuyor (çay dökülmüş).
  - “Otel çamaşır torbası, üçe katlı” ayrıntısı çıkarıldı.
- **Portreler:** Nehir’in ve Emine’nin portrelerinden saç tarifi çıkarıldı (bere ve bone). Görsel anahtarları: `p-nehir`, `p-emine`.
- **İzler belgelerden doğuyor:** Her bölüm başında 2–3 genel iz var. Diğer bütün izler `from` ya da `leadsTo` ile bir belgeye veya sorgu cevabına bağlı.

### 2. bölüm
- **Yürüyüş kaydı:** e-gps artık bedava gelmiyor; l-patika iziyle açılıyor (minAct 2, kaynağı annenin ifadesi ve JAK raporu).
- **JAK raporu:**
  - Köpek izi derenin üst ucundaki kayalıkta kayboluyor; otelin kapısıyla bağ kurulmuyor.
  - Sürtünme izlerinin yürüyerek mi taşınarak mı oluştuğu belirsiz bırakıldı.
  - İstasyonlara üniversiteden alınan koordinatlarla gidiliyor.
- **Kart kayıtları:** l-kartlog 3. bölüme itildi.

### Alibi çöküşü ve kademeli itiraflar
- **Halıcı kaydı ikiye bölündü:**
  - Salı sabahı: K2 08:40–09:57; K1 ise 09:57’ye kadar dükkân önüne asılan kilimlerle kapalı, sonrasında yalnızca 10:02 çıkışı ve 10:21 dönüşü görünüyor.
  - 17 Eylül gecesi: ayrı belge e-ferhat-gece, ayrı iz.
  - Kamyonet saatleri artık yalnızca HTS’den geliyor.
- **Saat kayması** yalnızca e-dvr-sabah ile servis, transfer, uçuş ve HTS kayıtlarının birlikte okunmasıyla bulunuyor.
- **Emine’nin itirafı kademelendi:**
  - Kare gösterilince yalnızca otogara gittiğini kabul ediyor (e-emine-2).
  - İş yolu tanıklığı ayrı bir belge (e-emine-3); bu soru açılmak için hem e-emine-2’yi hem e-hasan’ı istiyor.
- **Murat’ın masada olmadığına yeni bağımsız belgeler** (son bölüm öncesi): e-irsaliye (Kardelen teslimatı 09:05, Murat bulunamadı) ve e-gizem-2.
- **Rüzgârlık:** Emine odadan alıyor, Murat “sen giy” diyor.

### Kemal
- İkinci sorgu eklendi (iv-kemal-2, minAct 3).
- Kısmi kabul (“cihazı söyledim, kızı değil”) üç belgenin birlikte gösterilmesini istiyor: e-kemal-hts, e-murat-hts ve e-drive. Bu kabul, yazılı ifade e-kemal-2’yi açıyor.
- Kemal’in yalanları lies listesine eklendi.

### Tutarlılık ve gerçeklik
- **Sesli mesaj:** Savunma arasına taşındı, 10:52 (e-hts-nehir, e-kemal-hts, a-telesekreter).
- **e-gps:** Yükleme cümlesi düzeltildi.
- **Lobi kaydı:** Bütün damgalar tam 47 dk geride; 48 dakikalık sapma giderildi. Yönler düzeltildi: Nehir sağa (batı), taklitçi sola (doğu).
- **DVR teslimi:** “USB kopyası teslim edildi” olarak düzeltildi.
- **Eczane tutarı:** 537,40 TL; ekstre ve bakiyeler buna göre düzeltildi.
- **MASAK dökümü:** 25 satır, bakiyeler tutarlı. Kaynağı “bankadan savcılık yazısıyla” olarak düzeltildi.
- **Kart son dört hanesi:** 2068 (Onur’un plakasıyla çakışmasın diye).
- **15 Eylül gecesi saatleri:** yükleme 21:20, Kemal’in görüntülemesi 21:25, ekran görüntüsü 21:18.
- **Resepsiyon hattı:** Akşam saatlerinde Murat’ın cebine yönlendirildiği belgede yazıyor.
- **Zaman atlamalı kamera:** Nehir’in kendi hesabına bağlı ve proje envanterinde yok. Kemal bu yüzden bilmiyordu.
- **Hızlı DNA ön raporu:** Karşılaştırma örneği emanetteki diş fırçası.
- **Diğer:**
  - İstasyon notu: “Göreme’ye 8 km”.
  - Ferhat’ın “üç hafta” kırıcı sözü.
  - “Kredili mevduat” ve “yolcu listesi” düzeltmeleri.
  - TDK düzeltmeleri.
- **Sahneler:** Bütün sahneler 120 kelimenin üstünde; 3. bölüm sahnesi nötrleştirildi.
- **4. bölüm aramaları:** Dört adresin tamamı iki arama iziyle karşılanıyor (l-ara-ekbina, l-ara-diger, ikisi de e-savci’den doğuyor). Hastane ifadesi ek bina aramasıyla birlikte geliyor.

### Bu turda yapmadıklarım
- **İfade uzunluğu:** e-emine-3 ve e-hasan 12 soru-cevaba tamamlandı. Kısa sorgular gerekçeli: avukatlı sorgularda sorular az.
- **Saat çakışması:** Telefonun 09:11’de kapanması ile 09:13’teki “çıkış” arasındaki yakınlık bırakıldı. Murat’ın anlatısında Nehir telefonunu kapatıp inmiş olabilir; bu gerçek bir ikilem.
- **Görseller:** `cam-1021` hâlâ uzun örgüyü gösteriyor. Bu 3. bölüm kanıtı olduğu ve kayıp kadının kısa saçı e-kayip’te yazdığı için bilinçli olarak bırakıldı.

## Son tur (ikinci kör testten sonra)
Test sonucu: 1. bölüm sonunda Murat %45, 2. bölüm sonunda %75. Hedef: ≤%35 ve ≤%60.

### 1. bölümde otel sahibini gösteren işaretleri yumuşattım
- Emanet fişinde telefon artık okunmuyor; yalnızca baştaki sıfır görülüyor. Otel numarasıyla eşleşmiyor.
- Fişin saati yok: fiş makinesi arızalı, görevli elle "sabah" yazmış. Emanetçi de "dokuzla on arası" diyor. Böylece 09:15 çıkış ile emanet arasındaki 50 dakikalık boşluk 1. bölümde hesaplanamıyor. Kesin saat (10:02 ve 10:05) ancak 3. bölümde halıcının kamerasından geliyor.
- Emanetçinin "köylü ağzı" ve "kâğıttan okudu" sözleri çıkarıldı.

### 2. bölüm
- **Kemal'in HTS'si 3. bölüme taşındı.** l-kemal-hts artık minAct 3. Planlayanın son bölüm öncesi kanıtı korunuyor.
- **Turist hattının yeri belirsizleşti.** e-hat-kayit'te hattın kullanımı artık "Kapadokya bölgesi (Göreme, Ürgüp, Avanos)" diye geçiyor, Aydınlı yazmıyor.

### Fazla açık yerler
- **e-dvr-kare notu:** "Sabah bölümü henüz izlenmedi" ifadesi yerine nötr bir aralık bilgisi yazıldı.
- **İpuçları nötrleştirildi:**
  - 2. bölüm ipucu 2: oda numarasına gönderme kaldırıldı.
  - 3. bölüm ipucu 2: "o kişi kim / kilit" gibi yönlendirmeler kaldırıldı.
- **Ferhat Emine'nin adını vermiyor.** Hem e-ferhat-2'de hem sorgudaki sesli cevapta yalnızca "uzun örgülü, yüzünü görmediğim bir kız" diyor. İkameyi çözmek için artık örgü, kart kaydındaki 10:21 servis kapısı girişi ve Emine'nin itirafının birlikte okunması gerekiyor.

### Tutarsızlıklar
- **Kart kaydına işletme dairesi geçişleri eklendi:** 05:01, 08:23/08:31, 09:35/09:39. Kayıt notunda dairenin iki yönlü kayıt tuttuğu yazıyor.
- **Taşıma süresi netleşti.** Hasan'ın ifadesine "derenin üst ucundan ek binaya 180 m, hep iniş" bilgisi eklendi. Gerçek zaman çizelgesi de buna göre ayrıntılandırıldı:
  - 09:07–09:20 ek binaya iniş;
  - yaklaşık 6 dakikalık tırmanış;
  - 09:27 söküm;
  - 09:34 dönüş.
- **Diğer:**
  - Emine'nin "akşamları kamyonet" sözü "iş yolundan poşetle" olarak değiştirildi.
  - e-ucus'ta 06:32 satırı "otel çatıları üstü" oldu.
  - Arka camın açıklığı her yerde "aralık / birkaç santim" (alt metin ve Onur'un cevabı).
  - 3. bölüm sahnesindeki söylenti cümlesi silindi.

### Dil
- "HTS'sinde", "sizin kayıp kız", "komutanım" (Ferhat ve Tolga), "salı öğleden önce".

### Form
- `proof` kabul listesine e-hts-nehir eklendi. Liste artık: e-ferhat-cam, ph-cam-1002, ph-cam-1021, e-ferhat-2, e-emine-2, e-gps, e-kartlog, e-hts-nehir.
- Geçiş saatleri güncellendi: 2. bölüm 12, 3. bölüm 20.

### Değişen görsel ve ses
- **Görsel alt metni:** `img-arac` (prompt değişmedi). Görseller henüz üretilmedi.
- **Sesli sorgu cevapları:**
  - iv-onur-2 / e-arac gösterimi: "cam aralık".
  - iv-ferhat / e-ferhat-cam gösterimi: ad verilmiyor.
- Ses kaydı metinleri değişmedi.
