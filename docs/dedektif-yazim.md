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

### İzler belgelerden doğar (`from`)
Oyuncu bilmediği bir şeyi açmamalı. İz, onu anlamlı kılan belge biri tarafından okununca listeye düşer. Örnek: kâhyanın ifadesi okununca "İfadede adı geçen bahçıvanı bul" izi açılır.
- Bölüm başında yalnızca 2–3 genel iz açık olsun (olay yeri, otopsi, ilk ifadeler gibi).
- Diğer bütün izlerde `from` dolu olsun. Ya belgenin içinde geçen bir ad, yer, saat ya da nesneye bağlansın ya da `leadsTo` ile önceki bir izden, `leadsTo` ile bir sorgu cevabından gelsin.
- İz başlığı ve açıklaması kaynağı ima etsin: "HTS'de 22:05'te aranan numaranın sahibini bul".

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

## Pilot vakalardan dersler (zorunlu okuma)
İki pilot vaka ("Yalıda Son Akşam", "Pera Gecesi") bağımsız kör testlerden geçti. İlk taslakların ikisinde de aynı hatalar vardı:

- **Fazla erken çözülme.** Kör oyuncu faili 1. bölüm sonunda %80 güvenle buldu.
  - Hedef: 1. bölüm sonunda 3–4 makul aday ve en güçlü adaya en fazla %50–60 güven. Kesinleşme 2. bölümde, doğrulama 3.–4. bölümde.
  - Kilit izleri `minAct` ile sonraki bölüme itin (iz daha erken keşfedilse de o bölümden önce açılamaz).
- **Kamera notu ve görsel tarifi portreyi tekrarlamasın.** "Kafası kazınmış genç adam", "at kuyruklu kır saçlı" gibi tarifler kimliği bedavaya verir. Kamera notları yorumsuz olsun: saat, yön, sayı, giysi.
- **Tek belgeye birden çok kilit ipucu yüklemeyin.** Bir banka dökümü suç ortağını, çürütücü saati ve motifi birden vermesin; ipuçlarını farklı izlere dağıtın.
- **Son bölümün sahnesi ve bölüm başı kanıtları çözümü vermesin.** Son bölüm saatle de açılabildiği için sahne nötr kalmalı. Ör. failin atölyesinin araması değil, gönderici adı olmayan bir sandık. Kesin kanıt bir izle gelsin.
- **Alternatif okumayı kapatın.** "Planlayan başkası, uygulayan fail" gibi bir okuma son bölümden önce bir belgeyle çürütülebilmeli. Her şüphelinin cinayet/olay penceresindeki alibisi saatli, bağımsız bir kanıta dayanmalı; yaklaşık bir hatırlamaya ("on ikiye yirmi vardı galiba") dayanmamalı.
- **Kanıt sorusunu belirli bir yalana bağlayın.** "Failin X iddiasını en açık hangi belge çürütüyor?" diye sorun. Kabul listesine o yalanı çürüten bütün son bölüm öncesi belgeleri koyun.
- **Suçlama formu kimseyi adıyla anmasın.** Soru ve seçenek metinlerinde karakter adı, meslek ya da faile özgü ayrıntı olmasın. Form, "Kim?" sorusuyla aynı ekranda cevaplanır. Seçenekler eşit uzunlukta olsun; doğru seçenek en ayrıntılı olan olmasın.
- **Soru metinleri cevabı daraltmasın.** Failin ifadesinden birebir alıntı yapmayın; "içeriden yardım eden" gibi ifadeler birden çok kişiye uyabilir.
- **Krokiyi anlatımla karşılaştırın.** Kapılar, merdivenler, kameraların gördüğü yerler ve kişilerin yolları birbirini tutmalı. Pilotta kroki, yanlış kişiyi tek olası fail yapıyordu. Kameranın gördüğü bir kapıdan geçen herkes kayıtta görünmeli ya da kör nokta bir belgeyle açıklanmalı.
- **Bilimsel ve hukuki gerçeklik.** Toksikoloji değerleri doza ve süreye uysun. Laboratuvar sonuçları gerçekçi sürede çıksın (ön rapor / kesin rapor). Arama saatleri CMK'ya uysun (gece araması). Mahkeme adları doğru olsun ("İstanbul 4. Sulh Ceza Hâkimliği").
- **Tarih ve saat tutarlılığı.** Bir bildirim, vadesinden önce "ödenmedi" diyemez. Kilidi açılmamış telefondan veri alınamaz. Belgenin dönemi, açıldığı bölümün kurgusal tarihinden ileri olamaz.
- **Karakter alanları tekrar etmesin.** `role`, `relation` ve `summary` arayüzde yan yana görünür; her biri farklı bilgi versin. Kurbanın `relation` alanı "Kurban" değil, olaydaki yeri olsun.
- **Bölüm saati kuralı.** `advance.hours` yalnızca o bölümde keşfedilen izlere harcanan saati sayar. Değer, o bölümde keşfedilebilen izlerin toplam saatinin ~%70'i olsun.
- **Türkçe (TDK).**
  - Belirli tarih bildirmeyen gün ve ay adları küçük harfle yazılır ve kesme işareti almaz ("pazartesi", "eylülde"). Belirli tarihte büyük harf kullanılır ("9 Şubat Pazartesi").
  - "dâhil", "hâkim" yazılır.
  - Nokta ve soru işaretinden sonra büyük harfle başlanır.
