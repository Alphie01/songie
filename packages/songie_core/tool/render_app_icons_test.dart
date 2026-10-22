// Dört uygulamanın ikonları, Android ön plan görselleri ve açılış görselleri.
// Hepsi aynı dilde: kalın mürekkep çerçeve, sert gölge, hafif eğik, uygulamanın renkleri.
// Çalıştır (packages/songie_core içinde): flutter test tool/render_app_icons_test.dart
//   → apps/<uygulama>/assets/icon/{icon,foreground,splash}.png
// Sonra her uygulamada: dart run flutter_launcher_icons && dart run flutter_native_splash:create
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

const _ink = '#0D0828';
const _purple = '#2A1B6E';
const _night = '#14102A';

/// Sert gölge: aynı şekil sağ alta kaydırılmış, mürekkep renginde.
String _shadow(String shapes) => '<g transform="translate(30 30)" fill="$_ink" stroke="$_ink">$shapes</g>';

/// Çizimi merkez etrafında döndürür.
String _rotate(double deg, String body) => '<g transform="translate(512 512) rotate($deg) translate(-512 -512)">$body</g>';

/// Songie: pembe kare, dolu başlı nota, sarı parıltı.
String get _songie {
  const tile = '<rect x="196" y="196" width="632" height="632" rx="150"/>';
  // Icon.tsx "note" yolu (24'lük kutu) 19 kat büyütülmüş, başlar dolu.
  const note =
      '<g transform="translate(284 268) scale(19)" stroke="$_ink" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
      '<path d="M9 18V5l12-2v13" fill="none"/><circle cx="6" cy="18" r="3" fill="$_ink"/><circle cx="18" cy="16" r="3" fill="$_ink"/></g>';
  const sparkle = '<path d="M800 150 Q812 222 884 234 Q812 246 800 318 Q788 246 716 234 Q788 222 800 150 Z" fill="#FFD23F" stroke="$_ink" stroke-width="20" stroke-linejoin="round"/>';
  return _rotate(-8, '${_shadow(tile)}<g fill="#FF7AC6" stroke="$_ink" stroke-width="38">$tile</g>$note') + sparkle;
}

/// İtiraf Köşesi: mercan konuşma balonu, içinde sarı kalp; arkada "…" yazan küçük nane balonu.
String get _itiraf {
  const small = '<path d="M640 150 H820 Q884 150 884 214 V268 Q884 332 820 332 H800 L828 392 L740 332 H640 Q576 332 576 268 V214 Q576 150 640 150 Z"/>';
  const dots = '<g fill="$_ink"><circle cx="668" cy="241" r="22"/><circle cx="730" cy="241" r="22"/><circle cx="792" cy="241" r="22"/></g>';
  const bubble = '<path d="M330 270 H690 Q810 270 810 390 V580 Q810 700 690 700 H470 L300 836 L338 700 H330 Q210 700 210 580 V390 Q210 270 330 270 Z"/>';
  const heart =
      '<path d="M510 610 C390 540 360 486 392 440 C424 394 486 404 510 452 C534 404 596 394 628 440 C660 486 630 540 510 610 Z" fill="#FFD23F" stroke="$_ink" stroke-width="30" stroke-linejoin="round"/>';
  return _rotate(
    -6,
    '${_shadow(small)}<g fill="#3EE0A8" stroke="$_ink" stroke-width="30" stroke-linejoin="round">$small</g>$dots'
    '${_shadow(bubble)}<g fill="#FF6B6B" stroke="$_ink" stroke-width="38" stroke-linejoin="round">$bubble</g>$heart',
  );
}

