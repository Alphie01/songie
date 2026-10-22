import 'package:flutter/widgets.dart';
import 'package:songie_core/ui/tokens.dart';

/// CasebookHome.dc.html'deki sabit renkler.
abstract final class K {
  static const bg = Color(0xFF14102A);
  static const panel = Color(0xFF221A4D);
  static const black = Color(0xFF000000);
  static const paper = Color(0xFFF3E6C4);
  static const paperSolved = Color(0xFFE4D6AE);
  static const brown = Color(0xFF2B2116);
  static const barOff = Color(0xFFD8C79C);
  static const ink = Color(0xFF120C2E);
  static const sky = Color(0xFF5AB8FF);
  static const skyText = Color(0xFF9ED4FF);
  static const yellow = Color(0xFFFFD23F);
  static const mint = Color(0xFF3EE0A8);
  static const pink = Color(0xFFFF7AC6);
  static const lilac = Color(0xFFB794FF);
  static const red = Color(0xFFFF6B6B);
  static const stampRed = Color(0xFFC0392B);
  static const stampGreen = Color(0xFF1E7A5A);
  static const hint = Color(0xFFC9BEF5);
  static const footer = Color(0xFF8A80B8);
  static const lockedBg = Color(0xFF2E2560);
  static const lockedLine = Color(0xFF6E5FC4);
  static const white = Color(0xFFFFFFFF);
}

/// Yazılar. `height` verilmezse CSS `line-height: normal` (fontun kendi ölçüsü).
abstract final class KT {
  static const courier = 'CourierPrime';

  /// Courier Prime 700.
  static TextStyle mono(double size, {Color? color, double? letterSpacing, double? height}) => TextStyle(
    fontFamily: courier,
    fontSize: size,
    fontWeight: FontWeight.w700,
    color: color,
    letterSpacing: letterSpacing,
    height: height,
    leadingDistribution: height == null ? null : TextLeadingDistribution.even,
  );

  /// Baloo 2 800.
  static TextStyle display(double size, {Color? color, double height = 1, double? letterSpacing}) => T.d(size, color: color, height: height, letterSpacing: letterSpacing);

  /// Nunito (satır yüksekliği normal).
  static TextStyle body(double size, {Color? color, FontWeight weight = FontWeight.w800, double? height}) => TextStyle(
    fontFamily: T.font,
    fontSize: size,
    fontWeight: weight,
    color: color,
    height: height,
    leadingDistribution: height == null ? null : TextLeadingDistribution.even,
  );
}

const _black = BorderSide(color: K.black, width: bw);

/// `border: 3px solid #000`.
Border blackBorder([double width = bw]) => Border.all(color: K.black, width: width);

/// Dosya sekmesi: alt kenarı açık (`border-bottom: 0`).
const tabBorder = Border(top: _black, left: _black, right: _black);

/// İkonlar (tasarımdaki inline SVG'ler, 24'lük kutu).
abstract final class KIcons {
  static String _svg(String body, double stroke) =>
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="$stroke" stroke-linecap="round" stroke-linejoin="round">$body</svg>';

  static final menu = _svg('<path d="M4 7h16M4 12h16M4 17h10"/>', 3);
  static final search = _svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>', 2.8);
  static final arrow = _svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 3);
  static final team = _svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M19 8v6M16 11h6"/>', 2.6);
  static final solo = _svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>', 2.6);
  static final check = _svg('<path d="M5 12l5 5L20 7"/>', 3);
}
