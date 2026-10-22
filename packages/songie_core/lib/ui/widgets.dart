import '../flavor.dart';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../shared/models.dart';
import '../shared/text.dart';
import 'icons.dart';
import 'tokens.dart';

/// Derece → radyan (CSS `rotate(-6deg)`).
double deg(double d) => d * math.pi / 180;

/// Dokunulunca "basılı" durumunu bildiren sarmalayıcı (CSS `:active`).
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.builder, this.onTap, this.enabled = true, this.label, this.selected});
  final Widget Function(BuildContext context, bool pressed) builder;
  final VoidCallback? onTap;
  final bool enabled;
  final String? label;
  final bool? selected;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _pressed = false;

  void _set(bool v) {
    if (_pressed != v && mounted) setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.enabled && widget.onTap != null;
    return Semantics(
      button: true,
      enabled: active,
      selected: widget.selected,
      label: widget.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: active ? (_) => _set(true) : null,
        onTapUp: active ? (_) => _set(false) : null,
        onTapCancel: active ? () => _set(false) : null,
        onTap: active ? widget.onTap : null,
        child: widget.builder(context, active && _pressed),
      ),
    );
  }
}

enum BtnTone { panel, primary, yellow, pink, dark, light, outline }

Color _btnBg(BtnTone t) => switch (t) {
  BtnTone.panel || BtnTone.outline => C.panel,
  BtnTone.primary => C.mint,
  BtnTone.yellow => C.yellow,
  BtnTone.pink => C.pink,
  BtnTone.dark => C.ink2,
  BtnTone.light => C.paper2,
};

Color _btnFg(BtnTone t) => switch (t) {
  BtnTone.primary || BtnTone.yellow || BtnTone.pink || BtnTone.light => C.ink2,
  _ => C.text,
};

/// `.btn` (ve `.btn-lg`): 3px çerçeve, alttan sert gölge; basınca aşağı iner.
class SButton extends StatelessWidget {
  const SButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.iconSize,
    this.tone = BtnTone.panel,
    this.large = false,
    this.block = false,
    this.minHeight,
    this.radius,
    this.shadowY,
    this.pressY,
    this.fontSize,
    this.fontFamily,
    this.padding,
    this.gap,
    this.background,
    this.foreground,
    this.trailingIcon = false,
    this.spaceBetween = false,
    this.borderWidth = bw,
    this.disabledOpacity = 0.5,
  });

  final String label;
  final VoidCallback? onPressed;
  final String? icon;
  final double? iconSize;
  final BtnTone tone;

  /// `.btn-lg`: 64 yükseklik, r20, 0 6 gölge, 24px yazı, basınca 5px.
  final bool large;

  /// `.btn-block`: tam genişlik.
  final bool block;
  final double? minHeight;
  final double? radius;

  /// Gölgenin dikey kayması (0 = gölgesiz).
  final double? shadowY;
  final double? pressY;
  final double? fontSize;
  final String? fontFamily;
  final EdgeInsetsGeometry? padding;
  final double? gap;
  final Color? background;
  final Color? foreground;
  final bool trailingIcon;
  final bool spaceBetween;
  final double borderWidth;
  final double disabledOpacity;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    final shadow = shadowY ?? (large ? 6 : 4);
    final press = pressY ?? (shadow == 0 ? 0 : (large ? 5 : 3));
    final fg = foreground ?? _btnFg(tone);
    final bg = background ?? _btnBg(tone);
    final size = fontSize ?? (large ? 24 : 17);
    final textStyle = fontFamily == T.font ? T.b(size, color: fg, weight: FontWeight.w800, height: 1) : T.d(size, color: fg);
    final iconW = icon == null ? null : SIcon(icon!, size: iconSize ?? (large ? 22 : 18), color: fg);
    final children = <Widget>[
      if (iconW != null && !trailingIcon) iconW,
      Flexible(
        child: Text(label, style: textStyle, maxLines: 1, overflow: TextOverflow.visible, softWrap: false),
      ),
      if (iconW != null && trailingIcon) iconW,
    ];
    return Opacity(
      opacity: enabled ? 1 : disabledOpacity,
      child: Pressable(
        onTap: onPressed,
        label: label,
        builder: (context, pressed) => AnimatedContainer(
          duration: const Duration(milliseconds: 80),
          transform: Matrix4.translationValues(0, pressed ? press : 0, 0),
          constraints: BoxConstraints(minHeight: minHeight ?? (large ? 64 : 48), minWidth: block ? double.infinity : 0),
          padding: padding ?? const EdgeInsets.symmetric(horizontal: 18),
          decoration: BoxDecoration(
            color: bg,
            border: borderWidth > 0 ? Border.all(color: C.ink, width: borderWidth) : null,
            borderRadius: BorderRadius.circular(radius ?? (large ? 20 : R.md)),
            boxShadow: shadow == 0 ? null : hardShadow(0, pressed ? 1 : shadow),
          ),
          child: Row(
            mainAxisSize: block ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: spaceBetween ? MainAxisAlignment.spaceBetween : MainAxisAlignment.center,
            children: _gapped(children, gap ?? 8),
          ),
        ),
      ),
    );
  }
}

