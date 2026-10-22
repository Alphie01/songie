# Oyunları mobile taşıma rehberi

Mobil uygulamalar (ortak kod `packages/songie_core`; uygulamalar `apps/songie`, `apps/itiraf_kosesi`, `apps/casebook`, `apps/weknows`) web istemcisinin **birebir** native karşılığıdır.
Sunucu aynıdır ve otoriterdir. İstemci yalnızca `game:view` görünümünü çizer ve `game:action` gönderir.
Oyun mantığı sunucuda kalır, kopyalanmaz. Tasarım kuralı (CLAUDE.md, docs/design.md): **tasarım yorumlanmaz, birebir uygulanır.**

## Kaynaklar (her oyun için)
| Web | Mobil |
|---|---|
| `games/<id>/shared/index.ts`: ayar, aksiyon ve görünüm tipleri, sabitler, yardımcı fonksiyonlar | `lib/games/<id>/models.dart` |
| `games/<id>/client/strings.ts` | `lib/games/<id>/strings.dart` (metinler kelimesi kelimesine aynı) |
| `games/<id>/client/SettingsPanel.tsx` | `lib/games/<id>/settings_panel.dart` |
| `games/<id>/client/PlayView.tsx` ve diğer `.tsx` dosyaları | `lib/games/<id>/play_view.dart` (gerekirse birkaç dosya) |
| `games/<id>/client/<oyun>.css` | Değerler doğrudan widget'lara sayı olarak yazılır |
| `games/<id>/client/module.ts` | `lib/games/<id>/module.dart` (`GameModule`) |

- Rehber metinleri (`guide.ts`) ve oyun adı/özeti mobilde **taşınmaz**. `assets/catalog.json`'dan gelir.
- Örnek tam taşıma: **`lib/games/never/`** (Ben Hiç). Önce onu oku.

## Kayıt
- `lib/games/registry.dart` içindeki `gameModules` haritasına `'<id>': const XModule()` satırı eklenir (paketin testleri bütün oyunlarla çalışır).
- Oyun hangi uygulamada oynanacaksa o uygulamanın `lib/main.dart`'ındaki `AppFlavor`'a (`games` ve `modules`) ve `lib/flavor.dart`'taki `appOfGame` tablosuna eklenir.
- **Paralel çalışırken bu dosyaya dokunma.** Kaydı toplayan kişi yapar.

## Yapı taşları
**Token'lar** (`lib/ui/tokens.dart`):
- `C.*` renkler, `tokens.css` ile aynı adlar: `C.bg`, `C.panel2`, `C.ink2`, `C.mint`…
- `bw = 3`, `R.sm/md/lg/xl/pill`.
- `hardShadow(x, y)` ve `Shadows.sm/md/lg/btn`.
- `catColor(cat)`.
- Yazı:
  - `T.d(size, color:, height: 1)`: Baloo 2, 800. `.display`, `h1–h3` ve `font-family: var(--display)` için.
  - `T.b(size, color:, weight:, height: 1.45)`: Nunito, gövde metni.
  - `T.eyebrow()`.

**Widget'lar** (`lib/ui/widgets.dart`):
- Butonlar:
  - `SButton`: `.btn`, `.btn-lg`, `.btn-primary`… `tone`, `large`, `block`, `minHeight`, `radius`, `shadowY`, `pressY`, `fontSize`, `fontFamily`, `padding`, `icon`.
  - `SGhostButton`: `.btn-ghost`. `SIconButton`: `.icon-btn`.
- Seçim ve giriş: `SChip`/`SChips` (`.chip`/`.chips`), `SOption` (`.option`), `SToggle` (`.toggle`), `SInput` (`.input`).
- Kart ve etiket: `SCard` (`.card`), `Sticker` (`.sticker`).
- Kimlik: `SAvatar` (Avatar.tsx, `mark` ve `dim` dahil), `GameMono`.
- Etkileşim:
  - `Pressable(builder: (ctx, pressed) => …)`: CSS `:active` için.
  - `FocusRing`: CSS `outline` + `outline-offset`.
- Yerleşim: `VStack(gap:)` / `HStack(gap:)` (CSS `display:grid; gap`), `Grid2(columns:, rowGap:, columnGap:, equalHeight:)` (CSS `grid-template-columns: repeat(n, 1fr)`).
- `deg(x)`: CSS `rotate(xdeg)`.

