part of 'play_view.dart';

/// Özet: oyun sonu (Sonuçlar ekranının dili); kendiliğinden kapanana kadar geri sayım.
class _Summary extends StatefulWidget {
  const _Summary({required this.view, required this.now, required this.isHost, required this.code, required this.who, required this.send});
  final ParanoiaView view;
  final int now;
  final bool isHost;
  final String code;
  final _Who who;
  final _Send send;

  @override
  State<_Summary> createState() => _SummaryState();
}

class _SummaryState extends State<_Summary> {
  /// Geri sayım çubuğu: ekran açıldığında kalan süreyi tam kabul et.
  late final int _span = math.max(1, widget.view.closesAt - widget.view.serverNow);

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final who = widget.who;
    final left = math.max(0, view.closesAt - widget.now);
    final secs = (left / 1000).ceil();
    final stats = view.stats;
    final first = stats.isNotEmpty ? stats[0] : null;
    final second = stats.length > 1 ? stats[1] : null;
    final rest = stats.length > 2 ? stats.sublist(2) : const <StatEntry>[];
    final half = (rest.length / 2).ceil();
    final tie = first != null && second != null && first.picked > 0 && first.picked == second.picked;
    final title = first == null || first.picked == 0 ? SPlay.summaryTitle : (tie ? SPlay.tie : SPlay.mostPicked(who.nick(first.playerId)));
    final reduce = MediaQuery.disableAnimationsOf(context);
    final top = T.b(13, color: C.text3, weight: FontWeight.w800);

    Widget card(StatEntry s, {required bool isFirst}) => Transform.rotate(
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
            if (isFirst && !tie && s.picked > 0) SSvg(crownSvg, width: 40, height: 28),
            if (!isFirst) const SizedBox(height: 10),
            Text('${s.picked}', style: T.d(isFirst ? 64 : 52, color: C.ink2)),
            Text(
              who.nick(s.playerId),
              style: T.b(14, color: C.ink2, weight: FontWeight.w800),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );

    Widget roster(List<StatEntry> col) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 8,
        children: [
          for (final x in col)
            Builder(
              builder: (context) {
                final p = who.player(x.playerId);
                return Row(
                  children: [
                    SAvatar(avatar: p.avatar, nick: p.nick, size: 28),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          p.nick,
                          style: T.b(15, color: C.text, weight: FontWeight.w800),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      SPlay.times(x.picked),
                      style: T.b(13, color: C.yellow, weight: FontWeight.w800),
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );

    return Stack(
      children: [
        const Positioned.fill(child: Confetti(top: 50)),
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: VStack(
            gap: 18,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(S.name, style: top),
                  Text(widget.code, style: top.copyWith(letterSpacing: 2)),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(top: 18),
                child: Column(
                  children: [
                    const EndSticker(SPlay.gameOver),
                    const SizedBox(height: 6 + 8),
                    Text(
                      title,
                      style: T.d(48, color: C.text, height: 0.95),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              if (first != null)
                Semantics(
                  label: SPlay.statsTitle,
                  child: IntrinsicHeight(
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
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Column(
                  children: [
                    Container(
                      height: 12,
                      decoration: BoxDecoration(
                        color: C.panel2,
                        border: Border.all(color: C.ink, width: 2),
                        borderRadius: BorderRadius.circular(R.pill),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(R.pill),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: AnimatedFractionallySizedBox(
                            duration: reduce ? Duration.zero : const Duration(milliseconds: 250),
                            widthFactor: (1 - left / _span).clamp(0.0, 1.0),
                            heightFactor: 1,
                            child: const ColoredBox(color: C.yellow),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${SPlay.backToLobby} · ${SPlay.secondsLeft(secs)}',
                      style: T.b(14, color: C.text2, weight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 10),
                    if (widget.isHost)
                      SButton(
                        label: SPlay.finish,
                        tone: BtnTone.primary,
                        block: true,
                        minHeight: 62,
                        radius: 20,
                        shadowY: 6,
                        fontSize: 22,
                        onPressed: () => widget.send({'type': 'finish'}),
                      )
                    else
                      Text(SPlay.waitHostFinish, style: _hint, textAlign: TextAlign.center),
                  ],
                ),
              ),
              if (view.revealed.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: VStack(
                    gap: 8,
                    children: [
                      Text(trUpper(SPlay.allTitle), style: _label),
                      _EntryList(entries: view.revealed, who: who),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
