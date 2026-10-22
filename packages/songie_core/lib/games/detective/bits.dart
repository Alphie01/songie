// games/detective/client/Bits.tsx karşılığı (ses oynatıcılar audio.dart'ta, mühürler documents.dart'ta)
// ve detective.css'teki ortak küçük parçalar.
import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../config.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'desk.dart';
import 'models.dart';
import 'strings.dart';

/// detective.css ve documents.css'te token karşılığı olmayan renkler.
abstract final class DtC {
  static const cream = Color(0xFFF3E6C4);
  static const brown = Color(0xFF2B2116);
  static const red = Color(0xFFC0392B);
  static const card = Color(0xFF221A4D);
  static const cardLine = Color(0xFF3A2E80);
  static const cell = Color(0xFF2E2560);
  static const nav = Color(0xFF1A1240);

  // Belgeler (documents.css)
  static const paper = Color(0xFFF4F3EE);
  static const ink = Color(0xFF1F201D);
  static const ink2 = Color(0xFF5A5C55);
  static const rule = Color(0xFF9B9A93);
  static const stage = Color(0xFF0A0E0B);

  /// `--accent-hi`
  static const accentHi = Color(0xFF6FF0C2);
}

/// Belge yazı aileleri (documents.css `--dt-serif`, `--dt-sans`, `--dt-type`, `--dt-hand`).
/// Web yığınlarındaki metrik-uyumlu açık yazı tipleri; pubspec'te kayıtlı değilse sistem yazısına düşer.
abstract final class DtFont {
  static const serif = 'Tinos';
  static const sans = 'Arimo';
  static const type = 'Cousine';
  static const hand = 'ComicNeue';
}

const tabular = [FontFeature.tabularFigures()];

// ---------------------------------------------------------------- Belge türü simgeleri

const _kindPaths = <String, String>{
  'statement': '<path d="M5 4h10l4 4v12H5z" /><path d="M8 11h3M8 14.5h8M8 18h6M13 11h3" />',
  'report': '<path d="M6 3.5h12v17H6z" /><path d="M9 8h6M9 11.5h6M9 15h4" />',
  'phoneLog': '<path d="M4 5h16M4 9.5h16M4 14h16M4 18.5h16" /><path d="M9 5v13.5" />',
  'messages': '<path d="M4.5 17.5V6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8z" />',
  'email': '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="M4 6.5l8 6 8-6" />',
  'receipt': '<path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" /><path d="M9 8h6M9 11.5h6M9 15h3" />',
  'bank': '<path d="M3.5 9.5L12 4l8.5 5.5z" /><path d="M6 10v7M10 10v7M14 10v7M18 10v7M3.5 19.5h17" />',
  'letter': '<path d="M5 19c3-1 4.5-4 6-7s4-6.5 8-7c-.5 4-4 6.5-7 8s-6 3-7 6z" /><path d="M5 19l4-4" />',
  'newspaper': '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 9h3v8a2 2 0 0 1-2 2M7 8.5h7M7 12h3M7 15.5h3M12.5 12H14v3.5h-1.5z" />',
  'photo': '<rect x="3.5" y="6.5" width="17" height="12" rx="1.5" /><circle cx="12" cy="12.5" r="3.2" /><path d="M8.5 6.5l1.2-2h4.6l1.2 2" />',
  'accessLog': '<rect x="3.5" y="6" width="17" height="12" rx="1.5" /><path d="M3.5 10h17M7 14.5h4" />',
  'ticket': '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" /><path d="M14 7v10" stroke-dasharray="1.5 2" />',
  'table': '<rect x="3.5" y="4.5" width="17" height="15" rx="1" /><path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15" />',
  'audio': '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />',
  'floorplan': '<path d="M4 4.5h16v15H4z" /><path d="M12 4.5v6M12 14v5.5M4 12h5M15 12h5" />',
};

String _strokeSvg(String body, double width) =>
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="$width" '
    'stroke-linecap="round" stroke-linejoin="round">$body</svg>';

final Map<String, String> _glyphCache = {};

/// `KindGlyph`: belge türü simgesi (1.6 çizgi).
class KindGlyph extends StatelessWidget {
  const KindGlyph(this.kind, {super.key, this.size = 16, this.color});
  final String kind;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) =>
      SSvg(_glyphCache.putIfAbsent('k:$kind', () => _strokeSvg(_kindPaths[kind] ?? _kindPaths['report']!, 1.6)), width: size, height: size, color: color);
}

