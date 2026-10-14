// Web + mobil aynı odada (uçtan uca). Yerel sunucu gerekir:
//   pnpm dev   (kökte)  →  flutter test integration_test/crossplay_test.dart -d <simülatör> --dart-define=SONGIE_URL=http://127.0.0.1:4310
// Test oda kodunu "ODA KODU: XXXX" diye yazar ve ikinci oyuncunun (web) katılmasını bekler.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';
import 'package:songie/main.dart' as app;
import 'package:songie/screens/home.dart';
import 'package:songie/session/session.dart';

Future<void> waitFor(WidgetTester tester, bool Function() cond, {Duration timeout = const Duration(seconds: 60), String what = ''}) async {
  final end = DateTime.now().add(timeout);
  while (!cond()) {
    if (DateTime.now().isAfter(end)) throw StateError('zaman aşımı: $what');
    await tester.pump(const Duration(milliseconds: 250));
  }
}

/// Ekran görüntüsü için işaret: host taraftaki betik `SHOT:ad` satırını görünce simülatörü çeker.
Future<void> shot(WidgetTester tester, String name) async {
  await tester.pump(const Duration(milliseconds: 500));
  // ignore: avoid_print
  print('SHOT:$name');
  final end = DateTime.now().add(const Duration(milliseconds: 2500));
  while (DateTime.now().isBefore(end)) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('mobil oda kurar, web katılır, Ben Hiç turu oynanır', (tester) async {
    await app.main();
    await waitFor(tester, () => find.text('Adın ne?').evaluate().isNotEmpty || find.byType(HomeScreen).evaluate().isNotEmpty, what: 'açılış');

    if (find.text('Adın ne?').evaluate().isNotEmpty) {
      await tester.enterText(find.byType(TextField).first, 'Mobil');
      await tester.tap(find.text('Devam et'));
    }
    await waitFor(tester, () => find.byType(HomeScreen).evaluate().isNotEmpty, what: 'ana sayfa');
    final session = tester.element(find.byType(HomeScreen)).read<Session>();
    await waitFor(tester, () => session.connection == Connection.online, what: 'socket');
    // İlk girişteki tanıtım turu
    await tester.pump(const Duration(milliseconds: 500));
    if (find.text('Oyunlara bak').evaluate().isNotEmpty) {
      await tester.tap(find.bySemanticsLabel('Kapat').last);
      await tester.pump(const Duration(milliseconds: 300));
    }

    await shot(tester, 'm-home');
    // Önceki testten kalan oda varsa yeni oda ondan farklı koda sahip olur.
    final previous = session.room?.code;
    await tester.tap(find.text('Oda Oluştur'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Ben Hiç').last);
    await waitFor(tester, () => session.room != null && session.room!.code != previous && session.room!.gameId == 'never', what: 'oda');
    final code = session.room!.code;
    // ignore: avoid_print
    print('ODA KODU: $code');
    // İlk girişte oyunun rehberi açılır
    await tester.pump(const Duration(milliseconds: 800));
    if (find.text('Nasıl oynanır?').evaluate().length > 1 || find.text('İleri').evaluate().isNotEmpty) {
      await tester.tap(find.bySemanticsLabel('Kapat').last);
      await tester.pump(const Duration(milliseconds: 300));
    }

    await waitFor(tester, () => session.room!.players.length >= 2, timeout: const Duration(seconds: 180), what: 'web oyuncusu');
    // ignore: avoid_print
    print('KATILDI: ${session.room!.players.map((p) => p.nick).join(', ')}');
    await shot(tester, 'm-lobby');

    await tester.ensureVisible(find.text('Oyunu başlat'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Oyunu başlat'));
    await waitFor(tester, () => session.room!.playing && session.gameView != null, what: 'oyun başladı');
    await tester.pump(const Duration(milliseconds: 600));
    // ignore: avoid_print
    print('OYUN BAŞLADI');
    await shot(tester, 'm-question');

    await tester.ensureVisible(find.text('Yaptım'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Yaptım'));
    await shot(tester, 'm-answered');
    await waitFor(tester, () => (session.gameView?.view as Map?)?['phase'] == 'reveal', timeout: const Duration(seconds: 120), what: 'açıklama');
    await tester.pump(const Duration(milliseconds: 800));
    // ignore: avoid_print
    print('AÇIKLAMA: ${find.textContaining('kişiden').evaluate().isNotEmpty || find.textContaining('Herkes').evaluate().isNotEmpty || find.textContaining('Kimse').evaluate().isNotEmpty}');
    await shot(tester, 'm-reveal');
  });
}
