import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config.dart';
import '../i18n/tr.dart';
import '../shared/models.dart';
import 'api.dart';
import 'google_auth.dart';
import 'storage.dart';

enum SessionStatus { loading, anonymous, ready }

enum Connection { connecting, online, offline }

/// apps/web/src/lib/session.tsx karşılığı: profil, socket bağlantısı, oda ve oyun görünümü.
class Session extends ChangeNotifier with WidgetsBindingObserver {
  Session(this.storage) {
    api = Api(() => _token);
    WidgetsBinding.instance.addObserver(this);
  }

  final Storage storage;
  late final Api api;

  String? _token;
  io.Socket? _socket;
  Timer? _noticeTimer;
  Timer? _retry;
  bool _disposed = false;

  SessionStatus status = SessionStatus.loading;
  Connection connection = Connection.connecting;
  Profile? profile;
  ProfileStats? stats;

  /// Bağlı Google hesabı; anonim profilde null.
  Account? account;
  RoomState? room;
  GameViewPayload? gameView;
  List<ChatMessage> chat = const [];
  String? notice;

  void _changed() {
    if (!_disposed) notifyListeners();
  }

  Future<void> init() async {
    _token = await storage.readToken();
    await _loadMe();
  }

  Future<void> _loadMe() async {
    if (_token == null) {
      status = SessionStatus.anonymous;
      _changed();
      return;
    }
    try {
      final me = await api.get('/api/me');
      profile = Profile.fromJson(me['profile']);
      stats = ProfileStats.fromJson(me['stats']);
      account = Account.fromJson(me['account']);
      status = SessionStatus.ready;
      _changed();
      _connect();
    } on ApiError catch (e) {
      if (e.status == 401) {
        await _setToken(null);
        status = SessionStatus.anonymous;
        _changed();
      } else {
        notify(e.message);
        _retry?.cancel();
        _retry = Timer(const Duration(seconds: 3), _loadMe);
      }
    }
  }

  Future<void> _setToken(String? token) async {
    _token = token;
    await storage.writeToken(token);
  }

  // ---------- socket ----------

  void _connect() {
    _closeSocket();
    final token = _token;
    if (token == null) return;
    connection = Connection.connecting;
    final socket = io.io(
      songieUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableForceNew()
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .disableAutoConnect()
          .build(),
    );
    _socket = socket;
    socket.onConnect((_) {
      connection = Connection.online;
      _changed();
    });
    socket.onDisconnect((_) {
      connection = Connection.offline;
      _changed();
    });
    socket.onConnectError((err) {
      connection = Connection.offline;
      final message = err is Map ? err['message'] : (err is String ? err : null);
      if (message == 'unauthorized') {
        _closeSocket();
        unawaited(_setToken(null));
        status = SessionStatus.anonymous;
        profile = null;
      }
      _changed();
    });
    socket.on('room:state', (data) {
      final state = RoomState.fromJson(data);
      final wasPlaying = room?.code == state.code && room!.playing;
      room = state;
      chat = state.chat;
      _changed();
      // Oyun bittiğinde (oda lobiye dönünce) istatistikleri tazele.
      if (wasPlaying && !state.playing) unawaited(refreshStats());
    });
    socket.on('room:closed', (reason) {
      room = null;
      gameView = null;
      chat = const [];
      notify(reason is String ? reason : null);
    });
    socket.on('room:chat', (data) {
      final msg = ChatMessage.fromJson(data);
      final next = [...chat, msg];
      chat = next.length > 40 ? next.sublist(next.length - 40) : next;
      _changed();
    });
    socket.on('game:view', (data) {
      gameView = GameViewPayload.fromJson(data);
      _changed();
    });
    socket.connect();
  }

  void _closeSocket() {
    final s = _socket;
    _socket = null;
    if (s != null) {
      s.clearListeners();
      s.dispose();
    }
  }

