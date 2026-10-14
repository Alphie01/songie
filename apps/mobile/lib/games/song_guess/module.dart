import 'package:flutter/widgets.dart';

import '../kit/game_module.dart';
import 'play_view.dart';
import 'settings_panel.dart';

/// Şarkıyı Bil (games/song-guess).
class SongGuessModule extends GameModule {
  const SongGuessModule();

  @override
  Widget settingsPanel(SettingsPanelProps props) => SongGuessSettingsPanel(props: props);

  @override
  Widget playView(PlayViewProps props) => SongGuessPlayView(props: props);
}
