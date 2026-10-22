// Şarkıyı Bil'in birden çok dosyada kullandığı parçalar (game-layout.css + song.css + ui.css değerleriyle).
import 'package:flutter/material.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'strings.dart';

/// SettingsPanel.tsx `DIFFICULTY_COLOR`.
const difficultyColor = <String, Color>{
  'easy': C.accent,
  'medium': C.yellow,
  'hard': C.orange,
  'expert': C.red,
  'impossible': C.purple,
};

/// `.song-sgs .sgs-legend` (14px, 700, büyük harf yok) ve `.song-sgs .sgs-hint` (13px, 600).
final sgsLegend = T.b(14, color: C.text2, weight: FontWeight.w700);
final sgsHint = T.b(13, color: C.text3);

/// `<fieldset class="sgs-group">` + Şarkıyı Bil'in başlık/ipucu stili.
Widget sgGroup(String title, Widget child, {String? hint}) =>
    SettingsGroup(title: title, legendStyle: sgsLegend, legendGap: 8, hint: hint, hintStyle: sgsHint, child: child);

/// `.mono` (Baloo 2 + eşit genişlikte rakamlar).
const tabular = [FontFeature.tabularFigures()];

/// JS'deki kararlı `sort` (eşit puanlılar geldikleri sırada kalır).
List<E> stableSorted<E>(Iterable<E> items, int Function(E a, E b) compare) {
  final indexed = items.indexed.toList()
    ..sort((a, b) {
      final c = compare(a.$2, b.$2);
      return c != 0 ? c : a.$1 - b.$1;
    });
  return [for (final e in indexed) e.$2];
}

/// CSS `ch` birimi: yazı tipindeki "0" genişliği.
double chWidth(BuildContext context, TextStyle style) {
  final painter = TextPainter(text: TextSpan(text: '0', style: style), textDirection: TextDirection.ltr, textScaler: MediaQuery.textScalerOf(context))
    ..layout();
  final w = painter.width;
  painter.dispose();
  return w;
}

/// `.song-sgs .sgs-readonly`: 2px çerçeveli panel notu.
class SgReadOnly extends StatelessWidget {
  const SgReadOnly(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
    child: Text(text, style: T.b(13, color: C.text2, weight: FontWeight.w700)),
  );
}

/// `.chip` (Baloo 15/800, 44 yükseklik; seçiliyken sarı + 0 3 gölge) ve oyundaki çeşitleri.
class SgChip extends StatelessWidget {
  const SgChip({
    super.key,
    required this.label,
    required this.selected,
    this.onTap,
    this.count,
    this.minHeight = 44,
    this.minWidth = 48,
    this.fontSize = 15,
    this.background = C.panel,
    this.foreground = C.text,
    this.selectedBackground = C.yellow,
    this.selectedForeground = C.ink2,
    this.mono = false,
    this.expand = false,
  });
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  /// `.chip-count` (12px, %75).
  final String? count;
  final double minHeight;
  final double minWidth;
  final double fontSize;
  final Color background;
  final Color foreground;
  final Color selectedBackground;
  final Color selectedForeground;

  /// `.chip.mono`
  final bool mono;

  /// `flex: 1` ile genişleyen çip.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? selectedForeground : foreground;
    return Pressable(
      onTap: onTap,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: BoxConstraints(minHeight: minHeight, minWidth: minWidth),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: selected ? selectedBackground : background,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(12),
          boxShadow: selected ? hardShadow(0, 3) : null,
        ),
        child: Row(
          mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: T.d(fontSize, color: fg, height: 1.45).copyWith(fontFeatures: mono ? tabular : null),
              ),
            ),
            if (count != null) ...[
              const SizedBox(width: 6),
              Opacity(opacity: 0.75, child: Text(count!, style: T.d(12, color: fg, height: 1.45))),
            ],
          ],
        ),
      ),
    );
  }
}

