// GEÇİCİ tanı testi (Şarkıyı Bil: mobil doğru tahmin "bilemedi" görünüyor). İş bitince silinecek.
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';
import 'package:songie_core/games/song_guess/guess_box.dart';
import 'package:songie/main.dart' as app;
import 'package:songie_core/screens/guide.dart';
import 'package:songie_core/screens/home.dart';
import 'package:songie_core/session/session.dart';
import 'package:provider/provider.dart';

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

Future<void> shot(WidgetTester tester, String name) async {
  // ignore: avoid_print
  print('SHOT:$name');
  await hold(tester, const Duration(milliseconds: 2500));
}

void log(String s) {
  // ignore: avoid_print
  print('DBG $s');
}

Future<void> closeDialogs(WidgetTester tester) async {
  for (final type in [WelcomeTour, GuideDialog]) {
    if (find.byType(type).evaluate().isNotEmpty) {
      Navigator.of(tester.element(find.byType(type))).pop();
      await tester.pump(const Duration(milliseconds: 300));
    }
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('şarkıyı bil: mobil doğru tahmin', (tester) async {
    await app.main();
    await waitFor(tester, () => find.byType(HomeScreen).evaluate().isNotEmpty, what: 'ana sayfa');
    final session = tester.element(find.byType(HomeScreen)).read<Session>();
    await waitFor(tester, () => session.connection == Connection.online, what: 'socket');
    await hold(tester, const Duration(seconds: 1));
    await closeDialogs(tester);

    final previous = session.room?.code;
    await tester.tap(find.text('Oda Oluştur'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Şarkıyı Bil').last);
    await waitFor(tester, () => session.room != null && session.room!.code != previous && session.room!.gameId == 'song-guess', what: 'oda');
    // ignore: avoid_print
    print('ODA KODU: ${session.room!.code}');
    await hold(tester, const Duration(seconds: 1));
    await closeDialogs(tester);

    await waitFor(tester, () => session.room!.players.length >= 2, timeout: const Duration(seconds: 180), what: 'web oyuncusu');
    log('players ${session.room!.players.map((p) => '${p.nick}:${p.id}').join(', ')} me=${session.profile!.id}');
    await tester.ensureVisible(find.text('Oyunu başlat'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Oyunu başlat'));
    Map<String, dynamic> view() => Map<String, dynamic>.from((session.gameView?.view as Map?) ?? const {});
    await waitFor(tester, () => session.room!.playing && view()['phase'] == 'stage', timeout: const Duration(seconds: 90), what: 'aşama');
    log('stage round=${view()['round']} stage=${view()['stage']}');
    await shot(tester, 'sg-stage');

    // Cevabı host'taki dosyadan bekle ("başlık|sanatçı").
    String? answer;
    final end = DateTime.now().add(const Duration(seconds: 120));
    while (answer == null && DateTime.now().isBefore(end)) {
      try {
        final res = await http.get(Uri.parse('http://127.0.0.1:8765/answer.txt'));
        final t = utf8.decode(res.bodyBytes).trim();
        if (t.isNotEmpty) answer = t;
      } on Object {
        // dosya sunucusu yok
      }
      await tester.pump(const Duration(milliseconds: 500));
    }
    log('answer=$answer');
    final parts = answer!.split('|');
    final title = parts[0];
    final artist = parts.length > 1 ? parts[1] : '';

    final field = find.descendant(of: find.byType(SgGuessBox), matching: find.byType(EditableText));
    final size = tester.view.physicalSize / tester.view.devicePixelRatio;
    log('screen=$size field(before tap)=${tester.getRect(field)}');
    await tester.tap(field);
    await hold(tester, const Duration(milliseconds: 1200));
    log('field(after keyboard)=${tester.getRect(field)} insets=${tester.view.viewInsets.bottom / tester.view.devicePixelRatio}');
    await tester.enterText(field, title);
    await hold(tester, const Duration(seconds: 2));
    final hits = find.textContaining(' – ').evaluate().map((e) => (e.widget as Text).data).whereType<String>().toList();
    log('hits=${jsonEncode(hits)}');
    final wanted = find.text('$artist – $title');
    log('wanted found=${wanted.evaluate().length} rect=${wanted.evaluate().isEmpty ? null : tester.getRect(wanted.first)}');
    await shot(tester, 'sg-hits');
    await tester.tap(wanted.evaluate().isNotEmpty ? wanted.first : find.textContaining(' – ').first);
    await hold(tester, const Duration(milliseconds: 1500));
    log('me after guess=${jsonEncode(view()['me'])}');
    log('feed=${jsonEncode(view()['feed'])}');
    await shot(tester, 'sg-after-guess');

    await waitFor(tester, () => view()['phase'] == 'reveal', timeout: const Duration(seconds: 120), what: 'açıklama');
    await hold(tester, const Duration(seconds: 1));
    log('reveal results=${jsonEncode((view()['reveal'] as Map?)?['results'])} me=${session.profile!.id}');
    await shot(tester, 'sg-reveal');
  });
}
