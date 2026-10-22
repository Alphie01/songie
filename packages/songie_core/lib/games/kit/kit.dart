// Oyun ekranlarının ortak parçaları (packages/game-kit/src/ui/game-layout.css ve oyunlarda tekrar eden kalıplar).
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../screens/guide.dart';
import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';

export '../../screens/guide.dart' show DashedRRectPainter, TipBox;

// ---------------------------------------------------------------- Sunucu saati

/// `view.serverNow` + `endsAt` ile kalan süre (ms). Web'deki `useRemaining`:
/// fark görünüm geldiğinde ölçülür, 200 ms'de bir yenilenir.
class Remaining extends StatefulWidget {
  const Remaining({super.key, required this.serverNow, required this.endsAt, required this.builder, this.tick = const Duration(milliseconds: 200)});
  final int serverNow;

  /// 0 = süresiz.
  final int endsAt;
  final Widget Function(BuildContext context, int remainingMs) builder;
  final Duration tick;

  @override
  State<Remaining> createState() => _RemainingState();
}

class _RemainingState extends State<Remaining> {
  late int _offset;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _offset = widget.serverNow - DateTime.now().millisecondsSinceEpoch;
    _start();
  }

  @override
  void didUpdateWidget(Remaining old) {
    super.didUpdateWidget(old);
    if (old.serverNow != widget.serverNow) _offset = widget.serverNow - DateTime.now().millisecondsSinceEpoch;
    if (old.endsAt != widget.endsAt) _start();
  }

  void _start() {
    _timer?.cancel();
    if (widget.endsAt > 0) _timer = Timer.periodic(widget.tick, (_) => mounted ? setState(() {}) : null);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now().millisecondsSinceEpoch + _offset;
    final remaining = widget.endsAt > 0 ? math.max(0, widget.endsAt - now) : 0;
    return widget.builder(context, remaining);
  }
}

/// Sunucu saatine göre "şimdi" (ms). Görünüm geldiğinde ölçülen farkla.
int serverTime(int serverNow, int receivedAt) => DateTime.now().millisecondsSinceEpoch + (serverNow - receivedAt);

// ---------------------------------------------------------------- Yerleşim

/// Oyun ekranı sütunu: üstte 72px (menü/?/sohbet düğmeleri için), yanlarda gutter, en fazla [maxWidth].
class GameColumn extends StatelessWidget {
  const GameColumn({super.key, required this.child, this.maxWidth = 480, this.top = 72, this.bottom = 22, this.minHeight = true});
  final Widget child;
  final double maxWidth;
  final double top;
  final double bottom;

  /// İçerik en az ekran boyu (`min-height: calc(100dvh - …)`); `Spacer` alt düğmeleri dibe iter.
  final bool minHeight;

  @override
  Widget build(BuildContext context) {
    final g = Layout.gutter(context);
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(padding: EdgeInsets.fromLTRB(g, top, g, bottom), child: child),
      ),
    );
  }
}

/// Oyun ekranının kaydırılan alanının yüksekliği (oda ekranı verir). Web'deki `100dvh`.
class GameViewport extends InheritedWidget {
  const GameViewport({super.key, required this.height, required super.child});
  final double height;

  static double? maybeOf(BuildContext context) => context.dependOnInheritedWidgetOfExactType<GameViewport>()?.height;

  @override
  bool updateShouldNotify(GameViewport old) => old.height != height;
}

/// Ekranın görünen yüksekliği; oyunların `100dvh` hesapları için. Oda ekranında güvenli alan
/// (durum çubuğu) zaten düşülmüş kaydırma alanının yüksekliğidir.
double viewportHeight(BuildContext context) =>
    GameViewport.maybeOf(context) ?? MediaQuery.sizeOf(context).height - MediaQuery.paddingOf(context).top;

/// Kesikli çerçeveli kutu.
class DashedBox extends StatelessWidget {
  const DashedBox({super.key, required this.child, this.color = C.violet, this.radius = 14, this.width = 2, this.padding = const EdgeInsets.all(10), this.background});
  final Widget child;
  final Color color;
  final double radius;
  final double width;
  final EdgeInsets padding;
  final Color? background;

  @override
  Widget build(BuildContext context) => CustomPaint(
    foregroundPainter: DashedRRectPainter(color: color, radius: radius, strokeWidth: width),
    child: Container(
      padding: padding + EdgeInsets.all(width),
      decoration: background == null ? null : BoxDecoration(color: background, borderRadius: BorderRadius.circular(radius)),
      child: child,
    ),
  );
}

// ---------------------------------------------------------------- Ayarlar

