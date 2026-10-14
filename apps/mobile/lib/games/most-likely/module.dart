import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Aramızdaki En (games/most-likely).
class MostLikelyModule extends GameModule {
  const MostLikelyModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => MostLikelySettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => MostLikelyPlayView(props: props);
}
