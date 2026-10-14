import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/charades/models.dart';
import 'package:songie/games/charades/module.dart';
import 'package:songie/games/kit/game_module.dart';
import 'package:songie/session/api.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

const _game = 'charades';

/// Fikstürün sahibi (`apps/server/scripts/mobile-fixtures/charades.ts` yazar).
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
      loader.addFont(Future.value(ByteData.sublistView(File('assets/fonts/$f.ttf').readAsBytesSync())));
    }
    await loader.load();
  }
}

void main() {
  setUpAll(_loadFonts);
  final room = fakeRoom(['ali', 'ayse', 'cem', 'deniz'], gameId: _game);
  const module = CharadesModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final f = Fixture.load(_game, name);
      final view = CharadesView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(f, room, _me(name))));
      // Olay etiketleri (1400 ms) ve kart girişi biter.
      await tester.pump(const Duration(milliseconds: 1500));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('hazırlık: anlatıcı başlatır, oda sahibi yerine başlatır', (tester) async {
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'ready-narrator-host'), room, 'ali', acted: acted)));
    // Sıradaki anlatıcı kartı ve takım listesi
    expect(find.text('ali (sen)'), findsNWidgets(2));
    expect(find.text('Sessiz Sinema · Tur 1/4'), findsOneWidget);
    await _tap(tester, find.text('Anlatmaya başla'));
    expect(acted.last, {'type': 'start'});

    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'ready-host'), room, 'ali', acted: acted)));
    expect(find.text('Yeşil takım bu turda 0'), findsOneWidget);
    await _tap(tester, find.text('cem yerine başlat'));
    expect(acted.last, {'type': 'start'});
    await _tap(tester, find.text('Anlatıcıyı atla'));
    expect(acted.last, {'type': 'skipNarrator'});
    // Oyun içi ayarlar ve nasıl oynanır herkese açık
    expect(find.text('Tur süresi'), findsOneWidget);
    expect(find.text('Klasik işaretler'), findsOneWidget);
  });

  testWidgets('tur: anlatıcı kartı, işaretler, düğmeler', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load(_game, 'turn-narrator-host');
    final card = CharadesView.fromJson(f.view).card!;
    await pumpGame(tester, module.playView(playProps(f, room, 'ali', acted: acted)));
    expect(find.text('Sen anlatıyorsun · konuşmak yok!'), findsOneWidget);
    expect(find.text('${card.words} kelime'), findsOneWidget);
    expect(find.text('İşaret: eski kamera kolu çevir'), findsOneWidget);
    await _tap(tester, find.text('Hece: kola dokun'));
    expect(acted.last, {'type': 'sign', 'sign': 'hece'});
    // İlk "Doğru" sayaç etiketi, sonuncusu düğme
    await _tap(tester, find.text('Doğru').last);
    expect(acted.last, {'type': 'correct', 'cardId': card.id});
    await _tap(tester, find.text('Pas (1)'));
    expect(acted.last, {'type': 'pass', 'cardId': card.id});

    final w = Fixture.load(_game, 'turn-watcher-flash');
    final wCard = CharadesView.fromJson(w.view).card!;
    await pumpGame(tester, module.playView(playProps(w, room, 'cem', acted: acted)));
    expect(find.text('Konuştu!'), findsNWidgets(2));
    await _tap(tester, find.text('Konuştu!').last);
    expect(acted.last, {'type': 'foul', 'cardId': wCard.id});
    await tester.pump(const Duration(milliseconds: 1500));

    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'turn-guesser-sign'), room, 'ayse')));
    expect(find.text('Tür: Film'), findsOneWidget);
    expect(find.text('BU TURDA BİLİNEN'), findsOneWidget);
    expect(find.text('ali anlatıyor, tahmin et!'), findsOneWidget);
  });

  testWidgets('oyun sonu: kazanan ve berabere', (tester) async {
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'podium-host'), room, 'ali')));
    expect(find.text('Mor takım\nkazandı!'), findsOneWidget);
    expect(find.text('OYUN BİTTİ'), findsOneWidget);
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'podium-draw'), room, 'ayse')));
    expect(find.text('Berabere'), findsOneWidget);
  });

  testWidgets('ayar paneli: takımlar, zorluk, salt okunur, başlık ekleme', (tester) async {
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
    expect(find.text('Zorluk'), findsOneWidget);
    expect(find.text('Kolay ve zor başlıklar karışık gelir.'), findsOneWidget);
    expect(find.text('180 sn'), findsOneWidget);
    await _tap(tester, find.text('cem'));
    expect(changes.last['teams'], {
      'a': ['ali', 'ayse'],
      'b': ['deniz'],
    });
    await _tap(tester, find.text('Zor'));
    expect(changes.last['difficulty'], 'zor');
    await _tap(tester, find.text('Başlık ekle').last);
    expect(find.text('Başlığı ekle'), findsOneWidget);
    expect(find.text('Deyim'), findsOneWidget);
    expect(tester.takeException(), isNull);

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

    await pumpGame(tester, module.settingsPanel(props(f.settings, editable: false)));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Karıştır'), findsNothing);
    final before = changes.length;
    await _tap(tester, find.text('Kolay'));
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
    final toggle = find.text('Başlık ekle').last;
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
