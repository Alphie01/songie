import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Entrika (games/intrigue).
class IntrigueModule extends GameModule {
  const IntrigueModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => IntrigueSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => IntriguePlayView(props: props);
}
