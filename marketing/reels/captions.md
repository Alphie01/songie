# Songie Reels açıklamaları

## Tek komutla üretim

```sh
pnpm reel r2 "tame impala loser"               # şarkı + kapak indirir, nakaratı bulur, MP4 + kapak üretir
pnpm reel r1 "tarkan kuzu kuzu"                # 0,1 sn challenge
pnpm reel r3 "tarkan şımarık"                  # kazanan sensin: yaz, seç, liderliğe çık
pnpm reel r2 "tarkan şımarık" --palette 3      # renk sırasını seç (0–7)
pnpm reel r2 "sezen aksu firuze" --from 12     # kesit saniyesini elle ver
pnpm reel r2 "tarkan şımarık" --name Zeynep    # bilen arkadaşın adı (en çok 12 harf)
```

- Çıktı: `out/<r1|r2>-<şarkı>.mp4` ve `.png`.
- Renkler: her şarkı kendi paletini alır (aynı şarkı hep aynı renkte çıkar); `--palette` ile değiştir. Palet 0 = pembe → sarı → mint → lila.
- İsim: verilmezse her şarkıya listeden bir isim düşer (Mert, Deniz, Ece, Kaan, Zeynep…); `--name` ile değiştir.
- Kesit: önizlemenin en yüksek sesli 3 sn'si otomatik seçilir; beğenmezsen `--from`.

## Reels 1 — "0,1 saniye challenge" (`songie-01-challenge`)

**Açıklama:**

Mert 0,1 saniyede bildi, salon karıştı. Sen de dene, cevabını yorumlara yaz. Kaçıncı saniyede bildin? 🎶

**Hashtag'ler (10):**

#songie #şarkıyıbil #müzikoyunu #challenge #arkadaşlarla #oyungecesi #türkçeşarkılar #tahminoyunu #musicquiz #guessthesong

**Başka şarkıyla yeniden render** (`marketing/reels` içinde):

```sh
pnpm song "sezen aksu kaybolan yıllar"   # Deezer önizlemesini assets/songs/ altına indirir, answer + song yazar
npx remotion render src/index.ts songie-01-challenge out/songie-01-challenge.mp4 --codec=h264 --crf=18 \
  --props='{"answer":"Sezen Aksu – Kaybolan Yıllar","solveStage":0,"song":"assets/songs/<id>.mp3","songFrom":15.5}'
npx remotion still src/index.ts songie-01-challenge out/songie-01-challenge.png --frame=20 \
  --props='{"answer":"…","solveStage":0,"song":"assets/songs/<id>.mp3","songFrom":15.5}'
```

- `songFrom`: 30 sn'lik önizlemede 0,1 sn kesitin ve arka plan şarkısının başladığı saniye (nakarat için ~15 iyi bir başlangıç).
- Ses: 1,2 sn ve 2,3 sn'de 0,1 sn'lik kesit (telefonda oynatma), 5,3 sn'den (Mert'in bildiği an) sona kadar şarkı.
- `solveStage` 0–4 (0,1 / 0,5 / 2 / 8 / 15 sn → +1000 / 700 / 450 / 250 / 100) Mert'in sticker'ını değiştirir. `answer` boş olamaz.
- Şarkı dosyaları telifli olduğu için git'e girmez (`assets/songs/`).

## Reels 2 — "Gerçek oyun" (`songie-02-gercek-oyun`)

**Açıklama:**

0,1 saniye… 0,5… 2 saniye… hâlâ yok mu? Mert 0,1'de bildi 😅 Sen kaçıncı saniyede bilirdin? Arkadaşını etiketle, meydan oku! 🎶

**Hashtag'ler (10):**

#songie #şarkıyıbil #müzikoyunu #meydanokuma #arkadaşlarla #oyungecesi #türkçepop #tarkan #musicquiz #guessthesong

**Başka şarkıyla yeniden render** (`marketing/reels` içinde):

```sh
pnpm song "sezen aksu firuze"   # answer/title/artist/album/song/cover yazar
npx remotion render src/index.ts songie-02-gercek-oyun out/songie-02-gercek-oyun.mp4 --codec=h264 --crf=18 \
  --props='{"title":"…","artist":"…","album":"…","song":"assets/songs/<id>.mp3","cover":"assets/songs/<id>.jpg","songFrom":8}'
npx remotion still src/index.ts songie-02-gercek-oyun out/songie-02-gercek-oyun.png --frame=45 --props='…'
```

