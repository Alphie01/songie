import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/detective/models.dart';
import 'package:songie_core/games/detective/module.dart';
import 'package:songie_core/games/kit/game_module.dart';
import 'package:songie_core/session/api.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

/// `apps/server/scripts/mobile-fixtures/detective.ts`: dosya adının son parçası görünümün sahibidir.
String _owner(String name) => name.split('-').last;

Json _extra(String name) => asJson(jsonDecode(File('test/fixtures/detective/extra/$name.json').readAsStringSync()));

/// Kayıtlı sunucu cevaplarıyla aksiyon: `doc` → belge, `notebook` → sürüm, diğerleri `{ok: true}`.
Future<Ack> Function(Json) _actor(List<Json> acted) {
  final docs = _extra('docs');
  final acks = _extra('acks');
  return (a) async {
    acted.add(a);
    switch (a['type']) {
      case 'doc':
        return Ack(asJson(docs[a['evidenceId']] ?? {'ok': false, 'error': 'Bu belge henüz dosyada değil.'}));
      case 'notebook':
        return Ack(acks.obj('notebook'));
      case 'confront':
        return Ack(acks.obj('confrontHit'));
      default:
        return const Ack({'ok': true});
    }
  };
}

PlayViewProps _props(Fixture f, RoomState room, String me, List<Json> acted) => PlayViewProps(
  view: f.view,
  meId: me,
  room: room,
  act: _actor(acted),
  api: GameApi(Api(() => null), 'detective'),
  settings: f.settings,
  setSettings: (_) async {},
);

class _FakeApi extends Api {
  _FakeApi(this.data) : super(() => null);
  final Json data;
  @override
  Future<Json> get(String path) async => data;
}

/// Yeni ekran: önceki ağacı atar (aynı türde widget'lar durumunu taşımasın).
Future<void> _pumpFresh(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(const SizedBox());
  await pumpGame(tester, child);
}

