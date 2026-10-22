import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../i18n/tr.dart';
import '../shared/models.dart';

class ApiError implements Exception {
  ApiError(this.message, this.status);
  final String message;
  final int status;
  @override
  String toString() => message;
}

/// apps/web/src/lib/api.ts karşılığı: Bearer token'lı JSON istekleri.
class Api {
  Api(this.tokenOf);

  /// O anki token (yoksa null).
  final String? Function() tokenOf;
  final http.Client _client = http.Client();

  Future<Json> get(String path) => _request('GET', path);
  Future<Json> post(String path, Object? body) => _request('POST', path, body);
  Future<Json> put(String path, Object? body) => _request('PUT', path, body);

  Future<Json> _request(String method, String path, [Object? body]) async {
    final token = tokenOf();
    final headers = <String, String>{if (token != null) 'authorization': 'Bearer $token', if (body != null) 'content-type': 'application/json'};
    http.Response res;
    try {
      final req = http.Request(method, apiUri(path))..headers.addAll(headers);
      if (body != null) req.body = jsonEncode(body);
      res = await http.Response.fromStream(await _client.send(req).timeout(const Duration(seconds: 15)));
    } on Object {
      throw ApiError(TrApp.unreachable, 0);
    }
    Json data;
    try {
      data = asJson(jsonDecode(utf8.decode(res.bodyBytes)));
    } on Object {
      data = {};
    }
    if (res.statusCode < 200 || res.statusCode >= 300) throw ApiError(data.str('error', TrApp.generic), res.statusCode);
    return data;
  }
}

/// Oyunun kendi HTTP uçları (`/api/games/<id>`).
class GameApi {
  GameApi(this.api, this.gameId);
  final Api api;
  final String gameId;

  Future<Json> get(String path) => api.get('/api/games/$gameId$path');
  Future<Json> post(String path, Object? body) => api.post('/api/games/$gameId$path', body);
}
