import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/five-seconds/models.dart';
import 'package:songie_core/games/five-seconds/module.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

const _game = 'five-seconds';
const _colors = ['mint', 'signal', 'label', 'sky', 'paper'];

/// Fikstürün ham hali: `me` (bakan oyuncu), `players` (ilki oda sahibi), `offline`.
Json _raw(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));

RoomState _room(Json raw) {
  final ids = raw.strs('players');
  final off = raw.strs('offline');
  return RoomState(
    code: 'TEST',
    hostId: ids.first,
    gameId: _game,
    settings: raw['settings'],
    phase: 'playing',
    players: [
      for (var i = 0; i < ids.length; i++)
        RoomPlayer(
          id: ids[i],
          nick: ids[i],
          avatar: Avatar(color: _colors[i % 5]),
          connected: !off.contains(ids[i]),
          ready: false,
        ),
    ],
    chat: const [],
    lastStandings: null,
  );
}

/// Hareket azaltma açık (`prefers-reduced-motion: reduce`).
Widget _reduced(Widget child) => Builder(
  builder: (context) => MediaQuery(data: MediaQuery.of(context).copyWith(disableAnimations: true), child: child),
);

void main() {
  const module = FiveSecondsModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final raw = _raw(name);
      final f = Fixture.load(_game, name);
      final view = FiveSecondsView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(f, _room(raw), raw.str('me'))));
      expect(tester.takeException(), isNull);
      // Animasyonlar (görev kartı, halka, podyum çubuğu) ilerlerken de hatasız.
      await tester.pump(const Duration(seconds: 3));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('hazırlık: Hazırım gönderilir', (tester) async {
    final f = Fixture.load(_game, 'ready-mine');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(_raw('ready-mine')), 'ali', acted: acted)));
    expect(find.text('Sıra sende'), findsOneWidget);
    await tester.tap(find.text('Hazırım').first);
    await tester.pump();
    expect(acted.single['type'], 'ready');
  });

  testWidgets('geri sayım: sayaç dokununca ilerler, Söyledim gönderilir', (tester) async {
    final f = Fixture.load(_game, 'countdown-mine');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(_raw('countdown-mine')), 'ali', acted: acted)));
    await tester.tap(find.bySemanticsLabel('2. şey'));
    await tester.pump(const Duration(milliseconds: 100));
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Söyledim'));
    await tester.pump();
    expect(acted.last['type'], 'done');
  });

  testWidgets('oylama: oy gönderilir', (tester) async {
    final f = Fixture.load(_game, 'vote-voter');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(_raw('vote-voter')), 'cem', acted: acted)));
    expect(find.text('ali 3 şeyi söyleyebildi mi?'), findsOneWidget);
    await tester.tap(find.text('Başardı'));
    await tester.pump();
    expect(acted.single, {'type': 'vote', 'attemptId': f.view['attemptId'], 'success': true});
  });

  testWidgets('ayar paneli (oda sahibi, takım modu, misafir)', (tester) async {
    final raw = _raw('team-ready');
    final room = _room(raw);
    final f = Fixture.load(_game, 'team-ready');
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Takımlar'), findsOneWidget);
    expect(find.text('Çalma kuralı'), findsOneWidget);
    expect(tester.takeException(), isNull);
    final open = find.text('Görev ekle').last;
    await tester.ensureVisible(open);
    await tester.tap(open);
    await tester.pump();
    expect(find.text('Görevi ekle'), findsOneWidget);

    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(tester.takeException(), isNull);

    final solo = Fixture.load(_game, 'ready-mine');
    await pumpGame(tester, module.settingsPanel(settingsProps(solo.settings, _room(_raw('ready-mine')), 'cem', editable: false, section: 'secondary')));
    expect(find.text('Herkes 2 kez görev alır.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('hareket azaltma: görev kartı, halka ve podyum', (tester) async {
    for (final name in ['countdown-low', 'steal-countdown', 'podium-host']) {
      final f = Fixture.load(_game, name);
      final raw = _raw(name);
      await pumpGame(tester, _reduced(module.playView(playProps(f, _room(raw), raw.str('me')))));
      expect(tester.takeException(), isNull);
    }
  });
}
