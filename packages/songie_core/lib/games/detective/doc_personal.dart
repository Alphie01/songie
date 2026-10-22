// Kişisel ve görsel belgeler: mesajlar, e-posta, fiş, not/mektup, gazete, fotoğraf, bilet, ses kaydı.
part of 'documents.dart';

// ---------------------------------------------------------------- Mesajlar (telefon ekranı)

const _deletedSvg =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2">'
    '<circle cx="12" cy="12" r="8" /><path d="M6.5 17.5l11-11" /></svg>';

const _clipSvg =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.8">'
    '<path d="M8 12.5l5.5-5.5a2.5 2.5 0 0 1 3.5 3.5l-7 7a4 4 0 0 1-5.7-5.7l6.5-6.5" /></svg>';

/// `.dt-doc-caption` / `.dt-phone-cap`: Nunito .8em, 1.5, text-3, ortalı.
Widget _caption(double em, Widget child) => DefaultTextStyle.merge(
  textAlign: TextAlign.center,
  style: T.b(0.8 * em, color: C.text3, height: 1.5),
  child: SizedBox(width: double.infinity, child: child),
);

class _Messages extends StatelessWidget {
  const _Messages(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final em = c.em;
    // `-apple-system, 'Segoe UI', Roboto, Arial`: sistem yazısı (iOS'ta SF, Android'de Roboto).
    final f = _F(family: 'Roboto', size: em, color: const Color(0xFFE9ECEA), height: 1.45);
    final withName = d.str('with');
    final avF = f(k: 0.85, weight: FontWeight.w700, color: const Color(0xFFCFE9DA));
    final bar = Container(
      padding: EdgeInsets.fromLTRB(f.em(1.1), f.em(1.6), f.em(1.1), f.em(0.8)),
      decoration: const BoxDecoration(color: Color(0xFF161D1A), border: Border(bottom: BorderSide(color: Color(0x0FFFFFFF)))),
      child: Row(
        children: [
          Container(
            width: avF.em(2.3),
            height: avF.em(2.3),
            alignment: Alignment.center,
            decoration: const BoxDecoration(color: Color(0xFF2C3A33), shape: BoxShape.circle),
            child: Text(initials(withName), style: avF(height: 1).s),
          ),
          SizedBox(width: f.em(0.7)),
          Expanded(child: Text(withName, style: f(color: const Color(0xFFEEF2EF), weight: FontWeight.w600).s)),
        ],
      ),
    );

    final mf = f(k: 0.95, height: 1.35);
    final pillF = f(k: 0.72, color: const Color(0xFFA9B1AC));
    Widget pill(String text) => Center(
      child: Container(
        margin: EdgeInsets.symmetric(vertical: pillF.em(0.5)),
        padding: EdgeInsets.symmetric(horizontal: pillF.em(0.75), vertical: pillF.em(0.25)),
        decoration: BoxDecoration(color: const Color(0x0FFFFFFF), borderRadius: BorderRadius.circular(pillF.em(0.6))),
        child: Text(text, textAlign: TextAlign.center, style: pillF.s),
      ),
    );

    final thread = LayoutBuilder(
      builder: (context, cons) {
        final maxBubble = cons.maxWidth * 0.82;
        var lastDay = '';
        final groups = <Widget>[];
        for (final m in d.objs('messages')) {
          final time = m.str('time');
          final parts = time.split(' ');
          final hasDay = time.contains(' ');
          final day = hasDay ? parts.first : '';
          final t = hasDay ? parts.sublist(1).join(' ') : time;
          final divider = day.isNotEmpty && day != lastDay;
          if (day.isNotEmpty) lastDay = day;
          final from = m.str('from', 'them');
          final deleted = m.boolean('deleted');
          final text = m.str('text');
          final recovered = deleted && text.trim().isNotEmpty && !RegExp(r'^silindi\.?$', caseSensitive: false).hasMatch(text.trim());
          final name = m.strOrNull('name');
          final children = <Widget>[];
          if (divider) children.add(pill(day));
          if (from == 'system') {
            children.add(pill(text));
          } else {
            final me = from == 'me';
            final bf = deleted ? mf(color: const Color(0xFF8F9791), italic: true) : mf;
            final r = Radius.circular(mf.em(1.1));
            final small = Radius.circular(mf.em(0.35));
            final radius = BorderRadius.only(topLeft: r, topRight: r, bottomLeft: me ? r : small, bottomRight: me ? small : r);
            final recF = mf(k: 0.82, family: DtFont.type, color: const Color(0xFFF0C674), italic: false);
            children.add(
              Align(
                alignment: me ? Alignment.centerRight : Alignment.centerLeft,
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: maxBubble),
                  child: Container(
                    padding: EdgeInsets.fromLTRB(mf.em(0.75), mf.em(0.5), mf.em(0.75), mf.em(0.35)),
                    decoration: BoxDecoration(color: deleted ? null : (me ? const Color(0xFF1E5A3C) : const Color(0xFF242B28)), borderRadius: radius),
                    foregroundDecoration: deleted ? BoxDecoration(borderRadius: radius, border: Border.all(color: const Color(0x29FFFFFF))) : null,
                    child: IntrinsicWidth(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: _gapped(mf.em(0.15), [
                          if (name != null && name.isNotEmpty && from == 'them')
                            Text(name, style: mf(k: 0.74, weight: FontWeight.w700, color: const Color(0xFFE4B363)).s),
                          if (deleted)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SSvg(_deletedSvg, width: bf.size, height: bf.size, color: bf.color),
                                SizedBox(width: bf.em(0.35)),
                                Flexible(child: Text(SDoc.deleted, style: bf.s)),
                              ],
                            )
                          else
                            Text(text, style: bf.s),
                          if (recovered)
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const _Dashed(color: Color(0x2EFFFFFF)),
                                SizedBox(height: recF.em(0.3)),
                                Text('${SDoc.recovered}: $text', style: recF.s),
                              ],
                            ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: Opacity(
                              opacity: 0.6,
                              child: Text(t, style: bf(k: 0.68).s.copyWith(fontFeatures: tabular)),
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
          if (groups.isNotEmpty) groups.add(SizedBox(height: f.em(0.35)));
          groups.add(Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children));
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: groups);
      },
    );

    final phone = Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFF111715),
        borderRadius: BorderRadius.circular(f.em(2.2)),
        boxShadow: [
          _shadow(0, 24, 48, const Color(0x99000000)),
          BoxShadow(color: const Color(0xFF0B0D0C), spreadRadius: f.em(0.5)),
          BoxShadow(color: const Color(0xFF262B28), spreadRadius: f.em(0.35)),
        ],
      ),
      child: DefaultTextStyle.merge(
        style: f.s,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            bar,
            Padding(padding: EdgeInsets.fromLTRB(f.em(0.75), f.em(1), f.em(0.75), f.em(1.6)), child: thread),
          ],
        ),
      ),
    );
    return _centered(
      em * 25,
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          phone,
          SizedBox(height: em * 0.8),
          _caption(em, Text('${d.str('source')}, ${d.str('owner')}')),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- E-posta

class _Email extends StatelessWidget {
  const _Email(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final f = _F(family: DtFont.sans, size: c.em, color: const Color(0xFF202124), height: 1.45);
    const grey = Color(0xFF5F6368);
    final from = d.str('from');
    final sender = from.replaceAll(RegExp(r'<.*>'), '').trim();
    final local = sender.split('@').first.replaceAll(RegExp(r'[._-]'), ' ');
    final cc = d.strOrNull('cc');
    final attachments = d.strs('attachments');
    final dot = Container(width: f.em(0.7), height: f.em(0.7), decoration: const BoxDecoration(color: Color(0xFFC5C8CC), shape: BoxShape.circle));
    final chrome = Container(
      padding: EdgeInsets.symmetric(vertical: f.em(0.6), horizontal: f.em(0.9)),
      decoration: const BoxDecoration(color: Color(0xFFECEEF1), border: Border(bottom: BorderSide(color: Color(0xFFDADCE0)))),
      child: Row(children: [dot, SizedBox(width: f.em(0.4)), dot, SizedBox(width: f.em(0.4)), dot]),
    );
    final subject = _heading(f, 1.4, weight: FontWeight.w400, height: 1.3);
    final avF = f(k: 0.9, weight: FontWeight.w700, color: Colors.white);
    final av = Container(
      width: avF.em(2.6),
      height: avF.em(2.6),
      alignment: Alignment.center,
      decoration: const BoxDecoration(color: Color(0xFF5F6B7A), shape: BoxShape.circle),
      child: Text(initials(local), style: avF(height: 1).s),
    );
    final ff = f(k: 0.88);
    Widget field(String k, String v) => _dlInline(k, v, dtStyle: ff(color: grey).s, ddStyle: ff.s, gap: ff.em(0.4));
    final fields = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _gapped(ff.em(0.1), [field(SDoc.fFrom, from), field(SDoc.fTo, d.str('to')), if (cc != null && cc.isNotEmpty) field(SDoc.fCc, cc)]),
    );
    final date = Text(d.str('date'), softWrap: false, style: f(k: 0.8, color: grey).s);
    final head = c.narrow
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              av,
              SizedBox(width: f.em(0.9)),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [fields, SizedBox(height: f.em(0.3)), date])),
              SizedBox(width: f.em(0.9)),
            ],
          )
        : Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [av, SizedBox(width: f.em(0.9)), Expanded(child: fields), SizedBox(width: f.em(0.9)), date],
          );
    final tf = f(k: 0.98, height: 1.6);
    final liF = f(k: 0.85);
    final body = Padding(
      padding: c.narrow ? EdgeInsets.fromLTRB(f.em(1.1), f.em(1.2), f.em(1.1), f.em(1.5)) : EdgeInsets.fromLTRB(f.em(1.8), f.em(1.6), f.em(1.8), f.em(2)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(d.str('subject'), style: subject.s),
          SizedBox(height: subject.em(1)),
          head,
          SizedBox(height: f.em(1.4)),
          Paras(d.str('body'), style: tf.s, gap: tf.em(0.9), bottom: attachments.isEmpty ? tf.em(0.9) : 0),
          if (attachments.isNotEmpty) ...[
            SizedBox(height: f.em(1.4)),
            Container(
              padding: EdgeInsets.only(top: f.em(1)),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFE3E3E3)))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(SDoc.attachments(attachments.length), style: f(k: 0.8, color: grey).s),
                  SizedBox(height: f(k: 0.8).em(0.5)),
                  Wrap(
                    spacing: f.em(0.5),
                    runSpacing: f.em(0.5),
                    children: [
                      for (final a in attachments)
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: liF.em(0.7), vertical: liF.em(0.45)),
                          decoration: BoxDecoration(border: Border.all(color: const Color(0xFFDADCE0)), borderRadius: BorderRadius.circular(liF.em(0.4))),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SSvg(_clipSvg, width: 14, height: 14, color: liF.color),
                              SizedBox(width: liF.em(0.4)),
                              Flexible(child: Text(a, style: liF.s)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(f.em(0.5)), boxShadow: [_shadow(0, 18, 40, const Color(0x8C000000))]),
      child: DefaultTextStyle.merge(style: f.s, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [chrome, body])),
    );
  }
}

