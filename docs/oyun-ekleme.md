# Songie'ye yeni oyun ekleme

Bir oyun `games/<id>/` altında üç parçadan oluşur: `shared` (ayarlar, hamleler, görünüm tipleri),
`server` (otoriter oyun motoru) ve `client` (React ekranları). Tam ve güncel örnek: **`games/taboo`**
(takımlı, gizli bilgili, zamanlı). Ayar paneli ve canlı ayar değiştirme örneği: `games/song-guess`.

Önce oku: `CLAUDE.md`, `docs/design.md`, `packages/game-kit/src/{server.ts,client.ts,testing.ts}`,
`packages/game-kit/src/ui/{Avatar.tsx,Icon.tsx,game-layout.css}`, `apps/web/src/styles/{tokens.css,ui.css}`.

## Kapsam kuralı (paralel çalışırken)
- Yalnızca kendi `games/<id>/` klasörüne yaz. `package.json` ve `tsconfig.json` hazır; bağımlılık ekleme,
  `pnpm install` çalıştırma.
- Sunucu/web kayıt dosyalarına (`apps/server/src/games.ts`, `apps/web/src/games.ts`), game-kit'e,
  başka oyunlara, deploy'a ve git'e dokunma. Ortak bir şey gerekiyorsa raporuna yaz.

## shared/index.ts
- `GAME_ID`, `settingsSchema` (zod), `defaultSettings`, `actionSchema` (zod `discriminatedUnion('type', …)`),
  görünüm tipi (`…View`). Ayarlar tüm oyunculara gider: **gizli bilgi ayarlara konmaz.**

## server/index.ts
```ts
export function <ad>Server(deps: { db: Database.Database; timing?: Partial<…> }): ServerGame<Settings, State, Action>
```
- Sunucu otoriterdir. `viewFor(state, playerId)` her oyuncuya yalnızca görmesi gerekeni döner
  (gizli roller, kartlar, sorular, yazarlar). Görünüm JSON'a çevrilir; Map/Set kullanma.
- Zaman: yalnızca `ctx.schedule(ms, fn)` (oyun bitince otomatik temizlenir), saat için `ctx.now()`.
  Görünüme `serverNow` + `endsAt` koy; istemci farkı hesaplar (bkz. taboo `useRemaining`).
- Oyuncuya gösterilecek hatalar: `class GameError extends UserFacingError` (Türkçe, ne yapılacağını söyleyen).
- `onAction` her hamlede yetkiyi kontrol eder (sıra kimde, rolü ne, aşama doğru mu). Gecikmiş/çift
  tıklamalara dayanıklı ol (kart/soru kimliği ile eşleştir, eski hamleyi `{ ok: true, stale: true }` ile yut).
- `onPlayerJoin` / `onPlayerLeave` ve bağlantısı kopan oyuncular (`ctx.players()[i].connected`) oyunu
  kilitlememeli; gerekirse oda sahibine (`ctx.hostId()`) "atla" hamlesi ver.
- `end(ctx, state)`: oda sahibi "Oyunu bitir" dediğinde podyum/özet göster, sonra `ctx.finish(results)`.
- Uygunsa `onSettings` (oyun sırasında ayar değişikliği, sıradaki turdan itibaren).
- İçerik (sorular, kartlar…) `server/content/` altında JSON; Türkçe yazımı doğru, arkadaş ortamına uygun.
  "+18/cesur" kategorisi olabilir ama açık cinsel içerik yok. İsteğe bağlı oyuncu eklemeli içerik
  `routes(app)` ile (`/api/games/<id>/…`, `req.profile` ile kimlik) ve `deps.db` tablosunda (`<id>_` önekli).
- Testler: `server/*.test.ts`, `createHarness` (`@songie/game-kit/testing`) ile. Bütün akışı, yetkileri,
  gizliliği (`h.seen(id)` gizli metni içermemeli), zamanlayıcıları (`h.advance`), bağlantı kopmasını ve
  "oyunu bitir"i kapsa.

## client
- `index.ts`: `export const <ad>Client: ClientGame = { id, name, pitch, icon, minPlayers, maxPlayers, load }`
  (`soloSettings` yalnızca tek başına oynanabiliyorsa). `icon` game-kit `Icon` adlarından biri; yeni bir
  simge gerekiyorsa oyunun kendi bileşeninde satır içi SVG kullan.
- `module.ts`: `export default { SettingsPanel, PlayView }` ve `import './<id>.css'`.
- `SettingsPanel`: `section` = `'primary'` (sol sütun: ne oynanacak), `'secondary'` (sağ: nasıl oynanacak),
  yoksa hepsi. `editable` yalnızca oda sahibinde true; diğerleri aynı kontrolleri pasif görür.
- `PlayView`: `{ view, meId, room, act, api, settings, setSettings }`. Rol bazlı ekranlar.
- `strings.ts`: tüm Türkçe metinler (cümle düzeni, butonlar ne yaptığını söyler, hatalar çözümü söyler).

## Görünüm (kullanıcının açık isteği: songspot.net tarzı)
- Koyu zemin, yeşil vurgu, Poppins + JetBrains Mono; renkleri `tokens.css` değişkenlerinden al.
- Ortak sınıflar: düzen `.sg` + `.sg-side.sg-left` / `.sg-center` / `.sg-side.sg-right`, `.sg-top`,
  `.sg-mobile-only`; ayarlar `.sgs`, `.sgs-group`, `.sgs-legend`, `.sgs-hint`, `.sgs-readonly`;
  listeler `.sg-score-list`, `.sg-score`; bölümler `.howto`, `.podium`; temel `.btn .btn-primary .btn-outline
  .btn-ghost .btn-lg .btn-block .chip .chips .option .toggle .input .card .eyebrow .mono .dim .muted .error-text`.
- Sayfa boş kalmasın: oyuncu listesi/skorlar, durum, "Nasıl oynanır". 390px mobilde ve 1440px masaüstünde
  çalışmalı; masaüstünde üç sütun. Oyuna özel sınıflara oyun öneki ver (ör. `.sh-` secret-hitler).
- UI işinden önce `.claude/skills/frontend-design/SKILL.md`'yi oku; ama yön songspot görünümüdür.

## Doğrulama
```bash
cd /root/songie
pnpm vitest run games/<id>
pnpm exec tsc -p games/<id>/tsconfig.json --noEmit
```
Kök tip denetimini çalıştırma (başka oyunlar yazılırken hata verebilir). Kayıt ve uçtan uca test,
oyunlar bittikten sonra merkezi olarak yapılır.
