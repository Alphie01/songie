part of 'play_view.dart';

/// Flex `gap`: her öğenin arasına boşluk (CSS'teki gibi `Spacer`'ın iki yanında da).
List<Widget> _gapCol(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// CSS `max-width`: `ConstrainedBox(maxWidth)` gibi, ama içerik yüksekliğini de bu genişlikte ölçer
/// (tam boy ekran `IntrinsicHeight` ile ölçülür; `ConstrainedBox` ölçümde genişliği daraltmaz).
class _MaxWidth extends SingleChildRenderObjectWidget {
  const _MaxWidth({required this.maxWidth, super.child});
  final double maxWidth;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderMaxWidth(maxWidth);

  @override
  void updateRenderObject(BuildContext context, _RenderMaxWidth renderObject) => renderObject.maxWidth = maxWidth;
}

class _RenderMaxWidth extends RenderConstrainedBox {
  _RenderMaxWidth(double maxWidth) : super(additionalConstraints: BoxConstraints(maxWidth: maxWidth));

  double get maxWidth => additionalConstraints.maxWidth;
  set maxWidth(double v) => additionalConstraints = BoxConstraints(maxWidth: v);

  @override
  double computeMinIntrinsicHeight(double width) => super.computeMinIntrinsicHeight(math.min(width, maxWidth));

  @override
  double computeMaxIntrinsicHeight(double width) => super.computeMaxIntrinsicHeight(math.min(width, maxWidth));
}

// ---------------------------------------------------------------- Yazı

/// `.ww-label` (h2/h3, Baloo 2): 11px, 1.5px aralık, büyük harf.
TextStyle _labelStyle(_Pal pal, {double size = 11, Color? color}) => T.d(size, color: color ?? pal.dim, letterSpacing: 1.5, height: 1.05);

/// `.ww-h`: 12px etiket başlığı.
Widget _h(String text, _Pal pal) => Text(trUpper(text), style: _labelStyle(pal, size: 12));

/// `.ww-hint`: 13px, 700, satır 1.4.
TextStyle _hintStyle(_Pal pal) => T.b(13, color: pal.dim, weight: FontWeight.w700, height: 1.4);

Widget _hint(String text, _Pal pal, {bool center = false}) => Text(text, style: _hintStyle(pal), textAlign: center ? TextAlign.center : TextAlign.start);

/// `.ww-title`: 26px başlık.
Widget _title(String text) => Text(text, style: T.d(26, color: C.text, height: 1.05));

/// `.ww-sub` (h3): 14px, text-2.
Widget _sub(String text) => Text(text, style: T.d(14, color: C.text2, height: 1.05));

/// `.ww-panel`: aralığı 10 olan sütun.
class _Panel extends StatelessWidget {
  const _Panel({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: _gapCol(10, children));
}

/// `.ww-wait` / `.ww-done`: çerçeveli bilgi kutusu (done: halka renginde yazı).
class _Note extends StatelessWidget {
  const _Note(this.text, {required this.pal, this.done = false});
  final String text;
  final _Pal pal;
  final bool done;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: pal.card, border: Border.all(color: pal.edge, width: 3), borderRadius: BorderRadius.circular(18)),
    child: Text(text, style: T.b(15, color: done ? pal.ring : C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
  );
}

// ---------------------------------------------------------------- Avatar ve rozetler

/// game-kit `Avatar` (`.gk-avatar`); oyunun CSS'i çerçeve rengini ve harf boyunu ezer.
class _Face extends StatelessWidget {
  const _Face({required this.member, required this.size, this.borderWidth, this.borderColor = C.ink, this.fontSize, this.dim = false});
  final RoomPlayer? member;
  final double size;
  final double? borderWidth;
  final Color borderColor;
  final double? fontSize;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    final color = avatarColors[member?.avatar.color ?? 'mint'] ?? avatarColors['mint']!;
    final nick = (member?.nick ?? '?').trim();
    final letter = nick.isEmpty ? '?' : trUpper(String.fromCharCode(nick.runes.first));
    return Opacity(
      opacity: dim ? 0.45 : 1,
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: borderColor, width: borderWidth ?? (size >= 40 ? 3 : 2)),
        ),
        child: Text(letter, style: T.d(fontSize ?? size * 0.46, color: C.ink2), textScaler: TextScaler.noScaling),
      ),
    );
  }
}

