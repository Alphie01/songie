import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../flavor.dart';
import '../games/catalog.dart';
import '../i18n/tr.dart';
import '../session/session.dart';
import '../ui/dialog.dart';
import '../ui/icons.dart';
import '../ui/page.dart';
import '../ui/tokens.dart';
import '../ui/widgets.dart';
import 'guide.dart';
import 'shell.dart';

const _tilts = [-1.2, 1.0, 0.6, -0.8];

/// apps/web/src/pages/Home.tsx
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  String? _error;
  String? _busy;
  String _cat = 'all';
  bool _codeFocused = false;

  @override
  void initState() {
    super.initState();
    _code.addListener(() => setState(() {}));
    _codeFocus.addListener(() => setState(() => _codeFocused = _codeFocus.hasFocus));
    // İlk girişte platformu ve oyunları tanıt.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) showTourOnce(context);
    });
  }

  @override
  void dispose() {
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final code = _code.text;
    if (code.length != 4) {
      setState(() => _error = TrHome.codeLength);
      return;
    }
    setState(() => _busy = 'join');
    final res = await context.read<Session>().emit('room:join', {'code': code});
    if (!mounted) return;
    setState(() => _busy = null);
    if (res.ok) {
      context.go('/r/$code');
    } else {
      setState(() => _error = res.error);
    }
  }

  Future<void> _create(String gameId, [Object? settings]) async {
    final session = context.read<Session>();
    setState(() {
      _busy = settings != null ? '$gameId:solo' : gameId;
      _error = null;
    });
    final res = await session.emit('room:create', {'gameId': gameId, 'settings': ?settings});
    // Tek başına oyunda lobi beklemesi yok.
    if (res.ok && settings != null) await session.emit('room:start');
    if (!mounted) return;
    setState(() => _busy = null);
    if (res.ok) {
      context.go('/r/${res['code']}');
    } else {
      setState(() => _error = res.error);
    }
  }

  void _pick() {
    showSDialog<void>(
      context,
      builder: (ctx) => GamePicker(
        title: TrPicker.createTitle,
        busy: _busy != null,
        onPick: (id) {
          Navigator.of(ctx).pop();
          _create(id);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final profile = session.profile;
    if (profile == null) return const SizedBox();
    final room = session.room;
    final catalog = Catalog.instance;
    final shown = catalog.games.where((g) => _cat == 'all' || g.category == _cat).toList();

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
          VStack(
            gap: 4,
            children: [
              Text(TrHome.hello(profile.nick), style: T.d(40, color: C.text)),
              Text(TrHome.helloSub, style: T.b(16, color: C.text2, weight: FontWeight.w700)),
            ],
          ),
          _hero(),
          _badges(),
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
          _joinCard(),
          if (Catalog.instance.has('detective')) _feature(),
          _games(shown, catalog),
          _steps(),
          Text(AppFlavor.current.footer ?? TrHome.footer, style: T.b(13, color: C.text3, weight: FontWeight.w700), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _hero() => Container(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 22),
    decoration: BoxDecoration(
      color: C.pink,
      border: Border.all(color: C.ink, width: bw),
      borderRadius: BorderRadius.circular(R.xl),
      boxShadow: Shadows.lg,
    ),
    child: VStack(
      gap: 16,
      children: [
        Text(TrHome.heroTitle, style: T.d(40, color: C.ink2, height: 0.95, letterSpacing: -0.5)),
        Text(TrHome.heroLead, style: T.b(16, color: C.ink2, weight: FontWeight.w700)),
        SButton(label: TrHome.createRoom, icon: 'plus', iconSize: 22, tone: BtnTone.dark, large: true, block: true, onPressed: _pick),
      ],
    ),
  );

  Widget _badges() {
    const colors = [C.mint, C.sky, C.paper];
    const tilts = [-3.0, 2.0, -1.0];
    return Semantics(
      label: TrHome.badgesLabel,
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 8,
        runSpacing: 8,
        children: [
          for (var i = 0; i < TrHome.badges.length; i++)
            Transform.rotate(
              angle: deg(tilts[i]),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(color: colors[i], border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                child: Text(TrHome.badges[i], style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _joinCard() {
    final code = _code.text;
    final canJoin = code.length == 4 && _busy == null;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          decoration: BoxDecoration(
            color: C.yellow,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(26),
            boxShadow: Shadows.lg,
          ),
          child: VStack(
            gap: 12,
            children: [
              Text(TrHome.joinTitle, style: T.d(30, color: C.ink2)),
              FocusRing(
                focused: _codeFocused,
                radius: 18,
                color: C.ink2,
                child: Container(
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
                  child: IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 18),
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
                                  onChanged: (_) => setState(() => _error = null),
                                  inputFormatters: [RoomCodeFormatter()],
                                  cursorColor: C.ink2,
                                  style: T.d(28, color: C.ink2, height: 1.2, letterSpacing: 10),
                                  decoration: InputDecoration(
                                    isCollapsed: true,
                                    border: InputBorder.none,
                                    counterText: '',
                                    hintText: TrHome.codePlaceholder,
                                    hintStyle: T.d(28, color: C.codePlaceholder, height: 1.2, letterSpacing: 10),
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
                            constraints: const BoxConstraints(minHeight: 58),
                            padding: const EdgeInsets.symmetric(horizontal: 22),
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(color: C.ink2, border: Border(left: BorderSide(color: C.ink, width: bw))),
                            child: Text(
                              _busy == 'join' ? TrHome.joining : TrHome.join,
                              style: T.d(20, color: canJoin || _busy == 'join' ? C.text : C.placeholder),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (_error != null)
                Semantics(liveRegion: true, child: Text(_error!, style: T.b(14, color: C.errorOnYellow, weight: FontWeight.w800)))
              else
                Text(TrHome.joinHint, style: T.b(14, color: C.ink2, weight: FontWeight.w700)),
            ],
          ),
        ),
        const Positioned(top: -14, right: 16, child: Sticker(TrHome.joinSticker, color: C.pink, rotate: 5)),
      ],
    );
  }

  Widget _feature() => Opacity(
    opacity: _busy != null ? 0.5 : 1,
    child: Pressable(
      onTap: _busy != null ? null : () => _create('detective'),
      label: TrHome.featureName,
      builder: (context, _) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: C.ink2,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(24),
          boxShadow: Shadows.lg,
        ),
        child: Row(
          children: [
            Transform.rotate(
              angle: deg(-6),
              child: Container(
                width: 72,
                height: 88,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E6C4),
                  border: Border.all(color: const Color(0xFF000000), width: bw),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(6),
                    topRight: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                ),
                child: const SIcon('search', size: 36, color: Color(0xFF2B2116)),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: VStack(
                gap: 4,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: C.sky, borderRadius: BorderRadius.circular(6)),
                    child: Text(TrHome.featureTag, style: T.b(11, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
                  ),
                  Text(TrHome.featureName, style: T.d(24, color: C.text)),
                  Text(TrHome.featureLead, style: T.b(14, color: C.lavenderText, height: 1.35)),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _games(List<GameInfo> shown, Catalog catalog) {
    final g = Layout.gutter(context);
    final columns = MediaQuery.sizeOf(context).width >= 640 ? 3 : 2;
    return VStack(
      gap: 14,
      children: [
        Row(
          children: [
            Expanded(
              child: Text.rich(
                TextSpan(
                  text: '${TrHome.games} ',
                  style: T.d(30, color: C.text),
                  children: [TextSpan(text: '${shown.length}', style: T.d(18, color: C.yellow))],
                ),
              ),
            ),
            const SizedBox(width: 12),
            SGhostButton(label: TrTour.replay, onPressed: () => openTour(context)),
          ],
        ),
        // Kenarlara taşan yatay çip şeridi (uygulamada tek kategori varsa gösterilmez).
        if (catalog.categories.length > 2)
        Transform.translate(
          offset: Offset(-g, 0),
          child: SizedBox(
            width: MediaQuery.sizeOf(context).width,
            height: 4 + 44 + 10 + 4,
            child: ListView(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              padding: EdgeInsets.fromLTRB(g, 4, g, 10),
              children: [
                for (final c in catalog.categories) ...[
                  if (c != catalog.categories.first) const SizedBox(width: 8),
                  _CategoryChip(category: c, selected: _cat == c.id, onTap: () => setState(() => _cat = c.id)),
                ],
              ],
            ),
          ),
        ),
        Grid2(
          columns: columns,
          rowGap: 14,
          columnGap: 14,
          equalHeight: true,
          children: [for (var i = 0; i < shown.length; i++) _tile(shown[i], _tilts[i % 4])],
        ),
      ],
    );
  }

  Widget _tile(GameInfo g, double tilt) {
    final disabled = _busy != null;
    return Transform.rotate(
      angle: deg(tilt),
      child: Container(
        constraints: const BoxConstraints(minHeight: 236),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: catColor(g.category),
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(R.lg),
          boxShadow: Shadows.md,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(alignment: Alignment.centerLeft, child: GameMono(text: g.mono, background: C.paper)),
            const SizedBox(height: 7),
            Text(g.name, style: T.d(19, color: C.ink2)),
            const SizedBox(height: 7),
            Expanded(child: Text(g.pitch, style: T.b(13, color: C.ink2, weight: FontWeight.w700, height: 1.3))),
            const SizedBox(height: 7),
            Opacity(opacity: 0.8, child: Text(g.playersLabel, style: T.b(11, color: C.ink2, weight: FontWeight.w800))),
            const SizedBox(height: 7),
            Row(
              children: [
                if (g.guide != null) ...[
                  Pressable(
                    onTap: () => openGuide(context, g.id),
                    label: '${g.name}: ${TrGuide.open}',
                    builder: (context, _) => Container(
                      width: 40,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                      child: Text('?', style: T.d(20, color: C.ink2)),
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
                Expanded(
                  child: Opacity(
                    opacity: disabled ? 0.5 : 1,
                    child: Pressable(
                      onTap: disabled ? null : () => _create(g.id),
                      label: TrHome.create,
                      builder: (context, _) => Container(
                        constraints: const BoxConstraints(minHeight: 40),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(12)),
                        child: Text(_busy == g.id ? '…' : TrHome.create, style: T.d(16, color: C.text)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (g.soloSettings != null) ...[
              const SizedBox(height: 7),
              Opacity(
                opacity: disabled ? 0.5 : 1,
                child: Pressable(
                  onTap: disabled ? null : () => _create(g.id, g.soloSettings),
                  label: TrHome.solo,
                  builder: (context, _) => Container(
                    constraints: const BoxConstraints(minHeight: 40),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                    child: Text(_busy == '${g.id}:solo' ? '…' : TrHome.solo, style: T.d(14, color: C.ink2)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _steps() {
    const colors = [C.yellow, C.pink, C.mint];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 22),
      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(26)),
      child: VStack(
        gap: 16,
        children: [
          Text(TrHome.stepsTitle, style: T.d(26, color: C.text)),
          for (var i = 0; i < TrHome.steps.length; i++)
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: colors[i], border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(14)),
                  child: Text('${i + 1}', style: T.d(22, color: C.ink2)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(TrHome.steps[i].$1, style: T.b(17, color: C.text, weight: FontWeight.w800)),
                      Text(TrHome.steps[i].$2, style: T.b(14, color: C.lavenderText)),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.category, required this.selected, required this.onTap});
  final GameCategory category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg = selected ? (category.id == 'all' ? C.paper : catColor(category.id)) : C.panel;
    return Pressable(
      onTap: onTap,
      label: category.label,
      selected: selected,
      builder: (context, _) => Transform.rotate(
        angle: deg(selected ? -2 : 0),
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: bg,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(R.pill),
            boxShadow: hardShadow(0, selected ? 4 : 3),
          ),
          child: Text(category.label, style: T.d(16, color: selected ? C.ink2 : C.text)),
        ),
      ),
    );
  }
}

/// Oda kodu: yalnızca A–Z, büyük harf, 4 harf.
/// Oda kodu: yalnızca 4 büyük harf (uygulamaların kendi ana ekranları da kullanır).
class RoomCodeFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.toUpperCase().replaceAll(RegExp('[^A-Z]'), '');
    final cut = text.length > 4 ? text.substring(0, 4) : text;
    return TextEditingValue(text: cut, selection: TextSelection.collapsed(offset: cut.length));
  }
}