/// `IvGlyph`: sorgu odası simgesi (masa lambası).
class IvGlyph extends StatelessWidget {
  const IvGlyph({super.key, this.size = 14, this.color});
  final double size;
  final Color? color;
  static final _svg = _strokeSvg('<path d="M12 3v3M7.5 11.5L9 6h6l1.5 5.5z" /><path d="M10 15h4M4 20.5h16" />', 1.7);
  @override
  Widget build(BuildContext context) => SSvg(_svg, width: size, height: size, color: color);
}

/// Cabinet.tsx `PinIcon`.
class PinIcon extends StatelessWidget {
  const PinIcon({super.key, this.size = 12, this.color});
  final double size;
  final Color? color;
  static final _svg = _strokeSvg('<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7" />', 2);
  @override
  Widget build(BuildContext context) => SSvg(_svg, width: size, height: size, color: color);
}

/// Yer tutucudaki fotoğraf makinesi (1.4 çizgi, uçlar köşeli).
const _phGlyphSvg =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.4">'
    '<rect x="3.5" y="6.5" width="17" height="12" rx="1.5" /><circle cx="12" cy="12.5" r="3.2" /><path d="M8.5 6.5l1.2-2h4.6l1.2 2" /></svg>';

// ---------------------------------------------------------------- Görseller

/// Sunucu adresi her yeniden başlatmada değişir; önbellek anahtarı vaka + kimliktir.
/// Yükleme `NetworkImage` (io) ile aynıdır.
class _KeyedNetworkImage extends ImageProvider<_KeyedNetworkImage> {
  const _KeyedNetworkImage(this.url, this.cacheKey);
  final String url;
  final String cacheKey;

  static HttpClient? _sharedClient;
  static HttpClient get _client => _sharedClient ??= HttpClient()..autoUncompress = false;

  @override
  Future<_KeyedNetworkImage> obtainKey(ImageConfiguration configuration) => SynchronousFuture<_KeyedNetworkImage>(this);

  @override
  ImageStreamCompleter loadImage(_KeyedNetworkImage key, ImageDecoderCallback decode) {
    final completer = MultiFrameImageStreamCompleter(codec: _load(key, decode), scale: 1.0, debugLabel: key.url);
    // Gizli bölmelerdeki görseller (TickerMode kapalı) akışı dinlemez: hata kimseye ulaşmazsa yutulur.
    // Bölme açılınca Image yeniden dinler ve errorBuilder yer tutucuyu çizer.
    completer.addEphemeralErrorListener((_, _) {});
    return completer;
  }

  Future<ui.Codec> _load(_KeyedNetworkImage key, ImageDecoderCallback decode) async {
    try {
      final uri = Uri.base.resolve(key.url);
      final request = await _client.getUrl(uri);
      final response = await request.close();
      if (response.statusCode != HttpStatus.ok) {
        await response.drain<List<int>>(<int>[]);
        throw NetworkImageLoadException(statusCode: response.statusCode, uri: uri);
      }
      final bytes = await consolidateHttpClientResponseBytes(response);
      if (bytes.lengthInBytes == 0) throw Exception('Görsel boş: $uri');
      return decode(await ui.ImmutableBuffer.fromUint8List(bytes));
    } catch (_) {
      // Hatalı görsel önbellekte kalmasın; sonraki çizimde yeniden denensin.
      scheduleMicrotask(() => PaintingBinding.instance.imageCache.evict(key));
      rethrow;
    }
  }

  @override
  bool operator ==(Object other) => other is _KeyedNetworkImage && other.cacheKey == cacheKey;

  @override
  int get hashCode => cacheKey.hashCode;
}

/// Ağ görseli: yüklenemezse [error] çizilir (testte ağ yoktur, hata atılmaz).
class DtNetImage extends StatelessWidget {
  const DtNetImage({super.key, required this.url, required this.cacheKey, this.fit = BoxFit.cover, this.error, this.semanticLabel, this.width, this.height, this.alignment = Alignment.center});
  final String url;
  final String cacheKey;
  final BoxFit fit;
  final Widget? error;
  final String? semanticLabel;
  final double? width;
  final double? height;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) => Image(
    image: _KeyedNetworkImage(mediaUrl(url), cacheKey),
    fit: fit,
    width: width,
    height: height,
    alignment: alignment,
    semanticLabel: semanticLabel,
    excludeFromSemantics: semanticLabel == null,
    gaplessPlayback: true,
    errorBuilder: (context, _, _) => error ?? const SizedBox.shrink(),
  );
}

