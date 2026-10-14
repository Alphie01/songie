import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/kitten/models.dart';
import 'package:songie/games/kitten/module.dart';
import 'package:songie/shared/models.dart';
import 'package:songie/ui/widgets.dart';

import '../helpers.dart';

const _game = 'kitten';
const module = KittenModule();

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

/// El kartının dokunulan kısmı (dönüşümün içindeki düğme).
Finder hcard(KittenView v, String kind, [int nth = 0]) =>
    find.descendant(of: find.byKey(ValueKey('hcard-${v.hand.where((c) => c.kind == kind).elementAt(nth).id}')), matching: find.byType(Pressable));

/// Kaydırılan sütunda aşağıda kalan öğeye dokunmadan önce görünür kıl.
Future<void> tapOn(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.pump();
  await tester.tap(f);
}

/// Aynı ekranda görünüm değişimi (yeni `game:view`). Her çağrıda yeni ekran (durum taşınmaz).
Future<ValueNotifier<Fixture>> pumpSequence(WidgetTester tester, Fixture first, RoomState room, String me, {List<Json>? acted}) async {
  final current = ValueNotifier(first);
  addTearDown(current.dispose);
  await pumpGame(
    tester,
    ValueListenableBuilder<Fixture>(
      key: UniqueKey(),
      valueListenable: current,
      builder: (context, f, _) => module.playView(playProps(f, room, me, acted: acted)),
    ),
  );
  return current;
}

