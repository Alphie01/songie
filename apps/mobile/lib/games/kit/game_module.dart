import 'package:flutter/widgets.dart';

import '../../session/api.dart';
import '../../shared/models.dart';

/// Oyun aksiyonu gönderir (`game:action`); cevap `{ok, ...}`.
typedef Act = Future<Ack> Function(Json action);

/// packages/game-kit/src/client.ts `SettingsPanelProps` karşılığı.
class SettingsPanelProps {
  const SettingsPanelProps({
    required this.settings,
    required this.editable,
    required this.onChange,
    required this.api,
    required this.players,
    required this.meId,
    this.section,
  });

  /// Oyunun ayarları (JSON).
  final Json settings;
  final bool editable;
  final void Function(Json next) onChange;
  final GameApi api;

  /// Lobi ayarları iki bölüm: `primary` (ne oynanacak), `secondary` (nasıl oynanacak). null = hepsi.
  final String? section;
  final List<RoomPlayer> players;
  final String meId;

  bool get showPrimary => section == null || section == 'primary';
  bool get showSecondary => section == null || section == 'secondary';
}

/// packages/game-kit/src/client.ts `PlayViewProps` karşılığı.
class PlayViewProps {
  const PlayViewProps({
    required this.view,
    required this.meId,
    required this.room,
    required this.act,
    required this.api,
    required this.settings,
    required this.setSettings,
  });

  /// Sunucunun bu oyuncu için ürettiği görünüm (JSON).
  final Json view;
  final String meId;
  final RoomState room;
  final Act act;
  final GameApi api;

  /// Odanın güncel ayarları; oyun sırasında da değişebilir.
  final Json settings;

  /// Yalnızca oda sahibi için; oyun destekliyorsa ayarlar sıradaki turdan itibaren uygulanır.
  final Future<void> Function(Json next) setSettings;
}

/// Bir oyunun mobil ekranları.
abstract class GameModule {
  const GameModule();
  Widget settingsPanel(SettingsPanelProps props);
  Widget playView(PlayViewProps props);
}