Future<void> _tapText(WidgetTester tester, String text, {bool last = false}) async {
  final f = last ? find.text(text).last : find.text(text).first;
  await tester.ensureVisible(f);
  await tester.pump();
  await tester.tap(f, warnIfMissed: false);
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  final room = fakeRoom(['ali', 'ayse', 'cem'], gameId: 'detective');
  const module = DetectiveModule();

  for (final name in Fixture.names('detective')) {
    testWidgets('görünüm: $name', (tester) async {
      final f = Fixture.load('detective', name);
      final view = DetectiveView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      final players = name.startsWith('solo') ? fakeRoom(['ali'], gameId: 'detective') : room;
      await pumpGame(tester, module.playView(_props(f, players, _owner(name), [])));
      expect(tester.takeException(), isNull);
      expect(find.text(view.caseInfo.title), findsWidgets);
    });
  }

  testWidgets('sekmeler ve pano etkileşimi', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load('detective', 'investigate-rich-ali');
    await pumpGame(tester, module.playView(_props(f, room, 'ali', acted)));
    for (final tab in ['Pano', 'Sorgular', 'İzler', 'Notlar', 'Kanıtlar']) {
      await tester.tap(find.text(tab).last);
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull, reason: tab);
    }
    // Pano: şüpheli kartını aç, işaretle
    await tester.tap(find.text('Pano').last);
    await tester.pump(const Duration(milliseconds: 300));
    await _tapText(tester, 'Kerem Yalçın');
    await tester.pump(const Duration(milliseconds: 300));
    await _tapText(tester, 'Temiz', last: true);
    expect(acted.any((a) => a['type'] == 'mark' && a['characterId'] == 'kerem'), isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('her belge türü açılır (15 tür) ve yakınlaştırılır', (tester) async {
    final docs = _extra('docs');
    final f = Fixture.load('detective', 'act3-over-ali');
    final view = DetectiveView.fromJson(f.view);
    final kinds = <String>{};
    for (final e in view.evidence) {
      final acted = <Json>[];
      await _pumpFresh(tester, module.playView(_props(f, room, 'ali', acted)));
      await _tapText(tester, e.title);
      await tester.pump(const Duration(milliseconds: 300));
      expect(acted.any((a) => a['type'] == 'doc' && a['evidenceId'] == e.id), isTrue, reason: e.id);
      expect(tester.takeException(), isNull, reason: e.id);
      expect(find.text('Dolaba dön'), findsOneWidget, reason: e.id);
      // %200'e kadar büyüt
      for (var i = 0; i < 3; i++) {
        await tester.ensureVisible(find.text('+'));
        await tester.tap(find.text('+'), warnIfMissed: false);
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(tester.takeException(), isNull, reason: '${e.id} zoom');
      kinds.add(asJson(docs[e.id]).obj('doc').str('kind'));
    }
    expect(kinds.length, 15);
  });

  testWidgets('not defteri 800 ms sonra kaydeder', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load('detective', 'investigate-ali');
    await pumpGame(tester, module.playView(_props(f, room, 'ali', acted)));
    await tester.tap(find.text('Notlar').last);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.enterText(find.byType(TextField).first, 'Kerem saat 19 diyor');
    await tester.pump(const Duration(milliseconds: 900));
    await tester.pump(const Duration(milliseconds: 100));
    expect(acted.where((a) => a['type'] == 'notebook').map((a) => a['text']), contains('Kerem saat 19 diyor'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('iz önerme, oylama ve sahne', (tester) async {
    final acted = <Json>[];
    var f = Fixture.load('detective', 'investigate-cem');
    await pumpGame(tester, module.playView(_props(f, room, 'cem', acted)));
    await tester.tap(find.text('İzler').last);
    await tester.pump(const Duration(milliseconds: 300));
    await _tapText(tester, 'Bu izi öner');
    expect(acted.any((a) => a['type'] == 'propose'), isTrue);

    f = Fixture.load('detective', 'proposal-cem');
    await _pumpFresh(tester, module.playView(_props(f, room, 'cem', acted)));
    await tester.tap(find.text('İzler').last);
    await tester.pump(const Duration(milliseconds: 300));
    await _tapText(tester, 'Evet');
    expect(acted.any((a) => a['type'] == 'vote' && a['yes'] == true), isTrue);

    f = Fixture.load('detective', 'scene-ali');
    await _pumpFresh(tester, module.playView(_props(f, room, 'ali', acted)));
    expect(find.text('Anlatıcıyı dinle'), findsOneWidget);
    await _tapText(tester, 'Anlatıcıyı dinle');
    await _tapText(tester, 'Okudum, devam');
    expect(acted.any((a) => a['type'] == 'continue'), isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('suçlama: dosyaya göz atıp forma dönülür', (tester) async {
    final acted = <Json>[];
    final f = Fixture.load('detective', 'accuse-cem');
    await pumpGame(tester, module.playView(_props(f, room, 'cem', acted)));
    expect(find.text('Suçlama formu'), findsOneWidget);
    await _tapText(tester, 'Dosyayı incele');
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Forma dön'), findsOneWidget);
    await _tapText(tester, 'Forma dön');
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Suçlama formu'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ayar paneli: vaka rafı (oda sahibi), salt okunur (misafir), ikincil', (tester) async {
    final f = Fixture.load('detective', 'investigate-ali');
    final cases = _extra('cases');
    Json? changed;
    SettingsPanelProps props(String me, {String? section, bool editable = true}) => SettingsPanelProps(
      settings: f.settings,
      editable: editable,
      onChange: (n) => changed = n,
      api: GameApi(_FakeApi(cases), 'detective'),
      players: room.players,
      meId: me,
      section: section,
    );
    await pumpGame(tester, module.settingsPanel(props('ali')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Vaka rafı'), findsOneWidget);
    expect(find.text('Devam eden dosyalar'), findsOneWidget);
    expect(find.text('İzlere kim karar verir'), findsOneWidget);
    final first = CasesResponse.fromJson(cases).cases.first;
    await _tapText(tester, first.title);
    expect(changed?['caseSlug'], first.slug);
    expect(tester.takeException(), isNull);

    await _pumpFresh(tester, module.settingsPanel(props('cem', section: 'primary', editable: false)));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Vakayı ve kuralları oda sahibi seçer.'), findsOneWidget);
    await _pumpFresh(tester, module.settingsPanel(props('cem', section: 'secondary', editable: false)));
    expect(find.text('Amirden ipucu'), findsWidgets);
    expect(tester.takeException(), isNull);

    // Liste alınamazsa hata metni
    await _pumpFresh(tester, module.settingsPanel(SettingsPanelProps(
      settings: f.settings,
      editable: true,
      onChange: (_) {},
      api: GameApi(Api(() => null), 'detective'),
      players: room.players,
      meId: 'ali',
    )));
    await tester.pump(const Duration(seconds: 1));
    expect(tester.takeException(), isNull);
  });
}
