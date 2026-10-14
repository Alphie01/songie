import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Şişe Çevirmece (games/bottle).
class BottleModule extends GameModule {
  const BottleModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => BottleSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => BottlePlayView(props: props);
}
