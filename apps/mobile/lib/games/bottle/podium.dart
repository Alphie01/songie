part of 'play_view.dart';

/// Sunucunun podyumda beklediği süre (server/game.ts podiumMs).
const _podiumMs = 8000;

/// Oyun sonu (Sonuclar.dc.html): kazanan kartları, kalanlar, lobiye dönüş çubuğu.
class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.members, required this.meId, required this.code});
  final BottleView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  Widget build(BuildContext context) {
    final rows = _ranked(view).where((e) => members.containsKey(e.$1)).toList();
    final first = rows.isNotEmpty ? rows[0] : null;
    final second = rows.length > 1 ? rows[1] : null;
    final rest = rows.length > 2 ? rows.sublist(2) : const <(String, PlayerScore)>[];
    final half = (rest.length / 2).ceil();
    final tie = first != null && second != null && second.$2.points == first.$2.points;
    String nickOf(String id) => members[id]?.nick ?? '?';

    final g = Layout.gutter(context);
    final vh = viewportHeight(context);
    final maxW = Layout.col + 2 * g;
    final top = T.b(13, color: C.text3, weight: FontWeight.w800);

    Widget card((String, PlayerScore) row, {required bool isFirst}) => Transform.rotate(
      angle: deg(isFirst ? -3 : 2),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isFirst ? C.mint : C.lilac,
          border: Border.all(color: C.ink, width: 4),
          borderRadius: BorderRadius.circular(26),
          boxShadow: isFirst ? Shadows.lg : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isFirst && !tie) SSvg(crownSvg, width: 40, height: 28),
            if (!isFirst) const SizedBox(height: 10),
            Text('${row.$2.points}', style: T.d(isFirst ? 64 : 52, color: C.ink2)),
            Text(
              nickOf(row.$1),
              style: T.b(14, color: C.ink2, weight: FontWeight.w800),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Opacity(
              opacity: 0.75,
              child: Text(
                SPodium.done(row.$2.done),
                style: T.b(12, color: C.ink2, weight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );

    Widget roster(List<(String, PlayerScore)> col) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 8,
        children: [
          for (final (id, sc) in col)
            Row(
              children: [
                if (members[id] case final m?) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      nickOf(id),
                      style: T.b(15, color: C.text, weight: FontWeight.w800),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${sc.points}',
                  style: T.b(15, color: C.yellow, weight: FontWeight.w800),
                ),
              ],
            ),
        ],
      ),
    );

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: vh),
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxW),
                child: const Confetti(top: 102),
              ),
            ),
          ),
          GameColumn(
            maxWidth: maxW,
            bottom: 24,
            child: _FillColumn(
              minHeight: vh - 72 - 24,
              gap: 18,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(S.name, style: top),
                    Text(code, style: top.copyWith(letterSpacing: 2)),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 18),
                  child: Column(
                    children: [
                      const EndSticker(SPodium.title),
                      const SizedBox(height: 6 + 8),
                      Text(
                        first == null || tie ? SPodium.tie : SPodium.winner(nickOf(first.$1)),
                        style: T.d(48, color: C.text, height: 0.95),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                if (first != null)
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(child: card(first, isFirst: true)),
                        if (second != null) ...[
                          const SizedBox(width: 12),
                          Center(
                            child: ExcludeSemantics(
                              child: Text('–', style: T.d(30, color: C.text3)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [card(second, isFirst: false)],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                if (rest.isNotEmpty)
                  Grid2(
                    columnGap: 10,
                    rowGap: 10,
                    equalHeight: true,
                    children: [
                      for (final col in [rest.sublist(0, half), rest.sublist(half)]) col.isEmpty ? const SizedBox.shrink() : roster(col),
                    ],
                  ),
                const _Grow(),
                Column(
                  children: [
                    const _PodiumBar(durationMs: _podiumMs),
                    const SizedBox(height: 10),
                    Text(
                      '${SPodium.back} · ${SPodium.saved}',
                      style: T.b(14, color: C.text2, weight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// `.bt-podium-bar`: [durationMs] boyunca soldan dolar (`bt-bar` linear); hareket azaltılınca dolu.
class _PodiumBar extends StatefulWidget {
  const _PodiumBar({required this.durationMs});
  final int durationMs;

  @override
  State<_PodiumBar> createState() => _PodiumBarState();
}

class _PodiumBarState extends State<_PodiumBar> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: widget.durationMs),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else if (!_c.isAnimating && _c.value == 0) {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Container(
    height: 12,
    decoration: BoxDecoration(
      color: C.panel2,
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(R.pill),
    ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(R.pill),
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => Align(
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(
            widthFactor: _c.value,
            heightFactor: 1,
            child: const ColoredBox(color: C.yellow),
          ),
        ),
      ),
    ),
  );
}
