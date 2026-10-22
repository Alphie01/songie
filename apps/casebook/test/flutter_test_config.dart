import 'dart:async';

import 'package:casebook/main.dart';
import 'package:songie_core/flavor.dart';

/// Testler Casebook kimliğiyle çalışır (yalnızca dedektif).
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  AppFlavor.current = casebookFlavor;
  await testMain();
}
