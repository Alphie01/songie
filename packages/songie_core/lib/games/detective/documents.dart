// games/detective/client/Docs.tsx (+ Bits.tsx Seal/Stamp) ve documents.css karşılığı:
// kanıtların gerçek belge görünümleri (tutanak, rapor, HTS, mesaj, e-posta, fiş, döküm, not, gazete,
// fotoğraf, geçiş kaydı, bilet, liste, kroki, ses kaydı). Ölçüler `em` (sahne yazı boyu × yakınlaştırma).
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'audio.dart';
import 'bits.dart';
import 'desk.dart';
import 'floor_plan.dart';
import 'models.dart';
import 'strings.dart';

part 'doc_official.dart';
part 'doc_personal.dart';

/// Bir kanıtın içeriğini gerçek belge görünümünde basar (`.dt-sheet` içi).
class DocumentView extends StatelessWidget {
  const DocumentView({super.key, required this.data, required this.em, required this.narrow});
  final DocResponse data;

  /// `.dt-stage` yazı boyu (telefonda 12.5 × yakınlaştırma, 720px'ten itibaren 14 × yakınlaştırma).
  final double em;

  /// Sahne içeriği ≤ 520px: `@container (max-width: 520px)` kuralları.
  final bool narrow;

  @override
  Widget build(BuildContext context) {
    final c = _Doc(data: data, em: em, narrow: narrow, desk: Desk.of(context), scaler: MediaQuery.textScalerOf(context));
    return switch (data.kind) {
      'statement' => _Statement(c),
      'report' => _Report(c),
      'phoneLog' => _PhoneLog(c),
      'messages' => _Messages(c),
      'email' => _Email(c),
      'receipt' => _Receipt(c),
      'bank' => _Bank(c),
      'letter' => _Letter(c),
      'newspaper' => _Newspaper(c),
      'photo' => _Photo(c),
      'accessLog' => _AccessLog(c),
      'ticket' => _Ticket(c),
      'table' => _ListTable(c),
      'floorplan' => _Floor(c),
      'audio' => _AudioDoc(c),
      _ => const SizedBox.shrink(),
    };
  }
}

/// Belge çiziminin ortak bağlamı.
class _Doc {
  _Doc({required this.data, required this.em, required this.narrow, required this.desk, required this.scaler});
  final DocResponse data;
  final double em;
  final bool narrow;
  final Desk desk;
  final TextScaler scaler;

  Json get doc => data.doc;
  String get id => data.evidenceId;

  /// Belge numarası yoksa kanıt kimliğinden kararlı bir sayı.
  String serial([int digits = 4]) => (hashStr(id) % math.pow(10, digits).toInt()).toString().padLeft(digits, '0');

  void person(String characterId) => desk.showPerson(characterId);
}

String _yearOf(String t) => RegExp(r'(19|20)\d{2}').firstMatch(t)?.group(0) ?? '';

// ---------------------------------------------------------------- Yazı bağlamı (CSS kalıtımı)

/// Bir öğenin yazı özellikleri; çocuklar `call(k: …)` ile türer (`em` göreli).
/// Kalınlık gövdeden 600 gelir (body font-weight); motor, CSS gibi en yakın kalınlığı seçer.
class _F {
  const _F({
    this.family,
    required this.size,
    this.color = DtC.ink,
    this.height = 1.5,
    this.weight = FontWeight.w600,
    this.italic = false,
    this.spacing,
    this.shadows,
  });
  final String? family;
  final double size;
  final Color color;
  final double height;
  final FontWeight weight;
  final bool italic;

  /// Mutlak harf aralığı (CSS'te hesaplanmış değer olarak kalıtılır).
  final double? spacing;
  final List<Shadow>? shadows;

  _F call({double k = 1, String? family, Color? color, double? height, FontWeight? weight, bool? italic, double? spacing, bool noSpacing = false, List<Shadow>? shadows}) => _F(
    family: family ?? this.family,
    size: size * k,
    color: color ?? this.color,
    height: height ?? this.height,
    weight: weight ?? this.weight,
    italic: italic ?? this.italic,
    spacing: noSpacing ? null : (spacing ?? this.spacing),
    shadows: shadows ?? this.shadows,
  );