- **Ses kayıtları.** ElevenLabs v3 ile tek parça seslendiriliyor.
  - `delivery` kısa ve oyunculuğa dair olsun ("fısıldayarak", "yutkunarak, sesi alçalarak"); eylem ya da ses efekti yazılmaz.
  - Kayıt başına 2–4 konuşmacı olsun.
  - Konuşan her karakterin `voice` alanı dolu olsun. `style` Türkçe tarif içersin (yaş, tavır, ağız), oyuncu seçimi buna göre yapılıyor.
- **Görseller.** Kişi sayısı, sargı ya da saç gibi görsel ipuçları `prompt`'ta açıkça ve sayıyla yazılsın ("exactly six figures"). Görsel üretildikten sonra gözle kontrol edilir.
- **Her görselde kişinin kimliği yazılsın.** Kamera karesinde, sahnede ya da grup fotoğrafında görünen her karakterin cinsiyeti, yaşı, saçı ve yapısı `prompt`'ta portresiyle aynı biçimde tarif edilsin. Yüz gizlense bile ("seen from behind") bu bilgiler kalsın. "A figure in a dark coat" yazılırsa model rastgele birini çizer. Ekim 2026 denetiminde 34 kare bu yüzden yeniden üretildi.

## Sorgular (`interviews`): etkileşimli sorgu
Oyuncular karakterleri kendileri sorgular. Listeden soru seçerler ve dosyadaki herhangi bir belgeyi karaktere gösterebilirler. Cevaplar yazarın hazırladığı metinlerdir. Sorulan her şey ortak bir sorgu tutanağında herkese görünür; soru sormak saat harcatmaz, sorguyu açan iz harcatır.

**Açılış.** Sorgu bir izle (`leads[].interviews`, ör. "Kâhyayla yeniden görüş") ya da bölüm başında (`acts[].interviews`) açılır.

**Ölçüler**
- Her vakada 6–9 sorgu olsun. Her şüpheli en az bir kez sorgulanır; kilit şüpheliler iki kez. İkinci sorgu `minAct` ile sonraki bir bölümde açılır ve karakterin tavrı değişmiştir.
- Her sorguda 12–22 soru, 2–5 belge gösterme tepkisi (`confront`) ve en az 3 kaçamak cevap (`deflect`) olsun.

**Dallanma**
- `after`: Bir soru, başka bir soru sorulmadan görünmez. Örneğin "Kiminle buluştunuz?" sorusu "Akşam nereye gittiniz?" sorusundan sonra görünür.
- `needs`: Bir soru, ilgili belge dosyaya girmeden görünmez. Örneğin HTS kaydı gelince "22:05'te kimi aradınız?" sorusu açılır.
- İyi bir sorgu katman katman açılır. İlk 6–8 soru geneldir, gerisi önceki cevapların ve yeni belgelerin açtığı sorulardır.

**Belge gösterme (`confront`)**
- Karakterin yalanını çürüten belge gösterilince savunma çöker: itiraf ya da yeni bir sürüm ("Tamam… saat dokuzda oradaydım ama…"). Bunlar oyunun en tatmin edici anlarıdır.
- Her şüphelinin en az bir yalanı belge göstermeyle kırılabilmeli.
- Fail için alibi hilesini tek başına çözen bir itiraf yazma. Fail kırıldığında bile kısmen kabul eder ya da yeni bir yalana geçer. Gerçek, belgelerin birlikte okunmasıyla çıkmalı.