/// `.ww-rolechip`: rol renginde hap (simge + ad).
class _RoleChip extends StatelessWidget {
  const _RoleChip({required this.role, required this.label, required this.glyph, required this.pal});
  final Role role;
  final String label;
  final double glyph;
  final _Pal pal;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(color: roleColor(role), border: Border.all(color: pal.edge, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        RoleGlyph(role, size: glyph, color: C.ink2),
        const SizedBox(width: 4),
        Flexible(child: Text(label, style: T.b(12, color: C.ink2, weight: FontWeight.w800))),
      ],
    ),
  );
}

/// `.ww-claw`: kurt oyu rozeti.
class _Claw extends StatelessWidget {
  const _Claw(this.text, {required this.pal});
  final String text;
  final _Pal pal;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(color: C.red, border: Border.all(color: pal.edge, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: Text(text, style: T.b(11, color: C.ink2, weight: FontWeight.w800), maxLines: 1, softWrap: false),
  );
}

/// `.ww-count.mono`: sarı sayı hapı.
class _Count extends StatelessWidget {
  const _Count(this.n, {required this.pal});
  final int n;
  final _Pal pal;

  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minWidth: 26),
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(color: C.yellow, border: Border.all(color: pal.edge, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: Text('$n', style: _mono(12, C.ink2), textAlign: TextAlign.center),
  );
}

/// `.mono`: Baloo 2, eşit genişlikte rakamlar (satır 1.45).
TextStyle _mono(double size, Color color) =>
    T.d(size, color: color, height: 1.45).copyWith(fontFeatures: const [FontFeature.tabularFigures()]);

// ---------------------------------------------------------------- Oyuncu ızgarası

/// `.ww-grid[data-tone]`: seçili kutunun çerçevesi ve zemini.
(Color, Color) _pickColors(String? tone, _Pal pal) => switch (tone) {
  'wolf' || 'poison' => (C.red, _wolfPick),
  'love' => (C.pink, Color.lerp(pal.card, C.pink, 0.20)!),
  'seer' => (C.lilac, Color.lerp(pal.card, C.lilac, 0.22)!),
  'heal' => (C.mint, Color.lerp(pal.card, C.mint, 0.18)!),
  _ => (C.yellow, Color.lerp(pal.card, C.yellow, 0.22)!),
};

/// `PlayerGrid`: üç sütunlu hedef seçimi.
class _PlayerGrid extends StatelessWidget {
  const _PlayerGrid({
    required this.g,
    required this.ids,
    required this.label,
    this.picked,
    this.disabled,
    this.badge,
    this.onPick,
    this.tone,
  });
  final _G g;
  final List<String> ids;
  final String Function(String nick) label;
  final bool Function(String id)? picked;
  final String? Function(String id)? disabled;
  final Widget? Function(String id)? badge;
  final void Function(String id)? onPick;

  /// wolf | day | love | seer | heal | poison
  final String? tone;

  @override
  Widget build(BuildContext context) {
    final (pick, pickBg) = _pickColors(tone, g.pal);
    return Grid2(
      columns: 3,
      rowGap: 10,
      columnGap: 10,
      children: [
        for (final id in ids)
          _Tile(
            g: g,
            id: id,
            label: label(g.plainNick(id)),
            picked: picked?.call(id) ?? false,
            off: disabled?.call(id),
            badge: badge?.call(id),
            onTap: onPick == null ? null : () => onPick!(id),
            pick: pick,
            pickBg: pickBg,
          ),
      ],
    );
  }
}

/// `.ww-tile`: avatar + ad; seçilince renkli çerçeve ve −2° eğim.
class _Tile extends StatelessWidget {
  const _Tile({
    required this.g,
    required this.id,
    required this.label,
    required this.picked,
    required this.off,
    required this.badge,
    required this.onTap,
    required this.pick,
    required this.pickBg,
  });
  final _G g;
  final String id;
  final String label;
  final bool picked;
  final String? off;
  final Widget? badge;
  final VoidCallback? onTap;
  final Color pick;
  final Color pickBg;

