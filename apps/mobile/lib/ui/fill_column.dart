import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// CSS'teki `min-height: 100dvh` + esnek boşluk (`flex: 1` spacer) düzeni:
/// [top] üstte durur, [bottom] en az [minHeight] boyundaki alanın dibine yaslanır.
/// İçerik uzunsa ikisi [gap] aralıkla art arda dizilir (sayfa kayar).
/// `IntrinsicHeight`/`SliverFillRemaining` gibi içsel boyut sorgusu yapmaz; içinde `ListView` gibi
/// içsel boyut veremeyen öğeler güvenle durabilir.
class FillColumn extends MultiChildRenderObjectWidget {
  FillColumn({super.key, required Widget top, required Widget bottom, required this.minHeight, this.gap = 0}) : super(children: [top, bottom]);

  final double minHeight;

  /// Üst ve alt arasındaki en küçük boşluk (CSS gap'in esnek boşluğun iki yanındaki toplamı).
  final double gap;

  @override
  RenderObject createRenderObject(BuildContext context) => RenderFillColumn(minHeight, gap);

  @override
  void updateRenderObject(BuildContext context, RenderFillColumn renderObject) {
    renderObject
      ..minHeight = minHeight
      ..gap = gap;
  }
}

class _FillParentData extends ContainerBoxParentData<RenderBox> {}

/// [FillColumn]'ın çizim nesnesi.
class RenderFillColumn extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _FillParentData>, RenderBoxContainerDefaultsMixin<RenderBox, _FillParentData> {
  RenderFillColumn(this._minHeight, this._gap);

  double _minHeight;
  set minHeight(double v) {
    if (v == _minHeight) return;
    _minHeight = v;
    markNeedsLayout();
  }

  double _gap;
  set gap(double v) {
    if (v == _gap) return;
    _gap = v;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _FillParentData) child.parentData = _FillParentData();
  }

  @override
  void performLayout() {
    final width = constraints.maxWidth;
    final inner = BoxConstraints.tightFor(width: width);
    final top = firstChild!;
    final bottom = childAfter(top)!;
    top.layout(inner, parentUsesSize: true);
    bottom.layout(inner, parentUsesSize: true);
    final natural = top.size.height + _gap + bottom.size.height;
    final height = math.max(natural, _minHeight);
    (top.parentData! as _FillParentData).offset = Offset.zero;
    (bottom.parentData! as _FillParentData).offset = Offset(0, height - bottom.size.height);
    size = constraints.constrain(Size(width, height));
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);
}
