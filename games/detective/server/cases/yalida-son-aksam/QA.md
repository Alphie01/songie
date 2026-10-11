# Yalıda Son Akşam: öz-QA (3. tur)

## Çözüm özeti
- **Fail:** Tarık Sezgin (damat, restorasyon mimarı).
- **Motif:** Leyla’nın imzasını taklit ederek onun %8 payını şirketinin 18,5 milyon TL’lik kredisine rehin verdi. Kredi ödenmedi; Nevzat Bey öğrendi ve pazartesiye kadar süre verdi.
- **Yöntem:**
  - 23:01’de ıhlamura Müjgân Hanım’ın alprazolamını kattı ve tepsiyi kendisi götürdü.
  - 23:36’da kurulum koduyla (00) teknik odaya girdi, 23:37’de şalteri indirdi.
  - 23:41–23:45 arasında kayınpederini kırlentle boğdu.
  - 23:57’de yine 00 koduyla şalteri kaldırdı.
  - 9’u 10 Şubat’a bağlayan gece 02:09’da alarm hafızasını sildi.

## 2. turda yapılan düzeltmeler

### Erken çözülme (ana sorun)
- **Zeynep’in tanıklığı:** Artık tepsiyi taşıyanın yüzünü görmüyor. Yalnızca koyu giysili bir erkeğin sırtını görüyor ve “Babam bekliyor” sözünü duyuyor. O an Kerem sandığını, sonradan damadın da “baba” dediğini düşündüğünü söylüyor. `l-zeynep` artık `minAct: 2`. “Elini cebinde tutuyordu” ayrıntısı bu ifadede kaldı, yani 2. bölüme geçti. İzin açıklaması ve sonucu nötrleştirildi.
- **Tepsi için ikinci bağımsız kanıt (kural 3):** 2. bölümdeki laboratuvar raporu (e-lab-1), tepside kimliği belirsiz ikinci bir kişinin izi olduğunu söylüyor. 3. bölümde yeni iz `l-iz` ve yeni rapor `e-lab-iz`, bu izlerin Tarık’a ait olduğunu gösteriyor. Hatice Hanım tepsiyle tabağın o akşam dolaptan yeni çıktığını söylüyor; böylece izin başka bir saatte bırakılmış olma ihtimali kapanıyor.
- **Kod bilgisi 1. bölümden çıktı:** “Kodu yalnızca Rıza ve Tarık bilir” cümlesi kaldırıldı. Rıza artık “benim kodum var, Nevzat Bey’in var, başkası alarmcıda” diyor; Hatice “kimin kodu var bilmem” diyor. Kod listesi 3. bölümde geliyor. Tarık’ın kendi kodunu 23:57’de kullandığını söylemesi 1. bölümde kaldı.
- **Kesinti ve kamera belgeleri 2. bölüme kaydı:** `l-ariza`, `l-catering` ve `l-iskele` artık `minAct: 2` (savcılık yazısı ve hafıza kartı çözümlemesi zaman alıyor). Böylece 1. bölümde kesintinin iç tesisattan olduğu da, Kerem’le Leyla’nın kamerayla aklanması da henüz yok.
- **112 kaydı:** “Yarım saat… hayır” ağız kaçırması çıkarıldı. Yalan olan “bütün mahalle karanlıktı” cümlesi kaldı; bunu çürüten belge 2. bölümde.
- **Hatice’nin bilek tarifi:** “Kesikten çok tırmığa benziyordu” çıkarıldı. Tırnak sıyrığı bulgusu artık 4. bölümdeki adli muayenede.
- **Beklenen 1. bölüm tablosu:**
  - Müjgân: yalan söyledi, ilacı var.
  - Kerem: yalan söyledi, tablo kayıp.
  - Leyla: “Tarık’la birlikteydik” yalanı.
  - Tarık: kodu var, ışığı o getirdi, bileği sargılı.
  - Rıza aday dışı değil.
  - Kesinleşme 2. bölümde (HTS’deki SMS, kesinti kaydı, Zeynep) ve 3. bölümde (alarm kaydı, kod listesi, parmak izi) oluyor.

