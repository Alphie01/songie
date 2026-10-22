import 'dart:async';

import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/registry.dart';

/// Paketin testleri bütün oyunlarla çalışır (uygulamalar yalnızca kendi oyunlarını yükler).
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  AppFlavor.current = allGamesFlavor();
  await testMain();
}
