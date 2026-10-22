import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/games/kit/game_module.dart';
import 'package:songie_core/session/api.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';
import 'package:songie_core/ui/tokens.dart';

/// `apps/server/scripts/mobile-fixtures/<oyun>.ts` ile üretilen görünüm.
class Fixture {
  Fixture(this.view, this.settings);
  final Json view;
  final Json settings;

  static Fixture load(String game, String name) {
    final j = asJson(jsonDecode(File('test/fixtures/$game/$name.json').readAsStringSync()));
    return Fixture(j.obj('view'), j.obj('settings'));
  }

  static List<String> names(String game) =>
      Directory('test/fixtures/$game').listSync().whereType<File>().where((f) => f.path.endsWith('.json')).map((f) => f.uri.pathSegments.last.replaceAll('.json', '')).toList()..sort();
}

/// Test düzeneğinin oyuncuları (createHarness: ilk oyuncu oda sahibi).
RoomState fakeRoom(List<String> ids, {String gameId = 'test', Object? settings, String phase = 'playing'}) => RoomState(
  code: 'TEST',
  hostId: ids.first,
  gameId: gameId,
  settings: settings,
  phase: phase,
  players: [
    for (var i = 0; i < ids.length; i++)
      RoomPlayer(id: ids[i], nick: ids[i], avatar: Avatar(color: const ['mint', 'signal', 'label', 'sky', 'paper'][i % 5]), connected: true, ready: false),
  ],
  chat: const [],
  lastStandings: null,
);

final _api = Api(() => null);

PlayViewProps playProps(Fixture f, RoomState room, String meId, {List<Json>? acted}) => PlayViewProps(
  view: f.view,
  meId: meId,
  room: room,
  act: (a) async {
    acted?.add(a);
    return const Ack({'ok': true});
  },
  api: GameApi(_api, room.gameId),
  settings: f.settings,
  setSettings: (_) async {},
);

SettingsPanelProps settingsProps(Json settings, RoomState room, String meId, {String? section, bool editable = true}) => SettingsPanelProps(
  settings: settings,
  editable: editable,
  onChange: (_) {},
  api: GameApi(_api, room.gameId),
  players: room.players,
  meId: meId,
  section: section,
);

bool _fontsLoaded = false;

/// Uygulamanın gerçek fontları (test fontunda her harf 1em genişlikte, sahte taşmalar üretir).
Future<void> loadRealFonts() async {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
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

/// Oyun ekranını telefon boyutunda (390×844), uygulamadaki gibi kaydırılan sütunda çizer.
Future<void> pumpGame(WidgetTester tester, Widget child) async {
  await tester.runAsync(loadRealFonts);
  SharedPreferences.setMockInitialValues({});
  final storage = await Storage.open();
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    Provider<Storage>.value(
      value: storage,
      child: MaterialApp(
        theme: songieTheme(),
        home: Scaffold(backgroundColor: C.bg, body: SingleChildScrollView(child: child)),
      ),
    ),
  );
  await tester.pump(const Duration(milliseconds: 700));
}