  double em(double v) => v * size;

  TextStyle get s => TextStyle(
    fontFamily: family,
    fontSize: size,
    color: color,
    height: height,
    fontWeight: weight,
    fontStyle: italic ? FontStyle.italic : FontStyle.normal,
    letterSpacing: spacing,
    shadows: shadows,
    decoration: TextDecoration.none,
    leadingDistribution: TextLeadingDistribution.even,
  );
}

/// h1–h3: base.css `font-family: var(--display); font-weight: 800; line-height: 1.05`.
_F _heading(_F parent, double k, {FontWeight weight = FontWeight.w800, double height = 1.05}) =>
    parent(k: k, family: T.display, weight: weight, height: height);

// ---------------------------------------------------------------- Gölgeler, dokular

/// CSS `box-shadow: x y blur color` (blur → sigma = blur / 2).
BoxShadow _shadow(double x, double y, double blur, Color color, [double spread = 0]) =>
    BoxShadow(offset: Offset(x, y), blurRadius: blur / 2 <= 0.5 ? 0 : (blur / 2 - 0.5) / 0.57735, color: color, spreadRadius: spread);

/// `.dt-paper`: `0 18px 40px rgb(0 0 0 / .55), 0 2px 6px rgb(0 0 0 / .4)` (ilk yazılan üstte).
final _paperShadows = [_shadow(0, 2, 6, const Color(0x66000000)), _shadow(0, 18, 40, const Color(0x8C000000))];

/// `--grain` (feTurbulence) ve `--ink-mask` dokuları: piksel başı gürültü, bir kez üretilir.
abstract final class _Noise {
  static ui.Image? _grain;
  static ui.Image? _ink;
  static bool _failed = false;

  /// rgb(.32 .28 .2), alfa = .42·n − .16
  static ui.Image? get grain => _grain ??= _make(220, 7, (n) => 0.42 * n - 0.16, const Color(0xFF524733));

  /// alfa = 2.1 − 2.4·n (mürekkep maskesi: çoğu dolu, yer yer boşluk)
  static ui.Image? get ink => _ink ??= _make(160, 11, (n) => 2.1 - 2.4 * n, const Color(0xFF000000));

  static ui.Image? _make(int size, int seed, double Function(double n) alpha, Color rgb) {
    if (_failed) return null;
    try {
      final rnd = math.Random(seed);
      final buckets = <int, List<double>>{};
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          final u1 = math.max(1e-9, rnd.nextDouble());
          final u2 = rnd.nextDouble();
          final g = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2);
          final n = (0.5 + 0.115 * g).clamp(0.0, 1.0);
          final a = alpha(n).clamp(0.0, 1.0);
          final level = (a * 63).round() * 4;
          if (level <= 0) continue;
          (buckets[level] ??= <double>[]).addAll([x + 0.5, y + 0.5]);
        }
      }
      final rec = ui.PictureRecorder();
      final canvas = Canvas(rec);
      for (final e in buckets.entries) {
        canvas.drawRawPoints(
          ui.PointMode.points,
          Float32List.fromList(e.value),
          Paint()
            ..color = rgb.withAlpha(math.min(255, e.key))
            ..strokeWidth = 1
            ..strokeCap = StrokeCap.square,
        );
      }
      return rec.endRecording().toImageSync(size, size);
    } on Object {
      _failed = true;
      return null;
    }
  }
}

/// Kâğıt dokusu (`background-image: var(--grain)`), arka plan renginin üstünde, yazının altında.
class _GrainPainter extends CustomPainter {
  const _GrainPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final img = _Noise.grain;
    if (img == null) return;
    canvas.drawRect(Offset.zero & size, Paint()..shader = ImageShader(img, TileMode.repeated, TileMode.repeated, Matrix4.identity().storage));
  }

  @override
  bool shouldRepaint(_GrainPainter oldDelegate) => false;
}

