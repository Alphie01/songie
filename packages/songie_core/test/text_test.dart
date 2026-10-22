import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/shared/text.dart';

// packages/shared/src/text.test.ts ile aynı örnekler.
void main() {
  group('foldText', () {
    test('Türkçe harfleri sadeleştirir', () {
      expect(foldText('Şımarık'), 'simarik');
      expect(foldText('İSTANBUL ağlıyor'), 'istanbul agliyor');
      expect(foldText('Gülümse, Çiğdem!'), 'gulumse cigdem');
    });
    test('diğer aksanları ve kesme işaretlerini atar', () {
      expect(foldText("Beyoncé's Halo"), 'beyonces halo');
    });
  });

  test('trUpper Türkçe büyük harf', () {
    expect(trUpper('istanbul ılık'), 'İSTANBUL ILIK');
  });

  test('trNumber binlik ayırıcı', () {
    expect(trNumber(1234567), '1.234.567');
    expect(trNumber(999), '999');
    expect(trNumber(0), '0');
  });

  test('nickError', () {
    expect(nickError('A'), isNotNull);
    expect(nickError('Ece'), isNull);
    expect(nickError('Ece 🎉'), isNotNull);
    expect(nickError('Çağla_Öz.1'), isNull);
  });
}
