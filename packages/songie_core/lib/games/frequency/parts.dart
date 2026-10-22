part of 'play_view.dart';

/// Kartın içindeki satır kutusu (gövde metni: Nunito 16px, 1.45); inline taç ve etiket bunun üzerine oturur.
const _bodyStrut = StrutStyle(fontFamily: T.font, fontSize: 16, height: 1.45, leadingDistribution: TextLeadingDistribution.even);

/// `.fq-scores`: takım puanları ve hedefe ilerleme (birlikte modunda ortak puan ve tur ilerlemesi).
class _Scores extends StatelessWidget {
  const _Scores({required this.view});
  final FrequencyView view;

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    Widget card({required String team, required bool active, required Widget head, double? progress}) {
      final teamColor = _teamColor(team);
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? teamColor : C.panel,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(16),
          boxShadow: active ? hardShadow(0, 4) : null,
        ),
        child: VStack(
          gap: 4,
          children: [
            DefaultTextStyle.merge(
              style: T.b(13, color: active ? C.ink2 : C.text, weight: FontWeight.w800),
              child: head,
            ),
            if (progress != null)
              Container(
                height: 6,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(color: active ? const Color(0x26000000) : const Color(0x26FFFFFF), borderRadius: BorderRadius.circular(R.pill)),
                alignment: Alignment.centerLeft,
                child: AnimatedFractionallySizedBox(
                  duration: reduce ? Duration.zero : const Duration(milliseconds: 600),
                  curve: const Cubic(0.2, 0.8, 0.2, 1),
                  widthFactor: progress.clamp(0.0, 1.0),
                  heightFactor: 1,
                  child: DecoratedBox(
                    decoration: BoxDecoration(color: active ? C.ink2 : teamColor, borderRadius: BorderRadius.circular(R.pill)),
                  ),
                ),
              ),
          ],
        ),
      );
    }

    Widget pts(int n, bool active) => Text('$n', style: T.d(20, color: active ? C.ink2 : C.text));

    if (view.mode == 'coop') {
      final total = view.totalRounds;
      return card(
        team: 'a',
        active: true,
        head: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Flexible(child: Text(SPlay.total)),
            pts(view.scores['a']!, true),
          ],
        ),
        progress: total != null && total > 0 ? math.min(100, view.completed / total * 100) / 100 : null,
      );
    }
    final goal = view.targetScore ?? 10;
    Widget team(String t) {
      final active = view.team == t;
      return card(
        team: t,
        active: active,
        head: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Text('${S.teamShort[t]}${view.myTeam == t ? SPlay.youTag : ''}')),
            pts(view.scores[t]!, active),
          ],
        ),
        progress: math.min(100, view.scores[t]! / goal * 100) / 100,
      );
    }

    return Grid2(columnGap: 10, rowGap: 10, equalHeight: true, children: [team('a'), team('b')]);
  }
}

