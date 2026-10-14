import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Ben Hiç (games/never).
class NeverModule extends GameModule {
  const NeverModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => NeverSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => NeverPlayView(props: props);
}
