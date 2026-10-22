// Renk Renk'in kendi küçük yapı taşları (ortak kitte karşılığı olmayanlar).
import 'package:flutter/material.dart';

/// CSS `position: fixed; inset: 0` katmanı: içerik kaydırılan sütunun dışında, ekranın üstünde çizilir.
/// Ağaçta durduğu sürece görünür; ağaçtan çıkınca kaybolur.
class CcFixed extends StatefulWidget {
  const CcFixed({super.key, required this.child});
  final Widget child;

  @override
  State<CcFixed> createState() => _CcFixedState();
}

class _CcFixedState extends State<CcFixed> {
  final _portal = OverlayPortalController();

  @override
  void initState() {
    super.initState();
    // Bağlanmadan önce çağrılınca yalnızca sıra numarası alınır; bağlanınca gösterilir.
    _portal.show();
  }

  @override
  Widget build(BuildContext context) =>
      OverlayPortal(controller: _portal, overlayChildBuilder: (_) => widget.child, child: const SizedBox.shrink());
}

/// `overflow-x: clip` (dikeyde taşma serbest).
class CcHClip extends CustomClipper<Rect> {
  const CcHClip();

  @override
  Rect getClip(Size size) => Rect.fromLTRB(0, -1000, size.width, size.height + 1000);

  @override
  bool shouldReclip(CcHClip oldClipper) => false;
}

/// `filter: saturate(0.45) brightness(0.85)`.
const ccDimFilter = ColorFilter.matrix(<double>[
  0.4820775, 0.3342625, 0.03366, 0, 0, //
  0.0995775, 0.7167625, 0.03366, 0, 0, //
  0.0995775, 0.3342625, 0.41616, 0, 0, //
  0, 0, 0, 1, 0, //
]);

/// Hareket azaltma açıksa animasyon süresi sıfır (`prefers-reduced-motion`).
Duration ccMotion(BuildContext context, Duration d) => MediaQuery.disableAnimationsOf(context) ? Duration.zero : d;

/// Ekranın güvenli alan boşlukları. Oyun ekranı `SafeArea` içinde olduğundan yerel `MediaQuery`'de
/// üst boşluk sıfırdır; ekranı kaplayan katmanlar asıl değeri pencereden okur.
EdgeInsets ccScreenPadding(BuildContext context) => MediaQueryData.fromView(View.of(context)).padding;
