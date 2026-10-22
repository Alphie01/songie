import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Red Flag / Green Flag (games/red-flag).
class RedFlagModule extends GameModule {
  const RedFlagModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => RedFlagSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => RedFlagPlayView(props: props);
}
