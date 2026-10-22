import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/agents/models.dart';
import 'package:songie_core/games/agents/module.dart';
import 'package:songie_core/games/agents/strings.dart';
import 'package:songie_core/games/kit/game_module.dart';
import 'package:songie_core/session/api.dart';
import 'package:songie_core/shared/models.dart';
import 'package:songie_core/shared/text.dart';

import '../helpers.dart';

/// Fikstürdeki oyuncularla oda; [host] oda sahibi, [offline] bağlantısı kopanlar.
RoomState _room(List<String> ids, {required String host, List<String> offline = const []}) {
  final base = fakeRoom(ids, gameId: 'agents');
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

/// Uygulamanın yazı tipleri (Baloo 2, Nunito): ölçüler cihazdakiyle aynı olsun.
Future<void> _loadFonts() async {
  const fonts = {
    'Baloo2': ['Baloo2-SemiBold.ttf', 'Baloo2-Bold.ttf', 'Baloo2-ExtraBold.ttf'],
    'Nunito': ['Nunito-Medium.ttf', 'Nunito-SemiBold.ttf', 'Nunito-Bold.ttf', 'Nunito-ExtraBold.ttf'],
  };
  for (final e in fonts.entries) {
    final loader = FontLoader(e.key);
    for (final file in e.value) {
      loader.addFont(Future.value(ByteData.sublistView(File('lib/fonts/$file').readAsBytesSync())));
    }
    await loader.load();
  }
}

/// Fikstürün `me`, `players`, `offline` alanları.
Json _meta(String name) => asJson(jsonDecode(File('test/fixtures/agents/$name.json').readAsStringSync()));

void main() {
  const module = AgentsModule();
  final api = GameApi(Api(() => null), 'agents');
  setUpAll(_loadFonts);

  for (final name in Fixture.names('agents')) {
    testWidgets('görünüm: $name', (tester) async {
      final f = Fixture.load('agents', name);
      final meta = _meta(name);
      final me = meta.str('me');
      final ids = meta.strs('players');
      final view = AgentsView.fromJson(f.view);
      expect(view.cards, hasLength(boardSize));
      // Hem oda sahibi hem misafir olarak çiz.
      for (final host in {ids.first, if (ids.first == me) ids[1] else me}) {
        await pumpGame(tester, module.playView(playProps(f, _room(ids, host: host, offline: meta.strs('offline')), me)));
        expect(tester.takeException(), isNull);
        expect(find.text(SPlay.pill(view.board)), findsOneWidget);
      }
    });
  }

  testWidgets('lider: tablodaki kelime reddedilir, geçerli ipucu gönderilir', (tester) async {
    final f = Fixture.load('agents', 'clue-leader');
    final meta = _meta('clue-leader');
    final ids = meta.strs('players');
    final view = AgentsView.fromJson(f.view);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(ids, host: ids.first), meta.str('me'), acted: acted)));
    expect(find.text('İPUCUN'), findsOneWidget);

    await tester.enterText(find.byType(TextField), view.cards.first.word.toLowerCase());
    await tester.pump();
    expect(find.textContaining('kelimesine çok yakın'), findsOneWidget);
    await tester.tap(find.text('İpucunu ver'));
    await tester.pump();
    expect(acted, isEmpty);

    await tester.enterText(find.byType(TextField), 'zıp zıp');
    await tester.pump();
    // Değer yazıldığı gibi (boşluksuz), görünüm büyük harf (`text-transform: uppercase`).
    final editable = tester.state<EditableTextState>(find.byType(EditableText));
    expect(editable.textEditingValue.text, 'zıpzıp');
    expect(editable.renderEditable.text?.toPlainText(), 'ZIPZIP');
    await tester.tap(find.text('3').first);
    await tester.pump();
    await tester.tap(find.text('İpucunu ver'));
    await tester.pump();
    expect(acted.single, {'type': 'clue', 'word': 'zıpzıp', 'number': 3});
  });

  testWidgets('tahminci karta dokunur; sırayı bitirir', (tester) async {
    final f = Fixture.load('agents', 'guess-guesser');
    final meta = _meta('guess-guesser');
    final ids = meta.strs('players');
    final view = AgentsView.fromJson(f.view);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(ids, host: ids.first), meta.str('me'), acted: acted)));
    final i = view.cards.indexWhere((c) => !c.revealed);
    await tester.tap(find.text(trUpper(view.cards[i].word)));
    await tester.pump();
    expect(acted.last, {'type': 'touch', 'index': i, 'turn': view.turn});
    await tester.ensureVisible(find.text('Sırayı bitir'));
    await tester.tap(find.text('Sırayı bitir'));
    await tester.pump();
    expect(acted.last, {'type': 'endTurn', 'turn': view.turn});
  });

  testWidgets('lider ve rakip karta dokunamaz', (tester) async {
    for (final name in ['guess-leader', 'guess-opponent']) {
      final f = Fixture.load('agents', name);
      final meta = _meta(name);
      final ids = meta.strs('players');
      final view = AgentsView.fromJson(f.view);
      final acted = <Json>[];
      await pumpGame(tester, module.playView(playProps(f, _room(ids, host: ids.first), meta.str('me'), acted: acted)));
      await tester.tap(find.text(trUpper(view.cards.firstWhere((c) => !c.revealed).word)));
      await tester.pump();
      expect(acted, isEmpty);
      expect(find.text('Sırayı bitir'), findsNothing);
    }
  });

  testWidgets('tablo sonu: oda sahibi yeni tablo açar, misafir bekler', (tester) async {
    final f = Fixture.load('agents', 'over-assassin-host');
    final ids = _meta('over-assassin-host').strs('players');
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, _room(ids, host: 'ali'), 'ali', acted: acted)));
    await tester.ensureVisible(find.text('Yeni tablo'));
    await tester.tap(find.text('Yeni tablo'));
    await tester.pump();
    expect(acted.last, {'type': 'newBoard'});
    await pumpGame(tester, module.playView(playProps(f, _room(ids, host: 'ali'), 'ece')));
    expect(find.text('Oda sahibi yeni tablo açabilir ya da lobiye dönebilir.'), findsOneWidget);
  });

  testWidgets('ayar paneli: oda sahibi, misafir ve oyun içi bölüm', (tester) async {
    final room = _room(['ali', 'ayse', 'cem', 'deniz', 'ece', 'fatma'], host: 'ali', offline: ['fatma']);
    final settings = <String, dynamic>{
      'teams': {
        'a': ['ali', 'ayse'],
        'b': ['cem'],
      },
      'leaders': {'a': 'ayse', 'b': null},
      'leaderPick': 'host',
      'revealMode': 'vote',
      'timer': 'split',
      'seconds': 60,
      'packs': ['genel', 'zor'],
    };
    final changes = <Json>[];
    SettingsPanelProps props({required bool editable, String? section}) =>
        SettingsPanelProps(settings: settings, editable: editable, onChange: changes.add, api: api, players: room.players, meId: 'ali', section: section);

    await pumpGame(tester, module.settingsPanel(props(editable: true)));
    expect(tester.takeException(), isNull);
    expect(find.text('Karıştır'), findsOneWidget);
    expect(find.text('Takımsız'), findsOneWidget);
    expect(find.text('Yeşil lideri'), findsOneWidget);
    expect(find.textContaining('Her takımda en az 2 kişi olmalı.'), findsOneWidget);
    expect(find.text('60 sn'), findsOneWidget);
    await tester.tap(find.text('deniz'));
    await tester.pump();
    expect(changes.last['teams'], {
      'a': ['ali', 'ayse', 'deniz'],
      'b': ['cem'],
    });
    await tester.tap(find.text('ayse').last);
    await tester.pump();
    expect(changes.last['leaders'], {'a': null, 'b': null});

    await pumpGame(tester, module.settingsPanel(props(editable: false, section: 'primary')));
    expect(tester.takeException(), isNull);
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Karıştır'), findsNothing);
    final before = changes.length;
    await tester.ensureVisible(find.text('Zor'));
    await tester.tap(find.text('Zor'));
    await tester.pump();
    expect(changes.length, before);

    await pumpGame(tester, module.settingsPanel(props(editable: false, section: 'secondary')));
    expect(tester.takeException(), isNull);
    expect(find.text('Takım oylaması'), findsOneWidget);
    expect(find.text('Lider ve takım ayrı'), findsOneWidget);
    expect(find.text('TAKIMLAR'), findsNothing);
  });

  testWidgets('ayar paneli lobideki gibi (SliverFillRemaining içinde) çizilir', (tester) async {
    final room = _room(['ali', 'ayse', 'cem', 'deniz', 'ece'], host: 'ali');
    final settings = <String, dynamic>{
      'teams': {
        'a': ['ali', 'ayse'],
        'b': ['cem', 'deniz'],
      },
      'leaders': {'a': 'ali', 'b': null},
      'leaderPick': 'host',
      'revealMode': 'first',
      'timer': 'total',
      'seconds': 120,
      'packs': ['genel'],
    };
    for (final editable in [true, false]) {
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
                    module.settingsPanel(settingsProps(settings, room, 'ali', section: 'primary', editable: editable)),
                    module.settingsPanel(settingsProps(settings, room, 'ali', section: 'secondary', editable: editable)),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
      expect(tester.takeException(), isNull);
    }
  });

  test('ipucu doğrulaması sunucuyla aynı', () {
    const board = ['Kitap', 'Gözlük', 'Ağaç', 'Kalem', 'Yıldız'];
    expect(clueProblem('macera', board), isNull);
    expect(clueProblem('iki kelime', board), contains('tek kelime'));
    expect(clueProblem('a1', board), contains('harf'));
    expect(clueProblem('KİTAP', board), contains('Kitap'));
    expect(clueProblem('kitabı', board), contains('Kitap'));
    expect(clueProblem('kitapçı', board), contains('Kitap'));
    expect(clueProblem('göz', board), contains('Gözlük'));
    expect(clueProblem('agac', board), contains('Ağaç'));
    expect(clueProblem('kalemlik', board), contains('Kalem'));
    expect(clueProblem('denizyıldızı', board), isNull);
    expect(clueProblem('denizyıldız', board), contains('Yıldız'));
  });
}
