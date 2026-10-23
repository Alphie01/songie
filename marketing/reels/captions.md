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
