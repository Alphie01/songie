import 'dart:io';

import 'package:casebook/home.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:songie_core/games/detective/models.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';
import 'package:songie_core/ui/tokens.dart';

/// Socket olaylarını kaydeden, sunucusuz oturum.
class FakeSession extends Session {
  FakeSession(super.storage, {this.responses = const {}});

  /// Olay adı → cevap.
  final Map<String, Json> responses;
  final List<(String, Json)> emitted = [];

  @override
  Future<Ack> emit(String event, [Json payload = const {}]) async {
    emitted.add((event, payload));
    return Ack(responses[event] ?? const {'ok': true});
  }
}

bool _fontsLoaded = false;

/// Gerçek fontlar (test fontunda her harf 1em genişlikte, sahte taşmalar üretir).
Future<void> loadRealFonts() async {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
  const core = '../../packages/songie_core/lib/fonts';
  const fonts = {
    'Baloo2': ['$core/Baloo2-SemiBold', '$core/Baloo2-Bold', '$core/Baloo2-ExtraBold'],
    'Nunito': ['$core/Nunito-Medium', '$core/Nunito-SemiBold', '$core/Nunito-Bold', '$core/Nunito-ExtraBold'],
    'CourierPrime': ['assets/fonts/CourierPrime-Regular', 'assets/fonts/CourierPrime-Bold'],
  };
  for (final e in fonts.entries) {
    final loader = FontLoader(e.key);
    for (final f in e.value) {
      loader.addFont(Future.value(ByteData.sublistView(File('$f.ttf').readAsBytesSync())));
    }
    await loader.load();
  }
}

const me = Profile(id: 'ece', nick: 'Ece', avatar: Avatar(color: 'signal'));

Json caseJson(String slug, String title, String subtitle, String genre, String difficulty, {int minutes = 120, int acts = 4, int evidence = 60, Json? solved}) => {
  'slug': slug,
  'title': title,
  'subtitle': subtitle,
  'genre': genre,
  'difficulty': difficulty,
  'minutes': minutes,
  'teaser': '',
  'coverUrl': null,
  'acts': acts,
  'evidenceCount': evidence,
  'solved': solved,
};

/// Tasarımdaki raf (ilk iki dosya çözülmüş, Fırtınada Köşk devam ediyor).
Json casesJson({bool withSession = true, List<String> members = const ['ece', 'mert', 'deniz', 'zeynep']}) => {
  'cases': [
    caseJson('yalida-son-aksam', 'Yalıda Son Akşam', 'Kandilli, İstanbul — Şubat 2026', 'cinayet', 'zor', minutes: 75, evidence: 45, solved: {'rank': 'Komiser Yardımcısı', 'score': 60}),
    caseJson('pera-gecesi', 'Pera Gecesi', 'Galata, İstanbul — Ekim 2025', 'hırsızlık', 'orta', minutes: 55, acts: 3, evidence: 45, solved: {'rank': 'Stajyer', 'score': 20}),
    caseJson('uludag-firtina', 'Fırtınada Köşk', 'Uludağ, Bursa — Aralık 2025', 'cinayet', 'zor'),
    caseJson('sahnede-olum', 'Sahnede Ölüm', 'Beyoğlu, İstanbul — Mart 2026', 'cinayet', 'çok zor', minutes: 130, evidence: 71),
  ],
  'sessions': [
    if (withSession)
      {'id': 'sess1', 'slug': 'uludag-firtina', 'title': 'Fırtınada Köşk', 'act': 2, 'acts': 4, 'hoursSpent': 9, 'updatedAt': 100, 'members': members},
  ],
};

/// Ana ekranı telefon boyunda (390×844) gerçek yönlendiriciyle çizer.
Future<FakeSession> pumpHome(WidgetTester tester, {CasesLoader? loader, Map<String, Json> responses = const {}, double height = 844}) async {
  await tester.runAsync(loadRealFonts);
  SharedPreferences.setMockInitialValues({});
  final storage = await Storage.open();
  final session = FakeSession(storage, responses: responses)
    ..status = SessionStatus.ready
    ..connection = Connection.online
    ..profile = me;
  tester.view.physicalSize = Size(390 * 3, height * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => Scaffold(body: CasebookHome(loader: loader ?? (_) async => CasesResponse.fromJson(casesJson()))),
      ),
      GoRoute(path: '/r/:code', builder: (context, state) => Scaffold(body: Text('oda ${state.pathParameters['code']}'))),
      GoRoute(path: '/profil', builder: (context, state) => const Scaffold(body: Text('profil'))),
    ],
  );
  await tester.pumpWidget(
    ChangeNotifierProvider<Session>.value(
      value: session,
      child: MaterialApp.router(debugShowCheckedModeBanner: false, theme: songieTheme(), routerConfig: router),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
  return session;
}
