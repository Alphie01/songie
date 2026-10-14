import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/frequency/models.dart';
import 'package:songie/games/frequency/module.dart';
import 'package:songie/games/kit/game_module.dart';
import 'package:songie/session/api.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

/// Uygulamanın yazı tipleri (Baloo 2, Nunito): ölçüler cihazdakiyle aynı olsun.
Future<void> _loadFonts() async {
  const fonts = {
    'Baloo2': ['Baloo2-SemiBold.ttf', 'Baloo2-Bold.ttf', 'Baloo2-ExtraBold.ttf'],
    'Nunito': ['Nunito-Medium.ttf', 'Nunito-SemiBold.ttf', 'Nunito-Bold.ttf', 'Nunito-ExtraBold.ttf'],
  };
  for (final e in fonts.entries) {
    final loader = FontLoader(e.key);
    for (final file in e.value) {
      loader.addFont(Future.value(ByteData.sublistView(File('assets/fonts/$file').readAsBytesSync())));
    }
    await loader.load();
  }
}

/// Fikstürdeki oyuncularla oda; [host] oda sahibi, [offline] bağlantısı kopanlar.
RoomState _room(List<String> ids, {required String host, List<String> offline = const []}) {
  final base = fakeRoom(ids, gameId: 'frequency');
  return RoomState(
    code: base.code,
    hostId: host,
    gameId: base.gameId,
    settings: null,
    phase: 'playing',
    players: [for (final p in base.players) RoomPlayer(id: p.id, nick: p.nick, avatar: p.avatar, connected: !offline.contains(p.id), ready: false)],
    chat: const [],
    lastStandings: null,
  );
}

/// Fikstürün `me`, `host`, `players`, `offline` alanları.
Json _meta(String name) => asJson(jsonDecode(File('test/fixtures/frequency/$name.json').readAsStringSync()));

/// Fikstürü kendi oyuncusunun gözünden çizer; yapılan hamleleri [acted]'e yazar.
Future<FrequencyView> _pump(WidgetTester tester, String name, {List<Json>? acted, String? host}) async {
  final f = Fixture.load('frequency', name);
  final meta = _meta(name);
  final room = _room(meta.strs('players'), host: host ?? meta.str('host'), offline: meta.strs('offline'));
  await pumpGame(tester, const FrequencyModule().playView(playProps(f, room, meta.str('me'), acted: acted)));
  return FrequencyView.fromJson(f.view);
}

