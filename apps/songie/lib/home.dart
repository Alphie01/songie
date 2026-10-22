import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/games/song_guess/models.dart';
import 'package:songie_core/i18n/tr.dart';
import 'package:songie_core/screens/home.dart' show RoomCodeFormatter;
import 'package:songie_core/screens/shell.dart';
import 'package:songie_core/session/api.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/session/storage.dart';
import 'package:songie_core/shared/models.dart';
import 'package:songie_core/shared/text.dart';
import 'package:songie_core/ui/dialog.dart';
import 'package:songie_core/ui/icons.dart';
import 'package:songie_core/ui/page.dart';
import 'package:songie_core/ui/tokens.dart';
import 'package:songie_core/ui/widgets.dart';

import 'strings.dart';

const _gameId = 'song-guess';
const _poolKey = 'songie.home.pool';
const _difficultyKey = 'songie.home.difficulty';

/// Liste kapaklarının sırayla aldığı renkler.
const _coverColors = [C.yellow, C.sky, C.mint, C.coral, C.lilac];

/// Zorluk düğmesinin seçiliyken rengi.
const _levelColors = <String, Color>{'easy': C.mint, 'medium': C.yellow, 'hard': C.coral, 'expert': C.red, 'impossible': C.lilac};

/// "Songie · ana ekran" tasarımı: tek oyun (Şarkıyı Bil) için tek başına / arkadaşlarla başlatma,
/// oda koduyla katılma, liste ve zorluk seçimi, rekorlar.
class SongieHome extends StatefulWidget {
  const SongieHome({super.key, this.initialPools, this.initialStats});

  /// Testler için: sunucuya gitmeden gösterilecek listeler ve rekorlar.
  final List<PoolInfo>? initialPools;
  final ProfileStats? initialStats;

  @override
  State<SongieHome> createState() => _SongieHomeState();
}

class _SongieHomeState extends State<SongieHome> {
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  bool _codeFocused = false;

  /// Oda kurma hatası (düğmelerin altında) ve katılma hatası (kod kartında).
  String? _createError;
  String? _joinError;

  /// solo | friends | join
  String? _busy;

  List<PoolInfo>? _pools;
  ProfileStats? _stats;
  String? _pool;
  String _difficulty = defaultSettings.difficulty;
  Timer? _retry;

  @override
  void initState() {
    super.initState();
    _code.addListener(() => setState(() {}));
    _codeFocus.addListener(() => setState(() => _codeFocused = _codeFocus.hasFocus));
    final storage = context.read<Storage>();
    _pool = storage.getString(_poolKey);
    final d = storage.getString(_difficultyKey);
    if (d != null && difficulties.contains(d)) _difficulty = d;
    _pools = widget.initialPools;
    _stats = widget.initialStats;
    if (_pools == null) unawaited(_loadPools());
    if (_stats == null) unawaited(_loadStats());
  }