/// `mask-image: var(--ink-mask)`: ıslak mürekkep (yer yer açılan boşluklar).
class _InkMask extends StatelessWidget {
  const _InkMask({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    final img = _Noise.ink;
    if (img == null) return child;
    return ShaderMask(
      blendMode: BlendMode.dstIn,
      shaderCallback: (_) => ImageShader(img, TileMode.repeated, TileMode.repeated, Matrix4.identity().storage),
      child: child,
    );
  }
}

/// `.dt-sheet:has(> .dt-receipt, > .dt-ticket, > .dt-news, > .dt-letter-wrap)`:
/// `drop-shadow(0 14px 20px rgb(0 0 0 / .5)) drop-shadow(0 2px 3px rgb(0 0 0 / .4))` biçimi izleyen gölge.
class _DropShadow extends StatelessWidget {
  const _DropShadow({required this.shape, required this.child});
  final Path Function(Size size) shape;
  final Widget child;
  @override
  Widget build(BuildContext context) => CustomPaint(painter: _DropShadowPainter(shape), child: child);
}

class _DropShadowPainter extends CustomPainter {
  _DropShadowPainter(this.shape);
  final Path Function(Size size) shape;
  @override
  void paint(Canvas canvas, Size size) {
    final p = shape(size);
    canvas.drawPath(p.shift(const Offset(0, 14)), Paint()
      ..color = const Color(0x80000000)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10));
    canvas.drawPath(p.shift(const Offset(0, 2)), Paint()
      ..color = const Color(0x66000000)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.5));
  }

  @override
  bool shouldRepaint(_DropShadowPainter oldDelegate) => true;
}

Path _rectPath(Size s) => Path()..addRect(Offset.zero & s);

/// Kesikli çizgi (CSS `1px dashed`): yatay ya da dikey.
class _Dashed extends StatelessWidget {
  const _Dashed({required this.color, this.width = 1, this.vertical = false, this.dash = 3, this.gap = 3});
  final Color color;
  final double width;
  final bool vertical;
  final double dash;
  final double gap;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: vertical ? width : double.infinity,
    height: vertical ? double.infinity : width,
    child: CustomPaint(painter: _DashPainter(color, width, vertical, dash, gap)),
  );
}

class _DashPainter extends CustomPainter {
  _DashPainter(this.color, this.width, this.vertical, this.dash, this.gap);
  final Color color;
  final double width;
  final bool vertical;
  final double dash;
  final double gap;
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = width;
    final len = vertical ? size.height : size.width;
    for (double d = 0; d < len; d += dash + gap) {
      final e = math.min(d + dash, len);
      if (vertical) {
        canvas.drawLine(Offset(width / 2, d), Offset(width / 2, e), p);
      } else {
        canvas.drawLine(Offset(d, width / 2), Offset(e, width / 2), p);
      }
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color || old.width != width;
}

/// CSS `border: N double`: iki çizgi, aralarında eşit boşluk (her biri N/3).
class _DoubleLine extends StatelessWidget {
  const _DoubleLine({required this.color, required this.width});
  final Color color;
  final double width;
  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [Container(height: width / 3, color: color), SizedBox(height: width / 3), Container(height: width / 3, color: color)],
  );
}

/// CSS `filter: grayscale(g) contrast(c) brightness(b)` (sırayla).
ColorFilter _photoFilter({double grayscale = 0, double contrast = 1, double brightness = 1}) {
  final s = 1 - grayscale;
  final g = <double>[
    0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0, 0, //
    0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0, 0,
    0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0, 0,
    0, 0, 0, 1, 0,
  ];
  final co = 0.5 * (1 - contrast) * 255;
  final c = <double>[contrast, 0, 0, 0, co, 0, contrast, 0, 0, co, 0, 0, contrast, 0, co, 0, 0, 0, 1, 0];
  final b = <double>[brightness, 0, 0, 0, 0, 0, brightness, 0, 0, 0, 0, 0, brightness, 0, 0, 0, 0, 0, 1, 0];
  return ColorFilter.matrix(_mul(b, _mul(c, g)));
}

