import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Tabu (games/taboo).
class TabooModule extends GameModule {
  const TabooModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => TabooSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => TabooPlayView(props: props);
}
