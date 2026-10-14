import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Ajanlar (games/agents).
class AgentsModule extends GameModule {
  const AgentsModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => AgentsSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => AgentsPlayView(props: props);
}
