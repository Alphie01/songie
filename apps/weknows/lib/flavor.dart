import 'package:flutter/widgets.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/agents/module.dart';
import 'package:songie_core/games/charades/module.dart';
import 'package:songie_core/games/color-cards/module.dart';
import 'package:songie_core/games/five-seconds/module.dart';
import 'package:songie_core/games/frequency/module.dart';
import 'package:songie_core/games/intrigue/module.dart';
import 'package:songie_core/games/kitten/module.dart';
import 'package:songie_core/games/secret_hitler/module.dart';
import 'package:songie_core/games/taboo/module.dart';
import 'package:songie_core/games/werewolf/module.dart';
import 'package:songie_core/games/who-am-i/module.dart';

/// We Knows: gizli roller ve takım oyunları.
const weknowsFlavor = AppFlavor(
  id: 'weknows',
  name: 'We Knows',
  brandText: 'we knows',
  badgeColor: Color(0xFFB794FF),
  badgeIcon: 'mask',
  games: ['werewolf', 'secret-hitler', 'intrigue', 'agents', 'taboo', 'charades', 'five-seconds', 'frequency', 'who-am-i', 'color-cards', 'kitten'],
  modules: {
    'werewolf': WerewolfModule(),
    'secret-hitler': SecretHitlerModule(),
    'intrigue': IntrigueModule(),
    'agents': AgentsModule(),
    'taboo': TabooModule(),
    'charades': CharadesModule(),
    'five-seconds': FiveSecondsModule(),
    'frequency': FrequencyModule(),
    'who-am-i': WhoAmIModule(),
    'color-cards': ColorCardsModule(),
    'kitten': KittenModule(),
  },
  storeId: 'com.monolithyazilim.weknows',
  footer: 'we knows · gizli roller ve takım oyunları',
);
