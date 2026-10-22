// ignore_for_file: invalid_use_of_visible_for_testing_member
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie/home.dart';
import 'package:songie/main.dart';
import 'package:songie/strings.dart';
import 'package:songie_core/app.dart';
import 'package:songie_core/audio/player.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/games/song_guess/models.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';

const _core = '../../packages/songie_core/lib/fonts';

Future<void> _fonts() async {
  const fonts = {
    'Baloo2': ['Baloo2-SemiBold', 'Baloo2-Bold', 'Baloo2-ExtraBold'],
    'Nunito': ['Nunito-Medium', 'Nunito-SemiBold', 'Nunito-Bold', 'Nunito-ExtraBold'],
  };
  for (final e in fonts.entries) {
    final loader = FontLoader(e.key);
    for (final f in e.value) {
      loader.addFont(Future.value(ByteData.sublistView(File('$_core/$f.ttf').readAsBytesSync())));
    }
    await loader.load();
  }
}

const _pools = [
  PoolInfo(id: 'tr-top', name: 'Türkçe Pop', category: 'turkce', trackCount: 120, custom: false),
  PoolInfo(id: 'global-top', name: 'Global Hits', category: 'global', trackCount: 150, custom: false),
  PoolInfo(id: 'rock', name: 'Rock', category: 'tur', trackCount: 90, custom: false),
];
const _stats = ProfileStats(gamesPlayed: 12, wins: 5, bestScore: 1840, bestStreak: 4);

final _key = GlobalKey();

Future<Session> _pump(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390 * 3, 2100 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({'songie.tour.seen': '1'});
  final storage = await Storage.open();
  final session = Session(storage)
    ..status = SessionStatus.ready
    ..connection = Connection.online
    ..profile = const Profile(id: 'me', nick: 'Ece', avatar: Avatar(color: 'mint'));
  await tester.pumpWidget(
    RepaintBoundary(
      key: _key,
      child: SongieApp(session: session, storage: storage, player: AudioPlayerService(storage), updateRequired: ValueNotifier(false)),
    ),
  );
  await tester.pump(const Duration(milliseconds: 200));
  return session;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    AppFlavor.current = AppFlavor(
      id: songieFlavor.id,
      name: songieFlavor.name,
      brandText: songieFlavor.brandText,
      badgeColor: songieFlavor.badgeColor,
      badgeIcon: songieFlavor.badgeIcon,
      games: songieFlavor.games,
      modules: songieFlavor.modules,
      storeId: songieFlavor.storeId,
      footer: songieFlavor.footer,
      home: (_) => const SongieHome(initialPools: _pools, initialStats: _stats),
    );
    await _fonts();
    await Catalog.load();
  });

  testWidgets('katalogda yalnızca Şarkıyı Bil var', (tester) async {
    expect(Catalog.instance.games.map((g) => g.id), ['song-guess']);
  });

  testWidgets('ana ekran: tasarımdaki bölümler, rekorlar ve seçimler', (tester) async {
    await _pump(tester);
    expect(find.text('SELAM, ECE'), findsOneWidget);
    expect(find.text(TrSongie.heroTitle), findsOneWidget);
    expect(find.text(TrSongie.solo), findsOneWidget);
    expect(find.text(TrSongie.friends), findsOneWidget);
    expect(find.text('1840'), findsOneWidget);
    expect(find.text('04'), findsOneWidget);
    // Varsayılan liste ve zorluk.
    expect(find.text('Türkçe Pop'), findsNWidgets(2));
    expect(find.text(TrSongie.difficultyHints['medium']!), findsOneWidget);
    await tester.tap(find.text('Zor'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text(TrSongie.difficultyHints['hard']!), findsOneWidget);
    await tester.tap(find.text('Rock'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Rock'), findsNWidgets(2));
    expect(tester.takeException(), isNull);

    // Görüntü: tasarımla karşılaştırma için build/screens/songie-home.png
    await tester.tap(find.text('Orta'));
    await tester.tap(find.text('Türkçe Pop').last);
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    await tester.runAsync(() async {
      final boundary = _key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 1);
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      Directory('build/screens').createSync(recursive: true);
      File('build/screens/songie-home.png').writeAsBytesSync(png!.buffer.asUint8List());
    });
  });
}
