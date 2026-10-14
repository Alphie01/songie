// games/detective/client/FloorPlan.tsx karşılığı: mekân krokisi (odalar, kapı açılış yayları, pencereler,
// numaralı işaretler, ölçek, kuzey) ve lejant. Çizim plan biriminde yapılır, genişliğe ölçeklenir.
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import 'bits.dart';
import 'models.dart';
import 'strings.dart';

const _door = 0.9;
const _win = 1.2;
const _wall = 0.14;
const _pad = 1.2;

/// `.dt-fp` renkleri (kâğıt üstünde) ve `[data-compact]` (panoda koyu zemin).
class _FpColors {
  const _FpColors(this.ink, this.grid, this.cut, this.red);
  final Color ink;
  final Color grid;
  final Color cut;
  final Color red;
  static const paper = _FpColors(Color(0xFF23252A), Color(0x12000000), DtC.paper, Color(0xFFB3261E));
  static const compact = _FpColors(Color(0xFFCFD6CF), Color(0x0DFFFFFF), C.panel2, Color(0xFFF66464));
}

/// Mekân krokisi. [compact]: panodaki küçük hali (`.dt-loc-plan`, 12px). [fontSize]: lejantın `em` tabanı.
class FloorPlanView extends StatelessWidget {
  const FloorPlanView({super.key, required this.plan, required this.title, this.compact = false, required this.fontSize});
  final FloorPlan plan;
  final String title;
  final bool compact;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final colors = compact ? _FpColors.compact : _FpColors.paper;
    final drawing = LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth.isFinite ? c.maxWidth : 320.0;
        final vbW = plan.width + _pad * 2;
        final vbH = plan.height + _pad * 2 + 0.6;
        final s = w / vbW;
        return Semantics(
          label: title,
          image: true,
          child: SizedBox(width: w, height: vbH * s, child: CustomPaint(painter: _FpPainter(plan, colors, s))),
        );
      },
    );
    final markers = plan.markers;
    final doors = plan.doors.where((d) => d.label != null && d.label!.isNotEmpty).toList();
    if (markers.isEmpty) return drawing;

    final lf = fontSize * 0.82;
    final color = compact ? C.text2 : DtC.ink;
    final family = compact ? T.font : DtFont.sans;
    final height = compact ? 1.45 : 1.5;
    final text = TextStyle(fontFamily: family, fontSize: lf, fontWeight: FontWeight.w600, color: color, height: height, leadingDistribution: TextLeadingDistribution.even);
    final bf = lf * 0.85;
    Widget badge(String n, {bool door = false}) => Container(
      width: bf * 1.6,
      height: bf * 1.6,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: door ? BoxShape.rectangle : BoxShape.circle,
        borderRadius: door ? BorderRadius.circular(2) : null,
        border: Border.all(color: door ? colors.ink : colors.red, width: 1.5),
      ),
      child: Text(n, style: text.copyWith(fontSize: bf, fontWeight: FontWeight.w700, color: colors.red, height: 1)),
    );
    Widget item(Widget b, String label, String kind) => Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        b,
        SizedBox(width: lf * 0.5),
        Flexible(child: Text(label, style: text)),
        SizedBox(width: lf * 0.5),
        Flexible(child: Opacity(opacity: 0.55, child: Text('($kind)', style: text.copyWith(fontSize: lf * 0.9)))),
      ],
    );
    final items = <Widget>[
      for (var i = 0; i < markers.length; i++) item(badge('${i + 1}'), markers[i].label, SDoc.marker[markers[i].kind] ?? markers[i].kind),
      for (final d in doors) item(badge(' ', door: true), d.label!, SDoc.door),
    ];
    final legend = LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        final colGap = lf;
        final cols = compact ? 1 : math.max(1, ((w + colGap) / (lf * 13 + colGap)).floor());
        final colW = (w - colGap * (cols - 1)) / cols;
        final rows = <Widget>[];
        for (var i = 0; i < items.length; i += cols) {
          final cells = <Widget>[];
          for (var k = 0; k < cols; k++) {
            if (k > 0) cells.add(SizedBox(width: colGap));
            cells.add(SizedBox(width: colW, child: i + k < items.length ? items[i + k] : null));
          }
          if (rows.isNotEmpty) rows.add(SizedBox(height: lf * 0.35));
          rows.add(Row(crossAxisAlignment: CrossAxisAlignment.start, children: cells));
        }
        return Semantics(label: SDoc.legend, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: rows));
      },
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [drawing, SizedBox(height: lf * 0.8), legend],
    );
  }
}

