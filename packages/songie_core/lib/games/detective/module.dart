import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Dedektif Masası (games/detective).
class DetectiveModule extends GameModule {
  const DetectiveModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => DetectiveSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => DetectivePlayView(props: props);
}
