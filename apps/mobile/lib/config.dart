/// Sunucu adresi. Geliştirmede: `flutter run --dart-define=SONGIE_URL=http://192.168.1.20:4310`
const String songieUrl = String.fromEnvironment('SONGIE_URL', defaultValue: 'https://songie.sehirkilavuzu.com');

/// Davet linkleri her zaman yayındaki adresle paylaşılır (web ile aynı).
const String publicUrl = String.fromEnvironment('SONGIE_PUBLIC_URL', defaultValue: 'https://songie.sehirkilavuzu.com');

Uri apiUri(String path) => Uri.parse('$songieUrl$path');

/// Sunucunun döndürdüğü göreli medya adresini (ör. `/api/games/…/media/…`) tam adrese çevirir.
String mediaUrl(String path) => path.startsWith('http') ? path : '$songieUrl$path';
