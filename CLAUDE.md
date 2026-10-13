# Songie

Arkadaşlar arası, gelirsiz bir çok oyunculu oyun platformu. İlk oyun: `games/song-guess` ("Şarkıyı Bil", songspot.net'in çok oyunculu Türkçe sürümü). Yeni oyunlar eklenti olarak eklenir.

## Yapı
- `apps/server` — Fastify + Socket.IO + better-sqlite3. SPA'yı da servis eder. Odalar bellekte, profil ve sonuçlar SQLite'ta.
- `apps/web` — React 19 + Vite + React Router. Saf CSS, token'lar `apps/web/src/styles/tokens.css`.
- `packages/shared` — socket sözleşmeleri, ortak tipler, Türkçe metin normalizasyonu.
- `packages/game-kit` — oyun eklenti arayüzleri (`/server`, `/client`).
- `games/<oyun>/{shared,server,client}` — oyun modülleri (19 oyun: `song-guess`, `taboo`, `never`, `bottle`, `most-likely`, `secret-hitler`, `charades`, `paranoia`, `confessions`, `kitten`, `red-flag`, `five-seconds`, `who-am-i`, `agents`, `frequency`, `intrigue`, `color-cards`, `werewolf`, `detective`; her birinde `client/guide.ts` tanıtımı). Yeni oyun: `docs/oyun-ekleme.md`. Kayıt: `apps/server/src/games.ts` ve `apps/web/src/games.ts`. Oyun ekranlarının ortak düzeni: `packages/game-kit/src/ui/game-layout.css`.
- `games/detective` — Dedektif Masası: vakalar `server/cases/<slug>/case.json` + `img/*.webp`. Yazım kuralları `docs/dedektif-yazim.md`; araçlar `pnpm --filter @songie/detective case:check|case:export|case:images|case:voices <slug>`. Görseller (OpenAI gpt-image-2) ve sesler (ElevenLabs eleven_v3, diyaloglar tek parça; oyuncu seçimi `audio/cast.json`, anlatıcı "Adam") yalnızca geliştirmede üretilir. Anahtarlar `games/detective/tools/.env.local` (git'e ve imaja girmez); OpenAI bütçesi 25 $ (`tools/.image-spend.json`), ElevenLabs Starter aylık 40 bin kredi (vaka başına ~2.800).
- `deploy/` — Docker Compose projesi `songie` (app + kendi cloudflared'ı).

## Komutlar
- `pnpm dev` — server (:4310) + vite (:5173, /api ve /socket.io proxy'li)
- `pnpm test` — vitest
- `pnpm typecheck`
- `pnpm seed` — Deezer'dan başlangıç havuzlarını çeker
- Yayın: `cd deploy && docker compose -p songie up -d --build`

## Kurallar
- **Her UI işinden önce `frontend-design` skill’ini yükle.** Kullanıcının açık isteği: arayüz kullanıcının verdiği "Songie Arayüz" tasarımını birebir izler, yorumlanmaz (ayrıntı `docs/design.md`); yeni oyunlar da aynı görsel dili kullanır.
- E2E: `apps/web/e2e/{flow,taboo,smoke}.mjs`, Playwright Docker imajıyla çalıştırılır (host’ta Chromium kütüphaneleri yok, kurma).
- Arayüz metni Türkçe, cümle düzeninde, `apps/web/src/i18n/tr.ts` içinde.
- Server otoriterdir: client'a yalnızca `viewFor` görünümü gider; cevabı ya da açılmamış klipleri sızdırma.
- Sunucu paylaşımlı: host nginx'e, başka projelerin container'larına ve Postgres/Redis'ine dokunma. Host'ta yalnızca `127.0.0.1:4310` açılır.