**Cevaplar**
- Karakterin sesiyle yaz: kaçamak, sinirli, yorgun, bir şey saklayan. Masumlar da kendi sırlarını korumak için yalan söyler.
- Cevaplar `truth` ile ve resmî belgelerle tutarlı olmalı. Yalanlar `truth.characters[].lies` listesinde yer almalı.

**Sonuçlar**
- Cevaplar belge (`unlocks`) ve iz (`leadsTo`) açabilir. Örnek: tanık fişi verir, kişi bir adı ağzından kaçırır.
- **Kilit çözüm zinciri yine belgelere dayanmalı.** `truth.chain` yalnızca kanıt kimliği gösterir. Sorgudan çıkan kritik bilgi, açtığı bir belgeyle (`unlocks`) kalıcılaşsın.

**Ses (`voiced`)**
- Yalnızca kilit anlar seslendirilir: itiraf, çöküş, kritik bir ad ya da saat. Sorgu başına en fazla 2–3, vaka başına toplam 12–18 cevap.
- Sesli cevapta `delivery` doldurulabilir.
- Karakterin `voice` alanı dolu olmalı.

**Resmî ifadelerle ilişki.** İlk resmî ifadeler (`statement` belgeleri) kalabilir. Sorgular onların devamı ve derinleşmesidir. Aynı soruyu iki yerde tekrarlama.

## Zor mod (yeni vakalar için standart)

Kullanıcı isteği (Ekim 2026): pilotlar "zor olan bile basit" bulundu. Yeni vakalar bu ölçülerle yazılır; bu bölüm yukarıdaki "Yapı ve ölçüler" ile "Görseller" bölümlerinin önüne geçer.
Kullanıcı mevcut vakaları "zor olan bile basit" buldu ve daha zor, daha karmaşık, daha ayrıntılı vakalar istedi. Bu ek yukarıdaki ölçülerin önüne geçer.

