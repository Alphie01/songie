// Gizli İtiraflar ekranlarının ortak parçaları (confessions.css).
import 'package:flutter/material.dart';

import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'strings.dart';

/// Tasarımda token'ı olmayan not kâğıdı renkleri (`--cf-note`, `--cf-note-ink`, `--cf-quote`).
const noteColor = Color(0xFFFFE680);
const noteInk = Color(0xFF2B2116);
const quoteColor = Color(0xFFC9A400);

/// CSS `display:flex; flex-direction:column; gap:N`: aralık her öğenin arasına girer.
List<Widget> gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// JS `Array.prototype.sort` gibi kararlı sıralama.
List<E> stableSorted<E>(Iterable<E> items, int Function(E a, E b) compare) {
  final indexed = items.toList().asMap().entries.toList()
    ..sort((a, b) {
      final c = compare(a.value, b.value);
      return c != 0 ? c : a.key - b.key;
    });
  return [for (final e in indexed) e.value];
}

/// CSS `Nch`: yazı tipindeki "0" genişliğinin N katı (yazı ölçeğiyle birlikte büyür).
double chWidth(BuildContext context, TextStyle style, int n) {
  final tp = TextPainter(
    text: TextSpan(text: '0' * n, style: style),
    textDirection: TextDirection.ltr,
    textScaler: MediaQuery.textScalerOf(context),
  )..layout();
  final w = tp.width;
  tp.dispose();
  return w;
}

/// `.cf-big`: sarı büyük düğme (58px, r20, 0 5 gölge, 21px; kapalıyken %55).
class CfBig extends StatelessWidget {
  const CfBig({super.key, required this.label, required this.onTap});
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => SButton(
    label: label,
    tone: BtnTone.yellow,
    block: true,
    minHeight: 58,
    radius: 20,
    shadowY: 5,
    pressY: 4,
    fontSize: 21,
    disabledOpacity: 0.55,
    onPressed: onTap,
  );
}

/// `.cf-box-title` / `.cf-eyebrow`: küçük, büyük harfli başlık.
class BoxTitle extends StatelessWidget {
  const BoxTitle(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
    header: true,
    child: Text(
      trUpper(text),
      style: T.b(12, color: C.text3, weight: FontWeight.w800, letterSpacing: 1.5),
    ),
  );
}

/// `.cf-host`: ortalanmış hayalet düğmeler, altında tam satır not.
class HostBox extends StatelessWidget {
  const HostBox({super.key, required this.buttons, this.hint});
  final List<Widget> buttons;
  final String? hint;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 8,
    children: [
      Wrap(alignment: WrapAlignment.center, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: buttons),
      if (hint != null)
        Text(
          hint!,
          style: T.b(13, color: C.text3, weight: FontWeight.w700),
          textAlign: TextAlign.center,
        ),
    ],
  );
}

/// `border-top: 3px dashed var(--violet)` (Chrome: 3px çizgide 6px çizgi, 3px boşluk).
class DashedTopPainter extends CustomPainter {
  const DashedTopPainter({this.color = C.violet, this.width = 3, this.dash = 6, this.gap = 3});
  final Color color;
  final double width;
  final double dash;
  final double gap;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = width;
    for (double x = 0; x < size.width; x += dash + gap) {
      final end = x + dash < size.width ? x + dash : size.width;
      canvas.drawLine(Offset(x, width / 2), Offset(end, width / 2), p);
    }
  }

  @override
  bool shouldRepaint(DashedTopPainter old) => old.color != color || old.width != width;
}

/// `.cf-howto`: kesikli üst çizgi, sarı numaralı adımlar.
class HowToSection extends StatelessWidget {
  const HowToSection({super.key});

  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: const DashedTopPainter(),
    child: Padding(
      padding: const EdgeInsets.only(top: 18 + 3),
      child: VStack(
        gap: 12,
        children: [
          const BoxTitle(SHowTo.title),
          VStack(
            gap: 12,
            children: [
              for (var i = 0; i < SHowTo.steps.length; i++)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: C.yellow,
                        shape: BoxShape.circle,
                        border: Border.all(color: C.ink, width: 2),
                      ),
                      child: Text(
                        '${i + 1}',
                        style: T.d(14, color: C.ink2),
                        textScaler: TextScaler.noScaling,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(SHowTo.steps[i].$1, style: T.d(17, color: C.text, height: 1.2)),
                          const SizedBox(height: 2),
                          Text(SHowTo.steps[i].$2, style: T.b(14, color: C.text2)),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    ),
  );
}

/// Satırdaki `.toggle` (`width: auto; min-width: 120px`): "Açık/Kapalı" + anahtar.
class RowToggle extends StatelessWidget {
  const RowToggle({super.key, required this.on, required this.label, this.onTap});
  final bool on;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: on,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44, minWidth: 120),
      padding: const EdgeInsets.only(left: 14, right: 12),
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(R.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              on ? SSettings.on : SSettings.off,
              style: T.b(15, color: C.text2, weight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 12),
          ToggleKnob(on: on),
        ],
      ),
    ),
  );
}
