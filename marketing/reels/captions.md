# Songie Reels açıklamaları

## Reels 1 — "0,1 saniye challenge" (`songie-01-challenge`)

**Açıklama:**

Mert 0,1 saniyede bildi, salon karıştı. Sen de dene, cevabını yorumlara yaz. Kaçıncı saniyede bildin? 🎶

**Hashtag'ler (10):**

#songie #şarkıyıbil #müzikoyunu #challenge #arkadaşlarla #oyungecesi #türkçeşarkılar #tahminoyunu #musicquiz #guessthesong

**Yeni cevapla yeniden render** (`marketing/reels` içinde):

```sh
npx remotion render src/index.ts songie-01-challenge out/songie-01-challenge.mp4 --codec=h264 --crf=18 \
  --props='{"answer":"Sezen Aksu – Kaybolan Yıllar","solveStage":0}'
npx remotion still src/index.ts songie-01-challenge out/songie-01-challenge.png --frame=20 \
  --props='{"answer":"Sezen Aksu – Kaybolan Yıllar","solveStage":0}'
```

`solveStage` 0–4 (0,1 / 0,5 / 2 / 8 / 15 sn → +1000 / 700 / 450 / 250 / 100) Mert'in sticker'ını değiştirir. `answer` boş olamaz.
