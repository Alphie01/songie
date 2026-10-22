import 'package:flutter/material.dart';

import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'audio.dart';
import 'bits.dart';
import 'desk.dart';
import 'strings.dart';

/// Scene.tsx: bölüm açılış sahnesi, tam ekran sinematik kart. [replay] verilirse yalnızca okunur (yerel).
/// Görünen alanı kaplayan katmanın içinde çizilir (`.dt-scene`: fixed, inset 0).
class SceneOverlay extends StatelessWidget {
  const SceneOverlay({super.key, this.replay, this.onClose});
  final int? replay;
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final live = replay == null;
    ({int index, String title, String scene, String? imageUrl, String? imageAlt, String? narrationUrl})? act;
    if (live) {
      final a = view.act;
      act = (index: a.index, title: a.title, scene: a.scene, imageUrl: a.imageUrl, imageAlt: a.imageAlt, narrationUrl: a.narrationUrl);
    } else {
      for (final a in view.acts) {
        if (a.index == replay) act = (index: a.index, title: a.title, scene: a.scene, imageUrl: a.imageUrl, imageAlt: null, narrationUrl: a.narrationUrl);
      }
    }
    if (act == null) return const SizedBox.shrink();
    final shown = act;
    final ready = view.sceneReady.contains(d.meId);
    final players = d.room.players.where((p) => p.connected).toList();
    final reduce = MediaQuery.disableAnimationsOf(context);

    final textChildren = <Widget>[
      Text(view.caseInfo.title, style: T.b(13, color: C.text3, weight: FontWeight.w800)),
      Align(
        alignment: Alignment.centerLeft,
        child: Transform.rotate(
          angle: deg(-3),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(R.pill)),
            child: Text(trUpper(SScene.act(act.index, view.act.total)), style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
          ),
        ),
      ),
      // clamp(30px, 4.5vw, 44px)
      Semantics(header: true, child: Text(act.title, style: T.d((MediaQuery.sizeOf(context).width * 0.045).clamp(30.0, 44.0), color: C.text))),
      Paras(act.scene, style: T.b(15, color: C.text2, weight: FontWeight.w600, height: 1.65), gap: 12),
      if (act.narrationUrl != null)
        AudioPlayerView(
          url: act.narrationUrl,
          audioKey: '${d.slug}:act-${act.index}',
          seed: 'act-${act.index}',
          narration: true,
          label: SScene.act(act.index, view.act.total),
          playLabel: SScene.narration,
          pauseLabel: SScene.narrationPause,
          missing: '',
        ),
      Padding(
        padding: const EdgeInsets.only(top: 8),
        child: live
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    label: SScene.waiting(view.sceneReady.length, players.length),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final p in players)
                          Tooltip(
                            message: p.nick,
                            child: SAvatar(avatar: p.avatar, nick: p.nick, size: 28, dim: !view.sceneReady.contains(p.id)),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (!ready)
                    SButton(label: SScene.continueLabel, tone: BtnTone.primary, large: true, onPressed: () => d.send({'type': 'continue'}))
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(SScene.waiting(view.sceneReady.length, players.length), style: T.b(13, color: C.text3, weight: FontWeight.w700)),
                        if (d.isHost) ...[
                          const SizedBox(height: 10),
                          SButton(label: SScene.hostSkip, tone: BtnTone.outline, onPressed: () => d.send({'type': 'continue'})),
                        ],
                      ],
                    ),
                ],
              )
            : Align(
                alignment: Alignment.centerLeft,
                child: SButton(label: SScene.close, tone: BtnTone.outline, onPressed: onClose),
              ),
      ),
    ];

    final card = Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 4), borderRadius: BorderRadius.circular(26), boxShadow: Shadows.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            decoration: const BoxDecoration(color: C.ink, border: Border(bottom: BorderSide(color: C.ink, width: 4))),
            child: Picture(
              url: act.imageUrl,
              alt: act.imageAlt ?? act.title,
              label: SScene.imageMissing,
              tone: PicTone.dark,
              cacheKey: '${d.slug}:act:${act.index}',
              aspectRatio: 16 / 10,
              fontSize: 14,
              phBorder: false,
            ),
          ),
          Padding(
            // clamp(18px, 4vw, 36px)
            padding: EdgeInsets.all((MediaQuery.sizeOf(context).width * 0.04).clamp(18.0, 36.0)),
            child: VStack(gap: 12, children: textChildren),
          ),
        ],
      ),
    );

    return Semantics(
      scopesRoute: true,
      explicitChildNodes: true,
      child: ColoredBox(
        color: const Color(0xEB120C2E),
        child: LayoutBuilder(
          builder: (context, c) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 72, 16, 24),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: (c.maxHeight - 72 - 24).clamp(0.0, double.infinity)),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1040),
                  child: EnterAnim(
                    key: ValueKey('${live ? 'live' : 'replay'}-${shown.index}'),
                    duration: reduce ? Duration.zero : const Duration(milliseconds: 420),
                    curve: Curves.easeOut,
                    dy: 14,
                    scale: 0.985,
                    child: card,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
