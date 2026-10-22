// games/secret-hitler/client/PlayView.tsx: Over (`.sh-over`).
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'action_panel.dart' show Send;
import 'glyphs.dart';
import 'models.dart';
import 'strings.dart';

class ShOver extends StatefulWidget {
  const ShOver({super.key, required this.view, required this.nick, required this.members, required this.isHost, required this.send});
  final SecretHitlerView view;
  final String Function(String id) nick;
  final Map<String, RoomPlayer> members;
  final bool isHost;
  final Send send;

  @override
  State<ShOver> createState() => _ShOverState();
}

class _ShOverState extends State<ShOver> {
  /// `totalRef`: ilk görünümdeki toplam süre.
  late final int _total = math.max(1, widget.view.finishAt - widget.view.serverNow);

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final roles = view.roles ?? const <String, String>{};
    var sides = [
      (key: 'liberal', label: SPlay.sideLiberal, seats: view.seats.where((x) => roles[x.id] == 'liberal').toList()),
      (key: 'fascist', label: SPlay.sideFascist, seats: view.seats.where((x) => roles[x.id] != null && roles[x.id] != 'liberal').toList()),
    ];
    if (view.winner == 'fascist') sides = sides.reversed.toList();

    Widget card(String key) {
      final won = view.winner == key;
      final body = Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: sideColor(key),
          border: Border.all(color: C.ink, width: 4),
          borderRadius: BorderRadius.circular(26),
          boxShadow: won ? Shadows.lg : null,
        ),
        child: Column(
          mainAxisSize: won ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (won) const ExcludeSemantics(child: SSvg(crownSvg, width: 40, height: 28)) else const SizedBox(height: 10),
            Text('${key == 'liberal' ? view.liberal : view.fascist}', style: T.d(won ? 64 : 52, color: C.ink2)),
            Text(key == 'liberal' ? SPlay.liberalTrack : SPlay.fascistTrack, style: T.b(14, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
          ],
        ),
      );
      return won
          ? Transform.rotate(angle: deg(-3), child: body)
          : Align(alignment: Alignment.bottomCenter, child: Transform.rotate(angle: deg(2), child: body));
    }

    Widget roster(({String key, String label, List<SeatView> seats}) side) => Semantics(
      label: side.label,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(18)),
        child: VStack(
          gap: 8,
          children: [
            Text(trUpper(side.label), style: T.b(13, color: sideColor(side.key), weight: FontWeight.w800)),
            for (final seat in side.seats)
              Builder(
                builder: (context) {
                  final r = roles[seat.id]!;
                  final m = widget.members[seat.id];
                  return Row(
                    children: [
                      SAvatar(avatar: m?.avatar ?? const Avatar(color: 'mint'), nick: m?.nick ?? '?', size: 28),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Opacity(
                          opacity: seat.alive ? 1 : 0.6,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.nick(seat.id),
                                style: T.b(15, color: C.text, weight: FontWeight.w800, height: 1.15),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                roleNames[r] ?? '',
                                style: T.b(11, color: r == 'hitler' ? C.red : sideInk(side.key), weight: FontWeight.w800, height: 1.15),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );

    return Stack(
      clipBehavior: Clip.none,
      children: [
        // `.sh-confetti`: inset -40px 0 auto, 240px.
        const Positioned(top: -40, left: 0, right: 0, height: 240, child: Confetti(top: 50)),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: gapped(18, [
            Padding(
              padding: const EdgeInsets.only(top: 18),
              child: Column(
                children: [
                  const EndSticker(SPlay.gameOver),
                  const SizedBox(height: 6 + 8),
                  Semantics(
                    header: true,
                    child: Text(
                      view.winner != null ? (SPlay.winnerTitle[view.winner] ?? '') : SPlay.noWinner,
                      style: T.d(48, color: C.text, height: 0.95),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  if (view.winReason != null) ...[
                    const SizedBox(height: 6),
                    Text(SPlay.reason[view.winReason] ?? '', style: T.b(15, color: C.text2, weight: FontWeight.w700), textAlign: TextAlign.center),
                  ],
                ],
              ),
            ),
            if (view.roles != null) ...[
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < sides.length; i++) ...[
                      if (i > 0) ...[
                        const SizedBox(width: 12),
                        Center(child: ExcludeSemantics(child: Text('–', style: T.d(30, color: C.text3)))),
                        const SizedBox(width: 12),
                      ],
                      Expanded(child: card(sides[i].key)),
                    ],
                  ],
                ),
              ),
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [Expanded(child: roster(sides[0])), const SizedBox(width: 10), Expanded(child: roster(sides[1]))],
                ),
              ),
            ],
            const Spacer(),
            Remaining(
              serverNow: view.serverNow,
              endsAt: view.finishAt,
              tick: const Duration(milliseconds: 500),
              builder: (context, leftMs) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ExcludeSemantics(
                    child: Container(
                      height: 12,
                      clipBehavior: Clip.antiAlias,
                      alignment: Alignment.centerLeft,
                      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                      child: AnimatedFractionallySizedBox(
                        duration: const Duration(milliseconds: 400),
                        widthFactor: (1 - leftMs / _total).clamp(0.0, 1.0),
                        heightFactor: 1,
                        child: const ColoredBox(color: C.yellow),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(SPlay.backIn((leftMs / 1000).ceil()), style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
                  if (widget.isHost) ...[
                    const SizedBox(height: 10),
                    SButton(label: SPlay.backNow, tone: BtnTone.primary, large: true, block: true, onPressed: () => widget.send({'type': 'finish'})),
                  ],
                ],
              ),
            ),
          ]),
        ),
      ],
    );
  }
}
