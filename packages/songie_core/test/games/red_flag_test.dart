import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/red-flag/models.dart';
import 'package:songie_core/games/red-flag/module.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

const _game = 'red-flag';

/// Fikstürün ham hali: `me` (görünümün sahibi) ve `players` (odadakiler, ilki oda sahibi).
Json _raw(String name) => asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));

/// Test odası: fikstürdeki oyuncular; `offline` listesindekilerin bağlantısı kopuk.
RoomState _room(Json raw) {
  final room = fakeRoom(raw.strs('players'), gameId: _game);
  final offline = raw.strs('offline');
  return RoomState(
    code: room.code,
    hostId: room.hostId,
    gameId: room.gameId,
    settings: room.settings,
    phase: room.phase,
    players: [for (final p in room.players) RoomPlayer(id: p.id, nick: p.nick, avatar: p.avatar, connected: !offline.contains(p.id), ready: p.ready)],
    chat: room.chat,
    lastStandings: room.lastStandings,
  );
}

/// Bazı görünümlerde mutlaka görünmesi gereken metinler.
const _expects = <String, List<String>>{
  'vote-host': ['Sen ne dersin?', 'Green flag', 'Red flag', 'Asla olmaz', 'Oyları şimdi aç', 'Durumu atla', 'TAHMİN PUANI', 'NASIL OYNANIR'],
  'vote-voted-host': ['Oyun gizli. Açılana kadar değiştirebilirsin.', 'Doğru tahmin +1 puan.'],
  'vote-guest': ['Önce kendi oyunu ver.', 'bağlantı yok'],
  'vote-untimed-guest': ['Süresiz', 'OYUNCULAR'],
  'reveal-host': ['Çoğunluk: Red flag', 'Tartışın…'],
  'reveal-guest': ['Hazırım'],
  'reveal-ready-guest': ['Hazırsın'],
  'reveal-unlocked-host': ['Sonraki durum'],
  'reveal-unanimous-guest': ['Herkes aynı fikirde'],
  'reveal-anon-guest': ['İsimsiz mod: kimin ne dediği gönderilmez.'],
  'reveal-novotes-host': ['Kimse oy vermedi.'],
  'podium-host': ['OYUN BİTTİ', 'Red flag toleransı', 'EN HOŞGÖRÜLÜ', 'HERKESİN PROFİLİ', 'EN ÇOK BÖLEN DURUMLAR', 'Lobiye dönülüyor…'],
  'podium-anon-guest': ['SENİN PROFİLİN', 'İsimsiz oynandığı için yalnızca kendi profilini görüyorsun.'],
};

void main() {
  const module = RedFlagModule();

  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final raw = _raw(name);
      final f = Fixture.load(_game, name);
      final view = RedFlagView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      final room = _room(raw);
      await pumpGame(tester, module.playView(playProps(f, room, raw.str('me'))));
      expect(tester.takeException(), isNull);
      for (final text in _expects[name] ?? const <String>[]) {
        expect(find.textContaining(text, findRichText: true), findsWidgets, reason: '$name: "$text"');
      }
    });
  }

  testWidgets('bayrağa basınca oy gider', (tester) async {
    final raw = _raw('vote-guest');
    final f = Fixture.load(_game, 'vote-guest');
    final room = _room(raw);
    final acted = <Json>[];
    await pumpGame(tester, module.playView(playProps(f, room, 'cem', acted: acted)));
    await tester.tap(find.text('Green flag'));
    await tester.pump();
    expect(acted.single, containsPair('type', 'vote'));
    expect(acted.single, containsPair('vote', 'green'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final f = Fixture.load(_game, 'vote-host');
    final room = fakeRoom(['ali', 'ayse', 'cem'], gameId: _game);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Üçüncü seçenek'), findsOneWidget);
    expect(find.text('Tartışma süresi'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Durum ekle').last);
    await tester.pump();
    expect(find.text('0/160'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Kim ne dedi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
