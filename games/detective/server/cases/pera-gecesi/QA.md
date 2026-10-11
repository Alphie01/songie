# Pera Gecesi — öz-QA (2. tur, kör çözüm ve şeytanın avukatı düzeltmeleri sonrası)

Denetim: `case:check` hatasız. Tek uyarı yeni görsellerin henüz üretilmemiş olması (3/21).
`bölüm 3 · kanıt 45 · iz 28 · iz saati 49 · bütçe 31 · hedef 19 · karakter 8 · şüpheli 6 · görsel 21 · belge türü 15 · ses kaydı 3 · son bölüm öncesi kanıt 39/45`

## Çözüm özeti
- **Fail (who, planlayan):** İlker Varol, restoratör. **Suç ortağı:** Barış Koç, şoför-garson. Kopyayı soktu, altıncı kişiyi örttü, ekibi aşağıda tuttu, orijinali taşıdı.
- **Yöntem:** Kopya, restorasyon sırasında atölyede yapıldı. Barış onu 16:08’de düz bir ikram kasasıyla soktu. İlker 22:29’da çıktı, telefonunu evde bıraktı ve 23:47’de yedek ikram ceketiyle altıncı kişi olarak geri girdi. 00:35–00:59 arasında Barış beş garsonu zemin katta tuttu; İlker kamerayı kör edip 09 koduyla sensörü kapattı ve tuvali değiştirdi. Orijinal Barış’ın aracıyla 01:21’de Boğazkesen’de İlker’e teslim edildi.
- **Motif:** Gürcistan’daki bir alıcı (180 bin avro). Avroyla ödenen 400 bin TL kapora, tahliye borcunu kapattı.
- **Cevaplar:** who=ilker · accomplice=baris · how=h-catering · when=w-0037 · why=y-satis · where=p-tophane · proof=e-bufe ya da ph-tophane.

## Bölüm bölüm akış
- **1. bölüm:** Pencere (00:37–00:59), 09 kodu ve kör kamera kurulur. Kod SMS ile iki kişiye gitti, ama Defne’nin ifadesine göre iki gün tuş takımının üstünde kâğıtta durdu. Bu yüzden Tuncay, Ferit, Ramazan, Gönül, nakliyeciler, Defne ve İlker’in hepsi kodu bilebilir. Ucuz izlerle Defne, Tuncay ve Ferit aklanabilir. Bölüm sonunda adaylar: İlker, Cemil (konkordato ve lehdar) ve “dışarıdan biri”. Barış yalnızca personel listesinde geçer.
- **2. bölüm:** Altıncı kişi (Kamera 3), beş garsonun aşağıda olduğu (Kamera 5 ve Elif), büfe fişi, Boğazkesen dükkân kamerası, telara siparişi, bilirkişi ve yalı, HTS ve banka. Kesinleşme burada.
- **3. bölüm:** Gümrükte gönderici adı yazmayan bir sandık ve laboratuvar raporu ile açılır; fail adı ancak `l-kargo` izinden gelir. 2. bölüm 16 saatlik sınırla ya da `l-esnaf` ile `l-bilirkisi` izleri açılınca geçilir.

## Zincir (hepsi 3. bölümden önce kanıtlanabilir)
1. Eser 16 Ekim 14:00’te özgündü → e-kondisyon, ph-uv, e-tutanak.
2. Pencere, kod ve elle çıkarılmış kablo → e-alarm, e-dvr, e-defter, e-oyi, ph-switch.
3. Kodu bilebilenler aklanır → e-kod-mail, e-defne-1, e-kart, e-bt-rapor, e-tuncay-hts, e-baskin, e-meyhane, ph-yali, e-liste.
4. Değişimi altıncı kişi yaptı; beş garson aşağıdaydı → ph-cam3-2347, ph-cam5, e-elif, e-catering-mail, e-gps.
5. Altıncı kişi İlker → e-bufe, ph-tophane, e-ilker-banka, e-ilker-hts (telefon evde), e-ilker-1.
6. Kopyayı İlker yaptı → e-telara ile e-oyi (ucuz yol: 64 × 92 yeni telara), e-bilirkisi, e-fatura ve ph-yali (pahalı yol: aynı el).
7. Barış → ph-cam3-1608, e-catering-mail (kasaları istedi, vardiya değişti, firmayı İlker önerdi), e-elif, e-gps, ph-tophane, e-ilker-banka, e-ilker-hts, e-baris-1.
8. Motif: satış → e-ilker-hts (+995, Osmanbey 10:48) ile e-ilker-banka (11:40’ta 8.550 avro nakit, Osmanbey). 3. bölümde e-kargo ve e-ilker-mesaj doğrular.

