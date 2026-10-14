import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Renk Renk (games/color-cards).
class ColorCardsModule extends GameModule {
  const ColorCardsModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => ColorCardsSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => ColorCardsPlayView(props: props);
}