void main() {
  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final x = load(name);
      final view = KittenView.fromJson(x.f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me)));
      expect(tester.takeException(), isNull);
      if (view.phase != 'over') expect(find.text('Nasıl oynanır'), findsOneWidget);
    });
  }

  testWidgets('sıra bende: tek kart, kedi çifti (hedef), kedi üçlüsü yok, kart çek', (tester) async {
    final x = load('play-host');
    final view = KittenView.fromJson(x.f.view);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('İstediğin kadar kart oyna, sonra bir kart çek.'), findsOneWidget);
    expect(find.text('Aynı kediden 2 ya da 3 tane seçebilirsin.'), findsOneWidget);

    await tapOn(tester, hcard(view, 'attack'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Seçimi temizle'), findsOneWidget);
    await tapOn(tester, find.text('Saldır oyna'));
    await tester.pump();
    expect(acted.last, {'type': 'play', 'cardIds': [view.hand.firstWhere((c) => c.kind == 'attack').id]});

    // Seçimi temizle, iki tekir: hedef seçilmeden oynanamaz.
    await tapOn(tester, hcard(view, 'attack'));
    await tester.pump();
    await tapOn(tester, find.text('Seçimi temizle'));
    await tester.pump();
    await tapOn(tester, hcard(view, 'tekir'));
    await tapOn(tester, hcard(view, 'tekir', 1));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Kimden?'), findsOneWidget);
    final count = acted.length;
    await tapOn(tester, find.text('Kedi çifti oyna'));
    await tester.pump();
    expect(acted.length, count);
    await tapOn(tester, find.widgetWithText(SChip, 'ayse'));
    await tester.pump();
    await tapOn(tester, find.text('Kedi çifti oyna'));
    await tester.pump();
    expect(acted.last['target'], 'ayse');
    expect((acted.last['cardIds'] as List).length, 2);

    // Geçersiz birleşim.
    await tapOn(tester, hcard(view, 'sarman'));
    await tester.pump();
    expect(find.text('Bu kartlar birlikte oynanmaz'), findsOneWidget);

    await tapOn(tester, find.text('Kart çek ve sırayı bitir'));
    await tester.pump();
    expect(acted.last, {'type': 'draw', 'turn': view.turn});
    expect(tester.takeException(), isNull);
  });

  testWidgets('Hayır penceresi: Hayır kartı olan / olmayan', (tester) async {
    final acted = <Json>[];
    var x = load('nope-can');
    final view = KittenView.fromJson(x.f.view);
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('ali Saldır oynadı'), findsOneWidget);
    expect(find.text('Kimse durdurmazsa olacak'), findsOneWidget);
    await tester.tap(find.text('Hayır!'));
    await tester.pump();
    expect(acted.last, {'type': 'nope', 'pendingId': view.pending!.id, 'cardId': view.hand.firstWhere((c) => c.kind == 'nope').id});
    x = load('nope-cancelled');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me)));
    expect(find.text('Şimdilik durduruldu'), findsOneWidget);
    expect(find.text('1 Hayır'), findsOneWidget);
    expect(find.text('Elinde Hayır yok.'), findsOneWidget);
  });

  testWidgets('İyilik: istenen kart seçilip verilir', (tester) async {
    final acted = <Json>[];
    final x = load('favor-giver');
    final view = KittenView.fromJson(x.f.view);
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('ali senden bir kart istiyor'), findsOneWidget);
    await tapOn(tester, hcard(view, 'kara'));
    await tester.pump();
    await tapOn(tester, find.text('Kara Kömür ver'));
    await tester.pump();
    expect(acted.last, {'type': 'give', 'cardId': view.hand.firstWhere((c) => c.kind == 'kara').id});
  });

  testWidgets('bomba: etkisiz kıl, geri koy (yer düğmeleri ve kaydırıcı)', (tester) async {
    final acted = <Json>[];
    var x = load('bomb-mine');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('Bomba çektin!'), findsOneWidget);
    await tester.tap(find.textContaining('Etkisiz Kıl’ı oyna'));
    await tester.pump();
    expect(acted.last, {'type': 'defuse'});

    x = load('place-mine');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('Bombayı nereye koyacaksın?'), findsOneWidget);
    expect(find.byType(Slider), findsOneWidget);
    expect(find.textContaining('Rastgele koy'), findsOneWidget);
    await tester.tap(find.text('En alta'));
    await tester.pump();
    await tester.tap(find.textContaining('En alta koy'));
    await tester.pump();
    expect(acted.last, {'type': 'place', 'index': 5});
    await tester.tap(find.text('Üstten 2.'));
    await tester.pump();
    await tester.tap(find.textContaining('Üstten 2. koy'));
    await tester.pump();
    expect(acted.last, {'type': 'place', 'index': 1});

    x = load('place-short');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.byType(Slider), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Geleceği Gör: kapat ve yeniden aç', (tester) async {
    final x = load('peek');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me)));
    expect(find.text('Destenin üstü'), findsOneWidget);
    expect(find.text('Sıradaki'), findsOneWidget);
    await tester.tap(find.text('Tamam'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Destenin üstü'), findsNothing);
    await tester.tap(find.text('Gördüğün kartlar'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Destenin üstü'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('patlama anı yalnızca yeni olayda çıkar; dokununca kapanır', (tester) async {
    final a = load('before-boom');
    final b = load('boom');
    final seq = await pumpSequence(tester, a.f, a.room, a.me);
    expect(find.text('cem patladı!'), findsNothing);
    seq.value = b.f;
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));
    expect(find.text('cem patladı!'), findsOneWidget);
    expect(find.text('Elindeki kartlar ıskartaya gitti.'), findsOneWidget);
    await tester.tap(find.text('cem patladı!'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('cem patladı!'), findsNothing);

    // Patlayanın kendi ekranı: "Patladın!" ve izleyici notu; 2.8 sn sonra kendiliğinden kapanır.
    final c = load('before-boom-dead');
    final d = load('boom-dead');
    final seq2 = await pumpSequence(tester, c.f, c.room, c.me);
    seq2.value = d.f;
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));
    expect(find.text('Patladın!'), findsOneWidget);
    expect(find.text('Oyunda değilsin; izliyorsun.'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 2200));
    expect(find.text('Patladın!'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('etkisiz kılma bildirimi 1.6 sn görünür', (tester) async {
    final a = load('bomb-other');
    final b = load('place-other');
    final seq = await pumpSequence(tester, a.f, a.room, a.me);
    expect(find.text('ali bomba çekti!'), findsWidgets);
    seq.value = b.f;
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('ali bombayı etkisiz kıldı'), findsOneWidget);
    expect(find.text('ali bombayı gizlice desteye geri koyuyor.'), findsWidgets);
    await tester.pump(const Duration(milliseconds: 1400));
    expect(find.text('ali bombayı etkisiz kıldı'), findsNothing);
    expect(find.text('ali bombayı gizlice desteye geri koyuyor.'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('oda sahibi kopan oyuncunun yerine çeker; ıskartadan seçim', (tester) async {
    final acted = <Json>[];
    var x = load('host-skip');
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    await tapOn(tester, find.text('ayse yerine kart çek'));
    await tester.pump();
    expect(acted.last, {'type': 'skipTurn'});

    x = load('pick-mine');
    final view = KittenView.fromJson(x.f.view);
    await pumpGame(tester, module.playView(playProps(x.f, x.room, x.me, acted: acted)));
    expect(find.text('Iskartadan bir kart al'), findsOneWidget);
    await tapOn(tester, find.bySemanticsLabel('Etkisiz Kıl').first);
    await tester.pump();
    expect(acted.last['type'], 'pick');
    expect(view.discardPick!.map((c) => c.id), contains(acted.last['cardId']));
  });

  testWidgets('ayar paneli (oda sahibi, misafir, oyun içi)', (tester) async {
    final x = load('play-host');
    await pumpGame(tester, module.settingsPanel(settingsProps(x.f.settings, x.room, 'ali')));
    expect(find.text('Hayır süresi'), findsOneWidget);
    expect(find.text('3 kişi: tek deste, desteye 2 bomba girer. 6–10 kişide otomatik olarak iki deste kullanılır.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(x.f.settings, x.room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Hayır süresi'), findsNothing);
    final big = load('host-skip');
    await pumpGame(tester, module.settingsPanel(settingsProps(big.f.settings, big.room, 'cem', editable: false)));
    expect(find.text('6 kişi: iki deste birleştirilir, desteye 5 bomba girer.'), findsOneWidget);
    expect(find.text('Kapalı'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
