// ignore_for_file: invalid_use_of_visible_for_testing_member
// Oyun ekranlarının görüntüleri (gözle kontrol): fixture'ı gerçek oyun ekranında çizer.
// Çalıştır: flutter test tool/game_shots_test.dart --dart-define=SHOTS=kitten/play-me,werewolf/night-wolf
// Ad verilmezse her oyunun ilk fixture'ı. Çıktı: build/shots/<oyun>__<ad>.png
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/app.dart';
import 'package:songie_core/audio/player.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/games/registry.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';

import '../test/helpers.dart';

const _shots = String.fromEnvironment('SHOTS');
const _height = int.fromEnvironment('SHOT_HEIGHT', defaultValue: 1600);
const _fallback = ['ali', 'ayse', 'cem', 'deniz', 'ece', 'fatma', 'gul', 'hakan'];

List<(String, String)> _targets() {
  if (_shots.isNotEmpty) {
    return [for (final s in _shots.split(',')) (s.split('/')[0], s.split('/')[1])];
  }
  return [
    for (final g in gameModules.keys)
      if (Directory('test/fixtures/$g').existsSync())
        (g, (Directory('test/fixtures/$g').listSync().whereType<File>().map((f) => f.uri.pathSegments.last.replaceAll('.json', '')).toList()..sort()).first),
  ];
}

void main() {
  setUpAll(() async => Catalog.load());
  for (final (gameId, name) in _targets()) {
    testWidgets('$gameId/$name', (tester) async {
      final j = asJson(jsonDecode(File('test/fixtures/$gameId/$name.json').readAsStringSync()));
      final ids = j['players'] is List ? j.strs('players') : _fallback;
      final offline = j['offline'] is List ? j.strs('offline') : const <String>[];
      final me = j.strOrNull('me') ?? ids.first;
      await tester.runAsync(loadRealFonts);
      tester.view.physicalSize = Size(390 * 2, _height * 2);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      SharedPreferences.setMockInitialValues({'songie.tour.seen': '1', 'songie.guide.seen.$gameId': '1'});
      final storage = await Storage.open();
      final session = Session(storage)
        ..status = SessionStatus.ready
        ..connection = Connection.online
        ..profile = Profile(id: me, nick: me, avatar: const Avatar(color: 'mint'))
        ..room = RoomState(
          code: 'TEST',
          hostId: j.strOrNull('host') ?? ids.first,
          gameId: gameId,
          settings: j['settings'],
          phase: 'playing',
          players: [
            for (final (i, id) in ids.indexed)
              RoomPlayer(id: id, nick: id, avatar: Avatar(color: const ['mint', 'signal', 'label', 'sky', 'paper'][i % 5]), connected: !offline.contains(id), ready: false),
          ],
          chat: const [],
          lastStandings: null,
        )
        ..gameView = GameViewPayload(room: 'TEST', game: gameId, view: j['view']);
      final key = GlobalKey();
      await tester.pumpWidget(
        RepaintBoundary(
          key: key,
          child: SongieApp(session: session, storage: storage, player: AudioPlayerService(storage), updateRequired: ValueNotifier(false), initialLocation: '/r/TEST'),
        ),
      );
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 400));
      }
      await tester.runAsync(() async {
        final image = await (key.currentContext!.findRenderObject()! as RenderRepaintBoundary).toImage(pixelRatio: 1);
        final png = await image.toByteData(format: ui.ImageByteFormat.png);
        Directory('build/shots').createSync(recursive: true);
        File('build/shots/${gameId}__$name.png').writeAsBytesSync(png!.buffer.asUint8List());
      });
      await tester.pumpWidget(const SizedBox());
      await tester.pump(const Duration(seconds: 1));
    });
  }
}
