import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/never/models.dart';
import 'package:songie_core/games/never/module.dart';

import '../helpers.dart';

void main() {
  final room = fakeRoom(['ali', 'ayse', 'cem'], gameId: 'never');
  const module = NeverModule();

  for (final name in Fixture.names('never')) {
    testWidgets('görünüm: $name', (tester) async {
      final f = Fixture.load('never', name);
      final view = NeverView.fromJson(f.view);
      expect(view.phase, isNotEmpty);
      final me = name.endsWith('guest') ? 'cem' : (name == 'podium' ? 'ayse' : 'ali');
      await pumpGame(tester, module.playView(playProps(f, room, me)));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('ayar paneli (oda sahibi ve misafir)', (tester) async {
    final f = Fixture.load('never', 'question-host');
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'ali')));
    expect(find.text('Can (parmak)'), findsOneWidget);
    await pumpGame(tester, module.settingsPanel(settingsProps(f.settings, room, 'cem', editable: false, section: 'primary')));
    expect(find.text('Ayarları oda sahibi seçer.'), findsOneWidget);
  });
}
