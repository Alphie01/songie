import 'dart:async';

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'howto.dart';
import 'models.dart';
import 'podium.dart';
import 'role_art.dart';
import 'stage.dart';
import 'strings.dart';

/// games/intrigue/client/PlayView.tsx
///
/// Telefonda (`.sg` < 1100px) yan sütunlar (`.sg-side`: masaüstü günlüğü, oyun içi ayarlar ve küçük rol tablosu)
/// gizlidir; ortada ekran, günlük (`.sg-mobile-only`) ve nasıl oynanır görünür.
class IntriguePlayView extends StatefulWidget {
  const IntriguePlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<IntriguePlayView> createState() => _IntriguePlayViewState();
}

class _IntriguePlayViewState extends State<IntriguePlayView> {
  String? _error;

  /// İtiraz sonucu (`Flash`): görünümdeki `flash.seq` görülenden büyükse 4 sn gösterilir.
  FlashView? _flash;
  int _seenFlash = 0;
  Timer? _flashTimer;
  final _flashPortal = OverlayPortalController();

  @override
  void initState() {
    super.initState();
    _seenFlash = asJson(widget.props.view['flash']).integer('seq');
    _flashPortal.show();
  }

  @override
  void didUpdateWidget(IntriguePlayView old) {
    super.didUpdateWidget(old);
    // Web'deki useEffect([view.flash]): yeni görünüm geldikçe önceki kapanma zamanlayıcısı iptal edilir.
    if (!identical(old.props.view['flash'], widget.props.view['flash'])) {
      _flashTimer?.cancel();
      final f = widget.props.view['flash'] is Map ? FlashView.fromJson(asJson(widget.props.view['flash'])) : null;
      if (f != null && f.seq > _seenFlash) {
        _seenFlash = f.seq;
        _flash = f;
        _flashTimer = Timer(const Duration(milliseconds: 4000), () {
          if (mounted) setState(() => _flash = null);
        });
      }
    }
  }

  @override
  void dispose() {
    _flashTimer?.cancel();
    super.dispose();
  }

  Future<bool> _send(Json action) async {
    setState(() => _error = null);
    try {
      final res = await widget.props.act(action);
      if (!res.ok && mounted) setState(() => _error = res.error);
      return res.ok;
    } catch (_) {
      if (mounted) setState(() => _error = SPlay.error);
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = IntrigueView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String? id) => id != null && id.isNotEmpty ? (members[id]?.nick ?? '?') : '?';
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'over') return IntriguePodium(view: view, members: members, meId: p.meId, room: p.room);

    final status = !view.me.inGame
        ? SPlay.spectator
        : !view.me.alive
        ? SPlay.eliminated
        : view.current == p.meId
        ? SPlay.yourTurn
        : SPlay.turnOf(nick(view.current));

    final hostWho = isHost ? _hostDefaultWho(view, members) : null;
    final g = Layout.gutter(context);

    final screen = ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: gapped(12, [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(color: C.lilac, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(R.pill)),
                    child: Text(status, style: T.d(16, color: C.ink2, height: 1.2), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ),
                const SizedBox(width: 10),
                Text(SPlay.deck(view.deckCount), style: T.b(13, color: C.text3, weight: FontWeight.w800)),
              ],
            ),
            _Rivals(view: view, members: members, meId: p.meId),
            KeyedSubtree(
              key: ValueKey('${view.phase}-${view.turn}-${view.window?.id ?? 0}'),
              child: Remaining(
                serverNow: view.serverNow,
                endsAt: view.endsAt,
                builder: (context, remaining) => buildStage(view: view, meId: p.meId, nick: nick, remaining: remaining, send: _send),
              ),
            ),
            if (hostWho != null) _HostDefault(who: nick(hostWho), send: _send),
            if (_error != null) ErrorText(_error!, center: true),
            if (view.me.inGame) ...[const Spacer(), _MyHand(view: view, meId: p.meId)],
          ]),
        ),
      ),
    );

    final body = GameColumn(
      maxWidth: Layout.col + 2 * g,
      top: 72,
      bottom: 24,
      child: VStack(
        gap: 22,
        children: [
          screen,
          _Log(view: view, nick: nick),
          const IgHowTo(),
        ],
      ),
    );

    return OverlayPortal(
      controller: _flashPortal,
      overlayChildBuilder: (context) => _flash == null
          ? const SizedBox.shrink()
          : _FlashOverlay(key: ValueKey(_flash!.seq), flash: _flash!, nick: nick, onOk: () => setState(() => _flash = null)),
      child: body,
    );
  }
}

/// `HostDefault`: bağlantısı kopan ve sırası gelen oyuncu.
String? _hostDefaultWho(IntrigueView view, Map<String, RoomPlayer> members) {
  bool off(String? id) => id != null && id.isNotEmpty && members[id]?.connected == false;
  if (view.phase == 'action' && off(view.current)) return view.current;
  if (view.phase == 'window' && view.window != null) {
    for (final x in view.window!.eligible) {
      if (!view.window!.passed.contains(x) && off(x)) return x;
    }
    return null;
  }
  if (view.phase == 'lose' && off(view.lose?.player)) return view.lose!.player;
  if (view.phase == 'exchange' && off(view.exchanging)) return view.exchanging;
  return null;
}

