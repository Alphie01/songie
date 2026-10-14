import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Gizlilik Esas (games/paranoia).
class ParanoiaModule extends GameModule {
  const ParanoiaModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => ParanoiaSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => ParanoiaPlayView(props: props);
}
