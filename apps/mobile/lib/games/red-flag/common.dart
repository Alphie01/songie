// Red Flag / Green Flag ekranlarının ortak parçaları (red-flag.css, Flag.tsx).
import 'dart:async';

import 'package:flutter/material.dart';

import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'models.dart';
import 'strings.dart';

/// Green = nane, red = kırmızı, "asla olmaz" = lila (`[data-vote]` → `--v`).
Color voteColor(String vote) => switch (vote) {
  'green' => C.mint,
  'red' => C.red,
  'never' => C.lilac,
  _ => C.panel3,
};

/// Seçenek adları: sınır testinde Varım / Hayır / Sınırım.
Map<String, String> labelsFor(Situation? item) => item?.category == limitCategory ? S.limitVote : S.vote;

int pct(int n, int total) => total > 0 ? (n / total * 100).round() : 0;

/// CSS `display:flex; flex-direction:column; gap:N`: aralık her öğenin arasına girer (boş `flex:1` dahil).
List<Widget> gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// Yatay `gap`.
List<Widget> gappedRow(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(width: gap));
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

/// CSS `flex: none` sağdaki etiket: doğal genişliğinde durur; yazı çok büyürse ekranın %60'ını geçmez, satırı taşırmaz.
class Trailing extends StatelessWidget {
  const Trailing({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.6),
    child: child,
  );
}

/// Flag.tsx `VoteIcon`: çizgi bayrak; "Asla olmaz" için eksi işaretli daire.
class VoteIcon extends StatelessWidget {
  const VoteIcon({super.key, required this.vote, this.size = 20, this.color});
  final String vote;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) => SSvg(
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.4" '
    'stroke-linecap="round" stroke-linejoin="round"><path d="${vote == 'never' ? 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M7 12h10' : 'M5 21V4M5 4h12l-2 4 2 4H5'}" /></svg>',
    width: size,
    height: size,
    color: color,
  );
}

/// CSS `transform-origin: left; animation: grow … from scaleX(0)`.
class GrowX extends StatefulWidget {
  const GrowX({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 600),
    this.curve = const Cubic(0.2, 0.8, 0.2, 1),
    this.delay = Duration.zero,
  });
  final Widget child;
  final Duration duration;
  final Curve curve;
  final Duration delay;

  @override
  State<GrowX> createState() => _GrowXState();
}

class _GrowXState extends State<GrowX> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: widget.duration);
  Timer? _delay;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else if (widget.delay == Duration.zero) {
      _c.forward();
    } else {
      _delay = Timer(widget.delay, () => mounted ? _c.forward() : null);
    }
  }

  @override
  void dispose() {
    _delay?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    child: widget.child,
    builder: (context, child) => Transform.scale(scaleX: widget.curve.transform(_c.value), scaleY: 1, alignment: Alignment.centerLeft, child: child),
  );
}

/// `.rf-bar`: dağılım çubuğu; her parça kendi solundan büyür (90ms arayla).
class VoteBar extends StatelessWidget {
  const VoteBar({super.key, required this.counts, required this.total, required this.options});
  final Counts counts;
  final int total;
  final List<String> options;

  @override
  Widget build(BuildContext context) {
    final parts = <Widget>[];
    for (var i = 0; i < options.length; i++) {
      final v = options[i];
      if (counts[v] <= 0) continue;
      final first = parts.isEmpty;
      parts.add(
        Expanded(
          flex: counts[v],
          child: GrowX(
            delay: Duration(milliseconds: i * 90),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: voteColor(v),
                border: first ? null : const Border(left: BorderSide(color: C.ink, width: 2)),
              ),
            ),
          ),
        ),
      );
    }
    if (total == 0) {
      parts.add(
        Expanded(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: voteColor('none'),
              border: parts.isEmpty ? null : const Border(left: BorderSide(color: C.ink, width: 2)),
            ),
          ),
        ),
      );
    }
    return Semantics(
      label: options.map((v) => '${S.vote[v]} ${counts[v]}').join(', '),
      child: Container(
        height: 18,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: C.panel2,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(R.pill),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: parts),
      ),
    );
  }
}

/// `.rf-pbar`: profil çubuğu (animasyonsuz, parçalar arasında çizgi yok).
class ProfileBar extends StatelessWidget {
  const ProfileBar({super.key, required this.green, required this.red, required this.never});
  final int green;
  final int red;
  final int never;

  @override
  Widget build(BuildContext context) => Container(
    height: 10,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      color: C.panel2,
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(R.pill),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (green > 0)
          Expanded(
            flex: green,
            child: const ColoredBox(color: C.mint),
          ),
        if (red > 0)
          Expanded(
            flex: red,
            child: const ColoredBox(color: C.red),
          ),
        if (never > 0)
          Expanded(
            flex: never,
            child: const ColoredBox(color: C.lilac),
          ),
      ],
    ),
  );
}

/// `.rf-box-title`: küçük, büyük harfli başlık.
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

/// `.rf-howto`: kesikli üst çizgi, sarı numaralı adımlar.
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

/// `.chip`; +18 seçiliyken zemin kırmızı (`.rf-settings .chip[data-bold][aria-pressed='true']`), çerçeve mürekkep kalır.
class RfChip extends StatelessWidget {
  const RfChip({super.key, required this.label, required this.selected, this.onTap, this.count, this.adult = false});
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final String? count;
  final bool adult;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onTap,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 48),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: selected ? (adult ? C.red : C.yellow) : C.panel,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(12),
          boxShadow: selected ? hardShadow(0, 3) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(
              child: Text(label, style: T.d(15, color: fg, height: 1.45), maxLines: 2),
            ),
            if (count != null) ...[
              const SizedBox(width: 6),
              Opacity(
                opacity: 0.75,
                child: Text(count!, style: T.d(12, color: fg, height: 1.45)),
              ),
            ],
          ],
        ),
      ),
    );
  }
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
