import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:songie/audio/player.dart';
import 'package:songie/games/kit/game_module.dart';
import 'package:songie/games/song_guess/models.dart';
import 'package:songie/games/song_guess/module.dart';
import 'package:songie/session/api.dart';
import 'package:songie/shared/models.dart';

import '../helpers.dart';

/// Ses oynatıcısının sahtesi: çalınan, indirilen ve durdurulan klipleri kaydeder.
class FakePlayer extends ChangeNotifier implements AudioPlayerService {
  @override
  double volume = 0.8;
  @override
  Playing? playing;
  final played = <String>[];
  final loaded = <String>[];
  int stops = 0;

  @override
  bool get blocked => false;

  @override
  void setVolume(double v) {
    volume = v;
    notifyListeners();
  }

  @override
  Future<File> load(String url) async {
    loaded.add(url);
    return File(url);
  }

  @override
  Future<bool> play(String url) async {
    played.add(url);
    playing = Playing(url: url, startedAt: DateTime.now(), duration: const Duration(milliseconds: 500), key: played.length);
    notifyListeners();
    return true;
  }

  @override
  Future<void> stop({bool notify = true}) async {
    stops++;
    playing = null;
    if (notify) notifyListeners();
  }
}

/// Oyunun HTTP uçlarının sahtesi (/pools, /search).
class FakeApi extends Api {
  FakeApi() : super(() => null);
  final requests = <String>[];

  static const pools = [
    {'id': 'tr-test', 'name': 'Türkçe Pop', 'category': 'turkce', 'cover': null, 'trackCount': 12, 'custom': false},
    {'id': 'tr-rock', 'name': 'Türkçe Rock', 'category': 'turkce', 'cover': null, 'trackCount': 80, 'custom': false},
    {'id': 'global-test', 'name': 'Global Hits', 'category': 'global', 'cover': null, 'trackCount': 10, 'custom': false},
    {'id': 'tur-jazz', 'name': 'Caz', 'category': 'tur', 'cover': null, 'trackCount': 120, 'custom': false},
    {'id': 'donem-90', 'name': '90’lar', 'category': 'donem', 'cover': null, 'trackCount': 200, 'custom': false},
    {'id': 'custom-1', 'name': 'Yol şarkılarım', 'category': 'ozel', 'cover': null, 'trackCount': 42, 'custom': true},
  ];

  @override
  Future<Json> get(String path) async {
    requests.add(path);
    if (path.contains('/pools')) return {'pools': pools};
    if (path.contains('/search')) {
      return {
        'hits': [
          {'id': 101, 'title': 'Şımarık', 'artist': 'Tarkan', 'cover': null},
          {'id': 102, 'title': 'Kuzu Kuzu', 'artist': 'Tarkan', 'cover': null},
        ],
      };
    }
    return {};
  }

  @override
  Future<Json> post(String path, Object? body) async {
    requests.add('POST $path');
    return {'ok': true};
  }
}

typedef Loaded = ({Fixture f, RoomState room, String me});

Loaded load(String name) {
  final raw = asJson(jsonDecode(File('test/fixtures/song-guess/$name.json').readAsStringSync()));
  return (f: Fixture.load('song-guess', name), room: fakeRoom(raw.strs('players'), gameId: 'song-guess'), me: raw.str('me'));
}

PlayViewProps props(Loaded l, {List<Json>? acted, Api? api, Json Function(Json action)? reply}) => PlayViewProps(
  view: l.f.view,
  meId: l.me,
  room: l.room,
  act: (a) async {
    acted?.add(a);
    return Ack({'ok': true, ...?reply?.call(a)});
  },
  api: GameApi(api ?? Api(() => null), 'song-guess'),
  settings: l.f.settings,
  setSettings: (_) async {},
);

const module = SongGuessModule();

/// Her çağrıda yeni bir oyun ekranı (aynı ağaçta State yeniden kullanılmasın) + sahte ses oynatıcısı.
Future<FakePlayer> pumpPlay(WidgetTester tester, PlayViewProps p) async {
  final player = FakePlayer();
  await pumpGame(tester, ChangeNotifierProvider<AudioPlayerService>.value(value: player, child: KeyedSubtree(key: UniqueKey(), child: module.playView(p))));
  return player;
}

