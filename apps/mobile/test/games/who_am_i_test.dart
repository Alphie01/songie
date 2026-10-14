// Dosya adı oyun kimliğini (`who-am-i`) izler.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie/games/who-am-i/models.dart';
import 'package:songie/games/who-am-i/module.dart';
import 'package:songie/games/kit/game_module.dart';
import 'package:songie/session/api.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

const _game = 'who-am-i';

/// Fikstürün sahibi (`apps/server/scripts/mobile-fixtures/who-am-i.ts` yazar).
String _me(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync())).str('me', 'ali');

RoomState _room({Set<String> offline = const {}}) {
  final base = fakeRoom(['ali', 'ayse', 'cem', 'deniz'], gameId: _game);
  return RoomState(
    code: base.code,
    hostId: base.hostId,
    gameId: base.gameId,
    settings: base.settings,
    phase: base.phase,
    players: [
      for (final p in base.players) RoomPlayer(id: p.id, nick: p.nick, avatar: p.avatar, connected: !offline.contains(p.id), ready: p.ready),
    ],
    chat: base.chat,
    lastStandings: base.lastStandings,
  );
}

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
  final room = _room();
  const module = WhoAmIModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final f = Fixture.load(_game, name);
      final view = WhoAmIView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      await pumpGame(tester, module.playView(playProps(f, room, _me(name))));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('sıra sende: yazılı soru, ipucu, tahmin', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load(_game, 'myturn-host');
    await pumpGame(tester, module.playView(playProps(f, room, 'ali', acted: acted)));
    expect(find.text('Sıra sende'), findsOneWidget);
    expect(find.text('Soruyu sordum'), findsOneWidget);
    expect(find.text('Henüz soru sorulmadı. İlk soru genelde “İnsan mıyım?” olur.'), findsOneWidget);
    expect(find.text('İpucu al (3 hak)'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'Ünlü müyüm?');
    await tester.pump();
    expect(find.text('Soruyu gönder'), findsOneWidget);
    await _tap(tester, find.text('Soruyu gönder'));
    expect(acted.last, {'type': 'ask', 'text': 'Ünlü müyüm?'});

    await tester.enterText(find.byType(TextField).last, 'Barış Manço');
    await tester.pump();
    await _tap(tester, find.text('Tahmin et').first);
    expect(acted.last, {'type': 'guess', 'text': 'Barış Manço'});

    await _tap(tester, find.text('İpucu al (3 hak)'));
    expect(acted.last, {'type': 'hint'});
    expect(tester.takeException(), isNull);
  });

  testWidgets('soru kartı: cevaplar ve oda sahibinin kapatma düğmesi', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load(_game, 'question-host');
    await pumpGame(tester, module.playView(playProps(f, room, 'ali', acted: acted)));
    expect(find.text('ayse soruyor · kartı: Kemal Sunal'), findsOneWidget);
    expect(find.text('“Erkek miyim?”'), findsOneWidget);
    expect(find.text('Gelen cevaplarla bitir'), findsOneWidget);
    // Cevap düğmesi + sayaç satırı
    expect(find.text('Alakasız'), findsNWidgets(2));
    await _tap(tester, find.text('Evet').first);
    expect(acted.last['type'], 'answer');
    expect(acted.last['answer'], 'yes');
  });

  testWidgets('sırası gelen çevrimdışıyken atla düğmesi koyu', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load(_game, 'waiting-host');
    await pumpGame(tester, module.playView(playProps(f, _room(offline: {'ayse'}), 'ali', acted: acted)));
    expect(find.text('Sırada ayse · kartı: Kemal Sunal'), findsOneWidget);
    await _tap(tester, find.text('ayse adlı oyuncuyu atla'));
    expect(acted.last, {'type': 'pass'});
    expect(tester.takeException(), isNull);
  });

  testWidgets('soru geçmişi: yalnızca benim süzgeci', (tester) async {
    final f = Fixture.load(_game, 'history-host');
    await pumpGame(tester, module.playView(playProps(f, room, 'ali')));
    expect(find.text('Cem: Tahmin: “Örümcek Adam”'), findsOneWidget);
    await _tap(tester, find.text('Yalnızca benim'));
    expect(find.text('Cem: Tahmin: “Örümcek Adam”'), findsNothing);
    expect(find.textContaining('Sen: İnsan mıyım?'), findsOneWidget);
  });

  testWidgets('oyun sonu: kazanan ve sıralama', (tester) async {
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'podium-host'), room, 'ali')));
    expect(find.text('cem kazandı!'), findsOneWidget);
    expect(find.text('SIRALAMA'), findsOneWidget);
    expect(find.text('bilemedi'), findsNWidgets(2));
    await pumpGame(tester, module.playView(playProps(Fixture.load(_game, 'podium-none'), room, 'ayse')));
    expect(find.text('Kimse bilemedi'), findsOneWidget);
  });

  testWidgets('ayar paneli (oda sahibi, misafir, oyun içi)', (tester) async {
    final f = Fixture.load(_game, 'myturn-host');
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Kimlikler nereden gelsin'), findsOneWidget);
    expect(find.text('Hayır çıkana kadar'), findsOneWidget);
    expect(find.text('Kişi başı ipucu'), findsOneWidget);
    await _tap(tester, find.text('Kendi kimliğini ekle').last);
    expect(find.text('Kimliği ekle'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Soru hakkı'), findsNothing);

    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Tahmin kontrolü'), findsOneWidget);
    expect(find.text('Kimlikler nereden gelsin'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('lobi sayfası gibi içsel yükseklikle ölçülen ayar paneli', (tester) async {
    // Oda ekranı (SPage fill) SliverFillRemaining(hasScrollBody: false) ile içeriğin içsel yüksekliğini ölçer.
    final f = Fixture.load(_game, 'myturn-host');
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
    final toggle = find.text('Kendi kimliğini ekle').last;
    await tester.ensureVisible(toggle);
    await tester.pump();
    await tester.tap(toggle);
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('sunucu hatası hamlenin altında görünür', (tester) async {
    final f = Fixture.load(_game, 'myturn-host');
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
    final button = find.text('Soruyu sordum');
    await tester.ensureVisible(button);
    await tester.pump();
    await tester.tap(button);
    await tester.pump();
    expect(find.text('Bağlantı koptu. Tekrar dene.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
