import 'package:flutter/widgets.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/bottle/module.dart';
import 'package:songie_core/games/confessions/module.dart';
import 'package:songie_core/games/most-likely/module.dart';
import 'package:songie_core/games/never/module.dart';
import 'package:songie_core/games/paranoia/module.dart';
import 'package:songie_core/games/red-flag/module.dart';

/// İtiraf Köşesi: itiraf ve sohbet oyunları.
const itirafFlavor = AppFlavor(
  id: 'itiraf',
  name: 'İtiraf Köşesi',
  brandText: 'itiraf köşesi',
  badgeColor: Color(0xFFFF6B6B),
  badgeIcon: 'chat',
  games: ['never', 'confessions', 'most-likely', 'paranoia', 'red-flag', 'bottle'],
  modules: {
    'never': NeverModule(),
    'confessions': ConfessionsModule(),
    'most-likely': MostLikelyModule(),
    'paranoia': ParanoiaModule(),
    'red-flag': RedFlagModule(),
    'bottle': BottleModule(),
  },
  storeId: 'com.monolithyazilim.itirafkosesi',
  footer: 'itiraf köşesi · arkadaşlarınla en dürüst gece',
);
