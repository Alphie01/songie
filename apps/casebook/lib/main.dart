import 'package:flutter/widgets.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/detective/module.dart';
import 'package:songie_core/run.dart';

import 'firebase_options.dart';
import 'home.dart';

/// Casebook: yalnızca dedektif oyunu (eski adıyla Dedektif Masası).
const casebookFlavor = AppFlavor(
  id: 'casebook',
  name: 'Casebook',
  brandText: 'Casebook',
  badgeColor: Color(0xFFF3E6C4),
  badgeIcon: 'search',
  badgeRadius: BorderRadius.only(
    topLeft: Radius.circular(4),
    topRight: Radius.circular(12),
    bottomLeft: Radius.circular(12),
    bottomRight: Radius.circular(12),
  ),
  games: ['detective'],
  modules: {'detective': DetectiveModule()},
  storeId: 'com.monolithyazilim.casebook',
  background: Color(0xFF14102A),
  home: _home,
  footer: 'Casebook · ekipçe çözülen polisiye vakalar',
);

Widget _home(BuildContext context) => const CasebookHome();

Future<void> main() => runFlavor(casebookFlavor, firebase: DefaultFirebaseOptions.currentPlatform);
