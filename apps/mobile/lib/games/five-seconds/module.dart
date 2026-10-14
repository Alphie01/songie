import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// 5 Saniye (games/five-seconds).
class FiveSecondsModule extends GameModule {
  const FiveSecondsModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => FiveSecondsSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => FiveSecondsPlayView(props: props);
}
