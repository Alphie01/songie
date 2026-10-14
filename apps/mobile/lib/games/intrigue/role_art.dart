// games/intrigue/client/RoleArt.tsx
import 'package:flutter/material.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import 'strings.dart';

/// `[data-role]` → `--role` (intrigue.css).
Color roleColor(String role) => switch (role) {
  'treasurer' => C.yellow,
  'assassin' => C.red,
  'guard' => C.sky,
  'pirate' => C.coral,
  'spy' => C.mint,
  _ => C.paper,
};

/// Rol simgeleri (24×24, kalın çizgi; Entrika tasarımındaki çizim dili).
const _glyph = <String, String>{
  // Hazinedar: sikke
  'treasurer': '<circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />',
  // Fedai: hançer
  'assassin': '<path d="M14 4l6 6-9 9H5v-6z" /><path d="M4 20l3-3" />',
  // Muhafız: kalkan
  'guard': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />',
  // Korsan: kanca
  'pirate': '<path d="M10 3h6" /><path d="M13 3v10a5 5 0 1 1-9-3" /><path d="M4 10l-1 3h3" />',
  // Casus: göz
  'spy': '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" />',
};

final _glyphCache = <String, String>{};

String _glyphSvg(String role) => _glyphCache.putIfAbsent(
  role,
  () =>
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.4" '
      'stroke-linecap="round" stroke-linejoin="round">${_glyph[role] ?? _glyph['treasurer']}</svg>',
);

/// `Glyph`: rol simgesi, rengi çevreden (currentColor).
class Glyph extends StatelessWidget {
  const Glyph({super.key, required this.role, this.size = 32, this.color});
  final String role;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) => SSvg(_glyphSvg(role), width: size, height: size, color: color);
}

/// `Coin`: altın simgesi (oyun ekranında şu an kullanılmıyor, web'deki gibi hazır).
class Coin extends StatelessWidget {
  const Coin({super.key, this.size = 14});
  final double size;

  static const _svg =
      '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7" fill="currentColor" />'
      '<circle cx="8" cy="8" r="4.2" fill="none" stroke="#120C2E" stroke-width="1.3" /></svg>';

  @override
  Widget build(BuildContext context) => SSvg(_svg, width: size, height: size, color: C.yellow);
}

enum CardSize { mini, normal, big }

/// Rol kartı yüzü. `mini` (rakip kartında küçük kart), `normal` (el, seçim), `big`.
class RoleCard extends StatelessWidget {
  const RoleCard({super.key, required this.role, this.size = CardSize.normal, this.dead = false, this.tag, this.outlined = false});
  final String role;
  final CardSize size;
  final bool dead;
  final String? tag;

  /// Lobi ayarlarındaki deste bilgisi: 2px çerçeve, tam opak (`.ig-deckinfo-role .ig-card[data-size='mini']`).
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    if (size == CardSize.mini) {
      return Semantics(
        label: roleName[role],
        child: Opacity(
          opacity: outlined ? 1 : 0.6,
          child: Container(
            width: 16,
            height: 22,
            decoration: BoxDecoration(
              color: roleColor(role),
              border: outlined ? Border.all(color: C.ink, width: 2) : null,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      );
    }
    final card = Container(
      decoration: BoxDecoration(
        color: roleColor(role),
        border: Border.all(color: C.ink, width: 3),
        borderRadius: BorderRadius.circular(18),
        boxShadow: hardShadow(4, 4),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        fit: StackFit.passthrough,
        children: [
          // min-height 118 (çerçeve dahil), padding 12, içerik ortada.
          Container(
            constraints: const BoxConstraints(minHeight: 118 - 6),
            padding: const EdgeInsets.all(12),
            alignment: Alignment.center,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Glyph(role: role, size: size == CardSize.big ? 60 : 38, color: C.ink2),
                const SizedBox(height: 6),
                Text(roleName[role] ?? role, style: T.d(22, color: C.ink2), textAlign: TextAlign.center),
              ],
            ),
          ),
          if (tag != null)
            Positioned(
              top: -10,
              right: -8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                child: Text(tag!, style: T.b(11, color: C.ink2, weight: FontWeight.w800)),
              ),
            ),
        ],
      ),
    );
    return Semantics(label: roleName[role], child: Opacity(opacity: dead ? 0.5 : 1, child: card));
  }
}

/// `CardBack`: kapalı kart (koyu). Sıradaki rakipte çerçevesiz.
class CardBack extends StatelessWidget {
  const CardBack({super.key, this.bordered = true});
  final bool bordered;

  @override
  Widget build(BuildContext context) => Container(
    width: 16,
    height: 22,
    decoration: BoxDecoration(
      color: C.ink2,
      border: bordered ? Border.all(color: C.violet, width: 1) : null,
      borderRadius: BorderRadius.circular(4),
    ),
  );
}
