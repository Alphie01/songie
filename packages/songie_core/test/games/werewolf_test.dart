import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/kit/game_module.dart';
import 'package:songie_core/games/werewolf/models.dart';
import 'package:songie_core/games/werewolf/module.dart';
import 'package:songie_core/games/werewolf/strings.dart';
import 'package:songie_core/session/api.dart';
import 'package:songie_core/shared/models.dart';
import 'package:songie_core/ui/widgets.dart';

import '../helpers.dart';

const _game = 'werewolf';
const _module = WerewolfModule();

/// Görünümü izleyen oyuncu ve odadaki oyuncular (fixture'a `me` ve `players` olarak yazılır).
({String me, List<String> players}) _meta(String name) {
  final j = asJson(jsonDecode(File('test/fixtures/$_game/$name.json').readAsStringSync()));
  return (me: j.str('me'), players: j.strs('players'));
}

/// Fixture'ı izleyen oyuncunun gözünden çizer; gönderilen eylemler [acted]'e eklenir.
Future<WerewolfView> _pump(WidgetTester tester, String name, {List<Json>? acted}) async {
  final f = Fixture.load(_game, name);
  final m = _meta(name);
  final room = fakeRoom(m.players, gameId: _game);
  await pumpGame(tester, _module.playView(playProps(f, room, m.me, acted: acted)));
  return WerewolfView.fromJson(f.view);
}

/// Oyuncu ızgarasındaki (`PlayerGrid`) kutu.
Finder _tile(String nick) => find.descendant(of: find.byType(Grid2), matching: find.text(nick, findRichText: true)).first;

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await tester.pump(const Duration(milliseconds: 200));
}

