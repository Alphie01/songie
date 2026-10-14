part of 'play_view.dart';

// ---------- Oyun sonu (tasarım: Sonuçlar) `.cc-over` ----------

class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.members, required this.room});
  final ColorCardsView view;
  final Map<String, RoomPlayer> members;
  final RoomState room;

  @override
  Widget build(BuildContext context) {
    final winner = view.winner != null ? members[view.winner] : null;
    final points = view.mode == 'points';
    final ranked = stableSorted(view.players, (a, b) {
      if (points && b.score != a.score) return b.score - a.score;
      if (a.id == view.winner) return -1;
      if (b.id == view.winner) return 1;
      return a.cards - b.cards;
    });
    final first = ranked.isNotEmpty ? ranked[0] : null;
    final second = ranked.length > 1 ? ranked[1] : null;
    final rest = ranked.length > 2 ? ranked.sublist(2) : const <CcPlayer>[];
    final half = (rest.length / 2).ceil();
    String big(CcPlayer p) => '${points ? p.score : p.cards}';
    String sub(CcPlayer p) => points ? SPodium.pts(p.score) : SPodium.cardsLeft(p.cards);
    String nick(String id) => members[id]?.nick ?? '?';
    final g = Layout.gutter(context);
    final vh = viewportHeight(context);
    final meta = T.b(13, color: C.text3, weight: FontWeight.w800);

    Widget roster(List<CcPlayer> col) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
      child: VStack(
        gap: 8,
        children: [
          for (final p in col)
            Row(
              children: [
                if (members[p.id] case final m?) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                Expanded(
                  child: Text(nick(p.id), style: T.b(15, color: C.text, weight: FontWeight.w800), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(width: 8),
                Text(points ? '${p.score}' : SPodium.cards(p.cards), style: T.b(13, color: C.yellow, weight: FontWeight.w800), maxLines: 1, softWrap: false),
              ],
            ),
        ],
      ),
    );

    final children = <Widget>[
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(child: Text(S.name, style: meta)),
          Text(room.code, style: meta.copyWith(letterSpacing: 2)),
        ],
      ),
      Padding(
        padding: const EdgeInsets.only(top: 18),
        child: Column(
          children: [
            const EndSticker(SPodium.over),
            const SizedBox(height: 6 + 8),
            Text(winner != null ? SPodium.winner(winner.nick) : SPodium.none, style: T.d(48, color: C.text, height: 0.95), textAlign: TextAlign.center),
          ],
        ),
      ),
      if (first != null)
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _OverCard(first: true, big: big(first), name: nick(first.id), sub: sub(first))),
              if (second != null) ...[
                const SizedBox(width: 12),
                Center(child: Text('–', style: T.d(30, color: C.text3, height: 1.45))),
                const SizedBox(width: 12),
                Expanded(
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: SizedBox(width: double.infinity, child: _OverCard(first: false, big: big(second), name: nick(second.id), sub: sub(second))),
                  ),
                ),
              ],
            ],
          ),
        ),
      if (rest.isNotEmpty)
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: roster(rest.sublist(0, half))),
              const SizedBox(width: 10),
              Expanded(child: half < rest.length ? roster(rest.sublist(half)) : const SizedBox()),
            ],
          ),
        ),
    ];

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: Layout.col + 2 * g, minHeight: vh),
        child: ClipRect(
          child: Stack(
            children: [
              const Positioned.fill(child: Confetti(top: 102)),
              Padding(
                padding: EdgeInsets.fromLTRB(g, 72, g, 24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: vh - 72 - 24),
                  child: IntrinsicHeight(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ..._gapped(18, children),
                        // `.cc-over-spacer { flex: 1 }`: aralık iki yanında da var.
                        const SizedBox(height: 18),
                        const Spacer(),
                        const SizedBox(height: 18),
                        Column(
                          children: [
                            const SizedBox(width: double.infinity, child: EndBar(durationMs: 4000)),
                            const SizedBox(height: 10),
                            Text(SPodium.back, style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
                          ],
                        ),
                      ],
                    ),
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

List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// `.cc-over-card`: birinci nane (−3°, taçlı, gölgeli), ikinci lila (+2°, altta).
class _OverCard extends StatelessWidget {
  const _OverCard({required this.first, required this.big, required this.name, required this.sub});
  final bool first;
  final String big;
  final String name;
  final String sub;

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
          if (first) const SSvg(crownSvg, width: 40, height: 28),
          Padding(
            padding: EdgeInsets.only(top: first ? 0 : 10),
            child: Text(big, style: T.d(first ? 64 : 52, color: C.ink2), textAlign: TextAlign.center),
          ),
          Text(name, style: T.b(14, color: C.ink2, weight: FontWeight.w800), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
          Text(sub, style: T.b(12, color: C.ink2, weight: FontWeight.w700), textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
