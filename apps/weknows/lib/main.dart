import 'package:songie_core/run.dart';

import 'firebase_options.dart';
import 'flavor.dart';

export 'flavor.dart';

Future<void> main() => runFlavor(weknowsFlavor, firebase: DefaultFirebaseOptions.currentPlatform);
