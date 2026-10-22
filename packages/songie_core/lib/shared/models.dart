// Sunucu sözleşmesinin Dart karşılığı: packages/shared/src/{player,room,events}.ts
// Alan adları JSON ile birebir aynıdır.

typedef Json = Map<String, dynamic>;

/// JSON'dan güvenli okuma yardımcıları (oyun modelleri de kullanır).
extension JsonRead on Json {
  String str(String key, [String fallback = '']) => this[key] is String ? this[key] as String : fallback;
  String? strOrNull(String key) => this[key] is String ? this[key] as String : null;
  int integer(String key, [int fallback = 0]) => this[key] is num ? (this[key] as num).toInt() : fallback;
  int? intOrNull(String key) => this[key] is num ? (this[key] as num).toInt() : null;
  double number(String key, [double fallback = 0]) => this[key] is num ? (this[key] as num).toDouble() : fallback;
  double? numOrNull(String key) => this[key] is num ? (this[key] as num).toDouble() : null;
  bool boolean(String key, [bool fallback = false]) => this[key] is bool ? this[key] as bool : fallback;
  Json obj(String key) => this[key] is Map ? Map<String, dynamic>.from(this[key] as Map) : <String, dynamic>{};
  Json? objOrNull(String key) => this[key] is Map ? Map<String, dynamic>.from(this[key] as Map) : null;
  List<dynamic> list(String key) => this[key] is List ? this[key] as List<dynamic> : const [];
  List<Json> objs(String key) => list(key).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  List<String> strs(String key) => list(key).whereType<String>().toList();
  List<int> ints(String key) => list(key).whereType<num>().map((e) => e.toInt()).toList();
}

Json asJson(Object? value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

class Avatar {
  const Avatar({this.shape = 'circle', required this.color});
  final String shape;

  /// signal | label | paper | mint | sky
  final String color;

  factory Avatar.fromJson(Object? json) {
    final j = asJson(json);
    return Avatar(shape: j.str('shape', 'circle'), color: j.str('color', 'mint'));
  }
  Json toJson() => {'shape': shape, 'color': color};
}

class Profile {
  const Profile({required this.id, required this.nick, required this.avatar});
  final String id;
  final String nick;
  final Avatar avatar;

  factory Profile.fromJson(Object? json) {
    final j = asJson(json);
    return Profile(id: j.str('id'), nick: j.str('nick'), avatar: Avatar.fromJson(j['avatar']));
  }
}

class ProfileStats {
  const ProfileStats({this.gamesPlayed = 0, this.wins = 0, this.bestScore = 0, this.bestStreak = 0});
  final int gamesPlayed;
  final int wins;
  final int bestScore;
  final int bestStreak;

  factory ProfileStats.fromJson(Object? json) {
    final j = asJson(json);
    return ProfileStats(
      gamesPlayed: j.integer('gamesPlayed'),
      wins: j.integer('wins'),
      bestScore: j.integer('bestScore'),
      bestStreak: j.integer('bestStreak'),
    );
  }
}

/// Bağlı giriş hesabı (yalnızca sahibine gelir).
class Account {
  const Account({required this.provider, this.email});
  final String provider;
  final String? email;

  static Account? fromJson(Object? json) {
    if (json is! Map) return null;
    final j = asJson(json);
    return Account(provider: j.str('provider', 'google'), email: j.strOrNull('email'));
  }
}

class RoomPlayer {
  const RoomPlayer({required this.id, required this.nick, required this.avatar, required this.connected, required this.ready});
  final String id;
  final String nick;
  final Avatar avatar;
  final bool connected;
  final bool ready;

  factory RoomPlayer.fromJson(Object? json) {
    final j = asJson(json);
    return RoomPlayer(
      id: j.str('id'),
      nick: j.str('nick'),
      avatar: Avatar.fromJson(j['avatar']),
      connected: j.boolean('connected'),
      ready: j.boolean('ready'),
    );
  }
}

class ChatMessage {
  const ChatMessage({required this.id, required this.playerId, required this.text, required this.at});
  final String id;
  final String playerId;
  final String text;
  final int at;

  factory ChatMessage.fromJson(Object? json) {
    final j = asJson(json);
    return ChatMessage(id: j.str('id'), playerId: j.str('playerId'), text: j.str('text'), at: j.integer('at'));
  }
}

class Standing {
  const Standing({required this.playerId, required this.nick, required this.avatar, required this.score, required this.rank});
  final String playerId;
  final String nick;
  final Avatar avatar;
  final int score;
  final int rank;

  factory Standing.fromJson(Object? json) {
    final j = asJson(json);
    return Standing(
      playerId: j.str('playerId'),
      nick: j.str('nick'),
      avatar: Avatar.fromJson(j['avatar']),
      score: j.integer('score'),
      rank: j.integer('rank'),
    );
  }
}

class RoomState {
  const RoomState({
    required this.code,
    required this.hostId,
    required this.gameId,
    required this.settings,
    required this.phase,
    required this.players,
    required this.chat,
    required this.lastStandings,
  });
  final String code;
  final String hostId;
  final String gameId;

  /// Oyunun ayarları (her oyunun kendi şeması).
  final Object? settings;

  /// lobby | playing
  final String phase;
  final List<RoomPlayer> players;
  final List<ChatMessage> chat;
  final List<Standing>? lastStandings;

  bool get playing => phase == 'playing';
  RoomPlayer? player(String id) {
    for (final p in players) {
      if (p.id == id) return p;
    }
    return null;
  }

  factory RoomState.fromJson(Object? json) {
    final j = asJson(json);
    return RoomState(
      code: j.str('code'),
      hostId: j.str('hostId'),
      gameId: j.str('gameId'),
      settings: j['settings'],
      phase: j.str('phase', 'lobby'),
      players: j.list('players').map(RoomPlayer.fromJson).toList(),
      chat: j.list('chat').map(ChatMessage.fromJson).toList(),
      lastStandings: j['lastStandings'] is List ? j.list('lastStandings').map(Standing.fromJson).toList() : null,
    );
  }
}

/// Oyun görünümü, hangi odaya ve oyuna ait olduğuyla birlikte.
class GameViewPayload {
  const GameViewPayload({required this.room, required this.game, required this.view});
  final String room;
  final String game;
  final Object? view;

  static GameViewPayload? fromJson(Object? json) {
    if (json is! Map) return null;
    final j = asJson(json);
    return GameViewPayload(room: j.str('room'), game: j.str('game'), view: j['view']);
  }
}

/// Socket olaylarının cevabı: `{ok: true, ...}` ya da `{ok: false, error}`.
class Ack {
  const Ack(this.data);
  final Json data;

  bool get ok => data['ok'] == true;
  String get error => data.str('error', 'Bir şeyler ters gitti. Tekrar dene.');
  Object? operator [](String key) => data[key];

  factory Ack.fail(String error) => Ack({'ok': false, 'error': error});
}
