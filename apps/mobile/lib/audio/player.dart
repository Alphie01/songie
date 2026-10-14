import 'dart:async';
import 'dart:collection';
import 'dart:io';

import 'package:audio_session/audio_session.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';

import '../config.dart';
import '../session/storage.dart';

/// Çalan klip: hangi adres, ne zaman başladı, ne kadar sürüyor.
class Playing {
  const Playing({required this.url, required this.startedAt, required this.duration, required this.key});
  final String url;
  final DateTime startedAt;
  final Duration duration;
  final int key;
}

/// packages/game-kit/src/audio.ts karşılığı: platformun ortak ses oynatıcısı.
/// Klipler önce indirilip yerel dosyadan çalınır; 0,1 sn'lik kliplerde bile hemen başlar.
class AudioPlayerService extends ChangeNotifier {
  AudioPlayerService(this._storage) : volume = _storage.volume;

  final Storage _storage;

  /// Oynatıcı ilk çalmada kurulur (açılış hızlı kalsın).
  AudioPlayer? _p;
  AudioPlayer get _player {
    final existing = _p;
    if (existing != null) return existing;
    final p = AudioPlayer();
    unawaited(p.setVolume(volume));
    _sub = p.playerStateStream.listen((s) {
      if (s.processingState == ProcessingState.completed && playing != null) {
        playing = null;
        notifyListeners();
      }
    });
    return _p = p;
  }

  final LinkedHashMap<String, Future<File>> _files = LinkedHashMap();
  final http.Client _http = http.Client();
  StreamSubscription<PlayerState>? _sub;
  int _seq = 0;
  Directory? _dir;

  double volume;
  Playing? playing;

  /// Native uygulamada otomatik oynatma engeli yok; web ile aynı arayüz için tutulur.
  bool get blocked => false;

  static Future<void> configureSession() async {
    final session = await AudioSession.instance;
    // iOS: sessiz mod anahtarına rağmen çalsın (web: navigator.audioSession.type = 'playback').
    await session.configure(const AudioSessionConfiguration.music());
  }

  void setVolume(double v) {
    volume = v.clamp(0, 1).toDouble();
    unawaited(_storage.setVolume(volume));
    if (_p != null) unawaited(_p!.setVolume(volume));
    notifyListeners();
  }

  Future<File> _download(String url) async {
    _dir ??= await getTemporaryDirectory();
    final res = await _http.get(Uri.parse(mediaUrl(url)));
    if (res.statusCode != 200) throw HttpException('clip ${res.statusCode}');
    final ext = url.contains('/full') ? 'mp3' : 'wav';
    final file = File('${_dir!.path}/clip_${url.hashCode.toUnsigned(32)}.$ext');
    await file.writeAsBytes(res.bodyBytes, flush: true);
    return file;
  }

  /// Klibi önceden indirir (son 24 klip saklanır).
  Future<File> load(String url) {
    var f = _files[url];
    if (f == null) {
      f = _download(url);
      f.catchError((Object _) {
        _files.remove(url);
        return File('');
      });
      _files[url] = f;
      if (_files.length > 24) _files.remove(_files.keys.first);
    }
    return f;
  }

  /// Klibi çalar; yüklenemezse false.
  Future<bool> play(String url) async {
    File file;
    try {
      file = await load(url);
    } on Object catch (err) {
      debugPrint('[audio] klip yüklenemedi $url $err');
      return false;
    }
    await stop(notify: false);
    try {
      final duration = await _player.setFilePath(file.path) ?? Duration.zero;
      final key = ++_seq;
      playing = Playing(url: url, startedAt: DateTime.now(), duration: duration, key: key);
      notifyListeners();
      unawaited(_player.play());
      return true;
    } on Object catch (err) {
      debugPrint('[audio] çalınamadı $url $err');
      playing = null;
      notifyListeners();
      return false;
    }
  }

  Future<void> stop({bool notify = true}) async {
    if (_p?.playing ?? false) await _p!.stop();
    playing = null;
    if (notify) notifyListeners();
  }

  /// Uzun parça (ör. anlatım) için ayrı oynatıcı gerekiyorsa oyunlar kendi `AudioPlayer`'ını kurar.
  @override
  void dispose() {
    _sub?.cancel();
    _p?.dispose();
    _http.close();
    super.dispose();
  }
}
