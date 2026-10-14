import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../session/session.dart';
import 'tokens.dart';

/// `.toast`: altta ortada sarı bildirim (oturumdaki `notice`).
class ToastHost extends StatelessWidget {
  const ToastHost({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final notice = context.select<Session, String?>((s) => s.notice);
    final media = MediaQuery.of(context);
    final g = Layout.gutter(context);
    return Stack(
      children: [
        child,
        if (notice != null)
          Positioned(
            left: g,
            right: g,
            bottom: math.max(20, media.padding.bottom) + media.viewInsets.bottom,
            child: Center(
              child: Semantics(
                liveRegion: true,
                child: Material(
                  type: MaterialType.transparency,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(
                      color: C.yellow,
                      border: Border.all(color: C.ink, width: bw),
                      borderRadius: BorderRadius.circular(R.md),
                      boxShadow: Shadows.md,
                    ),
                    child: Text(
                      notice,
                      style: T.b(15, color: C.ink2, weight: FontWeight.w800),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