// ---------------------------------------------------------------- Termal fiş

/// Fişin tırtıklı üst ve alt kenarı (`mask: conic-gradient …` 0.8em dişler, ortadan hizalı).
Path _zigzag(Size s, double tooth) {
  final w = s.width;
  final h = s.height;
  final xs = <double>{0, w};
  for (double x = w / 2; x < w; x += tooth / 2) {
    xs.add(x);
  }
  for (double x = w / 2; x > 0; x -= tooth / 2) {
    xs.add(x);
  }
  final sorted = xs.toList()..sort();
  double depth(double x) {
    final u = ((x - (w / 2 - tooth / 2)) % tooth + tooth) % tooth;
    return (u - tooth / 2).abs();
  }

  final p = Path()..moveTo(0, depth(0));
  for (final x in sorted) {
    p.lineTo(x, depth(x));
  }
  for (final x in sorted.reversed) {
    p.lineTo(x, h - depth(x));
  }
  return p..close();
}

class _PathClipper extends CustomClipper<Path> {
  _PathClipper(this.build);
  final Path Function(Size size) build;
  @override
  Path getClip(Size size) => build(size);
  @override
  bool shouldReclip(_PathClipper oldClipper) => true;
}

class _Receipt extends StatelessWidget {
  const _Receipt(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final f = _F(family: DtFont.type, size: c.em * 0.9, color: const Color(0xFF343532), height: 1.45);
    final items = d.objs('items');
    final total = items.fold<double>(0, (t, it) => t + it.number('qty', 1) * it.number('price'));
    Widget row(String a, String b, {_F? rf}) {
      final s = (rf ?? f).s;
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(a, style: s)),
          SizedBox(width: (rf ?? f).em(1)),
          Text(b, style: s, textAlign: TextAlign.right, softWrap: false),
        ],
      );
    }

    Widget hr() => Padding(padding: EdgeInsets.symmetric(vertical: f.em(0.7)), child: const _Dashed(color: Color(0xFF8D8D88)));
    String qtyText(num q) => q == q.roundToDouble() ? '${q.toInt()}' : '$q';
    final small = f(k: 0.85);
    final totalF = f(k: 1.2, weight: FontWeight.w700);
    final footer = d.strOrNull('footer');
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(upper(d.str('merchant')), textAlign: TextAlign.center, style: f(k: 1.15, weight: FontWeight.w700).s),
        SizedBox(height: small.em(0.2)),
        Text(d.str('address'), textAlign: TextAlign.center, style: small.s),
        SizedBox(height: small.em(0.9)),
        row(d.str('datetime'), '${SDoc.receiptNo}:${c.serial()}'),
        hr(),
        for (final it in items) ...[
          if (it.number('qty', 1) != 1)
            Padding(
              padding: EdgeInsets.only(left: small.em(0.5)),
              child: Text('${qtyText(it.number('qty', 1))} x ${money(it.number('price'))}', style: small.s),
            ),
          row(upper(it.str('name')), '*${money(it.number('qty', 1) * it.number('price'))}'),
        ],
        hr(),
        row(upper(SDoc.total), '*${lira(total)}', rf: totalF),
        SizedBox(height: totalF.em(0.2)),
        row(upper(SDoc.payment), upper(d.str('payment'))),
        hr(),
        if (footer != null && footer.isNotEmpty) ...[
          Text(footer, textAlign: TextAlign.center, style: small.s),
          SizedBox(height: math.max(small.em(0.8), f.em(1))),
        ] else
          SizedBox(height: math.max(0, f.em(1) - f.em(0.7))),
        Center(
          child: FractionallySizedBox(
            widthFactor: 0.8,
            child: SizedBox(height: f.em(3), child: CustomPaint(painter: _BarcodePainter(c.id))),
          ),
        ),
      ],
    );
    final tooth = f.em(0.8);
    Path shape(Size s) => _zigzag(s, tooth);
    return _centered(
      f.em(21),
      _DropShadow(
        shape: shape,
        child: ClipPath(
          clipper: _PathClipper(shape),
          child: Container(
            color: const Color(0xFFFBFBF9),
            child: CustomPaint(
              painter: const _GrainPainter(),
              child: Padding(
                padding: EdgeInsets.fromLTRB(f.em(1.4), f.em(2), f.em(1.4), f.em(2.2)),
                child: DefaultTextStyle.merge(style: f.s, child: content),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Not / mektup

List<String> _conditionFx(String? c) {
  if (c == null) return const [];
  final t = trLower(c);
  return [
    if (RegExp('kahve|çay|leke').hasMatch(t)) 'coffee',
    if (RegExp('yırt|kopar|parça').hasMatch(t)) 'torn',
    if (RegExp('yan|is|kömür').hasMatch(t)) 'burnt',
    if (RegExp('ısla|su |sulu|nem|dağıl').hasMatch(t)) 'wet',
    if (RegExp('buruş|katla|kırış').hasMatch(t)) 'crumpled',
    if (RegExp('kan').hasMatch(t)) 'blood',
  ];
}

const _tornPoints = [
  (0.0, 0.0), (1.0, 0.0), (1.0, 0.94), (0.96, 0.97), (0.91, 0.945), (0.86, 0.98), (0.80, 0.95), (0.74, 0.985), (0.69, 0.955), //
  (0.62, 0.99), (0.57, 0.95), (0.50, 0.98), (0.44, 0.955), (0.38, 0.99), (0.31, 0.95), (0.25, 0.98), (0.19, 0.955), (0.12, 0.985),
  (0.06, 0.95), (0.0, 0.97),
];

const _newsPoints = [
  (0.0, 0.006), (0.06, 0.0), (0.13, 0.005), (0.21, 0.001), (0.30, 0.007), (0.38, 0.0), (0.47, 0.005), (0.55, 0.001), (0.64, 0.006), //
  (0.72, 0.0), (0.81, 0.004), (0.90, 0.0), (1.0, 0.005), (0.996, 0.20), (1.0, 0.41), (0.995, 0.63), (1.0, 0.84), (0.996, 1.0),
  (0.90, 0.994), (0.80, 1.0), (0.71, 0.995), (0.62, 1.0), (0.52, 0.993), (0.43, 1.0), (0.33, 0.995), (0.24, 1.0), (0.14, 0.994),
  (0.05, 1.0), (0.0, 0.995), (0.004, 0.78), (0.0, 0.56), (0.005, 0.34), (0.0, 0.14),
];

Path _polygon(Size s, List<(double, double)> pts) {
  final p = Path()..moveTo(pts.first.$1 * s.width, pts.first.$2 * s.height);
  for (final (x, y) in pts.skip(1)) {
    p.lineTo(x * s.width, y * s.height);
  }
  return p..close();
}

/// Kâğıdın arka planı: çizgili defter (el yazısı) + doku; yanık kenar (iç gölge).
class _LetterBgPainter extends CustomPainter {
  _LetterBgPainter({required this.hand, required this.em, required this.burnt, required this.color});
  final bool hand;
  final double em;
  final bool burnt;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final r = Offset.zero & size;
    canvas.drawRect(r, Paint()..color = color);
    if (hand) {
      final line = Paint()..color = const Color.fromRGBO(80, 120, 190, 0.3);
      final step = 2 * em;
      for (double y = -0.1 * em + step - 1; y < size.height; y += step) {
        canvas.drawRect(Rect.fromLTWH(0, y, size.width, 1), line);
      }
      canvas.drawRect(Rect.fromLTWH(2.7 * em, 0, 1, size.height), Paint()..color = const Color.fromRGBO(214, 80, 80, 0.45));
    }
    final img = _Noise.grain;
    if (img != null) canvas.drawRect(r, Paint()..shader = ImageShader(img, TileMode.repeated, TileMode.repeated, Matrix4.identity().storage));
    if (burnt) {
      _insetShadow(canvas, r, 0.6 * em, const Color.fromRGBO(40, 20, 5, 0.7));
      _insetShadow(canvas, r, 2.6 * em, const Color.fromRGBO(70, 35, 10, 0.55));
    }
  }

  @override
  bool shouldRepaint(_LetterBgPainter old) => old.hand != hand || old.em != em || old.burnt != burnt || old.color != color;
}

/// CSS `box-shadow: inset 0 0 blur color`.
void _insetShadow(Canvas canvas, Rect r, double blur, Color color) {
  canvas.save();
  canvas.clipRect(r);
  final path = Path()
    ..fillType = PathFillType.evenOdd
    ..addRect(r.inflate(blur * 2 + 10))
    ..addRect(r);
  canvas.drawPath(path, Paint()
    ..color = color
    ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur / 2));
  canvas.restore();
}

/// `::before` (ıslaklık / buruşukluk) ve `::after` (kahve halkası / kan lekesi) katmanları.
class _LetterFxPainter extends CustomPainter {
  _LetterFxPainter({required this.fx, required this.em});
  final List<String> fx;
  final double em;

  @override
  void paint(Canvas canvas, Size size) {
    if (fx.contains('wet')) {
      final w = 14 * em;
      final h = 10 * em;
      final rect = Rect.fromLTWH(size.width - 0.08 * size.width - w, 0.18 * size.height, w, h);
      const k = 1 / 1.05;
      final rr = RRect.fromRectAndCorners(
        rect,
        topLeft: Radius.elliptical(0.45 * w * k, 0.45 * h * k),
        topRight: Radius.elliptical(0.55 * w * k, 0.55 * h * k),
        bottomRight: Radius.elliptical(0.5 * w * k, 0.5 * h * k),
        bottomLeft: Radius.elliptical(0.4 * w * k, 0.4 * h * k),
      );
      _ellipse(canvas, rr, const [Color.fromRGBO(120, 140, 160, 0.1), Color.fromRGBO(120, 140, 160, 0.2), Color.fromRGBO(120, 140, 160, 0)], const [0, 0.68, 0.72], null);
    } else if (fx.contains('crumpled')) {
      _linear(canvas, size, 160, const [Color(0x00000000), Color(0x0D000000), Color(0x00000000)], const [0.30, 0.315, 0.33]);
      _linear(canvas, size, 28, const [Color(0x00000000), Color(0x0D000000), Color(0x33FFFFFF), Color(0x00FFFFFF)], const [0.58, 0.60, 0.61, 0.63]);
      _linear(canvas, size, 115, const [Color(0x00000000), Color(0x0F000000), Color(0x40FFFFFF), Color(0x00FFFFFF)], const [0.47, 0.495, 0.505, 0.53]);
    }
    if (fx.contains('blood')) {
      final w = 4 * em;
      final h = 3 * em;
      final rect = Rect.fromLTWH(size.width - 2 * em - w, 1.5 * em, w, h);
      const k = 1 / 1.14;
      final rr = RRect.fromRectAndCorners(
        rect,
        topLeft: Radius.elliptical(0.46 * w * k, 0.46 * h * k),
        topRight: Radius.elliptical(0.54 * w * k, 0.54 * h * k),
        bottomRight: Radius.elliptical(0.6 * w * k, 0.6 * h * k),
        bottomLeft: Radius.elliptical(0.4 * w * k, 0.4 * h * k),
      );
      _ellipse(canvas, rr, const [Color.fromRGBO(110, 20, 20, 0.45), Color.fromRGBO(110, 20, 20, 0.2), Color.fromRGBO(110, 20, 20, 0)], const [0, 0.6, 0.72], BlendMode.multiply);
    } else if (fx.contains('coffee')) {
      final w = 9 * em;
      final rect = Rect.fromLTWH(size.width - 1.2 * em - w, size.height - 1 * em - w, w, w);
      canvas.save();
      canvas.clipPath(Path()..addOval(rect));
      canvas.drawRect(
        rect,
        Paint()
          ..blendMode = BlendMode.multiply
          ..shader = ui.Gradient.radial(
            rect.topLeft + Offset(0.42 * w, 0.40 * w),
            w * 7.51 / 9,
            const [Color.fromRGBO(150, 100, 50, 0.1), Color.fromRGBO(150, 100, 50, 0)],
            const [0, 0.62],
          ),
      );
      canvas.drawRect(
        rect,
        Paint()
          ..blendMode = BlendMode.multiply
          ..shader = ui.Gradient.radial(
            rect.center,
            w / 2 * math.sqrt2,
            const [Color.fromRGBO(140, 90, 40, 0), Color.fromRGBO(140, 90, 40, 0), Color.fromRGBO(140, 90, 40, 0.3), Color.fromRGBO(140, 90, 40, 0.12), Color.fromRGBO(140, 90, 40, 0)],
            const [0, 0.57, 0.60, 0.64, 0.67],
          ),
      );
      canvas.restore();
    }
  }

  /// `radial-gradient(ellipse, …)` (farthest-corner) yuvarlatılmış kutuda.
  void _ellipse(Canvas canvas, RRect rr, List<Color> colors, List<double> stops, BlendMode? blend) {
    final rect = rr.outerRect;
    canvas.save();
    canvas.clipRRect(rr);
    canvas.translate(rect.center.dx, rect.center.dy);
    canvas.scale(rect.width / 2 * math.sqrt2, rect.height / 2 * math.sqrt2);
    final p = Paint()..shader = ui.Gradient.radial(Offset.zero, 1, colors, stops);
    if (blend != null) p.blendMode = blend;
    canvas.drawRect(const Rect.fromLTRB(-1, -1, 1, 1), p);
    canvas.restore();
  }

  /// `linear-gradient(<açı>deg, …)`.
  void _linear(Canvas canvas, Size size, double angleDeg, List<Color> colors, List<double> stops) {
    final a = angleDeg * math.pi / 180;
    final dir = Offset(math.sin(a), -math.cos(a));
    final len = (size.width * math.sin(a)).abs() + (size.height * math.cos(a)).abs();
    final c = size.center(Offset.zero);
    canvas.drawRect(Offset.zero & size, Paint()..shader = ui.Gradient.linear(c - dir * (len / 2), c + dir * (len / 2), colors, stops));
  }

  @override
  bool shouldRepaint(_LetterFxPainter old) => old.em != em || old.fx.join() != fx.join();
}

class _Letter extends StatelessWidget {
  const _Letter(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final hand = d.str('hand', 'typed') == 'handwritten';
    final condition = d.strOrNull('condition');
    final fx = _conditionFx(condition);
    final torn = fx.contains('torn');
    final f = hand
        ? _F(family: DtFont.hand, size: c.em * 1.12, color: const Color(0xFF1F2B4D), height: 2, italic: true)
        : _F(family: DtFont.type, size: c.em, color: const Color(0xFF262626), height: 1.6, shadows: const [Shadow(color: Color(0x99000000), blurRadius: 0.5)]);
    var pad = hand
        ? EdgeInsets.fromLTRB(f.em(3.6), f.em(2.4), f.em(2), f.em(2.6))
        : (c.narrow ? EdgeInsets.symmetric(horizontal: f.em(1.5), vertical: f.em(2)) : EdgeInsets.all(f.em(3)));
    if (torn) pad = pad.copyWith(bottom: f.em(4));
    final date = d.strOrNull('date');
    final sal = d.strOrNull('salutation');
    final signoff = d.strOrNull('signoff');
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (date != null && date.isNotEmpty) Text(date, textAlign: TextAlign.right, style: f.s),
        if (sal != null && sal.isNotEmpty) ...[Text(sal, style: f.s), SizedBox(height: f.em(0.4))],
        Paras(d.str('body'), style: f.s, gap: f.em(hand ? 2 : 1)),
        if (signoff != null && signoff.isNotEmpty) ...[SizedBox(height: f.em(1)), Text(signoff, textAlign: TextAlign.right, style: f.s)],
      ],
    );
    Path shape(Size s) => torn ? _polygon(s, _tornPoints) : _rectPath(s);
    final article = _DropShadow(
      shape: shape,
      child: ClipPath(
        clipper: _PathClipper(shape),
        child: CustomPaint(
          painter: _LetterBgPainter(hand: hand, em: f.size, burnt: fx.contains('burnt'), color: hand ? const Color(0xFFFDFBF3) : const Color(0xFFF7F5EE)),
          foregroundPainter: fx.isEmpty ? null : _LetterFxPainter(fx: fx, em: f.size),
          child: Padding(padding: pad, child: DefaultTextStyle.merge(style: f.s, child: content)),
        ),
      ),
    );
    return _centered(
      c.em * 34,
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          hand ? Transform.rotate(angle: deg(-0.6), child: article) : article,
          if (condition != null && condition.isNotEmpty) ...[
            SizedBox(height: c.em * 0.9),
            _caption(c.em, Text(SDoc.condition(condition))),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Gazete kupürü

/// Bir paragrafın satır satır düzeni (sütunlara bölmek ve iki yana yaslamayı korumak için).
class _Lines {
  _Lines(this.painter) {
    final m = painter.computeLineMetrics();
    for (final l in m) {
      tops.add(l.baseline - l.ascent);
      bottoms.add(l.baseline + l.descent);
    }
  }
  final TextPainter painter;
  final List<double> tops = [];
  final List<double> bottoms = [];
  int get count => tops.length;
  double heightOf(int a, int b) => b <= a ? 0 : bottoms[b - 1] - tops[a];
}

/// Paragrafın [from, to) satırlarını çizer.
class _LinesWindow extends StatelessWidget {
  const _LinesWindow(this.lines, this.from, this.to);
  final _Lines lines;
  final int from;
  final int to;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: lines.painter.width,
    height: lines.heightOf(from, to),
    child: CustomPaint(painter: _LinesPainter(lines, from, to)),
  );
}

class _LinesPainter extends CustomPainter {
  _LinesPainter(this.lines, this.from, this.to);
  final _Lines lines;
  final int from;
  final int to;
  @override
  void paint(Canvas canvas, Size size) {
    if (to <= from) return;
    canvas.save();
    canvas.clipRect(Rect.fromLTWH(-2, 0, size.width + 4, size.height));
    lines.painter.paint(canvas, Offset(0, -lines.tops[from]));
    canvas.restore();
  }

  @override
  bool shouldRepaint(_LinesPainter old) => old.lines != lines || old.from != from || old.to != to;
}

/// Sütun akışında bir parça: satırlara bölünebilen paragraf ya da bölünmez blok (ilk harf + yanındaki satırlar).
class _Seg {
  _Seg.lines(this.lines, {required this.before}) : block = null, blockHeight = 0;
  _Seg.block(this.block, this.blockHeight, {required this.before}) : lines = null;
  final _Lines? lines;
  final Widget? block;
  final double blockHeight;

  /// Önündeki boşluk (`p + p { margin-top }`; sütun başında düşer).
  final double before;
}

/// `.dt-news-body`: `columns: 2 14em`, ilk harf büyük (`::first-letter`), paragraf girintisi.
class _NewsBody extends StatelessWidget {
  const _NewsBody({required this.text, required this.f, required this.scaler});
  final String text;
  final _F f;
  final TextScaler scaler;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, cons) {
      final w = cons.maxWidth;
      final gap = f.em(1.6);
      // CSS `columns: 2 14em`: sütun sayısı = min(2, ⌊(W + gap) / (14em + gap)⌋)
      final cols = (w + gap) / (f.em(14) + gap) >= 2 ? 2 : 1;
      final colW = cols == 2 ? (w - gap) / 2 : w;
      final segs = _segments(colW);
      if (cols == 1) return _column(segs, 0, segs.length, 0, null, colW);

      // Sütunları dengele: birinci sütun yarıyı geçene kadar satır alır.
      double total = 0;
      for (var i = 0; i < segs.length; i++) {
        total += (i > 0 ? segs[i].before : 0) + _segHeight(segs[i]);
      }
      final target = total / 2;
      var h = 0.0;
      var splitSeg = segs.length;
      var splitLine = 0;
      outer:
      for (var i = 0; i < segs.length; i++) {
        final s = segs[i];
        final before = i > 0 ? s.before : 0.0;
        if (h >= target) {
          splitSeg = i;
          splitLine = 0;
          break;
        }
        if (s.lines == null) {
          h += before + s.blockHeight;
          continue;
        }
        h += before;
        for (var l = 0; l < s.lines!.count; l++) {
          if (h >= target) {
            splitSeg = i;
            splitLine = l;
            break outer;
          }
          h += s.lines!.heightOf(l, l + 1);
        }
      }
      final left = _column(segs, 0, splitSeg, 0, splitLine, colW, endInclusive: splitLine > 0);
      final right = _column(segs, splitSeg, segs.length, splitLine, null, colW);
      return IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(width: colW, child: Align(alignment: Alignment.topLeft, child: left)),
            SizedBox(width: gap, child: Center(child: Container(width: 1, color: const Color(0x33000000)))),
            SizedBox(width: colW, child: Align(alignment: Alignment.topLeft, child: right)),
          ],
        ),
      );
    },
  );

  double _segHeight(_Seg s) => s.lines == null ? s.blockHeight : s.lines!.heightOf(0, s.lines!.count);

  /// [from] parçasından [to] parçasına; ilk parçada [firstLine] satırından, (endInclusive ise) [to]
  /// parçasının [lastLine] satırına kadar.
  Widget _column(List<_Seg> segs, int from, int to, int firstLine, int? lastLine, double colW, {bool endInclusive = false}) {
    final out = <Widget>[];
    final end = endInclusive ? to + 1 : to;
    for (var i = from; i < end && i < segs.length; i++) {
      final s = segs[i];
      final a = i == from ? firstLine : 0;
      final b = (endInclusive && i == to) ? lastLine! : (s.lines?.count ?? 0);
      if (s.lines != null && b <= a) continue;
      if (out.isNotEmpty && i > from) out.add(SizedBox(height: s.before));
      out.add(s.block ?? _LinesWindow(s.lines!, a, b));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: out);
  }

  TextPainter _layout(InlineSpan span, double width, {List<PlaceholderDimensions>? placeholders}) {
    final tp = TextPainter(text: span, textDirection: TextDirection.ltr, textAlign: TextAlign.justify, textScaler: scaler);
    if (placeholders != null) tp.setPlaceholderDimensions(placeholders);
    tp.layout(minWidth: width, maxWidth: width);
    return tp;
  }

  List<_Seg> _segments(double colW) {
    final ps = paragraphs(text);
    final segs = <_Seg>[];
    final style = f.s;
    final indent = f.em(1.2);
    for (var i = 0; i < ps.length; i++) {
      final p = ps[i];
      if (i == 0) {
        segs.addAll(_dropCap(p, colW, style));
        continue;
      }
      final span = TextSpan(style: style, children: [const WidgetSpan(child: SizedBox.shrink()), TextSpan(text: p)]);
      final tp = _layout(span, colW, placeholders: [PlaceholderDimensions(size: Size(indent, 0), alignment: PlaceholderAlignment.bottom)]);
      segs.add(_Seg.lines(_Lines(tp), before: f.em(0.4)));
    }
    return segs;
  }

  /// İlk harf: `float: left; padding: .04em .08em 0 0; font-size: 3.1em; font-weight: 800; line-height: .85`.
  List<_Seg> _dropCap(String p, double colW, TextStyle style) {
    final m = RegExp(r'^[\p{P}\s]*\p{L}', unicode: true).firstMatch(p) ?? RegExp(r'^\S', unicode: true).firstMatch(p);
    if (m == null) return [_Seg.lines(_Lines(_layout(TextSpan(text: p, style: style), colW)), before: 0)];
    final cap = m.group(0)!;
    final rest = p.substring(cap.length);
    final capSize = f.size * 3.1;
    final capStyle = style.copyWith(fontSize: capSize, fontWeight: FontWeight.w800, height: 0.85);
    final capTp = TextPainter(text: TextSpan(text: cap, style: capStyle), textDirection: TextDirection.ltr, textScaler: scaler)..layout();
    final capW = capTp.width + capSize * 0.08;
    final capH = capTp.height + capSize * 0.04;
    final capWidget = Padding(
      padding: EdgeInsets.only(top: capSize * 0.04, right: capSize * 0.08),
      child: Text(cap, style: capStyle, textScaler: scaler, softWrap: false, overflow: TextOverflow.visible),
    );
    final besideW = math.max(1.0, colW - capW);
    final narrow = _Lines(_layout(TextSpan(text: rest, style: style), besideW));
    final lineH = narrow.count > 0 ? narrow.heightOf(0, 1) : f.em(f.height);
    final n = math.max(1, (capH / lineH).ceil());
    if (narrow.count <= n) {
      final h = math.max(capH, narrow.heightOf(0, narrow.count));
      return [
        _Seg.block(
          SizedBox(
            height: h,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [SizedBox(width: capW, child: capWidget), Expanded(child: _LinesWindow(narrow, 0, narrow.count))],
            ),
          ),
          h,
          before: 0,
        ),
      ];
    }
    final y = (narrow.tops[n - 1] + narrow.bottoms[n - 1]) / 2;
    final pos = narrow.painter.getPositionForOffset(Offset(besideW - 1, y));
    final split = narrow.painter.getLineBoundary(pos).end;
    final remainder = rest.substring(math.min(split, rest.length)).trimLeft();
    final h = math.max(capH, narrow.heightOf(0, n));
    final segs = <_Seg>[
      _Seg.block(
        SizedBox(
          height: h,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [SizedBox(width: capW, child: capWidget), Expanded(child: _LinesWindow(narrow, 0, n))],
          ),
        ),
        h,
        before: 0,
      ),
    ];
    if (remainder.isNotEmpty) segs.add(_Seg.lines(_Lines(_layout(TextSpan(text: remainder, style: style), colW)), before: 0));
    return segs;
  }
}

