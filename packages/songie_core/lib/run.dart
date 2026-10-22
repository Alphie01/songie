import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'app.dart';
import 'audio/player.dart';
import 'flavor.dart';
import 'games/catalog.dart';
import 'session/api.dart';
import 'session/session.dart';
import 'session/storage.dart';

/// Uygulamanın açılışı: her uygulamanın `main()`'i kendi kimliği ve Firebase ayarlarıyla bunu çağırır.
Future<void> runFlavor(AppFlavor flavor, {required FirebaseOptions firebase}) async {
  WidgetsFlutterBinding.ensureInitialized();
  AppFlavor.current = flavor;
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await Firebase.initializeApp(options: firebase);
  await Catalog.load();
  await AudioPlayerService.configureSession();
  final storage = await Storage.open();
  final session = Session(storage);
  final player = AudioPlayerService(storage);
  final updateRequired = ValueNotifier(false);
  unawaited(_updateRequired(session.api).then((v) => updateRequired.value = v));
  runApp(SongieApp(session: session, storage: storage, player: player, updateRequired: updateRequired));
  await session.init();
}

/// Sunucunun istediği en düşük sürümün altındaysak "güncelle" ekranı gösterilir.
Future<bool> _updateRequired(Api api) async {
  try {
    final config = await api.get('/api/app/config');
    final info = await PackageInfo.fromPlatform();
    return _compare(info.version, config['minAppVersion'] as String? ?? '0.0.0') < 0;
  } on Object {
    return false;
  }
}

int _compare(String a, String b) {
  final pa = a.split('.').map((e) => int.tryParse(e) ?? 0).toList();
  final pb = b.split('.').map((e) => int.tryParse(e) ?? 0).toList();
  for (var i = 0; i < 3; i++) {
    final x = i < pa.length ? pa[i] : 0;
    final y = i < pb.length ? pb[i] : 0;
    if (x != y) return x.compareTo(y);
  }
  return 0;
}
