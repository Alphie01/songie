// PlayView.tsx `Reveal` (+ song.css `.rv*`): tur sonu şarkı açıklaması.
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

class SgReveal extends StatelessWidget {
  const SgReveal({
    super.key,
    required this.view,
    required this.members,
    required this.meId,
    required this.isHost,
    required this.act,
    required this.playing,
    required this.onTogglePreview,
  });
  final SongView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final bool isHost;
  final Future<Ack> Function(Json action) act;

  /// Önizleme (aşama klibi olmayan ses) çalıyor mu.
  final bool playing;
  final VoidCallback onTogglePreview;

  @override
  Widget build(BuildContext context) {
    final r = view.reveal!;
    PlayerLine? me;
    for (final p in view.players) {
      if (p.id == meId) me = p;
    }
    RevealResult? mine;
    for (final x in r.results) {
      if (x.playerId == meId) mine = x;
    }
    final last = view.totalRounds != null && view.round >= view.totalRounds!;
    final present = view.players.where((p) => members[p.id]?.connected == true).toList();
    final readyCount = present.where((p) => p.ready).length;
    final ready = me?.ready ?? false;
    final readyStyle = T.b(14, color: C.text2, weight: FontWeight.w800);

    final verdictColor = mine?.kind == 'correct' ? C.mint : (mine?.kind == 'artist' ? C.sky : C.red);
    final verdictText = mine?.kind == 'correct' ? SReveal.won : (mine?.kind == 'artist' ? SReveal.artistOnly : SReveal.lost);

    final children = <Widget>[
      // `.rv-cover`: 180'lik kapak, 4px çerçeve, r26, gölge, −3°; görsel yoksa nota ikonu.
      Padding(
        padding: const EdgeInsets.only(top: 4, bottom: 8),
        child: Transform.rotate(
          angle: deg(-3),
          child: Container(
            width: 180,
            height: 180,
            decoration: BoxDecoration(
              color: C.pink,
              border: Border.all(color: C.ink, width: 4),
              borderRadius: BorderRadius.circular(26),
              boxShadow: Shadows.lg,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: r.cover != null
                  ? Image.network(r.cover!, width: 172, height: 172, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox.expand())
                  : const Center(child: SIcon('music', size: 64, color: C.ink2)),
            ),
          ),
        ),
      ),
      const EndSticker(SReveal.itWas),
      Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Text(r.title, textAlign: TextAlign.center, style: T.d(32, color: C.text)),
      ),
      Text('${r.artist}${r.album.isNotEmpty ? ' · ${r.album}' : ''}', textAlign: TextAlign.center, style: T.b(15, color: C.text2, weight: FontWeight.w800)),
      if (r.poolName != null) Text(SReveal.fromPool(r.poolName!), textAlign: TextAlign.center, style: T.b(13, color: C.text3, weight: FontWeight.w700)),
      Wrap(
        alignment: WrapAlignment.center,
        spacing: 8,
        runSpacing: 8,
        children: [
          SgGhost(icon: playing ? 'pause' : 'play', label: playing ? SReveal.stop : SReveal.replay, onPressed: onTogglePreview),
          SgGhost(
            label: SReveal.listen,
            onPressed: () {
              final uri = Uri.tryParse(r.link);
              if (uri != null) launchUrl(uri, mode: LaunchMode.externalApplication);
            },
          ),
        ],
      ),
      // `.rv-verdict`: kazandıysan nane, sanatçıysa gök mavisi, değilse kırmızı; +2°.
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Transform.rotate(
          angle: deg(2),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(color: verdictColor, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.pill)),
            child: Text(
              '$verdictText${mine != null ? ' +${trNumber(mine.points)}' : ''}',
              textAlign: TextAlign.center,
              style: T.d(18, color: C.ink2, height: 1.45),
            ),
          ),
        ),
      ),
      if (view.players.length > 1)
        if (r.results.isEmpty)
          Text(SReveal.nobody, textAlign: TextAlign.center, style: T.b(14, color: C.text3, weight: FontWeight.w700))
        else
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
              child: VStack(
                gap: 6,
                children: [
                  for (final x in r.results)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          x.playerId == meId ? SFeed.you : (members[x.playerId]?.nick ?? '?'),
                          style: T.b(14, color: x.kind == 'artist' ? C.sky : C.mint, weight: FontWeight.w800),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            x.kind == 'artist'
                                ? SReveal.artistOnly
                                : SReveal.atStage(clipLabel(x.stage >= 0 && x.stage < view.stageClips.length ? view.stageClips[x.stage] : 0)),
                            style: T.b(14, color: C.text2, weight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text('+${trNumber(x.points)}', style: T.b(14, color: C.yellow, weight: FontWeight.w800)),
                      ],
                    ),
                ],
              ),
            ),
          ),
      Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: _gapped(8, [
            SButton(
              label: last ? SReveal.finish : SReveal.next,
              tone: BtnTone.primary,
              large: true,
              block: true,
              onPressed: ready ? null : () => act({'type': 'next'}),
            ),
            if (present.length > 1) Text(SReveal.waitingOthers(readyCount, present.length), textAlign: TextAlign.center, style: readyStyle),
            if (view.timed)
              Remaining(
                serverNow: view.serverNow,
                endsAt: view.phaseEndsAt,
                tick: const Duration(milliseconds: 250),
                builder: (context, remaining) => Text(SReveal.autoNext((remaining / 1000).ceil()), textAlign: TextAlign.center, style: readyStyle),
              ),
            if (isHost && present.length > 1 && ready && readyCount < present.length)
              SgGhost(label: SReveal.skipWait, onPressed: () => act({'type': 'next', 'force': true})),
          ]),
        ),
      ),
    ];

    return Semantics(
      liveRegion: true,
      container: true,
      child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: _gapped(8, children)),
    );
  }
}

List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}
