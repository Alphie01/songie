import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'glyphs.dart';
import 'models.dart';
import 'strings.dart';

part 'common.dart';
part 'clock.dart';
part 'night.dart';
part 'day.dart';
part 'vote.dart';
part 'role_card.dart';
part 'chat.dart';
part 'end.dart';
part 'info.dart';

/// games/werewolf/client/PlayView.tsx
///
/// Telefonda: üstte tam boy ekran (aşama, saat, aşamanın paneli, sohbetler, rol kartı), altında köy,
/// olay günlüğü, oyundaki roller ve nasıl oynanır. Masaüstündeki yan sütunlar (`sg-side`, kurallar) taşınmaz.
class WerewolfPlayView extends StatefulWidget {
  const WerewolfPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<WerewolfPlayView> createState() => _WerewolfPlayViewState();
}

class _WerewolfPlayViewState extends State<WerewolfPlayView> with WidgetsBindingObserver {
  String? _error;
  int? _errorSession;
  bool _reveal = false;

  /// `usePhaseTotal`: aşamanın toplam süresi, oturum değişince ilk görünümden ölçülür.
  int? _totalSession;
  int _total = 1;

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

  /// Web'de pencere odağı kaybolunca (`blur`) rol kartı kapanır.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) _setReveal(false);
  }

  void _setReveal(bool v) {
    if (_reveal != v && mounted) setState(() => _reveal = v);
  }

  Future<bool> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
    return res.ok;
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = WerewolfView.fromJson(p.view);

    // Yeni oturumda hata silinir.
    if (_errorSession != view.session) {
      _errorSession = view.session;
      _error = null;
    }
    if (_totalSession != view.session) {
      _totalSession = view.session;
      _total = math.max(1, view.endsAt - view.serverNow);
    }

    final time = view.phase == 'night' ? 'night' : (view.phase == 'over' ? 'over' : 'day');
    final over = view.phase == 'over';
    final me = view.me;
    final showCard = me != null && !over;
    if (!showCard) _reveal = false;

    final g = _G(
      view: view,
      meId: p.meId,
      isHost: p.room.hostId == p.meId,
      members: membersOf(p.room),
      send: _send,
      pal: time == 'night' ? _Pal.dark : _Pal.day,
    );

    // Ekranda görünen roller: oyun sonunda hepsi; hayaletse (ayar açıksa) hepsi; yoksa açıklananlar + kart basılıyken kurt dostları.
    final known = <String, Role>{};
    for (final seat in view.seats) {
      if (seat.role != null) known[seat.id] = seat.role!;
    }
    if (view.roles != null) known.addAll(view.roles!);
    if (view.ghost?.roles != null) known.addAll(view.ghost!.roles!);
    if (_reveal && me != null) {
      known[p.meId] = me.role;
      for (final a in me.allies) {
        known[a] = 'wolf';
      }
    }

    final phaseLabel = over
        ? S.phase['over']!
        : (view.day > 0 ? '${S.phase[view.phase]} · ${view.phase == 'night' ? SPlay.night(view.day) : SPlay.day(view.day)}' : S.phase[view.phase]!);

    final screen = <Widget>[
      if (over) _TopPlain(code: p.room.code) else _Top(label: phaseLabel, code: p.room.code, pal: g.pal),
      if (!over) _Clock(g: g, total: _total),
      ..._stage(g),
      if (me != null && me.wolfChat != null && me.alive && view.phase == 'night')
        _Chat(
          g: g,
          title: SPlay.wolfChat,
          hint: SPlay.wolfChatHint,
          ghost: false,
          messages: me.wolfChat!,
          onSend: (text) => _send({'type': 'wolfChat', 'text': text}),
        ),
      if (_error != null) Semantics(liveRegion: true, child: ErrorText(_error!, center: true)),
      if (view.ghost != null && !over) _Ghosts(g: g),
      if (showCard) ...[const Spacer(), _RoleCard(g: g, reveal: _reveal, onReveal: _setReveal)],
    ];

    final gutter = Layout.gutter(context);
    final h = MediaQuery.sizeOf(context).height;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(left: 0, right: 0, top: -h, bottom: -h, child: _Sky(night: time == 'night', extent: h)),
        GameColumn(
          maxWidth: 440 + 2 * gutter,
          bottom: 24,
          child: VStack(
            gap: 22,
            children: [
              // `.ww-screen`: ilk ekran tam boy, rol kartı altta.
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
                child: IntrinsicHeight(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: _gapCol(14, screen)),
                ),
              ),
              // `.sg-mobile-only`
              VStack(
                gap: 22,
                children: [
                  _Village(g: g, known: known),
                  _Log(g: g),
                  _InGame(g: g),
                ],
              ),
              _HowTo(g: g),
            ],
          ),
        ),
      ],
    );
  }
}