enum PicTone { print, cctv, news, dark }

/// `Picture`: görsel varsa basar; yoksa (ya da yüklenemezse) çerçeve içinde dosyadaki tarifi gösterir.
/// [fontSize] yer tutucunun `em` tabanıdır.
class Picture extends StatelessWidget {
  const Picture({
    super.key,
    required this.url,
    required this.alt,
    required this.cacheKey,
    this.label,
    this.tone = PicTone.print,
    this.aspectRatio = 4 / 3,
    this.phAspectRatio,
    this.fontSize = 16,
    this.fit = BoxFit.cover,
    this.phPadding,
    this.phBackground,
    this.phBorder = true,
    this.imageWrap,
  });
  final String? url;
  final String alt;
  final String cacheKey;
  final String? label;
  final PicTone tone;

  /// Görselin kutusu (null: görselin kendi oranı).
  final double? aspectRatio;

  /// Yer tutucunun oranı (verilmezse [aspectRatio] ya da 4/3).
  final double? phAspectRatio;
  final double fontSize;
  final BoxFit fit;
  final EdgeInsets? phPadding;
  final Color? phBackground;
  final bool phBorder;

  /// Görselin üstüne filtre vb. (ör. CCTV gri tonu).
  final Widget Function(Widget image)? imageWrap;

  @override
  Widget build(BuildContext context) {
    final ph = PicPlaceholder(alt: alt, label: label, tone: tone, fontSize: fontSize, aspectRatio: phAspectRatio ?? aspectRatio ?? 4 / 3, padding: phPadding, background: phBackground, border: phBorder);
    final u = url;
    if (u == null) return ph;
    Widget img = DtNetImage(url: u, cacheKey: cacheKey, fit: fit, semanticLabel: alt, error: ph, width: double.infinity, height: aspectRatio == null ? null : double.infinity);
    if (imageWrap != null) img = imageWrap!(img);
    return aspectRatio == null ? img : AspectRatio(aspectRatio: aspectRatio!, child: img);
  }
}

/// `.dt-ph`: koyu çizgili çerçeve, fotoğraf simgesi, etiket ve tarif.
class PicPlaceholder extends StatelessWidget {
  const PicPlaceholder({super.key, required this.alt, this.label, this.tone = PicTone.print, this.fontSize = 16, this.aspectRatio = 4 / 3, this.padding, this.background, this.border = true});
  final String alt;
  final String? label;
  final PicTone tone;
  final double fontSize;
  final double? aspectRatio;
  final EdgeInsets? padding;
  final Color? background;
  final bool border;

