// Bomba Kedi'nin kendi küçük yapı taşları (ortak kitte karşılığı olmayanlar).
import 'package:flutter/material.dart';

/// CSS `position: fixed` katmanı: içerik kaydırılan sütunun dışında, ekranın üstünde çizilir.
/// Ağaçta durduğu sürece görünür; ağaçtan çıkınca kaybolur.
class KtFixed extends StatefulWidget {
  const KtFixed({super.key, required this.child});
  final Widget child;

  @override
  State<KtFixed> createState() => _KtFixedState();
}

class _KtFixedState extends State<KtFixed> {
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

/// Hareket azaltma açıksa animasyon süresi sıfır (`prefers-reduced-motion`).
Duration ktMotion(BuildContext context, Duration d) => MediaQuery.disableAnimationsOf(context) ? Duration.zero : d;

/// Ekranın güvenli alan boşlukları. Oyun ekranı `SafeArea` içinde olduğundan yerel `MediaQuery`'de
/// üst boşluk sıfırdır; ekranı kaplayan katmanlar asıl değeri pencereden okur.
EdgeInsets ktScreenPadding(BuildContext context) => MediaQueryData.fromView(View.of(context)).padding;
