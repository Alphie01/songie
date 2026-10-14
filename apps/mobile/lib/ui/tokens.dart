import 'package:flutter/material.dart';

/// Tasarım token'ları: apps/web/src/styles/tokens.css ile birebir ("Songie Arayüz" tasarımı).
/// Mor zemin, kalın mürekkep çerçeveli renkli kartlar, sert gölge; Baloo 2 (başlık) + Nunito (metin).
abstract final class C {
  // Zemin ve yüzeyler
  static const bg = Color(0xFF2A1B6E);
  static const bgDeep = Color(0xFF150E38);
  static const panel = Color(0xFF3A2A8C);
  static const panel2 = Color(0xFF1F145A);
  static const panel3 = Color(0xFF4A389E);
  static const paper = Color(0xFFFFFFFF);
  static const paper2 = Color(0xFFF1ECFF);
  static const paper3 = Color(0xFFD9D0F5);

  // Mürekkep
  static const ink = Color(0xFF0D0828);
  static const ink2 = Color(0xFF120C2E);
  static const inkSoft = Color(0xFF4A4170);
  static const line = ink;
  static const line2 = Color(0xFF6E5FC4);

  static const text = Color(0xFFFFFFFF);
  static const text2 = Color(0xFFE4DCFF);
  static const text3 = Color(0xFFC9BEF5);

  // Renkler
  static const mint = Color(0xFF3EE0A8);
  static const yellow = Color(0xFFFFD23F);
  static const pink = Color(0xFFFF7AC6);
  static const sky = Color(0xFF5AB8FF);
  static const lilac = Color(0xFFB794FF);
  static const coral = Color(0xFFFF8A5B);
  static const red = Color(0xFFFF6B6B);
  static const orange = coral;
  static const purple = lilac;
  static const violet = Color(0xFF6E5FC4);
  static const cream = Color(0xFFFFF4C2);

  // Eski adlar (oyunlar kullanıyor)
  static const accent = mint;
  static const accentHi = Color(0xFF6FF0C2);
  static const accentInk = ink2;
  static const accentSoft = Color(0x293EE0A8); // rgb(62 224 168 / 0.16)
  static const accentSoft2 = Color(0x473EE0A8); // 0.28

  // Token dışında sabit yazılmış renkler (web CSS'inden)
  static const placeholder = Color(0xFF8B82B0);
  static const errorOnDark = Color(0xFFFFB3B3);
  static const errorOnPaper = Color(0xFFC2185B);
  static const errorOnYellow = Color(0xFFA1123A);
  static const lavenderText = Color(0xFFD6CFF5);
  static const codePlaceholder = Color(0xFFB9B0D8);
  static const scrim = Color(0x990D0828); // rgb(13 8 40 / 0.6)
  static const dialogScrim = Color(0xEB150E38); // rgb(21 14 56 / 0.92)
}

/// Çerçeve kalınlığı (--bw).
const double bw = 3;

abstract final class R {
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 22.0;
  static const xl = 28.0;
  static const pill = 999.0;
}

/// Sert gölge: bulanıklık yok (`4px 4px 0 var(--ink)`).
List<BoxShadow> hardShadow(double x, double y, [Color color = C.ink]) => [BoxShadow(color: color, offset: Offset(x, y))];

abstract final class Shadows {
  static final sm = hardShadow(3, 3);
  static final md = hardShadow(4, 4);
  static final lg = hardShadow(6, 6);
  static final btn = hardShadow(0, 6);
}

/// Yerleşim: gutter 18 (720px'ten itibaren 24), orta sütun 440.
abstract final class Layout {
  static const col = 440.0;
  static double gutter(BuildContext context) => MediaQuery.sizeOf(context).width >= 720 ? 24 : 18;
}

/// Kategori renkleri (`[data-cat]`).
Color catColor(String? cat) => switch (cat) {
  'takim' => C.yellow,
  'parti' => C.mint,
  'gizli' => C.lilac,
  'kart' => C.coral,
  'muzik' => C.pink,
  'dedektif' => C.sky,
  _ => C.paper,
};

/// Yazı stilleri. CSS'teki gibi satır aralığı eşit dağılır (half-leading).
abstract final class T {
  static const display = 'Baloo2';
  static const font = 'Nunito';

  /// Baloo 2 başlık (`.display`: 800, line-height 1).
  static TextStyle d(double size, {Color? color, FontWeight weight = FontWeight.w800, double height = 1, double? letterSpacing}) => TextStyle(
    fontFamily: display,
    fontSize: size,
    fontWeight: weight,
    height: height,
    color: color,
    letterSpacing: letterSpacing,
    leadingDistribution: TextLeadingDistribution.even,
  );

  /// Nunito metin (gövde: 600, line-height 1.45).
  static TextStyle b(double size, {Color? color, FontWeight weight = FontWeight.w600, double height = 1.45, double? letterSpacing}) => TextStyle(
    fontFamily: font,
    fontSize: size,
    fontWeight: weight,
    height: height,
    color: color,
    letterSpacing: letterSpacing,
    leadingDistribution: TextLeadingDistribution.even,
  );

  /// `.eyebrow`: 12px, 800, 0.14em aralık, büyük harf.
  static TextStyle eyebrow({Color color = C.text3}) => b(12, weight: FontWeight.w800, color: color, letterSpacing: 12 * 0.14);
}

/// Uygulamanın temel teması.
ThemeData songieTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: C.bg,
    fontFamily: T.font,
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
    splashColor: Colors.transparent,
    colorScheme: const ColorScheme.dark(primary: C.mint, secondary: C.yellow, surface: C.bg, onSurface: C.text, error: C.red),
    textSelectionTheme: const TextSelectionThemeData(cursorColor: C.ink2, selectionColor: Color(0x556E5FC4), selectionHandleColor: C.violet),
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(fontFamily: T.font, bodyColor: C.text, displayColor: C.text),
  );
}