### Kritik
1. **Kroki:** Teknik oda artık servis merdiveninin dip sahanlığına açılıyor. Sahanlık; mutfağa (yaylı, camlı kapı), arka koridora, servis geçidi üzerinden sofaya ve teknik odaya bağlanıyor. K4 arka koridordan sahanlığa ve teknik oda kapısına bakıyor. K3 servis geçidinin sofaya açılan kapısını görüyor.
   - Tarık’ın 23:36–23:38 arası yolu: birinci kat → servis merdiveni → teknik oda → yukarı. Bu yol hiçbir çalışan kameradan geçmiyor.
   - Diğerleriyle karşılaşmıyor: Kerem iskeleye kendi odasının teras kapısından çıkıyor; Müjgân 23:39’dan sonra iniyor; mutfak kapısı kapalı.
   - Hatice ile Zeynep, 23:56’da camdan geçen telefon ışığını ve Tarık’ın kapıdan bakışını anlatıyor.
2. **K4 tutarlılığı:** DVR özetine 16:57 ve 17:06’da Rıza’nın girişi ve çıkışı eklendi; 17:40:58’de ise yüzü, boyu ve cinsiyeti seçilemeyen bir silüet. Rıza’nın ifadesi de buna uydu (“beşte kombiye baktım”).

### Önemli
3. **Saat verisi:** Artık saatin kendi hafızasından ve bulut hesabından alınıyor. Hesap bilgisini Leyla muvafakatiyle verdi; “saati Leyla kurdu” ayrıntısı böylece işlevli.
4. **Rehin bildirimi:** Tarih 02.02.2026 oldu, ek adı da değişti.
5. **Kanıt sorusu:** Soru metni “Failin ilk ifadesindeki yalanlardan birini en açık hangi belge çürütüyor?” oldu.
   - Kabul edilen belgeler: e-alarm-log, e-kod-formu, e-lab-iz, e-lab-1, e-hts-nevzat, e-londra-kayit, e-ariza, e-dashcam, e-dinleme-bora, e-ifade-leyla-2.
   - e-whatsapp ve e-dna kasıtlı olarak eklenmedi: son bölümde açıldıkları için case:check uyarı veriyor.
6. **Müjgân’ın aklanması:** 2. bölüme yeni belge e-hts-mujgan eklendi; avukat görüşmesi 23:24’ten 23:39:14’e kadar. Zeynep, Müjgân mutfağa geldiğinde attığı mesajın saatini veriyor: 23:40.
7. **Leyla’nın boşluğu:**
   - Londra kaydının kaynak satırına “kesintisiz kayıt, görüşme boyunca kadrajdan çıkmadı” eklendi.
   - İskele karesinin OYİ notu, teras figürünün 23:39–23:55 arasında kalkmadığını yazıyor.
8. **Tepsi:** e-lab-iz ile ikinci bağımsız kanıt eklendi (yukarıda).
9. **Toksikoloji:** Ön tarama pozitif, yaklaşık 0,05 mg/L; kesin değer Kimya İhtisas Dairesi’nden bekleniyor. Ölüm aralığı 23:00–00:30 oldu.
10. **Tarık’ın kendi koduyla girmesi:**
    - İzleme sözleşmesini 2024’te Rıza’nın talebiyle Nevzat Bey yaptırmış; panelde bunun bir işareti yok, yükleniciye de bilgi verilmemiş (alarm raporu ve kod listesi).
    - Alarm kaydına 14.09.2025 tarihli bir garanti bakımı girişi eklendi: Tarık 00 kodunun kapıyı açtığını oradan biliyor.
    - Şüpheli ifadesinde “o panel bir yere kayıt göndermez ki…” diye ağzından kaçırıyor.