/// 4×5 renk matrisi çarpımı (önce [b], sonra [a]).
List<double> _mul(List<double> a, List<double> b) {
  final out = List<double>.filled(20, 0);
  for (var r = 0; r < 4; r++) {
    for (var col = 0; col < 5; col++) {
      var v = col == 4 ? a[r * 5 + 4] : 0.0;
      for (var k = 0; k < 4; k++) {
        v += a[r * 5 + k] * b[k * 5 + col];
      }
      out[r * 5 + col] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------- Kâğıt

/// `.dt-paper`: kâğıt rengi + doku, `--py --px` dolgu, iki katmanlı gölge.
class _Paper extends StatelessWidget {
  const _Paper({required this.f, required this.px, required this.py, required this.child, this.background = DtC.paper, this.overlay, this.header});
  final _F f;

  /// `em` cinsinden yatay/dikey dolgu.
  final double px;
  final double py;
  final Widget child;
  final Color background;

  /// Kâğıdın kenarlarında mutlak konumlu süsler (HTS delikleri).
  final List<Widget>? overlay;

  /// Dolguyu aşan tam genişlik başlık (sigorta raporu).
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    final body = header == null
        ? Padding(padding: EdgeInsets.symmetric(horizontal: f.em(px), vertical: f.em(py)), child: child)
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header!,
              Padding(padding: EdgeInsets.fromLTRB(f.em(px), 0, f.em(px), f.em(py)), child: child),
            ],
          );
    return Container(
      decoration: BoxDecoration(color: background, boxShadow: _paperShadows),
      child: CustomPaint(
        painter: const _GrainPainter(),
        child: DefaultTextStyle.merge(
          style: f.s,
          child: overlay == null ? body : Stack(children: [body, ...overlay!]),
        ),
      ),
    );
  }
}

({double px, double py}) _paperPad(bool narrow) => narrow ? (px: 1.5, py: 2.0) : (px: 3.2, py: 3.0);

// ---------------------------------------------------------------- Kişi bağlantısı, imza, mühür, kaşe

/// `.dt-plink`: kalın, altı çizili (rgb(0 0 0 / .3)) metin düğme.
Widget _plink(String text, TextStyle style, VoidCallback onTap, {TextAlign? align}) => GestureDetector(
  onTap: onTap,
  behavior: HitTestBehavior.opaque,
  child: Semantics(
    button: true,
    child: Text(
      text,
      textAlign: align,
      style: style.copyWith(fontWeight: FontWeight.w700, decoration: TextDecoration.underline, decorationColor: const Color(0x4D000000)),
    ),
  ),
);

/// Satır içi kişi bağlantısı (dökümde konuşan adı).
InlineSpan _plinkSpan(String text, TextStyle style, VoidCallback onTap) => WidgetSpan(
  alignment: PlaceholderAlignment.baseline,
  baseline: TextBaseline.alphabetic,
  child: _plink(text, style, onTap),
);

/// `.dt-sign`: rol, karalama imza, çizgi üstünde ad (+ ıslak mühür).
class _Sign extends StatelessWidget {
  const _Sign({required this.f, this.role, required this.scribble, required this.name, this.seal});
  final _F f;
  final String? role;
  final String scribble;
  final String name;
  final Widget? seal;

  @override
  Widget build(BuildContext context) {
    final sf = f(k: 1.7, family: DtFont.hand, italic: true, height: 1.1, color: const Color(0xFF1D2F6B));
    final nf = f(k: 0.85);
    final col = Column(
      mainAxisSize: MainAxisSize.min,
      children: _gapped(f.em(0.1), [
        if (role != null) Text(role!, textAlign: TextAlign.center, style: f(k: 0.8, weight: FontWeight.w700).s),
        Transform.rotate(
          angle: deg(-6),
          child: Opacity(
            opacity: 0.85,
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: sf.em(1.3)),
              child: Text(scribble, textAlign: TextAlign.center, style: sf.s),
            ),
          ),
        ),
        Container(
          constraints: BoxConstraints(minWidth: nf.em(9)),
          padding: EdgeInsets.only(top: nf.em(0.2)),
          decoration: const BoxDecoration(border: Border(top: BorderSide(color: DtC.ink2))),
          child: Text(name, textAlign: TextAlign.center, style: nf.s),
        ),
      ]),
    );
    if (seal == null) return col;
    return Stack(clipBehavior: Clip.none, alignment: Alignment.topCenter, children: [col, seal!]);
  }
}

