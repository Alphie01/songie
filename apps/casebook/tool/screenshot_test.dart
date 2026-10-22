// Ana ekranın tasarımla karşılaştırma görüntüsü (390px genişlik).
// Çalıştır: flutter test --update-goldens tool/screenshot_test.dart → tool/casebook_home.png
import 'package:casebook/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:songie_core/flavor.dart';

import '../test/helpers.dart';

void main() {
  testWidgets('ana ekran görüntüsü', (tester) async {
    AppFlavor.current = casebookFlavor;
    await pumpHome(tester, height: 2500);
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('casebook_home.png'));
  });
}
