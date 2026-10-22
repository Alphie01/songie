// ignore_for_file: invalid_use_of_visible_for_testing_member
// Platform ekranlarının görüntüleri (web'le karşılaştırma): gerçek fontlarla 390 genişlikte çizilir.
// Çalıştır: flutter test tool/screens_test.dart  → build/screens/*.png
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/app.dart';
import 'package:songie_core/audio/player.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/screens/guide.dart';
import 'package:songie_core/screens/home.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';

Future<void> _fonts() async {
  const fonts = {
    'Baloo2': ['Baloo2-SemiBold', 'Baloo2-Bold', 'Baloo2-ExtraBold'],
    'Nunito': ['Nunito-Medium', 'Nunito-SemiBold', 'Nunito-Bold', 'Nunito-ExtraBold'],
  };
  for (final e in fonts.entries) {
    final loader = FontLoader(e.key);
    for (final f in e.value) {
      loader.addFont(Future.value(ByteData.sublistView(File('lib/fonts/$f.ttf').readAsBytesSync())));
    }
    await loader.load();
  }
}

const _profile = Profile(id: 'me', nick: 'Ece', avatar: Avatar(color: 'paper'));
RoomPlayer _p(String id, String nick, String color, {bool ready = false}) =>
    RoomPlayer(id: id, nick: nick, avatar: Avatar(color: color), connected: true, ready: ready);

RoomState _room({String phase = 'lobby', List<Standing>? standings}) => RoomState(
  code: 'KMTR',
  hostId: 'me',
  gameId: 'never',
  settings: const {
    'categories': ['genel', 'okul-is', 'ask-iliski', 'seyahat', 'utanc', 'teknoloji', 'yemek', 'arkadas'],
    'lives': 5,
    'anonymous': false,
    'seconds': 30,
    'rounds': 20,
  },
  phase: phase,
  players: [_p('me', 'Ece', 'paper'), _p('b', 'Barış', 'sky', ready: true)],
  chat: const [],
  lastStandings: standings,
);

final _key = GlobalKey();

Future<void> _shoot(WidgetTester tester, String name) async {
  await tester.pump(const Duration(milliseconds: 400));
  await tester.runAsync(() async {
    final boundary = _key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 2);
    final png = await image.toByteData(format: ui.ImageByteFormat.png);
    Directory('build/screens').createSync(recursive: true);
    File('build/screens/$name.png').writeAsBytesSync(png!.buffer.asUint8List());
  });
}

Future<Session> _app(WidgetTester tester, {required double height, String location = '/', SessionStatus status = SessionStatus.ready, RoomState? room, bool tourSeen = true}) async {
  tester.view.physicalSize = Size(390 * 3, height * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({if (tourSeen) 'songie.tour.seen': '1', 'songie.guide.seen.never': '1'});
  final storage = await Storage.open();
  final session = Session(storage)
    ..status = status
    ..connection = Connection.online
    ..profile = status == SessionStatus.ready ? _profile : null
    ..stats = const ProfileStats(gamesPlayed: 12, wins: 5, bestScore: 1840, bestStreak: 4)
    ..room = room;
  await tester.pumpWidget(
    RepaintBoundary(
      key: _key,
      child: SongieApp(session: session, storage: storage, player: AudioPlayerService(storage), updateRequired: ValueNotifier(false), initialLocation: location),
    ),
  );
  await tester.pump(const Duration(milliseconds: 100));
  return session;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await _fonts();
    await Catalog.load();
  });

  testWidgets('giriş', (tester) async {
    await _app(tester, height: 844, status: SessionStatus.anonymous);
    await _shoot(tester, '1-welcome');
  });

  testWidgets('ana sayfa', (tester) async {
    await _app(tester, height: 3000);
    await _shoot(tester, '3-home');
  });

  testWidgets('tanıtım ve rehber', (tester) async {
    await _app(tester, height: 844, tourSeen: false);
    await tester.pump(const Duration(milliseconds: 300));
    await _shoot(tester, '2-tour');
    Navigator.of(tester.element(find.byType(WelcomeTour))).pop();
    await tester.pump();
    openGuide(tester.element(find.byType(HomeScreen)), 'taboo');
    await tester.pump(const Duration(milliseconds: 300));
    await _shoot(tester, '4-guide-1');
    await tester.tap(find.text('İleri'));
    await _shoot(tester, '4-guide-2');
  });

  testWidgets('profil', (tester) async {
    await _app(tester, height: 1000, location: '/profil');
    await _shoot(tester, '7-profile');
  });

  testWidgets('lobi', (tester) async {
    await _app(tester, height: 1500, location: '/r/KMTR', room: _room());
    await _shoot(tester, '6-lobby');
  });

  testWidgets('sonuç', (tester) async {
    await _app(
      tester,
      height: 844,
      location: '/r/KMTR',
      room: _room(
        standings: const [
          Standing(playerId: 'me', nick: 'Ece', avatar: Avatar(color: 'paper'), score: 1840, rank: 1),
          Standing(playerId: 'b', nick: 'Barış', avatar: Avatar(color: 'sky'), score: 1210, rank: 2),
        ],
      ),
    );
    await _shoot(tester, '8-results');
  });

  testWidgets('oyun seçici', (tester) async {
    await _app(tester, height: 844);
    await tester.tap(find.text('Oda Oluştur'));
    await tester.pump(const Duration(milliseconds: 300));
    await _shoot(tester, '5-picker');
    expect(kDebugMode, isTrue);
  });
}
