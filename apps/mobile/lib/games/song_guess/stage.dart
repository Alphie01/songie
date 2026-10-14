// PlayView.tsx `.song-stage`: büyük çalma düğmesi / geri sayım / yükleniyor + ekolayzer + süre + ipucu.
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

/// Ekolayzer çubuklarının boyları (tasarımdaki gibi; dördüncüsü sarı).
const _eq = <double>[30, 70, 45, 100, 55, 85, 35, 60];

class SgStage extends StatelessWidget {
  const SgStage({
    super.key,
    required this.view,
    required this.hint,
    required this.playingStage,
    required this.blocked,
    required this.onPlay,
  });
  final SongView view;
  final String hint;

  /// Çalan aşama klibi (-1: aşama klibi çalmıyor).
  final int playingStage;
  final bool blocked;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    final Widget circle;
    if (view.phase == 'countdown') {
      circle = _Circle(
        color: C.panel,
        child: Remaining(
          serverNow: view.serverNow,
          endsAt: view.phaseEndsAt,
          tick: const Duration(milliseconds: 250),
          builder: (context, remaining) {
            final secs = (remaining / 1000).ceil();
            final text = Text('${math.max(1, secs)}', style: T.d(72, color: C.yellow), textScaler: TextScaler.noScaling);
            return Semantics(
              liveRegion: true,
              label: '${SPlay.countdown}: $secs',
              child: ExcludeSemantics(
                child: MediaQuery.disableAnimationsOf(context)
                    ? text
                    // `count-in`: 900ms ease-out, 1.4 ölçekten ve saydamdan gelir; her saniye yeniden.
                    : EnterAnim(animKey: secs, scale: 1.4, opacity: 0, duration: const Duration(milliseconds: 900), curve: Curves.easeOut, child: text),
              ),
            );
          },
        ),
      );
    } else if (view.phase == 'loading') {
      circle = const _Circle(color: C.panel, child: _Spinner());
    } else {
      final stageClip = view.stage < view.stageClips.length ? view.stageClips[view.stage] : 0.0;
      circle = _PlayButton(
        playing: playingStage >= 0,
        blocked: blocked,
        label: playingStage >= 0 ? SPlay.stopLabel : SPlay.playLabel(clipLabel(stageClip)),
        onTap: onPlay,
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          circle,
          const SizedBox(height: 10),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _Equalizer(on: playingStage >= 0),
              if (view.phase == 'stage' && view.timed) ...[
                const SizedBox(width: 12),
                Remaining(
                  serverNow: view.serverNow,
                  endsAt: view.phaseEndsAt,
                  tick: const Duration(milliseconds: 250),
                  builder: (context, remaining) {
                    final secs = (remaining / 1000).ceil();
                    return Semantics(
                      label: '$secs sn',
                      child: ExcludeSemantics(child: Text('$secs', style: T.d(26, color: remaining < 4000 ? C.red : C.yellow))),
                    );
                  },
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
            child: Text(hint, textAlign: TextAlign.center, style: T.b(13, color: C.yellow, weight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}

/// `.sg-count`: 150'lik daire, 4px çerçeve, alttan 9px gölge.
class _Circle extends StatelessWidget {
  const _Circle({required this.color, required this.child});
  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: 150,
    height: 150,
    alignment: Alignment.center,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 4), boxShadow: hardShadow(0, 9)),
    child: child,
  );
}

/// `.sg-play`: pembe daire; basınca 6px iner, gölge 3px'e düşer (80ms). Ses engelliyse nabız gibi büyür.
class _PlayButton extends StatefulWidget {
  const _PlayButton({required this.playing, required this.blocked, required this.label, required this.onTap});
  final bool playing;
  final bool blocked;
  final String label;
  final VoidCallback onTap;

  @override
  State<_PlayButton> createState() => _PlayButtonState();
}

class _PlayButtonState extends State<_PlayButton> with SingleTickerProviderStateMixin {
  // `play-nudge`: 1.1s ease-in-out sonsuz, %50'de 1.04 ölçek. Native'de otomatik oynatma engeli olmadığından çalışmaz.
  late final AnimationController _nudge = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncNudge();
  }

  @override
  void didUpdateWidget(_PlayButton old) {
    super.didUpdateWidget(old);
    _syncNudge();
  }

  void _syncNudge() {
    final on = widget.blocked && !MediaQuery.disableAnimationsOf(context);
    if (on && !_nudge.isAnimating) {
      _nudge.repeat();
    } else if (!on && _nudge.isAnimating) {
      _nudge.stop();
      _nudge.value = 0;
    }
  }

  @override
  void dispose() {
    _nudge.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    return AnimatedBuilder(
      animation: _nudge,
      builder: (context, child) {
        // 0 → %50 → %100 arasında ease-in-out ile 1 → 1.04 → 1.
        final t = _nudge.value;
        final half = t < 0.5 ? t * 2 : (1 - t) * 2;
        final scale = 1 + 0.04 * Curves.easeInOut.transform(half);
        return Transform.scale(scale: scale, child: child);
      },
      child: Pressable(
        onTap: widget.onTap,
        label: widget.label,
        builder: (context, pressed) => AnimatedContainer(
          duration: reduced ? Duration.zero : const Duration(milliseconds: 80),
          curve: Curves.ease,
          transform: Matrix4.translationValues(0, pressed ? 6 : 0, 0),
          width: 150,
          height: 150,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: C.pink,
            shape: BoxShape.circle,
            border: Border.all(color: C.ink, width: 4),
            boxShadow: hardShadow(0, pressed ? 3 : 9),
          ),
          child: SIcon(widget.playing ? 'pause' : 'play', size: 62, color: C.ink2),
        ),
      ),
    );
  }
}

/// `.sg-spinner`: 44'lük halka (5px panel-2), üst çeyreği pembe; 0.8s'de bir tur döner.
class _Spinner extends StatefulWidget {
  const _Spinner();