**İkonlar** (`lib/ui/icons.dart`):
- `SIcon(name, size:, color:)`: game-kit `Icon.tsx` adlarıyla.
- `SSvg(svgString, width:, height:, color:)`: oyunun kendi inline SVG'leri için. JSX'teki SVG'yi string olarak kopyala. `currentColor` desteklenir. `var(--x)` yerine hex yaz.

**Oyun kiti** (`lib/games/kit/kit.dart`, `game_module.dart`):
- `GameModule`, `SettingsPanelProps`, `PlayViewProps`:
  - `props.view` ve `props.settings` JSON'dur (`Json = Map<String, dynamic>`). `models.dart`'taki `fromJson` ile oku.
  - `props.act({...})` → `Future<Ack>`: `ack.ok`, `ack.error`, `ack['alan']`.
  - `props.api.get('/categories')`, `props.api.post('/cards', body)` → `Json`; hata `ApiError`.
- Sunucu saati ve yerleşim:
  - `Remaining(serverNow:, endsAt:, builder: (ctx, remainingMs))`: web'deki `useRemaining`.
  - `GameColumn(maxWidth:, top: 72, bottom:)`: oyun sütunu.
  - `viewportHeight(context)`: `100dvh` hesapları için.
- Ayarlar:
  - `SettingsGroup(title:, legendStyle:, legendGap:, hint:, hintStyle:)`: `.sgs-group`. Oyunun CSS'i legend'i eziyorsa (örn. `.nv-set .sgs-legend`), onu `legendStyle` olarak ver.
  - `ReadOnlyNote(text, dashed:)`, `SettingChip(adult:)`, `BrowseToggle`.
- Oyun sonu: `Confetti(top:)`, `EndBar(durationMs:)`, `EndSticker`, `EndCard`, `EndCards`, `Rosters`.
- Hareket ve kutular: `EnterAnim(dy:, scale:, opacity:, rotate:, duration:, curve:, animKey:)` (CSS keyframes `from` → normal), `GrowBar`, `DashedBox`.
- Yardımcılar: `membersOf(room)`, `joinNames`, `ErrorText`, `HowTo(children:)`, `TipBox`, `PillBar` (hap çubuk, dolgu iç köşeye kırpılır).
- `NoWrapText` (`lib/ui/widgets.dart`): CSS'te kırılmayıp taşan tek satır (ör. büyük puanlar).
- `FillColumn(top:, bottom:, minHeight:, gap:)` (`lib/ui/fill_column.dart`): `min-height` + `flex:1` spacer düzeni, içsel boyut sorgusu yapmaz (içinde `ListView`/`LayoutBuilder` güvenli). Tam boy oyun alanı için `IntrinsicHeight` yerine tercih et.
- Tam ekran katmanlar (CSS `position: fixed` overlay): `OverlayPortal` → oyun ekranının kendi `Overlay`'ine çizilir; odanın "?"/sohbet/menü düğmeleri üstte kalır.
- `viewportHeight(context)`: oda ekranında `GameViewport` ile kaydırma alanının gerçek yüksekliği (durum çubuğu düşülmüş).
- Metin: `lib/shared/text.dart` içinde `foldText`, `trUpper`, `trLower`, `trNumber`. CSS `text-transform: uppercase` için `trUpper` kullan, Türkçe İ için.
- Medya: `config.dart` içindeki `mediaUrl(path)`, sunucunun göreli adresleri için.
- Cihazda saklama: `context.read<Storage>()`, web'deki localStorage anahtar adlarıyla.
- Ses: `context.read<AudioPlayerService>()` (`lib/audio/player.dart`).
- Titreşim: `HapticFeedback`.

## CSS → Flutter eşlemesi
- **Sayıları CSS'ten oku, göz kararı yapma.** padding, gap, radius, border, shadow, font-size, line-height, letter-spacing, rotate.
- Kutu modeli `border-box`: `min-height: 48px`, kenarlık dahil 48'dir. Flutter `Container` + `BoxConstraints(minHeight:)` de böyledir.
- Satır yüksekliği:
  - `.display` ve başlıklar: `T.d(size)` (height 1). CSS'te `line-height: 1.1` varsa `height: 1.1`.
  - Gövde metni 1.45'tir.
- `font-weight: 800` metin: `T.b(size, weight: FontWeight.w800)`.
- `letter-spacing: 0.14em` → `size * 0.14`.
- Arka planda tanımsız renk yoktur. Sabit yazılmış hex'leri aynen kullan.
- Yerleşim:
  - `display:flex; gap` → `HStack` ya da `Row` + `SizedBox`.
  - `flex: 1` → `Expanded`.
  - `margin-left: auto` → `Spacer()`.
