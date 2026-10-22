part of 'play_view.dart';

/* Yarım daire kadran (tasarım: 340×182 görünüm, merkez 170/170, yarıçap 160). 0 = sol uç, 100 = sağ uç. */
const _vw = 340.0;
const _vh = 182.0;
const _cx = 170.0;
const _cy = 170.0;
const _r = 160.0;

/* Tasarımda ibre ve göbek HTML öğesi (354×190 kutuda); aynı ölçüler görünüm birimine çevrildi. */
const _k = 182 / 190;
const _needleW = 8 * _k;
const _needleH = 150 * _k;
const _needleB = 2 * _k;
const _hubD = 32 * _k;
const _hubB = 4 * _k;
const _hubCy = (190 + 3 - 16) * _k;

/// `--fq-band-2`, `--fq-hatch`
const _band2 = Color(0xFFFFE680);
const _hatch = Color(0xFF4A3AA0);

double _clampDial(double v) => math.min(dialMax, math.max(dialMin, v));

Offset _point(double v, double r) {
  final a = math.pi * (1 - v / 100);
  return Offset(_cx + r * math.cos(a), _cy - r * math.sin(a));
}

/// Merkezden r yarıçaplı, v1–v2 arası dilim.
Path _wedge(double v1, double v2, double r) => Path()
  ..moveTo(_cx, _cy)
  ..lineTo(_point(v1, r).dx, _point(v1, r).dy)
  ..arcToPoint(_point(v2, r), radius: Radius.circular(r))
  ..close();

Path _half() => Path()
  ..moveTo(_cx - _r, _cy)
  ..arcToPoint(const Offset(_cx + _r, _cy), radius: const Radius.circular(_r))
  ..close();

Path _arc() => Path()
  ..moveTo(_cx - _r, _cy)
  ..arcToPoint(const Offset(_cx + _r, _cy), radius: const Radius.circular(_r));

Paint _stroke(Color color, double width) => Paint()
  ..color = color
  ..style = PaintingStyle.stroke
  ..strokeWidth = width;

/// Kadran yüzü: hedef bantları, taralı perde, kenar, ibre ve göbek (Dial.tsx'teki SVG).
class _DialPainter extends CustomPainter {
  _DialPainter({required this.angle, required this.target, required this.curtain, required this.turn});

  /// İbre açısı (derece): −90 sol uç, 90 sağ uç.
  final double angle;
  final double? target;

  /// Perde çizilsin mi.
  final bool curtain;

  /// Perdenin dönüşü: 0 (kapalı) … 1 (180°, görünmez).
  final double turn;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / _vw, size.height / _vh);
    final half = _half();
    canvas.drawPath(half, Paint()..color = C.ink2);
    canvas.drawPath(half, _stroke(C.ink, 4));

    canvas.save();
    canvas.clipPath(half);
    final t = target;
    if (t != null) {
      // Hedef bölgesi: 2-3-4-3-2 bantları, kadran uçlarında kırpılır.
      for (final b in bands.reversed) {
        final color = switch (b.points) {
          2 => _band2,
          3 => C.coral,
          _ => C.red,
        };
        canvas.drawPath(_wedge(_clampDial(t - b.maxDistance), _clampDial(t + b.maxDistance), _r), Paint()..color = color);
      }
    }
    if (curtain && turn < 1) {
      // Perde kadranın merkezinden dönerek aşağı iner; desen (45° çizgiler) perdeyle birlikte döner.
      canvas.save();
      canvas.translate(_cx, _cy);
      canvas.rotate(math.pi * turn);
      canvas.translate(-_cx, -_cy);
      canvas.clipPath(half);
      canvas.drawPath(half, Paint()..color = C.panel);
      canvas.rotate(math.pi / 4);
      final line = Paint()..color = _hatch;
      for (var x = -400.0; x < 400; x += 10) {
        canvas.drawRect(Rect.fromLTWH(x, -400, 4, 800), line);
      }
      canvas.restore();
    }
    canvas.restore();

    canvas.drawPath(_arc(), _stroke(C.ink, 4));

    canvas.save();
    canvas.translate(_cx, _cy);
    canvas.rotate(angle * math.pi / 180);
    canvas.translate(-_cx, -_cy);
    final needle = RRect.fromRectAndRadius(
      Rect.fromLTWH(_cx - _needleW / 2 + _needleB / 2, _cy - _needleH + _needleB / 2, _needleW - _needleB, _needleH - _needleB),
      const Radius.circular(6 * _k - _needleB / 2),
    );
    canvas.drawRRect(needle, Paint()..color = C.paper);
    canvas.drawRRect(needle, _stroke(C.ink, _needleB));
    canvas.restore();

    const hubR = (_hubD - _hubB) / 2;
    canvas.drawCircle(const Offset(_cx, _hubCy), hubR, Paint()..color = C.yellow);
    canvas.drawCircle(const Offset(_cx, _hubCy), hubR, _stroke(C.ink, _hubB));
    canvas.restore();
  }

  @override
  bool shouldRepaint(_DialPainter old) => old.angle != angle || old.target != target || old.curtain != curtain || old.turn != turn;
}

