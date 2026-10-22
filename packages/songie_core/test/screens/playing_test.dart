// Her oyunun gerçek sunucu görünümleri, uygulamanın gerçek oyun ekranında (katman, güvenli alan,
// "?" ve sohbet düğmeleri, oda sahibi çubuğu) hatasız çizilir.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/app.dart';
import 'package:songie_core/audio/player.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/games/registry.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

const _fallbackPlayers = ['ali', 'ayse', 'cem', 'deniz', 'ece', 'fatma', 'gul', 'hakan'];

void main() {
  setUpAll(() async {
    await Catalog.load();
  });

  for (final gameId in gameModules.keys) {
    final dir = Directory('test/fixtures/$gameId');
    if (!dir.existsSync()) continue;
    final files = dir.listSync().whereType<File>().where((f) => f.path.endsWith('.json')).toList()..sort((a, b) => a.path.compareTo(b.path));
    for (final file in files) {
      final name = file.uri.pathSegments.last.replaceAll('.json', '');
      testWidgets('oyun ekranı: $gameId/$name', (tester) async {
        final j = asJson(jsonDecode(file.readAsStringSync()));
        final ids = j['players'] is List ? j.strs('players') : _fallbackPlayers;
        final offline = j['offline'] is List ? j.strs('offline') : const <String>[];
        final me = j.strOrNull('me') ?? ids.first;
        final host = j.strOrNull('host') ?? ids.first;
        await tester.runAsync(loadRealFonts);
        tester.view.physicalSize = const Size(390 * 3, 844 * 3);
        tester.view.devicePixelRatio = 3;
        tester.view.padding = const FakeViewPadding(top: 47 * 3, bottom: 34 * 3);
        addTearDown(tester.view.reset);
        SharedPreferences.setMockInitialValues({'songie.tour.seen': '1', 'songie.guide.seen.$gameId': '1'});
        final storage = await Storage.open();
        final room = RoomState(
          code: 'TEST',
          hostId: host,
          gameId: gameId,
          settings: j['settings'],
          phase: 'playing',
          players: [
            for (final (i, id) in ids.indexed)
              RoomPlayer(
                id: id,
                nick: id,
                avatar: Avatar(color: const ['mint', 'signal', 'label', 'sky', 'paper'][i % 5]),
                connected: !offline.contains(id),
                ready: false,
              ),
          ],
          chat: const [],
          lastStandings: null,
        );
        final session = Session(storage)
          ..status = SessionStatus.ready
          ..connection = Connection.online
          ..profile = Profile(id: me, nick: me, avatar: const Avatar(color: 'mint'))
          ..room = room
          ..gameView = GameViewPayload(room: 'TEST', game: gameId, view: j['view']);
        await tester.pumpWidget(
          SongieApp(session: session, storage: storage, player: AudioPlayerService(storage), updateRequired: ValueNotifier(false), initialLocation: '/r/TEST'),
        );
        await tester.pump(const Duration(milliseconds: 400));
        await tester.pump(const Duration(milliseconds: 400));
        expect(tester.takeException(), isNull);
        // Oyun ekranı çizildi (bekleme yazısı değil).
        expect(find.text('Şarkılar hazırlanıyor…'), findsNothing);
        // Sayfayı kapat: açık zamanlayıcılar/animasyonlar test sonunda kalmasın.
        await tester.pumpWidget(const SizedBox());
        await tester.pump(const Duration(seconds: 1));
      });
    }
  }
}
