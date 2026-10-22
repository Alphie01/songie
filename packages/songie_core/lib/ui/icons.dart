import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// packages/game-kit/src/ui/Icon.tsx ikonları (24'lük kutu, 2.6 çizgi, yuvarlak uçlar).
const Map<String, String> _paths = {
  'menu': '<path d="M4 7h16M4 12h16M4 17h16" />',
  'close': '<path d="M6 6l12 12M18 6L6 18" />',
  'plus': '<path d="M12 5v14M5 12h14" />',
  'link': '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />',
  'share': '<circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />',
  'replay': '<path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />',
  'note': '<path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />',
  'play': '<path d="M8 5.5v13a.6.6 0 0 0 .9.5l10.4-6.5a.6.6 0 0 0 0-1L8.9 5a.6.6 0 0 0-.9.5z" fill="currentColor" stroke="none" />',
  'pause': '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none" />',
  'skip': '<path d="M6 5.5v13a.6.6 0 0 0 .9.5l9.4-6.5a.6.6 0 0 0 0-1L6.9 5a.6.6 0 0 0-.9.5z" fill="currentColor" stroke="none" /><path d="M19 5v14" />',
  'search': '<circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" />',
  'copy': '<rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />',
  'check': '<path d="M5 12.5l4.5 4.5L19 7.5" />',
  'x': '<path d="M7 7l10 10M17 7L7 17" />',
  'volume': '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />',
  'chevron': '<path d="M6 9l6 6 6-6" />',
  'arrow': '<path d="M5 12h14M13 6l6 6-6 6" />',
  'user': '<circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c1.2-3.3 4-5 7-5s5.8 1.7 7 5" />',
  'music': '<path d="M9 17.5V6l10-2v11.5" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />',
  'flag': '<path d="M6 20V5m0 0h10l-2 4 2 4H6" />',
  'cards': '<rect x="7" y="4" width="11" height="15" rx="2" /><path d="M5 7.5v11a2 2 0 0 0 2 2h8" /><path d="M10 9h5M10 12.5h5" />',
  'chat': '<path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5z" />',
  'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" />',
  'mask': '<path d="M3 7c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0v3.5c0 4-3.5 7-6 7-1.4 0-2.2-1.2-3-2.5-.8 1.3-1.6 2.5-3 2.5-2.5 0-6-3-6-7z" /><path d="M7 11h2.5M14.5 11H17" />',
  'shuffle':
      '<path d="M4 7h3.5c2 0 3 1 4 2.5l2 3c1 1.5 2 2.5 4 2.5H20M17 4l3 3-3 3M4 17h3.5c1.4 0 2.3-.5 3-1.3M13.5 8.3c.7-.8 1.6-1.3 3-1.3H20M17 14l3 3-3 3" />',
};

String _svg(String name) =>
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.6" '
    'stroke-linecap="round" stroke-linejoin="round">${_paths[name] ?? _paths['note']}</svg>';

final Map<String, String> _cache = {};

class SIcon extends StatelessWidget {
  const SIcon(this.name, {super.key, this.size = 18, this.color});
  final String name;
  final double size;

  /// Verilmezse çevredeki yazı rengi (currentColor).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? DefaultTextStyle.of(context).style.color ?? const Color(0xFFFFFFFF);
    return SvgPicture.string(
      _cache.putIfAbsent(name, () => _svg(name)),
      width: size,
      height: size,
      theme: SvgTheme(currentColor: c),
    );
  }
}

/// Ham SVG'yi (oyunların kendi çizimleri) currentColor ile çizer.
class SSvg extends StatelessWidget {
  const SSvg(this.svg, {super.key, this.width, this.height, this.color, this.fit = BoxFit.contain});
  final String svg;
  final double? width;
  final double? height;
  final Color? color;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final c = color ?? DefaultTextStyle.of(context).style.color ?? const Color(0xFFFFFFFF);
    return SvgPicture.string(
      svg,
      width: width,
      height: height,
      fit: fit,
      theme: SvgTheme(currentColor: c),
    );
  }
}