List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty && gap > 0) out.add(SizedBox(height: gap, width: gap));
    out.add(w);
  }
  return out;
}

/// `Seal`: yuvarlak resmî mühür (antette soluk, imzada ıslak). 120'lik kutuda çizilir.
class _Seal extends StatelessWidget {
  const _Seal({required this.text, this.center, required this.color, required this.size});
  final String text;
  final String? center;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final ring = upper(text).replaceAll(RegExp(r'\s+'), ' ').trim();
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _SealPainter(ring, center, color, MediaQuery.textScalerOf(context))),
    );
  }
}

class _SealPainter extends CustomPainter {
  _SealPainter(this.ring, this.center, this.color, this.scaler);
  final String ring;
  final String? center;
  final Color color;
  final TextScaler scaler;

  static final _star = Path()
    ..moveTo(60, 44)
    ..lineTo(64.7, 53.6)
    ..lineTo(75.3, 55.1)
    ..lineTo(67.6, 62.6)
    ..lineTo(69.4, 73.1)
    ..lineTo(60, 68)
    ..lineTo(50.6, 73.1)
    ..lineTo(52.4, 62.6)
    ..lineTo(44.7, 55.1)
    ..lineTo(55.3, 53.6)
    ..close();

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 120;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..color = color;
    const c = Offset(60, 60);
    canvas.drawCircle(c * k, 57 * k, stroke..strokeWidth = 2.6 * k);
    canvas.drawCircle(c * k, 34 * k, stroke..strokeWidth = 1.4 * k);

    // Halka yazısı: soldan başlayıp tepeden geçerek r=44 yay boyunca, toplam 262 birime yayılmış.
    final label = '${ring.length > 60 ? '${ring.substring(0, 58)}…' : ring} ★';
    final fontSize = ring.length > 46 ? 7.2 : (ring.length > 34 ? 8.6 : 10.0);
    final style = TextStyle(fontFamily: DtFont.sans, fontSize: fontSize * k, fontWeight: FontWeight.w700, color: color, height: 1);
    final glyphs = <TextPainter>[];
    for (final ch in label.runes) {
      glyphs.add(TextPainter(text: TextSpan(text: String.fromCharCode(ch), style: style), textDirection: TextDirection.ltr, textScaler: scaler)..layout());
    }
    final natural = glyphs.fold<double>(0, (t, g) => t + g.width) / k;
    final extra = glyphs.isEmpty ? 0.0 : (262 - natural) / glyphs.length;
    var s = 0.0;
    for (final g in glyphs) {
      final w = g.width / k;
      final phi = math.pi + (s + w / 2) / 44;
      final p = Offset(60 + 44 * math.cos(phi), 60 + 44 * math.sin(phi)) * k;
      final base = g.computeDistanceToActualBaseline(TextBaseline.alphabetic);
      canvas.save();
      canvas.translate(p.dx, p.dy);
      canvas.rotate(phi + math.pi / 2);
      g.paint(canvas, Offset(-g.width / 2, -base));
      canvas.restore();
      s += w + extra;
    }
    for (final g in glyphs) {
      g.dispose();
    }