List<Widget> _gapped(List<Widget> items, double gap) {
  final out = <Widget>[];
  for (var i = 0; i < items.length; i++) {
    if (i > 0) out.add(SizedBox(width: gap));
    out.add(items[i]);
  }
  return out;
}

/// `.btn-ghost`: 2px mor çerçeve, şeffaf, gölgesiz, Nunito 14.
class SGhostButton extends StatelessWidget {
  const SGhostButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.iconSize = 16,
    this.trailing,
    this.color = C.text2,
    this.block = false,
    this.gap,
  });
  final bool block;

  /// İkon ile yazı arası (varsayılan: ikon varsa 6, yoksa 8).
  final double? gap;
  final String label;
  final VoidCallback? onPressed;
  final String? icon;
  final double iconSize;
  final Widget? trailing;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: onPressed == null ? 0.5 : 1,
      child: Pressable(
        onTap: onPressed,
        label: label,
        builder: (context, _) => Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            border: Border.all(color: C.line2, width: 2),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            mainAxisSize: block ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: _gapped([
              if (icon != null) SIcon(icon!, size: iconSize, color: color),
              // `.btn` white-space: nowrap — sığmazsa kırılmadan taşar.
              Flexible(
                child: Text(
                  label,
                  style: T.b(14, color: color, weight: FontWeight.w800, height: 1),
                  softWrap: false,
                  overflow: TextOverflow.visible,
                ),
              ),
              ?trailing,
            ], gap ?? (icon != null ? 6 : 8)),
          ),
        ),
      ),
    );
  }
}

/// `.icon-btn`: 44×44 kare, 3px çerçeve, r14.
class SIconButton extends StatelessWidget {
  const SIconButton({
    super.key,
    this.icon,
    this.text,
    required this.onPressed,
    this.label,
    this.iconSize = 22,
    this.shadow = false,
    this.background = C.panel,
    this.color = C.text,
  });
  final String? icon;

  /// İkon yerine yazı ("?").
  final String? text;
  final VoidCallback? onPressed;
  final String? label;
  final double iconSize;
  final bool shadow;
  final Color background;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onPressed,
      label: label,
      builder: (context, _) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: background,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(14),
          boxShadow: shadow ? Shadows.sm : null,
        ),
        child: text != null ? Text(text!, style: T.d(22, color: color)) : SIcon(icon!, size: iconSize, color: color),
      ),
    );
  }
}

/// `.card` (+ `.card-pop`).
class SCard extends StatelessWidget {
  const SCard({super.key, required this.child, this.padding, this.color = C.panel2, this.radius = R.lg, this.shadow, this.borderWidth = bw});
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color color;
  final double radius;
  final List<BoxShadow>? shadow;
  final double borderWidth;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: color,
      border: Border.all(color: C.ink, width: borderWidth),
      borderRadius: BorderRadius.circular(radius),
      boxShadow: shadow,
    ),
    child: child,
  );
}

