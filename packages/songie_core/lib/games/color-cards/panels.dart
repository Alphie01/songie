part of 'play_view.dart';

// ---------- Puanlar, olanlar, kurallar (`.cc-panel`), nasıl oynanır ----------

final _panelTitle = T.d(18, color: C.text, height: 1.05);

class _Panel extends StatelessWidget {
  const _Panel({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(20)),
    child: VStack(gap: 10, children: children),
  );
}

class _Scores extends StatelessWidget {
  const _Scores({required this.view, required this.members});
  final ColorCardsView view;
  final Map<String, RoomPlayer> members;

  @override
  Widget build(BuildContext context) {
    final ranked = stableSorted(view.players, (a, b) => b.score - a.score);
    return _Panel(
      children: [
        Text.rich(
          TextSpan(
            text: '${SPlay.scores} ',
            children: [TextSpan(text: SPlay.target(view.target), style: T.b(13, color: C.text3, weight: FontWeight.w800, height: 1.05))],
          ),
          style: _panelTitle,
        ),
        VStack(
          gap: 6,
          children: [
            for (final (i, p) in ranked.indexed)
              Builder(
                builder: (context) {
                  final m = members[p.id];
                  final first = i == 0 && p.score > 0;
                  final fg = first ? C.ink2 : C.text;
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: first ? C.yellow : C.panel,
                      border: Border.all(color: C.ink, width: 2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            if (m != null) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 26), const SizedBox(width: 8)],
                            Expanded(
                              child: Text(m?.nick ?? '?', style: T.b(14, color: fg, weight: FontWeight.w800), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
                            ),
                            const SizedBox(width: 8),
                            Text('${p.score}', style: T.d(18, color: fg, height: 1.45)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Container(
                          height: 6,
                          clipBehavior: Clip.antiAlias,
                          decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor: view.target > 0 ? (p.score / view.target).clamp(0.0, 1.0) : 0,
                            heightFactor: 1,
                            child: const ColoredBox(color: C.mint),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ],
    );
  }
}

class _Log extends StatelessWidget {
  const _Log({required this.view, required this.nick});
  final ColorCardsView view;
  final _Nick nick;

  static const _loud = {'roundWin', 'caught', 'challengeWin', 'challengeLose'};

  @override
  Widget build(BuildContext context) {
    final entries = view.log.reversed.toList();
    return _Panel(
      children: [
        Text(SPlay.log, style: _panelTitle),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 280),
          child: SingleChildScrollView(
            child: VStack(
              gap: 6,
              children: [
                for (final e in entries)
                  Text.rich(
                    TextSpan(
                      children: [
                        if (e.card != null)
                          WidgetSpan(
                            alignment: PlaceholderAlignment.baseline,
                            baseline: TextBaseline.alphabetic,
                            child: Padding(
                              padding: const EdgeInsets.only(right: 6),
                              // `vertical-align: -1px`
                              child: Transform.translate(
                                offset: const Offset(0, 1),
                                child: Container(
                                  width: 10,
                                  height: 10,
                                  decoration: ccFill(e.card!.color ?? e.color, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
                                ),
                              ),
                            ),
                          ),
                        TextSpan(text: logText(e, nick)),
                      ],
                    ),
                    style: T.b(13, color: _loud.contains(e.t) ? C.yellow : C.text2, weight: FontWeight.w700, height: 1.4),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Rules extends StatelessWidget {
  const _Rules({required this.view});
  final ColorCardsView view;

  @override
  Widget build(BuildContext context) {
    final on = [
      if (view.rules.stacking) SSettings.stacking,
      if (view.rules.sevenZero) SSettings.sevenZero,
      if (view.rules.drawUntilPlayable) SSettings.drawUntil,
    ];
    final secs = view.rules.turnSeconds > 0 ? ', ${SSettings.sec(view.rules.turnSeconds)}' : '';
    return _Panel(
      children: [
        Text(SPlay.rules, style: _panelTitle),
        Text('${view.mode == 'single' ? SSettings.single : SSettings.points}$secs', style: T.b(14, color: C.text, weight: FontWeight.w800)),
        Text(on.isNotEmpty ? on.join(', ') : SPlay.noHouse, style: _smallStyle),
      ],
    );
  }
}

/// Rehberdeki kartların sırasıyla örnek kart yüzleri.
const _legend = <(String?, String)>[
  ('green', '7'),
  ('yellow', 'skip'),
  ('red', 'reverse'),
  ('purple', 'draw2'),
  (null, 'wild'),
  (null, 'wild4'),
];

/// Oyun rehberi `assets/catalog.json`'dan (web'deki guide.ts) gelir.
GameGuide? _guide() {
  try {
    return Catalog.instance.find(gameId)?.guide;
  } catch (_) {
    return null; // katalog yüklenmemiş
  }
}

/// `.howto`: kesikli üst çizgi, numaralı adımlar ve kart açıklamaları.
class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) {
    final guide = _guide();
    if (guide == null) return const SizedBox.shrink();
    const flowTitles = ['Amaç', 'Sıra sende', '+4 ve “Hile!”', 'Son kart!'];
    final flow = guide.sections.where((x) => flowTitles.contains(x.title)).toList();
    final cards = guide.sections.where((x) => x.title == 'Kartlar').expand((x) => x.items).toList();
    final narrow = MediaQuery.sizeOf(context).width <= 480;
    final tabular = [const FontFeature.tabularFigures()];

    Widget legendRow(int i) {
      final (color, value) = _legend[i];
      final item = i < cards.length ? cards[i] : null;
      final points = value == '7' ? '0–9' : '${cardPoints(value)}';
      final dt = Row(
        children: [
          CcCardFace(color: color, value: value, size: CcSize.sm),
          const SizedBox(width: 10),
          Flexible(child: Text(item?.term ?? '', style: T.b(13, color: C.text, weight: FontWeight.w800))),
        ],
      );
      final dd = Text.rich(
        TextSpan(
          text: '${item?.text ?? ''} ',
          children: [TextSpan(text: '$points p', style: T.d(13, color: C.text3, weight: FontWeight.w600, height: 1.45).copyWith(fontFeatures: tabular))],
        ),
        style: T.b(13, color: C.text2),
      );
      if (narrow) return VStack(gap: 4, children: [dt, dd]);
      return Row(
        children: [
          SizedBox(width: 150, child: dt),
          const SizedBox(width: 12),
          Expanded(child: dd),
        ],
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 32),
      child: CustomPaint(
        painter: const _DashedTop(),
        child: Padding(
          padding: const EdgeInsets.only(top: 3 + 28),
          child: VStack(
            gap: 16,
            children: [
              Text('Nasıl oynanır', style: T.d(22, color: C.text, height: 1.05)),
              VStack(
                gap: 16,
                children: [
                  for (final (i, sec) in flow.indexed)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text('${i + 1}', style: T.d(16, color: C.yellow, height: 1.45).copyWith(fontFeatures: tabular)),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(sec.title, style: T.d(16, color: C.text, height: 1.05)),
                              const SizedBox(height: 2),
                              Text((sec.body ?? '').split('\n\n').first, style: T.b(13, color: C.text2)),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: VStack(gap: 12, children: [for (var i = 0; i < _legend.length; i++) legendRow(i)]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// `border-top: 3px dashed var(--violet)`.
class _DashedTop extends CustomPainter {
  const _DashedTop();

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
  bool shouldRepaint(_DashedTop old) => false;
}