- Yarı saydamlık:
  - `opacity` → `Opacity`.
  - `color-mix(in srgb, X 12%, transparent)` → `X.withValues(alpha: .12)`.
- `overflow: hidden` + radius → `clipBehavior: Clip.antiAlias`.
- Ekran boyu:
  - `min-height: 100dvh` ya da `calc(100dvh - 72px - 22px)` → `ConstrainedBox(minHeight: viewportHeight(context) - …)` + `IntrinsicHeight` + `Column` + `Spacer` (never'daki `main`).
  - PlayView, kaydırılan bir sütunun içinde çizilir. Sınırsız yükseklikte `Expanded` kullanma; tam boy için bu kalıbı kullan.
- Ekran genişliği: `@media (min-width: 1100px)` ve masaüstü kuralları **uygulanmaz** (yalnızca telefon). 640/720px kuralları tablette geçerli; `MediaQuery.sizeOf(context).width` ile uygula.
- Durum ve etkileşim:
  - `:hover` yok.
  - `:active` → `Pressable(builder: (ctx, pressed))`.
  - `aria-pressed` / `data-*` durumları → widget parametresi.
- Animasyon:
  - CSS `transition` → `AnimatedContainer` / `AnimatedOpacity` / `AnimatedFractionallySizedBox`, aynı süre ve eğriyle.
  - `@keyframes` → `EnterAnim` ya da `AnimationController`.
  - `cubic-bezier(a,b,c,d)` → `Cubic(a,b,c,d)`.
  - `prefers-reduced-motion`: `MediaQuery.disableAnimationsOf(context)`.
- Etiketler: `aria-label`'lar → `Semantics(label:)` ya da `Pressable(label:)`.

## Davranış eşlemesi
- Web'de `useState`/`useEffect` ile tutulan yerel durum → `StatefulWidget`. Görünüm her `game:view`'de yeniden gelir; yerel durumu sıfırlama koşullarını web'deki `useEffect` bağımlılıklarına göre kur (bkz. never `_pendingKey`).
- `setInterval`/`setTimeout` → `Timer`; `dispose`'da iptal et.
- `requestAnimationFrame` → `Ticker` / `AnimationController`.
- `navigator.vibrate` → `HapticFeedback.mediumImpact()`.
- `confirm()` → `confirmDialog(context, metin)` (`lib/ui/dialog.dart`).
- Sürükleme: `GestureDetector(onPanUpdate)`. Kaydırmayı engellemesi gerekiyorsa `onVerticalDrag*` / `onHorizontalDrag*` ile jest yarışmasını kazan.
- `<input>` → `SInput` (`TextEditingController`).
- Oyun içi ayar paneli (`PlayView` içinde `SettingsPanel section="secondary"`): `XSettingsPanel(props: SettingsPanelProps(..., onChange: (n) => p.setSettings(n)))`.

## Test: gerçek sunucu görünümleri
1. `apps/server/scripts/mobile-fixtures/<id>.ts` yaz. Örnek: `never.ts`, düzenek: `lib.ts`.
   - Oyunun sunucusunu `createHarness` ile oynat. Sunucu testleri (`games/<id>/server/*.test.ts`) nasıl kurulacağını gösterir.
   - Her fazın/durumun görünümünü `out.write('<ad>', h.view('<oyuncu>'), { settings })` ile yaz.
   - Oda sahibi ve misafir görünümleri ayrı olsun.
2. Çalıştır: `cd apps/server && npx tsx scripts/mobile-fixtures/<id>.ts` → `packages/songie_core/test/fixtures/<id>/*.json`.
3. `test/games/<id>_test.dart` (dosya adında tire yok: `five_seconds_test.dart`): `test/helpers.dart` (`Fixture`, `fakeRoom`, `playProps`, `settingsProps`, `pumpGame` — gerçek fontlarla çizer).
   - Her görünüm 390×844'te hatasız çizilmeli. Örnek: `test/games/never_test.dart`.
4. `flutter test test/games/<id>_test.dart`.

5. Ortak bütünleşik testler kayıtlı her oyunu otomatik kapsar: `test/screens/lobby_test.dart` (lobi + açık sohbet) ve `test/screens/playing_test.dart` (her fixture gerçek oyun ekranında).

## Bitti sayılması için
1. `flutter analyze lib/games/<id> test/games/<id>_test.dart` temiz.
2. Görünüm testleri geçiyor.
3. Web'deki her ekran ve durum mobilde var: fazlar, host/misafir, boş/dolu, hata.