/// `Stage`: aşamaya göre ekranın ortası.
List<Widget> _stage(_G g) {
  final view = g.view;
  final dawn = view.lastNight != null && view.lastNight!.night == view.day;
  return switch (view.phase) {
    'night' => [_Night(g: g)],
    'hunter' => [if (dawn) _Dawn(g: g), _Hunter(g: g)],
    'discuss' => [if (dawn) _Dawn(g: g), _Discuss(g: g)],
    'vote' => [_Vote(g: g)],
    'verdict' => [if (view.lastVote != null) _Verdict(g: g)],
    'over' => [Expanded(child: _Over(g: g))],
    _ => const <Widget>[],
  };
}

/// Ortak bağlam: görünüm, oyuncular, eylem gönderme ve gece/gündüz renkleri.
class _G {
  const _G({required this.view, required this.meId, required this.isHost, required this.members, required this.send, required this.pal});
  final WerewolfView view;
  final String meId;
  final bool isHost;
  final Map<String, RoomPlayer> members;
  final Future<bool> Function(Json action) send;
  final _Pal pal;

  /// Kendisi için "sen".
  String nick(String id) => id == meId ? SPlay.you : plainNick(id);
  String plainNick(String id) => members[id]?.nick ?? '?';

  SeatView? seat(String id) {
    for (final s in view.seats) {
      if (s.id == id) return s;
    }
    return null;
  }

  List<SeatView> get alive => view.seats.where((x) => x.alive).toList();
}

/// `.ww` değişkenleri: gündüz platformun moru, gece koyu gök.
class _Pal {
  const _Pal({required this.night, required this.card, required this.edge, required this.soft, required this.dim, required this.ring, required this.disc});
  final bool night;

  /// --ww-card
  final Color card;

  /// --ww-edge
  final Color edge;

  /// --ww-soft
  final Color soft;

  /// --ww-dim
  final Color dim;

  /// --ww-ring
  final Color ring;

  /// --ww-disc
  final Color disc;

  static const day = _Pal(night: false, card: C.panel, edge: C.ink, soft: C.line2, dim: C.text3, ring: C.yellow, disc: C.panel2);
  static const dark = _Pal(night: true, card: _nightCard, edge: Color(0xFF000000), soft: Color(0xFF3A2E80), dim: Color(0xFF8A80B8), ring: _moon, disc: _nightCard);
}

const _nightSky = Color(0xFF0F0A2A);
const _nightCard = Color(0xFF221A4D);
const _moon = Color(0xFFFFE680);
const _moonShade = Color(0xFFE8C64A);
const _wolfPick = Color(0xFF3A1A3A);

/// `.ww-sky`: gece ekranı kaplayan koyu gök ve üç yıldız (1.2 sn'de belirir). Web'de `position: fixed`;
/// burada içeriğin üstüne ve altına taşarak kaydırılan alanın tamamını kaplar, yıldızlar ekranda sabit kalır.
class _Sky extends StatefulWidget {
  const _Sky({required this.night, required this.extent});
  final bool night;

  /// Gök, oyun alanının üstüne ve altına bu kadar taşar.
  final double extent;

  @override
  State<_Sky> createState() => _SkyState();
}

class _SkyState extends State<_Sky> {
  ScrollPosition? _position;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final pos = Scrollable.maybeOf(context)?.position;
    if (pos != _position) {
      _position?.removeListener(_onScroll);
      _position = pos?..addListener(_onScroll);
    }
  }

  void _onScroll() {
    if (widget.night && mounted) setState(() {});
  }

  @override
  void dispose() {
    _position?.removeListener(_onScroll);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pos = _position;
    final scrolled = pos != null && pos.hasPixels ? pos.pixels : 0.0;
    final top = widget.extent + scrolled;
    Widget star(double size, Color color) => Container(width: size, height: size, decoration: BoxDecoration(color: color, shape: BoxShape.circle));
    return IgnorePointer(
      child: AnimatedOpacity(
        opacity: widget.night ? 1 : 0,
        duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 1200),
        curve: Curves.ease,
        child: Stack(
          children: [
            const Positioned.fill(child: ColoredBox(color: _nightSky)),
            Positioned(top: top + 142, left: 30, child: star(4, _moon)),
            Positioned(top: top + 192, right: 50, child: star(5, C.paper)),
            Positioned(top: top + 272, left: 60, child: star(3, C.lilac)),
          ],
        ),
      ),
    );
  }
}

/// `.ww-top`: aşama hapı + oda kodu.
class _Top extends StatelessWidget {
  const _Top({required this.label, required this.code, required this.pal});
  final String label;
  final String code;
  final _Pal pal;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Flexible(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(color: C.lilac, border: Border.all(color: pal.edge, width: 3), borderRadius: BorderRadius.circular(R.pill)),
          child: Text(label, style: T.d(16, color: C.ink2, height: 1.2)),
        ),
      ),
      const SizedBox(width: 10),
      Text(code, style: T.b(13, color: pal.dim, weight: FontWeight.w800, letterSpacing: 2)),
    ],
  );
}

/// `.ww-top-plain`: oyun sonunda oyun adı + oda kodu.
class _TopPlain extends StatelessWidget {
  const _TopPlain({required this.code});
  final String code;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(S.name, style: T.b(13, color: C.text3, weight: FontWeight.w800)),
      Text(code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
    ],
  );
}
