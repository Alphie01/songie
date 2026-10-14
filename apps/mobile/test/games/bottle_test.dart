import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/bottle/models.dart';
import 'package:songie/games/bottle/module.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

const _game = 'bottle';
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
  const module = BottleModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final raw = _raw(name);
      final f = Fixture.load(_game, name);
      final view = BottleView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(f, _room(raw), raw.str('me'))));
      expect(tester.takeException(), isNull);
      // Şişe dönüşü, kart girişi ve podyum çubuğu ilerlerken de hatasız.
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(milliseconds: 500));
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('çevirme: tur numarasıyla gönderilir', (tester) async {
    final f = Fixture.load(_game, 'spin-mine');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(_raw('spin-mine')), 'ali', acted: acted)));
    expect(find.text('Sıra sende'), findsOneWidget);
    await tester.tap(find.text('Şişeyi çevir').first);
    await tester.pump();
    expect(acted.single, {'type': 'spin', 'round': f.view['round']});
  });

  testWidgets('seçim ve oylama', (tester) async {
    final choose = Fixture.load(_game, 'choose-target');
    final raw = _raw('choose-target');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(choose, _room(raw), raw.str('me'), acted: acted)));
    expect(find.text('Şişe seni gösterdi'), findsOneWidget);
    await tester.tap(find.text('Cesaret'));
    await tester.pump();
    expect(acted.single, {'type': 'choose', 'kind': 'dare', 'round': choose.view['round']});

    final vote = Fixture.load(_game, 'vote-voter');
    final voteRaw = _raw('vote-voter');
    acted.clear();
    await pumpGame(tester, module.playView(playProps(vote, _room(voteRaw), voteRaw.str('me'), acted: acted)));
    expect(find.text('Görevi yaptı mı?'), findsOneWidget);
    await tester.tap(find.text('Hayır'));
    await tester.pump();
    expect(acted.single, {'type': 'vote', 'yes': false, 'round': vote.view['round']});
  });

  testWidgets('pas hakkı bitince pas kapalı', (tester) async {
    final f = Fixture.load(_game, 'task-nopass');
    final raw = _raw('task-nopass');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(raw), raw.str('me'), acted: acted)));
    expect(find.text('Pas hakkın kalmadı'), findsOneWidget);
    await tester.tap(find.text('Pas'), warnIfMissed: false);
    await tester.pump();
    expect(acted, isEmpty);
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final raw = _raw('spin-mine');
    final room = _room(raw);
    final f = Fixture.load(_game, 'spin-mine');
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Doğruluk mu cesaret mi'), findsOneWidget);
    expect(find.text('Adil şişe'), findsOneWidget);
    final open = find.text('Soru ya da görev ekle').last;
    await tester.ensureVisible(open);
    await tester.tap(open);
    await tester.pump();
    expect(find.text('Ekle'), findsOneWidget);
    await tester.ensureVisible(find.text('Cesaret'));
    await tester.tap(find.text('Cesaret'));
    await tester.pump();
    expect(find.text('Ör. En sevdiğin şarkının nakaratını söyle.'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Şişe 3 kez çevrilince oyun biter.'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Pas cezası'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('hareket azaltma: şişe atlar, kart ve podyum durağan', (tester) async {
    for (final name in ['spinning', 'choose-target', 'task-target', 'podium-host']) {
      final f = Fixture.load(_game, name);
      final raw = _raw(name);
      await pumpGame(tester, _reduced(module.playView(playProps(f, _room(raw), raw.str('me')))));
      await tester.pump(const Duration(seconds: 6));
      expect(tester.takeException(), isNull);
    }
  });
}