  @override
  Widget build(BuildContext context) {
    final news = tone == PicTone.news;
    final em = fontSize;
    final fg = news ? const Color(0xFF2B2A26) : const Color(0xFFCFD5CF);
    final box = Container(
      padding: padding ?? EdgeInsets.all(1.4 * em),
      decoration: BoxDecoration(
        color: background ?? (news ? const Color(0xFFCFCABD) : const Color(0xFF1B201C)),
        border: border ? Border.all(color: news ? const Color(0x26000000) : const Color(0x0FFFFFFF)) : null,
      ),
      child: CustomPaint(
        painter: news ? const _DotsPainter() : const _StripesPainter(),
        child: Center(
          child: Semantics(
            label: alt,
            image: true,
            child: ExcludeSemantics(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: 30 * em * 0.92),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Opacity(opacity: 0.45, child: SSvg(_phGlyphSvg, width: 22, height: 22, color: fg)),
                    if (label != null) ...[
                      SizedBox(height: 0.5 * em),
                      Text(label!, style: T.b(0.72 * em, color: const Color(0xFF8C948D)), textAlign: TextAlign.center),
                    ],
                    SizedBox(height: 0.5 * em),
                    Text(
                      alt,
                      textAlign: TextAlign.center,
                      style: news
                          ? TextStyle(fontFamily: DtFont.serif, fontSize: 0.92 * em, height: 1.5, fontStyle: FontStyle.italic, color: const Color(0xFF1F1E1B))
                          : T.b(0.92 * em, color: const Color(0xFFE6EBE6), height: 1.5),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
    return aspectRatio == null ? box : AspectRatio(aspectRatio: aspectRatio!, child: box);
  }
}

/// `repeating-linear-gradient(135deg, rgb(255 255 255 / 0.025) 0 2px, transparent 2px 12px)`
class _StripesPainter extends CustomPainter {
  const _StripesPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = const Color(0x06FFFFFF)
      ..strokeWidth = 2;
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    // Gradyan ↘ yönünde 12px'lik dönemler; ilk 2px renkli: x + y = √2·(12k + 1) çizgileri.
    const period = 12 * math.sqrt2;
    for (double c = math.sqrt2; c < size.width + size.height + period; c += period) {
      canvas.drawLine(Offset(c, 0), Offset(0, c), p);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_StripesPainter oldDelegate) => false;
}

/// `radial-gradient(rgb(0 0 0 / 0.13) 1px, transparent 1.3px)` 4×4 ızgara.
class _DotsPainter extends CustomPainter {
  const _DotsPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = const Color(0x21000000);
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    for (double y = 2; y < size.height; y += 4) {
      for (double x = 2; x < size.width; x += 4) {
        canvas.drawCircle(Offset(x, y), 1.15, p);
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_DotsPainter oldDelegate) => false;
}

// ---------------------------------------------------------------- Küçük parçalar

/// `.dt-label` / `.dt-sec-title` (+ `.dt-count`): Nunito 12, 800, 1.5px aralık, büyük harf.
class DtLabel extends StatelessWidget {
  const DtLabel(this.text, {super.key, this.count, this.color = C.text3, this.countColor = C.text3});
  final String text;
  final String? count;
  final Color color;
  final Color countColor;

  static TextStyle style([Color color = C.text3]) => T.b(12, color: color, weight: FontWeight.w800, letterSpacing: 1.5, height: 1.3);

  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      children: [
        TextSpan(text: trUpper(text)),
        if (count != null) ...[
          const WidgetSpan(child: SizedBox(width: 6)),
          TextSpan(text: count, style: T.b(12, color: countColor, weight: FontWeight.w800, letterSpacing: 0, height: 1.3)),
        ],
      ],
    ),
    style: style(color),
  );
}

/// `.dt-count` tek başına.
class DtCount extends StatelessWidget {
  const DtCount(this.text, {super.key, this.color = C.text3});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Text(text, style: T.b(12, color: color, weight: FontWeight.w800));
}

/// `.dt-empty`: kesikli çerçeveli boş durum.
class DtEmpty extends StatelessWidget {
  const DtEmpty(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => DashedBox(
    color: DtC.cardLine,
    radius: 16,
    width: 2,
    padding: const EdgeInsets.all(14),
    child: SizedBox(width: double.infinity, child: Text(text, style: T.b(13, color: C.text3, weight: FontWeight.w700, height: 1.5))),
  );
}

/// `.dt-link`: gök mavisi yazı düğme (en az 32 yükseklik).
class DtLink extends StatelessWidget {
  const DtLink(this.text, {super.key, required this.onTap, this.color = C.sky, this.underline = false});
  final String text;
  final VoidCallback? onTap;
  final Color color;
  final bool underline;
  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Pressable(
      onTap: onTap,
      label: text,
      builder: (context, _) => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 32),
        child: Align(
          alignment: Alignment.centerLeft,
          widthFactor: 1,
          heightFactor: 1,
          child: Text(
            text,
            style: T.b(13, color: color, weight: FontWeight.w800).copyWith(decoration: underline ? TextDecoration.underline : null, decorationColor: color),
          ),
        ),
      ),
    ),
  );
}

/// `.dt-icon-btn`: 44'lük kare düğme (2px çerçeve, r12).
class DtIconBtn extends StatelessWidget {
  const DtIconBtn({
    super.key,
    required this.child,
    required this.onTap,
    this.label,
    this.size = 44,
    this.background = C.panel,
    this.borderColor = C.ink,
    this.borderWidth = 2,
    this.color = C.text,
    this.disabledOpacity = 0.4,
  });
  final Widget child;
  final VoidCallback? onTap;
  final String? label;
  final double size;
  final Color? background;
  final Color? borderColor;
  final double borderWidth;
  final Color color;
  final double disabledOpacity;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null ? disabledOpacity : 1,
    child: Pressable(
      onTap: onTap,
      label: label,
      builder: (context, _) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: background,
          border: borderColor == null || borderWidth == 0 ? null : Border.all(color: borderColor!, width: borderWidth),
          borderRadius: BorderRadius.circular(12),
        ),
        child: IconTheme.merge(
          data: IconThemeData(color: color),
          child: DefaultTextStyle.merge(style: T.b(18, color: color, weight: FontWeight.w800, height: 1), child: child),
        ),
      ),
    ),
  );
}

