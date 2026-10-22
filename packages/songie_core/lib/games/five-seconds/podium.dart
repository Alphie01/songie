part of 'play_view.dart';

/// Oyun sonu (Sonuclar.dc.html): kazanan kartları, kadrolar, lobiye dönüş çubuğu.
class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.members, required this.meId, required this.code});
  final FiveSecondsView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  Widget build(BuildContext context) {
    final ranked = _ranking(view);
    String nick(String id) => (members[id]?.nick ?? '?') + (id == meId ? ' (sen)' : '');
    int pts(String id) => view.score(id);
    final ts = view.teamScores;
    final teams = view.teams;

    String title;
    List<(String, int)> cards;
    if (ts != null && teams != null) {
      final a = ts['a'] ?? 0;
      final b = ts['b'] ?? 0;
      final order = b > a ? ['b', 'a'] : ['a', 'b'];
      title = a == b ? SPodium.draw : SPodium.winnerTeam(S.team(order[0]));
      cards = [for (final t in order) (S.team(t), ts[t] ?? 0)];
    } else {
      final first = ranked.isNotEmpty ? ranked[0] : null;
      final second = ranked.length > 1 ? ranked[1] : null;
      title = first != null && (second == null || pts(first) > pts(second)) ? SPodium.winner(nick(first)) : SPodium.draw;
      cards = [for (final id in ranked.take(2)) (nick(id), pts(id))];
    }
    final firstTeam = ts == null ? null : ((ts['b'] ?? 0) > (ts['a'] ?? 0) ? 'b' : 'a');

    final g = Layout.gutter(context);
    final vh = viewportHeight(context);
    final maxW = Layout.col + 2 * g;
    final titleSize = (MediaQuery.sizeOf(context).width * 0.12).clamp(36.0, 48.0);
    final top = T.b(13, color: C.text3, weight: FontWeight.w800);

    Widget? rosters;
    if (ts != null && teams != null) {
      rosters = Grid2(
        columnGap: 10,
        rowGap: 10,
        equalHeight: true,
        children: [
          for (final t in teamIds)
            _RosterBox(
              children: [
                Text(
                  trUpper(S.team(t)),
                  style: T.b(13, color: _teamColor(t), weight: FontWeight.w800),
                ),
                for (final id in teams[t] ?? const <String>[]) _RosterRow(member: members[id], name: nick(id), score: pts(id)),
              ],
            ),
        ],
      );
    } else if (ranked.length > 2) {
      rosters = _RosterBox(
        children: [
          for (var i = 2; i < ranked.length; i++)
            _RosterRow(rank: SPodium.place(i + 1), member: members[ranked[i]], name: nick(ranked[i]), score: pts(ranked[i])),
        ],
      );
    }

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
                      const EndSticker(SPodium.gameOver),
                      const SizedBox(height: 6 + 8),
                      Text(
                        title,
                        style: T.d(titleSize, color: C.text, height: 0.95),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        SPodium.title,
                        style: T.b(14, color: C.text3, weight: FontWeight.w700),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                if (cards.isNotEmpty) _PodiumCards(cards: cards, firstTeam: firstTeam),
                ?rosters,
                const _Grow(),
                Column(
                  children: [
                    const _PodiumBar(durationMs: _podiumMs),
                    const SizedBox(height: 10),
                    Text(
                      SPodium.back,
                      style: T.b(14, color: C.text2, weight: FontWeight.w800),
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

/// `.fs-pcards`: birinci (nane, −3°, taç, gölge) – ikinci (lila, +2°, alta yaslı); her kart en fazla 200px.
class _PodiumCards extends StatelessWidget {
  const _PodiumCards({required this.cards, required this.firstTeam});
  final List<(String, int)> cards;
  final String? firstTeam;

  @override
  Widget build(BuildContext context) {
    Widget card(int i) {
      final first = i == 0;
      final bg = first ? (firstTeam == 'b' ? C.lilac : C.mint) : (firstTeam == 'b' ? C.mint : C.lilac);
      return Transform.rotate(
        angle: deg(first ? -3 : 2),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: bg,
            border: Border.all(color: C.ink, width: 4),
            borderRadius: BorderRadius.circular(26),
            boxShadow: first ? Shadows.lg : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (first) SSvg(crownSvg, width: 40, height: 28) else const SizedBox(height: 10),
              Text('${cards[i].$2}', style: T.d(first ? 64 : 52, color: C.ink2)),
              Text(
                cards[i].$1,
                style: T.b(14, color: C.ink2, weight: FontWeight.w800),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      );
    }

    Widget slot(Widget child) => Flexible(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 200),
        child: SizedBox(width: double.infinity, child: child),
      ),
    );

    return IntrinsicHeight(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          slot(card(0)),
          if (cards.length > 1) ...[
            const SizedBox(width: 12),
            Center(
              child: ExcludeSemantics(
                child: Text('–', style: T.d(30, color: C.text3)),
              ),
            ),
            const SizedBox(width: 12),
            slot(Column(mainAxisAlignment: MainAxisAlignment.end, crossAxisAlignment: CrossAxisAlignment.stretch, children: [card(1)])),
          ],
        ],
      ),
    );
  }
}

/// `.fs-roster`: mor kutu, satırlar arası 8px.
class _RosterBox extends StatelessWidget {
  const _RosterBox({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: C.panel,
      border: Border.all(color: C.ink, width: bw),
      borderRadius: BorderRadius.circular(18),
    ),
    child: VStack(gap: 8, children: children),
  );
}

class _RosterRow extends StatelessWidget {
  const _RosterRow({required this.member, required this.name, required this.score, this.rank});
  final RoomPlayer? member;
  final String name;
  final int score;
  final String? rank;

  @override
  Widget build(BuildContext context) {
    final style = T.b(15, color: C.text, weight: FontWeight.w800);
    final m = member;
    return Row(
      children: [
        if (rank != null) ...[Text(rank!, style: style.copyWith(color: C.text3)), const SizedBox(width: 8)],
        if (m != null) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
        Expanded(
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(name, style: style, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
        ),
        const SizedBox(width: 8),
        Text('$score', style: style.copyWith(color: C.yellow)),
      ],
    );
  }
}

/// `.fs-podium-bar`: [durationMs] boyunca soldan dolar (`fs-bar` linear); hareket azaltılınca dolu.
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