class _Newspaper extends StatelessWidget {
  const _Newspaper(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    const ink = Color(0xFF1C1C1A);
    final f = _F(family: DtFont.serif, size: c.em, color: ink, height: 1.45);
    final paperF = f(k: 2.1, weight: FontWeight.w900, height: 1.1);
    final dateF = f(k: 0.72, family: DtFont.sans);
    final headF = _heading(f, 1.9, weight: FontWeight.w800, height: 1.08);
    final subF = f(k: 1.05, italic: true, color: const Color(0xFF3B3A36));
    final sub = d.strOrNull('subhead');
    final imgKey = d.strOrNull('image');
    final img = imgKey == null ? null : c.data.images[imgKey];
    final capF = f(k: 0.75, italic: true);
    final mast = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(d.str('paper'), textAlign: TextAlign.center, style: paperF(spacing: paperF.em(-0.01)).s),
        SizedBox(height: dateF.em(0.3)),
        Container(
          padding: EdgeInsets.only(top: dateF.em(0.3)),
          decoration: const BoxDecoration(border: Border(top: BorderSide(color: ink))),
          child: Text(d.str('date'), textAlign: TextAlign.center, style: dateF(spacing: dateF.em(0.06)).s),
        ),
        SizedBox(height: f.em(0.4)),
        const _DoubleLine(color: ink, width: 3),
      ],
    );
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        mast,
        SizedBox(height: math.max(f.em(0.9), headF.em(0.2))),
        Text(d.str('headline'), style: headF(spacing: headF.em(-0.01)).s),
        SizedBox(height: headF.em(0.35)),
        if (sub != null && sub.isNotEmpty) ...[Text(sub, style: subF.s), SizedBox(height: subF.em(0.9))],
        if (img != null) ...[
          Picture(
            url: img.url,
            alt: img.alt,
            cacheKey: '${c.desk.slug}:img:$imgKey',
            tone: PicTone.news,
            aspectRatio: null,
            phAspectRatio: 16 / 9,
            fontSize: f.size / 0.92,
            phPadding: EdgeInsets.all(f.em(1.4)),
            imageWrap: (image) => ColorFiltered(colorFilter: _photoFilter(grayscale: 1, contrast: 1.1), child: image),
          ),
          if (img.url != null) ...[SizedBox(height: capF.em(0.3)), Text(img.alt, style: capF.s)],
          SizedBox(height: f.em(1)),
        ],
        _NewsBody(text: d.str('body'), f: f(k: 0.95, height: 1.45), scaler: c.scaler),
      ],
    );
    final pad = c.narrow ? EdgeInsets.fromLTRB(f.em(1.3), f.em(1.6), f.em(1.3), f.em(2)) : EdgeInsets.fromLTRB(f.em(2.2), f.em(2), f.em(2.2), f.em(2.6));
    Path shape(Size s) => _polygon(s, _newsPoints);
    return Transform.rotate(
      angle: deg(0.4),
      child: _DropShadow(
        shape: shape,
        child: ClipPath(
          clipper: _PathClipper(shape),
          child: Container(
            color: const Color(0xFFE7E3D6),
            child: CustomPaint(
              painter: const _GrainPainter(),
              child: Padding(padding: pad, child: DefaultTextStyle.merge(style: f.s, child: content)),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Fotoğraf

/// CCTV karesinin tarama çizgileri, dokusu ve kenar karartması (`.dt-cctv::after`).
class _CctvOverlayPainter extends CustomPainter {
  const _CctvOverlayPainter(this.em);
  final double em;
  @override
  void paint(Canvas canvas, Size size) {
    final r = Offset.zero & size;
    final line = Paint()..color = const Color(0x33000000);
    for (double y = 2; y < size.height; y += 3) {
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, 1), line);
    }
    final img = _Noise.grain;
    if (img != null) canvas.drawRect(r, Paint()..shader = ImageShader(img, TileMode.repeated, TileMode.repeated, Matrix4.identity().storage));
    // `box-shadow: inset 0 0 6em rgb(0 0 0 / .65)`
    _insetShadow(canvas, r, 6 * em, const Color(0xA6000000));
  }

  @override
  bool shouldRepaint(_CctvOverlayPainter oldDelegate) => oldDelegate.em != em;
}

class _Photo extends StatelessWidget {
  const _Photo(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final em = c.em;
    final key = d.str('image');
    final caption = d.str('caption');
    final img = c.data.images[key] ?? (url: null, alt: caption);
    final cacheKey = '${c.desk.slug}:img:$key';
    final cctv = d.objOrNull('cctv');
    if (cctv != null) {
      final camera = cctv.str('camera');
      final ts = cctv.str('timestamp');
      final osd = T.d(0.78 * em, color: const Color(0xFFF4F4F0), weight: FontWeight.w600, height: 1.45, letterSpacing: 0.78 * em * 0.04).copyWith(
        shadows: const [Shadow(color: Colors.black, blurRadius: 2), Shadow(color: Colors.black, blurRadius: 1)],
      );
      final o = 0.78 * em;
      final frame = Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(0.2 * em), boxShadow: [_shadow(0, 18, 40, const Color(0x99000000))]),
        child: Stack(
          children: [
            Picture(
              url: img.url,
              alt: img.alt,
              cacheKey: cacheKey,
              tone: PicTone.cctv,
              label: SDoc.photoMissing,
              aspectRatio: 16 / 9,
              fontSize: em,
              phPadding: EdgeInsets.symmetric(vertical: 3 * em, horizontal: 2 * em),
              phBackground: const Color(0xFF121612),
              phBorder: false,
              imageWrap: (image) => ColorFiltered(colorFilter: _photoFilter(grayscale: 0.85, contrast: 1.15, brightness: 0.92), child: image),
            ),
            Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: _CctvOverlayPainter(em)))),
            Positioned(top: 0.9 * o, left: 1 * o, child: Text(camera, style: osd)),
            Positioned(
              top: 0.9 * o,
              right: 1 * o,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 0.6 * o, height: 0.6 * o, decoration: const BoxDecoration(color: Color(0xFFFF3B30), shape: BoxShape.circle)),
                  SizedBox(width: 0.4 * o),
                  Text(SDoc.rec, style: osd),
                ],
              ),
            ),
            Positioned(right: 1 * o, bottom: 0.9 * o, child: Text(ts, style: osd)),
          ],
        ),
      );
      return _centered(
        em * 40,
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            frame,
            SizedBox(height: 0.8 * em),
            _caption(
              em,
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: '$camera, $ts', style: const TextStyle(fontFeatures: tabular)),
                    const TextSpan(text: '\n'),
                    TextSpan(text: caption),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    final tag = d.strOrNull('tag');
    final tagF = 0.8 * em;
    final capF = _F(family: DtFont.hand, size: 1.1 * em, color: const Color(0xFF22305A), italic: true, height: 1.45);
    return _centered(
      em * 34,
      Transform.rotate(
        angle: deg(-1),
        child: Container(
          padding: EdgeInsets.fromLTRB(0.9 * em, 0.9 * em, 0.9 * em, 0),
          decoration: BoxDecoration(
            color: const Color(0xFFFAFAF7),
            boxShadow: [_shadow(0, 2, 5, const Color(0x66000000)), _shadow(0, 18, 36, const Color(0x8C000000))],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Picture(url: img.url, alt: img.alt, cacheKey: cacheKey, tone: PicTone.print, label: SDoc.photoMissing, aspectRatio: 4 / 3, fontSize: em),
                  Padding(
                    padding: EdgeInsets.fromLTRB(capF.em(0.3), capF.em(0.7), capF.em(0.3), capF.em(1)),
                    child: Text(caption, textAlign: TextAlign.center, style: capF.s),
                  ),
                ],
              ),
              if (tag != null && tag.isNotEmpty)
                Positioned(
                  // `.dt-tag { top: 1.6em; left: 1.6em }` (kendi yazı boyunda), kutunun dolgu kenarından
                  top: 1.6 * tagF - 0.9 * em,
                  left: 1.6 * tagF - 0.9 * em,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 0.6 * tagF, vertical: 0.3 * tagF),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2C230),
                      borderRadius: BorderRadius.circular(0.15 * tagF),
                      boxShadow: [_shadow(0, 2, 4, const Color(0x59000000))],
                    ),
                    child: Text(
                      SDoc.photoTag(tag),
                      style: TextStyle(fontFamily: DtFont.sans, fontSize: tagF, fontWeight: FontWeight.w800, color: const Color(0xFF1B1B1B), height: 1.45),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Bilet

const _ticketColors = <String, (Color, Color)>{
  'bus': (Color(0xFFE6EEF7), Color(0xFF1F5FA8)),
  'flight': (Color(0xFFFFFFFF), Color(0xFF0B6E6E)),
  'train': (Color(0xFFF3EBDD), Color(0xFF9A3B1F)),
  'ferry': (Color(0xFFE3F0EA), Color(0xFF1D6B52)),
  'parking': (Color(0xFFF6E7A6), Color(0xFF6B5200)),
  'event': (Color(0xFFEFE3EE), Color(0xFF7A2A6E)),
  'pawn': (Color(0xFFF4F1E8), Color(0xFF5A4630)),
  'hotel': (Color(0xFFEEF0F2), Color(0xFF3C4650)),
};

class _Ticket extends StatelessWidget {
  const _Ticket(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final variant = d.str('variant', 'other');
    final (bg, accent) = _ticketColors[variant] ?? (const Color(0xFFE9EEF5), const Color(0xFF2A5D9F));
    final f = _F(family: variant == 'pawn' ? DtFont.serif : DtFont.sans, size: c.em, color: const Color(0xFF1B2430), height: 1.45);
    final ser = d.strOrNull('serial') ?? 'No ${c.serial(6)}';
    final stubW = f.em(7);
    final kindF = f(k: 0.72, weight: FontWeight.w700, color: accent);
    final titleF = _heading(f, 1.3, weight: FontWeight.w800, height: 1.2);
    final dtF = f(k: 0.68, color: const Color(0x8C000000));
    final ddF = (variant == 'flight' ? f(k: 1.15) : f)(weight: FontWeight.w700);
    final fields = d.objs('fields');
    final main = Padding(
      padding: EdgeInsets.fromLTRB(f.em(1.6), f.em(1.4), f.em(1.6), f.em(1.6)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(trUpper(SDoc.ticket[variant] ?? SDoc.ticket['other']!), style: kindF(spacing: kindF.em(0.14)).s),
          SizedBox(height: titleF.em(0.25)),
          Text(d.str('title'), style: titleF.s),
          SizedBox(height: titleF.em(1)),
          _AutoGrid(
            minWidth: f.em(8.5),
            rowGap: f.em(0.8),
            columnGap: f.em(1.2),
            fit: false,
            children: [
              for (final fl in fields)
                _dlStack(
                  fl.str('label'),
                  fl.str('value'),
                  dtStyle: dtF(spacing: dtF.em(0.06)).s,
                  ddStyle: ddF.s.copyWith(fontFeatures: tabular),
                  ddTop: f.em(0.1),
                ),
            ],
          ),
        ],
      ),
    );
    final serialF = f(k: 0.78, family: DtFont.type);
    final serialText = Text(ser, style: serialF(spacing: serialF.em(0.08)).s, softWrap: false);
    final bar = SizedBox(width: f.em(4.6), height: f.em(2.8), child: CustomPaint(painter: _BarcodePainter(ser)));
    const dashColor = Color(0x38000000);

    Widget body;
    if (c.narrow) {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          main,
          const _Dashed(color: dashColor, width: 2, dash: 6, gap: 6),
          Padding(
            padding: EdgeInsets.symmetric(vertical: f.em(0.9), horizontal: f.em(1.6)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [Flexible(child: serialText), SizedBox(width: f.em(0.8)), bar],
            ),
          ),
        ],
      );
    } else {
      // Koçan: dikey seri no (aşağıdan yukarı) ve barkod; yükseklik ana bölümle eşit.
      final tp = TextPainter(text: TextSpan(text: ser, style: serialF(spacing: serialF.em(0.08)).s), textDirection: TextDirection.ltr, textScaler: c.scaler)..layout();
      final stubMin = f.em(1.2) * 2 + tp.width + f.em(0.8) + f.em(2.8);
      tp.dispose();
      body = Stack(
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: stubMin),
            child: Padding(padding: EdgeInsets.only(right: stubW + 2), child: main),
          ),
          Positioned(top: 0, bottom: 0, right: stubW, width: 2, child: const _Dashed(color: dashColor, width: 2, vertical: true, dash: 6, gap: 6)),
          Positioned(
            top: 0,
            bottom: 0,
            right: 0,
            width: stubW,
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: f.em(1.2), horizontal: f.em(0.6)),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [RotatedBox(quarterTurns: 3, child: serialText), bar],
              ),
            ),
          ),
        ],
      );
    }

    final r = f.em(0.6);
    final notch = f.em(0.71);
    Path shape(Size s) {
      final p = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & s, Radius.circular(r)));
      if (c.narrow) return p;
      final x = s.width - stubW;
      final holes = Path()
        ..addOval(Rect.fromCircle(center: Offset(x, 0), radius: notch))
        ..addOval(Rect.fromCircle(center: Offset(x, s.height), radius: notch));
      return Path.combine(PathOperation.difference, p, holes);
    }

    return _centered(
      f.em(variant == 'parking' ? 30 : 40),
      _DropShadow(
        shape: shape,
        child: ClipPath(
          clipper: _PathClipper(shape),
          child: Container(
            color: bg,
            child: CustomPaint(painter: const _GrainPainter(), child: DefaultTextStyle.merge(style: f.s, child: body)),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Ses kaydı

class _AudioDoc extends StatefulWidget {
  const _AudioDoc(this.c);
  final _Doc c;

  @override
  State<_AudioDoc> createState() => _AudioDocState();
}

class _AudioDocState extends State<_AudioDoc> {
  late bool _open = widget.c.data.audioUrl == null;

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    final d = c.doc;
    final em = c.em;
    final variant = d.str('variant');
    final source = d.str('source');
    final datetime = d.str('datetime');
    final metaF = T.d(0.75 * em, color: C.text2, weight: FontWeight.w600, height: 1.45);
    Widget meta(String k, String v) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [Text(k, style: metaF.copyWith(color: C.text3)), SizedBox(width: 0.75 * em * 0.5), Text(v, style: metaF)],
    );
    final head = Container(
      padding: EdgeInsets.symmetric(vertical: em, horizontal: 1.2 * em),
      decoration: BoxDecoration(
        color: const Color(0xFF161B18),
        borderRadius: BorderRadius.circular(0.8 * em),
        boxShadow: [_shadow(0, 14, 30, const Color(0x80000000)), const BoxShadow(color: Color(0x12FFFFFF), spreadRadius: 1)],
      ),
      foregroundDecoration: BoxDecoration(
        borderRadius: BorderRadius.circular(0.8 * em),
        border: const Border(top: BorderSide(color: Color(0x0DFFFFFF))),
      ),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 1.2 * em,
        runSpacing: 0.8 * em,
        children: [
          Container(
            width: 0.6 * em,
            height: 0.6 * em,
            decoration: BoxDecoration(color: const Color(0xFFFF3B30), shape: BoxShape.circle, boxShadow: [_shadow(0, 0, 0.6 * em, const Color.fromRGBO(255, 59, 48, 0.6))]),
          ),
          ConstrainedBox(
            constraints: BoxConstraints(minWidth: 12 * em),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(SAudio.variant[variant] ?? variant, style: T.b(0.78 * em, color: DtC.accentHi, weight: FontWeight.w700)),
                Text(source, style: T.b(0.95 * em, color: C.text, weight: FontWeight.w600, height: 1.35)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [meta(SDoc.fDatetime, datetime), SizedBox(height: 0.75 * em * 0.15), meta(SAudio.recNo, 'SK-${c.serial(6)}')],
          ),
        ],
      ),
    );

    final toggle = Align(
      alignment: Alignment.centerLeft,
      child: Pressable(
        onTap: () => setState(() => _open = !_open),
        label: _open ? SAudio.hideTranscript : SAudio.showTranscript,
        selected: _open,
        builder: (context, _) => Text(_open ? SAudio.hideTranscript : SAudio.showTranscript, style: T.b(0.85 * em, color: DtC.accentHi, weight: FontWeight.w600)),
      ),
    );

    Widget? transcript;
    if (_open) {
      final pad = _paperPad(c.narrow);
      final f = _F(family: DtFont.type, size: em * 0.92, height: 1.55);
      final amb = f(color: DtC.ink2, italic: true);
      final ambience = d.strOrNull('ambience');
      final lines = d.objs('lines');
      final items = <Widget>[
        Container(
          padding: EdgeInsets.only(bottom: f.em(0.6)),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: DtC.rule))),
          child: Text('${upper(SAudio.transcript)}: $source, $datetime', style: f(weight: FontWeight.w700).s),
        ),
        SizedBox(height: f.em(1.2)),
        if (ambience != null && ambience.isNotEmpty) ...[Text(SAudio.ambience(ambience), style: amb.s), SizedBox(height: f.em(0.7))],
      ];
      for (final l in lines) {
        final charId = l.strOrNull('character');
        final ch = charId == null ? null : c.desk.chars[charId];
        final who = ch?.name ?? l.strOrNull('name') ?? SAudio.unknown;
        final pause = l.numOrNull('pause');
        final delivery = l.strOrNull('delivery');
        if (pause != null && pause > 0) {
          items
            ..add(Text(SAudio.silence(pause == pause.roundToDouble() ? pause.toInt() : pause), style: amb.s))
            ..add(SizedBox(height: f.em(0.6)));
        }
        final whoStyle = f(weight: FontWeight.w700).s;
        items
          ..add(
            Text.rich(
              TextSpan(
                children: [
                  if (ch != null) _plinkSpan('${upper(who)}:', whoStyle, () => c.person(ch.id)) else TextSpan(text: '${upper(who)}:', style: whoStyle),
                  const TextSpan(text: ' '),
                  if (delivery != null && delivery.isNotEmpty) TextSpan(text: '($delivery) ', style: amb.s),
                  TextSpan(text: l.str('text')),
                ],
              ),
              style: f.s,
            ),
          )
          ..add(SizedBox(height: f.em(0.6)));
      }
      transcript = _Paper(
        f: f,
        px: pad.px,
        py: pad.py,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: items),
      );
    }

    return _centered(
      em * 40,
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _gapped(em, [
          head,
          AudioPlayerView(
            url: c.data.audioUrl,
            audioKey: '${c.desk.slug}:${c.id}',
            seed: c.id,
            playLabel: SAudio.play,
            pauseLabel: SAudio.pause,
            missing: SAudio.missing,
            fontSize: em,
            showTime: !c.narrow,
          ),
          toggle,
          ?transcript,
        ]),
      ),
    );
  }
}