/// `.sticker`: eğik hap etiket.
class Sticker extends StatelessWidget {
  const Sticker(
    this.text, {
    super.key,
    this.color = C.yellow,
    this.rotate = 0,
    this.padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
    this.style,
  });
  final String text;
  final Color color;
  final double rotate;
  final EdgeInsetsGeometry padding;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(rotate),
    child: Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(R.pill),
      ),
      child: Text(
        text,
        maxLines: 1,
        softWrap: false,
        style: style ?? T.b(13, color: C.ink2, weight: FontWeight.w800),
      ),
    ),
  );
}

/// `.chip`: seçim çipi (seçiliyken sarı + gölge).
class SChip extends StatelessWidget {
  const SChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onPressed,
    this.count,
    this.minHeight = 44,
    this.fontSize = 15,
    this.minWidth = 48,
    this.expand = false,
  });
  final String label;
  final bool selected;
  final VoidCallback? onPressed;
  final String? count;
  final double minHeight;
  final double fontSize;
  final double minWidth;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onPressed,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: BoxConstraints(minHeight: minHeight, minWidth: minWidth),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: selected ? C.yellow : C.panel,
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
                style: T.d(fontSize, color: fg),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (count != null) ...[
              const SizedBox(width: 6),
              Opacity(
                opacity: 0.75,
                child: Text(count!, style: T.d(12, color: fg)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// `.chips`: sarılan çip satırı (aralık 6).
class SChips extends StatelessWidget {
  const SChips({super.key, required this.children, this.spacing = 6});
  final List<Widget> children;
  final double spacing;
  @override
  Widget build(BuildContext context) => Wrap(spacing: spacing, runSpacing: spacing, children: children);
}

/// `.option`: liste satırı seçici.
class SOption extends StatelessWidget {
  const SOption({super.key, required this.child, this.selected = false, this.onPressed, this.trailing});
  final Widget child;
  final bool selected;
  final VoidCallback? onPressed;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Opacity(
      opacity: onPressed == null && !selected ? 0.55 : 1,
      child: Pressable(
        onTap: onPressed,
        selected: selected,
        builder: (context, _) => Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: selected ? C.yellow : C.panel,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(R.sm),
          ),
          child: DefaultTextStyle.merge(
            style: T.b(15, color: fg, weight: FontWeight.w800),
            child: Row(
              children: [
                Expanded(child: child),
                if (trailing != null) ...[const SizedBox(width: 8), trailing!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `.toggle`: aç/kapa anahtarı satırı.
class SToggle extends StatelessWidget {
  const SToggle({super.key, required this.label, required this.value, this.onChanged});
  final String label;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onChanged == null ? null : () => onChanged!(!value),
      label: label,
      selected: value,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.only(left: 14, right: 12),
        decoration: BoxDecoration(
          color: C.panel,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: T.b(15, color: C.text2, weight: FontWeight.w700),
              ),
            ),
            const SizedBox(width: 12),
            ToggleKnob(on: value),
          ],
        ),
      ),
    );
  }
}

/// Anahtarın topuzu (44×26, 18'lik beyaz yuvarlak 18px kayar).
class ToggleKnob extends StatelessWidget {
  const ToggleKnob({super.key, required this.on});
  final bool on;
  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 150),
    width: 44,
    height: 26,
    decoration: BoxDecoration(
      color: on ? C.mint : C.panel2,
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(R.pill),
    ),
    child: AnimatedAlign(
      duration: const Duration(milliseconds: 150),
      alignment: on ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.all(2),
        width: 18,
        height: 18,
        decoration: BoxDecoration(
          color: C.paper,
          shape: BoxShape.circle,
          border: Border.all(color: C.ink, width: 2),
        ),
      ),
    ),
  );
}

/// Odak halkası (CSS `outline: 3px solid …; outline-offset: Npx`).
class FocusRing extends StatelessWidget {
  const FocusRing({super.key, required this.child, required this.focused, required this.radius, this.color = C.yellow, this.offset = 2, this.width = 3});
  final Widget child;
  final bool focused;
  final double radius;
  final Color color;
  final double offset;
  final double width;

