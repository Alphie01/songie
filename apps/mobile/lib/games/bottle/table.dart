part of 'play_view.dart';

/// Şişe (BottleSvg): sarı kapak, nane gövde, beyaz etiket.
const _bottleSvg =
    '<svg viewBox="0 0 54 170" xmlns="http://www.w3.org/2000/svg">'
    '<rect x="19" y="4" width="16" height="14" rx="3" fill="#FFD23F" stroke="#0D0828" stroke-width="3" />'
    '<path d="M21 18h12v26c0 6 15 14 15 30v82a10 10 0 0 1-10 10H16a10 10 0 0 1-10-10V74c0-16 15-24 15-30z" '
    'fill="#3EE0A8" stroke="#0D0828" stroke-width="3.5" stroke-linejoin="round" />'
    '<rect x="12" y="96" width="30" height="34" rx="4" fill="#FFFFFF" stroke="#0D0828" stroke-width="3" />'
    '</svg>';

/// Masanın yeşil çuhası (`--bt-felt`, iç halka `--bt-felt-ring`).
const _felt = Color(0xFF1E7A5A);
const _feltRing = Color(0xFF17654A);

double _easeOut(double t) => 1 - math.pow(1 - t, 4).toDouble();

/// `.bt-table`: kare masa (en fazla 330px, ekran boyuna göre küçülür), çevresinde koltuklar, ortada şişe.
class _Table extends StatelessWidget {
  const _Table({required this.view, required this.members, required this.meId, required this.offset});
  final BottleView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final int offset;

