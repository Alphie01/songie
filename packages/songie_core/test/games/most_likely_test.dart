import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/most-likely/models.dart';
import 'package:songie_core/games/most-likely/module.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

const _game = 'most-likely';

/// Fikstürün ham hali: `me` (görünümün sahibi) ve `players` (odadakiler, ilki oda sahibi).
Json _raw(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));

/// Bazı görünümlerde mutlaka görünmesi gereken metinler.
const _expects = <String, List<String>>{
  'vote-host': ['Soruyu atla', 'Sonuçları şimdi aç', 'Aramızdaki en…', 'Oyum', 'Tahminim'],
  'vote-voted-host': ['Oyun · Tahminin'],
  'vote-guest': ['Oyum', 'Oyuncular', 'Unvan geçmişi', 'Oyun ayarları'],
  'vote-untimed-guest': ['Bir oyuncuya dokunarak oy ver. Sonuçlar açılana kadar değiştirebilirsin.'],
  'reveal-host': ['UNVAN SAHİBİ', 'Sıradaki soru'],
  'reveal-guest': ['Oda sahibi sıradaki soruya geçecek.'],
  'reveal-tie-final-host': ['BERABERLİK, UNVAN PAYLAŞILDI', 'Sonuçları gör'],
  'reveal-novotes-host': ['Kimse oy vermedi, bu unvan boşta kaldı.'],
  'podium-host': ['OYUN BİTTİ', 'UNVANLAR', 'Lobiye dönülüyor…'],
  'podium-empty-guest': ['Bu oyunda unvan dağıtılmadı'],
};

void main() {
  const module = MostLikelyModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final raw = _raw(name);
      final f = Fixture.load(_game, name);
      final view = MostLikelyView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      final room = fakeRoom(raw.strs('players'), gameId: _game);
      await pumpGame(tester, module.playView(playProps(f, room, raw.str('me'))));
      expect(tester.takeException(), isNull);
      for (final text in _expects[name] ?? const <String>[]) {
        expect(find.textContaining(text, findRichText: true), findsWidgets, reason: '$name: "$text"');
      }
    });
  }

  testWidgets('oy verince aksiyon gider', (tester) async {
    final raw = _raw('vote-guest');
    final f = Fixture.load(_game, 'vote-guest');
    final room = fakeRoom(raw.strs('players'), gameId: _game);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, room, 'cem', acted: acted)));
    await tester.tap(find.text('ali').first);
    await tester.pump();
    expect(acted.single, containsPair('type', 'vote'));
    expect(acted.single, containsPair('target', 'ali'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final f = Fixture.load(_game, 'vote-host');
    final room = fakeRoom(['ali', 'ayse', 'cem'], gameId: _game);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Kendine oy'), findsOneWidget);
    expect(find.text('Soru sayısı'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Soru ekle').last);
    await tester.pump();
    expect(find.text('Aramızdaki en'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Oy süresi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