/// `.sgs-group`: başlık (legend), içerik, ipucu. Başlık stili oyuna göre değişir.
class SettingsGroup extends StatelessWidget {
  const SettingsGroup({super.key, required this.title, required this.child, this.hint, this.legendStyle, this.legendGap = 8, this.hintStyle, this.trailing});
  final String title;
  final Widget child;
  final String? hint;
  final TextStyle? legendStyle;
  final double legendGap;
  final TextStyle? hintStyle;
  final Widget? trailing;

  /// Varsayılan `.eyebrow.sgs-legend`.
  static TextStyle defaultLegend() => T.eyebrow();

  /// Oyunların çoğunda kullanılan sade başlık (Nunito 14, 700, text-2).
  static TextStyle plainLegend() => T.b(14, color: C.text2, weight: FontWeight.w700);

  /// `.sgs-hint` (11.5px).
  static TextStyle defaultHint() => T.b(11.5, color: C.text3);

  @override
  Widget build(BuildContext context) {
    final style = legendStyle ?? defaultLegend();
    final upper = legendStyle == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(upper ? trUpper(title) : title, style: style),
        SizedBox(height: legendGap),
        child,
        if (trailing != null) ...[const SizedBox(height: 8), trailing!],
        if (hint != null) ...[const SizedBox(height: 8), Text(hint!, style: hintStyle ?? defaultHint())],
      ],
    );
  }
}

/// `.sgs-readonly`: "Ayarları oda sahibi seçer."
class ReadOnlyNote extends StatelessWidget {
  const ReadOnlyNote(this.text, {super.key, this.dashed = false});
  final String text;

  /// Yeni tasarımdaki kesikli mor çerçeveli biçim.
  final bool dashed;

  @override
  Widget build(BuildContext context) {
    if (dashed) {
      return DashedBox(
        radius: 14,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Text(text, style: T.b(14, color: C.text3, weight: FontWeight.w700)),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: C.panel, borderRadius: BorderRadius.circular(R.md)),
      child: Text(text, style: T.b(12, color: C.text2)),
    );
  }
}

/// Ayar çipi: seçiliyse sarı; +18 seçiliyse kırmızı (`.chip[data-bold][aria-pressed='true']`).
class SettingChip extends StatelessWidget {
  const SettingChip({super.key, required this.label, required this.selected, this.onTap, this.count, this.adult = false, this.minHeight = 44, this.fontSize = 15});
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final String? count;
  final bool adult;
  final double minHeight;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final red = adult && selected;
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onTap,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: BoxConstraints(minHeight: minHeight, minWidth: 48),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: red ? C.red : (selected ? C.yellow : C.panel),
          border: Border.all(color: red ? C.red : C.ink, width: 2),
          borderRadius: BorderRadius.circular(12),
          boxShadow: selected ? hardShadow(0, 3) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(child: Text(label, style: T.d(fontSize, color: fg), maxLines: 2)),
            if (count != null) ...[const SizedBox(width: 6), Opacity(opacity: 0.75, child: Text(count!, style: T.d(12, color: fg)))],
          ],
        ),
      ),
    );
  }
}

/// "Kendi cümleni yaz" gibi açılır bölüm düğmesi (`.btn-ghost.sgs-browse` + chevron).
class BrowseToggle extends StatelessWidget {
  const BrowseToggle({super.key, required this.label, required this.open, required this.onTap});
  final String label;
  final bool open;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Pressable(
      onTap: onTap,
      label: label,
      selected: open,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(border: Border.all(color: C.line2, width: 2), borderRadius: BorderRadius.circular(14)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Transform.rotate(angle: open ? math.pi : 0, child: const SIcon('chevron', size: 14, color: C.text2)),
            const SizedBox(width: 8),
            Text(label, style: T.b(14, color: C.text2, weight: FontWeight.w800, height: 1)),
          ],
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- Oyun sonu

/// `results-confetti` / `*-confetti`: beş sabit parça. [top] ilk parçanın üst boşluğu (oyunlar 72px kaydırır).
class Confetti extends StatelessWidget {
  const Confetti({super.key, this.top = 50});
  final double top;

  @override
  Widget build(BuildContext context) {
    Widget piece(double w, double h, Color c, double rot, {bool round = false}) => Transform.rotate(
      angle: deg(rot),
      child: Container(width: w, height: h, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(round ? 99 : 2))),
    );
    final d = top - 50;
    return IgnorePointer(
      child: Stack(
        children: [
          Positioned(top: 50 + d, left: 30, child: piece(16, 7, C.yellow, 30)),
          Positioned(top: 90 + d, right: 40, child: piece(16, 7, C.pink, -40)),
          Positioned(top: 150 + d, left: 64, child: piece(11, 11, C.mint, 20)),
          Positioned(top: 40 + d, right: 120, child: piece(11, 11, C.sky, 0, round: true)),
          Positioned(top: 190 + d, right: 60, child: piece(16, 7, C.coral, 70)),
        ],
      ),
    );
  }
}

/// Lobiye dönüş çubuğu: [durationMs] boyunca soldan dolar.
class EndBar extends StatefulWidget {
  const EndBar({super.key, required this.durationMs});
  final int durationMs;