### Yeni ölçüler
| | |
|---|---|
| Bölüm | 4–5 |
| Süre (`meta.minutes`) | 90–150 dk |
| Zorluk | "zor" ya da "çok zor" |
| Kanıt | 55–75 |
| İz | 32–45; toplam iz saati ≈ bütçe × 1,8 (ekip izlerin ancak ~%55'ini açabilir) |
| Şüpheli | 5–7 |
| Yanıltıcı ipucu | 5–7 |
| Ses kaydı | 3–4 |
| Görsel | 20–26; en az 8 fotoğraf ya da kamera karesi |
| Soru | 8–10, toplam 100 puan |

Sorular şunları kapsamalı:
- `who`;
- suç ortağı ya da asıl planlayan;
- yöntem;
- motif;
- **alibi hilesi**: fail alibisini nasıl kurdu;
- **gizli ikinci suç** ya da gizli motif;
- dakikası belli bir zaman sorusu;
- belirli bir yalana bağlı kanıt sorusu;
- 1–2 ayrıntı sorusu.

### Karmaşıklık katmanları (hepsi zorunlu)
1. **İç içe iki suç.** Görünen suç başka bir suçu gizler ya da başka bir suçun sonucudur. Örnekler: hırsızlık cinayeti örter; cinayet bir dolandırıcılığı örtmek için işlenmiştir; kaza süsü verilmiş cinayetin altında bir şantaj vardır. Oyuncu ikinci suçu 2.–3. bölümde fark etmeli.
2. **Çok rollü suçluluk.** En az iki suçlu rolü olsun: fail ile suç ortağı, ya da planlayan, uygulayan ve örtbas eden. Ayrıca masum ama suçu örten biri olabilir.
3. **Sağlam görünen sahte alibi.** Failin 1. bölümde neredeyse kusursuz bir alibisi olsun: tanık, kamera, fiş ya da telefon kaydı. Alibi ancak en az 3 belgenin birlikte okunmasıyla çöker. Yöntem örnekleri:
   - kameranın saat kayması;
   - önceden kaydedilmiş ses ya da arama;
   - telefonu başkasına taşıtma;
   - benzer giyimli bir suç ortağı;
   - zamanlanmış mesaj;
   - ölüm saatinin yanlış tahmin ettirilmesi (oda sıcaklığı, klima, sahte son görülme);
   - feribot ya da uçuş saatleri;
   - baz istasyonu çakışması.

   Hile gerçek dünyada fiziksel olarak mümkün olmalı ve dosyadaki belgelerle kanıtlanmalı.
4. **Kurban seçilmiş masumlar.** En az iki "tuzak şüpheli" olsun. Bunları gösteren güçlü dolaylı kanıtlar 2.–3. bölüme kadar ayakta kalsın. Birine fail kasıtlı olarak kanıt yerleştirmiş olsun. Bu tuzak, gözden kaçması kolay ama dürüst bir ayrıntıyla fark edilebilmeli: yanlış el, yanlış saat, yanlış marka, ters giyilmiş eldiven gibi.
5. **Yanılan dürüst tanıklar.** En az 2 tanık dürüstçe yanılsın: saati yanlış hatırlasın, kişiyi giysiden yanlış tanısın. Yanılgı başka bir belgeyle açıklanabilsin.
6. **Gömülü ipuçları.**
   - HTS kayıtları 30–60 satır, banka dökümleri 25–40 satır, geçiş kayıtları 25–50 satır olsun; kilit satır sıradan satırların arasında dursun.
   - İfadeler 12–20 soru-cevap olsun; kilit bilgi yan bir cümlede geçsin.
   - Tek bir belge asla tek başına faili göstermesin.
7. **Mini çıkarım bulmacaları.** En az 3 tane; hepsi dosyadaki verilerle çözülebilsin, dış bilgi gerekmesin. Örnekler:
   - yolculuk süresi ile mesafe ve trafik;
   - baz istasyonu dizisinden güzergâh;
   - kamera saat farkı hesabı;
   - gram, ayar ve fiyat hesabı;
   - gün batımı ya da gelgit saati (bir belgede verilmiş olarak);
   - yakıt ya da kilometre tutarsızlığı;
   - anahtarı dosyada olan basit bir şifreli not.
8. **Yan hikâyeler ve çıkmaz izler.** Şüphelilerin kendi küçük suçları (vergi kaçırma, ilişki, uyuşturucu, eski bir dava) gerçekçi yan izler oluştursun. Her biri bir belgeyle kapanabilsin. Çıkmaz izler de atmosfer ya da aklama bilgisi taşısın; boş iz olmasın.

### Zorluk eğrisi (kör testte ölçülecek)
| Bölüm sonu | Gerçek fail |
|---|---|
| 1 | En güçlü aday değil; ≤%30 güven; en az 3 rakip teori |
| 2 | ≤%55 (ikinci suç fark edilmiş) |
| 3 | ~%80 (alibi hilesi çözülmüş) |
| Son | Kesinlik ve ayrıntılar |

Vaka yine son bölüm açılmadan çözülebilmeli, ama bu ancak bütün kilit çıkarımlar yapılırsa mümkün olmalı.

### Esinlenme
Klasik polisiye yapılarından yararlan:
- Christie, Simenon, Conan Doyle'un alibi ve zaman hileleri;
- Japon honkaku'nun adil oyun bulmacaları;
- "Unsolved Case Files", "Sherlock Holmes Consulting Detective" ve "Detective: A Modern Crime Board Game" vakalarının katman yapısı;
- gerçek soruşturma usulleri: HTS analizi, baz istasyonu, MASAK, adli tıp.

Gerçek bir olayı, gerçek kişileri ya da yayınlanmış bir eserin olay örgüsünü kopyalama. Yapıyı ödünç al, hikâyeyi özgün kur. Çözüm şüpheye değil kanıta dayansın; mantık sıçraması olmasın.

### Teknik
- Şemada bölüm üst sınırı 5.
- Puanlar toplamı 100 olsun.
- `case:check` uyarılarını sıfırla; "görsel dosyası henüz üretilmedi" uyarısı hariç.
- Dosya 250–450 KB olabilir; parça parça yaz ve node ile birleştir.

## Teslim ve denetim
1. `pnpm --filter @songie/detective case:check <slug>` hatasız geçmeli; uyarıları oku ve gerekçesiz bırakma.
2. `pnpm --filter @songie/detective case:export <slug>` oyuncunun göreceği metni üretir (`cases/<slug>/.export/`). Kör çözüm ve şeytanın avukatı testleri bununla yapılır.
3. QA sonuçları `cases/<slug>/QA.md` dosyasına yazılır.
