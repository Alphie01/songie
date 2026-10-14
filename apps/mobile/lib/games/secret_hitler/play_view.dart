import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'action_panel.dart';
import 'board.dart';
import 'glyphs.dart';
import 'models.dart';
import 'over.dart';
import 'strings.dart';

/// games/secret-hitler/client/PlayView.tsx
///
/// Telefonda (`.sg` < 1100px) yan sütunlar (`.sg-side`: masa, günlük ve oyun içi ayarlar) gizlidir;
/// ortada ekran, masa + günlük (`.sg-mobile-only`) ve nasıl oynanır görünür.
class SecretHitlerPlayView extends StatefulWidget {
  const SecretHitlerPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<SecretHitlerPlayView> createState() => _SecretHitlerPlayViewState();
}

class _SecretHitlerPlayViewState extends State<SecretHitlerPlayView> with WidgetsBindingObserver {
  String? _error;

  /// Rol kartı basılıyken açık (takım arkadaşları da yalnızca bu sırada görünür).
  bool _reveal = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Web'deki `blur`: uygulama arka plana geçince kart kapanır.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && _reveal) setState(() => _reveal = false);
  }

  void _setReveal(bool v) {
    if (_reveal != v && mounted) setState(() => _reveal = v);
  }

  Future<void> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = SecretHitlerView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    String plainNick(String id) => members[id]?.nick ?? '?';
    final isHost = p.room.hostId == p.meId;
    final over = view.phase == 'over';

    // Bu oyuncunun ekranında görebileceği roller: oyun sonunda hepsi, öncesinde yalnızca rol kartı açıkken takım.
    final knownRoles = <String, String>{};
    if (view.roles != null) {
      knownRoles.addAll(view.roles!);
    } else if (_reveal && view.me != null) {
      knownRoles[p.meId] = view.me!.role;
      for (final k in view.me!.known) {
        knownRoles[k.id] = k.role;
      }
    }

    final g = Layout.gutter(context);
    // Orta sütun: en fazla 440.
    final width = math.min(MediaQuery.sizeOf(context).width - 2 * g, Layout.col);
    final showHostBar = isHost && !over && view.waitingFor.isNotEmpty;
    final code = T.b(13, color: over ? C.text3 : ShC.dim, weight: FontWeight.w800, letterSpacing: 2);

    final screen = ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: gapped(12, [
            if (over)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(child: Text(S.name, style: T.b(13, color: C.text3, weight: FontWeight.w800))),
                  Text(p.room.code, style: code),
                ],
              )
            else
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(color: C.lilac, border: Border.all(color: ShC.edge, width: 3), borderRadius: BorderRadius.circular(R.pill)),
                      child: Text(phaseNames[view.phase] ?? '', style: T.d(16, color: C.ink2, height: 1.2)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(p.room.code, style: code),
                ],
              ),
            if (!over) ShTracks(view: view),
            if (over)
              Expanded(child: ShOver(view: view, nick: plainNick, members: members, isHost: isHost, send: _send))
            else
              ShActionPanel(view: view, meId: p.meId, nick: nick, plainNick: plainNick, send: _send),
            if (_error != null) ErrorText(_error!, center: true),
            if (showHostBar) ShHostBar(view: view, room: p.room, nick: plainNick, send: _send),
            if (!over) ShStrip(view: view, members: members, meId: p.meId, knownRoles: knownRoles, width: width),
            if (view.me != null && !over) ...[
              const Spacer(),
              ShRoleCard(view: view, nick: plainNick, reveal: _reveal, setReveal: _setReveal),
            ],
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
          // `.sg-mobile-only`
          VStack(
            gap: 22,
            children: [
              VStack(
                gap: 10,
                children: [
                  Semantics(header: true, child: Text(trUpper(SPlay.table), style: shHeading())),
                  ShSeats(view: view, members: members, meId: p.meId, knownRoles: knownRoles, width: width),
                ],
              ),
              ShLog(view: view, nick: plainNick),
            ],
          ),
          const ShHowTo(),
        ],
      ),
    );

    // `.sh-sky`: oyun sürerken bütün ekranın zemini koyu mor (oyun sonunda normal zemin).
    if (over) return body;
    final screenSize = MediaQuery.sizeOf(context);
    return CustomPaint(painter: _Sky(screenSize.longestSide * 2), child: body);
  }
}

/// `position: fixed; inset: 0` zemin: görünümün dışına taşacak kadar büyük boyanır (kaydırma görünümü kırpar).
class _Sky extends CustomPainter {
  _Sky(this.extent);
  final double extent;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Rect.fromLTRB(-extent, -extent, size.width + extent, size.height + extent), Paint()..color = ShC.bg);
  }

  @override
  bool shouldRepaint(_Sky old) => old.extent != extent;
}
