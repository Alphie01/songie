// games/intrigue/client/PlayView.tsx: Podium (`.ig-over`).
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'stage.dart' show gapped;
import 'strings.dart';

class IntriguePodium extends StatelessWidget {
  const IntriguePodium({super.key, required this.view, required this.members, required this.meId, required this.room});
  final IntrigueView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final RoomState room;

  @override
  Widget build(BuildContext context) {
    final winner = view.winner != null ? members[view.winner] : null;
    // Önce ayakta kalan, sonra en geç elenen (kararlı sıralama, JS'teki gibi).
    final indexed = [for (var i = 0; i < view.players.length; i++) (i, view.players[i])];
    indexed.sort((a, b) {
      final d = (b.$2.out ?? 99) - (a.$2.out ?? 99);
      return d != 0 ? d : a.$1 - b.$1;
    });
    final ranked = [for (final e in indexed) e.$2];
    // Kazanan yoksa (oyun yarıda bitti) sıralama anlamsız: herkes listede, numarasız.
    final hasWinner = view.winner != null && view.winner!.isNotEmpty;
    final first = hasWinner && ranked.isNotEmpty ? ranked[0] : null;
    final second = hasWinner && ranked.length > 1 ? ranked[1] : null;
    final rest = hasWinner ? ranked.skip(2).toList() : ranked;
    final total = view.durationMs > 0 ? view.durationMs : 1;
    String name(String id) => members[id]?.nick ?? '?';
    final g = Layout.gutter(context);
    final vh = viewportHeight(context);

    Widget card({required IgPlayer p, required bool first}) => Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: first ? C.mint : C.lilac,
        border: Border.all(color: C.ink, width: 4),
        borderRadius: BorderRadius.circular(26),
        boxShadow: first ? Shadows.lg : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (first) const ExcludeSemantics(child: SSvg(crownSvg, width: 40, height: 28)) else const SizedBox(height: 10),
          Text(SPodium.place(first ? 1 : 2), style: T.d(first ? 64 : 52, color: C.ink2)),
          Text(name(p.id), style: T.b(14, color: C.ink2, weight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );

    final rows = [for (var i = 0; i < rest.length; i++) (i, rest[i])];

    final content = ConstrainedBox(
      constraints: BoxConstraints(minHeight: math.max(0, vh - 72 - 24)),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: gapped(18, [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(child: Text(S.name, style: T.b(13, color: C.text3, weight: FontWeight.w800))),
                Text(room.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: 18),
              child: Column(
                children: [
                  const EndSticker(SPodium.gameOver),
                  const SizedBox(height: 6 + 8),
                  Semantics(
                    header: true,
                    child: Text(winner != null ? SPodium.winnerTitle(winner.nick) : SPodium.none, style: T.d(48, color: C.text, height: 0.95), textAlign: TextAlign.center),
                  ),
                  const SizedBox(height: 6),
                  Text(SPodium.title, style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
                ],
              ),
            ),
            if (first != null)
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(child: Transform.rotate(angle: deg(-3), child: card(p: first, first: true))),
                    if (second != null) ...[
                      const SizedBox(width: 12),
                      Center(child: ExcludeSemantics(child: Text('–', style: T.d(30, color: C.text3)))),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Align(alignment: Alignment.bottomCenter, child: Transform.rotate(angle: deg(2), child: card(p: second, first: false))),
                      ),
                    ],
                  ],
                ),
              ),
            if (rest.isNotEmpty)
              Rosters<(int, IgPlayer)>(
                items: rows,
                row: (e) {
                  final m = members[e.$2.id];
                  return Row(
                    children: [
                      if (hasWinner) ...[
                        ConstrainedBox(
                          constraints: const BoxConstraints(minWidth: 22),
                          child: Text(SPodium.place(3 + e.$1), style: T.b(15, color: C.yellow, weight: FontWeight.w800)),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (m != null) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                      Flexible(
                        child: Text(name(e.$2.id), style: T.b(15, color: C.text, weight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  );
                },
              ),
            const Spacer(),
            Column(
              children: [
                Remaining(
                  serverNow: view.serverNow,
                  endsAt: view.endsAt,
                  builder: (context, remaining) => ExcludeSemantics(
                    child: Container(
                      height: 12,
                      clipBehavior: Clip.antiAlias,
                      alignment: Alignment.centerLeft,
                      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                      child: AnimatedFractionallySizedBox(
                        duration: const Duration(milliseconds: 200),
                        widthFactor: (math.max(0, 100 - remaining / total * 100) / 100).clamp(0.0, 1.0),
                        heightFactor: 1,
                        child: const ColoredBox(color: C.yellow),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(SPodium.back, style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
              ],
            ),
          ]),
        ),
      ),
    );

    // `.col.ig-over`: en fazla 440 + 2×gutter, üstte 72, altta 24; konfeti 52px'ten başlar.
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: vh),
      child: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: Layout.col + 2 * g),
          child: ClipRect(
            child: Stack(
              children: [
                const Positioned(top: 52, left: 0, right: 0, height: 220, child: Confetti(top: 50)),
                Padding(padding: EdgeInsets.fromLTRB(g, 72, g, 24), child: content),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