11. **Kamera sayısı:** Rıza artık “beş sabit kamera ve iskele kamerası” diyor.
12. **Araç:** 9 Şubat akaryakıt kalemi silindi. Blister fotoğrafının notuna, K2’de 8 Şubat 07:48’de Tarık’ın arabaya eğildiği eklendi; araç o tarihten beri hareket etmemiş. Hikâyede blisterin neden orada kaldığı da anlatılıyor.
13. **Saat ifadesi:** Her yerde “9 Şubat’ı 10 Şubat’a bağlayan gece, 02:09” deniyor. K4 karesinin notu, kişinin servis merdiveninden inip çıktığını ve K3’ün hareket kaydetmediğini yazıyor.
14. **Bölüm geçişleri:**
    - 3. bölüm geçiş izi l-imza oldu (10 saat).
    - 1. bölümde geçiş izleri l-dvr (artık 4 saat) ve l-riza (13 saat).
    - 2. bölümde l-hukuk (13 saat).
    - Saat eşikleri yeni motora göre, o bölümde keşfedilen izlerin toplam saatinin ~%70’i: 19→13, 19→13, 14→10.

### Sızıntılar
- scene-interview’un tarifi ve görsel isteği artık kimseyi tanımlamıyor; yüz gölgede.
- l-tarik-2 izinin adı “avukatı huzurunda yeniden dinle” oldu.
- 3. bölüm sahnesinden manşet ayrıntısı çıkarıldı.
- 3. bölümün 2. ipucu yumuşatıldı. 1. bölümün 2. ipucu kod listesinin henüz gelmediğini söylüyor.
- l-mujgan-2 ve l-bora’nın açıklamaları, l-hatice’nin sonucu ve Bora’nın kimlik satırı nötrleştirildi.

### Küçük düzeltmeler
- **Tanıklar:** Hatice 23:56’daki geçişi anlatıyor.
- **112 ve masaj:** 112 kaydında masaj yerine “indiremiyorsanız zorlamayın” deniyor. OYİ raporuna masajın yapılamadığı beyanı eklendi.
- **Telefon kayıtları:**
  - Yazışmadaki uygulama içi arama satırı kaldırıldı; Nevzat Bey “Seni hattan arıyorum” diyor.
  - Nevzat Bey’in HTS kaydına veri oturumları eklendi.
- **Kurgu ve tarifler:**
  - Deniz’in sırrı gazete haberinde: kaynak, yangında ölen işçilerden birinin torunu.
  - Araç kamerasının bir saat geri olduğunu Zeynep ifadesinde ayrıca söylüyor.
  - DNA raporuna adli muayene eklendi: paralel tırnak sıyrıkları, cam kesiği değil.
- **Prosedür:**
  - Zeynep’in yalnızca kimlik tespiti yapılıp gönderildiği yazılı.
  - Çalışma odasıyla teknik odanın mühürlenip 9 Şubat 10:30’da açıldığı yazılı.
  - Rıza K4 kablosunu savcılık izniyle taktı.
- **Metin ve dil:**
  - Londra kaydında “(Kesit 1)” etiketi ve “iyi ki doğdunuz” tırnağı.
  - Belirli tarih bildirmeyen gün adları küçük harfe çevrildi; “dahil” → “dâhil”.
  - İfadelerdeki “kütüphane” → “yemek salonu”.
  - loc-yali görsel isteği 19. yüzyıl oldu.
- **Metadata:**
  - e-hts-nevzat’tan f-whatsapp, e-iskele-a’dan f-leyla-teras çıkarıldı.
  - Zeynep’in ifadesinden f-tepsi çıkarıldı; bu gerçek artık e-lab-iz’de.

### Denge
- **Kanıt sayısı 45’te kaldı:**
  - e-misafir-tablo kaldırıldı, içeriği OYİ raporuna “Yalıda bulunanlar” bölümü olarak girdi.
  - e-vasiyet ve l-noter kaldırıldı.
  - e-hts-mujgan ve e-lab-iz eklendi.
- **Yanıltıcı ipuçları dörde indi:** tekne, ilaç, kol düğmesi, gazete.
- **Seçenek:** “Neden” sorusundaki vasiyet seçeneğinin yerine, Kerem’in yanlış izine dayanan “borçlarını ve tabloyu saklamak” geldi.

