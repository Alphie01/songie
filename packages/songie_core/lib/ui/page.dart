import 'package:flutter/material.dart';

import 'fill_column.dart';
import 'tokens.dart';

/// `.col`: ortada en fazla 440 + 2×gutter genişlikte sütun.
class Col extends StatelessWidget {
  const Col({super.key, required this.child, this.padTop = 0, this.padBottom = 0});
  final Widget child;
  final double padTop;
  final double padBottom;

  @override
  Widget build(BuildContext context) {
    final g = Layout.gutter(context);
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: Layout.col + 2 * g),
        child: Padding(padding: EdgeInsets.fromLTRB(g, padTop, g, padBottom), child: child),
      ),
    );
  }
}

/// Kaydırılan sayfa. `fill` true ise içerik en az ekran yüksekliğinde olur (`min-height: 100dvh`),
/// böylece içindeki `Spacer` alt butonları ekranın dibine iter.
class SPage extends StatelessWidget {
  const SPage({super.key, required this.child, this.padTop = 20, this.padBottom = 28, this.fill = false, this.controller, this.safeBottom = true});
  final Widget child;
  final double padTop;
  final double padBottom;
  final bool fill;
  final ScrollController? controller;
  final bool safeBottom;

  @override
  Widget build(BuildContext context) {
    final bottomInset = safeBottom ? MediaQuery.paddingOf(context).bottom : 0.0;
    final content = Col(padTop: padTop, padBottom: padBottom + bottomInset, child: child);
    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        controller: controller,
        slivers: [fill ? SliverFillRemaining(hasScrollBody: false, child: content) : SliverToBoxAdapter(child: content)],
      ),
    );
  }
}

/// Üstte içerik, altta ekranın dibine yaslanan düğmeler (CSS `min-height: 100dvh` + spacer).
/// İçsel boyut sorgusu yapmaz: alt/üst kısımda liste (`ListView`) gibi öğeler güvenle durur.
class SFillPage extends StatelessWidget {
  const SFillPage({super.key, required this.top, required this.bottom, this.gap = 0, this.padTop = 20, this.padBottom = 28});
  final Widget top;
  final Widget bottom;
  final double gap;
  final double padTop;
  final double padBottom;

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.paddingOf(context).bottom;
    return SafeArea(
      bottom: false,
      child: LayoutBuilder(
        builder: (context, viewport) => SingleChildScrollView(
          child: Col(
            padTop: padTop,
            padBottom: padBottom + inset,
            child: FillColumn(minHeight: viewport.maxHeight - padTop - padBottom - inset, gap: gap, top: top, bottom: bottom),
          ),
        ),
      ),
    );
  }
}
