import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/catalog.dart';
import 'package:songie/games/color-cards/models.dart';
import 'package:songie/games/color-cards/module.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

const _game = 'color-cards';
const module = ColorCardsModule();

/// Fikstür + görünümün sahibi + oda (bağlantısı kopanlar dahil).
({Fixture f, String me, RoomState room}) load(String name) {
  final j = asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));
  final f = Fixture(j.obj('view'), j.obj('settings'));
  final offline = j.strs('offline');
  final base = fakeRoom(j.strs('players'), gameId: _game, settings: f.settings);
  final room = RoomState(
    code: base.code,
    hostId: base.hostId,
    gameId: _game,
    settings: f.settings,
    phase: 'playing',
    players: [
      for (final p in base.players) RoomPlayer(id: p.id, nick: p.nick, avatar: p.avatar, connected: !offline.contains(p.id), ready: false),
    ],
    chat: const [],
    lastStandings: null,
  );
  return (f: f, me: j.str('me'), room: room);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await Catalog.load();
  });

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final x = load(name);
      final view = ColorCardsView.fromJson(x.f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me)));
      expect(tester.takeException(), isNull);
      if (view.phase != 'over') expect(find.text('Nasıl oynanır'), findsOneWidget);
    });
  }

  testWidgets('sıra bende: oynanabilir kart oynanır, joker renk sorar', (tester) async {
    final x = load('play-host');
    final view = ColorCardsView.fromJson(x.f.view);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    // Rehberde de "Sıra sende" başlığı var.
    expect(find.text('Sıra sende'), findsNWidgets(2));
    expect(find.text('Rengi ya da sayıyı eşleyen bir kart oyna. Uyan kartın yoksa kart çek.'), findsOneWidget);

    // Sayı kartı: doğrudan oynanır.
    final green = view.hand.firstWhere((c) => c.color == 'green' && view.playable.contains(c.id));
    await tester.tapAt(tester.getTopLeft(find.byKey(ValueKey(green.id))) + const Offset(8, 45));
    await tester.pump();
    expect(acted.last, {'type': 'play', 'cardId': green.id});

    // Joker: renk penceresi; "Vazgeç" kapatır, renk seçince oynanır.
    final wild = view.hand.firstWhere((c) => c.value == 'wild');
    await tester.tapAt(tester.getTopLeft(find.byKey(ValueKey(wild.id))) + const Offset(8, 45));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Renk seç için renk seç'), findsOneWidget);
    await tester.tap(find.text('Vazgeç'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Renk seç için renk seç'), findsNothing);
    await tester.tapAt(tester.getTopLeft(find.byKey(ValueKey(wild.id))) + const Offset(8, 45));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Mor'));
    await tester.pump();
    expect(acted.last, {'type': 'play', 'cardId': wild.id, 'color': 'purple'});

    // +4: elinde etkin renkte kart varken blöf uyarısı.
    final four = view.hand.firstWhere((c) => c.value == 'wild4');
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tapAt(tester.getTopLeft(find.byKey(ValueKey(four.id))) + const Offset(8, 45));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Elinde bu renkte kart var. İtiraz edilirse 4 kartı sen çekersin.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('kart çek, tut ve geç, son kart kilidi', (tester) async {
    final x = load('play-host');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    await tester.tap(find.text('Kart çek'));
    await tester.pump();
    expect(acted.last['type'], 'draw');
    // 10 kartla "Son kart!" kilitli: dokununca açıklama çıkar.
    await tester.tap(find.text('Son kart!').first);
    await tester.pump();
    expect(find.text('“Son kart!” 2 ya da daha az kartın kalınca açılır.'), findsOneWidget);

    final d = load('drew');
    await pumpGame(tester, module.playView(playProps(d.f, d.room, d.me, acted: acted)));
    expect(find.text('Çektiğin kart oynanabilir. Oyna ya da elinde tutup sırayı geçir.'), findsOneWidget);
    await tester.tap(find.text('Tut ve sırayı geçir'));
    await tester.pump();
    expect(acted.last['type'], 'pass');
  });

  testWidgets('7-0: 7 oynayınca el değiştirilecek oyuncu sorulur', (tester) async {
    final x = load('seven-zero');
    final view = ColorCardsView.fromJson(x.f.view);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('Tek el, 40 sn'), findsOneWidget);
    expect(find.text('Sınırsız çekme, 7-0 kuralı'.split(', ').reversed.join(', ')), findsOneWidget);
    final seven = view.hand.firstWhere((c) => c.value == '7' && view.playable.contains(c.id));
    await tester.tapAt(tester.getTopLeft(find.byKey(ValueKey(seven.id))) + const Offset(8, 45));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('7: elini kiminle değiştireceksin?'), findsOneWidget);
    await tester.tap(find.text('deniz').last);
    await tester.pump();
    expect(acted.last, {'type': 'play', 'cardId': seven.id, 'swapWith': 'deniz'});
    expect(tester.takeException(), isNull);
  });

  testWidgets('pencereler: açılış rengi, itiraz, el gösterimi', (tester) async {
    final acted = <Json>[];
    var x = load('color-mine');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('Açılış kartı Renk seç. Başlangıç rengini sen seç.'), findsNWidgets(2));
    await tester.tap(find.text('Sarı'));
    await tester.pump();
    expect(acted.last, {'type': 'pickColor', 'color': 'yellow'});

    x = load('challenge-victim');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('ali Renk seç +4 oynadı'), findsOneWidget);
    expect(find.text('Ya da elindeki +4’ü koyup cezayı sıradakine devret.'), findsOneWidget);
    await tester.tap(find.text('Hile! İtiraz et'));
    await tester.pump();
    expect(acted.last['type'], 'challenge');
    await tester.tap(find.text('Kabul et, 4 kart çek'));
    await tester.pump();
    expect(acted.last['type'], 'accept');

    x = load('reveal-guilty');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('Hile yakalandı! Elinde o renkte kart vardı.'), findsOneWidget);
    await tester.tap(find.text('Kapat'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Hile yakalandı! Elinde o renkte kart vardı.'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('son kart: yakalanan uyarısı ve "Yakaladım!"', (tester) async {
    final acted = <Json>[];
    var x = load('exposed-me');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('Son kartını söylemedin! Yakalanmadan “Son kart!” de.'), findsOneWidget);
    x = load('exposed-catch');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    await tester.tap(find.text('Yakaladım! ali söylemedi'));
    await tester.pump();
    expect(acted.last, {'type': 'catch', 'target': 'ali'});
    x = load('host-skip');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    await tester.tap(find.text('ayse yerine çek'));
    await tester.pump();
    expect(acted.last, {'type': 'skipTurn'});
  });

  testWidgets('ayar paneli (oda sahibi, misafir, oyun içi)', (tester) async {
    final x = load('play-host');
    await pumpGame(tester, module.settingsPanel(settingsProps(x.f.settings, x.room, 'ali')));
    expect(find.text('Kazanma'), findsOneWidget);
    expect(find.text('Ev kuralları'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(x.f.settings, x.room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Ev kuralları'), findsNothing);
    await pumpGame(tester, module.settingsPanel(settingsProps(x.f.settings, x.room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Ceza yığma'), findsOneWidget);
    expect(find.text('Kazanma'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
