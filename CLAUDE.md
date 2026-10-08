# Songie

Arkadaşlar arası, gelirsiz bir çok oyunculu oyun platformu. İlk oyun: `games/song-guess` ("Şarkıyı Bil", songspot.net'in çok oyunculu Türkçe sürümü). Yeni oyunlar eklenti olarak eklenir.

## Yapı
- `apps/server` — Fastify + Socket.IO + better-sqlite3. SPA'yı da servis eder. Odalar bellekte, profil ve sonuçlar SQLite'ta.
- `apps/web` — React 19 + Vite + React Router. Saf CSS, token'lar `apps/web/src/styles/tokens.css`.
- `packages/shared` — socket sözleşmeleri, ortak tipler, Türkçe metin normalizasyonu.
- `packages/game-kit` — oyun eklenti arayüzleri (`/server`, `/client`).
- `games/<oyun>/{shared,server,client}` — oyun modülü. Kayıt: `apps/server/src/games.ts` ve `apps/web/src/games.ts`.
- `deploy/` — Docker Compose projesi `songie` (app + kendi cloudflared'ı).

## Komutlar
- `pnpm dev` — server (:4310) + vite (:5173, /api ve /socket.io proxy'li)
- `pnpm test` — vitest
- `pnpm typecheck`
- `pnpm seed` — Deezer'dan başlangıç havuzlarını çeker
- Yayın: `cd deploy && docker compose -p songie up -d --build`

## Kurallar
- **Her UI işinden önce `frontend-design` skill'ini yükle** ve `docs/design.md`'deki token ve ilkelere uy. Yapay zekâ "tell"lerinden kaçın (eyebrow, ALL CAPS etiket, "→", orta nokta zinciri, eşit kart ızgarası, neon-siyah).
- Arayüz metni Türkçe, cümle düzeninde, `apps/web/src/i18n/tr.ts` içinde.
- Server otoriterdir: client'a yalnızca `viewFor` görünümü gider; cevabı ya da açılmamış klipleri sızdırma.
- Sunucu paylaşımlı: host nginx'e, başka projelerin container'larına ve Postgres/Redis'ine dokunma. Host'ta yalnızca `127.0.0.1:4310` açılır.
