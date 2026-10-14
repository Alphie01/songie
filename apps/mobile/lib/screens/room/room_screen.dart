import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../config.dart';
import '../../games/catalog.dart';
import '../../games/kit/game_module.dart';
import '../../games/registry.dart';
import '../../i18n/tr.dart';
import '../../session/api.dart';
import '../../session/session.dart';
import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/dialog.dart';
import '../../ui/icons.dart';
import '../../ui/page.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../../games/kit/kit.dart' show GameViewport, PillBar;
import '../guide.dart';
import '../shell.dart';

/// apps/web/src/pages/Room.tsx: lobi, oyun ve sonuç ekranları.
class RoomScreen extends StatefulWidget {
  const RoomScreen({super.key, required this.code});
  final String code;

  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  String? _joinError;
  String? _tried;
  bool _wasInRoom = false;
  String? _resultsSeen;
  String? _guideShownFor;

  void _sync(Session session) {
    final room = session.room;
    final code = widget.code;
    if (session.connection == Connection.online && room?.code != code && _tried != code) {
      _tried = code;
      session.emit('room:join', {'code': code}).then((res) {
        if (!res.ok && mounted) setState(() => _joinError = res.error);
      });
    }
    // Oda kapandıysa ana sayfaya dön.
    if (room?.code == code) {
      _wasInRoom = true;
    } else if (_wasInRoom && room == null) {
      _wasInRoom = false;
      WidgetsBinding.instance.addPostFrameCallback((_) => mounted ? context.go('/') : null);
    }
    // Bu oyuna ilk kez giriliyorsa tanıtımı aç.
    final gameId = room?.code == code ? room!.gameId : null;
    if (gameId != null && _guideShownFor != gameId) {
      _guideShownFor = gameId;
      WidgetsBinding.instance.addPostFrameCallback((_) => mounted ? showGuideOnce(context, gameId) : null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    _sync(session);
    final room = session.room;
    final code = widget.code;

    if (_joinError != null) {
      return SPage(
        padTop: 18,
        child: VStack(
          gap: 22,
          children: [
            const TopBar(),
            SCard(
              color: C.paper,
              shadow: Shadows.lg,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
              child: VStack(
                gap: 14,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(code, style: T.d(40, color: C.ink2, letterSpacing: 8)),
                  Text(
                    _joinError!,
                    style: T.b(16, color: C.text2),
                    textAlign: TextAlign.center,
                  ),
                  SButton(label: TrRoom.home, tone: BtnTone.primary, onPressed: () => context.go('/')),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (room == null || room.code != code) {
      return _Waiting(text: session.connection == Connection.offline ? TrRoom.reconnecting : TrRoom.connecting);
    }

    final module = moduleFor(room.gameId);
    if (room.playing) return _Playing(room: room, module: module);
    final standings = room.lastStandings;
    final key = standings == null || standings.isEmpty ? null : standings.map((s) => '${s.playerId}:${s.score}').join(',');
    if (key != null && _resultsSeen != key) {
      return _Results(room: room, onDone: () => setState(() => _resultsSeen = key));
    }
    return _Lobby(room: room, module: module);
  }
}

class _Waiting extends StatelessWidget {
  const _Waiting({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: MediaQuery.sizeOf(context).height * 0.6,
    child: Center(
      child: Semantics(
        liveRegion: true,
        child: Text(
          text,
          style: T.b(16, color: C.text3, weight: FontWeight.w800),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- Lobi

class _Lobby extends StatefulWidget {
  const _Lobby({required this.room, required this.module});
  final RoomState room;
  final GameModule module;

  @override
  State<_Lobby> createState() => _LobbyState();
}

class _LobbyState extends State<_Lobby> {
  bool _busy = false;
  String? _error;
  bool _copied = false;
  bool _chatOpen = false;
  int _seen = 0;
  Timer? _copyTimer;

  @override
  void initState() {
    super.initState();
    _seen = context.read<Session>().chat.length;
  }

  @override
  void dispose() {
    _copyTimer?.cancel();
    super.dispose();
  }

  String get _url => '$publicUrl/r/${widget.room.code}';

  Future<void> _start() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final res = await context.read<Session>().emit('room:start');
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (!res.ok) _error = res.error;
    });
  }

  Future<void> _copyLink() async {
    await Clipboard.setData(ClipboardData(text: _url));
    if (!mounted) return;
    setState(() => _copied = true);
    _copyTimer?.cancel();
    _copyTimer = Timer(const Duration(milliseconds: 1800), () => mounted ? setState(() => _copied = false) : null);
  }

  Future<void> _share(GameInfo game) async {
    final box = context.findRenderObject() as RenderBox?;
    await SharePlus.instance.share(
      ShareParams(
        title: game.name,
        text: '${TrRoom.shareText(game.name)} $_url',
        sharePositionOrigin: box == null ? null : box.localToGlobal(Offset.zero) & box.size,
      ),
    );
  }

  Future<void> _changeGame() async {
    final session = context.read<Session>();
    await showSDialog<void>(
      context,
      builder: (ctx) => GamePicker(
        title: TrPicker.changeTitle,
        current: widget.room.gameId,
        onPick: (id) async {
          Navigator.of(ctx).pop();
          final res = await session.emit('room:game', {'gameId': id});
          if (!res.ok) session.notify(res.error);
        },
      ),
    );
  }

  Future<void> _leave() async {
    await context.read<Session>().emit('room:leave');
    if (mounted) context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final room = widget.room;
    final me = session.profile!;
    final isHost = room.hostId == me.id;
    final game = Catalog.instance.find(room.gameId)!;
    final max = math.min(12, game.maxPlayers);
    final connected = room.players.where((p) => p.connected).length;
    final enough = connected >= game.minPlayers;
    final readyCount = room.players.where((p) => p.ready || p.id == room.hostId).length;
    final myself = room.player(me.id);
    final chat = session.chat;
    if (_chatOpen) _seen = chat.length;
    final unread = chat.skip(math.min(_seen, chat.length)).where((m) => m.playerId != me.id).length;
    final api = GameApi(session.api, room.gameId);

    SettingsPanelProps props(String section) => SettingsPanelProps(
      settings: asJson(room.settings),
      editable: isHost,
      api: api,
      players: room.players,
      meId: me.id,
      section: section,
      onChange: (next) async {
        final res = await session.emit('room:settings', {'settings': next});
        if (!res.ok) session.notify(res.error);
      },
    );

    final upper = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gap(14, [
        TopBar(
          compact: true,
          right: game.guide != null ? SIconButton(text: '?', label: TrGuide.open, onPressed: () => openGuide(context, game.id)) : null,
        ),
        _codeCard(room, game),
        _gameCard(game, isHost),
        _players(room, me.id, isHost, max, readyCount),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: C.panel2,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(20),
          ),
          child: VStack(
            gap: 10,
            children: [
              Text(TrRoom.settings, style: T.d(18, color: C.text, height: 1.05)),
              widget.module.settingsPanel(props('primary')),
              widget.module.settingsPanel(props('secondary')),
            ],
          ),
        ),
      ]),
    );
    // Lobinin alt kısmı ekranın dibinde (CSS: .lobby-spacer { flex: 1 }, gap 14 iki yanda).
    final lower = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gap(14, [
        VStack(
          gap: 8,
          children: [
            if (_error != null)
              Text(
                _error!,
                style: T.b(14, color: C.errorOnDark, weight: FontWeight.w800),
              ),
            if (isHost) ...[
              SButton(
                label: _busy ? TrRoom.starting : TrRoom.start,
                icon: 'play',
                iconSize: 20,
                tone: BtnTone.primary,
                large: true,
                block: true,
                radius: 22,
                shadowY: 7,
                onPressed: !enough || _busy ? null : _start,
              ),
              if (!enough) _note(TrRoom.needPlayers(game.minPlayers)),
            ] else ...[
              SButton(
                label: myself?.ready == true ? TrRoom.notReady : TrRoom.imReady,
                tone: myself?.ready == true ? BtnTone.outline : BtnTone.primary,
                large: true,
                block: true,
                radius: 22,
                shadowY: 7,
                onPressed: () => session.emit('room:ready', {'ready': myself?.ready != true}),
              ),
              _note(TrRoom.waitHost),
            ],
          ],
        ),
        if (_chatOpen)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: C.panel2,
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(20),
            ),
            child: ChatBox(room: room),
          ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            SGhostButton(
              label: TrRoom.chat,
              icon: 'chat',
              onPressed: () => setState(() => _chatOpen = !_chatOpen),
              trailing: !_chatOpen && unread > 0
                  ? Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      decoration: BoxDecoration(color: C.pink, borderRadius: BorderRadius.circular(R.pill)),
                      child: Text(
                        '$unread',
                        style: T.b(12, color: C.ink2, weight: FontWeight.w800),
                      ),
                    )
                  : null,
            ),
            Pressable(
              onTap: _leave,
              label: TrRoom.leave,
              builder: (context, _) => Container(
                constraints: const BoxConstraints(minHeight: 44),
                alignment: Alignment.center,
                child: Text(
                  TrRoom.leave,
                  style: T.b(14, color: C.text3, weight: FontWeight.w800).copyWith(decoration: TextDecoration.underline, decorationColor: C.text3),
                ),
              ),
            ),
          ],
        ),
      ]),
    );
    return SFillPage(padTop: 18, padBottom: 22, gap: 28, top: upper, bottom: lower);
  }

  Widget _note(String text) => Text(
    text,
    style: T.b(14, color: C.text3, weight: FontWeight.w700),
    textAlign: TextAlign.center,
  );

  Widget _codeCard(RoomState room, GameInfo game) {
    const tilts = [-4.0, 3.0, -2.0, 4.0];
    final letters = room.code.split('');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: C.yellow,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(24),
        boxShadow: Shadows.lg,
      ),
      child: VStack(
        gap: 10,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trUpper(TrRoom.codeLabel),
                      style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 2),
                    ),
                    Text(
                      game.name,
                      style: T.d(22, color: C.ink2, height: 1.1),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Semantics(
                label: '${TrRoom.codeLabel}: ${letters.join(' ')}',
                child: Row(
                  children: [
                    for (var i = 0; i < letters.length; i++) ...[
                      if (i > 0) const SizedBox(width: 5),
                      Transform.rotate(
                        angle: deg(tilts[i % 4]),
                        child: Container(
                          width: 40,
                          height: 50,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: i == 3 ? C.pink : C.paper,
                            border: Border.all(color: C.ink, width: bw),
                            borderRadius: BorderRadius.circular(11),
                          ),
                          child: Text(letters[i], style: T.d(30, color: C.ink2)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: SButton(
                  label: _copied ? TrRoom.copyDone : TrRoom.copyLink,
                  icon: _copied ? 'check' : 'link',
                  iconSize: 16,
                  tone: BtnTone.dark,
                  block: true,
                  shadowY: 0,
                  radius: 14,
                  fontSize: 15,
                  gap: 6,
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  onPressed: _copyLink,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: SButton(
                  label: TrRoom.share,
                  icon: 'share',
                  iconSize: 16,
                  tone: BtnTone.primary,
                  block: true,
                  shadowY: 0,
                  radius: 14,
                  fontSize: 16,
                  gap: 6,
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  onPressed: () => _share(game),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _gameCard(GameInfo game, bool isHost) {
    return Transform.rotate(
      angle: deg(-1),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: C.paper,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(R.lg),
        ),
        child: Row(
          children: [
            Transform.rotate(
              angle: deg(-6),
              child: Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: C.yellow,
                  border: Border.all(color: C.ink, width: bw),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: SIcon(game.icon, size: 26, color: C.ink2),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    trUpper(TrRoom.selectedGame),
                    style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5),
                  ),
                  Text(game.name, style: T.d(24, color: C.ink2, height: 1.05)),
                  if (game.guide != null)
                    GestureDetector(
                      onTap: () => openGuide(context, game.id),
                      child: Text(
                        TrGuide.open,
                        style: T.b(13, color: C.violet, weight: FontWeight.w800).copyWith(decoration: TextDecoration.underline, decorationColor: C.violet),
                      ),
                    ),
                ],
              ),
            ),
            if (isHost) ...[
              const SizedBox(width: 12),
              SButton(
                label: TrRoom.change,
                tone: BtnTone.dark,
                minHeight: 44,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                borderWidth: 0,
                radius: 12,
                shadowY: 0,
                fontSize: 14,
                fontFamily: T.font,
                onPressed: _changeGame,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _players(RoomState room, String meId, bool isHost, int max, int readyCount) {
    final session = context.read<Session>();
    return VStack(
      gap: 10,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('${TrRoom.players} ${room.players.length}/$max', style: T.d(22, color: C.text, height: 1.05)),
            Text(
              TrRoom.readyCount(readyCount),
              style: T.b(14, color: C.mint, weight: FontWeight.w800),
            ),
          ],
        ),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: C.panel,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Grid2(
            rowGap: 6,
            columnGap: 10,
            children: [
              for (final p in room.players)
                Opacity(
                  opacity: p.connected ? 1 : 0.6,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 30),
                    child: Row(
                      children: [
                        SAvatar(avatar: p.avatar, nick: p.nick, size: 26, fontSize: 12, dim: !p.connected),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            p.id == meId ? '${p.nick} (${TrRoom.you})' : p.nick,
                            style: T.b(14, color: C.text, weight: FontWeight.w800),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (p.id == room.hostId)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(6)),
                            child: Text(
                              TrRoom.host,
                              style: T.b(10, color: C.yellow, weight: FontWeight.w800),
                            ),
                          )
                        else if (!p.connected)
                          Text(
                            TrRoom.offline,
                            style: T.b(11, color: C.text, weight: FontWeight.w800),
                          )
                        else if (p.ready)
                          Text(
                            TrRoom.ready,
                            style: T.b(11, color: C.text, weight: FontWeight.w800),
                          ),
                        if (isHost && p.id != meId) ...[
                          const SizedBox(width: 6),
                          Pressable(
                            onTap: () => session.emit('room:kick', {'playerId': p.id}),
                            label: '${p.nick}: ${TrRoom.kick}',
                            builder: (context, _) => Container(
                              width: 26,
                              height: 26,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: C.panel2,
                                border: Border.all(color: C.ink, width: 2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const SIcon('close', size: 14, color: C.text),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (room.players.length < max)
          CustomPaint(
            painter: DashedRRectPainter(color: C.violet, radius: 18, strokeWidth: 3),
            child: Padding(
              padding: const EdgeInsets.all(10 + 3),
              child: Text(
                TrRoom.waiting,
                style: T.b(14, color: C.text3, weight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}

/// CSS `display:flex; gap`: boşluk her öğenin arasına, esnek boşluğun (Spacer) iki yanına da girer.
List<Widget> _gap(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

// ---------------------------------------------------------------- Sonuçlar

const _resultsMs = 15000;

/// Oyun sonu ekranı (tasarım: Sonuçlar). Süre dolunca ya da "Lobiye dön" ile lobiye geçer.
class _Results extends StatefulWidget {
  const _Results({required this.room, required this.onDone});
  final RoomState room;
  final VoidCallback onDone;

  @override
  State<_Results> createState() => _ResultsState();
}

class _ResultsState extends State<_Results> with SingleTickerProviderStateMixin {
  late final AnimationController _bar = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: _resultsMs),
  );
  bool _busy = false;
  bool _picking = false;

  @override
  void initState() {
    super.initState();
    _bar.addStatusListener((s) {
      if (s == AnimationStatus.completed && !_picking) widget.onDone();
    });
    _bar.forward();
  }

  @override
  void dispose() {
    _bar.dispose();
    super.dispose();
  }

  Future<void> _rematch() async {
    final session = context.read<Session>();
    setState(() => _busy = true);
    final res = await session.emit('room:start');
    if (!mounted) return;
    setState(() => _busy = false);
    if (!res.ok) session.notify(res.error);
  }

  Future<void> _pickOther() async {
    final session = context.read<Session>();
    setState(() => _picking = true);
    _bar.stop();
    await showSDialog<void>(
      context,
      builder: (ctx) => GamePicker(
        title: TrPicker.changeTitle,
        current: widget.room.gameId,
        onPick: (id) async {
          Navigator.of(ctx).pop();
          final res = await session.emit('room:game', {'gameId': id});
          if (!res.ok) {
            session.notify(res.error);
          } else {
            widget.onDone();
          }
        },
      ),
    );
    if (!mounted) return;
    setState(() => _picking = false);
    if (!_bar.isCompleted) _bar.forward();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final room = widget.room;
    final me = session.profile!;
    final isHost = room.hostId == me.id;
    final game = Catalog.instance.find(room.gameId)!;
    final standings = room.lastStandings ?? const <Standing>[];
    final myself = room.player(me.id);
    final winners = standings.where((s) => s.rank == 1).toList();
    final first = standings.isNotEmpty ? standings[0] : null;
    final second = standings.length > 1 ? standings[1] : null;
    final rest = standings.length > 2 ? standings.sublist(2) : const <Standing>[];
    final half = (rest.length / 2).ceil();
    final cols = [rest.sublist(0, half), rest.sublist(half)];

    return ClipRect(
      child: Stack(
        children: [
          const Positioned.fill(child: SafeArea(child: _Confetti())),
          SPage(
            fill: true,
            padTop: 20,
            padBottom: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      game.name,
                      style: T.b(13, color: C.text3, weight: FontWeight.w800),
                    ),
                    Text(
                      room.code,
                      style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2),
                    ),
                  ],
                ),
                const SizedBox(height: 18 + 18),
                Column(
                  children: [
                    Sticker(
                      trUpper(TrRoom.gameOver),
                      rotate: -3,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      style: T.b(13, color: C.ink2, weight: FontWeight.w800, letterSpacing: 2),
                    ),
                    const SizedBox(height: 6 + 8),
                    Text(
                      winners.length == 1 ? TrRoom.winner(winners[0].nick) : TrRoom.draw,
                      style: T.d(48, color: C.text, height: 0.95),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
                if (first != null) ...[
                  const SizedBox(height: 18),
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: Transform.rotate(
                            angle: deg(-3),
                            child: _ScoreCard(standing: first, color: C.mint, crown: true, shadow: Shadows.lg),
                          ),
                        ),
                        if (second != null) ...[
                          const SizedBox(width: 12),
                          Center(
                            child: Text('–', style: T.d(30, color: C.text3)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Align(
                              alignment: Alignment.bottomCenter,
                              child: Transform.rotate(
                                angle: deg(2),
                                child: _ScoreCard(standing: second, color: C.lilac, second: true),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
                if (rest.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (var c = 0; c < 2; c++) ...[
                        if (c > 0) const SizedBox(width: 10),
                        Expanded(
                          child: cols[c].isEmpty
                              ? const SizedBox()
                              : Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: C.panel,
                                    border: Border.all(color: C.ink, width: bw),
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                  child: VStack(
                                    gap: 8,
                                    children: [
                                      for (final s in cols[c])
                                        Row(
                                          children: [
                                            SAvatar(avatar: s.avatar, nick: s.nick, size: 28),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                s.nick,
                                                style: T.b(15, color: C.text, weight: FontWeight.w800),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            Text(
                                              trNumber(s.score),
                                              style: T.b(15, color: C.yellow, weight: FontWeight.w800),
                                            ),
                                          ],
                                        ),
                                    ],
                                  ),
                                ),
                        ),
                      ],
                    ],
                  ),
                ],
                const SizedBox(height: 18),
                const Spacer(),
                const SizedBox(height: 18),
                AnimatedBuilder(
                  animation: _bar,
                  builder: (context, _) => PillBar(value: _bar.value),
                ),
                const SizedBox(height: 10),
                Text(
                  '${TrRoom.backToLobby} · ${TrRoom.saved}',
                  style: T.b(14, color: C.text2, weight: FontWeight.w800),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                if (isHost)
                  SButton(
                    label: TrRoom.rematch,
                    icon: 'replay',
                    iconSize: 22,
                    tone: BtnTone.primary,
                    block: true,
                    minHeight: 62,
                    radius: 20,
                    shadowY: 6,
                    fontSize: 24,
                    gap: 10,
                    onPressed: _busy ? null : _rematch,
                  )
                else
                  SButton(
                    label: myself?.ready == true ? TrRoom.notReady : TrRoom.imReady,
                    tone: myself?.ready == true ? BtnTone.outline : BtnTone.primary,
                    block: true,
                    minHeight: 62,
                    radius: 20,
                    shadowY: 6,
                    fontSize: 24,
                    gap: 10,
                    onPressed: () => session.emit('room:ready', {'ready': myself?.ready != true}),
                  ),
                const SizedBox(height: 10),
                SButton(
                  label: isHost ? TrRoom.otherGame : TrRoom.toLobby,
                  tone: BtnTone.outline,
                  block: true,
                  minHeight: 52,
                  radius: 18,
                  shadowY: 0,
                  fontSize: 19,
                  onPressed: isHost ? _pickOther : widget.onDone,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.standing, required this.color, this.crown = false, this.second = false, this.shadow});
  final Standing standing;
  final Color color;
  final bool crown;
  final bool second;
  final List<BoxShadow>? shadow;

  static const _crown =
      '<svg width="40" height="28" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
      '<path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="#FFD23F" stroke="#0D0828" stroke-width="3" stroke-linejoin="round" /></svg>';

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: color,
      border: Border.all(color: C.ink, width: 4),
      borderRadius: BorderRadius.circular(26),
      boxShadow: shadow,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (crown) SvgPicture.string(_crown, width: 40, height: 28),
        if (second) const SizedBox(height: 10),
        NoWrapText(trNumber(standing.score), style: T.d(second ? 52 : 64, color: C.ink2)),
        Text(
          standing.nick,
          style: T.b(14, color: C.ink2, weight: FontWeight.w800),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    ),
  );
}

/// Sonuç ekranındaki beş konfeti parçası (sabit).
class _Confetti extends StatelessWidget {
  const _Confetti();

  @override
  Widget build(BuildContext context) {
    final g = Layout.gutter(context);
    final width = MediaQuery.sizeOf(context).width;
    final colWidth = math.min(width, Layout.col + 2 * g);
    final left = (width - colWidth) / 2;
    Widget piece(double w, double h, Color c, double rot, {bool round = false}) => Transform.rotate(
      angle: deg(rot),
      child: Container(
        width: w,
        height: h,
        decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(round ? 99 : 2)),
      ),
    );
    return Stack(
      children: [
        Positioned(top: 50, left: left + 30, child: piece(16, 7, C.yellow, 30)),
        Positioned(top: 90, right: left + 40, child: piece(16, 7, C.pink, -40)),
        Positioned(top: 150, left: left + 64, child: piece(11, 11, C.mint, 20)),
        Positioned(top: 40, right: left + 120, child: piece(11, 11, C.sky, 0, round: true)),
        Positioned(top: 190, right: left + 60, child: piece(16, 7, C.coral, 70)),
      ],
    );
  }
}

// ---------------------------------------------------------------- Oyun

class _Playing extends StatefulWidget {
  const _Playing({required this.room, required this.module});
  final RoomState room;
  final GameModule module;

  @override
  State<_Playing> createState() => _PlayingState();
}

class _PlayingState extends State<_Playing> {
  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final room = widget.room;
    final me = session.profile!;
    final isHost = room.hostId == me.id;
    final view = session.viewFor(room);
    final game = Catalog.instance.find(room.gameId);
    final top = MediaQuery.paddingOf(context).top;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final g = Layout.gutter(context);
    final api = GameApi(session.api, room.gameId);

    Future<Ack> act(Json action) => session.emit('game:action', {'action': action});
    Future<void> setSettings(Json next) async {
      final res = await session.emit('room:settings', {'settings': next});
      if (!res.ok) session.notify(res.error);
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        // Android geri tuşu: oyundan yanlışlıkla çıkılmasın.
        if (await confirmDialog(context, TrRoom.leaveGameConfirm) && context.mounted) {
          context.go('/');
        }
      },
      child: Stack(
        children: [
          Positioned.fill(
            // Oyunların tam ekran katmanları (OverlayPortal) bu Overlay'e çizilir: "?", sohbet ve menü düğmeleri
            // web'deki gibi üstte kalır; platform pencereleri (diyaloglar) yine en üstte.
            child: Overlay.wrap(
              child: SafeArea(
                bottom: false,
                child: LayoutBuilder(
                  builder: (context, viewport) => GameViewport(
                    height: viewport.maxHeight,
                    child: SingleChildScrollView(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: viewport.maxHeight),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (view != null)
                              widget.module.playView(
                                PlayViewProps(
                                  view: asJson(view),
                                  meId: me.id,
                                  room: room,
                                  act: act,
                                  api: api,
                                  settings: asJson(room.settings),
                                  setSettings: setSettings,
                                ),
                              )
                            else
                              const _Waiting(text: TrRoom.starting),
                            if (isHost)
                              Padding(
                                padding: EdgeInsets.fromLTRB(g, 8, g, math.max(16, bottom)),
                                child: Center(
                                  child: SGhostButton(
                                    label: TrRoom.end,
                                    icon: 'flag',
                                    iconSize: 14,
                                    onPressed: () async {
                                      if (await confirmDialog(context, TrRoom.endConfirm)) {
                                        await session.emit('room:lobby');
                                      }
                                    },
                                  ),
                                ),
                              )
                            else
                              SizedBox(height: bottom),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          if (game?.guide != null)
            Positioned(
              top: top + 14,
              right: room.players.length <= 1 ? 14 : 66,
              child: SIconButton(text: '?', label: TrGuide.open, shadow: true, onPressed: () => openGuide(context, room.gameId)),
            ),
          if (room.players.length > 1)
            Positioned(
              top: top + 14,
              right: 14,
              child: _ChatDock(room: room),
            ),
          if (session.connection == Connection.offline)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                color: C.red,
                padding: EdgeInsets.fromLTRB(g, top + 8, g, 8),
                child: Text(
                  TrRoom.reconnecting,
                  style: T.b(13, color: const Color(0xFF1A0505), weight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Oyun sırasında sağ üstte açılıp kapanan sohbet.
class _ChatDock extends StatefulWidget {
  const _ChatDock({required this.room});
  final RoomState room;

  @override
  State<_ChatDock> createState() => _ChatDockState();
}

class _ChatDockState extends State<_ChatDock> {
  bool open = false;
  int seen = 0;

  @override
  void initState() {
    super.initState();
    seen = context.read<Session>().chat.length;
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final chat = session.chat;
    if (open) seen = chat.length;
    final unread = chat.skip(math.min(seen, chat.length)).where((m) => m.playerId != session.profile!.id).length;
    final width = math.min(320.0, MediaQuery.sizeOf(context).width - 28);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Pressable(
              onTap: () => setState(() => open = !open),
              label: TrRoom.chat,
              builder: (context, _) => Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: C.panel,
                  border: Border.all(color: C.ink, width: bw),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: Shadows.sm,
                ),
                child: SIcon(open ? 'close' : 'chat', size: 18, color: C.text),
              ),
            ),
            if (!open && unread > 0)
              Positioned(
                top: -4,
                right: -4,
                child: Container(
                  constraints: const BoxConstraints(minWidth: 20),
                  height: 20,
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: C.pink,
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(R.pill),
                  ),
                  child: Text('$unread', style: T.d(11, color: C.ink2, height: 1)),
                ),
              ),
          ],
        ),
        if (open) ...[
          const SizedBox(height: 10),
          SizedBox(
            width: width,
            child: SCard(
              padding: const EdgeInsets.all(14),
              shadow: Shadows.lg,
              child: ChatBox(room: widget.room, compact: true),
            ),
          ),
        ],
      ],
    );
  }
}

/// Sohbet: liste + mesaj kutusu.
class ChatBox extends StatefulWidget {
  const ChatBox({super.key, required this.room, this.compact = false});
  final RoomState room;
  final bool compact;

  @override
  State<ChatBox> createState() => _ChatBoxState();
}

class _ChatBoxState extends State<ChatBox> {
  final _text = TextEditingController();
  final _scroll = ScrollController();
  int _lastCount = 0;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final t = _text.text.trim();
    if (t.isEmpty) return;
    _text.clear();
    await context.read<Session>().emit('room:chat', {'text': t});
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<Session>().chat;
    final players = {for (final p in widget.room.players) p.id: p};
    if (chat.length != _lastCount) {
      _lastCount = chat.length;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.jumpTo(_scroll.position.maxScrollExtent);
        }
      });
    }
    final gap = widget.compact ? 10.0 : 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Eyebrow(TrRoom.chat),
        SizedBox(height: gap),
        if (chat.isEmpty)
          Text(TrRoom.chatEmpty, style: T.b(13, color: C.text3))
        else
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: widget.compact ? 240 : 180),
            child: ListView.separated(
              controller: _scroll,
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              itemCount: chat.length,
              separatorBuilder: (_, _) => const SizedBox(height: 4),
              itemBuilder: (context, i) {
                final m = chat[i];
                return Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: players[m.playerId]?.nick ?? 'Biri',
                        style: T.b(14, color: C.yellow, weight: FontWeight.w800),
                      ),
                      TextSpan(text: ' ${m.text}'),
                    ],
                  ),
                  style: T.b(14, color: C.text, weight: FontWeight.w700),
                );
              },
            ),
          ),
        SizedBox(height: gap),
        Row(
          children: [
            Expanded(
              child: SInput(
                controller: _text,
                placeholder: TrRoom.chatPlaceholder,
                maxLength: 200,
                minHeight: 44,
                fontSize: 16,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            SButton(label: TrRoom.send, tone: BtnTone.outline, onPressed: _text.text.trim().isEmpty ? null : _send),
          ],
        ),
      ],
    );
  }
}
