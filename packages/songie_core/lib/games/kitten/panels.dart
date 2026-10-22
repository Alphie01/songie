part of 'play_view.dart';

// ---------- Rakipler ----------

class _Seats extends StatelessWidget {
  const _Seats({required this.view, required this.members, required this.meId});
  final KittenView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: SPlay.seats,
    child: Grid2(
      columns: 4,
      rowGap: 6,
      columnGap: 6,
      equalHeight: true,
      children: [
        for (final p in view.players)
          Builder(
            builder: (context) {
              final m = members[p.id];
              final current = view.current == p.id && p.alive;
              final out = !p.alive;
              final off = m != null && !m.connected;
              final name = p.id == meId ? SPlay.me : (m?.nick ?? '?');
              final fg = current ? C.ink2 : C.text;
              Widget seat = Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: out ? C.panel2 : (current ? C.yellow : C.panel),
                  border: Border.all(color: C.ink, width: current ? bw : 2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      '$name${current ? ' ×${view.turnsLeft}' : ''}',
                      style: T.b(13, color: fg, weight: FontWeight.w800, height: 1.35),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      p.alive ? SPlay.cards(p.cards) : SPlay.out,
                      style: T.b(12, color: out ? C.red : (current ? C.ink2 : C.yellow), weight: FontWeight.w800, height: 1.35),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
              if (out) {
                seat = Opacity(opacity: .5, child: seat);
              } else if (off) {
                seat = Opacity(opacity: .6, child: seat);
              }
              return Semantics(selected: current, child: seat);
            },
          ),
      ],
    ),
  );
}

// ---------- Masa: deste ve ıskarta ----------

class _Table extends StatelessWidget {
  const _Table({required this.view});
  final KittenView view;

  @override
  Widget build(BuildContext context) {
    final count = math.min(view.deckCount, 3);
    // `.kt-stack[data-count]`: altta biriken kart gölgeleri (CSS'te ilk gölge üstte).
    final shadow = switch (count) {
      0 => null,
      1 => hardShadow(4, 4),
      2 => [BoxShadow(color: C.panel, offset: const Offset(8, 8)), BoxShadow(color: C.ink, offset: const Offset(4, 4))],
      _ => [
        BoxShadow(color: C.panel2, offset: const Offset(12, 12)),
        BoxShadow(color: C.panel, offset: const Offset(8, 8)),
        BoxShadow(color: C.ink, offset: const Offset(4, 4)),
      ],
    };
    final label = T.b(13, color: C.text3, weight: FontWeight.w800);
    final top = view.discardTop;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Opacity(opacity: count == 0 ? .4 : 1, child: KtCardBack(shadow: shadow)),
              const SizedBox(height: 6),
              Text(SPlay.deckN(view.deckCount), style: label),
            ],
          ),
          const SizedBox(width: 22),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Transform.rotate(
                angle: deg(8),
                child: top != null
                    ? KtCardFace(kind: top, size: KtSize.pile)
                    : CustomPaint(
                        painter: DashedRRectPainter(color: C.violet, radius: 14, strokeWidth: bw, dash: 9, gap: 6),
                        child: SizedBox(
                          width: 92,
                          height: 130,
                          child: Center(child: Text(SPlay.emptyDiscard, style: label)),
                        ),
                      ),
              ),
              const SizedBox(height: 6),
              Text(SPlay.discardN(view.discardCount), style: label),
            ],
          ),
        ],
      ),
    );
  }
}

/// Patlama riski: destedeki bomba / destedeki kart (ikisi de herkese açık).
class _Risk extends StatelessWidget {
  const _Risk({required this.view});
  final KittenView view;

  @override
  Widget build(BuildContext context) {
    // Eski sunucu sürümü alanı göndermezse kuraldan türet (hayatta − 1).
    final bombs =
        view.deckBombs ??
        math.max(0, view.players.where((p) => p.alive).length - 1 - (view.phase == 'bomb' || view.phase == 'place' ? 1 : 0));
    final pct = view.deckCount > 0 ? math.min(100, (bombs / view.deckCount * 100).round()) : 0;
    final head = T.b(13, color: C.text, weight: FontWeight.w800);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: C.ink2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(16)),
      child: VStack(
        gap: 6,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(child: Text(SPlay.risk(bombs), style: head)),
              const SizedBox(width: 8),
              Text('%$pct', style: head.copyWith(color: C.red)),
            ],
          ),
          Semantics(label: SPlay.riskLabel, value: '$pct', child: _Bar(fraction: pct / 100)),
        ],
      ),
    );
  }
}