    if (center != null) {
      final tp = TextPainter(
        text: TextSpan(text: center, style: TextStyle(fontFamily: DtFont.sans, fontSize: 15 * k, fontWeight: FontWeight.w800, color: color, height: 1)),
        textDirection: TextDirection.ltr,
        textScaler: scaler,
      )..layout();
      final base = tp.computeDistanceToActualBaseline(TextBaseline.alphabetic);
      tp.paint(canvas, Offset(60 * k - tp.width / 2, 65 * k - base));
      tp.dispose();
    } else {
      canvas.save();
      canvas.scale(k);
      canvas.drawPath(_star, Paint()..color = color);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_SealPainter old) => old.ring != ring || old.center != center || old.color != color;
}

/// `Stamp` (`.dt-stamp`): çift çerçeveli, −7° eğik kaşe ("ASLI GİBİDİR").
class _Stamp extends StatelessWidget {
  const _Stamp({required this.text, required this.f, this.blue = false});
  final String text;
  final _F f;
  final bool blue;

  @override
  Widget build(BuildContext context) {
    final color = blue ? const Color.fromRGBO(36, 58, 156, 0.75) : const Color.fromRGBO(185, 32, 44, 0.78);
    final bw = f.em(0.22);
    final sf = f(family: DtFont.sans, weight: FontWeight.w800, spacing: f.em(0.12), color: color);
    return IgnorePointer(
      child: Transform.rotate(
        angle: deg(-7),
        child: _InkMask(
          child: CustomPaint(
            painter: _DoubleBorderPainter(color, bw, f.em(0.2)),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: f.em(0.8) + bw, vertical: f.em(0.35) + bw),
              child: Text(text, textAlign: TextAlign.center, style: sf(k: 1.02).s),
            ),
          ),
        ),
      ),
    );
  }
}

class _DoubleBorderPainter extends CustomPainter {
  _DoubleBorderPainter(this.color, this.width, this.radius);
  final Color color;
  final double width;
  final double radius;
  @override
  void paint(Canvas canvas, Size size) {
    final line = width / 3;
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = line
      ..color = color;
    final outer = (Offset.zero & size).deflate(line / 2);
    canvas.drawRRect(RRect.fromRectAndRadius(outer, Radius.circular(math.max(0, radius - line / 2))), p);
    final inner = (Offset.zero & size).deflate(width - line / 2);
    canvas.drawRRect(RRect.fromRectAndRadius(inner, Radius.circular(math.max(0, radius - width + line / 2))), p);
  }

  @override
  bool shouldRepaint(_DoubleBorderPainter old) => old.color != color || old.width != width;
}

// ---------------------------------------------------------------- Tablolar (CSS otomatik tablo düzeni)

/// Tek hücre: düz metin ya da özel çocuk. [nowrap] → satır kırılmaz.
class _Cell {
  const _Cell(this.text, this.style, {this.align = TextAlign.left, this.nowrap = false, this.span = 1, this.child, this.childWidth = 0, this.background});
  final String text;
  final Color? background;
  final TextStyle style;
  final TextAlign align;
  final bool nowrap;
  final int span;

  /// Metin yerine çizilecek parça (ölçü için [text] ve [childWidth] kullanılır).
  final Widget? child;

  /// Çocuğun metin dışında kapladığı ek genişlik (rozet dolgusu ve çerçevesi).
  final double childWidth;
}

class _TRow {
  const _TRow(this.cells, {this.background, this.top, this.bottom, this.cellBorder, this.padding = EdgeInsets.zero, this.valignTop = false});
  final List<_Cell> cells;
  final Color? background;
  final BorderSide? top;
  final BorderSide? bottom;

  /// Her hücrenin çevresi (çökmüş çerçeve; tekrarlanan çizgiler bir kez çizilir).
  final BorderSide? cellBorder;
  final EdgeInsets padding;
  final bool valignTop;
}

/// `table { width: 100%; border-collapse: collapse }` + `.dt-doc-scroll { overflow-x: auto }`:
/// sütunlar içeriğe göre (en az/en çok) paylaştırılır; sığmazsa yatay kaydırılır.
class _DocTable extends StatelessWidget {
  const _DocTable({required this.rows, required this.columns, required this.scaler, this.fixedFractions});
  final List<_TRow> rows;
  final int columns;
  final TextScaler scaler;

