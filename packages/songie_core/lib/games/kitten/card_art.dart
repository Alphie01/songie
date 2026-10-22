// games/kitten/client/CardArt.tsx + kitten.css (.kt-card, .kt-back, .kt-glyph).
import 'package:flutter/material.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import 'strings.dart';

/// `[data-kind]` → `--c`: her kart türünün kendi rengi.
Color ktColor(String kind) => switch (kind) {
  'bomb' => C.red,
  'defuse' => C.mint,
  'attack' => C.red,
  'skip' => C.sky,
  'future' => C.lilac,
  'shuffle' => C.yellow,
  'favor' => C.pink,
  'nope' => C.paper,
  'sarman' => C.yellow,
  'tekir' => C.lilac,
  'pamuk' => C.paper2,
  'kara' => C.coral,
  'benek' => C.sky,
  _ => C.paper,
};

String _hex(Color c) => '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

const _whiskers = '<path d="M6 27l8 1M6 32l8-1M42 27l-8 1M42 32l-8-1"/>';
const _head = 'M11 21L12 7l9 8.5q3-.8 6 0L36 7l1 14q2 16-13 17Q9 37 11 21z';

/// Her kart türü için özgün satır içi simge (48×48). [ink] kart içindeki `--kt-ink` (kart rengi),
/// [eye] `--kt-eye` (sarı). Kart dışında kullanılan simgeler (Hayır, Etkisiz Kıl, Geleceği Gör) bunları kullanmaz.
String _glyphBody(String kind, String ink, String eye) => switch (kind) {
  'bomb' =>
    '<circle cx="22" cy="29" r="12" fill="currentColor" stroke="none"/>'
        '<path d="M29 19.5l3-3" stroke-width="4"/>'
        '<path d="M32.5 16c2-4 6-4 8-8"/>'
        '<path d="M41 4.5v3M41 10.5v3M37.5 9h-2M46.5 9h-2M38.6 6.5l1 1M43.4 11.5l1 1" stroke-width="1.8"/>'
        '<path d="M15 26a8 8 0 0 1 5-5" stroke="$ink" stroke-width="2.4"/>',
  'defuse' =>
    '<circle cx="13" cy="35" r="5.5"/>'
        '<circle cx="27" cy="38" r="5.5"/>'
        '<path d="M17 31L36 9M23 34L40 15"/>'
        '<path d="M36 9l4 6" stroke-width="1.6"/>'
        '<path d="M6 14c6 0 8 4 14 4" stroke-dasharray="2.5 3" stroke-width="1.8"/>',
  'attack' =>
    '<path d="M13 8c2 12 0 22-6 32"/>'
        '<path d="M24 6c2 13 1 25-4 36"/>'
        '<path d="M35 8c2 12 1 22-4 32"/>',
  'skip' =>
    '<path d="M9 12l12 12-12 12"/>'
        '<path d="M22 12l12 12-12 12"/>'
        '<path d="M40 11v26"/>',
  'future' =>
    '<path d="M4 24c5-9 12-13 20-13s15 4 20 13c-5 9-12 13-20 13S9 33 4 24z"/>'
        '<circle cx="24" cy="24" r="7"/>'
        '<circle cx="24" cy="24" r="2.6" fill="currentColor" stroke="none"/>'
        '<path d="M24 4v3M12 7l2 3M36 7l-2 3" stroke-width="1.8"/>',
  'shuffle' =>
    '<path d="M6 15h7c5 0 7 2 10 7l3 4c3 5 5 7 10 7h6M37 28l5 5-5 5"/>'
        '<path d="M6 33h7c3 0 5-1 7-3M28 18c2-2 4-3 8-3h6M37 10l5 5-5 5"/>',
  'favor' =>
    '<rect x="9" y="20" width="30" height="20" rx="2"/>'
        '<path d="M7 14h34v6H7zM24 14v26"/>'
        '<path d="M24 14c-3-6-10-8-11-4-1 3 5 4 11 4zM24 14c3-6 10-8 11-4 1 3-5 4-11 4z"/>',
  'nope' =>
    '<circle cx="24" cy="24" r="17" stroke-width="4"/>'
        '<path d="M12 12l24 24" stroke-width="4"/>',
  'sarman' =>
    '<path d="$_head"/>'
        '<path d="M20 14.5l1.5 4M24 14v4.5M28 14.5l-1.5 4M14 22l3 1M34 22l-3 1" stroke-width="1.8"/>'
        '<circle cx="19" cy="26" r="1.8" fill="currentColor" stroke="none"/>'
        '<circle cx="29" cy="26" r="1.8" fill="currentColor" stroke="none"/>'
        '<path d="M22.5 30.5h3l-1.5 1.6z" fill="currentColor" stroke-width="1.2"/>'
        '$_whiskers',
  'tekir' =>
    '<path d="$_head"/>'
        '<path d="M19 19l2.5-3 2.5 3 2.5-3 2.5 3" stroke-width="1.8"/>'
        '<circle cx="19" cy="26" r="3"/>'
        '<circle cx="29" cy="26" r="3"/>'
        '<path d="M22 26h4" stroke-width="1.6"/>'
        '<path d="M22.5 31h3l-1.5 1.6z" fill="currentColor" stroke-width="1.2"/>'
        '$_whiskers',
  'pamuk' =>
    '<path d="M11 21L12 7l9 8.5q3-.8 6 0L36 7l1 14c2 3 1 6-1 7 1 3-1 6-4 6-2 3-6 4-8 3-2 1-6 0-8-3-3 0-5-3-4-6-2-1-3-4-1-7z"/>'
        '<path d="M16.5 26q2.5 2 5 0M26.5 26q2.5 2 5 0" stroke-width="1.8"/>'
        '<path d="M22.5 30.5h3l-1.5 1.6z" fill="currentColor" stroke-width="1.2"/>'
        '<circle cx="15" cy="30" r="1.6" fill="currentColor" stroke="none" opacity=".45"/>'
        '<circle cx="33" cy="30" r="1.6" fill="currentColor" stroke="none" opacity=".45"/>',
  'kara' =>
    '<path d="$_head" fill="currentColor"/>'
        '<ellipse cx="19" cy="25.5" rx="2.6" ry="3.2" fill="$eye" stroke="none"/>'
        '<ellipse cx="29" cy="25.5" rx="2.6" ry="3.2" fill="$eye" stroke="none"/>'
        '<path d="M19 23.5v4M29 23.5v4" stroke="$ink" stroke-width="1.2"/>'
        '$_whiskers',
  'benek' =>
    '<path d="$_head"/>'
        '<circle cx="17" cy="18" r="2.3" fill="currentColor" stroke="none"/>'
        '<circle cx="31.5" cy="31" r="3" fill="currentColor" stroke="none"/>'
        '<circle cx="27.5" cy="16.5" r="1.5" fill="currentColor" stroke="none"/>'
        '<circle cx="19" cy="26" r="1.8" fill="currentColor" stroke="none"/>'
        '<circle cx="29" cy="25" r="1.8" fill="currentColor" stroke="none"/>'
        '<path d="M20 31.5q4 2.5 8 0" stroke-width="1.8"/>'
        '<path d="M6 28l8 .5M6 32.5l8-1"/>',
  _ => '',
};

