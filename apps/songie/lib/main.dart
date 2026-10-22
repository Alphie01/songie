import 'package:flutter/widgets.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/song_guess/module.dart';
import 'package:songie_core/run.dart';

import 'firebase_options.dart';
import 'home.dart';

/// Songie: yalnızca Şarkıyı Bil.
const songieFlavor = AppFlavor(
  id: 'songie',
  name: 'Songie',
  brandText: 'songie',
  badgeColor: Color(0xFFFF7AC6),
  badgeIcon: 'note',
  games: ['song-guess'],
  modules: {'song-guess': SongGuessModule()},
  storeId: 'com.monolithyazilim.songie',
  home: _home,
  footer: 'Ücretsiz · Reklamsız · Tamamen Türkçe',
);

Widget _home(BuildContext context) => const SongieHome();

Future<void> main() => runFlavor(songieFlavor, firebase: DefaultFirebaseOptions.currentPlatform);