/// `.fq-history`: önceki turlar (en yenisi üstte).
class _History extends StatelessWidget {
  const _History({required this.view, required this.nick});
  final FrequencyView view;
  final String Function(String? id) nick;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: C.panel2,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: VStack(
        gap: 6,
        children: [
          // h2.fq-box-title: başlık yazısı, satır yüksekliği 1.05.
          Text(trUpper(SPlay.history), style: T.d(12, color: C.text3, height: 1.05, letterSpacing: 1.5)),
          VStack(
            gap: 8,
            children: [
              for (final h in view.history)
                Container(
                  padding: const EdgeInsets.only(left: 10),
                  decoration: BoxDecoration(
                    border: Border(left: BorderSide(color: view.mode == 'teams' ? _teamColor(h.team) : C.violet, width: 3)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${h.card.left} / ${h.card.right}',
                              style: T.b(13, color: C.text, weight: FontWeight.w800),
                            ),
                            Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(
                                    text: '${nick(h.psychicId)}:',
                                    style: const TextStyle(fontWeight: FontWeight.w800),
                                  ),
                                  TextSpan(text: ' ${h.clue != null && h.clue!.isNotEmpty ? '“${h.clue}”' : trLower(SPlay.clueSpoken)}'),
                                ],
                              ),
                              style: T.b(13, color: C.text2, weight: FontWeight.w700),
                              maxLines: 1,
                              softWrap: false,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: switch (h.points) {
                            2 => _band2,
                            3 => C.coral,
                            4 => C.mint,
                            _ => C.red,
                          },
                          borderRadius: BorderRadius.circular(R.pill),
                        ),
                        child: Text(
                          SPlay.points(h.points),
                          style: T.b(13, color: C.ink2, weight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// `.fq-rosters`: takım listeleri (birlikte modunda tek liste); medyumun yanında rozet.
class _Rosters extends StatelessWidget {
  const _Rosters({required this.view, required this.members, required this.meId});
  final FrequencyView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final coop = view.mode == 'coop';
    Widget roster(String t) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 8,
        children: [
          // h2.fq-roster-name: Nunito, büyük harf, satır yüksekliği 1.05; takımsızken nane.
          Text(
            trUpper(coop ? SSettings.modeCoop : S.team[t]!),
            style: T.b(13, color: coop ? C.mint : _teamColor(t), weight: FontWeight.w800, height: 1.05),
          ),
          VStack(
            gap: 8,
            children: [
              for (final id in view.teams[t]!)
                if (members[id] case final m?)
                  Row(
                    children: [
                      SAvatar(avatar: m.avatar, nick: m.nick, size: 28, dim: !m.connected),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${m.nick}${id == meId ? SPlay.youTag : ''}',
                          style: T.b(15, color: C.text, weight: FontWeight.w800),
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (view.psychicId == id && view.phase != 'podium') ...[const SizedBox(width: 8), const _Badge(SPlay.psychic)],
                    ],
                  ),
            ],
          ),
        ],
      ),
    );
    if (coop) return roster('a');
    return Grid2(columnGap: 10, rowGap: 10, equalHeight: true, children: [roster('a'), roster('b')]);
  }
}

/// `.howto`: kesikli üst çizgi, numaralı adımlar (başlık h2: satır yüksekliği 1.05).
class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: CustomPaint(
      painter: const _DashedTopPainter(),
      child: Padding(
        padding: const EdgeInsets.only(top: 3 + 28),
        child: VStack(
          gap: 16,
          children: [
            Text(SHowto.title, style: T.d(22, color: C.text, height: 1.05)),
            for (var i = 0; i < SHowto.steps.length; i++)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text('${i + 1}', style: T.d(16, color: C.yellow, height: 1.45)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(SHowto.steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                        const SizedBox(height: 2),
                        Text(SHowto.steps[i].$2, style: T.b(13, color: C.text2)),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    ),
  );
}

/// `border-top: 3px dashed var(--violet)`
class _DashedTopPainter extends CustomPainter {
  const _DashedTopPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = C.violet
      ..strokeWidth = 3;
    for (double x = 0; x < size.width; x += 12) {
      canvas.drawLine(Offset(x, 1.5), Offset(math.min(x + 8, size.width), 1.5), p);
    }
  }

  @override
  bool shouldRepaint(_DashedTopPainter old) => false;
}

/// `.fq-end-bar`: [durationMs] boyunca soldan dolan lobi çubuğu (azaltılmış harekette dolu).
class _EndBar extends StatefulWidget {
  const _EndBar({required this.durationMs});
  final int durationMs;

  @override
  State<_EndBar> createState() => _EndBarState();
}

class _EndBarState extends State<_EndBar> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: math.max(1, widget.durationMs)),
  )..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return Container(
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
          builder: (context, _) => FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: reduce ? 1 : _c.value,
            heightFactor: 1,
            child: const ColoredBox(color: C.yellow),
          ),
        ),
      ),
    );
  }
}