void main() {
  for (final name in Fixture.names('song-guess')) {
    testWidgets('görünüm: $name', (tester) async {
      final l = load(name);
      final view = SongView.fromJson(l.f.view);
      expect(view.phase, isNotEmpty);
      await pumpPlay(tester, props(l));
      expect(tester.takeException(), isNull);
      switch (view.phase) {
        case 'countdown':
          expect(find.text('Hazır ol'), findsOneWidget);
        case 'loading':
          expect(find.text('Sıradaki şarkı hazırlanıyor…'), findsOneWidget);
        case 'stage':
          expect(find.text(view.stage == 4 ? 'Pes et' : 'Pas'), findsOneWidget);
        case 'reveal':
          expect(find.text('ŞARKI BUYDU'), findsOneWidget);
        case 'podium':
          expect(find.text('OYUN BİTTİ'), findsOneWidget);
      }
      // Sağlayıcı olmadan da (ses kapalı) çizilir.
      await pumpGame(tester, module.playView(props(l)));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('aşama açılınca klip kendiliğinden çalar, açılmış klipler önceden indirilir', (tester) async {
    final semantics = tester.ensureSemantics();
    final l = load('stage-artist');
    final view = SongView.fromJson(l.f.view);
    final player = await pumpPlay(tester, props(l));
    expect(player.played, [view.clips[1]]);
    expect(player.loaded, containsAll([view.clips[0], view.clips[1]]));
    // Çalarken düğme "Durdur" olur; tekrar basınca durur.
    await tester.tap(find.bySemanticsLabel('Durdur'));
    await tester.pump();
    expect(player.playing, isNull);
    // Çubuktan açılmış parçalara dokununca o parça çalar. (Web'deki gibi 0.5s alanı 0.1s alanının
    // büyük kısmını örter; 0.1s'e yalnızca en soldan dokunulur.)
    await tester.tapAt(tester.getTopLeft(find.bySemanticsLabel('0.1s parçasını çal')) + const Offset(2, 25));
    await tester.pump();
    expect(player.played.last, view.clips[0]);
    await tester.tap(find.bySemanticsLabel('0.5s parçasını çal'));
    await tester.pump();
    expect(player.played.last, view.clips[1]);
    semantics.dispose();
  });

  testWidgets('geri sayımda ses durur, sonuçta önizleme çalar', (tester) async {
    final countdown = await pumpPlay(tester, props(load('countdown')));
    expect(countdown.stops, greaterThan(0));
    final l = load('reveal-host');
    final reveal = await pumpPlay(tester, props(l));
    expect(reveal.played, [SongView.fromJson(l.f.view).reveal!.previewUrl]);
    expect(find.text('Durdur'), findsOneWidget);
    expect(find.text('Bildin! +897'), findsOneWidget);
    expect(find.text('Sonraki şarkı'), findsOneWidget);
  });

  testWidgets('pas, öneriden tahmin ve geri bildirim', (tester) async {
    final acted = <Json>[];
    final api = FakeApi();
    await pumpPlay(tester, props(load('stage-host'), acted: acted, api: api, reply: (a) => a['type'] == 'guess' ? {'verdict': 'artist'} : {}));
    await tester.tap(find.text('Pas'));
    await tester.pump();
    expect(acted.last, {'type': 'skip'});

    await tester.enterText(find.byType(TextField), 'tarkan');
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pump();
    expect(api.requests.any((r) => r.contains('/search?q=tarkan')), isTrue);
    expect(find.text('Tarkan – Şımarık'), findsOneWidget);
    await tester.tap(find.text('Tarkan – Kuzu Kuzu'));
    await tester.pump();
    expect(acted.last, {'type': 'guess', 'trackId': 102});
    expect(find.text('Sanatçı doğru, ama Kuzu Kuzu değil.'), findsOneWidget);
    expect(find.text('Tarkan – Şımarık'), findsNothing);
  });

  testWidgets('liste şeridi, seçenekler paneli ve katalog', (tester) async {
    final semantics = tester.ensureSemantics();
    final api = FakeApi();
    await pumpPlay(tester, props(load('stage-host'), api: api));
    await tester.pump();
    expect(find.text('Türkçe Pop'), findsOneWidget);
    expect(find.text('Değişiklikler sıradaki şarkıdan itibaren geçerli olur.'), findsOneWidget);
    await tester.ensureVisible(find.text('Seçenekler'));
    await tester.tap(find.text('Seçenekler'));
    await tester.pump();
    expect(find.text('Tur sayısı'), findsOneWidget);
    expect(find.text('SES'), findsOneWidget);
    await tester.ensureVisible(find.text('Liste ekle / çıkar'));
    await tester.tap(find.text('Liste ekle / çıkar'));
    await tester.pump();
    expect(find.text('Eklediğin listeler'), findsOneWidget);
    // Şeritte ve katalogda.
    expect(find.text('Yol şarkılarım'), findsNWidgets(2));
    expect(find.bySemanticsLabel('Yol şarkılarım listesini listelerimden çıkar'), findsOneWidget);
    expect(find.text('Deezer ya da Spotify playlist linki'), findsOneWidget);
    expect(tester.takeException(), isNull);
    semantics.dispose();
  });

  testWidgets('sonuç: oda sahibi beklemeden geçirebilir', (tester) async {
    final acted = <Json>[];
    await pumpPlay(tester, props(load('reveal-ready'), acted: acted));
    expect(find.text('1/4 kişi hazır'), findsOneWidget);
    await tester.ensureVisible(find.text('Beklemeden geç'));
    await tester.tap(find.text('Beklemeden geç'));
    await tester.pump();
    expect(acted.last, {'type': 'next', 'force': true});
  });

  testWidgets('podyum, berabere ve tek başına seri', (tester) async {
    await pumpPlay(tester, props(load('podium')));
    expect(find.text('deniz kazandı!'), findsOneWidget);
    await pumpPlay(tester, props(load('podium-draw')));
    expect(find.text('Berabere!'), findsOneWidget);
    await pumpPlay(tester, props(load('solo-stage')));
    expect(find.text('Şarkı 3 ×2'), findsOneWidget);
  });

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final l = load('stage-host');
    await pumpGame(tester, module.settingsPanel(settingsProps(l.f.settings, l.room, 'ali')));
    expect(find.text('Zorluk'), findsOneWidget);
    expect(find.text('Tahmin şuradan başlasın'), findsOneWidget);
    expect(find.text('Liste ekle / çıkar'), findsOneWidget);
    await pumpGame(tester, module.settingsPanel(settingsProps(l.f.settings, l.room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
    expect(find.text('Tahmin şuradan başlasın'), findsNothing);
    await pumpGame(tester, module.settingsPanel(settingsProps(l.f.settings, l.room, 'cem', editable: false, section: 'secondary')));
    expect(find.text('Sanatçıyı bilene puan'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