  /// Sabit oranlı sütunlar (ör. `.dt-idblock th { width: 34% }`).
  final List<double>? fixedFractions;

  double _width(String text, TextStyle style) {
    final tp = TextPainter(text: TextSpan(text: text, style: style), textDirection: TextDirection.ltr, maxLines: 1, textScaler: scaler)..layout();
    final w = tp.width.ceilToDouble() + 1;
    tp.dispose();
    return w;
  }

  (double, double) _measure(_Cell c) {
    final max = _width(c.text, c.style) + c.childWidth;
    if (c.nowrap) return (max, max);
    var min = 0.0;
    for (final w in c.text.split(RegExp(r'\s+'))) {
      if (w.isNotEmpty) min = math.max(min, _width(w, c.style));
    }
    return (min + c.childWidth, max);
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, cons) {
      final avail = cons.maxWidth;
      final mins = List<double>.filled(columns, 0);
      final maxs = List<double>.filled(columns, 0);
      for (final r in rows) {
        var col = 0;
        for (final c in r.cells) {
          if (c.span == 1 && col < columns) {
            final (mn, mx) = _measure(c);
            final pad = r.padding.horizontal + (r.cellBorder?.width ?? 0);
            mins[col] = math.max(mins[col], mn + pad);
            maxs[col] = math.max(maxs[col], mx + pad);
          }
          col += c.span;
        }
      }
      List<double> widths;
      if (fixedFractions != null) {
        widths = [for (final f in fixedFractions!) f * avail];
      } else {
        widths = _autoWidths(avail, mins, maxs);
      }
      final total = widths.fold<double>(0, (t, w) => t + w);
      final table = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var ri = 0; ri < rows.length; ri++) _row(rows[ri], widths, first: ri == 0),
        ],
      );
      if (total <= avail + 0.5) return table;
      return SingleChildScrollView(scrollDirection: Axis.horizontal, child: SizedBox(width: total, child: table));
    },
  );

  Widget _row(_TRow r, List<double> widths, {required bool first}) {
    final cells = <Widget>[];
    var col = 0;
    for (var i = 0; i < r.cells.length; i++) {
      final c = r.cells[i];
      var w = 0.0;
      for (var k = 0; k < c.span && col + k < widths.length; k++) {
        w += widths[col + k];
      }
      final b = r.cellBorder;
      final text = c.child ?? Text(c.text, style: c.style, textAlign: c.align, softWrap: !c.nowrap);
      cells.add(
        Container(
          width: w,
          padding: r.padding,
          alignment: r.valignTop
              ? (c.align == TextAlign.right ? Alignment.topRight : Alignment.topLeft)
              : (c.align == TextAlign.right ? Alignment.centerRight : Alignment.centerLeft),
          decoration: BoxDecoration(
            color: c.background ?? r.background,
            border: b == null
                ? Border(top: r.top ?? BorderSide.none, bottom: r.bottom ?? BorderSide.none)
                : Border(top: first ? b : BorderSide.none, left: i == 0 ? b : BorderSide.none, right: b, bottom: b),
          ),
          child: text,
        ),
      );
      col += c.span;
    }
    return IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: cells));
  }
}

/// CSS otomatik tablo genişliği: sığarsa en geniş içerikle orantılı büyür; sığmazsa en dar içerikten
/// başlayıp (en geniş − en dar) oranında paylaştırır; o da sığmazsa en dar (taşar, kaydırılır).
List<double> _autoWidths(double avail, List<double> mins, List<double> maxs) {
  final n = mins.length;
  final sumMax = maxs.fold<double>(0, (t, v) => t + v);
  final sumMin = mins.fold<double>(0, (t, v) => t + v);
  if (sumMax <= avail) {
    final extra = avail - sumMax;
    return [for (var i = 0; i < n; i++) maxs[i] + (sumMax > 0 ? extra * maxs[i] / sumMax : extra / n)];
  }
  if (sumMin >= avail) return List.of(mins);
  final room = avail - sumMin;
  final flex = [for (var i = 0; i < n; i++) maxs[i] - mins[i]];
  final sumFlex = flex.fold<double>(0, (t, v) => t + v);
  return [for (var i = 0; i < n; i++) mins[i] + (sumFlex > 0 ? room * flex[i] / sumFlex : room / n)];
}

