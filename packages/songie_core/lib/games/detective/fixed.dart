// Oyun ekranı odanın kaydırılan sütununun içinde çizilir. Web'deki `position: fixed` (bölüm sahnesi,
// anlatıcı hapı, uyarı, masa zemini) ve `position: sticky; bottom: 0` (alt sekmeler) karşılıkları:
// katmanlar kaydırma konumunu dinleyip görünen alana göre çizilir; dokunma da aynı kaydırmayla iletilir.
// Odanın sağ üstteki düğmeleri (sohbet, ?) kaydırma alanının üstünde kalır (web'de .dt ayrı bir
// istif bağlamıdır, `isolation: isolate`).
import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

double _topInViewport(RenderObject self) {
  final vp = RenderAbstractViewport.maybeOf(self);
  if (vp == null) return 0;
  return MatrixUtils.transformPoint(self.getTransformTo(vp as RenderObject), Offset.zero).dy;
}

/// Çocuğunu görünen alan boyunda kurar ve görünen alanın tepesine yerleştirir (CSS `position: fixed; inset: 0`).
/// Kendisi bulunduğu kutuyu doldurur (`Positioned.fill` içinde kullanılır).
class ViewportLayer extends SingleChildRenderObjectWidget {
  const ViewportLayer({super.key, required this.position, required this.fallbackHeight, this.hitTestable = true, super.child});

  /// Dıştaki kaydırmanın konumu (`Scrollable.maybeOf(context)?.position`).
  final ScrollPosition? position;

  /// Kaydırma ölçülmeden önceki görünen yükseklik.
  final double fallbackHeight;
  final bool hitTestable;

  @override
  RenderObject createRenderObject(BuildContext context) => RenderViewportLayer(position, fallbackHeight, hitTestable);

  @override
  void updateRenderObject(BuildContext context, RenderViewportLayer renderObject) {
    renderObject
      ..position = position
      ..fallbackHeight = fallbackHeight
      ..hitTestable = hitTestable;
  }
}

class RenderViewportLayer extends RenderProxyBox {
  RenderViewportLayer(this._position, this._fallbackHeight, this.hitTestable);

  ScrollPosition? _position;
  double _fallbackHeight;
  bool hitTestable;
  double _dy = 0;
  double _usedHeight = 0;
  bool _relayoutQueued = false;

  set position(ScrollPosition? p) {
    if (p == _position) return;
    if (attached) _position?.removeListener(markNeedsPaint);
    _position = p;
    if (attached) p?.addListener(markNeedsPaint);
    markNeedsLayout();
  }

  set fallbackHeight(double v) {
    if (v == _fallbackHeight) return;
    _fallbackHeight = v;
    markNeedsLayout();
  }

  double get _viewportHeight {
    final p = _position;
    if (p != null && p.hasViewportDimension) return p.viewportDimension;
    return _fallbackHeight;
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _position?.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _position?.removeListener(markNeedsPaint);
    super.detach();
  }

  @override
  void performLayout() {
    size = constraints.constrain(Size(constraints.maxWidth.isFinite ? constraints.maxWidth : 0, constraints.maxHeight.isFinite ? constraints.maxHeight : 0));
    _usedHeight = _viewportHeight;
    child?.layout(BoxConstraints.tight(Size(size.width, _usedHeight)));
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    _dy = -_topInViewport(this);
    if (_viewportHeight != _usedHeight && !_relayoutQueued) {
      _relayoutQueued = true;
      SchedulerBinding.instance.addPostFrameCallback((_) {
        _relayoutQueued = false;
        if (attached) markNeedsLayout();
      });
    }
    final c = child;
    if (c != null) context.paintChild(c, offset + Offset(0, _dy));
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    final c = child;
    if (!hitTestable || c == null) return false;
    return result.addWithPaintOffset(offset: Offset(0, _dy), position: position, hitTest: (r, p) => c.hitTest(r, position: p));
  }

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) => transform.translateByDouble(0.0, _dy, 0.0, 1.0);
}

/// CSS `position: sticky; bottom: 0`: kutusu görünen alanın altından taşıyorsa yukarı kayarak dipte durur.
class StickyBottom extends SingleChildRenderObjectWidget {
  const StickyBottom({super.key, required this.position, super.child});
  final ScrollPosition? position;

  @override
  RenderObject createRenderObject(BuildContext context) => RenderStickyBottom(position);

  @override
  void updateRenderObject(BuildContext context, RenderStickyBottom renderObject) => renderObject.position = position;
}

class RenderStickyBottom extends RenderProxyBox {
  RenderStickyBottom(this._position);
  ScrollPosition? _position;
  double _shift = 0;

  set position(ScrollPosition? p) {
    if (p == _position) return;
    if (attached) _position?.removeListener(markNeedsPaint);
    _position = p;
    if (attached) p?.addListener(markNeedsPaint);
    markNeedsPaint();
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _position?.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _position?.removeListener(markNeedsPaint);
    super.detach();
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    _shift = 0;
    final vp = RenderAbstractViewport.maybeOf(this) as RenderObject?;
    if (vp is RenderBox && vp.hasSize) {
      final top = _topInViewport(this);
      final overflow = top + size.height - vp.size.height;
      final pd = parentData;
      final maxShift = pd is BoxParentData ? math.max(0.0, pd.offset.dy) : double.infinity;
      if (overflow > 0) _shift = math.min(overflow, maxShift);
    }
    final c = child;
    if (c != null) context.paintChild(c, offset - Offset(0, _shift));
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) =>
      result.addWithPaintOffset(offset: Offset(0, -_shift), position: position, hitTest: (r, p) => super.hitTest(r, position: p));

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) => transform.translateByDouble(0.0, -_shift, 0.0, 1.0);
}
