import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/kit/game_module.dart';
import 'package:songie_core/games/taboo/models.dart';
import 'package:songie_core/games/taboo/module.dart';
import 'package:songie_core/session/api.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

const _game = 'taboo';

/// Fikstürün sahibi (`apps/server/scripts/mobile-fixtures/taboo.ts` yazar).
String _me(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync())).str('me', 'ali');

Future<void> _tap(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.pump();
  await tester.tap(f);
  await tester.pump();
}

/// Uygulamanın gerçek yazı tipleri (pubspec): taşma denetimi gerçek metin genişliğiyle yapılsın.
Future<void> _loadFonts() async {
  const families = {
    'Baloo2': ['Baloo2-SemiBold', 'Baloo2-Bold', 'Baloo2-ExtraBold'],
    'Nunito': ['Nunito-Medium', 'Nunito-SemiBold', 'Nunito-Bold', 'Nunito-ExtraBold'],
  };
  for (final e in families.entries) {
    final loader = FontLoader(e.key);
    for (final f in e.value) {
      loader.addFont(Future.value(ByteData.sublistView(File('lib/fonts/$f.ttf').readAsBytesSync())));
    }
    await loader.load();
  }
}

void main() {
  setUpAll(_loadFonts);
  final room = fakeRoom(['ali', 'ayse', 'cem', 'deniz'], gameId: _game);
  const module = TabooModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final f = Fixture.load(_game, name);
      final view = TabooView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(f, room, _me(name))));
      // Olay damgası (900 ms) ve kart girişi biter.
      await tester.pump(const Duration(seconds: 1));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('hazırlık: anlatıcı başlatır', (tester) async {
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'ready-narrator-host'), room, 'ali', acted: acted)));
    expect(find.text('SIRADAKİ ANLATICI'), findsOneWidget);
    expect(find.text('Tabu · Tur 1/4'), findsOneWidget);
    expect(find.text('Yeşil takım (sen)'), findsOneWidget);
    await _tap(tester, find.text('Anlatmaya başla'));
    expect(acted.last, {'type': 'start'});
  });

  testWidgets('hazırlık: oda sahibi anlatıcı yerine başlatır, ayarları açar', (tester) async {
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'ready-host'), room, 'ali', acted: acted)));
    expect(find.text('Yeşil takım bu turda 0'), findsOneWidget);
    expect(find.text('Saat'), findsOneWidget);
    await _tap(tester, find.text('Anlatıcıyı atla'));
    expect(acted.last, {'type': 'skipNarrator'});
    await _tap(tester, find.text('cem yerine başlat'));
    expect(acted.last, {'type': 'start'});
    expect(find.text('Tur süresi'), findsNothing);
    await _tap(tester, find.text('Oyun ayarları'));
    expect(find.text('Tur süresi'), findsOneWidget);
    expect(find.text('Toplam 4 tur.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tur: anlatıcı ve rakip düğmeleri', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load(_game, 'turn-narrator-flash');
    final card = TabooView.fromJson(f.view).card!;
    await pumpGame(tester, module.playView(playProps(f, room, 'ali', acted: acted)));
    expect(find.text(card.word), findsOneWidget);
    expect(find.text('Pas (2)'), findsOneWidget);
    expect(find.text('60'), findsOneWidget);
    await _tap(tester, find.text('Doğru'));
    expect(acted.last, {'type': 'correct', 'cardId': card.id});
    await _tap(tester, find.text('Geri al'));
    expect(acted.last, {'type': 'undo'});

    final w = Fixture.load(_game, 'turn-low-watcher');
    final wCard = TabooView.fromJson(w.view).card!;
    await pumpGame(tester, module.playView(playProps(w, room, 'cem', acted: acted)));
    expect(find.text('8'), findsOneWidget);
    await _tap(tester, find.text('Tabu!'));
    expect(acted.last, {'type': 'taboo', 'cardId': wCard.id});

    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'turn-guesser-flash'), room, 'ayse')));
    expect(find.text('BU TURDA BİLİNEN'), findsOneWidget);
    expect(find.text('ali anlatıyor. Tahmin et!'), findsOneWidget);
    expect(find.text('TABU!'), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
  });

  testWidgets('oyun sonu: kazanan ve berabere', (tester) async {
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'podium-host'), room, 'ali')));
    expect(find.text('Mor takım\nkazandı!'), findsOneWidget);
    expect(find.text('YEŞİL TAKIM'), findsOneWidget);
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'podium-draw'), room, 'ayse')));
    expect(find.text('Berabere!'), findsOneWidget);
  });

  testWidgets('ayar paneli: takımlar, salt okunur, kart ekleme', (tester) async {
    final f = Fixture.load(_game, 'ready-host');
    final changes = <Json>[];
    SettingsPanelProps props(Json settings, {bool editable = true, String? section}) => SettingsPanelProps(
      settings: settings,
      editable: editable,
      onChange: changes.add,
      api: GameApi(Api(() => null), _game),
      players: room.players,
      meId: 'ali',
      section: section,
    );

    await pumpGame(tester, module.settingsPanel(props(f.settings)));
    expect(find.text('Takımlar'), findsOneWidget);
    expect(find.text('Karıştır'), findsOneWidget);
    expect(find.text('Tabu cezası'), findsOneWidget);
    // ali: yeşil → mor
    await _tap(tester, find.text('ali'));
    expect(changes.last['teams'], {
      'a': ['ayse'],
      'b': ['cem', 'deniz', 'ali'],
    });
    await _tap(tester, find.text('90 sn'));
    expect(changes.last['seconds'], 90);
    await _tap(tester, find.text('Kart ekle').last);
    expect(find.text('Kartı ekle'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // Takımı seçilmemiş oyuncular
    await pumpGame(
      tester,
      module.settingsPanel(
        props({
          ...f.settings,
          'teams': {'a': <String>[], 'b': <String>[]},
        }, section: 'primary'),
      ),
    );
    expect(find.text('Takımsız'), findsOneWidget);
    expect(find.text('Henüz kimse yok'), findsNWidgets(2));
    expect(find.text('Her takımda en az 2 kişi olmalı. ${'Bir oyuncuya dokunarak takımını değiştir. Takımı seçilmeyenler başlarken dağıtılır.'}'), findsOneWidget);

    await pumpGame(tester, module.settingsPanel(props(f.settings, editable: false)));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Karıştır'), findsNothing);
    final before = changes.length;
    await _tap(tester, find.text('cem'));
    expect(changes.length, before);
    expect(tester.takeException(), isNull);
  });

  testWidgets('lobi sayfası gibi içsel yükseklikle ölçülen ayar paneli', (tester) async {
    // Oda ekranı (SPage fill) SliverFillRemaining(hasScrollBody: false) ile içeriğin içsel yüksekliğini ölçer.
    final f = Fixture.load(_game, 'ready-host');
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomScrollView(
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
      ),
    );
    await tester.pump();
    final toggle = find.text('Kart ekle').last;
    await tester.ensureVisible(toggle);
    await tester.pump();
    await tester.tap(toggle);
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('sunucu hatası hamlenin altında görünür', (tester) async {
    final f = Fixture.load(_game, 'ready-narrator-host');
    final props = PlayViewProps(
      view: f.view,
      meId: 'ali',
      room: room,
      act: (_) async => Ack.fail('Bağlantı koptu. Tekrar dene.'),
      api: GameApi(Api(() => null), _game),
      settings: f.settings,
      setSettings: (_) async {},
    );
    await pumpGame(tester, module.playView(props));
    final button = find.text('Anlatmaya başla');
    await tester.ensureVisible(button);
    await tester.pump();
    await tester.tap(button);
    await tester.pump();
    expect(find.text('Bağlantı koptu. Tekrar dene.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
