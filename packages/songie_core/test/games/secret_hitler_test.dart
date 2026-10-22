import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/secret_hitler/models.dart';
import 'package:songie_core/games/secret_hitler/module.dart';
import 'package:songie_core/games/secret_hitler/strings.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

const _game = 'secret-hitler';
const module = SecretHitlerModule();

/// Fikstürdeki `me`, `players` ve `offline` alanları.
Json _raw(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));

RoomState _room(List<String> players, {List<String> offline = const []}) {
  final base = fakeRoom(players, gameId: _game);
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

Future<void> _pump(WidgetTester tester, String name, {List<Json>? acted}) async {
  final raw = _raw(name);
  final f = Fixture.load(_game, name);
  await pumpGame(tester, module.playView(playProps(f, _room(raw.strs('players'), offline: raw.strs('offline')), raw.str('me'), acted: acted)));
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
      final view = SecretHitlerView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await _pump(tester, name);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('rol kartı yalnızca basılıyken açılır; takım arkadaşları da yalnızca o sırada görünür', (tester) async {
    await _pump(tester, 'role-fascist');
    final card = find.text(SPlay.roleHold);
    expect(card, findsOneWidget);
    expect(find.text(roleNames['hitler']!), findsNothing);
    await tester.ensureVisible(card);
    await tester.pump();
    final gesture = await tester.startGesture(tester.getCenter(card));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text(SPlay.roleHold), findsNothing);
    expect(find.text(SPlay.roleOpen(roleNames['fascist']!, SPlay.roleFascist)), findsOneWidget);
    expect(find.textContaining(SPlay.roleTeam), findsOneWidget);
    // Şeritte ve masada Hitler etiketi açıldı.
    expect(find.text(roleNames['hitler']!), findsWidgets);
    await gesture.up();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text(SPlay.roleHold), findsOneWidget);
    expect(find.text(roleNames['hitler']!), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('sorgulama sonuçları rol kartında', (tester) async {
    await _pump(tester, 'role-investigations');
    final card = find.text(SPlay.roleHold);
    await tester.ensureVisible(card);
    await tester.pump();
    final gesture = await tester.startGesture(tester.getCenter(card));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('${SPlay.investigations}: cem faşist'), findsOneWidget);
    await gesture.up();
    await tester.pump(const Duration(milliseconds: 100));
  });

  testWidgets('oylama: Ja! gönderir', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'vote-guest', acted: acted);
    await _tap(tester, find.text(SPlay.ja));
    expect(acted.last, containsPair('vote', 'ja'));
  });

  testWidgets('yasama: kart seçilmeden düğme kapalı, seçince atılır', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'legislate-president', acted: acted);
    await _tap(tester, find.text(SPlay.discardThis));
    expect(acted, isEmpty);
    await _tap(tester, find.text(policyNames['liberal']!).first);
    await _tap(tester, find.text(SPlay.discardThis));
    expect(acted.last, containsPair('type', 'discard'));
    expect(acted.last, containsPair('index', 1));
  });

  testWidgets('veto: başkan kabul eder', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'veto-president', acted: acted);
    await _tap(tester, find.text(SPlay.vetoAccept));
    expect(acted.last, containsPair('accept', true));
  });

  testWidgets('yetki: idam hedefi seçilir', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'power-execution', acted: acted);
    expect(find.text(SPlay.executionTitle), findsOneWidget);
    await _tap(tester, find.text('fatih').first);
    expect(acted.last, containsPair('target', 'fatih'));
  });

  testWidgets('oda sahibi: süre dolmadan atlanamaz, bağlantısı kopan hemen atlanır', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'nominate-host', acted: acted);
    expect(find.text(SPlay.skipIn(30)), findsOneWidget);
    await _tap(tester, find.text(SPlay.skip('ayse')));
    expect(acted, isEmpty);
    await _pump(tester, 'nominate-offline', acted: acted);
    expect(find.text(SPlay.skipHint), findsOneWidget);
    await _tap(tester, find.text(SPlay.skip('ayse')));
    expect(acted.last, containsPair('type', 'skip'));
  });

  testWidgets('oyun sonu: oda sahibi lobiye döndürür', (tester) async {
    final acted = <Json>[];
    await _pump(tester, 'over-liberal', acted: acted);
    expect(find.text(SPlay.winnerTitle['liberal']!), findsOneWidget);
    await _tap(tester, find.text(SPlay.backNow));
    expect(acted.last, containsPair('type', 'finish'));
    await _pump(tester, 'over-liberal-guest');
    expect(find.text(SPlay.backNow), findsNothing);
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final f = Fixture.load(_game, 'nominate-host');
    final room = _room(const ['ali', 'ayse', 'cem', 'deniz', 'ece', 'fatih', 'gul'], offline: const ['gul']);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text(SSettings.roles), findsOneWidget);
    expect(find.text(SSettings.rolesHint(6)), findsOneWidget);
    expect(find.text(SSettings.skipAfter), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text(SSettings.readOnly), findsOneWidget);
    expect(find.text(SSettings.skipAfter), findsNothing);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, _room(const ['a', 'b', 'c']), 'a', section: 'secondary')));
    expect(find.text(SSettings.sec(120)), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ayar paneli lobideki gibi (SliverFillRemaining içsel yükseklik ölçer)', (tester) async {
    final f = Fixture.load(_game, 'nominate-host');
    final room = _room(const ['ali', 'ayse', 'cem', 'deniz', 'ece', 'fatih', 'gul']);
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