  @override
  Widget build(BuildContext context) {
    final o = offset + width;
    return Stack(
      clipBehavior: Clip.none,
      // Çocuk, halka yokmuş gibi aynı kısıtlarla ölçülür (Stack varsayılanı kısıtları gevşetir).
      fit: StackFit.passthrough,
      children: [
        child,
        if (focused)
          Positioned(
            left: -o,
            top: -o,
            right: -o,
            bottom: -o,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: color, width: width),
                  borderRadius: BorderRadius.circular(radius + o),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// `.input`: beyaz kutu, 3px çerçeve, Baloo 700; odakta sarı halka.
class SInput extends StatefulWidget {
  const SInput({
    super.key,
    required this.controller,
    this.placeholder,
    this.maxLength,
    this.onSubmitted,
    this.onChanged,
    this.minHeight = 52,
    this.fontSize = 19,
    this.radius = R.md,
    this.focusColor = C.yellow,
    this.borderWidth = bw,
    this.autofocus = false,
    this.textCapitalization = TextCapitalization.sentences,
    this.inputFormatters,
    this.keyboardType,
    this.textInputAction,
    this.focusNode,
    this.label,
    this.fontFamily = T.display,
    this.fontWeight = FontWeight.w700,
    this.letterSpacing,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
    this.multiline = false,
    this.enabled = true,
    this.autocorrect = true,
    this.enableSuggestions = true,
  });

  final TextEditingController controller;
  final String? placeholder;
  final int? maxLength;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final double minHeight;
  final double fontSize;
  final double radius;
  final Color focusColor;
  final double borderWidth;
  final bool autofocus;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final FocusNode? focusNode;
  final String? label;
  final String fontFamily;
  final FontWeight fontWeight;
  final double? letterSpacing;
  final EdgeInsetsGeometry padding;
  final bool multiline;
  final bool enabled;
  final bool autocorrect;
  final bool enableSuggestions;

  @override
  State<SInput> createState() => _SInputState();
}

class _SInputState extends State<SInput> {
  late final FocusNode _focus = widget.focusNode ?? FocusNode();
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocus);
  }

  void _onFocus() => setState(() => _focused = _focus.hasFocus);

  @override
  void dispose() {
    _focus.removeListener(_onFocus);
    if (widget.focusNode == null) _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontFamily: widget.fontFamily,
      fontWeight: widget.fontWeight,
      fontSize: widget.fontSize,
      color: C.ink2,
      height: 1.2,
      letterSpacing: widget.letterSpacing,
    );
    return FocusRing(
      focused: _focused,
      radius: widget.radius,
      color: widget.focusColor,
      child: Container(
        constraints: BoxConstraints(minHeight: widget.minHeight),
        alignment: Alignment.centerLeft,
        padding: widget.padding,
        decoration: BoxDecoration(
          color: C.paper,
          border: Border.all(color: C.ink, width: widget.borderWidth),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
        child: TextField(
          controller: widget.controller,
          focusNode: _focus,
          autofocus: widget.autofocus,
          enabled: widget.enabled,
          autocorrect: widget.autocorrect,
          enableSuggestions: widget.enableSuggestions,
          maxLength: widget.maxLength,
          maxLengthEnforcement: MaxLengthEnforcement.enforced,
          onSubmitted: widget.onSubmitted,
          onChanged: widget.onChanged,
          textCapitalization: widget.textCapitalization,
          inputFormatters: widget.inputFormatters,
          keyboardType: widget.multiline ? TextInputType.multiline : widget.keyboardType,
          textInputAction: widget.textInputAction,
          minLines: 1,
          maxLines: widget.multiline ? 5 : 1,
          cursorColor: C.ink2,
          style: style,
          decoration: InputDecoration(
            isCollapsed: true,
            border: InputBorder.none,
            counterText: '',
            hintText: widget.placeholder,
            hintStyle: style.copyWith(color: C.placeholder),
            semanticCounterText: '',
            labelText: null,
          ),
        ),
      ),
    );
  }
}

/// Avatar renkleri (packages/game-kit/src/ui/Avatar.tsx).
const Map<String, Color> avatarColors = {
  'mint': Color(0xFF3EE0A8),
  'signal': Color(0xFFFFD23F),
  'label': Color(0xFFFF6B6B),
  'sky': Color(0xFF5AB8FF),
  'paper': Color(0xFFB794FF),
};

/// Avatar işareti (Şarkıyı Bil): bildi / sanatçıyı bildi / yanlış / pas.
enum AvatarMark { correct, artist, locked, skipped }

/// Renkli daire + takma adın baş harfi.
class SAvatar extends StatelessWidget {
  const SAvatar({
    super.key,
    required this.avatar,
    required this.nick,
    this.size = 36,
    this.mark,
    this.dim = false,
    this.fontSize,
    this.borderColor = C.ink,
    this.borderWidth,
  });
  final Avatar avatar;
  final String nick;
  final double size;
  final AvatarMark? mark;
  final bool dim;
  final double? fontSize;
  final Color borderColor;

  /// Verilmezse 40px ve üstünde 3, altında 2.
  final double? borderWidth;

  @override
  Widget build(BuildContext context) {
    final color = avatarColors[avatar.color] ?? avatarColors['mint']!;
    final trimmed = nick.trim();
    final letter = trimmed.isEmpty ? '?' : trUpper(String.fromCharCode(trimmed.runes.first));
    final circle = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: borderWidth ?? (size >= 40 ? 3 : 2)),
      ),
      child: Text(
        letter,
        style: T.d(fontSize ?? size * 0.46, color: C.ink2),
        textScaler: TextScaler.noScaling,
      ),
    );
    Widget out = circle;
    if (mark != null) {
      final m = math.max(12.0, size * 0.38);
      out = Stack(
        clipBehavior: Clip.none,
        children: [
          circle,
          Positioned(
            right: -2,
            bottom: -2,
            child: Container(
              width: m,
              height: m,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: C.ink, width: 2),
                color: switch (mark!) {
                  AvatarMark.correct => C.accent,
                  AvatarMark.artist => C.yellow,
                  AvatarMark.locked => C.red,
                  AvatarMark.skipped => C.text3,
                },
              ),
            ),
          ),
        ],
      );
    }
    return Opacity(opacity: dim ? 0.45 : 1, child: out);
  }
}