  @override
  Widget build(BuildContext context) {
    final pal = g.pal;
    final m = g.members[id];
    final name = m?.nick ?? '?';
    final enabled = onTap != null && off == null;
    return Pressable(
      onTap: enabled ? onTap : null,
      label: label,
      selected: picked,
      builder: (context, _) => Opacity(
        opacity: !enabled && !picked ? 0.5 : 1,
        child: AnimatedRotation(
          turns: picked ? -2 / 360 : 0,
          duration: const Duration(milliseconds: 100),
          curve: Curves.ease,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: double.infinity,
                constraints: const BoxConstraints(minHeight: 96),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                decoration: BoxDecoration(
                  color: picked ? pickBg : pal.card,
                  border: Border.all(color: picked ? pick : pal.edge, width: 3),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _Face(member: m, size: 46, borderWidth: 3, borderColor: pal.edge, fontSize: 20, dim: m == null || !m.connected),
                    const SizedBox(height: 6),
                    Text.rich(
                      TextSpan(
                        text: name,
                        children: [if (id == g.meId) TextSpan(text: ' (${SPlay.you})', style: T.b(12, color: C.text3, weight: FontWeight.w800, height: 1.15))],
                      ),
                      style: T.b(14, color: C.text, weight: FontWeight.w800, height: 1.15),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (off != null) ...[
                      const SizedBox(height: 6),
                      Text(off!, style: T.b(11, color: pal.dim, weight: FontWeight.w700), textAlign: TextAlign.center),
                    ],
                  ],
                ),
              ),
              if (badge != null) Positioned(top: -8, right: -6, child: badge!),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Kutular

/// Kesikli çerçeve (CSS `border: Npx dashed`), zeminin üstüne çizilir.
class _Dashed extends StatelessWidget {
  const _Dashed({required this.child, required this.color, required this.radius, required this.width, required this.padding, this.background});
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

/// Çerçeveli ilerleme çubuğu (`overflow: hidden` + hap köşe); dolgu iç kenara göre yuvarlanır.
class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, required this.color, this.duration});
  final double fraction;
  final Color color;

  /// CSS `transition: width …` (yoksa anında).
  final Duration? duration;

  @override
  Widget build(BuildContext context) {
    final f = fraction.clamp(0.0, 1.0);
    const fill = SizedBox.expand();
    return Container(
      height: 12,
      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(R.pill),
        child: Align(
          alignment: Alignment.centerLeft,
          child: duration == null
              ? FractionallySizedBox(widthFactor: f, heightFactor: 1, child: ColoredBox(color: color, child: fill))
              : AnimatedFractionallySizedBox(duration: duration!, widthFactor: f, heightFactor: 1, child: ColoredBox(color: color, child: fill)),
        ),
      ),
    );
  }
}

/// `<details class="ww-secret">`: başlığa dokununca açılan numaralı liste.
class _Details extends StatefulWidget {
  const _Details({required this.summary, required this.items});
  final String summary;
  final List<String> items;

  @override
  State<_Details> createState() => _DetailsState();
}

class _DetailsState extends State<_Details> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final item = T.b(13, color: C.text2, weight: FontWeight.w700);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Pressable(
            onTap: () => setState(() => _open = !_open),
            label: widget.summary,
            selected: _open,
            builder: (context, _) => ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 28),
              child: Align(
                alignment: Alignment.topLeft,
                child: Text('${_open ? '▾' : '▸'} ${widget.summary}', style: T.b(14, color: C.text2, weight: FontWeight.w800)),
              ),
            ),
          ),
          if (_open) ...[
            const SizedBox(height: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: _gapCol(6, [
                for (var i = 0; i < widget.items.length; i++)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // `ol` dış işaretleri: 18px'lik sol boşlukta sağa yaslı "1."
                      SizedBox(
                        width: 18,
                        height: 13 * 1.45,
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [Positioned(top: 0, right: 4, child: Text('${i + 1}.', style: item, softWrap: false))],
                        ),
                      ),
                      Expanded(child: Text(widget.items[i], style: item)),
                    ],
                  ),
              ]),
            ),
          ],
        ],
      ),
    );
  }
}
