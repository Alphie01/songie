import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Bomba Kedi (games/kitten).
class KittenModule extends GameModule {
  const KittenModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => KittenSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => KittenPlayView(props: props);
}