final Map<String, String> _glyphCache = {};

String ktGlyphSvg(String kind, {Color? ink}) {
  final inkHex = ink == null ? 'currentColor' : _hex(ink);
  return _glyphCache.putIfAbsent(
    '$kind:$inkHex',
    () =>
        '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.6" '
        'stroke-linecap="round" stroke-linejoin="round">${_glyphBody(kind, inkHex, _hex(C.yellow))}</svg>',
  );
}

/// `Glyph`: kart türünün simgesi. [ink]: kart içindeyken kart rengi (`--kt-ink`).
class KtGlyph extends StatelessWidget {
  const KtGlyph({super.key, required this.kind, this.size = 40, this.color = C.ink2, this.ink});
  final String kind;
  final double size;
  final Color color;
  final Color? ink;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(child: SSvg(ktGlyphSvg(kind, ink: ink), width: size, height: size, color: color));
}

/// Bomba simgesi (tasarımdaki deste ve patlama kartı).
class KtBombIcon extends StatelessWidget {
  const KtBombIcon({super.key, this.size = 54, this.sparks = false, this.color = C.ink2});
  final double size;
  final bool sparks;
  final Color color;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SSvg(
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="${sparks ? 2 : 2.2}" '
      'stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="7"/><path d="M14.5 9.5L17 7"/><path d="M17 7c1-2 3-2 4-3"/>'
      '${sparks ? '<path d="M20 2l1 1M22 6h-1"/>' : ''}</svg>',
      width: size,
      height: size,
      color: color,
    ),
  );
}

enum KtSize { hand, pile, mini, big }

/// Kart yüzü. `size`: el/ıskarta seçimi (hand), ıskarta yığını (pile), küçük (mini), büyük (big).
class KtCardFace extends StatelessWidget {
  const KtCardFace({super.key, required this.kind, this.size = KtSize.hand});
  final String kind;
  final KtSize size;

  @override
  Widget build(BuildContext context) {
    final c = ktColor(kind);
    final mini = size == KtSize.mini;
    final (w, h) = switch (size) {
      KtSize.hand => (84.0, 116.0),
      KtSize.pile => (92.0, 130.0),
      KtSize.mini => (26.0, 34.0),
      KtSize.big => (100.0, 140.0),
    };
    final glyph = switch (size) {
      KtSize.mini => 16.0,
      KtSize.big => 54.0,
      _ => 34.0,
    };
    return Semantics(
      label: cardName[kind],
      child: Container(
        width: w,
        height: h,
        padding: EdgeInsets.all(mini ? 0 : 6),
        decoration: BoxDecoration(
          color: c,
          border: Border.all(color: C.ink, width: mini ? 2 : bw),
          borderRadius: BorderRadius.circular(mini ? 7 : 14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            KtGlyph(kind: kind, size: glyph, ink: c),
            if (!mini) ...[
              const SizedBox(height: 4),
              Flexible(
                child: ExcludeSemantics(
                  child: Text(
                    cardName[kind] ?? kind,
                    style: T.d(size == KtSize.hand ? 14 : 16, color: C.ink2, height: 1.05),
                    textAlign: TextAlign.center,
                    textScaler: TextScaler.noScaling,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Kartın arkası (deste): turuncu, bomba simgeli.
class KtCardBack extends StatelessWidget {
  const KtCardBack({super.key, this.small = false, this.shadow});
  final bool small;

  /// `.kt-stack[data-count]` gölgeleri.
  final List<BoxShadow>? shadow;

  @override
  Widget build(BuildContext context) => Container(
    width: small ? 30 : 100,
    height: small ? 42 : 140,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: C.coral,
      border: Border.all(color: C.ink, width: small ? 2 : bw),
      borderRadius: BorderRadius.circular(small ? 8 : 16),
      boxShadow: shadow,
    ),
    child: KtBombIcon(size: small ? 20 : 54),
  );
}