// ---------- Günlük, nasıl oynanır ----------

class _Log extends StatelessWidget {
  const _Log({required this.view, required this.nick});
  final KittenView view;
  final _Nick nick;

  @override
  Widget build(BuildContext context) {
    final entries = view.log.reversed.toList();
    final base = T.b(13, color: C.text2, weight: FontWeight.w700, height: 1.4);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(20)),
      child: VStack(
        gap: 10,
        children: [
          Text(SPlay.log, style: T.d(18, color: C.text, height: 1.05)),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 260),
            child: SingleChildScrollView(
              child: VStack(
                gap: 7,
                children: [
                  for (final (i, e) in entries.indexed)
                    Builder(
                      builder: (context) {
                        final rule = e.t == 'turn' || e.t == 'start';
                        final style = switch (e.t) {
                          'boom' => base.copyWith(color: C.red, fontWeight: FontWeight.w800),
                          'bomb' => base.copyWith(color: C.coral),
                          'defuse' => base.copyWith(color: C.mint),
                          'turn' || 'start' => base.copyWith(color: C.text3),
                          _ => i == 0 ? base.copyWith(color: C.text) : base,
                        };
                        final text = Text(logText(e, nick), style: style);
                        if (!rule) return text;
                        return Container(
                          padding: const EdgeInsets.only(top: 6),
                          decoration: const BoxDecoration(border: Border(top: BorderSide(color: C.panel, width: 2))),
                          child: text,
                        );
                      },
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HowTo extends StatelessWidget {
  const _HowTo({required this.fiveCats});
  final bool fiveCats;

  static const _single = ['bomb', 'defuse', 'attack', 'skip', 'future', 'shuffle', 'favor', 'nope'];

  @override
  Widget build(BuildContext context) {
    final dt = T.b(14, color: C.text, weight: FontWeight.w800);
    final dd = T.b(13, color: C.text2);
    return Padding(
      padding: const EdgeInsets.only(top: 32),
      child: CustomPaint(
        painter: const _DashedTop(),
        child: Padding(
          padding: const EdgeInsets.only(top: 3 + 28),
          child: VStack(
            gap: 16,
            children: [
              Text(SHowTo.title, style: T.d(22, color: C.text, height: 1.05)),
              VStack(
                gap: 16,
                children: [
                  for (final (i, (title, body)) in SHowTo.steps.indexed)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(padding: const EdgeInsets.only(top: 2), child: Text('${i + 1}', style: T.d(16, color: C.yellow, height: 1.45))),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(title, style: T.d(16, color: C.text, height: 1.05)),
                              const SizedBox(height: 2),
                              Text(body, style: T.b(13, color: C.text2)),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              Padding(padding: const EdgeInsets.only(top: 8), child: Text(SHowTo.cardsTitle, style: T.d(18, color: C.text, height: 1.05))),
              VStack(
                gap: 14,
                children: [
                  for (final k in _single)
                    VStack(
                      gap: 4,
                      children: [
                        Row(
                          children: [
                            KtCardFace(kind: k, size: KtSize.mini),
                            const SizedBox(width: 10),
                            Flexible(child: Text(cardName[k] ?? k, style: dt)),
                          ],
                        ),
                        Padding(padding: const EdgeInsets.only(left: 36), child: Text(cardText[k] ?? '', style: dd)),
                      ],
                    ),
                  VStack(
                    gap: 4,
                    children: [
                      Row(
                        children: [
                          for (final (i, k) in catKinds.indexed) ...[if (i > 0) const SizedBox(width: 3), KtCardFace(kind: k, size: KtSize.mini)],
                          const SizedBox(width: 10),
                          Flexible(child: Text(SHowTo.cats, style: dt)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${SHowTo.catsText} ${fiveCats ? SHowTo.five : ''}', style: dd),
                          const SizedBox(height: 4),
                          Text(catKinds.map((k) => cardName[k]).join(', '), style: T.b(12, color: C.text3)),
                        ],
                      ),
                    ],
                  ),
                ],
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
