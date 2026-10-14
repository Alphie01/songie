// PlayView.tsx `Podium` (+ song.css `.song-podium*`): OYUN BİTTİ, kazanan, renkli skor kartları, lobiye dönüş çubuğu.
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

class SgPodium extends StatefulWidget {
  const SgPodium({super.key, required this.view, required this.room});
  final SongView view;
  final RoomState room;

  @override
  State<SgPodium> createState() => _SgPodiumState();
}

class _SgPodiumState extends State<SgPodium> {
  @override
  void initState() {
    super.initState();
    // `window.scrollTo(0, 0)`
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final position = Scrollable.maybeOf(context)?.position;
      if (position != null && position.hasPixels && position.pixels != 0) position.jumpTo(0);
    });
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final members = membersOf(widget.room);
    final ranked = stableSorted(view.players.where((p) => members.containsKey(p.id)), (a, b) => b.score - a.score);
    final first = ranked.isNotEmpty ? ranked[0] : null;
    final second = ranked.length > 1 ? ranked[1] : null;
    final rest = ranked.length > 2 ? ranked.sublist(2) : const <PlayerLine>[];
    final tie = first != null && second != null && first.score == second.score;
    String nick(String id) => members[id]?.nick ?? '?';
    final g = Layout.gutter(context);
    final vw = MediaQuery.sizeOf(context).width / 100;
    final minHeight = viewportHeight(context);

    final top = <Widget>[
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(S.name, style: T.b(13, color: C.text3, weight: FontWeight.w800)),
          Text(widget.room.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
        ],
      ),
      Padding(
        padding: const EdgeInsets.only(top: 18),
        child: Column(
          children: [
            const EndSticker(SPodium.title),
            const SizedBox(height: 6 + 8),
            Text(first != null && !tie ? SPodium.winner(nick(first.id)) : SPodium.draw, textAlign: TextAlign.center, style: T.d(48, color: C.text, height: 0.95)),
            if (first != null && first.bestStreak > 1) ...[
              const SizedBox(height: 6),
              Text(SPodium.streak(first.bestStreak), textAlign: TextAlign.center, style: T.b(14, color: C.text2, weight: FontWeight.w800)),
            ],
          ],
        ),
      ),
      if (first != null)
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _Card(first: true, crown: !tie, score: first.score, name: nick(first.id), fontSize: (13 * vw).clamp(40, 64).toDouble()),
              ),
              if (second != null) ...[
                const SizedBox(width: 12),
                Center(child: Text('–', style: T.d(30, color: C.text3))),
                const SizedBox(width: 12),
                // `align-self: flex-end`: genişlik paylaşılır, yükseklik içerik kadar ve altta.
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Card(first: false, crown: false, score: second.score, name: nick(second.id), fontSize: (11 * vw).clamp(36, 52).toDouble()),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      if (rest.isNotEmpty)
        Rosters<PlayerLine>(
          items: rest,
          row: (p) {
            final m = members[p.id]!;
            return Row(
              children: [
                SAvatar(avatar: m.avatar, nick: m.nick, size: 28),
                const SizedBox(width: 8),
                Expanded(child: Text(m.nick, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis, style: T.b(15, color: C.text, weight: FontWeight.w800))),
                const SizedBox(width: 8),
                Text(trNumber(p.score), style: T.d(15, color: C.yellow, height: 1.45)),
              ],
            );
          },
        ),
    ];

    final foot = Column(
      children: [
        Remaining(
          serverNow: view.serverNow,
          endsAt: view.phaseEndsAt,
          tick: const Duration(milliseconds: 250),
          builder: (context, remaining) {
            final progress = view.phaseMs > 0 ? math.min(100.0, math.max(0.0, 100 - (remaining / view.phaseMs) * 100)) : 100.0;
            return Container(
              height: 12,
              decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(R.pill),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: AnimatedFractionallySizedBox(
                    duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 250),
                    curve: Curves.linear,
                    widthFactor: progress / 100,
                    heightFactor: 1,
                    child: const ColoredBox(color: C.yellow),
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 10),
        Text(SPodium.back, style: T.b(14, color: C.text2, weight: FontWeight.w800)),
      ],
    );

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        // `.col`: en fazla 440 + iki kenar boşluğu.
        constraints: BoxConstraints(maxWidth: 440 + 2 * g, minHeight: minHeight),
        child: ClipRect(
          child: Stack(
            children: [
              const Positioned.fill(child: Confetti(top: 102)),
              Padding(
                padding: EdgeInsets.fromLTRB(g, 72, g, 24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: math.max(0, minHeight - 96)),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Ara boşluk 18; esnek boşluğun (song-spacer) iki yanında da 18.
                      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [..._gapped(18, top), const SizedBox(height: 18)]),
                      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [const SizedBox(height: 18), foot]),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// `.song-podium-card`: birinci nane, −3°, gölgeli, taçlı (berabere değilse); ikinci lila, +2°, altta.
class _Card extends StatelessWidget {
  const _Card({required this.first, required this.crown, required this.score, required this.name, required this.fontSize});
  final bool first;
  final bool crown;
  final int score;
  final String name;
  final double fontSize;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(first ? -3 : 2),
    child: Container(
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
          if (crown) SSvg(crownSvg, width: 40, height: 28),
          SizedBox(height: first ? 0 : 10),
          NoWrapText(trNumber(score), style: T.d(fontSize, color: C.ink2)),
          Text(name, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis, style: T.b(14, color: C.ink2, weight: FontWeight.w800)),
        ],
      ),
    ),
  );
}

List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}
