part of 'play_view.dart';

/// `Clock`: süre halkası + gece sırası ya da gündüz aşaması.
class _Clock extends StatelessWidget {
  const _Clock({required this.g, required this.total});
  final _G g;
  final int total;

  @override
  Widget build(BuildContext context) {
    final view = g.view;
    final pal = g.pal;
    final night = view.phase == 'night';
    final aliveN = view.seats.where((x) => x.alive).length;
    final cur = view.nightStep != null ? view.nightSteps.indexOf(view.nightStep!) : -1;
    final sub = T.b(13, color: C.text2, weight: FontWeight.w700);

    final text = night
        ? <Widget>[
            Text(trUpper(SPlay.nightOrder), style: _labelStyle(pal)),
            if (view.nightSteps.isNotEmpty)
              Semantics(
                label: SPlay.nightOrder,
                child: Wrap(
                  spacing: 5,
                  runSpacing: 5,
                  children: [
                    for (var i = 0; i < view.nightSteps.length; i++) _StepChip(step: view.nightSteps[i], state: i < cur ? 'done' : (i == cur ? 'now' : 'next'), pal: pal),
                  ],
                ),
              ),
            if (view.nightStep != null) Text(S.stepWakes[view.nightStep]!, style: sub),
          ]
        : <Widget>[
            Text(trUpper(SPlay.day(view.day)), style: _labelStyle(pal)),
            Text(S.phase[view.phase]!, style: T.d(26, color: C.text)),
            Text(SPlay.alive(aliveN), style: sub),
          ];

    return Remaining(
      serverNow: view.serverNow,
      endsAt: view.endsAt,
      tick: const Duration(milliseconds: 250),
      builder: (context, left) {
        final sec = (left / 1000).ceil();
        return Semantics(
          liveRegion: true,
          child: Row(
            children: [
              SizedBox(
                width: 92,
                height: 92,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: pal.disc, shape: BoxShape.circle, border: Border.all(color: pal.edge, width: 3)),
                      ),
                    ),
                    // `transition: stroke-dashoffset 0.3s linear`
                    Positioned.fill(
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(end: (left / total).clamp(0.0, 1.0)),
                        duration: const Duration(milliseconds: 300),
                        builder: (context, l, _) => CustomPaint(painter: _RingPainter(left: l, color: pal.ring)),
                      ),
                    ),
                    Center(
                      child: Semantics(
                        label: SPlay.stepLeft(sec),
                        child: ExcludeSemantics(child: Text('$sec', style: _mono(30, pal.ring).copyWith(height: 1))),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: _gapCol(6, text)),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// `.ww-steps li`: gecenin sırasındaki adım (geçti: soluk, şimdi: rol renginde).
class _StepChip extends StatelessWidget {
  const _StepChip({required this.step, required this.state, required this.pal});
  final NightStep step;
  final String state;
  final _Pal pal;

  @override
  Widget build(BuildContext context) {
    final now = state == 'now';
    return Opacity(
      opacity: state == 'done' ? 0.5 : 1,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
        decoration: BoxDecoration(
          color: now ? stepColor(step) : null,
          border: Border.all(color: now ? pal.edge : pal.soft, width: 2),
          borderRadius: BorderRadius.circular(R.pill),
        ),
        child: Text(S.step[step]!, style: T.b(12, color: now ? C.ink2 : C.text3, weight: FontWeight.w800)),
      ),
    );
  }
}

/// `ClockRing`: 92'lik dairede r=40, 7 kalınlıkta yay; tepeden saat yönünde, kalan süre kadar.
class _RingPainter extends CustomPainter {
  const _RingPainter({required this.left, required this.color});
  final double left;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (left <= 0) return;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round;
    final rect = Rect.fromCircle(center: Offset(size.width / 2, size.height / 2), radius: 40);
    canvas.drawArc(rect, -math.pi / 2, 2 * math.pi * left, false, paint);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.left != left || old.color != color;
}