## Masumları aklayan belgeler
| Şüpheli | Aklayan |
|---|---|
| Leyla | e-dvr-tablo (K5), e-iskele-a (teras figürü yerinde), e-londra-kayit (kesintisiz, kadrajda), e-ifade-leyla-2 |
| Kerem | e-iskele-a/b, e-dinleme-bora, e-alarm-log (kod 05 kapıyı açmıyor, RET) |
| Müjgân | e-hts-mujgan (23:39’a kadar telefonda), e-ifade-zeynep (23:40 mesaj saati), e-ifade-hatice-1 |
| Orhan | e-pts, e-dvr-tablo |
| Deniz | e-dvr-tablo, e-taksi |
| Rıza | e-dashcam (+ Zeynep’in saat kayması beyanı), e-dvr-tablo |

## Denetim
`bölüm: 4 · kanıt: 45 · iz: 28 · iz saati: 56 · bütçe: 34 · hedef: 20 · karakter: 11 · şüpheli: 6 · görsel: 23 · belge türü: 14 · son bölüm öncesi kanıt: 41/45` — Tamam, uyarı yok.

## Kalan riskler
- **Tarık 1. bölümde yine öne çıkabilir:** ışığı getiren, kodu olan ve bileği sargılı kişi o. Bunu dengeleyen, üç ailenin açık yalanları ve kayıp tablo. Yeniden kör test önerilir.
- **K4’teki 17:40 silüeti:** Kod sahiplerinden biri (Rıza, Nevzat) ya da kodu bilen bir başkası olabilir. Okumanın belirsiz kalması kasıtlı.
- **Koridor görselinin tarifi:** “Merdiven altındaki küçük kapı” diyor. Bu yeni planla uyumlu (teknik oda merdiven dibinde), görsel değişmedi.

## 3. tur (cila)
- **Işık zamanı:** İskele karesindeki çalışma odası ışığı 23:44:40–23:45:10 arasına kaydı (katil çıkarken); kare zaman damgası 23:44:52. Bu, Kerem’in 23:44’teki görüşmede “bir ışık oynadı, söndü” demesiyle, saat verisiyle (23:45’te nabız yok) ve zincirle uyumlu. Truth zaman çizelgesi de güncellendi.
- **DVR özeti:** Satırlar kronolojik sıraya girdi. K3’te Tarık’ın sofaya girişi, teknik oda kapısı 23:58:30’da kapandığı için 23:59 oldu.
- **Kanıt sorusu:** Belirli bir yalana bağlandı: “Failin, o akşam pastadan sonra kurbanı görmediği ve onunla hiç haberleşmediği iddiasını en açık hangi belge çürütüyor?” Kabul edilenler: e-hts-nevzat (22:44 SMS) ve e-lab-iz (tepsi ve tabaktaki izler). Bu iddiayı e-whatsapp da çürütüyor; son bölüm belgesi olduğu için kabul listesine eklenmedi. Bu yüzden 2. turdaki 5. madde geçersiz.
- **3. bölüm 1. ipucu:** Yumuşatıldı; kod numaralarını kişilere bağlamayı öneriyor.
- **Karartmanın gerekçesi:** 2. bölüm sahnesinde Tunç’un düşüncesi olarak veriliyor: karanlıkta herkes dağılır, üst koridordan geçeni kimse görmez, sabah herkes “fırtına, yaşlı kalp, duyulmayan telefon” der. 112’deki “telefonu duyamadı” cümlesiyle örtüşüyor. Truth hikâyesine de eklendi.
- **Karakter alanları ve yazım:** Zeynep ve Bora’nın rol, ilişki ve özet alanları tekrarsız hâle geldi. Kurbanın ilişki alanı: “Yalının sahibi; doğum günü yemeğinin ev sahibi”. Rıza’nın ifadesindeki cümle başı düzeltildi.
- **Ses ve görsel:** Hiçbir ses kaydının metni ve hiçbir görselin tarifi bu turda değişmedi. Yalnızca e-iskele-a’nın zaman damgası ve notu değişti; bu CSS ile basılıyor.
