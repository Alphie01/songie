import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Kimim Ben? (games/who-am-i).
class WhoAmIModule extends GameModule {
  const WhoAmIModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => WhoAmISettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => WhoAmIPlayView(props: props);
}
