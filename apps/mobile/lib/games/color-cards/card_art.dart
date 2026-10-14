// games/color-cards/client/CardArt.tsx + color-cards.css (.cc-card, .cc-oval, .cc-back, .cc-swatch).
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'strings.dart';

/// `[data-color]` → `--c`: yeşil nane, sarı, kırmızı, mor lila, joker beyaz.
Color ccColor(String? color) => switch (color) {
  'green' => C.mint,
  'yellow' => C.yellow,
  'red' => C.red,
  'purple' => C.lilac,
  _ => C.paper,
};

/// `--cc-wild: conic-gradient(mint 0 25%, yellow 0 50%, red 0 75%, lilac 0)`: saat 12'den saat yönünde dört dilim.
const ccWild = SweepGradient(
  colors: [C.mint, C.mint, C.yellow, C.yellow, C.red, C.red, C.lilac, C.lilac],
  stops: [0, .25, .25, .5, .5, .75, .75, 1],
  transform: GradientRotation(-math.pi / 2),
);

/// Renk dairesinin zemini (jokerde dört renkli pasta).
BoxDecoration ccFill(String? color, {BoxBorder? border, BorderRadius? radius, BoxShape shape = BoxShape.rectangle, List<BoxShadow>? shadow}) =>
    BoxDecoration(
      color: color == null ? null : ccColor(color),
      gradient: color == null ? ccWild : null,
      border: border,
      borderRadius: radius,
      shape: shape,
      boxShadow: shadow,
    );

/// Kart üstündeki kısa işaret (tasarım: Atla ⊘, Yön ⇄, Renk ★).
String ccLabel(String value) => switch (value) {
  'skip' => '⊘',
  'reverse' => '⇄',
  'wild' => '★',
  'wild4' => '+4',
  'draw2' => '+2',
  _ => value,
};

enum CcSize { normal, lg, sm }

/// Kart yüzü: düz renk zemin (jokerde dört renkli pasta), ortada eğik beyaz oval içinde sayı ya da işaret.
/// [ring]: `.cc-cardbtn[data-drawn] .cc-card { box-shadow: 0 0 0 3px paper }`.
class CcCardFace extends StatelessWidget {
  const CcCardFace({super.key, required this.color, required this.value, this.size = CcSize.normal, this.ring});
  final String? color;
  final String value;
  final CcSize size;
  final Color? ring;

  @override
  Widget build(BuildContext context) {
    final text = ccLabel(value);
    final long = text.length > 1;
    // Ölçüler (CSS border-radius: a / b oranı kutuya sığmayınca küçültülür).
    final (w, h, border, radius) = switch (size) {
      CcSize.normal => (58.0, 90.0, 3.0, 12.0),
      CcSize.lg => (110.0, 160.0, 3.0, 16.0),
      CcSize.sm => (40.0, 60.0, 2.0, 9.0),
    };
    final (ow, oh, rx, ry, font, rot) = switch (size) {
      // 20px/26px → ×0.95
      CcSize.normal => (38.0, 52.0, 19.0, 24.7, long ? 18.0 : 24.0, -18.0),
      // 40px/50px → ×0.875
      CcSize.lg => (70.0, 92.0, 35.0, 43.75, long ? 36.0 : 46.0, -20.0),
      CcSize.sm => (26.0, 36.0, 13.0, 18.0, long ? 12.0 : 16.0, -18.0),
    };
    Widget card = Container(
      width: w,
      height: h,
      alignment: Alignment.center,
      decoration: ccFill(
        color,
        border: Border.all(color: C.ink, width: border),
        radius: BorderRadius.circular(radius),
        shadow: ring == null ? null : [BoxShadow(color: ring!, spreadRadius: 3)],
      ),
      child: Transform.rotate(
        angle: deg(rot),
        child: Container(
          width: ow,
          height: oh,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.all(Radius.elliptical(rx, ry))),
          child: Text(text, style: T.d(font, color: C.ink2), textScaler: TextScaler.noScaling, maxLines: 1, softWrap: false),
        ),
      ),
    );
    if (size == CcSize.lg) card = Transform.rotate(angle: deg(5), child: card);
    return Semantics(image: true, label: cardName(color, value), child: ExcludeSemantics(child: card));
  }
}

/// Kart arkası: dört renkli yatay şeritler (`.cc-back`).
class CcCardBack extends StatelessWidget {
  const CcCardBack({super.key});

  @override
  Widget build(BuildContext context) => Container(
    width: 92,
    height: 134,
    decoration: BoxDecoration(
      color: C.ink2,
      border: Border.all(color: C.ink, width: bw),
      borderRadius: BorderRadius.circular(14),
      // CSS'te ilk gölge üstte: 4px mürekkep, altında 8px panel.
      boxShadow: [BoxShadow(color: C.panel, offset: const Offset(8, 8)), BoxShadow(color: C.ink, offset: const Offset(4, 4))],
    ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(14 - bw),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [for (final c in const ['green', 'yellow', 'red', 'purple']) Expanded(child: ColoredBox(color: ccColor(c)))],
      ),
    ),
  );
}

/// Etkin renk noktası (`.cc-swatch`).
class CcSwatch extends StatelessWidget {
  const CcSwatch({super.key, required this.color});
  final String? color;

  @override
  Widget build(BuildContext context) => Container(
    width: 16,
    height: 16,
    decoration: ccFill(color, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
  );
}