/// Sonuç ekranı (Sonuclar.dc.html): konfeti, başlık, takım kartları, listeler, lobiye dönüş çubuğu.
class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.members, required this.meId, required this.code});
  final FrequencyView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  Widget build(BuildContext context) {
    final g = Layout.gutter(context);
    final a = view.scores['a']!;
    final b = view.scores['b']!;
    final top = T.b(13, color: C.text3, weight: FontWeight.w800);
    final coop = view.mode == 'coop';
    final winner = view.winner == 'a' || view.winner == 'b' ? view.winner : null;

    final String title;
    final Widget cards;
    if (coop) {
      title = S.ratings[(view.rating ?? 0).clamp(0, S.ratings.length - 1)];
      cards = Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 220),
          child: _EndCard(team: 'a', number: a, label: S.ratingHint(a, view.completed), win: true, crown: true),
        ),
      );
    } else {
      title = winner != null ? '${S.team[winner]}\n${SPodium.won}' : SPodium.draw;
      final order = winner == 'b' ? ['b', 'a'] : ['a', 'b'];
      Widget cell(int i) {
        final t = order[i];
        final win = winner == t || (winner == null && i == 0);
        final card = _EndCard(team: t, number: t == 'a' ? a : b, label: S.team[t]!, win: win, draw: winner == null, crown: winner == t);
        return Expanded(
          child: Align(
            alignment: win ? Alignment.topCenter : Alignment.bottomCenter,
            heightFactor: 1,
            child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 220), child: card),
          ),
        );
      }

      cards = IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            cell(0),
            const SizedBox(width: 12),
            Center(
              child: ExcludeSemantics(
                child: Text('–', style: T.d(30, color: C.text3, height: 1.45)),
              ),
            ),
            const SizedBox(width: 12),
            cell(1),
          ],
        ),
      );
    }

    final content = ConstrainedBox(
      // `.fq-endscreen { min-height: 100dvh; padding: 72px … 24px }`
      constraints: BoxConstraints(minHeight: viewportHeight(context)),
      child: IntrinsicHeight(
        child: Padding(
          padding: EdgeInsets.fromLTRB(g, 72, g, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _gapped(18, [
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
                      title,
                      style: T.d(48, color: C.text, height: 0.95),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              cards,
              _Rosters(view: view, members: members, meId: meId),
              const Spacer(),
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: _EndBar(durationMs: view.podiumMs),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    SPodium.back,
                    style: T.b(14, color: C.text2, weight: FontWeight.w800),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ]),
          ),
        ),
      ),
    );

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        // `.col`: 440 + 2 × gutter
        constraints: BoxConstraints(maxWidth: Layout.col + 2 * g),
        child: ClipRect(
          child: Stack(
            children: [
              const Positioned.fill(child: Confetti(top: 102)),
              content,
            ],
          ),
        ),
      ),
    );
  }
}

/// `.fq-end-card`: kazanan −3° gölgeli ve taçlı; diğeri +2° ve alta yaslı; beraberlikte ikisi de 64px.
class _EndCard extends StatelessWidget {
  const _EndCard({required this.team, required this.number, required this.label, required this.win, this.draw = false, this.crown = false});
  final String team;
  final int number;
  final String label;
  final bool win;
  final bool draw;
  final bool crown;

  @override
  Widget build(BuildContext context) {
    final big = win || draw;
    final card = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _teamColor(team),
        border: Border.all(color: C.ink, width: 4),
        borderRadius: BorderRadius.circular(26),
        boxShadow: win ? hardShadow(6, 6) : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Taç inline SVG: gövde metninin satır kutusunda (16px, 1.45) taban çizgisine oturur.
          if (crown) _crownLine(context),
          if (!big) const SizedBox(height: 10),
          Text(
            '$number',
            style: T.d(big ? 64 : 52, color: C.ink2),
            textAlign: TextAlign.center,
          ),
          Text(
            label,
            style: T.b(14, color: C.ink2, weight: FontWeight.w800),
            strutStyle: _bodyStrut,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
    return Transform.rotate(angle: deg(win ? -3 : 2), child: card);
  }

  /// Satır kutusu: taban çizgisinin üstü max(yazı, 28px), altı yazının inişi (yarım satır aralığıyla).
  Widget _crownLine(BuildContext context) {
    final strut = TextPainter(
      text: TextSpan(text: 'x', style: T.b(16)),
      textDirection: TextDirection.ltr,
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    final ascent = strut.computeDistanceToActualBaseline(TextBaseline.alphabetic);
    final descent = strut.height - ascent;
    strut.dispose();
    return Padding(
      padding: EdgeInsets.only(top: math.max(0, ascent - 28), bottom: descent),
      child: SSvg(crownSvg, width: 40, height: 28),
    );
  }
}
