import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Gizli İtiraflar (games/confessions).
class ConfessionsModule extends GameModule {
  const ConfessionsModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => ConfessionsSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => ConfessionsPlayView(props: props);
}