  @override
  void dispose() {
    _retry?.cancel();
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  Api get _api => context.read<Session>().api;

  /// Listeler ilk açılışta arka planda dolarken birkaç saniyede bir yeniden istenir (oyun lobisindeki gibi).
  Future<void> _loadPools() async {
    _retry?.cancel();
    try {
      final selected = _pool;
      final res = await _api.get('/api/games/$_gameId/pools${selected != null ? '?selected=${Uri.encodeComponent(selected)}' : ''}');
      if (!mounted) return;
      final all = res.objs('pools').map(PoolInfo.fromJson).toList();
      setState(() => _pools = [for (final c in poolCategories) ...all.where((p) => p.category == c)]);
      if (all.length < 5) _retry = Timer(const Duration(seconds: 3), _loadPools);
    } on Object {
      if (mounted) _retry = Timer(const Duration(seconds: 3), _loadPools);
    }
  }

  Future<void> _loadStats() async {
    try {
      final res = await _api.get('/api/me/stats/$_gameId');
      if (mounted) setState(() => _stats = ProfileStats.fromJson(res));
    } on Object {
      // Rekorlar gelmezse kartlar 0 gösterir.
    }
  }

  /// Seçili liste: kayıtlı seçim listelerde varsa o, yoksa ilk Türkçe liste.
  PoolInfo? get _selected {
    final pools = _pools;
    if (pools == null || pools.isEmpty) return null;
    return pools.where((p) => p.id == _pool).firstOrNull ?? pools.where((p) => p.id == defaultSettings.pools.first).firstOrNull ?? pools.first;
  }

  void _pickPool(PoolInfo p) {
    setState(() => _pool = p.id);
    unawaited(context.read<Storage>().setString(_poolKey, p.id));
  }

  void _pickDifficulty(String d) {
    setState(() => _difficulty = d);
    unawaited(context.read<Storage>().setString(_difficultyKey, d));
  }

  Json _settings({required bool solo}) {
    final base = solo ? asJson(Catalog.instance.find(_gameId)?.soloSettings ?? defaultSettings.toJson()) : defaultSettings.toJson();
    final pool = _selected;
    return {
      ...base,
      if (pool != null) 'pools': [pool.id],
      'difficulty': _difficulty,
    };
  }

  Future<void> _create({required bool solo}) async {
    final session = context.read<Session>();
    setState(() {
      _busy = solo ? 'solo' : 'friends';
      _createError = null;
    });
    final res = await session.emit('room:create', {'gameId': _gameId, 'settings': _settings(solo: solo)});
    // Tek başına oyunda lobi beklemesi yok.
    if (res.ok && solo) await session.emit('room:start');
    if (!mounted) return;
    setState(() => _busy = null);
    if (res.ok) {
      context.go('/r/${res['code']}');
    } else {
      setState(() => _createError = res.error);
    }
  }

  Future<void> _join() async {
    final code = _code.text;
    if (code.length != 4) {
      setState(() => _joinError = TrHome.codeLength);
      return;
    }
    setState(() => _busy = 'join');
    final res = await context.read<Session>().emit('room:join', {'code': code});
    if (!mounted) return;
    setState(() => _busy = null);
    if (res.ok) {
      context.go('/r/$code');
    } else {
      setState(() => _joinError = res.error);
    }
  }

  Future<void> _addList() async {
    final pool = await showSDialog<PoolInfo>(context, builder: (_) => _AddListDialog(api: _api));
    if (pool == null || !mounted) return;
    setState(() => _pools = [...(_pools ?? const <PoolInfo>[]).where((x) => x.id != pool.id), pool]);
    _pickPool(pool);
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final profile = session.profile;
    if (profile == null) return const SizedBox();
    final room = session.room;

    return SPage(
      padTop: 20,
      padBottom: 32,
      child: VStack(
        gap: 22,
        children: [
          TopBar(
            right: Pressable(
              onTap: () => context.go('/profil'),
              label: TrShell.profile,
              builder: (context, _) => SAvatar(avatar: profile.avatar, nick: profile.nick, size: 44),
            ),
          ),
          _Hero(nick: profile.nick),
          if (room != null)
            SButton(
              label: TrHome.backToRoom(room.code),
              icon: 'arrow',
              iconSize: 22,
              trailingIcon: true,
              spaceBetween: true,
              tone: BtnTone.primary,
              large: true,
              block: true,
              minHeight: 60,
              fontSize: 21,
              onPressed: () => context.go('/r/${room.code}'),
            ),
          VStack(
            gap: 12,
            children: [
              _BigButton(
                color: C.yellow,
                icon: const SIcon('play', size: 20, color: C.yellow),
                title: _busy == 'solo' ? TrSongie.starting : TrSongie.solo,
                sub: TrSongie.soloSub,
                onTap: _busy == null ? () => _create(solo: true) : null,
              ),
              _BigButton(
                color: C.mint,
                icon: const SSvg(_friendsIcon, width: 22, height: 22, color: C.mint),
                title: _busy == 'friends' ? TrSongie.starting : TrSongie.friends,
                sub: TrSongie.friendsSub,
                onTap: _busy == null ? () => _create(solo: false) : null,
              ),
              if (_createError != null) Semantics(liveRegion: true, child: Text(_createError!, style: T.b(14, color: C.errorOnDark, weight: FontWeight.w800))),
            ],
          ),
          _joinCard(),
          _lists(),
          _difficultyPicker(),
          _records(),
          const _HowTo(),
          Text(
            AppFlavor.current.footer ?? '',
            style: T.b(13, color: C.text3, weight: FontWeight.w700),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _joinCard() {
    final canJoin = _code.text.length == 4 && _busy == null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(22)),
      child: VStack(
        gap: 10,
        children: [
          Text(TrHome.joinTitle, style: T.d(22, color: C.text)),
          FocusRing(
            focused: _codeFocused,
            radius: 16,
            child: Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(16)),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Center(
                          child: Semantics(
                            label: TrHome.codeLabel,
                            child: TextField(
                              controller: _code,
                              focusNode: _codeFocus,
                              maxLength: 4,
                              autocorrect: false,
                              enableSuggestions: false,
                              textCapitalization: TextCapitalization.characters,
                              textInputAction: TextInputAction.go,
                              onSubmitted: (_) => _join(),
                              onChanged: (_) => setState(() => _joinError = null),
                              inputFormatters: [RoomCodeFormatter()],
                              cursorColor: C.ink2,
                              style: T.d(26, color: C.ink2, height: 1.2, letterSpacing: 10),
                              decoration: InputDecoration(
                                isCollapsed: true,
                                border: InputBorder.none,
                                counterText: '',
                                hintText: TrHome.codePlaceholder,
                                hintStyle: T.d(26, color: C.codePlaceholder, height: 1.2, letterSpacing: 10),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Pressable(
                      onTap: canJoin ? _join : null,
                      label: TrHome.join,
                      builder: (context, _) => Container(
                        constraints: const BoxConstraints(minHeight: 54),
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(color: C.pink, border: Border(left: BorderSide(color: C.ink, width: bw))),
                        child: Text(_busy == 'join' ? TrHome.joining : TrHome.join, style: T.d(19, color: C.ink2)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_joinError != null)
            Semantics(liveRegion: true, child: Text(_joinError!, style: T.b(13, color: C.errorOnDark, weight: FontWeight.w800)))
          else
            Text(TrHome.joinHint, style: T.b(13, color: C.text3, weight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _lists() {
    final pools = _pools;
    final selected = _selected;
    final g = Layout.gutter(context);
    return VStack(
      gap: 12,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(TrSongie.lists, style: T.d(28, color: C.text)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                selected?.name ?? '',
                style: T.b(13, color: C.yellow, weight: FontWeight.w800),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.right,
              ),
            ),
          ],
        ),
        // Kenarlara taşan yatay şerit (margin: 0 -18px).
        Transform.translate(
          offset: Offset(-g, 0),
          child: SizedBox(
            width: MediaQuery.sizeOf(context).width,
            height: 4 + 176 + 12 + 6,
            child: Semantics(
              label: TrSongie.listsLabel,
              child: ListView(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                padding: EdgeInsets.fromLTRB(g, 4 + 4, g, 12),
                children: [
                  if (pools == null)
                    SizedBox(
                      width: 128,
                      child: Center(child: Text(TrSongie.listsLoading, style: T.b(12, color: C.text3, weight: FontWeight.w700), textAlign: TextAlign.center)),
                    )
                  else
                    for (var i = 0; i < pools.length; i++) ...[
                      _ListCard(pool: pools[i], color: _coverColors[i % _coverColors.length], selected: pools[i].id == selected?.id, onTap: () => _pickPool(pools[i])),
                      const SizedBox(width: 12),
                    ],
                  _AddListCard(onTap: _addList),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _difficultyPicker() => VStack(
    gap: 12,
    children: [
      Text(TrSongie.difficulty, style: T.d(28, color: C.text)),
      Semantics(
        label: TrSongie.difficulty,
        child: Row(
          children: [
            for (var i = 0; i < difficulties.length; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: _LevelButton(
                  label: TrSongie.difficultyLabels[difficulties[i]]!,
                  color: _levelColors[difficulties[i]]!,
                  selected: _difficulty == difficulties[i],
                  onTap: () => _pickDifficulty(difficulties[i]),
                ),
              ),
            ],
          ],
        ),
      ),
      Text(TrSongie.difficultyHints[_difficulty]!, style: T.b(13, color: C.text3, weight: FontWeight.w700)),
    ],
  );

  Widget _records() {
    final s = _stats;
    String n(int? v, int pad) => (v ?? 0).toString().padLeft(pad, '0');
    return VStack(
      gap: 12,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(child: Text(TrSongie.records, style: T.d(28, color: C.text))),
            Pressable(
              onTap: () => context.go('/profil'),
              label: TrSongie.profile,
              builder: (context, _) => ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Center(
                  child: Text(
                    TrSongie.profile,
                    style: T.b(14, color: C.yellow, weight: FontWeight.w800).copyWith(decoration: TextDecoration.underline, decorationColor: C.yellow),
                  ),
                ),
              ),
            ),
          ],
        ),
        Grid2(
          columns: 2,
          rowGap: 12,
          columnGap: 12,
          children: [
            _RecordCard(label: TrSongie.bestScore, value: n(s?.bestScore, 4), color: C.yellow, tilt: -1.5),
            _RecordCard(label: TrSongie.bestStreak, value: n(s?.bestStreak, 2), color: C.pink, tilt: 1.5),
            _RecordCard(label: TrSongie.games, value: n(s?.gamesPlayed, 2)),
            _RecordCard(label: TrSongie.wins, value: n(s?.wins, 2)),
          ],
        ),
      ],
    );
  }
}

const _friendsIcon =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.1.7 3.5 2.6 3.5 5.7"/></svg>';

const _discIcon =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>';

/// Pembe tanıtım kartı: "Şarkıyı 0,1 saniyeden bil." + dalga formu + aşama süreleri.
class _Hero extends StatelessWidget {
  const _Hero({required this.nick});
  final String nick;

  static const _bars = [0.26, 0.60, 0.40, 1.0, 0.70, 0.88, 0.35, 0.64, 0.48, 0.22, 0.58, 0.30];

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.hardEdge,
      decoration: BoxDecoration(
        color: C.pink,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(30),
        boxShadow: hardShadow(7, 7),
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 26, 20, 22),
            child: VStack(
              gap: 16,
              children: [
                Text(trUpper(TrSongie.hello(nick)), style: T.b(14, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
                Text(TrSongie.heroTitle, style: T.d(46, color: C.ink2, height: 0.92, letterSpacing: -0.5)),
                ExcludeSemantics(
                  child: SizedBox(
                    height: 56,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        for (var i = 0; i < _bars.length; i++) ...[
                          if (i > 0) const SizedBox(width: 5),
                          Expanded(
                            child: FractionallySizedBox(
                              heightFactor: _bars[i],
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  color: i == 3 ? C.paper : C.ink2,
                                  border: i == 3 ? Border.all(color: C.ink2, width: 2) : null,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                Row(
                  children: [
                    for (var i = 0; i < TrSongie.stages.length; i++) ...[
                      if (i > 0) const SizedBox(width: 4),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          decoration: BoxDecoration(color: i == 0 ? C.ink2 : const Color(0x2E120C2E), borderRadius: BorderRadius.circular(8)),
                          child: Text(
                            TrSongie.stages[i],
                            style: T.b(12, color: i == 0 ? C.yellow : C.ink2, weight: FontWeight.w800, height: 1.2),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                Text(TrSongie.heroLead, style: T.b(15, color: C.ink2, weight: FontWeight.w700, height: 1.4)),
              ],
            ),
          ),
          Positioned(
            top: 14,
            right: 14,
            child: Transform.rotate(
              angle: deg(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.pill)),
                child: Text(TrSongie.free, style: T.b(13, color: C.ink2, weight: FontWeight.w800, height: 1.2)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Tek başına oyna" / "Arkadaşlarla oyna": renkli, alt gölgeli büyük düğme.
class _BigButton extends StatelessWidget {
  const _BigButton({required this.color, required this.icon, required this.title, required this.sub, required this.onTap});
  final Color color;
  final Widget icon;
  final String title;
  final String sub;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      label: title,
      builder: (context, pressed) => Opacity(
        opacity: onTap == null ? 0.6 : 1,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 90),
          transform: Matrix4.translationValues(0, pressed ? 4 : 0, 0),
          constraints: const BoxConstraints(minHeight: 72),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          decoration: BoxDecoration(
            color: color,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(22),
            boxShadow: hardShadow(0, pressed ? 3 : 7),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: const BoxDecoration(color: C.ink2, shape: BoxShape.circle),
                child: icon,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: T.d(24, color: C.ink2, height: 1.05)),
                    Text(sub, style: T.b(13, color: C.ink2, weight: FontWeight.w700, height: 1.05)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Liste kartı: kapak (renkli kare, varsa liste görseli), ad ve şarkı sayısı.
class _ListCard extends StatelessWidget {
  const _ListCard({required this.pool, required this.color, required this.selected, required this.onTap});
  final PoolInfo pool;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onTap,
      label: pool.name,
      selected: selected,
      builder: (context, _) => AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        transform: selected ? (Matrix4.translationValues(0, -4, 0)..rotateZ(deg(-2))) : Matrix4.identity(),
        transformAlignment: Alignment.center,
        width: 128,
        constraints: const BoxConstraints(minHeight: 176),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: selected ? C.paper : C.panel,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(20),
          boxShadow: hardShadow(0, selected ? 6 : 3),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Container(
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: color, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(14)),
                child: pool.cover != null
                    ? Image.network(
                        pool.cover!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: double.infinity,
                        errorBuilder: (_, _, _) => const SSvg(_discIcon, width: 34, height: 34, color: C.ink2),
                      )
                    : const SSvg(_discIcon, width: 34, height: 34, color: C.ink2),
              ),
            ),
            const SizedBox(height: 6),
            Text(pool.name, style: T.d(16, color: fg, height: 1.05), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Opacity(opacity: 0.8, child: Text(TrSongie.songs(pool.trackCount), style: T.b(11, color: fg, weight: FontWeight.w700, height: 1.2))),
          ],
        ),
      ),
    );
  }
}

/// "Liste ekle": kesikli çerçeveli kart.
class _AddListCard extends StatelessWidget {
  const _AddListCard({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: TrSongie.addList,
    builder: (context, _) => CustomPaint(
      painter: const _DashedBorder(color: C.line2, radius: 20, width: bw),
      child: Container(
        width: 128,
        constraints: const BoxConstraints(minHeight: 176),
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: C.panel, shape: BoxShape.circle),
              child: const SIcon('plus', size: 20, color: C.text),
            ),
            const SizedBox(height: 8),
            Text(TrSongie.addList, style: T.d(16, color: C.text, height: 1.1), textAlign: TextAlign.center),
            Text(TrSongie.addListSub, style: T.b(11, color: C.text3, weight: FontWeight.w700, height: 1.1), textAlign: TextAlign.center),
          ],
        ),
      ),
    ),
  );
}

/// `border: 3px dashed`.
class _DashedBorder extends CustomPainter {
  const _DashedBorder({required this.color, required this.radius, required this.width});
  final Color color;
  final double radius;
  final double width;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = width;
    final rect = (Offset.zero & size).deflate(width / 2);
    final path = Path()..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(radius - width / 2)));
    const dash = 9.0;
    const gap = 6.0;
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += dash + gap) {
        canvas.drawPath(metric.extractPath(d, (d + dash).clamp(0, metric.length)), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) => old.color != color || old.radius != radius || old.width != width;
}

/// Zorluk düğmesi: seçiliyken seviyenin renginde ve −3° eğik.
class _LevelButton extends StatelessWidget {
  const _LevelButton({required this.label, required this.color, required this.selected, required this.onTap});
  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: selected,
    builder: (context, _) => AnimatedRotation(
      turns: selected ? -3 / 360 : 0,
      duration: const Duration(milliseconds: 100),
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 2),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? color : C.panel,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(14),
          boxShadow: hardShadow(0, selected ? 4 : 2),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(label, style: T.d(13, color: selected ? C.ink2 : C.text), maxLines: 1),
        ),
      ),
    ),
  );
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({required this.label, required this.value, this.color, this.tilt = 0});
  final String label;
  final String value;

  /// Renkli kart (sert gölgeli); verilmezse koyu panel.
  final Color? color;
  final double tilt;

  @override
  Widget build(BuildContext context) {
    final colored = color != null;
    return Transform.rotate(
      angle: deg(tilt),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color ?? C.panel,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(20),
          boxShadow: colored ? hardShadow(4, 4) : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: T.b(12, color: colored ? C.ink2 : C.text3, weight: FontWeight.w800, letterSpacing: 1, height: 1.3)),
            Text(value, style: T.d(32, color: colored ? C.ink2 : C.text)),
          ],
        ),
      ),
    );
  }
}

class _HowTo extends StatelessWidget {
  const _HowTo();

  static const _colors = [C.yellow, C.pink, C.mint];

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(24)),
    child: VStack(
      gap: 14,
      children: [
        Text(TrSongie.howTo, style: T.d(24, color: C.text)),
        for (var i = 0; i < TrSongie.steps.length; i++)
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: _colors[i], border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(12)),
                child: Text('${i + 1}', style: T.d(20, color: C.ink2)),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(TrSongie.steps[i], style: T.b(15, color: C.text, weight: FontWeight.w700))),
            ],
          ),
      ],
    ),
  );
}

/// Deezer / Spotify linkiyle liste ekleme penceresi; eklenen listeyi döndürür.
class _AddListDialog extends StatefulWidget {
  const _AddListDialog({required this.api});
  final Api api;

  @override
  State<_AddListDialog> createState() => _AddListDialogState();
}

class _AddListDialogState extends State<_AddListDialog> {
  final _url = TextEditingController();

  /// spotify | deezer
  String? _adding;
  String? _error;

  @override
  void initState() {
    super.initState();
    _url.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final url = _url.text.trim();
    setState(() {
      _adding = RegExp('spotify', caseSensitive: false).hasMatch(url) ? 'spotify' : 'deezer';
      _error = null;
    });
    try {
      final res = await widget.api.post('/api/games/$_gameId/pools', {'url': url});
      if (!mounted) return;
      Navigator.of(context).pop(PoolInfo.fromJson(res.obj('pool')));
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } on Object {
      if (mounted) setState(() => _error = TrSongie.addFailed);
    } finally {
      if (mounted) setState(() => _adding = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canAdd = _url.text.trim().isNotEmpty && _adding == null;
    return SDialog(
      body: VStack(
        gap: 12,
        children: [
          Text(TrSongie.addListTitle, style: T.d(28, color: C.ink2)),
          Text(TrSongie.addListLead, style: T.b(15, color: C.ink2, weight: FontWeight.w700)),
          SInput(
            controller: _url,
            placeholder: TrSongie.addListPlaceholder,
            fontSize: 16,
            autofocus: true,
            keyboardType: TextInputType.url,
            textCapitalization: TextCapitalization.none,
            textInputAction: TextInputAction.go,
            onSubmitted: (_) => canAdd ? _add() : null,
          ),
          if (_adding == 'spotify') Text(TrSongie.addingSpotify, style: T.b(13, color: C.inkSoft, weight: FontWeight.w700)),
          if (_error != null) Semantics(liveRegion: true, child: Text(_error!, style: T.b(14, color: C.errorOnPaper, weight: FontWeight.w800))),
        ],
      ),
      footer: Row(
        children: [
          Expanded(
            child: SButton(label: TrSongie.cancel, tone: BtnTone.outline, block: true, onPressed: () => Navigator.of(context).pop()),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: SButton(
              label: _adding != null ? TrSongie.adding : TrSongie.addListButton,
              tone: BtnTone.primary,
              block: true,
              onPressed: canAdd ? _add : null,
            ),
          ),
        ],
      ),
    );
  }
}