/// `.dt-tab-badge`: pembe sayaç.
class TabBadge extends StatelessWidget {
  const TabBadge(this.count, {super.key});
  final int count;
  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minWidth: 16),
    height: 16,
    padding: const EdgeInsets.symmetric(horizontal: 4),
    alignment: Alignment.center,
    decoration: BoxDecoration(color: C.pink, borderRadius: BorderRadius.circular(R.pill)),
    child: Text('$count', style: T.b(10, color: C.ink2, weight: FontWeight.w800, height: 1)),
  );
}

/// `.dt-tab-dot`
class TabDot extends StatelessWidget {
  const TabDot({super.key});
  @override
  Widget build(BuildContext context) => Container(width: 8, height: 8, decoration: const BoxDecoration(color: C.pink, shape: BoxShape.circle));
}

/// `.dt-new`: "yeni" etiketi.
class NewTag extends StatelessWidget {
  const NewTag(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
    decoration: BoxDecoration(color: C.pink, borderRadius: BorderRadius.circular(6)),
    child: Text(text, style: T.b(11, color: C.ink2, weight: FontWeight.w800)),
  );
}

/// `.dt-small` (12px, 700, 1.5).
TextStyle dtSmall([Color color = C.text]) => T.b(12, color: color, weight: FontWeight.w700, height: 1.5);

/// `.option`: liste satırı seçici (seçiliyken sarı).
class DtOption extends StatelessWidget {
  const DtOption({super.key, required this.child, this.selected = false, this.onTap, this.trailing, this.minHeight = 44, this.padding = const EdgeInsets.symmetric(horizontal: 14)});
  final Widget child;
  final bool selected;
  final VoidCallback? onTap;
  final Widget? trailing;
  final double minHeight;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onTap,
      selected: selected,
      builder: (context, _) => Container(
        constraints: BoxConstraints(minHeight: minHeight),
        padding: padding,
        decoration: BoxDecoration(color: selected ? C.yellow : C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.sm)),
        child: DefaultTextStyle.merge(
          style: T.b(15, color: fg, weight: FontWeight.w800),
          child: IconTheme.merge(
            data: IconThemeData(color: fg),
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

/// `.dt-filters .chip`, `.dt-viewer .chip`: küçük hap çip (seçiliyken sarı).
class DtChip extends StatelessWidget {
  const DtChip({super.key, required this.label, this.selected = false, this.onTap, this.leading, this.borderColor = DtC.cardLine, this.color = C.text, this.minHeight = 32});
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final Widget? leading;
  final Color borderColor;
  final Color color;
  final double minHeight;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : color;
    return Pressable(
      onTap: onTap,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: BoxConstraints(minHeight: minHeight),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? C.yellow : Colors.transparent,
          border: Border.all(color: selected ? C.yellow : borderColor, width: 2),
          borderRadius: BorderRadius.circular(R.pill),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leading != null) ...[IconTheme.merge(data: IconThemeData(color: fg), child: leading!), const SizedBox(width: 6)],
            Flexible(child: Text(label, style: T.b(12, color: fg, weight: FontWeight.w800, height: 1.2))),
          ],
        ),
      ),
    );
  }
}

/// Portre kutusundaki baş harfler (`.dt-portrait-ph`).
class PortraitInitials extends StatelessWidget {
  const PortraitInitials(this.name, {super.key, this.fontSize = 15, this.color});
  final String name;
  final double fontSize;
  final Color? color;
  @override
  Widget build(BuildContext context) => Center(child: Text(initials(name), style: T.b(fontSize, color: color, weight: FontWeight.w800, height: 1)));
}

