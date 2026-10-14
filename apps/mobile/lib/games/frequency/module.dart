import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Frekans (games/frequency).
class FrequencyModule extends GameModule {
  const FrequencyModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => FrequencySettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => FrequencyPlayView(props: props);
}
