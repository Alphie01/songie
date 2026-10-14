// Google girişi yapılandırması: butona basınca Google'ın giriş akışı açılır (uygulama düşmez).
//   flutter test integration_test/google_test.dart -d <simülatör>
// Açılan sistem penceresi "SHOT:" işaretleriyle simülatörden çekilir; girişin kendisi elle yapılır.
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:songie/main.dart' as app;
import 'package:songie/screens/guide.dart';
import 'package:songie/screens/home.dart';
import 'package:songie/screens/profile.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

Future<void> waitFor(WidgetTester tester, bool Function() cond, {Duration timeout = const Duration(seconds: 60), String what = ''}) async {
  final end = DateTime.now().add(timeout);
  while (!cond()) {
    if (DateTime.now().isAfter(end)) throw StateError('zaman aşımı: $what');
    await tester.pump(const Duration(milliseconds: 250));
  }
}

Future<void> hold(WidgetTester tester, Duration d) async {
  final end = DateTime.now().add(d);
  while (DateTime.now().isBefore(end)) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Google butonu giriş akışını açar', (tester) async {
    await app.main();
    await waitFor(tester, () => find.text('Adın ne?').evaluate().isNotEmpty || find.byType(HomeScreen).evaluate().isNotEmpty, what: 'açılış');
    Finder button;
    if (find.text('Adın ne?').evaluate().isNotEmpty) {
      button = find.text('Google ile devam et');
    } else {
      await tester.pump(const Duration(milliseconds: 500));
      // İlk açılıştaki tanıtım turunu kapat.
      await hold(tester, const Duration(seconds: 1));
      if (find.byType(WelcomeTour).evaluate().isNotEmpty) {
        Navigator.of(tester.element(find.byType(WelcomeTour))).pop();
        await tester.pump(const Duration(milliseconds: 300));
      }
      // Profil sayfasına git (Google'a bağlama kartı orada).
      GoRouter.of(tester.element(find.byType(HomeScreen))).go('/profil');
      await waitFor(tester, () => find.byType(ProfileScreen).evaluate().isNotEmpty, what: 'profil');
      button = find.text('Google ile bağla');
    }
    await tester.ensureVisible(button);
    await tester.pump(const Duration(milliseconds: 300));
    // ignore: avoid_print
    print('SHOT:g-before');
    await hold(tester, const Duration(seconds: 3));
    await tester.tap(button);
    await hold(tester, const Duration(seconds: 6));
    // ignore: avoid_print
    print('SHOT:g-sheet');
    await hold(tester, const Duration(seconds: 6));
    expect(tester.takeException(), isNull);
  });
}
