import 'package:flutter/material.dart';

import '../ui/tokens.dart';
import 'kit/game_module.dart';
import 'agents/module.dart';
import 'bottle/module.dart';
import 'charades/module.dart';
import 'color-cards/module.dart';
import 'confessions/module.dart';
import 'detective/module.dart';
import 'five-seconds/module.dart';
import 'frequency/module.dart';
import 'intrigue/module.dart';
import 'kitten/module.dart';
import 'most-likely/module.dart';
import 'paranoia/module.dart';
import 'never/module.dart';
import 'red-flag/module.dart';
import 'secret_hitler/module.dart';
import 'song_guess/module.dart';
import 'taboo/module.dart';
import 'werewolf/module.dart';
import 'who-am-i/module.dart';

/// Oyunların mobil ekranları. Yeni oyun: `lib/games/<id>/module.dart` + buraya bir satır.
/// Sıra ve meta veriler `assets/catalog.json`'dan (web'deki oyun kaydı) gelir.
final Map<String, GameModule> gameModules = {
  'never': const NeverModule(),
  'most-likely': const MostLikelyModule(),
  'red-flag': const RedFlagModule(),
  'confessions': const ConfessionsModule(),
  'intrigue': const IntrigueModule(),
  'secret-hitler': const SecretHitlerModule(),
  'who-am-i': const WhoAmIModule(),
  'taboo': const TabooModule(),
  'charades': const CharadesModule(),
  'agents': const AgentsModule(),
  'frequency': const FrequencyModule(),
  'color-cards': const ColorCardsModule(),
  'kitten': const KittenModule(),
  'five-seconds': const FiveSecondsModule(),
  'paranoia': const ParanoiaModule(),
  'bottle': const BottleModule(),
  'detective': const DetectiveModule(),
  'song-guess': const SongGuessModule(),
  'werewolf': const WerewolfModule(),
};

GameModule moduleFor(String gameId) => gameModules[gameId] ?? const _NotYet();

/// Henüz taşınmamış oyun: lobi ve oyun ekranında bilgi notu.
class _NotYet extends GameModule {
  const _NotYet();

  @override
  Widget settingsPanel(SettingsPanelProps props) => props.section == 'secondary' ? const SizedBox() : const _Note();

  @override
  Widget playView(PlayViewProps props) => const Padding(padding: EdgeInsets.fromLTRB(18, 72, 18, 24), child: _Note());
}

class _Note extends StatelessWidget {
  const _Note();
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(color: C.panel, borderRadius: BorderRadius.circular(R.md)),
    child: Text('Bu oyunun mobil ekranı hazırlanıyor.', style: T.b(12, color: C.text2)),
  );
}