## “Cemil planladı, İlker uyguladı” okumasına karşı (2. bölümde)
- Para Gürcistan’daki bir numarayla görüşmenin hemen ardından avroyla geldi.
- İlker’in HTS’inde 26.09’dan sonra Cemil’le hiçbir kayıt yok.
- Cemil’in aracı 22:47’de yalıya girip sabaha kadar çıkmadı (ph-yali).
- Orijinal Cemil’e değil, İlker’in atölyesine gitti (e-gps, ph-tophane).
- Sessiz bir değişim, tazminat isteyen biri için anlamsızdır: hasar, ancak fark edilirse doğar.

## Masumları aklayan belgeler
| Şüpheli | Sırrı | Yalanı | Aklayan |
|---|---|---|---|
| Ferit | Tefeci borcu | “Doğruca eve gittim” | e-meyhane (23:53, 00:21, 00:49, 01:17 saatli siparişler, kart masada), e-ferit-mesaj (silinen ileti ve ifadedeki “Moda’da Deniz” satışı) |
| Cemil | Konkordato, gizli kopya | “Kopyası yok” | ph-yali (61 × 87, yerinde; bahçe kapısı kamerası 22:47), e-bilirkisi, e-liste |
| Defne | Müşteri listesi sızdırma | “23:45’te çıktım” | e-kart (2. kat kapısı), e-bt-rapor (00:36–00:38 klavye) |
| Tuncay | Kumar, nöbet terki | “Binadaydım” | e-tuncay-hts, e-baskin, e-kart |

Yanıltıcı ipuçları (5): e-ferit-mesaj, e-haber, e-defter, e-defne-1, e-ramazan.

## Bilinen riskler
- **Kanıt sayısı 45, iz sayısı 28.** Rehberin üst sınırındalar. Ayrı belge ve iz istenen düzeltmeler (büfe, telara, Elif, Kamera 5, dükkân kamerası, gümrük, laboratuvar) sayıyı artırdı. Bunları dengelemek için 155 kaydı, restorasyon raporu, Salon B karesi ve atölye fotoğrafı çıkarıldı.
- **Bütçe 31 saat.** Bilirkişi dalı dahil düzgün bir 2. bölüm çözümü yaklaşık 20–24 saat tutar. Ucuz yol (telara, büfe, dükkân kamerası) bilirkişiye gerek bırakmadan çözdürür.
- **Elif’in tanıklığı** “kasketli biri” ile sınırlı; kimliği büfe fişi ve dükkân kamerası (at kuyruğu) verir. Dükkân kamerası görseli üretilirken at kuyruğu görünür olmalı.
- **Tuş takımı üstündeki kâğıt** kod bilgisini genişletiyor. Güvenlik firmasının “yalnızca iki kişiye SMS” bilgisiyle çelişmiyor: SMS doğru, kâğıt sonradan yapıştırıldı.

## 3. tur (cila, yapı değişikliği yok)
- Kanıt sorusunda kabul edilen belgeler: e-bufe, ph-tophane, ph-cam3-2347. Soru metni genel kaldı; faili ele vermesin diye daraltılmadı.
- e-ilker-hts başlığındaki Cemil notu kaldırıldı; oyuncu dökümden kendisi görür.
- Banka satırı “Döviz satışı: 8.550 EUR nakit bozdurma” oldu; why seçeneği “Eseri yurt dışındaki bir alıcıya satmak” (kira borcu kaporayla 3 Ekim’de kapanmıştı).
- Cümle başı büyük harfler, “yerleşim planı”, Elif’in saat ifadesi, 2. bölüm girişi ve karakter alanlarındaki tekrarlar düzeltildi.
