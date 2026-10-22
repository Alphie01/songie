// Uygulamanın kimliği: katalog yalnızca bu uygulamanın oyunlarını içerir ve ortak ana ekran onları listeler.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:itiraf_kosesi/flavor.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/app.dart';
import 'package:songie_core/audio/player.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/screens/home.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';

/// songie_core'un gerçek fontları (test fontunda her harf 1em genişlikte, sahte taşmalar üretir).
Future<void> _loadFonts() async {
  const fonts = {
    'Baloo2': ['Baloo2-SemiBold', 'Baloo2-Bold', 'Baloo2-ExtraBold'],
    'Nunito': ['Nunito-Medium', 'Nunito-SemiBold', 'Nunito-Bold', 'Nunito-ExtraBold'],
  };
  for (final e in fonts.entries) {
    final loader = FontLoader(e.key);
    for (final f in e.value) {
      loader.addFont(Future.value(ByteData.sublistView(File('../../packages/songie_core/lib/fonts/$f.ttf').readAsBytesSync())));
    }
    await loader.load();
  }
}

void main() {
  setUpAll(() async {
    AppFlavor.current = itirafFlavor;
    await Catalog.load();
  });

  test('katalog yalnızca bu uygulamanın oyunlarını, bu sırayla içerir', () {
    expect(Catalog.instance.games.map((g) => g.id).toList(), itirafFlavor.games);
    expect(itirafFlavor.modules.keys.toSet(), itirafFlavor.games.toSet());
    // Başka uygulamaların oyunları adları için hâlâ bilinir.
    expect(Catalog.instance.all.length, greaterThan(itirafFlavor.games.length));
  });

  testWidgets('ana ekran bu uygulamanın oyunlarını listeler', (tester) async {
    await tester.runAsync(_loadFonts);
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({'songie.tour.seen': '1'});
    final storage = await Storage.open();
    final session = Session(storage)
      ..status = SessionStatus.ready
      ..connection = Connection.online
      ..profile = const Profile(id: 'ali', nick: 'Ali', avatar: Avatar(color: 'mint'));
    await tester.pumpWidget(SongieApp(session: session, storage: storage, player: AudioPlayerService(storage), updateRequired: ValueNotifier(false)));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(HomeScreen), findsOneWidget);
    final names = {for (final g in Catalog.instance.all) g.id: g.name};
    for (final id in itirafFlavor.games) {
      expect(find.text(names[id]!), findsWidgets, reason: id);
    }
    for (final g in Catalog.instance.all.where((g) => !itirafFlavor.games.contains(g.id))) {
      expect(find.text(g.name), findsNothing, reason: g.id);
    }
    expect(find.text(itirafFlavor.footer!), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