  @override
  State<EndBar> createState() => _EndBarState();
}

class _EndBarState extends State<EndBar> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: Duration(milliseconds: widget.durationMs));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else if (!_c.isAnimating && _c.value == 0) {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (context, _) => PillBar(value: _c.value),
  );
}

/// İnce hap çubuk: 12px, 2px çerçeve, dolgu iç köşeye göre kırpılır.
class PillBar extends StatelessWidget {
  const PillBar({super.key, required this.value, this.height = 12, this.fill = C.yellow, this.track = C.panel2, this.border = 2});
  final double value;
  final double height;
  final Color fill;
  final Color track;
  final double border;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    height: height,
    decoration: BoxDecoration(color: track, border: Border.all(color: C.ink, width: border), borderRadius: BorderRadius.circular(R.pill)),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(R.pill),
      child: FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: value.clamp(0, 1), child: ColoredBox(color: fill)),
    ),
  );
}

/// "OYUN BİTTİ" etiketi (−3°).
class EndSticker extends StatelessWidget {
  const EndSticker(this.text, {super.key, this.color = C.yellow});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Sticker(
    trUpper(text),
    color: color,
    rotate: -3,
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
    style: T.b(13, color: C.ink2, weight: FontWeight.w800, letterSpacing: 2),
  );
}

/// Taç (kazanan kartı).
const crownSvg =
    '<svg width="40" height="28" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">'
    '<path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="#FFD23F" stroke="#0D0828" stroke-width="3" stroke-linejoin="round" /></svg>';

/// Oyun sonu kartı (birinci: nane, −3°, gölgeli; ikinci: lila, +2°, altta).
class EndCard extends StatelessWidget {
  const EndCard({super.key, required this.number, required this.name, this.caption, this.first = true, this.color, this.maxWidth = double.infinity});
  final String number;
  final String name;
  final String? caption;
  final bool first;
  final Color? color;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: Transform.rotate(
        angle: deg(first ? -3 : 2),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: color ?? (first ? C.mint : C.lilac),
            border: Border.all(color: C.ink, width: 4),
            borderRadius: BorderRadius.circular(26),
            boxShadow: first ? Shadows.lg : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (first) SSvg(crownSvg, width: 40, height: 28),
              if (!first) const SizedBox(height: 10),
              NoWrapText(number, style: T.d(first ? 64 : 52, color: C.ink2)),
              if (caption != null) Opacity(opacity: 0.75, child: Text(caption!, style: T.b(12, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center)),
              Text(name, style: T.b(14, color: C.ink2, weight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}

/// Birinci + "–" + ikinci kart dizilimi (`*-end-cards`).
class EndCards extends StatelessWidget {
  const EndCards({super.key, required this.first, this.second});
  final Widget first;
  final Widget? second;

  @override
  Widget build(BuildContext context) {
    if (second == null) return Center(child: first);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Flexible(child: first),
          const SizedBox(width: 12),
          Center(child: Text('–', style: T.d(30, color: C.text3))),
          const SizedBox(width: 12),
          Flexible(child: Align(alignment: Alignment.bottomCenter, child: second)),
        ],
      ),
    );
  }
}

/// İki sütunlu sıralama listesi (`*-rosters`).
class Rosters<E> extends StatelessWidget {
  const Rosters({super.key, required this.items, required this.row});
  final List<E> items;
  final Widget Function(E item) row;

  @override
  Widget build(BuildContext context) {
    final half = (items.length / 2).ceil();
    final cols = [items.sublist(0, half), items.sublist(half)];
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var c = 0; c < 2; c++) ...[
          if (c > 0) const SizedBox(width: 10),
          Expanded(
            child: cols[c].isEmpty
                ? const SizedBox()
                : Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
                    child: VStack(gap: 8, children: [for (final e in cols[c]) row(e)]),
                  ),
          ),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------- Hareket

/// CSS `animation: x 280ms cubic-bezier(.2,.8,.2,1) both` gibi giriş animasyonu:
/// [from] durumundan normale geçer. [animKey] değişince yeniden oynar.
class EnterAnim extends StatefulWidget {
  const EnterAnim({
    super.key,
    required this.child,
    this.animKey,
    this.duration = const Duration(milliseconds: 280),
    this.curve = const Cubic(0.2, 0.8, 0.2, 1),
    this.dy = 0,
    this.scale = 1,
    this.opacity = 0,
    this.rotate = 0,
    this.delay = Duration.zero,
  });
  final Widget child;
  final Object? animKey;
  final Duration duration;
  final Curve curve;

