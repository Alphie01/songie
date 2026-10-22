import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/i18n/tr.dart';
import 'package:songie_core/screens/welcome.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';

import '../helpers.dart';

Future<Session> _pump(WidgetTester tester, Widget child, {Account? account}) async {
  await tester.runAsync(loadRealFonts);
  SharedPreferences.setMockInitialValues({});
  final session = Session(await Storage.open())..account = account;
  await tester.pumpWidget(
    ChangeNotifierProvider<Session>.value(
      value: session,
      child: MaterialApp(home: Scaffold(body: SingleChildScrollView(child: Padding(padding: const EdgeInsets.all(18), child: child)))),
    ),
  );
  return session;
}

void main() {
  testWidgets('iOS: girişte Apple ve Google düğmeleri', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    await _pump(tester, const WelcomeGoogle());
    expect(find.text(TrAccount.continueWithApple), findsOneWidget);
    expect(find.text(TrAccount.continueWithGoogle), findsOneWidget);
    expect(find.byType(AppleMark), findsOneWidget);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('Android: yalnızca Google', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    await _pump(tester, const WelcomeGoogle());
    expect(find.text(TrAccount.continueWithApple), findsNothing);
    expect(find.text(TrAccount.continueWithGoogle), findsOneWidget);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('iOS: profil kartında iki bağlama seçeneği', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    await _pump(tester, const AccountCard());
    expect(find.text(TrAccount.linkTitleAny), findsOneWidget);
    expect(find.text(TrAccount.linkApple), findsOneWidget);
    expect(find.text(TrAccount.link), findsOneWidget);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('Apple ile bağlı hesap Apple olarak görünür', (tester) async {
    await _pump(tester, const AccountCard(), account: const Account(provider: 'apple', email: 'x@privaterelay.appleid.com'));
    expect(find.text(TrAccount.linkedApple), findsOneWidget);
    expect(find.byType(AppleMark), findsOneWidget);
    expect(find.text('x@privaterelay.appleid.com'), findsOneWidget);
  });
}