// ---------------------------------------------------------------- Izgaralar

/// `grid-template-columns: repeat(auto-fit|auto-fill, minmax(min, 1fr))`.
class _AutoGrid extends StatelessWidget {
  const _AutoGrid({required this.minWidth, required this.children, this.rowGap = 0, this.columnGap = 0, this.fit = true});
  final double minWidth;
  final List<Widget> children;
  final double rowGap;
  final double columnGap;

  /// auto-fit: boş sütunlar çöker (öğeler genişler); auto-fill: boş sütunlar yer tutar.
  final bool fit;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, c) {
      final w = c.maxWidth;
      var cols = math.max(1, ((w + columnGap) / (minWidth + columnGap)).floor());
      if (fit) cols = math.max(1, math.min(cols, children.length));
      final colW = (w - columnGap * (cols - 1)) / cols;
      final rows = <Widget>[];
      for (var i = 0; i < children.length; i += cols) {
        final cells = <Widget>[];
        for (var k = 0; k < cols; k++) {
          if (k > 0) cells.add(SizedBox(width: columnGap));
          cells.add(SizedBox(width: colW, child: i + k < children.length ? children[i + k] : null));
        }
        if (rows.isNotEmpty) rows.add(SizedBox(height: rowGap));
        rows.add(Row(crossAxisAlignment: CrossAxisAlignment.start, children: cells));
      }
      return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: rows);
    },
  );
}

/// `<dl>` satırı: `dt` ve `dd` yan yana, sarılan (flex-wrap, gap).
Widget _dlInline(String dt, String dd, {required TextStyle dtStyle, required TextStyle ddStyle, required double gap, String suffix = ''}) =>
    Text.rich(
      TextSpan(
        children: [
          TextSpan(text: '$dt$suffix', style: dtStyle),
          WidgetSpan(child: SizedBox(width: gap)),
          TextSpan(text: dd, style: ddStyle),
        ],
      ),
    );

/// `<dl>` hücresi: `dt` üstte, `dd` altta.
Widget _dlStack(String dt, String dd, {required TextStyle dtStyle, required TextStyle ddStyle, double ddTop = 0}) => Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  mainAxisSize: MainAxisSize.min,
  children: [
    Text(dt, style: dtStyle),
    if (ddTop > 0) SizedBox(height: ddTop),
    Text(dd, style: ddStyle),
  ],
);

/// `width: min(100%, Nem); margin: 0 auto`.
Widget _centered(double maxWidth, Widget child) => Align(
  alignment: Alignment.topCenter,
  child: ConstrainedBox(
    constraints: BoxConstraints(maxWidth: maxWidth),
    child: SizedBox(width: double.infinity, child: child),
  ),
);

/// Barkod (`barcode(seed)`): siyah/boş çubuklar, yüzde genişliklerle.
class _BarcodePainter extends CustomPainter {
  _BarcodePainter(String seed) : bars = _bars(seed);
  final List<(double, double)> bars;

  static List<(double, double)> _bars(String seed) {
    var h = hashStr(seed);
    final out = <(double, double)>[];
    var x = 0.0;
    var black = true;
    while (x < 100) {
      h = imul32((h ^ (h >> 13)) & 0xFFFFFFFF, 2654435761);
      final w = black ? 0.6 + (h % 3) * 0.6 : 0.5 + (h % 4) * 0.5;
      if (black) out.add((x, math.min(100, x + w)));
      x += w;
      black = !black;
    }
    return out;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = const Color(0xFF1B1B1B);
    for (final (a, b) in bars) {
      canvas.drawRect(Rect.fromLTRB(size.width * a / 100, 0, size.width * b / 100, size.height), p);
    }
  }

  @override
  bool shouldRepaint(_BarcodePainter old) => false;
}