class _FpPainter extends CustomPainter {
  _FpPainter(this.plan, this.c, this.s);
  final FloorPlan plan;
  final _FpColors c;

  /// Plan birimi → piksel.
  final double s;

  Offset _p(double x, double y) => Offset((x + _pad) * s, (y + _pad) * s);
  Rect _r(double x, double y, double w, double h) => Rect.fromLTWH((x + _pad) * s, (y + _pad) * s, w * s, h * s);

  Paint _stroke(Color color, double width) => Paint()
    ..style = PaintingStyle.stroke
    ..color = color
    ..strokeWidth = width * s;

  void _dashed(Canvas canvas, Path path, Paint paint, double dash, double gap) {
    for (final m in path.computeMetrics()) {
      double d = 0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, math.min(d + dash * s, m.length)), paint);
        d += (dash + gap) * s;
      }
    }
  }

  void _text(Canvas canvas, String t, double x, double y, double fontSize, Color color, FontWeight weight, {bool middle = false, bool central = false}) {
    final tp = TextPainter(
      text: TextSpan(text: t, style: TextStyle(fontFamily: DtFont.sans, fontSize: fontSize * s, fontWeight: weight, color: color, height: 1)),
      textDirection: TextDirection.ltr,
    )..layout();
    final base = tp.computeDistanceToActualBaseline(TextBaseline.alphabetic);
    final p = _p(x, y);
    // dominant-baseline: middle → küçük harf yüksekliğinin yarısı kadar aşağı
    final by = central ? p.dy + 0.26 * fontSize * s : p.dy;
    tp.paint(canvas, Offset(middle ? p.dx - tp.width / 2 : p.dx, by - base));
    tp.dispose();
  }

  @override
  void paint(Canvas canvas, Size size) {
    final w = plan.width;
    final h = plan.height;
    final cx = w / 2;
    final cy = h / 2;
    final unit = math.max(w, h) / 22;
    final fs = math.max(0.36, math.min(0.55, unit * 1.1));

    // Izgara (1 birim)
    final grid = Paint()
      ..color = c.grid
      ..strokeWidth = 0.01 * s;
    canvas.save();
    canvas.clipRect(_r(0, 0, w, h));
    for (double x = 0; x < w; x += 1) {
      canvas.drawLine(_p(x + 0.005, 0), _p(x + 0.005, h), grid);
    }
    for (double y = 0; y < h; y += 1) {
      canvas.drawLine(_p(0, y + 0.005), _p(w, y + 0.005), grid);
    }
    canvas.restore();

    // Açık alanlar: taralı, kesikli çerçeve, %60 saydam
    for (final r in plan.rooms.where((r) => r.outdoor)) {
      final rect = _r(r.x, r.y, r.w, r.h);
      canvas.saveLayer(rect.inflate(0.1 * s), Paint()..color = const Color.fromRGBO(0, 0, 0, 0.6));
      canvas.save();
      canvas.clipRect(rect);
      final hatch = _stroke(c.ink.withValues(alpha: c.ink.a * 0.35), 0.015);
      const step = 0.5 * math.sqrt2;
      final lo = ((r.x + r.y) / step).floor() - 1;
      final hi = ((r.x + r.w + r.y + r.h) / step).ceil() + 1;
      for (var k = lo; k <= hi; k++) {
        final cc = k * step;
        canvas.drawLine(_p(cc - (r.y - 1), r.y - 1), _p(cc - (r.y + r.h + 1), r.y + r.h + 1), hatch);
      }
      canvas.restore();
      _dashed(canvas, Path()..addRect(rect), _stroke(c.ink, 0.04), 0.2, 0.15);
      canvas.restore();
    }

    // Odalar
    for (final r in plan.rooms.where((r) => !r.outdoor)) {
      canvas.drawRect(_r(r.x, r.y, r.w, r.h), _stroke(c.ink, _wall));
    }

    final cut = Paint()..color = c.cut;

    // Pencereler
    final winLine = _stroke(c.ink, 0.03);
    for (final wd in plan.windows) {
      if (wd.vertical) {
        canvas.drawRect(_r(wd.x - _wall, wd.y - _win / 2, _wall * 2, _win), cut);
        for (final dx in [-_wall * 0.7, _wall * 0.7, 0.0]) {
          canvas.drawLine(_p(wd.x + dx, wd.y - _win / 2), _p(wd.x + dx, wd.y + _win / 2), winLine);
        }
      } else {
        canvas.drawRect(_r(wd.x - _win / 2, wd.y - _wall, _win, _wall * 2), cut);
        for (final dy in [-_wall * 0.7, _wall * 0.7, 0.0]) {
          canvas.drawLine(_p(wd.x - _win / 2, wd.y + dy), _p(wd.x + _win / 2, wd.y + dy), winLine);
        }
      }
    }

    // Kapılar: boşluk, kanat ve kesikli açılış yayı
    final leaf = _stroke(c.ink, 0.05);
    final swing = _stroke(c.ink, 0.03);
    for (final d in plan.doors) {
      if (d.vertical) {
        final dir = d.x > cx ? 1.0 : -1.0;
        final y0 = d.y - _door / 2;
        canvas.drawRect(_r(d.x - _wall, y0, _wall * 2, _door), cut);
        canvas.drawLine(_p(d.x, y0), _p(d.x + _door * dir, y0), leaf);
        final arc = Path()..addArc(Rect.fromCircle(center: _p(d.x, y0), radius: _door * s), dir > 0 ? 0 : math.pi, dir > 0 ? math.pi / 2 : -math.pi / 2);
        _dashed(canvas, arc, swing, 0.08, 0.06);
      } else {
        final dir = d.y > cy ? -1.0 : 1.0;
        final x0 = d.x - _door / 2;
        canvas.drawRect(_r(x0, d.y - _wall, _door, _wall * 2), cut);
        canvas.drawLine(_p(x0, d.y), _p(x0, d.y + _door * dir), leaf);
        final arc = Path()..addArc(Rect.fromCircle(center: _p(x0, d.y), radius: _door * s), dir > 0 ? math.pi / 2 : -math.pi / 2, dir > 0 ? -math.pi / 2 : math.pi / 2);
        _dashed(canvas, arc, swing, 0.08, 0.06);
      }
    }

    // Oda adları: işaret varsa sol üste, yoksa ortaya
    final labelColor = c.ink.withValues(alpha: c.ink.a * 0.8);
    for (final r in plan.rooms) {
      final crowded = plan.markers.any((m) => m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h);
      if (crowded) {
        _text(canvas, r.label, r.x + 0.3, r.y + 0.3 + fs, fs * 0.9, labelColor, FontWeight.w600);
      } else {
        _text(canvas, r.label, r.x + r.w / 2, r.y + r.h / 2, fs, labelColor, FontWeight.w600, middle: true, central: true);
      }
    }

    // İşaretler
    for (var i = 0; i < plan.markers.length; i++) {
      final m = plan.markers[i];
      _marker(canvas, m, i + 1);
      _text(canvas, '${i + 1}', m.x + 0.45, m.y - 0.35, fs * 0.8, c.red, FontWeight.w700);
    }

    // Ölçek çubuğu
    final scale = _stroke(c.ink, 0.04);
    final sy = h + 0.75;
    canvas.drawLine(_p(0, sy), _p(1, sy), scale);
    canvas.drawLine(_p(0, sy - 0.15), _p(0, sy + 0.15), scale);
    canvas.drawLine(_p(1, sy - 0.15), _p(1, sy + 0.15), scale);
    _text(canvas, SDoc.scale, 1.25, sy + 0.14, 0.36, c.ink, FontWeight.w600);

    // Kuzey
    final nx = w + 0.55;
    const ny = -0.5;
    final north = Path()
      ..moveTo(_p(nx, ny - 0.45).dx, _p(nx, ny - 0.45).dy)
      ..lineTo(_p(nx + 0.22, ny + 0.25).dx, _p(nx + 0.22, ny + 0.25).dy)
      ..lineTo(_p(nx, ny + 0.12).dx, _p(nx, ny + 0.12).dy)
      ..lineTo(_p(nx - 0.22, ny + 0.25).dx, _p(nx - 0.22, ny + 0.25).dy)
      ..close();
    canvas.drawPath(north, Paint()..color = c.ink);
    _text(canvas, SDoc.north, nx, ny + 0.7, 0.34, c.ink, FontWeight.w600, middle: true);
  }

  void _marker(Canvas canvas, PlanMarker m, int n) {
    const r = 0.34;
    final red = _stroke(c.red, 0.07);
    final x = m.x;
    final y = m.y;
    switch (m.kind) {
      case 'body':
        canvas.drawCircle(_p(x, y), (r + 0.08) * s, red);
        canvas.drawLine(_p(x - r * 0.6, y - r * 0.6), _p(x + r * 0.6, y + r * 0.6), red);
        canvas.drawLine(_p(x + r * 0.6, y - r * 0.6), _p(x - r * 0.6, y + r * 0.6), red);
      case 'camera':
        final fill = Paint()..color = c.ink;
        final tri = Path()
          ..moveTo(_p(x, y).dx, _p(x, y).dy)
          ..lineTo(_p(x + r * 1.6, y - r * 0.9).dx, _p(x + r * 1.6, y - r * 0.9).dy)
          ..lineTo(_p(x + r * 1.6, y + r * 0.9).dx, _p(x + r * 1.6, y + r * 0.9).dy)
          ..close();
        canvas.drawPath(tri, fill);
        canvas.drawRect(_r(x - r * 0.5, y - r * 0.5, r, r), fill);
      case 'item':
        canvas.save();
        final cp = _p(x, y);
        canvas.translate(cp.dx, cp.dy);
        canvas.rotate(math.pi / 4);
        canvas.drawRect(Rect.fromLTWH(-r * 0.8 * s, -r * 0.8 * s, r * 1.6 * s, r * 1.6 * s), _stroke(const Color(0xFF3A78C9), 0.07));
        canvas.restore();
      case 'stain':
        // M x,y−r c(.6r 0, r .4r, .9r .9r) s(−.2r r, −.9r r) s(−r −.3r, −r −.9r) s(.4r −r, r −r) z
        var cur = Offset(x, y - r);
        final path = Path()..moveTo(_p(cur.dx, cur.dy).dx, _p(cur.dx, cur.dy).dy);
        Offset lastC2;
        {
          final c1 = cur + const Offset(r * 0.6, 0);
          final c2 = cur + const Offset(r, r * 0.4);
          final e = cur + const Offset(r * 0.9, r * 0.9);
          path.cubicTo(_p(c1.dx, c1.dy).dx, _p(c1.dx, c1.dy).dy, _p(c2.dx, c2.dy).dx, _p(c2.dx, c2.dy).dy, _p(e.dx, e.dy).dx, _p(e.dx, e.dy).dy);
          lastC2 = c2;
          cur = e;
        }
        for (final (c2d, ed) in const [(Offset(-r * 0.2, r), Offset(-r * 0.9, r)), (Offset(-r, -r * 0.3), Offset(-r, -r * 0.9)), (Offset(r * 0.4, -r), Offset(r, -r))]) {
          final c1 = cur * 2 - lastC2;
          final c2 = cur + c2d;
          final e = cur + ed;
          path.cubicTo(_p(c1.dx, c1.dy).dx, _p(c1.dx, c1.dy).dy, _p(c2.dx, c2.dy).dx, _p(c2.dx, c2.dy).dy, _p(e.dx, e.dy).dx, _p(e.dx, e.dy).dy);
          lastC2 = c2;
          cur = e;
        }
        path.close();
        canvas.drawPath(path, Paint()..color = const Color.fromRGBO(130, 70, 30, 0.55));
      default:
        canvas.drawCircle(_p(x, y), r * s, Paint()..color = c.ink);
        _text(canvas, '$n', x, y + 0.13, 0.36, c.cut, FontWeight.w700, middle: true);
    }
  }

  @override
  bool shouldRepaint(_FpPainter old) => old.plan != plan || old.s != s || old.c != c;
}