- 0,1 / 0,5 / 2 sn kesitler oyundaki gibi aynı `songFrom` saniyesinden çalar; açılışta (8,1 sn'den) şarkı arkada sona kadar çalar.

## Reels 3 — "Kazan" (`songie-03-kazan`)

**Açıklama:**

0,1'de kaçtı ama 0,5'te yakaladın 😎 Arkadaş grubunda şarkıyı ilk kim bilir? Etiketle, kapışın! 🏆🎶

**Hashtag'ler (10):**

#songie #şarkıyıbil #müzikoyunu #arkadaşlarla #oyungecesi #kimdahahızlı #türkçepop #challenge #musicquiz #guessthesong

---

# İtiraf Köşesi

## Ben Hiç (`itiraf-01-ben-hic`)

```sh
pnpm reel never                                              # oyunun kendi havuzundan rastgele (+18 hariç) cümle, rastgele renk ve isim
pnpm reel never --text "Ben hiç sevgilimin telefonunu karıştırmadım."
pnpm reel never --song "monkeys spinning monkeys kevin macleod" --name Zeynep --palette 4
```

**Açıklama:**

Dürüst ol 🤫 Ben hiç… eski sevgilimin sosyal medyasını gizlice incelemedim. Sen yaptın mı? Yorumlara yaz, arkadaşını etiketle! İtiraf Köşesi'nde cevabını kimse görmez… ta ki herkes açıklayana kadar 😂

**Hashtag'ler:**

#itirafköşesi #benhiç #neverhaveiever #arkadaşlarla #oyungecesi #partioyunu #itiraf #dürüstlük #eğlence #reels

**Müzik kredisi** (Kevin MacLeod parçaları CC BY 4.0, açıklamaya eklenmeli):

Music: "Sneaky Snitch" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0

## Ben Hiç · Flört (+18) (`itiraf-02-ben-hic-flort`)

Ayrı tasarım: gece sahnesi (koyu mor, neon pembe ışık, uçuşan kalpler), sansür bandıyla açılan kart, yan yana sen ve flörtünün telefonu (onun cevabı gizli), "İkiniz de yapmışsınız 🔥".

```sh
pnpm reel never18                                   # +18 paketlerden, açık cinsellik içermeyen rastgele cümle
pnpm reel never18 --text "Ben hiç bir gecede iki farklı kişiyle öpüşmedim." --song "The Weeknd Often" --name Can --palette 1
```

- Cümle havuzu: Cesur / Yatak odası / Fantezi / Çift odası / Sınır testi (+18), açık cinsel kelimeler (seks, seviş, porno…) içerenler elenir (Instagram kuralları).
- `--palette` 0 = pembe, 1 = mercan, 2 = lila gece ışığı; `--name` flörtünün adı.

**Açıklama:**

İlk buluşmada bunu oynadık… 😏 Cevabı kimse görmez, ta ki ikiniz de açıklayana kadar 🔥 Flörtünü etiketle, bu gece İtiraf Köşesi'nde dürüstlük zamanı 😈 (+18)

**Hashtag'ler:**

#itirafköşesi #benhiç #flört #ilkbuluşma #çiftoyunu #neverhaveiever #18plus #gecehayatı #dürüstlük #reels

**Müzik kredisi:** Music: "Deuces" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0

## İtiraf (`itiraf-03-itiraf`) ve İtiraf · Flört +18 (`itiraf-04-itiraf-flort`)

```sh
pnpm reel confessions                         # oyunun konularından biri + örnek itiraf, rastgele renk ve şüpheli
pnpm reel confessions --topic "Hiç kimsenin bilmediği bir alışkanlığın" --text "Duşta her sabah konser veriyorum."
pnpm reel confessions18 --name Zeynep --palette 1   # gece sahnesi, sansürlü not, yazan flörtün çıkar
```

- Konular oyunun kendi havuzundan; itiraflar oyuncunun yazacağı örnekler (10–240 harf, oyundaki gibi). `--text` ile kendi itirafını yaz.
- Flört versiyonunda açık cinsel kelime içeren metin reddedilir (Instagram).

**Açıklama (normal):**

İsimsiz bir itiraf geldi… ✍️ Sence kim yazdı? 🤔 İtiraf Köşesi'nde herkes isimsiz yazar, sonra kim yazdı tahmin edersiniz. Yanılırsan… o kazanır 😂

**Açıklama (flört +18):**

Odadaki biri hakkında isimsiz bir itiraf… 😳 Yazan flörtün çıkarsa? 👀 Etiketle, bu gece İtiraf Köşesi'nde kim kızaracak görelim 😏 (+18)

**Hashtag'ler:**

#itirafköşesi #isimsizitiraf #kimyazdı #itiraf #arkadaşlarla #flört #oyungecesi #partioyunu #18plus #reels

**Müzik kredisi:** Music: "Investigations" / "Bossa Antigua" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0

## Aramızdaki En (`itiraf-05-aramizdaki-en`) ve Aramızdaki En · Flört +18 (`itiraf-06-aramizdaki-en-flort`)

```sh
pnpm reel mostlikely                                  # oyunun güvenli paketlerinden rastgele soru
pnpm reel mostlikely --text "alarmı çok erteleyen" --name Kaan
pnpm reel mostlikely18 --name Zeynep                  # flört: oyunu flörtüne verirsin, o da sana vermiş 💘
```

**Açıklama (normal):**

Aramızdaki en… alarmı çok erteleyen kim? 😂 Herkes gizlice oy verir, unvanı biri kapar. Sizin grupta kim? Etiketle! 👇

**Açıklama (flört +18):**

Gizli oylama başladı 😏 Oyunu flörtüne verdin… peki o kime verdi? 💘 İtiraf Köşesi'nde oylar açılınca kim kime belli olur (+18)

**Hashtag'ler:**

#itirafköşesi #aramızdakien #mostlikelyto #arkadaşlarla #oyungecesi #flört #partioyunu #kimdaha #18plus #reels

**Müzik kredisi:** Music: "Monkeys Spinning Monkeys" / "Hot Swing" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0

## Red Flag (`itiraf-07-red-flag`) ve Red Flag · Flört +18 (`itiraf-08-red-flag-flort`)

```sh
pnpm reel redflag                                     # oyunun güvenli kategorilerinden rastgele durum
pnpm reel redflag --text "İlk buluşmada garsona kaba davrandı." --category "İlk buluşma"
pnpm reel redflag18 --name Zeynep                     # sen green dersin, flörtün red flag der 🚩
```

**Açıklama (normal):**

İlk buluşmada yarım saat eski sevgilisinden bahsetti… Red flag mı, green flag mı? 🚩💚 Bayrağını yorumlarda kaldır! İtiraf Köşesi'nde herkes gizlice oy verir, sonra tartışma başlar 😂

**Açıklama (flört +18):**

Flörtün buna ne der? 👀 Sen green dedin, o red flag 🚩😳 Bu gece tartışma garanti 🔥 Flörtünü etiketle! (+18)

**Hashtag'ler:**

#itirafköşesi #redflag #greenflag #ilkbuluşma #ilişki #flört #arkadaşlarla #oyungecesi #partioyunu #reels

**Müzik kredisi:** Music: "Fluffing a Duck" / "Smooth Lovin'" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0

## Paranoya (`itiraf-09-paranoya`) ve Paranoya · Flört +18 (`itiraf-10-paranoya-flort`)

```sh
pnpm reel paranoia                                     # oyunun güvenli paketlerinden rastgele soru
pnpm reel paranoia --text "Aramızda kim zombi kıyametinde ilk ölür?" --name Mert
pnpm reel paranoia18 --name Zeynep                     # "Aramızda kiminle bir gece geçirmek isterdin?" gibi imalı sorular
```

**Açıklama (normal):**

Sana gizli bir soru geldi… 🤫 Cevabın odadaki biri olur, sonunda hepsi açılır 😂 Aramızda kim zombi kıyametinde ilk ölür? Etiketle! 👇

**Açıklama (flört +18):**

Gizli soru geldi 😏 "Aramızda kiminle bir gece geçirmek isterdin?" Şimdilik sadece sen biliyorsun… ta ki herkes öğrenene kadar 🔥 (+18)

**Hashtag'ler:**

#itirafköşesi #paranoya #paranoia #gizlisoru #arkadaşlarla #flört #oyungecesi #partioyunu #18plus #reels

**Müzik kredisi:** Music: "Sneaky Adventure" / "Cool Vibes" Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0
