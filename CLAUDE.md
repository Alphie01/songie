# Songie

Arkadaşlar arası, gelirsiz bir çok oyunculu oyun platformu. İlk oyun: `games/song-guess` ("Şarkıyı Bil", songspot.net'in çok oyunculu Türkçe sürümü). Yeni oyunlar eklenti olarak eklenir.

## Yapı
- `apps/server` — Fastify + Socket.IO + better-sqlite3. SPA'yı da servis eder. Odalar bellekte, profil ve sonuçlar SQLite'ta.
- `apps/web` — React 19 + Vite + React Router. Saf CSS, token'lar `apps/web/src/styles/tokens.css`.
- `packages/shared` — socket sözleşmeleri, ortak tipler, Türkçe metin normalizasyonu.
- `packages/game-kit` — oyun eklenti arayüzleri (`/server`, `/client`).
- `games/<oyun>/{shared,server,client}` — oyun modülleri (19 oyun: `song-guess`, `taboo`, `never`, `bottle`, `most-likely`, `secret-hitler`, `charades`, `paranoia`, `confessions`, `kitten`, `red-flag`, `five-seconds`, `who-am-i`, `agents`, `frequency`, `intrigue`, `color-cards`, `werewolf`, `detective`; her birinde `client/guide.ts` tanıtımı). Yeni oyun: `docs/oyun-ekleme.md`. Kayıt: `apps/server/src/games.ts` ve `apps/web/src/games.ts`. Oyun ekranlarının ortak düzeni: `packages/game-kit/src/ui/game-layout.css`.
- `games/detective` — Dedektif Masası: vakalar `server/cases/<slug>/case.json` + `img/*.webp`. Yazım kuralları `docs/dedektif-yazim.md`; araçlar `pnpm --filter @songie/detective case:check|case:export|case:images|case:voices <slug>`. Görseller (OpenAI gpt-image-2) ve sesler (ElevenLabs eleven_v3, diyaloglar tek parça; oyuncu seçimi `audio/cast.json`, anlatıcı "Adam") yalnızca geliştirmede üretilir. Anahtarlar `games/detective/tools/.env.local` (git'e ve imaja girmez); OpenAI bütçesi 25 $ (`tools/.image-spend.json`), ElevenLabs Starter aylık 40 bin kredi (vaka başına ~2.800).
- Mobil: dört ayrı Flutter uygulaması, hepsi aynı sunucuya bağlanır (web ve mobil aynı odada oynar). Her uygulamanın kendi Firebase projesi var: `songie-app`, `itiraf-kosesi-app`, `casebook-monolith`, `weknows-app`. Google yapılandırması her uygulamada `tool/configure_google.sh`.
  - `apps/songie` (`com.monolithyazilim.songie`) — yalnızca Şarkıyı Bil; kendi ana ekranı `lib/home.dart`.
  - `apps/itiraf_kosesi` (`com.monolithyazilim.itirafkosesi`) — parti/itiraf oyunları (never, confessions, most-likely, paranoia, red-flag, bottle).
  - `apps/casebook` (`com.monolithyazilim.casebook`) — dedektif; kendi ana ekranı.
  - `apps/weknows` (`com.monolithyazilim.weknows`) — kalan oyunlar (werewolf, secret-hitler, intrigue, agents, taboo, charades, five-seconds, frequency, who-am-i, color-cards, kitten).
  - Ortak kod `packages/songie_core` (oturum, socket, tasarım, oda ekranları, bütün oyun modülleri). Uygulama kimliği `AppFlavor` (`lib/flavor.dart`: ad, logo, oyunlar, modüller, ana ekran); açılış `runFlavor` (`lib/run.dart`). Başka uygulamanın oda koduyla gelen oyuncuya hangi uygulamada oynandığı söylenir (`appOfGame`). Fontlar `packages/songie_core/lib/fonts`, uygulamaların pubspec'inde `packages/songie_core/fonts/...` yoluyla tanımlanır.
  - Taşınma kuralları `packages/songie_core/PORTING.md`. Oyun adları/rehberleri `packages/songie_core/assets/catalog.json`'dan gelir (`pnpm --filter @songie/web mobile:catalog` ile web'den üretilir; web'de oyun metni değişince yeniden üret). Widget testleri gerçek sunucu görünümleriyle çalışır: `apps/server/scripts/mobile-fixtures/<oyun>.ts` → `packages/songie_core/test/fixtures`.
- Google / Apple ile giriş (isteğe bağlı; Apple düğmesi yalnızca iOS'ta): sunucu Firebase ID token'ını `jose` ile doğrular ve dört projenin token'larını kabul eder (`FIREBASE_PROJECT_IDS`, `apps/server/src/firebase.ts`), profili hesaba bağlar ya da başka cihazdaki anonim profili birleştirir (`POST /api/auth/google`, sağlayıcı token'dan okunur). Aynı hesap her Firebase projesinde başka uid alır: ilk uid `players.firebase_uid`'de, diğerleri `player_firebase_uids`'de; tanınmayan uid doğrulanmış e-postayla eşleştirilir. Bir profilin birden çok cihaz token'ı olabilir (`player_tokens`).
- `deploy/` — Docker Compose projesi `songie` (app + kendi cloudflared'ı).

## Komutlar
- `pnpm dev` — server (:4310) + vite (:5173, /api ve /socket.io proxy'li)
- `pnpm test` — vitest
- `pnpm typecheck`
- `pnpm seed` — Deezer'dan başlangıç havuzlarını çeker
- Yayın: `cd deploy && docker compose -p songie up -d --build`
- Mobil: ortak paket ve her uygulamada (`packages/songie_core`, `apps/<uygulama>`) `flutter analyze`, `flutter test`; yerel sunucuya karşı çalıştırma `flutter run --dart-define=SONGIE_URL=http://<LAN-IP>:4310` (simülatörde `http://127.0.0.1:4310`, Android emülatöründe `http://10.0.2.2:4310`). Firebase: uygulamanın klasöründe `./tool/configure_google.sh` (kendi projesiyle flutterfire configure + iOS URL şeması). İkon/açılış: `packages/songie_core` içinde `flutter test tool/render_app_icons_test.dart` (dört uygulamanın görselleri), sonra her uygulamada `dart run flutter_launcher_icons && dart run flutter_native_splash:create`. Flutter 3.35 ile iOS derlemesi için `firebase_auth` < 6.3 (UIScene) sabit.

## Kurallar
- Mobil arayüz de aynı tasarımı birebir izler: CSS değerleri sayıyla taşınır (`packages/songie_core/lib/ui/tokens.dart`), yeni bir web ekranı değişince mobildeki karşılığı da güncellenir.
- **Her UI işinden önce `frontend-design` skill’ini yükle.** Kullanıcının açık isteği: arayüz kullanıcının verdiği "Songie Arayüz" tasarımını birebir izler, yorumlanmaz (ayrıntı `docs/design.md`); yeni oyunlar da aynı görsel dili kullanır.
- E2E: `apps/web/e2e/{flow,taboo,smoke}.mjs`, Playwright Docker imajıyla çalıştırılır (host’ta Chromium kütüphaneleri yok, kurma).
- Arayüz metni Türkçe, cümle düzeninde, `apps/web/src/i18n/tr.ts` içinde.
- Server otoriterdir: client'a yalnızca `viewFor` görünümü gider; cevabı ya da açılmamış klipleri sızdırma.
- Sunucu paylaşımlı: host nginx'e, başka projelerin container'larına ve Postgres/Redis'ine dokunma. Host'ta yalnızca `127.0.0.1:4310` açılır.
