// Aramızdaki En ekranlarının ortak küçük parçaları (most-likely.css).
import 'dart:async';

import 'package:flutter/material.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';

/// CSS `display:flex; flex-direction:column; gap:N`: aralık her öğenin arasına girer (boş `flex:1` dahil).
List<Widget> gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// JS `Array.prototype.sort` gibi kararlı sıralama (eşitlerde ilk sıra korunur).
List<E> stableSorted<E>(Iterable<E> items, int Function(E a, E b) compare) {
  final indexed = items.toList().asMap().entries.toList()
    ..sort((a, b) {
      final c = compare(a.value, b.value);
      return c != 0 ? c : a.key - b.key;
    });
  return [for (final e in indexed) e.value];
}

/// CSS `flex: none` sağdaki etiket: doğal genişliğinde durur. Yazı çok büyürse (erişilebilirlik ölçeği)
/// ekran genişliğinin %60'ını geçmez; satırı taşırmak yerine alt satıra kayar.
class Trailing extends StatelessWidget {
  const Trailing({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.6),
    child: child,
  );
}

/// `.ml-cta`: sarı ana düğme (58px, r20, 0 5 gölge, basınca 4px).
class MlCta extends StatelessWidget {
  const MlCta({super.key, required this.label, required this.onTap});
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) =>
      SButton(label: label, tone: BtnTone.yellow, block: true, minHeight: 58, radius: 20, shadowY: 5, pressY: 4, fontSize: 20, onPressed: onTap);
}

/// `.ml-ghost`: mor çerçeveli şeffaf düğme (ikon + yazı).
class MlGhost extends StatelessWidget {
  const MlGhost({super.key, required this.icon, required this.label, required this.onTap});
  final String icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 46),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border.all(color: C.violet, width: 2),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SIcon(icon, size: 15, color: C.text2),
          const SizedBox(width: 6),
          Text(
            label,
            style: T.b(14, color: C.text2, weight: FontWeight.w800),
          ),
        ],
      ),
    ),
  );
}

/// CSS `transform-origin: left; animation: grow … from scaleX(0)`: soldan ölçeklenerek açılır.
class GrowX extends StatefulWidget {
  const GrowX({super.key, required this.child, this.duration = const Duration(milliseconds: 500), this.curve = Curves.easeOut, this.delay = Duration.zero});
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