  /// Başlangıç kayması (px), ölçeği, saydamlığı ve ek dönüşü (derece).
  final double dy;
  final double scale;
  final double opacity;
  final double rotate;
  final Duration delay;

  @override
  State<EnterAnim> createState() => _EnterAnimState();
}

class _EnterAnimState extends State<EnterAnim> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: widget.duration);
  Timer? _delay;
  bool _reduced = false;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduced = MediaQuery.disableAnimationsOf(context);
    if (!_started) {
      _started = true;
      _play();
    }
  }

  void _play() {
    _delay?.cancel();
    if (_reduced) {
      _c.value = 1;
      return;
    }
    _c.value = 0;
    if (widget.delay == Duration.zero) {
      _c.forward();
    } else {
      _delay = Timer(widget.delay, () => mounted ? _c.forward() : null);
    }
  }

  @override
  void didUpdateWidget(EnterAnim old) {
    super.didUpdateWidget(old);
    if (old.animKey != widget.animKey) _play();
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
    builder: (context, child) {
      final t = widget.curve.transform(_c.value);
      final inv = 1 - t;
      return Opacity(
        opacity: (widget.opacity + (1 - widget.opacity) * t).clamp(0, 1),
        child: Transform.translate(
          offset: Offset(0, widget.dy * inv),
          child: Transform.rotate(
            angle: deg(widget.rotate * inv),
            child: Transform.scale(scale: widget.scale + (1 - widget.scale) * t, child: child),
          ),
        ),
      );
    },
  );
}

/// Soldan büyüyen çubuk (CSS `transform-origin: left; animation: grow … from scaleX(0)`).
class GrowBar extends StatefulWidget {
  const GrowBar({super.key, required this.fraction, required this.color, this.duration = const Duration(milliseconds: 600), this.curve = const Cubic(0.2, 0.8, 0.2, 1)});
  final double fraction;
  final Color color;
  final Duration duration;
  final Curve curve;

  @override
  State<GrowBar> createState() => _GrowBarState();
}

class _GrowBarState extends State<GrowBar> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: widget.duration);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else if (!_c.isAnimating && _c.value == 0) {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (context, _) => FractionallySizedBox(
      alignment: Alignment.centerLeft,
      widthFactor: widget.fraction.clamp(0, 1) * widget.curve.transform(_c.value),
      heightFactor: 1,
      child: ColoredBox(color: widget.color),
    ),
  );
}

// ---------------------------------------------------------------- Yardımcılar

/// Oda üyeleri: id → oyuncu.
Map<String, RoomPlayer> membersOf(RoomState room) => {for (final p in room.players) p.id: p};

/// "Ali, Veli ve Ayşe"
String joinNames(List<String> names) {
  if (names.length <= 1) return names.isEmpty ? '' : names[0];
  return '${names.sublist(0, names.length - 1).join(', ')} ve ${names.last}';
}

/// Hata metni (`.error-text`).
class ErrorText extends StatelessWidget {
  const ErrorText(this.text, {super.key, this.center = false});
  final String text;
  final bool center;
  @override
  Widget build(BuildContext context) =>
      Text(text, style: T.b(14, color: C.errorOnDark, weight: FontWeight.w800), textAlign: center ? TextAlign.center : TextAlign.start);
}

/// "Nasıl oynanır" bölümü (`.howto`): kesikli üst çizgi, numaralı adımlar.
class HowTo extends StatelessWidget {
  const HowTo({super.key, required this.title, required this.steps, this.children = const []});
  final String title;
  final List<(String, String)> steps;

  /// Adımlardan sonra gelen ek içerik (ör. rol tablosu).
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: CustomPaint(
      painter: _DashedTop(),
      child: Padding(
        padding: const EdgeInsets.only(top: 3 + 28),
        child: VStack(
          gap: 16,
          children: [
            Text(title, style: T.d(22, color: C.text, height: 1.05)),
            for (var i = 0; i < steps.length; i++)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(padding: const EdgeInsets.only(top: 2), child: Text('${i + 1}', style: T.d(16, color: C.yellow, height: 1.45))),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                        const SizedBox(height: 2),
                        Text(steps[i].$2, style: T.b(13, color: C.text2)),
                      ],
                    ),
                  ),
                ],
              ),
            ...children,
          ],
        ),
      ),
    ),
  );
}

class _DashedTop extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = C.violet
      ..strokeWidth = 3;
    for (double x = 0; x < size.width; x += 12) {
      canvas.drawLine(Offset(x, 1.5), Offset(math.min(x + 8, size.width), 1.5), p);
    }
  }

  @override
  bool shouldRepaint(_DashedTop old) => false;
}
