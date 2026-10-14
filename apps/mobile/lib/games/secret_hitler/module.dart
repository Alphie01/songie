import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Secret Hitler (games/secret-hitler).
class SecretHitlerModule extends GameModule {
  const SecretHitlerModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => SecretHitlerSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => SecretHitlerPlayView(props: props);
}