/// `.btn.btn-ghost`: 44 yükseklik, 2px mor çerçeve, Nunito 14/800; ikonla yazı arası 8 (`.btn` gap).
class SgGhost extends StatelessWidget {
  const SgGhost({super.key, required this.label, this.onPressed, this.icon});
  final String label;
  final VoidCallback? onPressed;
  final String? icon;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onPressed == null ? 0.5 : 1,
    child: Pressable(
      onTap: onPressed,
      label: label,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(border: Border.all(color: C.line2, width: 2), borderRadius: BorderRadius.circular(14)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[SIcon(icon!, size: 14, color: C.text2), const SizedBox(width: 8)],
            // `.btn { white-space: nowrap }`: sığmazsa kutudan taşar (kırılmaz).
            Flexible(
              child: Text(label, maxLines: 1, softWrap: false, overflow: TextOverflow.visible, style: T.b(14, color: C.text2, weight: FontWeight.w800, height: 1)),
            ),
          ],
        ),
      ),
    ),
  );
}

/// `.sgs-opt-icon`: ikon + yazı, aralık 10 (renk çevredeki yazı renginden).
class SgOptIcon extends StatelessWidget {
  const SgOptIcon({super.key, required this.icon, required this.size, required this.label});
  final String icon;
  final double size;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      SIcon(icon, size: size),
      const SizedBox(width: 10),
      Flexible(child: Text(label)),
    ],
  );
}

/// `.toggle` (içinde ikonlu yazı olabilen) + `.toggle-knob`.
class SgToggle extends StatelessWidget {
  const SgToggle({super.key, required this.label, required this.child, required this.value, this.onChanged});
  final String label;
  final Widget child;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onChanged == null ? null : () => onChanged!(!value),
    label: label,
    selected: value,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.only(left: 14, right: 12),
      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.sm)),
      child: Row(
        children: [
          Expanded(
            child: DefaultTextStyle.merge(style: T.b(15, color: C.text2, weight: FontWeight.w700), child: child),
          ),
          const SizedBox(width: 12),
          ToggleKnob(on: value),
        ],
      ),
    ),
  );
}

/// Controls.tsx `HowToPlay` (`.howto`): kesikli üst çizgi, "01" biçiminde numaralı adımlar.
class SgHowTo extends StatelessWidget {
  const SgHowTo({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: CustomPaint(
      painter: const SgDashedTop(color: C.violet, width: 3),
      child: Padding(
        // 3px kenarlık + 28px iç boşluk
        padding: const EdgeInsets.only(top: 3 + 28),
        child: VStack(
          gap: 16,
          children: [
            Text(SHowTo.title, style: T.d(22, color: C.text, height: 1.05)),
            for (var i = 0; i < SHowTo.steps.length; i++)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '${i + 1}'.padLeft(2, '0'),
                      style: T.d(16, color: C.yellow, height: 1.45).copyWith(fontFeatures: tabular),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(SHowTo.steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                        const SizedBox(height: 2),
                        Text(SHowTo.steps[i].$2, style: T.b(13, color: C.text2)),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    ),
  );
}

/// `border-top: Npx dashed`: Chromium'daki gibi çizgi 2×kalınlık, boşluk 1×kalınlık (3px ve üstü);
/// boşluk, çizgi iki uçta da tam bir parçayla bitecek şekilde ayarlanır.
class SgDashedTop extends CustomPainter {
  const SgDashedTop({required this.color, required this.width});
  final Color color;
  final double width;

  @override
  void paint(Canvas canvas, Size size) {
    final dash = width >= 3 ? width * 2 : width * 3;
    final gap0 = width >= 3 ? width : width * 2;
    final length = size.width;
    final paint = Paint()
      ..color = color
      ..strokeWidth = width;
    final y = width / 2;
    final minN = ((length + gap0) / (dash + gap0)).floor();
    if (minN < 2) {
      canvas.drawLine(Offset(0, y), Offset(length, y), paint);
      return;
    }
    final maxN = minN + 1;
    final minGap = (length - minN * dash) / (minN - 1);
    final maxGap = (length - maxN * dash) / (maxN - 1);
    final useMin = maxGap <= 0 || (minGap - gap0).abs() < (maxGap - gap0).abs();
    final n = useMin ? minN : maxN;
    final gap = useMin ? minGap : maxGap;
    for (var i = 0; i < n; i++) {
      final x = i * (dash + gap);
      canvas.drawLine(Offset(x, y), Offset(x + dash, y), paint);
    }
  }

  @override
  bool shouldRepaint(SgDashedTop old) => old.color != color || old.width != width;
}