void main() {
  for (final name in Fixture.names(_game)) {
    testWidgets('görünüm: $name', (tester) async {
      final view = await _pump(tester, name);
      expect(view.phase, isNotEmpty);
      expect(tester.takeException(), isNull);

      // Rol kartı: basılı tutunca açılır, bırakınca kapanır.
      if (view.me != null && view.phase != 'over') {
        final hold = find.text(SPlay.roleHold);
        expect(hold, findsOneWidget);
        final blurb = find.text(S.roleBlurb[view.me!.role]!);
        final before = blurb.evaluate().length;
        await tester.ensureVisible(hold);
        await tester.pump();
        final gesture = await tester.startGesture(tester.getCenter(hold));
        await tester.pump(const Duration(milliseconds: 120));
        expect(hold, findsNothing);
        expect(blurb.evaluate().length, before + 1);
        expect(tester.takeException(), isNull);
        await gesture.up();
        await tester.pump(const Duration(milliseconds: 120));
        expect(hold, findsOneWidget);
      }
    });
  }

  group('eylemler', () {
    testWidgets('aynı anda: köylü ateşböceklerini toplayınca sunucuya bildirir', (tester) async {
      final acted = <Json>[];
      final view = await _pump(tester, 'f-sim-n1-villager', acted: acted);
      expect(view.me!.chores, isFalse);
      expect(find.text(SPlay.choresTitle), findsOneWidget);
      expect(find.text(S.allWake), findsOneWidget);
      for (var i = 0; i < choresGoal; i++) {
        final fly = find.bySemanticsLabel(SPlay.firefly);
        expect(fly, findsOneWidget);
        await _tap(tester, fly);
      }
      expect(acted, [
        {'type': 'chores', 'session': view.session},
      ]);
      expect(find.text(SPlay.choresDone), findsOneWidget);
    });

    testWidgets('aynı anda: rolü olan önce eylem panelini, altında ateşböceklerini görür', (tester) async {
      await _pump(tester, 'f-sim-n1-seer');
      expect(find.text(SPlay.seerTitle), findsOneWidget);
      expect(find.text(SPlay.choresTitle), findsOneWidget);
    });

    testWidgets('aynı anda: ikinci turda cadı uyanır', (tester) async {
      final view = await _pump(tester, 'f-sim-n1-witch');
      expect(view.stageIndex, 1);
      expect(find.text(SPlay.witchTitle), findsOneWidget);
    });

    testWidgets('aşk okçusu iki kişi seçip âşık eder', (tester) async {
      final acted = <Json>[];
      final view = await _pump(tester, 'n1-cupid-turn', acted: acted);
      await _tap(tester, _tile('p1'));
      await _tap(tester, _tile('p8'));
      final confirm = find.text(SPlay.cupidConfirm('p1', 'p8'));
      expect(confirm, findsOneWidget);
      await _tap(tester, confirm);
      expect(acted, [
        {'type': 'cupid', 'session': view.session, 'a': 'p1', 'b': 'p8'},
      ]);
    });

    testWidgets('kurt oy verir; diğer kurdun oyu rozet olarak görünür', (tester) async {
      final acted = <Json>[];
      final view = await _pump(tester, 'n1-wolves-turn-host', acted: acted);
      expect(find.text(SPlay.wolfVotes(1)), findsOneWidget);
      await _tap(tester, _tile('p4'));
      expect(acted.single, {'type': 'wolfVote', 'session': view.session, 'target': 'p4'});
      expect(find.text(SPlay.wolfVotes(2)), findsOneWidget);
      expect(find.text(SPlay.wolvesWithdraw), findsOneWidget);
    });

    testWidgets('cadı iyileştirir ve zehirler', (tester) async {
      final acted = <Json>[];
      final view = await _pump(tester, 'n1-witch-turn', acted: acted);
      await _tap(tester, find.text(SPlay.witchHeal('p4')));
      await _tap(tester, _tile('p1'));
      await _tap(tester, find.text(SPlay.witchConfirm));
      expect(acted.single, {'type': 'witch', 'session': view.session, 'heal': true, 'poison': 'p1'});
      expect(find.text(SPlay.witchDone), findsOneWidget);
    });

    testWidgets('doktor dün koruduğunu seçemez', (tester) async {
      final acted = <Json>[];
      await _pump(tester, 'n2-doctor-blocked', acted: acted);
      expect(find.text(SPlay.doctorBlocked), findsOneWidget);
      await _tap(tester, _tile('p2'));
      expect(acted, isEmpty);
    });

    testWidgets('tartışma: hazırım ve aday gösterme', (tester) async {
      final acted = <Json>[];
      final view = await _pump(tester, 'discuss-guest', acted: acted);
      await _tap(tester, find.text(SPlay.readyBtn));
      expect(acted.last, {'type': 'ready', 'session': view.session, 'ready': true});
      await _tap(tester, _tile('p0'));
      expect(acted.last, {'type': 'nominate', 'session': view.session, 'target': 'p0'});
    });

    testWidgets('oylama: kimseyi asma', (tester) async {
      final acted = <Json>[];
      final view = await _pump(tester, 'vote-fresh', acted: acted);
      await _tap(tester, find.text(SPlay.voteNone));
      expect(acted.single, {'type': 'vote', 'session': view.session, 'target': null});
    });

    testWidgets('ölü ve izleyici oy veremez', (tester) async {
      for (final name in ['vote-ghost', 'vote-spectator']) {
        final acted = <Json>[];
        await _pump(tester, name, acted: acted);
        await _tap(tester, find.text(SPlay.voteNone));
        expect(acted, isEmpty, reason: name);
      }
    });

    testWidgets('kurt sohbeti mesaj gönderir', (tester) async {
      final acted = <Json>[];
      await _pump(tester, 'n1-wolf-chat-host', acted: acted);
      expect(find.text(SPlay.chatPlaceholder), findsOneWidget);
      await tester.ensureVisible(find.byType(TextField));
      await tester.enterText(find.byType(TextField), '  Bu gece kahin  ');
      await tester.pump();
      await _tap(tester, find.text(SPlay.send));
      expect(acted.single, {'type': 'wolfChat', 'text': 'Bu gece kahin'});
    });

    testWidgets('oyun sonu: oda sahibi lobiye döner, gece olanlar açılır', (tester) async {
      final acted = <Json>[];
      await _pump(tester, 'over-village-host', acted: acted);
      await _tap(tester, find.textContaining(SPlay.secretTitle));
      expect(find.text('1. gece: aşk okçusu p1 ile p8 kişisini âşık etti.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _tap(tester, find.text(SPlay.backNow));
      expect(acted.single, {'type': 'finish'});
    });

    testWidgets('oyun sonu: misafir lobiye dön düğmesini görmez', (tester) async {
      await _pump(tester, 'over-village-guest');
      expect(find.text(SPlay.backNow), findsNothing);
      expect(find.text(SPlay.winnerTitle['village']!), findsOneWidget);
    });
  });

  group('ayar paneli', () {
    final players = [for (var i = 0; i < 9; i++) 'p$i'];

    testWidgets('oda sahibi, misafir ve iki bölüm', (tester) async {
      final f = Fixture.load(_game, 'n1-sleep');
      final room = fakeRoom(players, gameId: _game);
      await pumpGame(tester, _module.settingsPanel(settingsProps(f.settings, room, 'p0')));
      expect(find.text(SSettings.roles), findsOneWidget);
      expect(find.text(SSettings.roleSeconds), findsOneWidget);
      expect(find.text(SSettings.readOnly), findsNothing);
      expect(tester.takeException(), isNull);

      await pumpGame(tester, _module.settingsPanel(settingsProps(f.settings, room, 'p8', editable: false, section: 'primary')));
      expect(find.text(SSettings.readOnly), findsOneWidget);
      expect(find.text(SSettings.roleSeconds), findsNothing);
      expect(find.text(SSettings.recommend(9)), findsNothing);
      expect(tester.takeException(), isNull);

      await pumpGame(tester, _module.settingsPanel(settingsProps(f.settings, room, 'p8', editable: false, section: 'secondary')));
      expect(find.text(SSettings.roles), findsNothing);
      expect(find.text(SSettings.rules), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('oyuncu sayısı uymayınca hata ve önerilen dağılım', (tester) async {
      final f = Fixture.load(_game, 'n1-sleep');
      final room = fakeRoom(['p0', 'p1', 'p2', 'p3'], gameId: _game);
      await pumpGame(tester, _module.settingsPanel(settingsProps(f.settings, room, 'p0', section: 'primary')));
      expect(find.text('Kurt Adam 5–16 kişiyle oynanır. Şu an 4 kişi var.'), findsOneWidget);
      expect(find.text(SSettings.recommendShort), findsOneWidget);
      expect(find.text(SSettings.villagers(-5)), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('düzenleme: kurt sayısı, rol aç/kapa, önerilen dağılım', (tester) async {
      final f = Fixture.load(_game, 'n1-sleep');
      final room = fakeRoom(players, gameId: _game);
      final changes = <Json>[];
      await pumpGame(
        tester,
        _module.settingsPanel(
          SettingsPanelProps(
            settings: f.settings,
            editable: true,
            onChange: changes.add,
            api: GameApi(Api(() => null), _game),
            players: room.players,
            meId: 'p0',
          ),
        ),
      );
      await _tap(tester, find.text('+'));
      expect(changes.last.obj('roles').integer('wolf'), 3);
      await _tap(tester, find.text(S.role['hunter']!));
      expect(changes.last.obj('roles').integer('hunter'), 0);
      await _tap(tester, find.text(SSettings.dayTieOpts['none']!));
      expect(changes.last.str('dayTie'), 'none');
      await _tap(tester, find.text(SSettings.ghostsSeeRoles));
      expect(changes.last.boolean('ghostsSeeRoles'), false);
      // Fixture'daki dağılım 9 kişi için önerilenle aynı değil (deli açık): düğme etkin.
      await _tap(tester, find.text(SSettings.recommend(9)));
      expect(RoleCounts.fromJson(changes.last.obj('roles')), recommendedRoles(9));
    });
  });
}
