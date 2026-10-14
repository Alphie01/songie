import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Sessiz Sinema (games/charades).
class CharadesModule extends GameModule {
  const CharadesModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => CharadesSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => CharadesPlayView(props: props);
}
