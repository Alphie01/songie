import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/intrigue/models.dart';
import 'package:songie/games/intrigue/module.dart';
import 'package:songie/games/intrigue/strings.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

const _game = 'intrigue';
const module = IntrigueModule();

/// Fikstürdeki `me`, `players` ve `offline` alanları.
Json _raw(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));

RoomState _room(Json raw) {
  final base = fakeRoom(raw.strs('players'), gameId: _game);
  final offline = raw.strs('offline');
  return RoomState(
    code: base.code,
    hostId: base.hostId,
    gameId: base.gameId,
    settings: base.settings,
    phase: base.phase,
    players: [
      for (final p in base.players) RoomPlayer(id: p.id, nick: p.nick, avatar: p.avatar, connected: !offline.contains(p.id), ready: p.ready),
    ],
    chat: const [],
    lastStandings: null,
  );
}

Future<void> _pump(WidgetTester tester, String name, {List<Json>? acted, int? flashSeq}) async {
  final raw = _raw(name);
  var f = Fixture.load(_game, name);
  if (flashSeq != null) f = Fixture({...f.view, 'flash': {...asJson(f.view['flash']), 'seq': flashSeq}}, f.settings);
  await pumpGame(tester, module.playView(playProps(f, _room(raw), raw.str('me'), acted: acted)));
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await tester.pump(const Duration(milliseconds: 200));
}

void main() {
  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final f = Fixture.load(_game, name);
      final view = IntrigueView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await _pump(tester, name);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('eylem seçimi: hedefli eylem hedef sorar, onaylayınca gönderir', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'action-me', acted: acted);
    expect(find.text(SPlay.chooseAction), findsOneWidget);
    // İlk eşleşme eylem düğmesi (aynı sözcük nasıl oynanır tablosunda da geçer).
    await _tap(tester, find.text(actionName['assassinate']!).first);
    expect(find.text(SPlay.chooseTarget), findsNWidgets(2));
    await _tap(tester, find.text('ayse · 2'));
    await _tap(tester, find.text(SPlay.confirm(actionName['assassinate']!, 'ayse')));
    expect(acted.last, containsPair('target', 'ayse'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('itiraz penceresi: Yalan! ve engel düğmeleri', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'window-steal-target', acted: acted);
    expect(find.text(SPlay.blockAs(roleName['pirate']!)), findsOneWidget);
    expect(find.text(SPlay.blockAs(roleName['spy']!)), findsOneWidget);
    expect(find.text(SPlay.pass), findsOneWidget);
    await _tap(tester, find.text(SPlay.lie).first);
    expect(acted.last, containsPair('type', 'challenge'));
  });

  testWidgets('kart kaybı: kart seçilince düğme açılır', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'lose-me', acted: acted);
    expect(find.text(SPlay.loseMeTitle), findsOneWidget);
    await _tap(tester, find.text(roleName['guard']!).first);
    await _tap(tester, find.text(SPlay.loseBtn(roleName['guard']!)));
    expect(acted.last, containsPair('type', 'lose'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('itiraz sonucu: yeni flash kartı gösterir, Tamam kapatır, 4 sn sonra kendiliğinden kapanır', (tester) async {
    await _pump(tester, 'window-claim');
    expect(find.text(SPlay.ok), findsNothing);
    await _pump(tester, 'flash-true');
    expect(find.text(SPlay.ok), findsOneWidget);
    await tester.tap(find.text(SPlay.ok));
    await tester.pump();
    expect(find.text(SPlay.ok), findsNothing);

    // Aynı sıra numarası yeniden gösterilmez; daha yenisi gösterilir.
    await _pump(tester, 'flash-false');
    expect(find.text(SPlay.ok), findsNothing);
    await _pump(tester, 'flash-false', flashSeq: 2);
    expect(find.text(SPlay.ok), findsOneWidget);
    await tester.pump(const Duration(seconds: 4));
    expect(find.text(SPlay.ok), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('oda sahibi: bağlantısı kopan oyuncu için varsayılan', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'host-default', acted: acted);
    await _tap(tester, find.text(SPlay.hostDefault));
    expect(acted.last, containsPair('type', 'hostDefault'));
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final f = Fixture.load(_game, 'action-me');
    final room = fakeRoom(['ali', 'ayse', 'cem', 'deniz'], gameId: _game);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text(SSettings.deck), findsOneWidget);
    expect(find.text(SSettings.challenge), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text(SSettings.readOnly), findsOneWidget);
    expect(find.text(SSettings.challenge), findsNothing);
    expect(tester.takeException(), isNull);
    final big = fakeRoom(['a', 'b', 'c', 'd', 'e', 'f', 'g'], gameId: _game);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, big, 'a', section: 'secondary')));
    expect(find.text(SSettings.deck), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ayar paneli lobideki gibi (SliverFillRemaining içsel yükseklik ölçer)', (tester) async {
    final f = Fixture.load(_game, 'action-me');
    final room = fakeRoom(['ali', 'ayse', 'cem', 'deniz'], gameId: _game);
    for (final editable in [true, false]) {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      module.settingsPanel(settingsProps(f.settings, room, 'ali', section: 'primary', editable: editable)),
                      module.settingsPanel(settingsProps(f.settings, room, 'ali', section: 'secondary', editable: editable)),
                      const Spacer(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull);
    }
  });
}
