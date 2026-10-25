import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/i18n/tr.dart';
import 'package:songie_core/screens/welcome.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

/// Profili hazır, sunucusu [requests]'e yazan sahte istemcili oturum.
Future<Session> _pump(WidgetTester tester, List<http.Request> requests, {int status = 200}) async {
  await tester.runAsync(loadRealFonts);
  SharedPreferences.setMockInitialValues({});
  final client = MockClient((req) async {
    requests.add(req);
    return http.Response(status == 200 ? '{"ok":true}' : '{"error":"x"}', status);
  });
  final storage = await Storage.open();
  final session = http.runWithClient(() => Session(storage), () => client)
    ..profile = const Profile(id: 'p1', nick: 'Ali', avatar: Avatar(color: 'mint'))
    ..status = SessionStatus.ready;
  await tester.pumpWidget(
    ChangeNotifierProvider<Session>.value(
      value: session,
      child: const MaterialApp(home: Scaffold(body: Padding(padding: EdgeInsets.all(18), child: DeleteAccountSection()))),
    ),
  );
  return session;
}

void main() {
  testWidgets('vazgeçince hiçbir istek gitmez', (tester) async {
    final requests = <http.Request>[];
    final session = await _pump(tester, requests);
    await tester.tap(find.text(TrAccount.delete));
    await tester.pumpAndSettle();
    expect(find.text(TrAccount.deleteConfirm), findsOneWidget);
    await tester.tap(find.text('Vazgeç'));
    await tester.pumpAndSettle();
    expect(requests, isEmpty);
    expect(session.profile, isNotNull);
  });

  testWidgets('onaylayınca DELETE /api/me gider, oturum sıfırlanır', (tester) async {
    final requests = <http.Request>[];
    final session = await _pump(tester, requests);
    await tester.tap(find.text(TrAccount.delete));
    await tester.pumpAndSettle();
    await tester.tap(find.text(TrAccount.deleteOk));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump();
    expect(requests.map((r) => '${r.method} ${r.url.path}'), ['DELETE /api/me']);
    expect(session.profile, isNull);
    expect(session.status, SessionStatus.anonymous);
    expect(session.notice, TrAccount.deleted);
    session.notify(null);
  });

  testWidgets('sunucu hata verirse profil kalır, hata gösterilir', (tester) async {
    final requests = <http.Request>[];
    final session = await _pump(tester, requests, status: 500);
    await tester.tap(find.text(TrAccount.delete));
    await tester.pumpAndSettle();
    await tester.tap(find.text(TrAccount.deleteOk));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump();
    expect(session.profile, isNotNull);
    expect(session.notice, TrAccount.deleteFailed);
    expect(find.text(TrAccount.delete), findsOneWidget);
    session.notify(null);
  });
}