/// Kadran yüzü ve uç etiketleri. Sürüklenebilirken parmak kadranda kaldıkça sayfa kaymaz
/// (`touch-action: none` + pointer capture); kaydırıcı (`input[type=range]`) ayrıca PhasePanel'de.
class _Dial extends StatefulWidget {
  const _Dial({
    required this.value,
    required this.card,
    required this.target,
    required this.curtain,
    required this.curtainKey,
    required this.editable,
    required this.onChange,
  });
  final double value;
  final SpectrumCard? card;

  /// Bilinen hedef (medyum ya da açıklama).
  final double? target;

  /// closed (hedef gizli) | opening (açıklama) | none (medyum)
  final String curtain;
  final int curtainKey;
  final bool editable;
  final void Function(double value, bool done) onChange;

  @override
  State<_Dial> createState() => _DialState();
}

class _DialState extends State<_Dial> with SingleTickerProviderStateMixin {
  static const _openCurve = Cubic(0.65, 0, 0.25, 1);
  late final AnimationController _open = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));
  final _face = GlobalKey();
  Timer? _delay;
  bool _dragging = false;
  bool _active = false;
  Offset? _last;

  @override
  void initState() {
    super.initState();
    if (widget.curtain == 'opening') _startOpening();
  }

  @override
  void didUpdateWidget(_Dial old) {
    super.didUpdateWidget(old);
    if (widget.curtain == 'opening') {
      if (old.curtain != 'opening' || old.curtainKey != widget.curtainKey) _startOpening();
    } else {
      _delay?.cancel();
      _open.value = 0;
    }
  }

  /// `fq-open 1100ms cubic-bezier(0.65, 0, 0.25, 1) 250ms both`
  void _startOpening() {
    _delay?.cancel();
    _open.value = 0;
    _delay = Timer(const Duration(milliseconds: 250), () {
      if (mounted) _open.forward(from: 0);
    });
  }

  @override
  void dispose() {
    _delay?.cancel();
    _open.dispose();
    super.dispose();
  }

  double _valueAt(Offset local) {
    final size = (_face.currentContext?.findRenderObject() as RenderBox?)?.size;
    if (size == null || size.isEmpty) return widget.value;
    final x = local.dx / size.width * _vw - _cx;
    final y = _cy - local.dy / size.height * _vh;
    var a = math.atan2(math.max(y, 0), x);
    if (y < 0) a = x < 0 ? math.pi : 0;
    return (_clampDial(100 * (1 - a / math.pi)) * 10).round() / 10;
  }

  void _down(PointerDownEvent e) {
    if (!widget.editable) return;
    _dragging = true;
    _last = e.localPosition;
    setState(() => _active = true);
    widget.onChange(_valueAt(e.localPosition), false);
  }

  void _move(PointerMoveEvent e) {
    if (!_dragging) return;
    _last = e.localPosition;
    widget.onChange(_valueAt(e.localPosition), false);
  }

  void _up(Offset? position) {
    if (!_dragging) return;
    _dragging = false;
    setState(() => _active = false);
    widget.onChange(_valueAt(position ?? _last ?? Offset.zero), true);
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    final angle = -90 + (widget.value / 100) * 180;
    final card = widget.card;
    final face = RawGestureDetector(
      // Kadranda başlayan dokunuş sayfayı kaydırmaz: jest yarışmasını hemen kazan.
      gestures: {EagerGestureRecognizer: GestureRecognizerFactoryWithHandlers<EagerGestureRecognizer>(EagerGestureRecognizer.new, (_) {})},
      behavior: HitTestBehavior.opaque,
      child: Listener(
        behavior: HitTestBehavior.opaque,
        onPointerDown: _down,
        onPointerMove: _move,
        onPointerUp: (e) => _up(e.localPosition),
        onPointerCancel: (_) => _up(null),
        child: ExcludeSemantics(
          child: AspectRatio(
            key: _face,
            aspectRatio: _vw / _vh,
            // `.fq-needle { transition: transform 150ms }`; sürüklerken geçiş yok.
            child: TweenAnimationBuilder<double>(
              tween: Tween(end: angle),
              duration: _active || reduce ? Duration.zero : const Duration(milliseconds: 150),
              curve: Curves.ease,
              builder: (context, a, _) => AnimatedBuilder(
                animation: _open,
                builder: (context, _) {
                  final opening = widget.curtain == 'opening';
                  return CustomPaint(
                    painter: _DialPainter(
                      angle: a,
                      target: widget.target,
                      curtain: widget.curtain != 'none' && !(opening && reduce),
                      turn: opening ? _openCurve.transform(_open.value) : 0,
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        face,
        const SizedBox(height: 6),
        ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 34),
          child: card == null
              ? const SizedBox()
              : ExcludeSemantics(child: _ShrinkRow(gap: 10, children: [_End('← ${card.left}', left: true), _End('${card.right} →', left: false)])),
        ),
      ],
    );
  }
}

/// `.fq-end`: kadran ucunun etiketi (sol mavi −2°, sağ turuncu +2°).
class _End extends StatelessWidget {
  const _End(this.text, {required this.left});
  final String text;
  final bool left;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(left ? -2 : 2),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: left ? C.sky : C.coral,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: T.b(14, color: C.ink2, weight: FontWeight.w800, height: 1.25),
        textAlign: left ? TextAlign.left : TextAlign.right,
      ),
    ),
  );
}

/// İki ucu iten flex satırı (`justify-content: space-between; gap`): öğeler doğal genişliğinde,
/// sığmazsa genişlikleriyle orantılı daralır (`flex-shrink: 1`).
class _ShrinkRow extends MultiChildRenderObjectWidget {
  const _ShrinkRow({required super.children, required this.gap, this.center = false});
  final double gap;

  /// `align-items: center` (yoksa `flex-start`).
  final bool center;

  @override
  _RenderShrinkRow createRenderObject(BuildContext context) => _RenderShrinkRow(gap: gap, center: center);

  @override
  void updateRenderObject(BuildContext context, _RenderShrinkRow renderObject) {
    renderObject
      ..gap = gap
      ..center = center;
  }
}

class _ShrinkRowData extends ContainerBoxParentData<RenderBox> {}

class _RenderShrinkRow extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _ShrinkRowData>, RenderBoxContainerDefaultsMixin<RenderBox, _ShrinkRowData> {
  _RenderShrinkRow({required double gap, required bool center}) : _gap = gap, _center = center;

  double _gap;
  set gap(double v) {
    if (v == _gap) return;
    _gap = v;
    markNeedsLayout();
  }

  bool _center;
  set center(bool v) {
    if (v == _center) return;
    _center = v;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _ShrinkRowData) child.parentData = _ShrinkRowData();
  }

  List<RenderBox> get _kids {
    final out = <RenderBox>[];
    var c = firstChild;
    while (c != null) {
      out.add(c);
      c = childAfter(c);
    }
    return out;
  }

  /// Her öğenin genişliği (CSS flex-shrink: taşma, doğal genişliklere orantılı paylaştırılır).
  List<double> _widths(List<RenderBox> kids, double maxWidth) {
    final natural = [for (final k in kids) k.getMaxIntrinsicWidth(double.infinity)];
    final sum = natural.fold(0.0, (a, b) => a + b);
    final available = maxWidth - _gap * math.max(0, kids.length - 1);
    if (!maxWidth.isFinite || sum <= available || sum <= 0) return natural;
    return [for (final w in natural) math.max(0.0, w * available / sum)];
  }

  @override
  void performLayout() {
    final kids = _kids;
    final widths = _widths(kids, constraints.maxWidth);
    var height = 0.0;
    for (var i = 0; i < kids.length; i++) {
      kids[i].layout(BoxConstraints.tightFor(width: widths[i]), parentUsesSize: true);
      height = math.max(height, kids[i].size.height);
    }
    final used = widths.fold(0.0, (a, b) => a + b) + _gap * math.max(0, kids.length - 1);
    size = constraints.constrain(Size(constraints.maxWidth.isFinite ? constraints.maxWidth : used, height));
    // space-between: aradaki boşluk eşit paylaşılır.
    final extra = kids.length > 1 ? math.max(0.0, size.width - used) / (kids.length - 1) : 0.0;
    var x = 0.0;
    for (var i = 0; i < kids.length; i++) {
      final y = _center ? (size.height - kids[i].size.height) / 2 : 0.0;
      (kids[i].parentData! as _ShrinkRowData).offset = Offset(x, y);
      x += widths[i] + _gap + extra;
    }
  }

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final kids = _kids;
    final widths = _widths(kids, constraints.maxWidth);
    var height = 0.0;
    for (var i = 0; i < kids.length; i++) {
      height = math.max(height, kids[i].getDryLayout(BoxConstraints.tightFor(width: widths[i])).height);
    }
    final used = widths.fold(0.0, (a, b) => a + b) + _gap * math.max(0, kids.length - 1);
    return constraints.constrain(Size(constraints.maxWidth.isFinite ? constraints.maxWidth : used, height));
  }

  double _height(double width) {
    final kids = _kids;
    final widths = _widths(kids, width);
    var height = 0.0;
    for (var i = 0; i < kids.length; i++) {
      height = math.max(height, kids[i].getMaxIntrinsicHeight(widths[i]));
    }
    return height;
  }

  @override
  double computeMinIntrinsicWidth(double height) {
    final kids = _kids;
    return kids.fold(0.0, (a, k) => a + k.getMinIntrinsicWidth(double.infinity)) + _gap * math.max(0, kids.length - 1);
  }

  @override
  double computeMaxIntrinsicWidth(double height) {
    final kids = _kids;
    return kids.fold(0.0, (a, k) => a + k.getMaxIntrinsicWidth(double.infinity)) + _gap * math.max(0, kids.length - 1);
  }

  @override
  double computeMinIntrinsicHeight(double width) => _height(width);

  @override
  double computeMaxIntrinsicHeight(double width) => _height(width);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);
}
