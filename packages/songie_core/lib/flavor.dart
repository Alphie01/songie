import 'package:flutter/widgets.dart';

import 'games/kit/game_module.dart';

/// Uygulamanın kimliği. Aynı ortak kod dört uygulamaya (Songie, İtiraf Köşesi, Casebook, We Knows)
/// dönüşür; sunucu ve hesaplar ortaktır, yalnızca oyunlar, marka ve ana ekran değişir.
class AppFlavor {
  const AppFlavor({
    required this.id,
    required this.name,
    required this.brandText,
    required this.badgeColor,
    required this.badgeIcon,
    required this.games,
    required this.modules,
    required this.storeId,
    this.appStoreUrl,
    this.badgeRadius,
    this.background = const Color(0xFF2A1B6E),
    this.home,
    this.footer,
  });

  /// songie | itiraf | casebook | weknows
  final String id;

  /// Görünen ad ("Songie", "Casebook"…).
  final String name;

  /// Logodaki yazı ("songie", "Casebook").
  final String brandText;
  final Color badgeColor;

  /// `SIcon` adı.
  final String badgeIcon;

  /// Logo rozetinin köşeleri (verilmezse yuvarlak kare).
  final BorderRadius? badgeRadius;

  /// Bu uygulamada oynanan oyunlar, katalog sırasıyla değil bu sırayla.
  final List<String> games;

  /// Oyunların mobil ekranları (yalnızca [games]).
  final Map<String, GameModule> modules;

  /// Android paket / iOS bundle kimliği.
  final String storeId;
  final String? appStoreUrl;

  /// Ekran zemini.
  final Color background;

  /// Uygulamaya özel ana ekran; verilmezse oyun listeli ortak ana ekran.
  final WidgetBuilder? home;

  /// Ana ekranın alt satırı.
  final String? footer;

  bool get singleGame => games.length == 1;

  static AppFlavor? _current;

  /// Uygulama açılırken bir kez ayarlanır (`runFlavor`). Testlerde ayarlanmazsa bütün oyunlarla Songie.
  static AppFlavor get current => _current ?? fallback;
  static set current(AppFlavor f) => _current = f;

  /// Testler ve ayarlanmamış durum: bütün oyunlar.
  static AppFlavor fallback = const AppFlavor(
    id: 'songie',
    name: 'Songie',
    brandText: 'songie',
    badgeColor: Color(0xFFFFD23F),
    badgeIcon: 'note',
    games: [],
    modules: {},
    storeId: 'com.monolithyazilim.songie',
  );
}

/// Bir oyunun hangi uygulamada oynandığı (başka uygulamanın oda koduyla gelen oyuncuya gösterilir).
const Map<String, String> appOfGame = {
  'song-guess': 'Songie',
  'never': 'İtiraf Köşesi',
  'bottle': 'İtiraf Köşesi',
  'most-likely': 'İtiraf Köşesi',
  'paranoia': 'İtiraf Köşesi',
  'confessions': 'İtiraf Köşesi',
  'red-flag': 'İtiraf Köşesi',
  'detective': 'Casebook',
  'werewolf': 'We Knows',
  'secret-hitler': 'We Knows',
  'intrigue': 'We Knows',
  'taboo': 'We Knows',
  'charades': 'We Knows',
  'five-seconds': 'We Knows',
  'agents': 'We Knows',
  'frequency': 'We Knows',
  'who-am-i': 'We Knows',
  'color-cards': 'We Knows',
  'kitten': 'We Knows',
};
