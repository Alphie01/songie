# Songie Reels açıklamaları

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