  @override
  Widget build(BuildContext context) {
    final vh = viewportHeight(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        // width: min(330px, 100%, max(240px, 100dvh - 430px))
        final size = math.min(330.0, math.min(constraints.maxWidth, math.max(240.0, vh - 430)));
        final n = view.seats.length;
        final many = n > 10;
        final mid = !many && n > 7;
        final seat = many ? 34.0 : (mid ? 42.0 : 50.0);
        final seatWidth = many ? 52.0 : (mid ? 62.0 : 72.0);
        final ringScale = many ? 0.68 : (mid ? 0.84 : 1.0);
        final nameSize = many ? 10.5 : 12.0;
        final showTarget = view.phase != 'spin' && view.phase != 'spinning';
        return Center(
          child: SizedBox(
            width: size,
            height: size,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned.fill(
                  child: Padding(
                    padding: EdgeInsets.all(size * 0.106),
                    child: Container(
                      decoration: BoxDecoration(
                        color: _felt,
                        shape: BoxShape.circle,
                        border: Border.all(color: C.ink, width: 4),
                        boxShadow: hardShadow(0, 8),
                      ),
                      // box-shadow: inset 0 0 0 10px var(--bt-felt-ring)
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: _feltRing, width: 10),
                        ),
                      ),
                    ),
                  ),
                ),
                for (var i = 0; i < n; i++)
                  Builder(
                    builder: (context) {
                      final id = view.seats[i];
                      final a = seatAngle(i, n) * math.pi / 180;
                      final p = members[id];
                      final isTarget = showTarget && view.targetId == id;
                      return Positioned(
                        left: size * (0.5 + 0.424 * math.sin(a)) - seatWidth / 2,
                        top: size * (0.5 - 0.424 * math.cos(a)) - seat / 2,
                        width: seatWidth,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _SeatRing(
                              target: isTarget,
                              spinner: view.spinnerId == id,
                              baseScale: ringScale,
                              child: p != null
                                  ? SAvatar(avatar: p.avatar, nick: p.nick, size: 50, dim: !p.connected)
                                  : const DashedBox(color: C.line2, radius: 25, width: 3, padding: EdgeInsets.zero, child: SizedBox(width: 44, height: 44)),
                            ),
                            SizedBox(height: isTarget ? 2 + 6 : 2),
                            Text(
                              p != null ? (id == meId ? SPlay.you : p.nick) : '?',
                              style: T.b(nameSize, color: p?.connected == true ? C.text : C.text3, weight: FontWeight.w800, height: 1.2),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                Positioned(
                  left: size * (0.5 - 0.0695),
                  top: size * 0.273,
                  width: size * 0.139,
                  height: size * 0.455,
                  child: _Bottle(view: view, offset: offset, width: size * 0.139, height: size * 0.455),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// `.bt-seat-ring`: avatar; sırası gelende sarı nokta, şişenin gösterdiğinde beyaz halka ve büyüme
/// (`bt-pop` 420ms; halka ve ölçek 300ms geçişli).
class _SeatRing extends StatefulWidget {
  const _SeatRing({required this.target, required this.spinner, required this.baseScale, required this.child});
  final bool target;
  final bool spinner;
  final double baseScale;
  final Widget child;

  @override
  State<_SeatRing> createState() => _SeatRingState();
}

class _SeatRingState extends State<_SeatRing> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, value: 1);
  double _from = 1;
  double _to = 1;
  Curve _curve = Curves.ease;
  bool _started = false;

  double get _scale => _from + (_to - _from) * _curve.transform(_c.value);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (!widget.target) return;
    if (MediaQuery.disableAnimationsOf(context)) {
      _from = _to = 1.15;
    } else {
      _pop();
    }
  }

  @override
  void didUpdateWidget(_SeatRing old) {
    super.didUpdateWidget(old);
    if (old.target == widget.target) return;
    if (!widget.target) {
      _animate(_scale, 1, const Duration(milliseconds: 300), Curves.ease);
    } else if (MediaQuery.disableAnimationsOf(context)) {
      _animate(_scale, 1.15, const Duration(milliseconds: 300), Curves.ease);
    } else {
      _pop();
    }
  }

  void _pop() => _animate(0.9, 1.15, const Duration(milliseconds: 420), const Cubic(0.2, 0.9, 0.3, 1.4));

  void _animate(double from, double to, Duration duration, Curve curve) {
    _from = from;
    _to = to;
    _curve = curve;
    _c.duration = duration;
    _c.forward(from: 0);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (context, child) => Transform.scale(scale: widget.baseScale * _scale, child: child),
    child: TweenAnimationBuilder<double>(
      tween: Tween(end: widget.target ? 1 : 0),
      duration: const Duration(milliseconds: 300),
      curve: Curves.ease,
      builder: (context, t, child) => DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: t > 0
              ? [
                  BoxShadow(
                    color: C.paper.withValues(alpha: t),
                    spreadRadius: 5 * t,
                  ),
                ]
              : null,
        ),
        child: child,
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          widget.child,
          if (widget.spinner)
            Positioned(
              top: -3,
              right: -3,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: C.yellow,
                  shape: BoxShape.circle,
                  border: Border.all(color: C.ink, width: bw),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

/// `.bt-bottle`: sunucunun verdiği başlangıç, süre ve açılarla döner (ease-out⁴); herkes aynı anda aynı yerde durur.
/// Hareket azaltılınca başlangıç açısında bekler, süre bitince son açıya geçer.
class _Bottle extends StatefulWidget {
  const _Bottle({required this.view, required this.offset, required this.width, required this.height});
  final BottleView view;
  final int offset;
  final double width;
  final double height;

  @override
  State<_Bottle> createState() => _BottleState();
}

class _BottleState extends State<_Bottle> with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  Timer? _timer;
  double _deg = 0;
  bool _done = true;

  bool get _spinning => widget.view.phase == 'spinning' && widget.view.spin != null;
  int _serverNow() => _nowMs() + widget.offset;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(_Bottle old) {
    super.didUpdateWidget(old);
    final a = old.view;
    final b = widget.view;
    if (a.phase != b.phase || a.spin != b.spin || a.restDeg != b.restDeg || old.offset != widget.offset) _sync();
  }

  void _sync() {
    _ticker.stop();
    _timer?.cancel();
    final spin = widget.view.spin;
    if (!_spinning || spin == null) {
      _deg = widget.view.restDeg;
      return;
    }
    if (MediaQuery.disableAnimationsOf(context)) {
      _deg = spin.fromDeg;
      final wait = math.max(0, spin.startAt + spin.durationMs - _serverNow());
      _timer = Timer(Duration(milliseconds: wait), () {
        if (mounted) setState(() => _deg = spin.toDeg);
      });
      return;
    }
    _frame(spin);
    if (!_done) _ticker.start();
  }

  void _frame(SpinInfo spin) {
    final t = spin.durationMs > 0 ? ((_serverNow() - spin.startAt) / spin.durationMs).clamp(0.0, 1.0) : 1.0;
    _deg = spin.fromDeg + (spin.toDeg - spin.fromDeg) * _easeOut(t);
    _done = t >= 1;
  }

  void _tick(Duration _) {
    final spin = widget.view.spin;
    if (spin == null) {
      _ticker.stop();
      return;
    }
    setState(() => _frame(spin));
    if (_done) _ticker.stop();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Transform.rotate(
      angle: deg(_deg),
      // viewBox 54×170, `preserveAspectRatio` varsayılanı: ortalı sığdır.
      child: SSvg(_bottleSvg, width: widget.width, height: widget.height),
    ),
  );
}
