// Her kayıtlı oyunun lobisi: ayar paneli + açık sohbet (liste) gerçek oda ekranında hatasız çizilir.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie/app.dart';
import 'package:songie/audio/player.dart';
import 'package:songie/games/catalog.dart';
import 'package:songie/games/registry.dart';
import 'package:songie/session/session.dart';
import 'package:songie/session/storage.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

/// Oyunun fixture'larından birinin ayarları (yoksa boş: panel varsayılanlarla çizilir).
Json _settingsFor(String gameId) {
  final dir = Directory('test/fixtures/$gameId');
  if (!dir.existsSync()) return {};
  for (final f in dir.listSync().whereType<File>()) {
    final j = asJson(jsonDecode(f.readAsStringSync()));
    if (j['settings'] is Map) return j.obj('settings');
  }
  return {};
}

void main() {
  setUpAll(() async {
    await Catalog.load();
  });

  for (final gameId in gameModules.keys) {
    testWidgets('lobi: $gameId (sohbet açık)', (tester) async {
      await tester.runAsync(loadRealFonts);
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      SharedPreferences.setMockInitialValues({'songie.tour.seen': '1', 'songie.guide.seen.$gameId': '1'});
      final storage = await Storage.open();
      final session = Session(storage)
        ..status = SessionStatus.ready
        ..connection = Connection.online
        ..profile = const Profile(id: 'ali', nick: 'Ali', avatar: Avatar(color: 'mint'))
        ..chat = [for (var i = 0; i < 12; i++) ChatMessage(id: '$i', playerId: i.isEven ? 'ali' : 'ayse', text: 'mesaj $i', at: i)]
        ..room = RoomState(
          code: 'TEST',
          hostId: 'ali',
          gameId: gameId,
          settings: _settingsFor(gameId),
          phase: 'lobby',
          players: [
            for (final (i, id) in ['ali', 'ayse', 'cem', 'deniz'].indexed)
              RoomPlayer(id: id, nick: id, avatar: Avatar(color: const ['mint', 'sky', 'label', 'paper'][i]), connected: true, ready: i.isOdd),
          ],
          chat: const [],
          lastStandings: null,
        );
      await tester.pumpWidget(
        SongieApp(session: session, storage: storage, player: AudioPlayerService(storage), updateRequired: ValueNotifier(false), initialLocation: '/r/TEST'),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Oyun ayarları'), findsOneWidget);
      // Sohbeti aç (listeli sohbet lobinin alt kısmında).
      await tester.ensureVisible(find.text('Sohbet'));
      await tester.tap(find.text('Sohbet'));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.textContaining('mesaj', findRichText: true), findsWidgets);
      expect(tester.takeException(), isNull);
      expect(Catalog.instance.find(gameId), isNotNull);
    });
  }
}
