// games/intrigue/client/PlayView.tsx: HowTo + RoleTable (`.howto`, `.ig-legend`, `.ig-table`).
import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'models.dart';
import 'role_art.dart';
import 'strings.dart';

/// `border-top: 3px dashed var(--violet)` (Chromium: 3px çizgide 6px çizgi, 3px boşluk).
class _DashedTop extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = C.violet
      ..strokeWidth = 3;
    for (double x = 0; x < size.width; x += 9) {
      canvas.drawLine(Offset(x, 1.5), Offset((x + 6).clamp(0, size.width), 1.5), p);
    }
  }

  @override
  bool shouldRepaint(_DashedTop old) => false;
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
      // Fazla genişlik en büyük genişliklerle orantılı dağılır.
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

/// `RoleTable`: rol, eylemi ve engellediği eylem.
class RoleTable extends StatelessWidget {
  const RoleTable({super.key});

  @override
  Widget build(BuildContext context) {
    final head = T.b(12, color: C.text3, weight: FontWeight.w800);
    final cell = T.b(13, color: C.text2, weight: FontWeight.w700);
    TextStyle roleStyle(String r) => T.b(13, color: roleColor(r), weight: FontWeight.w800);
    const padX = 12.0;

    double w(String t, TextStyle s, {bool min = false}) => measureText(context, t, s, min: min);
    final roleW = [w(SHowto.role, head), for (final r in roles) 18 + 6 + w(roleName[r]!, roleStyle(r))].reduce((a, b) => a > b ? a : b) + padX;
    double colMax(String h, Map<String, String> m) => [w(h, head), for (final r in roles) w(m[r]!, cell)].reduce((a, b) => a > b ? a : b) + padX;
    double colMin(String h, Map<String, String> m) => [w(h, head, min: true), for (final r in roles) w(m[r]!, cell, min: true)].reduce((a, b) => a > b ? a : b) + padX;
    final mins = [roleW, colMin(SHowto.action, roleAction), colMin(SHowto.blocks, roleBlocks)];
    final maxs = [roleW, colMax(SHowto.action, roleAction), colMax(SHowto.blocks, roleBlocks)];

    const rowLine = BoxDecoration(border: Border(bottom: BorderSide(color: C.line2, width: 2)));
    Widget pad(Widget child) => Padding(padding: const EdgeInsets.fromLTRB(6, 8, 6, 8 + 2), child: child);

    return Semantics(
      label: SHowto.roles,
      child: Table(
        columnWidths: {for (var i = 0; i < 3; i++) i: CssAutoColumn(i, mins, maxs)},
        defaultVerticalAlignment: TableCellVerticalAlignment.top,
        children: [
          TableRow(
            decoration: rowLine,
            children: [
              pad(Text(SHowto.role, style: head)),
              pad(Text(SHowto.action, style: head)),
              pad(Text(SHowto.blocks, style: head)),
            ],
          ),
          for (final r in roles)
            TableRow(
              decoration: rowLine,
              children: [
                pad(
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Glyph(role: r, size: 18, color: roleColor(r)),
                      const SizedBox(width: 6),
                      Flexible(child: Text(roleName[r]!, style: roleStyle(r), softWrap: false, overflow: TextOverflow.visible)),
                    ],
                  ),
                ),
                pad(Text(roleAction[r]!, style: cell)),
                pad(Text(roleBlocks[r]!, style: cell)),
              ],
            ),
        ],
      ),
    );
  }
}

/// `HowTo`: nasıl oynanır, herkesin yapabildikleri, rol tablosu.
class IgHowTo extends StatelessWidget {
  const IgHowTo({super.key});

  @override
  Widget build(BuildContext context) {
    final sub = T.d(15, color: C.text, height: 1.05);
    return Padding(
      padding: const EdgeInsets.only(top: 32),
      child: CustomPaint(
        painter: _DashedTop(),
        child: Padding(
          padding: const EdgeInsets.only(top: 3 + 28),
          child: VStack(
            gap: 16,
            children: [
              Semantics(header: true, child: Text(SHowto.title, style: T.d(22, color: C.text, height: 1.05))),
              VStack(
                gap: 16,
                children: [
                  for (var i = 0; i < SHowto.steps.length; i++)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(padding: const EdgeInsets.only(top: 2), child: Text('${i + 1}', style: T.d(16, color: C.yellow, height: 1.45))),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(SHowto.steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                              const SizedBox(height: 2),
                              Text(SHowto.steps[i].$2, style: T.b(13, color: C.text2)),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              Padding(padding: const EdgeInsets.only(top: 8), child: Text(SHowto.actions, style: sub)),
              VStack(
                gap: 10,
                children: [
                  for (final a in const ['income', 'aid', 'coup'])
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(width: 96, child: Text(actionName[a]!, style: T.b(13, color: C.text, weight: FontWeight.w800))),
                        const SizedBox(width: 10),
                        Expanded(child: Text(actionEffect[a]!, style: T.b(13, color: C.text2, weight: FontWeight.w700))),
                      ],
                    ),
                ],
              ),
              Padding(padding: const EdgeInsets.only(top: 8), child: Text(SHowto.roles, style: sub)),
              const RoleTable(),
            ],
          ),
        ),
      ),
    );
  }
}