class _HostDefault extends StatelessWidget {
  const _HostDefault({required this.who, required this.send});
  final String who;
  final Send send;

  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: DashedRRectPainter(color: C.violet, radius: 18, strokeWidth: 3, dash: 6, gap: 3),
    child: Padding(
      padding: const EdgeInsets.all(10 + 3),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 8,
        runSpacing: 8,
        children: [
          Text('${SPlay.hostDefaultHint} ($who)', style: T.b(13, color: C.text3, weight: FontWeight.w700)),
          SButton(label: SPlay.hostDefault, tone: BtnTone.outline, onPressed: () => send({'type': 'hostDefault'})),
        ],
      ),
    ),
  );
}

// ---------- Rakipler ----------

class _Rivals extends StatelessWidget {
  const _Rivals({required this.view, required this.members, required this.meId});
  final IntrigueView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final list = view.players.where((p) => p.id != meId).toList();
    final w = view.window;
    return Semantics(
      label: SPlay.rivals,
      child: Grid2(
        columns: 3,
        rowGap: 8,
        columnGap: 8,
        equalHeight: true,
        children: [
          for (final p in list)
            Builder(
              builder: (context) {
                final m = members[p.id];
                final current = view.current == p.id && p.alive;
                final target = view.pending?.target == p.id && view.phase != 'action';
                final say = w != null && w.eligible.contains(p.id) ? (w.passed.contains(p.id) ? 'passed' : 'deciding') : null;
                final fg = current ? C.ink2 : C.text;
                Widget tile = Container(
                  decoration: BoxDecoration(
                    color: current ? C.yellow : C.panel,
                    border: Border.all(color: target ? C.red : C.ink, width: 3),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Stack(
                    fit: StackFit.passthrough,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Opacity(
                              opacity: m?.connected == false ? 0.6 : 1,
                              child: Text(
                                m?.nick ?? '?',
                                style: T.b(14, color: fg, weight: FontWeight.w800),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                for (var i = 0; i < p.hidden + p.revealed.length; i++) ...[
                                  if (i > 0) const SizedBox(width: 3),
                                  if (i < p.hidden)
                                    CardBack(bordered: !current)
                                  else
                                    RoleCard(role: p.revealed[i - p.hidden], size: CardSize.mini, dead: true),
                                ],
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(p.alive ? SPlay.coins(p.coins) : SPlay.out, style: T.b(12, color: current ? C.ink2 : C.yellow, weight: FontWeight.w800)),
                          ],
                        ),
                      ),
                      if (say != null)
                        Positioned(
                          top: 6,
                          right: 6,
                          child: Semantics(
                            label: say == 'passed' ? SPlay.passedMark : SPlay.decidingMark,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: say == 'passed' ? C.mint : null,
                                border: say == 'passed' ? null : Border.all(color: C.text3, width: 2),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
                if (current) tile = Transform.rotate(angle: deg(-2), child: tile);
                if (!p.alive) tile = Opacity(opacity: 0.5, child: tile);
                return tile;
              },
            ),
        ],
      ),
    );
  }
}

// ---------- El ----------

class _MyHand extends StatelessWidget {
  const _MyHand({required this.view, required this.meId});
  final IntrigueView view;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final revealed = view.player(meId)?.revealed ?? const <String>[];
    final hand = view.me.hand;
    final cards = <(String, bool)>[for (final c in hand) (c.role, false), for (final r in revealed) (r, true)];
    return VStack(
      gap: 12,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Semantics(header: true, child: Text(SPlay.hand, style: T.d(20, color: C.text, height: 1.05)))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
              child: Text(SPlay.coins(view.me.coins), style: T.b(14, color: C.ink2, weight: FontWeight.w800)),
            ),
          ],
        ),
        if (cards.isEmpty)
          Text(SPlay.noHand, style: T.b(13, color: C.inkSoft, weight: FontWeight.w700))
        else
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 4),
            child: Opacity(
              opacity: view.me.alive ? 1 : 0.7,
              child: Grid2(
                rowGap: 12,
                columnGap: 12,
                equalHeight: true,
                children: [
                  for (var i = 0; i < cards.length; i++)
                    Transform.rotate(
                      angle: deg(i.isEven ? -3 : 3),
                      child: Opacity(
                        opacity: cards[i].$2 ? 0.45 : 1,
                        child: Container(
                          constraints: const BoxConstraints(minHeight: 118),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: roleColor(cards[i].$1),
                            border: Border.all(color: C.ink, width: 3),
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: hardShadow(4, 4),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Glyph(role: cards[i].$1, size: 38, color: C.ink2),
                              const SizedBox(height: 6),
                              Text(roleName[cards[i].$1] ?? '', style: T.d(22, color: C.ink2), textAlign: TextAlign.center),
                              const SizedBox(height: 6),
                              Text(
                                cards[i].$2 ? SPlay.out : (roleAbility[cards[i].$1] ?? ''),
                                style: T.b(12, color: C.ink2, weight: FontWeight.w700, height: 1.3),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

// ---------- Günlük ----------

class _Log extends StatelessWidget {
  const _Log({required this.view, required this.nick});
  final IntrigueView view;
  final String Function(String? id) nick;

  Color _color(LogEntry e, int i) {
    if (e.t == 'start') return C.text3;
    if (e.t == 'out' || (e.t == 'challenge' && e.ok == false)) return C.red;
    if (e.t == 'challenge') return C.yellow;
    return i == 0 ? C.text : C.text2;
  }

  @override
  Widget build(BuildContext context) {
    final entries = view.log.reversed.where((e) => e.t != 'turn').toList();
    return VStack(
      gap: 10,
      children: [
        Semantics(header: true, child: Text(trUpper(SPlay.log), style: T.d(12, color: C.text3, letterSpacing: 1.5, height: 1.05))),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 260),
          child: ListView.separated(
            shrinkWrap: true,
            padding: EdgeInsets.zero,
            itemCount: entries.length,
            separatorBuilder: (_, _) => const SizedBox(height: 6),
            itemBuilder: (context, i) {
              final e = entries[i];
              final glyph = e.role != null && (e.t == 'lose' || e.t == 'challenge' || e.t == 'block');
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (glyph) ...[
                    Padding(padding: const EdgeInsets.only(top: 2), child: Glyph(role: e.role!, size: 14, color: C.text3)),
                    const SizedBox(width: 6),
                  ],
                  Expanded(child: Text(logText(e, nick), style: T.b(13, color: _color(e, i), weight: FontWeight.w700, height: 1.4))),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

// ---------- İtiraz sonucu ----------

/// `.ig-overlay`: tam ekran; kart 0,35 sn'de çevrilerek gelir, zemin 0,2 sn'de belirir.
class _FlashOverlay extends StatefulWidget {
  const _FlashOverlay({super.key, required this.flash, required this.nick, required this.onOk});
  final FlashView flash;
  final String Function(String? id) nick;
  final VoidCallback onOk;

  @override
  State<_FlashOverlay> createState() => _FlashOverlayState();
}

class _FlashOverlayState extends State<_FlashOverlay> with TickerProviderStateMixin {
  late final AnimationController _fade = AnimationController(vsync: this, duration: const Duration(milliseconds: 200));
  late final AnimationController _flip = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _fade.value = 1;
      _flip.value = 1;
    } else {
      _fade.forward();
      _flip.forward();
    }
  }

  @override
  void dispose() {
    _fade.dispose();
    _flip.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final f = widget.flash;
    final role = roleName[f.role] ?? '';
    return SizedBox.expand(
      child: Semantics(
        liveRegion: true,
        child: FadeTransition(
          opacity: CurvedAnimation(parent: _fade, curve: Curves.easeOut),
          child: ColoredBox(
            color: const Color(0xDB0F0A2A), // rgb(15 10 42 / 0.86)
            child: Padding(
              padding: const EdgeInsets.all(30),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: gapped(16, [
                  AnimatedBuilder(
                    animation: _flip,
                    builder: (context, child) {
                      final t = Curves.easeOut.transform(_flip.value);
                      return Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.rotationZ(deg(-5))..rotateY(deg(90 * (1 - t))),
                        child: child,
                      );
                    },
                    child: Container(
                      width: 150,
                      height: 200,
                      decoration: BoxDecoration(
                        color: roleColor(f.role),
                        border: Border.all(color: C.ink, width: 4),
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: hardShadow(8, 8),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Glyph(role: f.role, size: 60, color: C.ink2),
                          const SizedBox(height: 8),
                          Text(role, style: T.d(28, color: C.ink2, height: 1.45)),
                        ],
                      ),
                    ),
                  ),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 360),
                    child: Text(
                      f.had ? SPlay.flashTrue(widget.nick(f.claimant), role) : SPlay.flashFalse(widget.nick(f.claimant), role),
                      style: T.d(32, color: C.text, height: 1.05),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 340),
                    child: Text(
                      f.had ? SPlay.flashTrueHint(widget.nick(f.challenger)) : SPlay.flashFalseHint,
                      style: T.b(15, color: C.text2, weight: FontWeight.w700),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  Pressable(
                    onTap: widget.onOk,
                    label: SPlay.ok,
                    builder: (context, _) => Container(
                      constraints: const BoxConstraints(minHeight: 52),
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16)),
                      child: Center(widthFactor: 1, child: Text(SPlay.ok, style: T.d(19, color: C.ink2, height: 1.45))),
                    ),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
