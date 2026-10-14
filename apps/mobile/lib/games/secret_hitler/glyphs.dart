// games/secret-hitler/client/Glyphs.tsx + secret-hitler.css renkleri ve oyunun ortak küçük parçaları.
import 'package:flutter/material.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';

/// `.sh` değişkenleri.
abstract final class ShC {
  static const bg = Color(0xFF1A1240);
  static const edge = Color(0xFF000000);
  static const dim = Color(0xFF8A80B8);
  static const soft = Color(0xFF3A2E80);
  static const libInk = Color(0xFF9FD3FF);
  static const fasInk = Color(0xFFFFC1A6);
  static const nein = Color(0xFF0B0720);
}

/// `[data-party]` → `--side`.
Color sideColor(String party) => party == 'liberal' ? C.sky : C.coral;

/// `[data-party]` → `--side-ink`.
Color sideInk(String party) => party == 'liberal' ? ShC.libInk : ShC.fasInk;

/// Flex sütun `gap`: her öğenin arasına boşluk (Spacer dahil, CSS'teki `.sh-fill` gibi).
List<Widget> gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// Özgün simgeler (orijinal oyunun görselleri kullanılmaz).
const _powerPaths = <String, String>{
  'peek': '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.6" />',
  'investigate': '<circle cx="10.5" cy="10.5" r="5.5" /><path d="M15 15l5 5" />',
  'specialElection': '<path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />',
  'execution': '<path d="M6 6l12 12M18 6L6 18" />',
};

final _cache = <String, String>{};

class PowerGlyph extends StatelessWidget {
  const PowerGlyph({super.key, required this.power, this.size = 18, this.color});
  final String power;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) => SSvg(
    _cache.putIfAbsent(
      'power:$power',
      () =>
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.6" '
          'stroke-linecap="round" stroke-linejoin="round">${_powerPaths[power] ?? ''}</svg>',
    ),
    width: size,
    height: size,
    color: color,
  );
}

/// Yasa amblemi: liberal = halka, faşist = keskin elmas.
class PolicyGlyph extends StatelessWidget {
  const PolicyGlyph({super.key, required this.policy, this.size = 22, this.color});
  final String policy;
  final double size;
  final Color? color;

  static const _liberal =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="2.4" />'
      '<circle cx="12" cy="12" r="2.4" fill="currentColor" /></svg>';
  static const _fascist = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5l7 9.5-7 9.5-7-9.5z" fill="currentColor" /></svg>';

  @override
  Widget build(BuildContext context) => SSvg(policy == 'liberal' ? _liberal : _fascist, width: size, height: size, color: color);
}

/// CSS `table-layout: auto` + `width: 100%`: sütunlar içeriklerinin en küçük/en büyük genişliğine göre paylaşılır.
class CssAutoColumn extends TableColumnWidth {
  const CssAutoColumn(this.index, this.mins, this.maxs);
  final int index;
  final List<double> mins;
  final List<double> maxs;

  double _width(double container) {
    if (!container.isFinite) return maxs[index];
    final sumMax = maxs.fold<double>(0, (a, b) => a + b);
    final sumMin = mins.fold<double>(0, (a, b) => a + b);
    if (sumMax <= container) {
      return sumMax <= 0 ? container / maxs.length : maxs[index] + (container - sumMax) * maxs[index] / sumMax;
    }
    if (sumMin >= container) return mins[index];
    final d = sumMax - sumMin;
    return mins[index] + (container - sumMin) * (d <= 0 ? 0 : (maxs[index] - mins[index]) / d);
  }

  @override
  double minIntrinsicWidth(Iterable<RenderBox> cells, double containerWidth) => containerWidth.isFinite ? _width(containerWidth) : mins[index];

  @override
  double maxIntrinsicWidth(Iterable<RenderBox> cells, double containerWidth) => _width(containerWidth);
}

/// Metnin tek satırdaki (en büyük) ya da en uzun kelimeye göre (en küçük) genişliği.
double measureText(BuildContext context, String text, TextStyle style, {bool min = false}) {
  final tp = TextPainter(text: TextSpan(text: text, style: style), textDirection: TextDirection.ltr, textScaler: MediaQuery.textScalerOf(context))..layout();
  final w = min ? tp.minIntrinsicWidth : tp.maxIntrinsicWidth;
  tp.dispose();
  return w;
}
