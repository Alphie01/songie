import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Kurt Adam (games/werewolf).
class WerewolfModule extends GameModule {
  const WerewolfModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => WerewolfSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => WerewolfPlayView(props: props);
}
