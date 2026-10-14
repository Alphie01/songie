// games/song-guess/client/ProgressBar.tsx (+ song.css `.pb*`).
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'strings.dart';

/// Her aşamanın çubuktaki bitiş noktası (%). Kısa aşamalar dar, uzunlar geniş.
const stops = <double>[1.5, 5.5, 22, 55, 100];

/// Çalan aşama: hangi parça, klibin süresi (sn), her çalışta artan anahtar.
typedef PlayingStage = ({int stage, double duration, int key});

class SgProgressBar extends StatelessWidget {
  const SgProgressBar({super.key, required this.clips, required this.unlocked, required this.current, this.playing, this.onPick});
  final List<double> clips;

  /// Açılmış en yüksek aşama; -1 hiçbiri.
  final int unlocked;

  /// İşaretçinin duracağı aşama.
  final int current;
  final PlayingStage? playing;

  /// Açılmış bir parçaya dokununca o parçayı çal.
  final void Function(int stage)? onPick;

  double _clip(int i) => i >= 0 && i < clips.length ? clips[i] : 0;

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    final move = reduced ? Duration.zero : const Duration(milliseconds: 300);
    final fill = unlocked >= 0 ? stops[unlocked] : 0.0;
    final at = stops[math.max(0, current)];
    return Semantics(
      label: SPlay.openClip(clipShort(_clip(math.max(0, unlocked)))),
      child: LayoutBuilder(
        builder: (context, cons) {
          final w = cons.maxWidth;
          // İçerik kutusu: 3px çerçevenin içi.
          final inner = math.max(0.0, w - 6);
          final labelLeft = math.max(0.0, math.min(w * at / 100 - 22, w - 52));
          return Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    height: 22,
                    decoration: BoxDecoration(
                      color: C.ink2,
                      border: Border.all(color: C.ink, width: bw),
                      borderRadius: BorderRadius.circular(R.pill),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(R.pill),
                      child: Stack(
                        children: [
                          Positioned(
                            left: 0,
                            top: 0,
                            bottom: 0,
                            child: AnimatedContainer(duration: move, curve: Curves.ease, width: inner * fill / 100, color: C.pink),
                          ),
                          for (var i = 0; i < stops.length - 1; i++)
                            Positioned(left: inner * stops[i] / 100, top: 0, bottom: 0, child: Container(width: 2, color: C.bg)),
                          if (playing != null)
                            _Head(
                              key: ValueKey(playing!.key),
                              to: inner * stops[playing!.stage.clamp(0, stops.length - 1)] / 100 - 3,
                              seconds: math.max(playing!.duration, 0.12),
                              animate: !reduced,
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    height: 22,
                    child: Stack(
                      children: [
                        AnimatedPositioned(
                          duration: move,
                          curve: Curves.ease,
                          left: labelLeft,
                          top: 0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(8)),
                            child: Text(
                              clipShort(_clip(math.max(0, current))),
                              maxLines: 1,
                              softWrap: false,
                              style: T.b(13, color: C.ink2, weight: FontWeight.w800, height: 18 / 13),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              // Açılmış parçalara çubuktan dokunup tekrar dinleme (çubuk + etiket satırı = 50px dokunma alanı).
              if (onPick != null)
                for (var i = 0; i < stops.length; i++)
                  if (i <= unlocked)
                    Positioned(
                      left: w * (i == 0 ? 0 : stops[i - 1]) / 100,
                      top: 0,
                      width: w * math.max(stops[i] - (i == 0 ? 0 : stops[i - 1]), 4) / 100,
                      height: 50,
                      child: Pressable(
                        onTap: () => onPick!(i),
                        label: SPlay.playPart(clipShort(_clip(i))),
                        builder: (context, _) => const SizedBox.expand(),
                      ),
                    ),
            ],
          );
        },
      ),
    );
  }
}

/// `.pb-head`: 3px beyaz çizgi, klip süresince soldan aşamanın sonuna doğrusal kayar (`forwards`).
class _Head extends StatefulWidget {
  const _Head({super.key, required this.to, required this.seconds, required this.animate});
  final double to;
  final double seconds;
  final bool animate;

  @override
  State<_Head> createState() => _HeadState();
}

class _HeadState extends State<_Head> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: Duration(microseconds: (widget.seconds * 1e6).round()));

  @override
  void initState() {
    super.initState();
    if (widget.animate) _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (context, child) => Positioned(left: widget.to * _c.value, top: 0, bottom: 0, width: 3, child: child!),
    child: const ColoredBox(color: C.paper),
  );
}
