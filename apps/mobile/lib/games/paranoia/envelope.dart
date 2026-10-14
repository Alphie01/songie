part of 'play_view.dart';

/// Zarf: beyaz kart (4px çerçeve, 8/8 gölge), kapak üçgeni, yan çizgiler ve kırmızı mühür.
/// [flap] kapağın dikey ölçeği (açılırken 1 → −0.15, kapağın üst kenarından), [sealT] mühürün kopma ilerlemesi.
class _Envelope extends StatelessWidget {
  const _Envelope({this.small = false, this.seal, this.flap = 1, this.sealT = 0});
  final bool small;
  final String? seal;
  final double flap;
  final double sealT;

  @override
  Widget build(BuildContext context) {
    final w = small ? 260.0 : 300.0;
    final h = small ? 172.0 : 200.0;
    final fold = small ? 96.0 : 110.0;
    final radius = small ? 16.0 : 18.0;
    final sealSize = small ? 48.0 : 56.0;
    return SizedBox(
      width: w,
      height: h,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: C.paper,
          border: Border.all(color: C.ink, width: 4),
          borderRadius: BorderRadius.circular(radius),
          boxShadow: hardShadow(8, 8),
        ),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(radius - 4),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  left: -4,
                  top: -4,
                  width: w,
                  height: h,
                  child: CustomPaint(
                    painter: _EnvelopePainter(w: w, h: h, fold: fold, flap: flap),
                  ),
                ),
                Positioned(
                  top: small ? 78 : 92,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Opacity(
                      opacity: (1 - sealT).clamp(0.0, 1.0),
                      child: Transform.rotate(
                        angle: deg(25 * sealT),
                        child: Transform.scale(
                          scale: 1 + 0.6 * sealT,
                          child: Container(
                            width: sealSize,
                            height: sealSize,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: C.red,
                              shape: BoxShape.circle,
                              border: Border.all(color: C.ink, width: bw),
                            ),
                            child: Text(seal ?? '', style: T.d(26, color: C.ink2, height: 1.45)),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// SVG: kapak `M0 0 L{mid} {fold} L{w} 0` (paper-2, 4px mürekkep, yuvarlak köşe) ve iki yan çizgi (3px).
class _EnvelopePainter extends CustomPainter {
  const _EnvelopePainter({required this.w, required this.h, required this.fold, required this.flap});
  final double w;
  final double h;
  final double fold;
  final double flap;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    // transform-box: fill-box; transform-origin: top → kapağın üst kenarı (y = 0).
    canvas.scale(1, flap);
    final flapPath = Path()
      ..moveTo(0, 0)
      ..lineTo(w / 2, fold)
      ..lineTo(w, 0);
    canvas.drawPath(flapPath, Paint()..color = C.paper2);
    canvas.drawPath(
      flapPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeJoin = StrokeJoin.round
        ..color = C.ink,
    );
    canvas.restore();
    final lines = Path()
      ..moveTo(0, h)
      ..lineTo(w * 0.4, fold - 15)
      ..moveTo(w, h)
      ..lineTo(w * 0.6, fold - 15);
    canvas.drawPath(
      lines,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = C.ink,
    );
  }

  @override
  bool shouldRepaint(_EnvelopePainter old) => old.flap != flap || old.w != w || old.h != h || old.fold != fold;
}

/// Kapalı zarf düğmesi (−4°): ara ara kıpırdar (`pr-wiggle` 2.4s); dokununca kapak katlanır, mühür kopar,
/// zarf aşağı kayıp kaybolur (`pr-env-out` 650ms); sonra [onOpened]. Hareket azaltılınca hemen açılır.
class _EnvelopeButton extends StatefulWidget {
  const _EnvelopeButton({required this.onOpened});
  final VoidCallback onOpened;

  @override
  State<_EnvelopeButton> createState() => _EnvelopeButtonState();
}

class _EnvelopeButtonState extends State<_EnvelopeButton> with TickerProviderStateMixin {
  late final AnimationController _wiggle = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400));
  late final AnimationController _open = AnimationController(vsync: this, duration: const Duration(milliseconds: 650));
  bool _opening = false;
  bool _reduce = false;
  Timer? _timer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduce = MediaQuery.disableAnimationsOf(context);
    if (_reduce) {
      _wiggle.stop();
    } else if (!_opening && !_wiggle.isAnimating) {
      _wiggle.repeat();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _wiggle.dispose();
    _open.dispose();
    super.dispose();
  }

  void _tap() {
    if (_opening) return;
    if (_reduce) {
      widget.onOpened();
      return;
    }
    setState(() => _opening = true);
    _wiggle.stop();
    _open.forward();
    _timer = Timer(const Duration(milliseconds: 650), () {
      if (mounted) widget.onOpened();
    });
  }

  /// `pr-wiggle`: 0–80% −4°, 86% −1°, 92% −6°, 100% −4° (ease-in-out).
  static double _wiggleDeg(double v) {
    double seg(double a, double b, double from, double to) => from + (to - from) * Curves.easeInOut.transform(((v - a) / (b - a)).clamp(0.0, 1.0));
    if (v <= 0.8) return -4;
    if (v <= 0.86) return seg(0.8, 0.86, -4, -1);
    if (v <= 0.92) return seg(0.86, 0.92, -1, -6);
    return seg(0.92, 1, -6, -4);
  }

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: SPlay.openEnvelope,
    child: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _tap,
      // `aria-label` zarfın içeriğinin yerine geçer.
      child: ExcludeSemantics(
        child: AnimatedBuilder(
          animation: Listenable.merge([_wiggle, _open]),
          builder: (context, _) {
            if (!_opening) {
              return Transform.rotate(
                angle: deg(_reduce ? -4 : _wiggleDeg(_wiggle.value)),
                child: const _Envelope(seal: 'S'),
              );
            }
            final ms = _open.value * 650;
            // Kapak 350ms, mühür 250ms (`transition … ease`); zarf %45'ten sonra (`pr-env-out`, ease).
            final flapT = Curves.ease.transform(math.min(1.0, ms / 350));
            final sealT = Curves.ease.transform(math.min(1.0, ms / 250));
            final u = _open.value <= 0.45 ? 0.0 : Curves.ease.transform(((_open.value - 0.45) / 0.55).clamp(0.0, 1.0));
            return Opacity(
              opacity: 1 - u,
              child: Transform.rotate(
                angle: deg(-4 + 4 * u),
                child: Transform.translate(
                  offset: Offset(0, 40 * u),
                  child: Transform.scale(
                    scale: 1 - 0.08 * u,
                    child: _Envelope(seal: 'S', flap: 1 + (-0.15 - 1) * flapT, sealT: sealT),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    ),
  );
}