  /// Socket olayı gönderir; 10 sn içinde cevap gelmezse hata döner.
  Future<Ack> emit(String event, [Json payload = const {}]) {
    final socket = _socket;
    if (socket == null || !socket.connected) return Future.value(Ack.fail(TrApp.disconnected));
    final completer = Completer<Ack>();
    final timer = Timer(const Duration(seconds: 10), () {
      if (!completer.isCompleted) completer.complete(Ack.fail(TrApp.noAnswer));
    });
    socket.emitWithAck(
      event,
      payload,
      ack: (data) {
        timer.cancel();
        if (!completer.isCompleted) completer.complete(Ack(asJson(data)));
      },
    );
    return completer.future;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Uygulama öne gelince kopmuş bağlantıyı beklemeden yeniden kur.
    if (state == AppLifecycleState.resumed && status == SessionStatus.ready && _socket != null && !_socket!.connected) {
      _socket!.connect();
    }
  }

  // ---------- profil ----------

  Future<void> saveProfile(String nick, Avatar avatar) async {
    final input = {'nick': nick, 'avatar': avatar.toJson()};
    if (profile != null) {
      final res = await api.put('/api/me', input);
      profile = Profile.fromJson(res['profile']);
      _changed();
      return;
    }
    final res = await api.post('/api/profile', input);
    await _setToken(res.str('token'));
    profile = Profile.fromJson(res['profile']);
    stats = const ProfileStats();
    account = null;
    status = SessionStatus.ready;
    _changed();
    _connect();
  }

  Future<void> refreshStats() async {
    try {
      final me = await api.get('/api/me');
      stats = ProfileStats.fromJson(me['stats']);
      account = Account.fromJson(me['account']);
      _changed();
    } on ApiError {
      // sonraki açılışta tazelenir
    }
  }

  /// Google ile giriş: mevcut profili bağlar ya da başka cihazdaki profili getirir.
  Future<void> signInWithGoogle() => _signIn(googleIdToken);

  /// Apple ile giriş (iOS): Google ile aynı akış, sunucu sağlayıcıyı token'dan okur.
  Future<void> signInWithApple() => _signIn(appleIdToken);

  Future<void> _signIn(Future<String> Function() firebaseIdToken) async {
    final idToken = await firebaseIdToken();
    final previous = _token;
    final res = await api.post('/api/auth/google', {'idToken': idToken});
    final token = res.str('token');
    await _setToken(token);
    final me = await api.get('/api/me');
    profile = Profile.fromJson(me['profile']);
    stats = ProfileStats.fromJson(me['stats']);
    account = Account.fromJson(me['account']);
    final switched = previous != token;
    if (switched) {
      // Başka bir profile geçildi: eski odanın görüntüsü kalmasın.
      room = null;
      gameView = null;
      chat = const [];
    }
    status = SessionStatus.ready;
    _changed();
    if (switched || _socket == null) _connect();
  }

  /// Bu cihazda oturumu kapatır.
  Future<void> signOut() async {
    try {
      await api.post('/api/auth/logout', const <String, dynamic>{});
    } on ApiError {
      // token zaten geçersiz olabilir
    }
    await googleSignOut();
    _closeSocket();
    await _setToken(null);
    profile = null;
    stats = null;
    account = null;
    room = null;
    gameView = null;
    chat = const [];
    status = SessionStatus.anonymous;
    _changed();
  }

  /// Alttaki bildirim şeridi (4,5 sn).
  void notify(String? text) {
    _noticeTimer?.cancel();
    notice = text;
    _changed();
    if (text != null) {
      _noticeTimer = Timer(const Duration(milliseconds: 4500), () {
        notice = null;
        _changed();
      });
    }
  }

  /// Bu odanın ve oyunun görünümü (önceki odadan kalan görünüm değil).
  Object? viewFor(RoomState room) {
    final p = gameView;
    return p != null && p.room == room.code && p.game == room.gameId ? p.view : null;
  }

  @override
  void dispose() {
    _disposed = true;
    WidgetsBinding.instance.removeObserver(this);
    _noticeTimer?.cancel();
    _retry?.cancel();
    _closeSocket();
    super.dispose();
  }
}