/// Casebook: kâğıt dosya klasörü, kırmızı damga, büyüteç.
String get _casebook {
  const back = '<path d="M214 286 H426 Q446 286 460 300 L500 340 H806 Q836 340 836 370 V770 Q836 800 806 800 H214 Q184 800 184 770 V316 Q184 286 214 286 Z"/>';
  const front = '<path d="M184 420 H836 V770 Q836 800 806 800 H214 Q184 800 184 770 Z"/>';
  const stamp =
      '<g transform="translate(330 560) rotate(-9)" fill="none" stroke="#C0392B" stroke-width="18" stroke-linecap="round">'
      '<rect x="-110" y="-56" width="220" height="112" rx="14"/><path d="M-70 -16 H70 M-70 22 H30"/></g>';
  const lens = '<circle cx="640" cy="590" r="150"/>';
  const handle = '<path d="M748 698 L872 822" stroke="$_ink" stroke-width="78" stroke-linecap="round"/>';
  const shine = '<path d="M560 540 Q580 492 630 478" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round"/>';
  return _rotate(
    -5,
    '${_shadow(back)}<g fill="#F3E6C4" stroke="$_ink" stroke-width="34" stroke-linejoin="round">$back</g>'
    '<g fill="#E4D6AE" stroke="$_ink" stroke-width="34" stroke-linejoin="round">$front</g>$stamp'
    '${_shadow('$lens$handle')}$handle<g fill="#9ED4FF" stroke="$_ink" stroke-width="40">$lens</g>$shine',
  );
}

/// We Knows: lila maske, göz deliklerinden yana bakan sarı gözler ("biliyoruz").
String get _weknows {
  const mask =
      '<path d="M168 384 C296 300 420 318 512 372 C604 318 728 300 856 384 L856 470 C856 616 760 706 656 706 C588 706 548 656 512 604 C476 656 436 706 368 706 C264 706 168 616 168 470 Z"/>';
  const holes = '<g fill="$_ink"><ellipse cx="362" cy="486" rx="92" ry="60"/><ellipse cx="662" cy="486" rx="92" ry="60"/></g>';
  const eyes = '<g fill="#FFD23F"><circle cx="392" cy="494" r="34"/><circle cx="692" cy="494" r="34"/></g>';
  const sparkle = '<path d="M820 166 Q830 226 890 236 Q830 246 820 306 Q810 246 750 236 Q810 226 820 166 Z" fill="#FFD23F" stroke="$_ink" stroke-width="20" stroke-linejoin="round"/>';
  return _rotate(-7, '${_shadow(mask)}<g fill="#B794FF" stroke="$_ink" stroke-width="38" stroke-linejoin="round">$mask</g>$holes$eyes') + sparkle;
}

String _svg(String body, {String? background}) =>
    '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">'
    '${background != null ? '<rect width="1024" height="1024" fill="$background"/>' : ''}$body</svg>';

/// Android uyarlanabilir ikonun güvenli alanı (çapı ≈%66'lık daire) için küçültülmüş çizim.
String _scaled(String art, double k) => '<g transform="translate(512 512) scale($k) translate(-512 -512)">$art</g>';

Future<void> _write(String svg, String path, int size) async {
  final info = await vg.loadPicture(SvgStringLoader(svg), null);
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder)..scale(size / 1024);
  canvas.drawPicture(info.picture);
  final image = await recorder.endRecording().toImage(size, size);
  final png = await image.toByteData(format: ui.ImageByteFormat.png);
  File(path)
    ..createSync(recursive: true)
    ..writeAsBytesSync(png!.buffer.asUint8List());
}

void main() {
  final apps = <String, (String, String)>{
    'songie': (_songie, _purple),
    'itiraf_kosesi': (_itiraf, _purple),
    'casebook': (_casebook, _night),
    'weknows': (_weknows, _purple),
  };

  testWidgets('uygulama ikonlarını çiz', (tester) async {
    await tester.runAsync(() async {
      for (final MapEntry(key: app, value: (art, bg)) in apps.entries) {
        final dir = '../../apps/$app/assets/icon';
        await _write(_svg(art, background: bg), '$dir/icon.png', 1024);
        await _write(_svg(_scaled(art, 0.64)), '$dir/foreground.png', 1024);
        await _write(_svg(_scaled(art, 0.9)), '$dir/splash.png', 512);
        // Karşılaştırma için küçük önizleme (mağaza/ana ekran boyutuna yakın).
        await _write(_svg(art, background: bg), 'build/icons/$app.png', 256);
      }
    });
    for (final app in apps.keys) {
      expect(File('../../apps/$app/assets/icon/icon.png').existsSync(), isTrue);
    }
  });
}
