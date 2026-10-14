import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Profil token'ı güvenli depoda; ses seviyesi ve "görüldü" bayrakları tercihlerde
/// (web'deki localStorage anahtarlarıyla aynı adlar).
class Storage {
  Storage._(this._prefs);
  final SharedPreferences _prefs;
  static const _secure = FlutterSecureStorage();
  static const tokenKey = 'songie.token';

  static Future<Storage> open() async => Storage._(await SharedPreferences.getInstance());

  Future<String?> readToken() async {
    try {
      return await _secure.read(key: tokenKey);
    } on Object {
      return _prefs.getString(tokenKey);
    }
  }

  Future<void> writeToken(String? token) async {
    try {
      if (token == null) {
        await _secure.delete(key: tokenKey);
      } else {
        await _secure.write(key: tokenKey, value: token);
      }
    } on Object {
      if (token == null) {
        await _prefs.remove(tokenKey);
      } else {
        await _prefs.setString(tokenKey, token);
      }
    }
  }

  bool seen(String key) => _prefs.getString(key) == '1';
  Future<void> markSeen(String key) => _prefs.setString(key, '1');

  String? getString(String key) => _prefs.getString(key);
  Future<void> setString(String key, String value) => _prefs.setString(key, value);

  double get volume {
    final v = double.tryParse(_prefs.getString('songie.volume') ?? '');
    return v != null && v > 0 && v <= 1 ? v : 0.8;
  }

  Future<void> setVolume(double v) => _prefs.setString('songie.volume', v.toString());
}