/// `.game-mono`: iki harflik oyun rozeti (kategori renginde, −6° eğik).
class GameMono extends StatelessWidget {
  const GameMono({super.key, required this.text, this.category, this.size = 44, this.fontSize = 17, this.radius = 14, this.background});
  final String text;
  final String? category;
  final double size;
  final double fontSize;
  final double radius;
  final Color? background;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(-6),
    child: Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: background ?? catColor(category),
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Text(
        text,
        style: T.d(fontSize, color: C.ink2),
        textScaler: TextScaler.noScaling,
      ),
    ),
  );
}

/// Logo rozeti: uygulamanın rengi ve ikonu (Songie: nota).
class BrandBadge extends StatelessWidget {
  const BrandBadge({super.key, this.size = 36, this.iconSize = 20, this.radius = 11, this.border = bw, this.shadow});
  final double size;
  final double iconSize;
  final double radius;
  final double border;
  final List<BoxShadow>? shadow;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(-8),
    child: Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppFlavor.current.badgeColor,
        border: Border.all(color: C.ink, width: border),
        borderRadius: AppFlavor.current.badgeRadius ?? BorderRadius.circular(radius),
        boxShadow: shadow ?? Shadows.sm,
      ),
      child: SIcon(AppFlavor.current.badgeIcon, size: iconSize, color: C.ink2),
    ),
  );
}

/// `.brand`: rozet + uygulamanın adı ("songie").
class Brand extends StatelessWidget {
  const Brand({super.key, this.compact = false, this.onTap});
  final bool compact;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final row = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!compact) ...[const BrandBadge(), const SizedBox(width: 8)],
        Text(
          AppFlavor.current.brandText,
          style: T.d(compact ? 24 : 28, color: C.text),
          textScaler: TextScaler.noScaling,
        ),
      ],
    );
    return onTap == null ? row : GestureDetector(onTap: onTap, behavior: HitTestBehavior.opaque, child: row);
  }
}

