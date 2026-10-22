import 'package:flutter/material.dart';
import 'package:casebook/parts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/games/detective/models.dart';
import 'package:songie_core/session/api.dart';
import 'package:songie_core/ui/dialog.dart';

import 'helpers.dart';

Finder _text(String s) => find.textContaining(s, findRichText: true);

Future<void> _tapVisible(WidgetTester tester, Finder f) async {
  await Scrollable.ensureVisible(tester.element(f), alignment: 0.5);
  await tester.pump();
  await tester.tap(f);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  setUpAll(() async {
    await Catalog.load();
  });

  testWidgets('bütün bölümler tasarımdaki sırayla ve taşmadan çizilir', (tester) async {
    await pumpHome(tester, height: 3300);
    expect(tester.takeException(), isNull);
    expect(find.text('Casebook'), findsOneWidget);
    // En iyi rütbe (Komiser Yardımcısı) + takma ad, büyük harf.
    expect(find.text('KOMİSER YARDIMCISI ECE'), findsOneWidget);
    expect(find.text('Masada yeni dosyalar var.'), findsOneWidget);
    // Devam eden dosya
    expect(find.text('DEVAM EDEN DOSYA'), findsOneWidget);
    expect(find.text('Uludağ, Bursa · Cinayet'), findsOneWidget);
    expect(find.text('Bölüm 2/4 · 9 sa'), findsOneWidget);
    expect(find.text('Ekibinle kaldığın yerden'), findsOneWidget);
    expect(find.text('Soruşturmaya dön'), findsOneWidget);
    // Büyük düğmeler ve kod alanı
    expect(_text('Ekip kur'), findsOneWidget);
    expect(_text('Kendi hızında çöz'), findsOneWidget);
    expect(find.text('Katıl'), findsOneWidget);
    // Rütbe
    expect(find.text('2 / 4 vaka çözüldü'), findsOneWidget);
    expect(find.text('Puanının yüzde 65’ini topla, “Komiser” rütbesine yüksel.'), findsOneWidget);
    expect(find.text('Başkomiser'), findsOneWidget);
    // Raf
    expect(find.text('4 dosya'), findsOneWidget);
    expect(find.text('DOSYA 01'), findsOneWidget);
    expect(find.text('DOSYA 04'), findsOneWidget);
    expect(find.text('ÇÖZÜLDÜ\nKomiser Yardımcısı'), findsOneWidget);
    expect(find.text('AÇIK'), findsNWidgets(2)); // devam eden kart + raftaki dosya
    expect(find.text('Çok zor'), findsWidgets);
    expect(find.text('4 bölüm · 71 belge'), findsOneWidget);
    expect(find.text('Casebook · ekipçe çözülen polisiye vakalar'), findsOneWidget);
  });

  testWidgets('filtre çipleri rafı süzer', (tester) async {
    await pumpHome(tester, height: 3300);
    await _tapVisible(tester, find.descendant(of: find.byType(CbChip), matching: find.text('Orta')));
    expect(find.text('1 dosya'), findsOneWidget);
    expect(find.text('Pera Gecesi'), findsOneWidget);
    expect(find.text('Sahnede Ölüm'), findsNothing);
    await _tapVisible(tester, find.descendant(of: find.byType(CbChip), matching: find.text('Çözdüklerim')));
    expect(find.text('2 dosya'), findsOneWidget);
    await _tapVisible(tester, find.descendant(of: find.byType(CbChip), matching: find.text('Tümü')));
    expect(find.text('4 dosya'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('devam eden dosya yoksa kart gizlenir; hiç çözüm yoksa Stajyer', (tester) async {
    final j = casesJson(withSession: false);
    for (final c in j['cases'] as List) {
      (c as Map)['solved'] = null;
    }
    await pumpHome(tester, height: 3300, loader: (_) async => CasesResponse.fromJson(j));
    expect(find.text('DEVAM EDEN DOSYA'), findsNothing);
    expect(find.text('STAJYER ECE'), findsOneWidget);
    expect(find.text('0 / 4 vaka çözüldü'), findsOneWidget);
    expect(find.text('Puanının yüzde 45’ini topla, “Komiser Yardımcısı” rütbesine yüksel.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ekip dosyasına dönüş: kayıtla oda kurar, lobiye gider', (tester) async {
    final s = await pumpHome(tester, responses: {
      'room:create': {'ok': true, 'code': 'ABCD'},
    });
    await _tapVisible(tester, find.text('Soruşturmaya dön'));
    await tester.pumpAndSettle();
    expect(s.emitted.map((e) => e.$1), ['room:create']);
    expect(s.emitted.first.$2, {
      'gameId': 'detective',
      'settings': {'caseSlug': 'uludag-firtina', 'resume': 'sess1', 'leadMode': 'vote', 'hints': true},
    });
    expect(find.text('oda ABCD'), findsOneWidget);
  });

  testWidgets('tek kişilik dosyaya dönüş hemen başlar', (tester) async {
    final s = await pumpHome(
      tester,
      loader: (_) async => CasesResponse.fromJson(casesJson(members: const ['ece'])),
      responses: {
        'room:create': {'ok': true, 'code': 'SOLO'},
      },
    );
    expect(find.text('Kaldığın yerden'), findsOneWidget);
    await _tapVisible(tester, find.text('Soruşturmaya dön'));
    await tester.pumpAndSettle();
    expect(s.emitted.map((e) => e.$1), ['room:create', 'room:start']);
    expect(find.text('oda SOLO'), findsOneWidget);
  });

  testWidgets('Ekip kur: ayarsız dedektif odası', (tester) async {
    final s = await pumpHome(tester, responses: {
      'room:create': {'ok': true, 'code': 'TEAM'},
    });
    await _tapVisible(tester, _text('Ekip kur'));
    await tester.pumpAndSettle();
    expect(s.emitted.single.$2, {'gameId': 'detective'});
    expect(find.text('oda TEAM'), findsOneWidget);
  });

  testWidgets('Tek başına: dosya seçilir, oda kurulup hemen başlar', (tester) async {
    final s = await pumpHome(tester, responses: {
      'room:create': {'ok': true, 'code': 'ALON'},
    });
    await _tapVisible(tester, _text('Kendi hızında çöz'));
    await tester.pumpAndSettle();
    expect(find.text('Hangi dosyayı açalım?'), findsOneWidget);
    await tester.tap(find.descendant(of: find.byType(SDialog), matching: find.text('Sahnede Ölüm')));
    await tester.pumpAndSettle();
    expect(s.emitted.map((e) => e.$1), ['room:create', 'room:start']);
    expect((s.emitted.first.$2['settings'] as Map)['caseSlug'], 'sahnede-olum');
    expect(find.text('oda ALON'), findsOneWidget);
  });

  testWidgets('raftaki dosyaya dokununca o vakayla oda kurulur', (tester) async {
    final s = await pumpHome(tester, responses: {
      'room:create': {'ok': true, 'code': 'PERA'},
    });
    await _tapVisible(tester, find.text('Pera Gecesi'));
    await tester.pumpAndSettle();
    expect(s.emitted.single.$2, {
      'gameId': 'detective',
      'settings': {'caseSlug': 'pera-gecesi', 'resume': null, 'leadMode': 'vote', 'hints': true},
    });
    expect(find.text('oda PERA'), findsOneWidget);
  });

  testWidgets('ekip koduyla katılma ve hata', (tester) async {
    final s = await pumpHome(tester, responses: {
      'room:join': {'ok': false, 'error': 'Bu kodla açık bir oda yok.'},
    });
    final field = find.byType(TextField);
    await tester.enterText(field, 'ab1c');
    await tester.pump();
    expect(find.text('ABC'), findsOneWidget);
    await tester.enterText(field, 'abcd');
    await _tapVisible(tester, find.text('Katıl'));
    await tester.pump();
    expect(s.emitted.single.$1, 'room:join');
    expect(s.emitted.single.$2, {'code': 'ABCD'});
    expect(find.text('Bu kodla açık bir oda yok.'), findsOneWidget);
  });

  testWidgets('ekip koduyla katılınca odaya gider', (tester) async {
    await pumpHome(tester);
    final field = find.byType(TextField);
    await tester.enterText(field, 'WXYZ');
    await _tapVisible(tester, find.text('Katıl'));
    await tester.pumpAndSettle();
    expect(find.text('oda WXYZ'), findsOneWidget);
  });

  testWidgets('yükleme hatası sessiz bir satır, tekrar denenebilir', (tester) async {
    var calls = 0;
    await pumpHome(
      tester,
      height: 3300,
      loader: (_) async {
        calls++;
        if (calls == 1) throw ApiError('yok', 500);
        return CasesResponse.fromJson(casesJson());
      },
    );
    expect(_text('Dosyalar yüklenemedi.'), findsOneWidget);
    expect(find.text('DEVAM EDEN DOSYA'), findsNothing);
    expect(find.text('Rütben'), findsNothing);
    await _tapVisible(tester, _text('Tekrar dene'));
    await tester.pump();
    expect(calls, 2);
    expect(find.text('DEVAM EDEN DOSYA'), findsOneWidget);
    expect(find.text('4 dosya'), findsOneWidget);
  });
}
