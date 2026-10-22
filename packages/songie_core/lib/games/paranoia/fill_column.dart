part of 'play_view.dart';

/// CSS `display: flex; flex-direction: column; gap; min-height` (+ `flex: 1` çocuklar, `justify-content`).
/// İçerik en az [minHeight] (ya da üstten gelen en küçük yükseklik) boyundadır; artan yer [_Grow] ile
/// işaretli çocuklara dağılır, işaretli çocuk yoksa içerik [main] hizasına göre kayar.
/// `IntrinsicHeight` + `Spacer` kalıbından farkı: çocuklar gerçek genişlikleriyle bir kez ölçülür
/// (`max-width`'li yazılar ve `LayoutBuilder` da doğru ölçülür).
class _FillColumn extends MultiChildRenderObjectWidget {
  const _FillColumn({this.minHeight = 0, this.gap = 0, this.cross = CrossAxisAlignment.stretch, this.main = MainAxisAlignment.start, required super.children});
  final double minHeight;
  final double gap;
  final CrossAxisAlignment cross;
  final MainAxisAlignment main;

  @override
  _RenderFillColumn createRenderObject(BuildContext context) => _RenderFillColumn(minHeight: minHeight, gap: gap, cross: cross, main: main);

  @override
  void updateRenderObject(BuildContext context, _RenderFillColumn renderObject) {
    renderObject
      ..minHeight = minHeight
      ..gap = gap
      ..cross = cross
      ..main = main;
  }
}

/// CSS `flex: 1`: [_FillColumn] içinde artan yeri alır (önce kendi boyuyla ölçülür).
class _Grow extends ParentDataWidget<_FillParentData> {
  const _Grow({super.child = const SizedBox.shrink()});

  @override
  void applyParentData(RenderObject renderObject) {
    final data = renderObject.parentData! as _FillParentData;
    if (!data.grow) {
      data.grow = true;
      renderObject.parent?.markNeedsLayout();
    }
  }

  @override
  Type get debugTypicalAncestorWidgetClass => _FillColumn;
}

class _FillParentData extends ContainerBoxParentData<RenderBox> {
  bool grow = false;
}

class _RenderFillColumn extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _FillParentData>, RenderBoxContainerDefaultsMixin<RenderBox, _FillParentData> {
  _RenderFillColumn({required double minHeight, required double gap, required CrossAxisAlignment cross, required MainAxisAlignment main})
    : _minHeight = minHeight,
      _gap = gap,
      _cross = cross,
      _main = main;

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

  CrossAxisAlignment _cross;
  set cross(CrossAxisAlignment v) {
    if (v == _cross) return;
    _cross = v;
    markNeedsLayout();
  }

  MainAxisAlignment _main;
  set main(MainAxisAlignment v) {
    if (v == _main) return;
    _main = v;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _FillParentData) child.parentData = _FillParentData();
  }

  BoxConstraints _childConstraints(double width) =>
      _cross == CrossAxisAlignment.stretch ? BoxConstraints.tightFor(width: width) : BoxConstraints(maxWidth: width);

  double _gaps() => childCount > 1 ? _gap * (childCount - 1) : 0;

  @override
  void performLayout() {
    final width = constraints.maxWidth;
    final base = _childConstraints(width);
    var total = _gaps();
    var grow = 0;
    for (var child = firstChild; child != null; child = childAfter(child)) {
      child.layout(base, parentUsesSize: true);
      total += child.size.height;
      if ((child.parentData! as _FillParentData).grow) grow++;
    }
    final target = math.max(total, math.max(_minHeight, constraints.minHeight));
    var extra = target - total;
    if (extra > 0 && grow > 0) {
      final share = extra / grow;
      for (var child = firstChild; child != null; child = childAfter(child)) {
        if (!(child.parentData! as _FillParentData).grow) continue;
        final h = child.size.height + share;
        child.layout(base.copyWith(minHeight: h, maxHeight: h), parentUsesSize: true);
      }
      extra = 0;
    }
    var y = switch (_main) {
      MainAxisAlignment.center => extra / 2,
      MainAxisAlignment.end => extra,
      _ => 0.0,
    };
    for (var child = firstChild; child != null; child = childAfter(child)) {
      final x = switch (_cross) {
        CrossAxisAlignment.center => (width - child.size.width) / 2,
        CrossAxisAlignment.end => width - child.size.width,
        _ => 0.0,
      };
      (child.parentData! as _FillParentData).offset = Offset(x, y);
      y += child.size.height + _gap;
    }
    size = constraints.constrain(Size(width, target));
  }

  double _height(double width, double Function(RenderBox child, double width) measure) {
    var total = _gaps();
    for (var child = firstChild; child != null; child = childAfter(child)) {
      total += measure(child, width);
    }
    return math.max(total, _minHeight);
  }

  double _width(double Function(RenderBox child) measure) {
    var w = 0.0;
    for (var child = firstChild; child != null; child = childAfter(child)) {
      w = math.max(w, measure(child));
    }
    return w;
  }

  @override
  double computeMinIntrinsicHeight(double width) => _height(width, (c, w) => c.getMinIntrinsicHeight(w));

  @override
  double computeMaxIntrinsicHeight(double width) => _height(width, (c, w) => c.getMaxIntrinsicHeight(w));

  @override
  double computeMinIntrinsicWidth(double height) => _width((c) => c.getMinIntrinsicWidth(double.infinity));

  @override
  double computeMaxIntrinsicWidth(double height) => _width((c) => c.getMaxIntrinsicWidth(double.infinity));

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final width = constraints.maxWidth;
    final base = _childConstraints(width);
    var total = _gaps();
    for (var child = firstChild; child != null; child = childAfter(child)) {
      total += child.getDryLayout(base).height;
    }
    return constraints.constrain(Size(width, math.max(total, math.max(_minHeight, constraints.minHeight))));
  }

  @override
  double? computeDistanceToActualBaseline(TextBaseline baseline) => defaultComputeDistanceToFirstActualBaseline(baseline);

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);
}
