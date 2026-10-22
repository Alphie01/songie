import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/confessions/models.dart';
import 'package:songie_core/games/confessions/module.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

const _game = 'confessions';

/// Fikstürün ham hali: `me` (görünümün sahibi) ve `players` (odadakiler, ilki oda sahibi).
Json _raw(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));

/// Bazı görünümlerde mutlaka görünmesi gereken metinler.
const _expects = <String, List<String>>{
  'write-host': ['Tur 1/2 · Yaz', 'BU TURUN KONUSU', 'İtirafı gönder', 'PUANLAR', 'NASIL OYNANIR'],
  'write-sent-host': ['İtirafı güncelle', 'İtirafın gönderildi. Süre bitene kadar değiştirebilirsin.', 'Yazmayı bitir', '✓ yazdı'],
  'write-guest': ['yazıyor', 'Kimin yazdığını açıklamaya kadar yalnızca sen bilirsin.'],
  'write-free-guest': ['SERBEST İTİRAF', 'Aklına gelen, kimsenin bilmediği bir şey yaz.', 'Süresiz', 'Bu turda yazarlar hiç açıklanmayacak.'],
  'guess-host': ['İtiraf 1/4', 'Sence kim yazdı?', 'Bu benim', 'Efsane 1', 'Tahmini bitir', 'İtirafı gizle'],
  'guess-picked-guest': ['Seçimin:', 'Süre bitene kadar değiştirebilirsin.'],
  'reveal-host': ['Yazan:', 'Bilenler:', 'Sıradaki itiraf'],
  'reveal-hit-guest': ['Bildin!'],
  'reveal-miss-guest': ['Bilemedin.'],
  'reveal-author': ['Yazan: Sen', 'kişiyi yanılttın.'],
  'reveal-hidden-text-guest': ['Bu itiraf oda sahibi tarafından gizlendi.'],
  'reveal-anon-guest': ['Yazar gizli kalıyor', 'Kime kaç oy'],
  'summary-host': ['Tur 1 bitti', 'Sonraki tura geç'],
  'summary-guest': ['Sonraki tur birazdan başlıyor.'],
  'summary-last-guest': ['Podyum birazdan.'],
  'podium-host': ['OYUN BİTTİ', 'EN İYİ DEDEKTİF', 'EN İYİ YANILTICI', 'Lobiye dönülüyor…'],
  'podium-anon-guest': ['Sırlar sırrınız olarak kaldı'],
};

void main() {
  const module = ConfessionsModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final raw = _raw(name);
      final f = Fixture.load(_game, name);
      final view = ConfessionsView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      final room = fakeRoom(raw.strs('players'), gameId: _game);
      await pumpGame(tester, module.playView(playProps(f, room, raw.str('me'))));
      expect(tester.takeException(), isNull);
      for (final text in _expects[name] ?? const <String>[]) {
        expect(find.textContaining(text, findRichText: true), findsWidgets, reason: '$name: "$text"');
      }
    });
  }

  testWidgets('itiraf yazıp gönderince aksiyon gider', (tester) async {
    final raw = _raw('write-guest');
    final f = Fixture.load(_game, 'write-guest');
    final room = fakeRoom(raw.strs('players'), gameId: _game);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, room, raw.str('me'), acted: acted)));
    await tester.enterText(find.byType(EditableText).first, 'Hiç kimseye söylemediğim bir sırrım var');
    await tester.pump();
    expect(find.text('39/240'), findsOneWidget);
    await tester.tap(find.text('İtirafı gönder'));
    await tester.pump();
    expect(acted.single, containsPair('type', 'write'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final f = Fixture.load(_game, 'write-host');
    final room = fakeRoom(['ali', 'ayse', 'cem'], gameId: _game);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Ne itiraf edilsin'), findsOneWidget);
    expect(find.text('Yazar açıklanmasın'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Konu ekle').last);
    await tester.pump();
    expect(find.text('Konuyu ekle'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Tahmin süresi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