void main() {
  const module = FrequencyModule();
  final api = GameApi(Api(() => null), 'frequency');
  setUpAll(_loadFonts);

  for (final name in Fixture.names('frequency')) {
    testWidgets('görünüm: $name', (tester) async {
      final meta = _meta(name);
      final me = meta.str('me');
      final ids = meta.strs('players');
      // Hem oda sahibi hem misafir olarak çiz.
      for (final host in {me, ids.firstWhere((id) => id != me)}) {
        final view = await _pump(tester, name, host: host);
        expect(tester.takeException(), isNull);
        expect(find.textContaining(view.phase == 'podium' ? 'Lobiye dönülüyor' : 'Frekans · Tur'), findsOneWidget);
        // Perde ve sonuç animasyonları bitsin.
        await tester.pump(const Duration(seconds: 2));
        expect(tester.takeException(), isNull);
      }
    });
  }

  testWidgets('kadranı sürüklemek hamle gönderir, sayfayı kaydırmaz', (tester) async {
    final acted = <Json>[];
    final view = await _pump(tester, 'dial-dialer', acted: acted);
    final scroll = tester.state<ScrollableState>(find.byType(Scrollable).first).position;
    final face = find.byType(AspectRatio).first;
    final center = tester.getCenter(face);
    final gesture = await tester.startGesture(center + const Offset(-100, 0));
    await tester.pump(const Duration(milliseconds: 20));
    await gesture.moveBy(const Offset(0, -60));
    await tester.pump(const Duration(milliseconds: 20));
    await gesture.moveBy(const Offset(200, 60));
    await tester.pump(const Duration(milliseconds: 100));
    await gesture.up();
    await tester.pump(const Duration(milliseconds: 100));
    expect(scroll.pixels, 0);
    final dials = acted.where((a) => a['type'] == 'dial').toList();
    expect(dials.length, greaterThanOrEqualTo(2));
    expect(dials.every((a) => a['round'] == view.roundId), isTrue);
    expect(dials.first['value'] as double, lessThan(30));
    expect(dials.last['value'] as double, greaterThan(70));

    // Kadranın dışında sürüklemek sayfayı kaydırır.
    await tester.drag(find.textContaining('Frekans · Tur'), const Offset(0, -200));
    await tester.pump();
    expect(scroll.pixels, greaterThan(0));
  });

  testWidgets('kaydırıcı ve kilit düğmesi', (tester) async {
    final acted = <Json>[];
    final view = await _pump(tester, 'dial-dialer', acted: acted);
    await tester.tap(find.byType(Slider));
    await tester.pump(const Duration(milliseconds: 100));
    expect(acted.where((a) => a['type'] == 'dial'), isNotEmpty);
    await tester.ensureVisible(find.text('Kadranı kilitle'));
    await tester.tap(find.text('Kadranı kilitle'));
    await tester.pump();
    expect(acted.last, {'type': 'lock', 'round': view.roundId});
  });

  testWidgets('çoğunluk: onaylayan geri alabilir, diğeri onaylar', (tester) async {
    final acted = <Json>[];
    var view = await _pump(tester, 'dial-majority-voted', acted: acted);
    expect(find.textContaining('Onayladın. 1 onay daha gerekiyor'), findsOneWidget);
    await tester.ensureVisible(find.text('Onayımı geri al'));
    await tester.tap(find.text('Onayımı geri al'));
    await tester.pump();
    expect(acted.last, {'type': 'unlock', 'round': view.roundId});
    view = await _pump(tester, 'dial-majority-other', acted: acted);
    expect(find.text('Kilidi onayla (1/2)'), findsOneWidget);
  });

  testWidgets('medyum kart seçer ve ipucu verir', (tester) async {
    final acted = <Json>[];
    var view = await _pump(tester, 'pick-psychic', acted: acted);
    final card = view.options!.first;
    await tester.tap(find.text('← ${card.left}').last);
    await tester.pump();
    expect(acted.last, {'type': 'pick', 'round': view.roundId, 'cardId': card.id});

    view = await _pump(tester, 'clue-psychic', acted: acted);
    await tester.enterText(find.byType(TextField), 'Ilık süt');
    await tester.ensureVisible(find.text('İpucunu verdim'));
    await tester.tap(find.text('İpucunu verdim'));
    await tester.pump();
    expect(acted.last, {'type': 'clue', 'round': view.roundId, 'text': 'Ilık süt'});
  });

  testWidgets('rakip sağ-sol tahmini; oda sahibi kopan medyumu atlar', (tester) async {
    final acted = <Json>[];
    var view = await _pump(tester, 'side-opponent', acted: acted);
    await tester.ensureVisible(find.text('← Solunda'));
    await tester.tap(find.text('← Solunda'));
    await tester.pump();
    expect(acted.last, {'type': 'side', 'round': view.roundId, 'side': 'left'});

    view = await _pump(tester, 'side-psychic-offline-host', acted: acted);
    expect(find.text('bağlı değil'), findsOneWidget);
    await tester.ensureVisible(find.text('Medyumu atla'));
    await tester.tap(find.text('Medyumu atla'));
    await tester.pump();
    expect(acted.last, {'type': 'skipPsychic', 'round': view.roundId});
    await _pump(tester, 'pick-psychic-offline-guest');
    expect(find.text('Medyumu atla'), findsNothing);
  });

  testWidgets('açıklama: puan, tahmin sonucu ve sıradaki tur', (tester) async {
    final acted = <Json>[];
    final view = await _pump(tester, 'reveal-guest', acted: acted);
    await tester.pump(const Duration(seconds: 2));
    // Puan hapı ve önceki turlar listesi.
    expect(find.text('+3 puan'), findsNWidgets(2));
    expect(find.text('Mor takım “Solunda” dedi: +1 puan.'), findsOneWidget);
    await tester.ensureVisible(find.text('Sıradaki tura geç'));
    await tester.tap(find.text('Sıradaki tura geç'));
    await tester.pump();
    expect(acted.last, {'type': 'next', 'round': view.roundId});
    await _pump(tester, 'reveal-again');
    await tester.pump(const Duration(seconds: 2));
    expect(find.text('Yetişme kuralı: Yeşil takım bir tur daha oynuyor.'), findsOneWidget);
    expect(find.text('Tam isabet'), findsOneWidget);
  });

  testWidgets('sonuç ekranı: kazanan, berabere, birlikte', (tester) async {
    await _pump(tester, 'podium-winner-guest');
    expect(find.text('Yeşil takım\nkazandı!'), findsOneWidget);
    await _pump(tester, 'podium-draw');
    expect(find.text('Berabere'), findsOneWidget);
    await _pump(tester, 'coop-podium');
    expect(find.text('3 turda 7 ortak puan'), findsOneWidget);
    expect(find.text('Aynı kanaldasınız'), findsOneWidget);
  });

  testWidgets('ayar paneli: oda sahibi, misafir, birlikte modu, kart ekleme', (tester) async {
    final room = _room(['ali', 'ayse', 'cem', 'deniz', 'ece'], host: 'ali', offline: ['ece']);
    var settings = <String, dynamic>{
      'mode': 'teams',
      'teams': {
        'a': ['ali', 'ayse'],
        'b': ['cem'],
      },
      'targetScore': 15,
      'rounds': 7,
      'seconds': 60,
      'cardChoice': true,
      'majorityLock': false,
      'catchUp': true,
      'friendCards': false,
    };
    final changes = <Json>[];
    SettingsPanelProps props({required bool editable, String? section}) =>
        SettingsPanelProps(settings: settings, editable: editable, onChange: changes.add, api: api, players: room.players, meId: 'ali', section: section);

    await pumpGame(tester, module.settingsPanel(props(editable: true)));
    expect(tester.takeException(), isNull);
    expect(find.text('Karıştır'), findsOneWidget);
    expect(find.text('Takımsız'), findsOneWidget);
    expect(find.textContaining('Her takımda en az 2 kişi olmalı.'), findsOneWidget);
    await tester.tap(find.text('deniz'));
    await tester.pump();
    expect(changes.last['teams'], {
      'a': ['ali', 'ayse', 'deniz'],
      'b': ['cem'],
    });
    await tester.ensureVisible(find.text('Kilit için çoğunluk'));
    await tester.tap(find.text('Kapalı').first);
    await tester.pump();
    expect(changes.last['majorityLock'], isTrue);
    expect(changes.last['mode'], 'teams');

    await tester.ensureVisible(find.text('Spektrum kartı ekle').last);
    await tester.tap(find.text('Spektrum kartı ekle').last);
    await tester.pump();
    expect(find.text('Kartı ekle'), findsOneWidget);

    settings = {...settings, 'mode': 'coop'};
    await pumpGame(tester, module.settingsPanel(props(editable: false, section: 'primary')));
    expect(tester.takeException(), isNull);
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Takımlar'), findsNothing);
    expect(find.text('Tur sayısı'), findsOneWidget);
    final before = changes.length;
    await tester.tap(find.text('13'));
    await tester.pump();
    expect(changes.length, before);

    await pumpGame(tester, module.settingsPanel(props(editable: false, section: 'secondary')));
    expect(tester.takeException(), isNull);
    expect(find.text('Kadran süresi'), findsOneWidget);
    expect(find.text('Nasıl oynanacak'), findsNothing);
  });

  testWidgets('ayar paneli lobideki gibi (SliverFillRemaining içinde) çizilir', (tester) async {
    final f = Fixture.load('frequency', 'pick-psychic');
    final room = _room(['ali', 'ayse', 'cem', 'deniz', 'ece'], host: 'ali');
    await pumpGame(
      tester,
      SizedBox(
        height: 800,
        child: CustomScrollView(
          slivers: [
            SliverFillRemaining(
              hasScrollBody: false,
              child: Column(
                children: [
                  module.settingsPanel(settingsProps(f.settings, room, 'ali', section: 'primary')),
                  module.settingsPanel(settingsProps(f.settings, room, 'ali', section: 'secondary')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    expect(tester.takeException(), isNull);
  });

  test('puan bantları sunucuyla aynı', () {
    expect(bands.map((b) => b.maxDistance), [2, 6, 10]);
    expect(scoreFor(50, 50), 4);
    expect(scoreFor(52, 50), 4);
    expect(scoreFor(47.9, 50), 3);
    expect(scoreFor(56, 50), 3);
    expect(scoreFor(56.1, 50), 2);
    expect(scoreFor(39.9, 50), 0);
    expect(sideOf(50, 40), 'left');
    expect(sideOf(50, 60), 'right');
    expect(sideOf(50, 50), isNull);
    expect(ratingFor(7, 3), 2);
  });
}