// ---------------------------------------------------------------- Notlar

/// `NoteList`: kişiye ve belgeye iliştirilen notlar; [compact] ise form "Not ekle" ile açılır.
class NoteList extends StatefulWidget {
  const NoteList({super.key, required this.notes, required this.onAdd, this.compact = false});
  final List<Note> notes;
  final Future<bool> Function(String text) onAdd;
  final bool compact;

  @override
  State<NoteList> createState() => _NoteListState();
}

class _NoteListState extends State<NoteList> {
  final _text = TextEditingController();
  bool _busy = false;
  late bool _formOpen = !widget.compact;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = _text.text.trim();
    if (t.isEmpty || _busy) return;
    setState(() => _busy = true);
    final ok = await widget.onAdd(t);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) _text.clear();
  }

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final items = <Widget>[];
    if (widget.notes.isNotEmpty) {
      items.add(
        VStack(
          gap: 6,
          children: [
            for (final n in widget.notes)
              Container(
                padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
                decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (d.player(n.by) case final p?)
                      SAvatar(avatar: p.avatar, nick: p.nick, size: 20)
                    else
                      Container(width: 20, height: 20, decoration: const BoxDecoration(color: C.panel3, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(n.text, style: T.b(13, color: C.ink2, weight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Opacity(opacity: 0.7, child: Text('${d.nick(n.by)}, ${ago(n.at - d.offset)}', style: T.b(11, color: C.ink2, weight: FontWeight.w700))),
                        ],
                      ),
                    ),
                    if (n.by == d.meId || d.isHost) ...[
                      const SizedBox(width: 8),
                      DtIconBtn(
                        size: 32,
                        background: null,
                        borderColor: null,
                        color: C.ink2,
                        label: SNotes.delete,
                        onTap: () => d.send({'type': 'deleteNote', 'noteId': n.id}),
                        child: const SIcon('x', size: 14, color: C.ink2),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      );
    }
    if (!_formOpen) {
      items.add(DtLink(SNotes.add, onTap: () => setState(() => _formOpen = true)));
    } else {
      final can = _text.text.trim().isNotEmpty && !_busy;
      items.add(
        Row(
          children: [
            Expanded(
              child: Semantics(
                label: SNotes.placeholder,
                child: SInput(
                  controller: _text,
                  placeholder: SNotes.placeholder,
                  maxLength: noteMax,
                  autofocus: widget.compact,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SButton(label: SNotes.add, tone: BtnTone.outline, onPressed: can ? _submit : null),
          ],
        ),
      );
    }
    return VStack(gap: 8, children: items);
  }
}

// ---------------------------------------------------------------- Onay

/// `ConfirmButton`: iki adımlı onay (tarayıcı `confirm()` yerine). [trigger] düğmeyi çizer;
/// onay açıkken `.dt-confirm` kutusu gelir. [frame] üst satırın yerleşimini değiştirir.
class ConfirmButton extends StatefulWidget {
  const ConfirmButton({super.key, required this.trigger, required this.confirm, required this.yes, required this.onConfirm, this.disabled = false, this.frame});
  final Widget Function(VoidCallback? onTap) trigger;
  final String confirm;
  final String yes;
  final VoidCallback onConfirm;
  final bool disabled;
  final Widget Function(Widget child, bool asking)? frame;

  @override
  State<ConfirmButton> createState() => _ConfirmButtonState();
}

class _ConfirmButtonState extends State<ConfirmButton> {
  bool _asking = false;

  @override
  Widget build(BuildContext context) {
    final Widget child;
    if (!_asking) {
      child = widget.trigger(widget.disabled ? null : () => setState(() => _asking = true));
    } else {
      child = Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(16)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.confirm, style: T.b(13, color: C.text, weight: FontWeight.w700, height: 1.5)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SButton(
                  label: widget.yes,
                  tone: BtnTone.primary,
                  onPressed: () {
                    setState(() => _asking = false);
                    widget.onConfirm();
                  },
                ),
                SGhostButton(label: SHint.cancel, onPressed: () => setState(() => _asking = false)),
              ],
            ),
          ],
        ),
      );
    }
    return widget.frame != null ? widget.frame!(child, _asking) : child;
  }
}
