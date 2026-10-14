import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/paranoia/models.dart';
import 'package:songie/games/paranoia/module.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

const _game = 'paranoia';
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
  const module = ParanoiaModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final raw = _raw(name);
      final f = Fixture.load(_game, name);
      final view = ParanoiaView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(f, _room(raw), raw.str('me'))));
      expect(tester.takeException(), isNull);
      // Açıklama sahnesi (0.9 ve 1.9 sn gecikmeli) ve zarf animasyonları bitince de hatasız.
      await tester.pump(const Duration(seconds: 3));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('zarf açılır, oyuncu seçilip onaylanır', (tester) async {
    final f = Fixture.load(_game, 'asking-from');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(_raw('asking-from')), 'cem', acted: acted)));
    expect(find.text('Sana gizli bir soru geldi!'), findsOneWidget);
    expect(find.text('ayse sana gönderdi. Kimse görmesin, sonra zarfa dokun.'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Zarfı aç'));
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pump(const Duration(milliseconds: 500));
    expect(tester.takeException(), isNull);
    expect(find.text(f.view['question'] as String), findsOneWidget);
    expect(find.text('Seçimi onayla'), findsOneWidget);
    await tester.tap(find.text('deniz').first);
    await tester.pump();
    final confirm = find.text('deniz seçimini onayla');
    await tester.ensureVisible(confirm);
    await tester.tap(confirm);
    await tester.pump();
    expect(acted.single, {'type': 'choose', 'seq': f.view['seq'], 'targetId': 'deniz'});
  });

  testWidgets('açıklama: oda sahibinin düğmesi sahne bitince açılır', (tester) async {
    final f = Fixture.load(_game, 'reveal-host');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(_raw('reveal-host')), 'ali', acted: acted)));
    final next = find.text('Sıradaki soruyu aç');
    await tester.ensureVisible(next);
    await tester.tap(next, warnIfMissed: false);
    await tester.pump();
    expect(acted, isEmpty);
    await tester.pump(const Duration(seconds: 3));
    await tester.tap(next);
    await tester.pump();
    expect(acted.single, {'type': 'next', 'shown': 1});
  });

  testWidgets('Türkçe ekler', (tester) async {
    final f = Fixture.load(_game, 'summary-guest');
    await pumpGame(tester, module.playView(playProps(f, _room(_raw('summary-guest')), 'ayse')));
    expect(find.text('En çok seçilenler berabere'), findsOneWidget);
    expect(find.textContaining("ayse'ye soruldu → "), findsWidgets);
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final raw = _raw('pickfirst-host');
    final room = _room(raw);
    final f = Fixture.load(_game, 'pickfirst-host');
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Süre bitince'), findsOneWidget);
    expect(find.text('Kime sorulduğu gizli'), findsOneWidget);
    final open = find.text('Soru ekle').last;
    await tester.ensureVisible(open);
    await tester.tap(open);
    await tester.pump();
    expect(find.text('Soruyu ekle'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('3 soru sorulduktan sonra hepsi teker teker açılır.'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await pumpGame(tester, module.settingsPanel(settingsProps({...f.settings, 'thinkSeconds': 0}, room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Süre bitince'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('hareket azaltma: zarf hemen açılır, sahne beklemez', (tester) async {
    final f = Fixture.load(_game, 'asking-envelope');
    await pumpGame(tester, _reduced(module.playView(playProps(f, _room(_raw('asking-envelope')), 'ayse'))));
    await tester.tap(find.bySemanticsLabel('Zarfı aç'));
    await tester.pump();
    expect(find.text(f.view['question'] as String), findsOneWidget);

    final reveal = Fixture.load(_game, 'reveal-host');
    final acted = <Json>[];
    await pumpGame(tester, _reduced(module.playView(playProps(reveal, _room(_raw('reveal-host')), 'ali', acted: acted))));
    final next = find.text('Sıradaki soruyu aç');
    await tester.ensureVisible(next);
    await tester.tap(next);
    await tester.pump();
    expect(acted.single, {'type': 'next', 'shown': 1});
  });
}