/// `.brand-lg`: giriş ekranındaki büyük logo.
class BrandLarge extends StatelessWidget {
  const BrandLarge({super.key});
  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      BrandBadge(size: 74, iconSize: 40, radius: 22, border: 4, shadow: hardShadow(5, 5)),
      const SizedBox(height: 10),
      Text(
        AppFlavor.current.brandText,
        style: T.d(46, color: C.text),
        textScaler: TextScaler.noScaling,
      ),
    ],
  );
}

/// `.eyebrow` başlığı.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color = C.text3});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Text(trUpper(text), style: T.eyebrow(color: color));
}

/// Dikey aralıklı sütun (CSS `display: grid; gap: N`).
class Gap extends StatelessWidget {
  const Gap(this.size, {super.key});
  final double size;
  @override
  Widget build(BuildContext context) => SizedBox(width: size, height: size);
}

/// Çocukların arasına boşluk koyan sütun.
class VStack extends StatelessWidget {
  const VStack({super.key, required this.children, this.gap = 0, this.crossAxisAlignment = CrossAxisAlignment.stretch, this.mainAxisSize = MainAxisSize.min});
  final List<Widget> children;
  final double gap;
  final CrossAxisAlignment crossAxisAlignment;
  final MainAxisSize mainAxisSize;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];
    for (final c in children) {
      if (items.isNotEmpty && gap > 0) items.add(SizedBox(height: gap));
      items.add(c);
    }
    return Column(crossAxisAlignment: crossAxisAlignment, mainAxisSize: mainAxisSize, children: items);
  }
}

/// Çocukların arasına boşluk koyan satır.
class HStack extends StatelessWidget {
  const HStack({
    super.key,
    required this.children,
    this.gap = 0,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.max,
  });
  final List<Widget> children;
  final double gap;
  final CrossAxisAlignment crossAxisAlignment;
  final MainAxisAlignment mainAxisAlignment;
  final MainAxisSize mainAxisSize;

  @override
  Widget build(BuildContext context) =>
      Row(crossAxisAlignment: crossAxisAlignment, mainAxisAlignment: mainAxisAlignment, mainAxisSize: mainAxisSize, children: _gapped(children, gap));
}

/// İki sütunlu ızgara (CSS `grid-template-columns: repeat(2, minmax(0, 1fr))`).
class Grid2 extends StatelessWidget {
  const Grid2({super.key, required this.children, this.columns = 2, this.rowGap = 10, this.columnGap = 10, this.equalHeight = false});
  final List<Widget> children;
  final int columns;
  final double rowGap;
  final double columnGap;
  final bool equalHeight;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i += columns) {
      final cells = <Widget>[];
      for (var c = 0; c < columns; c++) {
        if (c > 0) cells.add(SizedBox(width: columnGap));
        final idx = i + c;
        cells.add(Expanded(child: idx < children.length ? children[idx] : const SizedBox()));
      }
      final row = Row(crossAxisAlignment: equalHeight ? CrossAxisAlignment.stretch : CrossAxisAlignment.start, children: cells);
      rows.add(equalHeight ? IntrinsicHeight(child: row) : row);
    }
    return VStack(gap: rowGap, children: rows);
  }
}

/// Kırılmayan tek satır metin (CSS'te uzun bir kelime kutusundan taşar, satır kırılmaz).
/// Flutter sığmayan kelimeyi harf harf böler; bu, web'deki gibi ortalanmış taşar.
class NoWrapText extends StatelessWidget {
  const NoWrapText(this.text, {super.key, required this.style, this.alignment = Alignment.center});
  final String text;
  final TextStyle style;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    final painter = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
      maxLines: 1,
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    return SizedBox(
      height: painter.height,
      child: OverflowBox(
        maxWidth: double.infinity,
        alignment: alignment,
        child: Text(text, style: style, maxLines: 1, softWrap: false),
      ),
    );
  }
}
