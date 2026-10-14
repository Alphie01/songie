// Uygulama ikonu ve açılış görseli: logodaki sarı nota rozeti (tokens + Icon.tsx "note" yolu).
// Çalıştır: flutter test tool/render_icon_test.dart  → assets/icon/*.png
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

const _bg = Color(0xFF2A1B6E);
const _yellow = Color(0xFFFFD23F);
const _ink = Color(0xFF0D0828);
const _ink2 = Color(0xFF120C2E);
const _note =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#120C2E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>';

/// [badge]: rozetin kenarı (px). Rozet 36px'lik logodaki oranlarla çizilir.
Future<void> render(String path, {required double size, required double badge, required bool background}) async {
  final note = await vg.loadPicture(const SvgStringLoader(_note), null);
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  if (background) canvas.drawRect(Rect.fromLTWH(0, 0, size, size), Paint()..color = _bg);
  final k = badge / 36; // logo: 36px rozet, 3px çerçeve, 11px köşe, 3px gölge, 20px nota
  canvas.save();
  canvas.translate(size / 2 - 1.5 * k, size / 2 - 1.5 * k); // gölge dahil ortala
  canvas.rotate(-8 * math.pi / 180);
  final rect = Rect.fromCenter(center: Offset.zero, width: badge, height: badge);
  final rr = RRect.fromRectAndRadius(rect, Radius.circular(11 * k));
  canvas.drawRRect(rr.shift(Offset(3 * k, 3 * k)), Paint()..color = _ink);
  canvas.drawRRect(rr, Paint()..color = _yellow);
  canvas.drawRRect(rr.deflate(1.5 * k), Paint()
    ..color = _ink
    ..style = PaintingStyle.stroke
    ..strokeWidth = 3 * k);
  final icon = 20 * k;
  canvas.translate(-icon / 2, -icon / 2);
  canvas.scale(icon / 24);
  canvas.drawPicture(note.picture);
  canvas.restore();
  final image = await recorder.endRecording().toImage(size.toInt(), size.toInt());
  final png = await image.toByteData(format: ui.ImageByteFormat.png);
  File(path).writeAsBytesSync(png!.buffer.asUint8List());
}

void main() {
  testWidgets('ikonları çiz', (tester) async {
    await tester.runAsync(() async {
      await render('assets/icon/icon.png', size: 1024, badge: 560, background: true);
      // Android uyarlanabilir ikon: ön plan güvenli alanda (≈%66), zemin rengi ayrı.
      await render('assets/icon/foreground.png', size: 1024, badge: 400, background: false);
      await render('assets/icon/splash.png', size: 512, badge: 220, background: false);
    });
    expect(File('assets/icon/icon.png').existsSync(), isTrue);
    expect(_ink2, isNotNull);
  });
}