  @override
  State<_Spinner> createState() => _SpinnerState();
}

class _SpinnerState extends State<_Spinner> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RotationTransition(
    turns: _c,
    child: const SizedBox(width: 44, height: 44, child: CustomPaint(painter: _SpinnerPainter())),
  );
}

class _SpinnerPainter extends CustomPainter {
  const _SpinnerPainter();

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 5.0;
    final rect = (Offset.zero & size).deflate(stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = C.panel2;
    canvas.drawArc(rect, 0, math.pi * 2, false, paint);
    // border-top-color: üst kenar, köşegenler arasındaki çeyrek.
    canvas.drawArc(rect, -math.pi * 3 / 4, math.pi / 2, false, paint..color = C.pink);
  }

  @override
  bool shouldRepaint(_SpinnerPainter old) => false;
}

/// `.song-eq`: 120×30, sekiz çubuk (aralık 4, köşe 3). Açıkken her çubuk 0.45'e kadar dikey küçülüp büyür
/// (ease-in-out, gidip gelen; 700ms, çift sıradakiler 520ms, üçün katları 860ms).
class _Equalizer extends StatefulWidget {
  const _Equalizer({required this.on});
  final bool on;

  @override
  State<_Equalizer> createState() => _EqualizerState();
}

class _EqualizerState extends State<_Equalizer> with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker((elapsed) => setState(() => _elapsed = elapsed));
  Duration _elapsed = Duration.zero;

  bool get _animate => widget.on && !MediaQuery.disableAnimationsOf(context);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(_Equalizer old) {
    super.didUpdateWidget(old);
    _sync();
  }

  void _sync() {
    if (_animate && !_ticker.isActive) {
      _elapsed = Duration.zero;
      _ticker.start();
    } else if (!_animate && _ticker.isActive) {
      _ticker.stop();
      _elapsed = Duration.zero;
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  static int _durationMs(int i) {
    final n = i + 1;
    if (n % 3 == 0) return 860;
    if (n % 2 == 0) return 520;
    return 700;
  }

  double _scale(int i) {
    if (!_ticker.isActive) return 1;
    final cycles = _elapsed.inMicroseconds / 1000 / _durationMs(i);
    final k = cycles.floor();
    var p = cycles - k;
    if (k.isOdd) p = 1 - p;
    return 1 + (0.45 - 1) * Curves.easeInOut.transform(p);
  }

  @override
  Widget build(BuildContext context) {
    final bars = <Widget>[];
    for (var i = 0; i < _eq.length; i++) {
      if (i > 0) bars.add(const SizedBox(width: 4));
      bars.add(
        Expanded(
          child: Center(
            child: Transform(
              alignment: Alignment.center,
              transform: Matrix4.diagonal3Values(1, _scale(i), 1),
              child: Container(
                height: 30 * _eq[i] / 100,
                decoration: BoxDecoration(color: i == 3 ? C.yellow : C.pink, borderRadius: BorderRadius.circular(3)),
              ),
            ),
          ),
        ),
      );
    }
    return SizedBox(width: 120, height: 30, child: Row(children: bars));
  }
}
